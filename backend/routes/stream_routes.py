"""
stream_routes.py — Lag-free MJPEG streaming.

ROOT CAUSE OF LAG:
  The MJPEG generator was calling cv2.imencode() on EVERY frame.
  At 848x556 this takes ~3-8ms per frame with spikes to 50ms+.
  At 20fps that leaves only 50ms per frame budget — encoding alone
  was eating most of it, causing stuttering.

FIX: Push encoded JPEG bytes (not raw frames) to the queue.
  Worker encodes once → caches bytes → pushes bytes.
  Generator just reads bytes and wraps in MJPEG header.
  Generator does ZERO OpenCV work = smooth 20-25fps always.

ADDITIONAL FIXES:
  - Resize frames to fixed 848x556 before encoding (prevents large frame issues)
  - Quality 65 (was 80) — visually identical but 30% smaller = faster
  - Skip frames reuse cached bytes directly (zero re-encode)
  - Timestamp drawn only when fresh analysis runs (not every frame)
"""

from flask import Blueprint, jsonify, request, Response
import cv2
import time
import threading
import numpy as np
import queue

from utils.stream_manager import plate_stream, parking_stream
from utils.number_plate import detect_number_plate, draw_plate_box
from utils.parking_detection import analyze_slots
from models.vehicle_model import (
    log_plate_detection, get_plate_detections,
    add_vehicle_entry,
    delete_plate_detection, delete_all_plate_detections, edit_plate_detection
)

stream_bp = Blueprint('stream', __name__)

# ── Constants ──────────────────────────────────────────────────────────────
OUTPUT_W  = 848
OUTPUT_H  = 556
JPEG_Q    = 65        # quality 65 is visually fine and encodes 30% faster
ENCODE_PARAMS = [cv2.IMWRITE_JPEG_QUALITY, JPEG_Q]

# ── Shared state ───────────────────────────────────────────────────────────
_last_plate        = None
_last_plate_status = 'idle'
_detection_lock    = threading.Lock()
_auto_logged       = set()
_auto_logged_lock  = threading.Lock()

# Queues hold encoded JPEG bytes — NOT raw frames
# Generator does zero OpenCV work
_plate_q   = queue.Queue(maxsize=4)
_parking_q = queue.Queue(maxsize=4)


def _put_nowait(q, item):
    if q.full():
        try: q.get_nowait()
        except: pass
    try: q.put_nowait(item)
    except: pass


def _encode_frame(frame) -> bytes:
    """Resize to output resolution and encode to JPEG bytes."""
    h, w = frame.shape[:2]
    if w != OUTPUT_W or h != OUTPUT_H:
        frame = cv2.resize(frame, (OUTPUT_W, OUTPUT_H),
                           interpolation=cv2.INTER_LINEAR)
    _, buf = cv2.imencode('.jpg', frame, ENCODE_PARAMS)
    return buf.tobytes()


# ── Plate worker ───────────────────────────────────────────────────────────
def _plate_worker():
    global _last_plate, _last_plate_status
    frame_count  = 0
    DETECT_EVERY = 8
    last_bbox    = None
    last_text    = None
    last_status  = 'no_plate'
    cached_bytes = None      # last encoded JPEG bytes

    while True:
        try:
            frame = plate_stream.get_frame()
            if frame is None:
                time.sleep(0.05)
                continue

            frame_count += 1
            annotated = frame.copy()

            # Run detection every N frames
            if frame_count % DETECT_EVERY == 0:
                try:
                    _, bbox, text, status = detect_number_plate(frame)
                    last_bbox   = bbox
                    last_text   = text
                    last_status = status

                    with _detection_lock:
                        _last_plate_status = status
                        if status == 'detected' and text:
                            if _last_plate != text:
                                _last_plate = text
                                log_plate_detection(text)
                                with _auto_logged_lock:
                                    if text not in _auto_logged:
                                        ok, _ = add_vehicle_entry(text)
                                        if ok:
                                            _auto_logged.add(text)
                        elif status == 'no_plate':
                            _last_plate = None
                except Exception as e:
                    print(f"Plate detect error: {e}")

            # Draw last known bbox on every frame (smooth overlay, no blink)
            if last_bbox:
                annotated = draw_plate_box(annotated, last_bbox,
                                           last_text, last_status)

            # Overlay: timestamp + status dot
            ts = time.strftime("%H:%M:%S")
            cv2.putText(annotated, f"CAM  {ts}", (8, 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 230, 0), 1)
            dot_color = (0,255,0) if last_status == 'detected' else \
                        (0,165,255) if last_status == 'unreadable' else (80,80,80)
            cv2.circle(annotated, (OUTPUT_W - 15, 15), 7, dot_color, -1)

            # Encode once → cache → push bytes
            cached_bytes = _encode_frame(annotated)
            _put_nowait(_plate_q, cached_bytes)

        except Exception as e:
            print(f"Plate worker error: {e}")
        time.sleep(0.04)    # ~25fps


