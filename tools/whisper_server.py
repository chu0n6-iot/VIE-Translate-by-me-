"""
VIE-Translate — Local Whisper server (OpenAI-compatible, free & private).
Cài:  pip install faster-whisper fastapi uvicorn python-multipart
GPU : python tools/whisper_server.py --device cuda --port 8000 --model large-v3
CPU : python tools/whisper_server.py --device cpu  --port 8001 --model small
Chạy cả hai cùng lúc = GPU + CPU song song (chọn chế độ "both" trong popup).
"""
import argparse
import os
import tempfile

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
ap.add_argument("--model", default="small")
ap.add_argument("--port", type=int, default=8001)
args = ap.parse_args()

model = WhisperModel(
    args.model,
    device=args.device,
    compute_type="float16" if args.device == "cuda" else "int8",
)
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"ok": True, "device": args.device, "model": args.model}


@app.post("/v1/audio/transcriptions")
async def transcribe(file: UploadFile = File(...), language: str = Form(None), prompt: str = Form(None)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as f:
        f.write(await file.read())
        path = f.name
    try:
        segs, _ = model.transcribe(path, language=language or None, initial_prompt=prompt or None, vad_filter=True, beam_size=1)
        return {"text": " ".join(s.text.strip() for s in segs).strip()}
    finally:
        os.unlink(path)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=args.port)
