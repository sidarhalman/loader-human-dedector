from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from PIL import Image
import numpy as np
import onnxruntime as ort
import io
import gc

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

INPUT_SIZE = 640
CONF_THRESHOLD = 0.5
IOU_THRESHOLD = 0.45

session = ort.InferenceSession("yolov8n.onnx", providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name

state = {
    "person_detected": False,
    "last_detected_at": None,
}


def preprocess(img: Image.Image) -> np.ndarray:
    img = img.resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr.transpose(2, 0, 1), 0)


def nms(boxes: np.ndarray, scores: np.ndarray) -> list[int]:
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        inter_x1 = np.maximum(x1[i], x1[order[1:]])
        inter_y1 = np.maximum(y1[i], y1[order[1:]])
        inter_x2 = np.minimum(x2[i], x2[order[1:]])
        inter_y2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0, inter_x2 - inter_x1) * np.maximum(0, inter_y2 - inter_y1)
        iou = inter / (areas[i] + areas[order[1:]] - inter)
        order = order[1:][iou <= IOU_THRESHOLD]
    return keep


def postprocess(output: np.ndarray, orig_w: int, orig_h: int) -> list[dict]:
    preds = output[0].T  # (8400, 84)
    person_scores = preds[:, 4]  # class 0 = person
    mask = person_scores > CONF_THRESHOLD
    if not mask.any():
        return []

    scores = person_scores[mask]
    cx, cy, w, h = preds[mask, 0], preds[mask, 1], preds[mask, 2], preds[mask, 3]

    scale_x, scale_y = orig_w / INPUT_SIZE, orig_h / INPUT_SIZE
    x1 = (cx - w / 2) * scale_x
    y1 = (cy - h / 2) * scale_y
    x2 = (cx + w / 2) * scale_x
    y2 = (cy + h / 2) * scale_y

    boxes = np.stack([x1, y1, x2, y2], axis=1)
    keep = nms(boxes, scores)

    return [
        {"x1": float(boxes[i][0]), "y1": float(boxes[i][1]),
         "x2": float(boxes[i][2]), "y2": float(boxes[i][3])}
        for i in keep
    ]


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    orig_w, orig_h = img.size

    inp = preprocess(img)
    output = session.run(None, {input_name: inp})

    boxes = postprocess(output[0], orig_w, orig_h)
    detected = len(boxes) > 0

    state["person_detected"] = detected
    if detected:
        state["last_detected_at"] = datetime.now(timezone.utc).isoformat()

    del inp, output, img, contents
    gc.collect()

    return {
        "person_detected": state["person_detected"],
        "last_detected_at": state["last_detected_at"],
        "boxes": boxes,
        "image_width": orig_w,
        "image_height": orig_h,
    }


@app.get("/status")
def status():
    return {
        "person_detected": state["person_detected"],
        "last_detected_at": state["last_detected_at"],
    }
