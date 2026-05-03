import asyncio
import base64
import json
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import os

from detector import DrowsinessDetector, DetectionResult

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store active detectors per session
active_sessions: Dict[str, DrowsinessDetector] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AI Drowsiness Detection Service starting...")
    yield
    logger.info("🛑 AI Service shutting down. Cleaning up sessions...")
    active_sessions.clear()

app = FastAPI(
    title="Drowsiness Detection AI Service",
    description="Real-time driver drowsiness detection using MediaPipe Face Mesh",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "drowsiness-detection-ai",
        "version": "1.0.0",
        "active_sessions": len(active_sessions),
    }

@app.get("/session/{session_id}/stats")
async def get_session_stats(session_id: str):
    detector = active_sessions.get(session_id)
    if not detector:
        raise HTTPException(status_code=404, detail="Session not found")
    return detector.get_session_stats()

@app.post("/session/{session_id}/reset")
async def reset_session(session_id: str):
    if session_id in active_sessions:
        active_sessions[session_id].reset()
        return {"message": "Session reset successfully"}
    raise HTTPException(status_code=404, detail="Session not found")

@app.delete("/session/{session_id}")
async def end_session(session_id: str):
    if session_id in active_sessions:
        stats = active_sessions[session_id].get_session_stats()
        del active_sessions[session_id]
        return {"message": "Session ended", "final_stats": stats}
    raise HTTPException(status_code=404, detail="Session not found")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected: session={session_id}")

    # Create or reuse detector for this session
    if session_id not in active_sessions:
        active_sessions[session_id] = DrowsinessDetector(session_id=session_id)

    detector = active_sessions[session_id]

    try:
        while True:
            # Receive frame data (base64 encoded)
            raw = await websocket.receive_text()
            data = json.loads(raw)

            frame_b64 = data.get("frame")
            if not frame_b64:
                continue

            # Decode base64 image
            try:
                # Strip data URI prefix if present
                if "," in frame_b64:
                    frame_b64 = frame_b64.split(",")[1]
                frame_bytes = base64.b64decode(frame_b64)
                np_arr = np.frombuffer(frame_bytes, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                # Process frame
                result: DetectionResult = await asyncio.get_event_loop().run_in_executor(
                    None, detector.process_frame, frame
                )

                # Send result back
                await websocket.send_json(result.to_dict())

            except Exception as e:
                logger.error(f"Frame processing error: {e}")
                await websocket.send_json({"error": str(e), "session_id": session_id})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Keep session alive for stats retrieval; cleanup happens via DELETE endpoint
        logger.info(f"WebSocket handler exiting: session={session_id}")


if __name__ == "__main__":
    port = int(os.getenv("AI_PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, workers=1)
