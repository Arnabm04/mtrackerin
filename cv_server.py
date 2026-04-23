"""
FastAPI wrapper around your existing analyze_crowd() logic.

Run locally:
    pip install fastapi uvicorn python-multipart opencv-python ultralytics supervision
    python cv_server.py

Then expose it (so the deployed Lovable app can reach it):
    - Localhost test:   set CV_BACKEND_URL=http://localhost:8000 in Lovable
      (works only when previewing inside the same machine via a tunnel)
    - Recommended:      use ngrok / cloudflared:
          ngrok http 8000
      Copy the https URL into the CV_BACKEND_URL secret in Lovable.

Endpoint:
    POST /analyze    multipart "file" (image) -> JSON
    {
        "count": 17,
        "occupancy": 0.34,
        "score": 0.41,
        "density": "MEDIUM"
    }
"""

import io
import tempfile
import os

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import supervision as sv

model = YOLO("yolov8m.pt")

app = FastAPI(title="Metro Crowd CV")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


def analyze_crowd_bytes(image_bytes: bytes):
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    image = cv2.resize(image, (1280, 720))

    results = model(image, conf=0.4, iou=0.5)[0]
    detections = sv.Detections.from_ultralytics(results)
    person_detections = detections[detections.class_id == 0]
    person_detections = person_detections.with_nms(threshold=0.5)
    person_count = int(len(person_detections))

    mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)
    for box in person_detections.xyxy:
        x1, y1, x2, y2 = map(int, box)
        mask[y1:y2, x1:x2] = 1
    coverage = float(np.sum(mask)) / float(image.shape[0] * image.shape[1])

    count_score = min(person_count / 50, 1)
    final_score = 0.6 * coverage + 0.4 * count_score

    if final_score < 0.25:
        density = "LOW"
    elif final_score < 0.55:
        density = "MEDIUM"
    else:
        density = "HIGH"

    return {
        "count": person_count,
        "occupancy": round(coverage, 4),
        "score": round(final_score, 4),
        "density": density,
    }


@app.get("/")
def root():
    return {"ok": True, "service": "metro-crowd-cv"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    return analyze_crowd_bytes(data)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))