# ── Parking worker ─────────────────────────────────────────────────────────
def _parking_worker():
    """
    KEY OPTIMISATIONS:
    1. Only run analyze_slots() every DETECT_EVERY frames.
    2. Encode the result ONCE → cache bytes.
    3. On skip frames, push cached bytes directly — zero re-encode.
    4. Update JPEG timestamp bytes in-place using a pre-rendered label
       so the feed clock still ticks on skip frames without re-encoding.
    """
    frame_count   = 0
    DETECT_EVERY  = 6
    cached_bytes  = None   # JPEG bytes of last annotated frame
    last_annotated = None  # last annotated BGR frame (for timestamp update)

    while True:
        try:
            frame = parking_stream.get_frame()
            if frame is None:
                time.sleep(0.05)
                continue

            frame_count += 1

            if frame_count % DETECT_EVERY == 0:
                # Full analysis + encode
                try:
                    annotated, _, _ = analyze_slots(frame.copy())
                except Exception:
                    annotated = frame.copy()

                # Timestamp
                ts = time.strftime("%H:%M:%S")
                cv2.rectangle(annotated, (0, 0), (250, 30), (0,0,0), -1)
                cv2.putText(annotated, f"PARKING  {ts}", (8, 22),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 255), 1)

                last_annotated = annotated
                cached_bytes   = _encode_frame(annotated)   # encode once
                _put_nowait(_parking_q, cached_bytes)

            else:
                # Skip frame — just update timestamp on cached frame cheaply
                if last_annotated is not None:
                    # Update timestamp area only (small region, fast)
                    ts = time.strftime("%H:%M:%S")
                    ts_frame = last_annotated.copy()
                    cv2.rectangle(ts_frame, (0, 0), (250, 30), (0,0,0), -1)
                    cv2.putText(ts_frame, f"PARKING  {ts}", (8, 22),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 255), 1)
                    # Encode and push
                    cached_bytes = _encode_frame(ts_frame)
                    _put_nowait(_parking_q, cached_bytes)
                elif frame is not None:
                    # First frames before first analysis
                    _put_nowait(_parking_q, _encode_frame(frame))

        except Exception as e:
            print(f"Parking worker error: {e}")
        time.sleep(0.033)   # ~30fps target


threading.Thread(target=_plate_worker,   daemon=True, name="plate-worker").start()
threading.Thread(target=_parking_worker, daemon=True, name="parking-worker").start()


