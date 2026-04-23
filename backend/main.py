from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from PIL import Image
import numpy as np
import io

from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("yolov8n.pt")

state = {
    "person_detected": False,
    "last_detected_at": None,
}


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    img_array = np.array(img)

    results = model.predict(img_array, classes=[0], verbose=False)
    boxes = results[0].boxes
    detected = len(boxes) > 0

    state["person_detected"] = detected
    if detected:
        state["last_detected_at"] = datetime.now(timezone.utc).isoformat()

    boxes_data = [
        {"x1": float(b[0]), "y1": float(b[1]), "x2": float(b[2]), "y2": float(b[3])}
        for b in boxes.xyxy.tolist()
    ]

    return {
        "person_detected": state["person_detected"],
        "last_detected_at": state["last_detected_at"],
        "boxes": boxes_data,
        "image_width": img_array.shape[1],
        "image_height": img_array.shape[0],
    }


@app.get("/status")
def status():
    return {
        "person_detected": state["person_detected"],
        "last_detected_at": state["last_detected_at"],
    }
