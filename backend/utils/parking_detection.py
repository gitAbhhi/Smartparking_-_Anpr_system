"""
parking_detection.py — Stable slot detection with temporal smoothing.
Fixes blinking by requiring CONFIRM_FRAMES consecutive readings before
changing state, and keeping a smoothed rolling vote.
"""

import cv2
import numpy as np
from collections import deque
from models.slot_model import load_slots, get_slots_status

OCCUPANCY_THRESHOLD = 900
CONFIRM_FRAMES      = 5
HISTORY_SIZE        = 8


class SlotTracker:
    def __init__(self, slot_id):
        self.slot_id       = slot_id
        self.confirmed     = False
        self.history       = deque(maxlen=HISTORY_SIZE)
        self.pending_state = None
        self.pending_count = 0

    def update(self, raw_occupied: bool) -> bool:
        self.history.append(raw_occupied)
        if raw_occupied == self.confirmed:
            self.pending_state = None
            self.pending_count = 0
            return self.confirmed
        if raw_occupied == self.pending_state:
            self.pending_count += 1
        else:
            self.pending_state = raw_occupied
            self.pending_count = 1
        if self.pending_count >= CONFIRM_FRAMES:
            self.confirmed     = raw_occupied
            self.pending_state = None
            self.pending_count = 0
        return self.confirmed


_trackers: dict = {}

def _get_tracker(slot_id):
    if slot_id not in _trackers:
        _trackers[slot_id] = SlotTracker(slot_id)
    return _trackers[slot_id]

def reset_trackers():
    _trackers.clear()


def preprocess_frame(frame):
    gray   = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blur   = cv2.GaussianBlur(gray, (3, 3), 1)
    _, th  = cv2.threshold(blur, 100, 255, cv2.THRESH_BINARY_INV)
    kernel = np.ones((3, 3), np.uint8)
    return cv2.dilate(th, kernel, iterations=1)


def _raw_occupied(processed, slot) -> bool:
    fh, fw = processed.shape[:2]
    x = min(slot['x'], fw - 1)
    y = min(slot['y'], fh - 1)
    w = min(slot['w'], fw - x)
    h = min(slot['h'], fh - y)
    if w <= 0 or h <= 0:
        return False
    return int(cv2.countNonZero(processed[y:y+h, x:x+w])) > OCCUPANCY_THRESHOLD


def analyze_slots(frame):
    slots        = load_slots()
    processed    = preprocess_frame(frame)
    occupied_ids = []

    for slot in slots:
        raw      = _raw_occupied(processed, slot)
        occupied = _get_tracker(slot['id']).update(raw)
        if occupied:
            occupied_ids.append(slot['id'])

        x, y, w, h = slot['x'], slot['y'], slot['w'], slot['h']
        color = (0, 0, 255) if occupied else (0, 255, 0)
        cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
        cv2.putText(frame, f"P{slot['id']}:{'X' if occupied else 'O'}",
                    (x+2, y+h-5), cv2.FONT_HERSHEY_SIMPLEX, 0.38, color, 1)

    total = len(slots)
    occ   = len(occupied_ids)
    free  = total - occ
    cv2.rectangle(frame, (0, 0), (230, 70), (0, 0, 0), -1)
    cv2.putText(frame, f"Total:    {total}", (5, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255,255,255), 1)
    cv2.putText(frame, f"Free:     {free}",  (5, 44),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,255,0),     1)
    cv2.putText(frame, f"Occupied: {occ}",   (5, 66),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,0,255),     1)

    return frame, get_slots_status(occupied_ids), occupied_ids