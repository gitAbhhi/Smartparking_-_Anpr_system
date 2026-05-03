import cv2
import threading
import time


class SingleStream:
    """Thread-safe single video stream (webcam or video file)."""

    def __init__(self, name="stream"):
        self.name = name
        self.cap = None
        self.frame = None
        self.running = False
        self.lock = threading.Lock()
        self.source = None
        self._thread = None

    def start(self, source):
        if self.running:
            self.stop()

        self.source = source
        try:
            src = int(source)
        except (ValueError, TypeError):
            src = str(source)

        self.cap = cv2.VideoCapture(src)
        if not self.cap.isOpened():
            raise RuntimeError(f"[{self.name}] Cannot open source: {source}")

        self.running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()
        print(f"📷 [{self.name}] Stream started -> {source}")

    def _read_loop(self):
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                if self.source not in (0, "0", 0):
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    self.running = False
                    break
            with self.lock:
                self.frame = frame
            time.sleep(0.03)

    def get_frame(self):
        with self.lock:
            return self.frame.copy() if self.frame is not None else None

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()
        self.cap = None
        self.frame = None
        print(f"📷 [{self.name}] Stream stopped")

    def is_running(self):
        return self.running


# Two independent global streams
plate_stream   = SingleStream(name="plate-webcam")    # webcam -> number plates
parking_stream = SingleStream(name="parking-video")   # video file -> slot detection