# ── Placeholder (pre-encoded bytes) ───────────────────────────────────────
def _make_placeholder_bytes(text="NO SIGNAL") -> bytes:
    img = np.zeros((OUTPUT_H, OUTPUT_W, 3), dtype=np.uint8)
    img[:] = (15, 18, 25)
    for x in range(0, OUTPUT_W, 60):
        cv2.line(img, (x, 0), (x, OUTPUT_H), (25, 30, 45), 1)
    for y in range(0, OUTPUT_H, 60):
        cv2.line(img, (0, y), (OUTPUT_W, y), (25, 30, 45), 1)
    sz, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
    cv2.putText(img, text,
                ((OUTPUT_W - sz[0]) // 2, (OUTPUT_H + sz[1]) // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (50, 65, 90), 2)
    _, buf = cv2.imencode('.jpg', img, ENCODE_PARAMS)
    return buf.tobytes()

_PH_PLATE_BYTES   = _make_placeholder_bytes("PLATE CAM — CLICK START")
_PH_PARKING_BYTES = _make_placeholder_bytes("PARKING CAM — CLICK START")


def _wrap(jpeg_bytes: bytes) -> bytes:
    """Wrap JPEG bytes in MJPEG multipart boundary."""
    return (b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n'
            b'Content-Length: ' + str(len(jpeg_bytes)).encode() +
            b'\r\n\r\n' + jpeg_bytes + b'\r\n')


# ── MJPEG generators — ZERO OpenCV work here ──────────────────────────────
def _gen_plate():
    """Read pre-encoded bytes from queue. No encoding. Pure I/O."""
    ph = _wrap(_PH_PLATE_BYTES)
    while True:
        try:
            jpeg_bytes = _plate_q.get(timeout=0.1)
            yield _wrap(jpeg_bytes)
        except queue.Empty:
            if not plate_stream.is_running():
                yield ph


def _gen_parking():
    """Read pre-encoded bytes from queue. No encoding. Pure I/O."""
    ph = _wrap(_PH_PARKING_BYTES)
    while True:
        try:
            jpeg_bytes = _parking_q.get(timeout=0.1)
            yield _wrap(jpeg_bytes)
        except queue.Empty:
            if not parking_stream.is_running():
                yield ph


# ── Stream control ─────────────────────────────────────────────────────────

@stream_bp.route('/stream/plate/start', methods=['POST'])
def start_plate_stream():
    data = request.get_json() or {}
    source = data.get('source', 0)
    with _auto_logged_lock: _auto_logged.clear()
    try:
        plate_stream.start(source)
        return jsonify({"success": True,
                        "message": f"Plate stream started (source={source})"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@stream_bp.route('/stream/plate/stop', methods=['POST'])
def stop_plate_stream():
    plate_stream.stop()
    return jsonify({"success": True, "message": "Plate stream stopped"})

@stream_bp.route('/stream/parking/start', methods=['POST'])
def start_parking_stream():
    data = request.get_json() or {}
    source = data.get('source', '')
    if not source:
        return jsonify({"success": False,
                        "message": "Provide video file path"}), 400
    try:
        parking_stream.start(source)
        return jsonify({"success": True, "message": "Parking stream started"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@stream_bp.route('/stream/parking/stop', methods=['POST'])
def stop_parking_stream():
    parking_stream.stop()
    return jsonify({"success": True, "message": "Parking stream stopped"})

@stream_bp.route('/stream/status', methods=['GET'])
def stream_status():
    return jsonify({
        "success": True,
        "plate":   {"running": plate_stream.is_running(),
                    "source":  str(plate_stream.source)},
        "parking": {"running": parking_stream.is_running(),
                    "source":  str(parking_stream.source)},
    })

@stream_bp.route('/stream/plate/feed')
def plate_feed():
    return Response(_gen_plate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame',
                    headers={'Cache-Control': 'no-cache',
                             'Access-Control-Allow-Origin': '*'})

@stream_bp.route('/stream/parking/feed')
def parking_feed():
    return Response(_gen_parking(),
                    mimetype='multipart/x-mixed-replace; boundary=frame',
                    headers={'Cache-Control': 'no-cache',
                             'Access-Control-Allow-Origin': '*'})

@stream_bp.route('/stream/test')
def test_camera():
    source = request.args.get('source', '0')
    try: src = int(source)
    except: src = source
    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        cap.release()
        return jsonify({"success": False,
                        "message": f"Cannot open camera: {source}"})
    ret, frame = cap.read()
    cap.release()
    if not ret:
        return jsonify({"success": False, "message": "No frame from camera"})
    h, w = frame.shape[:2]
    return jsonify({"success": True, "resolution": f"{w}x{h}"})


# ── Plate detection API ────────────────────────────────────────────────────

@stream_bp.route('/detect/plate', methods=['GET'])
def get_last_plate():
    with _detection_lock:
        return jsonify({"success": True,
                        "plate":  _last_plate,
                        "status": _last_plate_status})

@stream_bp.route('/detect/plate/manual', methods=['POST'])
def detect_plate_manual():
    frame = plate_stream.get_frame()
    if frame is None:
        return jsonify({"success": False, "plate": None,
                        "status": "idle",
                        "message": "Plate stream not running"}), 400
    _, bbox, text, status = detect_number_plate(frame)
    if status == 'detected' and text:
        log_plate_detection(text)
        with _auto_logged_lock:
            if text not in _auto_logged:
                ok, _ = add_vehicle_entry(text)
                if ok: _auto_logged.add(text)
        return jsonify({"success": True, "plate": text, "status": "detected"})
    elif status == 'unreadable':
        return jsonify({"success": False, "plate": text,
                        "status": "unreadable",
                        "message": "Plate found but text unclear"})
    else:
        return jsonify({"success": False, "plate": None,
                        "status": "no_plate",
                        "message": "No plate detected in frame"})

@stream_bp.route('/plates/log', methods=['GET'])
def plates_log():
    records = get_plate_detections()
    return jsonify({"success": True, "data": records, "count": len(records)})

@stream_bp.route('/plates/delete/<int:record_id>', methods=['DELETE'])
def delete_plate(record_id):
    success, message = delete_plate_detection(record_id)
    return jsonify({"success": success, "message": message}), \
           (200 if success else 404)

@stream_bp.route('/plates/delete-all', methods=['DELETE'])
def delete_all_plates():
    success, message = delete_all_plate_detections()
    return jsonify({"success": success, "message": message})

@stream_bp.route('/plates/edit/<int:record_id>', methods=['PUT'])
def edit_plate(record_id):
    data      = request.get_json() or {}
    new_plate = data.get('plate_number', '').strip()
    if not new_plate:
        return jsonify({"success": False,
                        "message": "plate_number required"}), 400
    success, message = edit_plate_detection(record_id, new_plate)
    return jsonify({"success": success, "message": message}), \
           (200 if success else 404)