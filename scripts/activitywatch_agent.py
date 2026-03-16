#!/usr/bin/env python3
"""
ActivityWatch Agent for FlowLock

Polls ActivityWatch every 5 minutes, aggregates app/web/idle usage for today,
and posts to the FlowLock API.

Usage:
    export FLOWLOCK_API_URL="http://localhost:3000"
    export SUPABASE_AUTH_TOKEN="<your-supabase-jwt-token>"
    python activitywatch_agent.py

Environment Variables:
    FLOWLOCK_API_URL  - Base URL of FlowLock app (default: http://localhost:3000)
    SUPABASE_AUTH_TOKEN - JWT token from Supabase auth (required)
    AW_API_URL - ActivityWatch API base URL (default: http://localhost:5600/api/0)
    POLL_INTERVAL - Poll interval in seconds (default: 300 = 5 minutes)
"""

import os
import sys
import time
import json
import logging
from datetime import datetime, date
from collections import defaultdict
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    print("Error: 'requests' module not found. Install it with: pip install requests")
    sys.exit(1)

# Configuration
AW_API_URL = os.environ.get("AW_API_URL", "http://localhost:5600/api/0")
FLOWLOCK_API_URL = os.environ.get("FLOWLOCK_API_URL", "http://localhost:3000")
AUTH_TOKEN = os.environ.get("SUPABASE_AUTH_TOKEN", "")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "300"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("aw-agent")


def get_hostname():
    """Get the hostname to find the correct bucket names."""
    try:
        import socket
        return socket.gethostname()
    except Exception:
        return None


def find_buckets():
    """Find available ActivityWatch buckets."""
    try:
        resp = requests.get(f"{AW_API_URL}/buckets", timeout=5)
        resp.raise_for_status()
        buckets = resp.json()
        
        window_bucket = None
        web_bucket = None
        afk_bucket = None
        
        for bucket_id in buckets:
            if "aw-watcher-window" in bucket_id:
                window_bucket = bucket_id
            elif "aw-watcher-web" in bucket_id:
                web_bucket = bucket_id
            elif "aw-watcher-afk" in bucket_id:
                afk_bucket = bucket_id
        
        return window_bucket, web_bucket, afk_bucket
    except requests.ConnectionError:
        logger.error("Cannot connect to ActivityWatch. Is it running on %s?", AW_API_URL)
        return None, None, None
    except Exception as e:
        logger.error("Error finding buckets: %s", e)
        return None, None, None


def fetch_events(bucket_id, start, end):
    """Fetch events from an ActivityWatch bucket."""
    if not bucket_id:
        return []
    try:
        params = {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "limit": -1,
        }
        resp = requests.get(
            f"{AW_API_URL}/buckets/{bucket_id}/events",
            params=params,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning("Failed to fetch events from %s: %s", bucket_id, e)
        return []


def aggregate_data(window_events, web_events, afk_events):
    """Aggregate events into app usage, website usage, and idle time."""
    app_usage = defaultdict(float)  # app_name -> minutes
    web_usage = defaultdict(float)  # domain -> minutes
    idle_minutes = 0.0
    total_active_minutes = 0.0

    # Process window events (app usage)
    for event in window_events:
        duration = event.get("duration", 0)  # seconds
        data = event.get("data", {})
        app_name = data.get("app", "Unknown")
        
        if app_name and app_name != "Unknown":
            app_usage[app_name] += duration / 60.0
            total_active_minutes += duration / 60.0

    # Process web events (browser tab activity)
    for event in web_events:
        duration = event.get("duration", 0)
        data = event.get("data", {})
        url = data.get("url", "")
        
        if url:
            try:
                parsed = urlparse(url)
                domain = parsed.netloc or parsed.path
                # Remove www. prefix
                if domain.startswith("www."):
                    domain = domain[4:]
                if domain:
                    web_usage[domain] += duration / 60.0
            except Exception:
                pass

    # Process AFK events (idle time)
    for event in afk_events:
        duration = event.get("duration", 0)
        data = event.get("data", {})
        status = data.get("status", "")
        
        if status == "not-afk":
            # Active time from AFK tracker
            pass
        else:
            idle_minutes += duration / 60.0

    # Build result
    applications = [
        {"app_name": name, "duration_minutes": round(minutes)}
        for name, minutes in sorted(app_usage.items(), key=lambda x: x[1], reverse=True)
        if round(minutes) > 0
    ]

    websites = [
        {"domain": domain, "duration_minutes": round(minutes)}
        for domain, minutes in sorted(web_usage.items(), key=lambda x: x[1], reverse=True)
        if round(minutes) > 0
    ]

    return {
        "date": date.today().isoformat(),
        "applications": applications,
        "websites": websites,
        "idle_minutes": round(idle_minutes),
        "total_active_minutes": round(total_active_minutes),
    }


def upload_data(data):
    """Post aggregated data to FlowLock API."""
    try:
        resp = requests.post(
            f"{FLOWLOCK_API_URL}/api/productivity/upload",
            json=data,
            headers={
                "Authorization": f"Bearer {AUTH_TOKEN}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        resp.raise_for_status()
        result = resp.json()
        logger.info("Upload successful: session_id=%s", result.get("session_id"))
        return True
    except requests.HTTPError as e:
        logger.error("Upload failed (HTTP %s): %s", e.response.status_code, e.response.text)
        return False
    except Exception as e:
        logger.error("Upload failed: %s", e)
        return False


def run_once():
    """Run a single collection cycle."""
    logger.info("Starting data collection...")

    # Find buckets
    window_bucket, web_bucket, afk_bucket = find_buckets()
    
    if not window_bucket and not web_bucket and not afk_bucket:
        logger.warning("No ActivityWatch buckets found. Skipping this cycle.")
        return False

    logger.info("Found buckets: window=%s, web=%s, afk=%s", window_bucket, web_bucket, afk_bucket)

    # Get today's date range
    today = date.today()
    start = datetime(today.year, today.month, today.day)
    end = datetime(today.year, today.month, today.day, 23, 59, 59)

    # Fetch events
    window_events = fetch_events(window_bucket, start, end)
    web_events = fetch_events(web_bucket, start, end)
    afk_events = fetch_events(afk_bucket, start, end)

    logger.info(
        "Fetched events: window=%d, web=%d, afk=%d",
        len(window_events), len(web_events), len(afk_events),
    )

    # Aggregate
    data = aggregate_data(window_events, web_events, afk_events)
    logger.info(
        "Aggregated: %d apps, %d websites, %dm idle, %dm active",
        len(data["applications"]),
        len(data["websites"]),
        data["idle_minutes"],
        data["total_active_minutes"],
    )

    # Upload
    return upload_data(data)


def main():
    """Main loop."""
    if not AUTH_TOKEN:
        logger.error("SUPABASE_AUTH_TOKEN environment variable is required.")
        logger.error("Get your token from Supabase Auth and set it:")
        logger.error("  export SUPABASE_AUTH_TOKEN='your-jwt-token'")
        sys.exit(1)

    logger.info("FlowLock ActivityWatch Agent started")
    logger.info("AW API: %s", AW_API_URL)
    logger.info("FlowLock API: %s", FLOWLOCK_API_URL)
    logger.info("Poll interval: %ds", POLL_INTERVAL)

    while True:
        try:
            run_once()
        except Exception as e:
            logger.error("Unexpected error: %s", e)

        logger.info("Next collection in %d seconds...", POLL_INTERVAL)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
