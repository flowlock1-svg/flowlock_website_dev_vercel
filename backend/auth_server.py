from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import base64
import os
from insightface.app import FaceAnalysis
from numpy.linalg import norm
from supabase import create_client

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase Setup ──
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://hocqkuziyusaazrkfijb.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
# The service role key bypasses RLS and allows the backend to manage any user's data.
# Set it via environment variable: export SUPABASE_SERVICE_KEY="your-service-role-key"
# You can find it in: Supabase Dashboard → Project Settings → API → service_role key

# Fallback: use anon key if service key not available (for local dev with RLS disabled on backend ops)
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvY3FrdXppeXVzYWF6cmtmaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDY1MjUsImV4cCI6MjA4ODEyMjUyNX0.Zy7Trb8Enp4oVItLZ_1Z-MJK1lxRmWcxkx3S2qMtYgA"
)

supa_key = SUPABASE_SERVICE_KEY if SUPABASE_SERVICE_KEY else SUPABASE_ANON_KEY
supabase = create_client(SUPABASE_URL, supa_key)

# Initialize the face analysis model
try:
    print("Loading model...")
    face_app = FaceAnalysis(name="buffalo_l")
    face_app.prepare(ctx_id=0, det_size=(640, 640))
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    face_app = None

# Legacy local fallback path
DB_PATH = "database/user.npy"
os.makedirs("database", exist_ok=True)


class ImageData(BaseModel):
    image: str  # Base64 encoded image string
    user_id: str = ""  # Supabase user UUID (optional for backward compat)


def base64_to_cv2(base64_string: str):
    """Convert base64 image string from React to OpenCV Mat format"""
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    img_data = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img


def get_stored_embedding(user_id: str):
    """Retrieve stored embedding from Supabase, falling back to local file"""
    if user_id:
        try:
            result = supabase.table("face_embeddings").select("embedding").eq("user_id", user_id).single().execute()
            if result.data and result.data.get("embedding"):
                return np.array(result.data["embedding"], dtype=np.float32)
        except Exception as e:
            print(f"Supabase fetch failed: {e}")

    # Fallback to local file
    if os.path.exists(DB_PATH):
        return np.load(DB_PATH)
    return None


def save_embedding(user_id: str, embedding: np.ndarray):
    """Save embedding to Supabase, with local file fallback"""
    embedding_list = embedding.tolist()

    if user_id:
        try:
            supabase.table("face_embeddings").upsert({
                "user_id": user_id,
                "embedding": embedding_list,
            }).execute()
            return
        except Exception as e:
            print(f"Supabase save failed: {e}")

    # Fallback: save locally
    np.save(DB_PATH, embedding)


def delete_embedding(user_id: str):
    """Delete embedding from Supabase, with local file fallback"""
    if user_id:
        try:
            supabase.table("face_embeddings").delete().eq("user_id", user_id).execute()
        except Exception as e:
            print(f"Supabase delete failed: {e}")

    # Also clean local
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)


@app.get("/status")
def status(user_id: str = ""):
    """Check if the user has an enrolled face"""
    if user_id:
        try:
            result = supabase.table("face_embeddings").select("id").eq("user_id", user_id).execute()
            return {"enrolled": len(result.data) > 0}
        except Exception:
            pass
    return {"enrolled": os.path.exists(DB_PATH)}


@app.delete("/reset")
def reset(user_id: str = ""):
    """Remove the stored face and allow re-enrollment"""
    delete_embedding(user_id)
    return {"success": True, "message": "Face data removed. You can now re-enroll."}


@app.post("/register")
def register(data: ImageData):
    """Register a new user face"""
    if face_app is None:
        raise HTTPException(status_code=500, detail="Face analysis model not initialized")

    img = base64_to_cv2(data.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    faces = face_app.get(img)

    if len(faces) == 0:
        return {"success": False, "message": "No face detected in the image."}

    if len(faces) > 1:
        return {"success": False, "message": "Multiple faces detected. Please make sure only you are in the frame."}

    embedding = faces[0].embedding
    save_embedding(data.user_id, embedding)

    return {"success": True, "message": "Face registered successfully."}


@app.post("/authenticate")
def authenticate(data: ImageData):
    """Authenticate a user frame during the session"""
    if face_app is None:
        raise HTTPException(status_code=500, detail="Face analysis model not initialized")

    stored_embedding = get_stored_embedding(data.user_id)
    if stored_embedding is None:
        raise HTTPException(status_code=400, detail="No registered user found. Please enroll first.")

    img = base64_to_cv2(data.image)
    if img is None:
        return {"authenticated": False, "message": "Invalid image data"}

    faces = face_app.get(img)

    if len(faces) == 0:
        return {"authenticated": False, "message": "No face detected"}

    new_embedding = faces[0].embedding
    similarity = np.dot(stored_embedding, new_embedding) / (
        norm(stored_embedding) * norm(new_embedding)
    )

    is_authenticated = bool(similarity > 0.6)

    return {
        "authenticated": is_authenticated,
        "similarity": float(similarity),
        "message": "Unlocked" if is_authenticated else "Access Denied"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
