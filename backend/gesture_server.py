"""
gesture_server.py — FlowLock Hand Gesture Control Server
Runs on http://localhost:5050
Endpoints:
  POST /start  — start gesture control (opens webcam)
  POST /stop   — stop gesture control (closes webcam)
  GET  /status — { "running": true/false }

Compatible with mediapipe >= 0.10.x (Tasks API)
"""

import os
import threading
import time
from enum import Enum

# Fix OpenCV camera auth on macOS when called from a background thread
os.environ["OPENCV_AVFOUNDATION_SKIP_AUTH"] = "1"

import cv2
import numpy as np
import pyautogui

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.components.containers import landmark as mp_landmark

from flask import Flask, jsonify
from flask_cors import CORS

# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)  # allow Next.js at localhost:3000

pyautogui.FAILSAFE = False

# ── Shared state ───────────────────────────────────────────────────────────────
_running = False
_thread: threading.Thread | None = None
_stop_event = threading.Event()

# Path to the bundled hand landmarker model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")


# ── Gesture definitions ────────────────────────────────────────────────────────
class Gesture(Enum):
    MOVE = 0
    LEFT_CLICK = 1
    RIGHT_CLICK = 2
    SCROLL_UP = 3
    SCROLL_DOWN = 4
    NONE = 5


def get_fingers_up(landmarks, img_w, img_h):
    """Return [thumb, index, middle, ring, little] booleans using pixel coords."""
    pts = [(int(lm.x * img_w), int(lm.y * img_h)) for lm in landmarks]
    fingers = []
    # Thumb: tip x > ip x (for right hand mirrored)
    fingers.append(pts[4][0] > pts[3][0])
    # Fingers: tip y < pip y means finger is raised
    fingers.append(pts[8][1] < pts[6][1])   # index
    fingers.append(pts[12][1] < pts[10][1])  # middle
    fingers.append(pts[16][1] < pts[14][1])  # ring
    fingers.append(pts[20][1] < pts[18][1])  # little
    return fingers, pts


def classify_gesture(f):
    if f[1:5] == [True, True, True, True]:
        return Gesture.MOVE
    if f[1:5] == [True, False, False, False]:
        return Gesture.LEFT_CLICK
    if f[1:5] == [False, False, False, True]:
        return Gesture.RIGHT_CLICK
    if f == [True, False, False, False, False]:
        return Gesture.SCROLL_UP
    if f == [False, False, False, False, False]:
        return Gesture.SCROLL_DOWN
    return Gesture.NONE


# ── Download model if missing ──────────────────────────────────────────────────
def ensure_model():
    if os.path.exists(MODEL_PATH):
        return True
    try:
        import urllib.request
        url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
        print(f"Downloading hand landmarker model to {MODEL_PATH} ...")
        urllib.request.urlretrieve(url, MODEL_PATH)
        print("Model downloaded successfully.")
        return True
    except Exception as e:
        print(f"Failed to download model: {e}")
        return False


# ── Gesture loop (runs in background thread) ───────────────────────────────────
def gesture_loop(stop_event: threading.Event):
    if not ensure_model():
        print("Cannot start gesture loop: model not available.")
        return

    screen_w, screen_h = pyautogui.size()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Cannot open webcam. Check camera permissions in System Preferences > Privacy & Security > Camera.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    # Build HandLandmarker using Tasks API (mediapipe >= 0.10)
    base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    options = mp_vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=mp_vision.RunningMode.IMAGE,
        num_hands=1,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.7,
        min_tracking_confidence=0.7,
    )
    detector = mp_vision.HandLandmarker.create_from_options(options)

    prev_x, prev_y = 0, 0
    smooth = 5
    frame_margin = 100
    click_delay = 0.4
    last_click = 0

    print("Gesture loop started. Show your hand to the camera.")

    while not stop_event.is_set():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        result = detector.detect(mp_image)

        cv2.rectangle(
            frame,
            (frame_margin, frame_margin),
            (w - frame_margin, h - frame_margin),
            (0, 255, 0), 2,
        )

        if result.hand_landmarks:
            landmarks = result.hand_landmarks[0]

            # Draw landmarks manually
            for lm in landmarks:
                cx, cy = int(lm.x * w), int(lm.y * h)
                cv2.circle(frame, (cx, cy), 5, (0, 255, 255), -1)

            fingers, pts = get_fingers_up(landmarks, w, h)
            gesture = classify_gesture(fingers)
            index = pts[8]

            if gesture == Gesture.MOVE:
                sx = np.interp(index[0], (frame_margin, w - frame_margin), (0, screen_w))
                sy = np.interp(index[1], (frame_margin, h - frame_margin), (0, screen_h))
                cx = prev_x + (sx - prev_x) / smooth
                cy = prev_y + (sy - prev_y) / smooth
                pyautogui.moveTo(cx, cy)
                prev_x, prev_y = cx, cy

            elif gesture == Gesture.LEFT_CLICK:
                if time.time() - last_click > click_delay:
                    pyautogui.click()
                    last_click = time.time()

            elif gesture == Gesture.RIGHT_CLICK:
                pyautogui.rightClick()

            elif gesture == Gesture.SCROLL_UP:
                pyautogui.scroll(50)

            elif gesture == Gesture.SCROLL_DOWN:
                pyautogui.scroll(-50)

            cv2.putText(
                frame, gesture.name, (50, 100),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 3,
            )

        cv2.imshow("FlowLock — Gesture Control", frame)

        if cv2.waitKey(1) & 0xFF == 27:  # ESC to quit
            stop_event.set()
            break

    detector.close()
    cap.release()
    cv2.destroyAllWindows()
    print("Gesture loop stopped.")


# ── API routes ─────────────────────────────────────────────────────────────────
@app.route("/status", methods=["GET"])
def status():
    return jsonify({"running": _running})


@app.route("/start", methods=["POST"])
def start():
    global _running, _thread, _stop_event

    if _running:
        return jsonify({"ok": True, "message": "Already running"})

    _stop_event = threading.Event()
    _thread = threading.Thread(target=gesture_loop, args=(_stop_event,), daemon=True)
    _thread.start()
    _running = True
    return jsonify({"ok": True, "message": "Gesture control started"})


@app.route("/stop", methods=["POST"])
def stop():
    global _running

    if not _running:
        return jsonify({"ok": True, "message": "Not running"})

    _stop_event.set()
    _running = False
    return jsonify({"ok": True, "message": "Gesture control stopped"})


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🖐  FlowLock Gesture Server running on http://localhost:5050")
    ensure_model()  # download model at startup if needed
    app.run(host="0.0.0.0", port=5050, debug=False)
