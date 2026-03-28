# lip_sync_generator.py
import wave
import numpy as np

def generate_lip_sync(filepath, fps=12):
    """
    Tạo lip_sync_data dựa trên amplitude WAV file
    - filepath: đường dẫn WAV
    - fps: số frame lip-sync / giây
    Trả về: list [{"time": float, "phoneme": str}] cho EveRobot
    """
    lip_sync_data = []

    try:
        wf = wave.open(filepath, 'rb')
        n_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()

        duration = n_frames / framerate
        step = 1 / fps

        # Đọc tất cả dữ liệu
        raw = wf.readframes(n_frames)
        wf.close()

        audio = np.frombuffer(raw, dtype=np.int16)
        if n_channels > 1:
            audio = audio[::n_channels]

        # Chuẩn hóa biên độ từ 0 -> 1
        audio = np.abs(audio) / (2 ** (8 * sample_width - 1))

        for i in range(int(duration / step) + 1):
            start = int(i * step * framerate)
            end = int((i + 1) * step * framerate)
            chunk = audio[start:end]
            if len(chunk) == 0:
                value = 0
            else:
                value = float(np.mean(chunk))
            # map amplitude -> 0.0 - 1.0
            value = min(max(value, 0.0), 1.0)
            lip_sync_data.append({"time": i * step, "phoneme": value})
    except Exception as e:
        print("❌ Lip-sync error:", e)

    return lip_sync_data