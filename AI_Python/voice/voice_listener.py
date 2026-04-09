import whisper
import sounddevice as sd
import numpy as np

model = whisper.load_model("base")

def listen():
    fs = 16000
    duration = 3

    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1)
    sd.wait()

    result = model.transcribe(audio.flatten())
    return result["text"]