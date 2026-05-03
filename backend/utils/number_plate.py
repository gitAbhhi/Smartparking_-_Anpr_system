"""
number_plate.py — Fast plate detection using Tesseract OCR.
Rule: Only plates with EXACTLY 10 characters are saved to Excel.
"""

import cv2
import numpy as np
import re

import pytesseract
# Windows path — update if installed elsewhere
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Multiple PSM configs for best read accuracy
_TESS_CONFIGS = [
    '--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    '--oem 3 --psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    '--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    '--oem 1 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
]

# Indian plate regex — exactly 10 chars: AA00AA0000
PLATE_PATTERN = re.compile(r'^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$')

def clean(raw: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', raw.upper().strip())

def is_valid_plate(text: str) -> bool:
    """
    Valid plate MUST:
    1. Be exactly 10 characters
    2. Match Indian format AA00AA0000
    """
    t = clean(text)
    if len(t) != 10:          # ← STRICT: exactly 10 chars only
        return False
    return bool(PLATE_PATTERN.match(t))


# Character correction map
_L2D = {'O':'0','I':'1','L':'1','S':'5','B':'8','G':'6','Z':'2','Q':'0','D':'0'}
_D2L = {'0':'O','1':'I','5':'S','8':'B','6':'G','2':'Z'}

def fix_plate(text: str) -> str:
    if len(text) < 6:
        return text
    t = list(text)
    n = len(t)
    # Pos 0-1: letters (state code)
    for i in range(min(2, n)):
        if t[i].isdigit():
            t[i] = _D2L.get(t[i], t[i])
    # Pos 2-3: digits (district)
    for i in range(2, min(4, n)):
        if t[i].isalpha():
            t[i] = _L2D.get(t[i], t[i])
    # Last 4: digits
    for i in range(max(0, n-4), n):
        if t[i].isalpha():
            t[i] = _L2D.get(t[i], t[i])
    # Middle (pos 4 to n-4): letters
    for i in range(4, max(4, n-4)):
        if t[i].isdigit():
            t[i] = _D2L.get(t[i], t[i])
    return ''.join(t)


def preprocess_plate(plate_img):
    if plate_img is None or plate_img.size == 0:
        return []
    h, w = plate_img.shape[:2]
    if h < 10 or w < 20:
        return []

    # Crop IND logo (left 12%)
    plate_img = plate_img[:, int(w * 0.12):]
    h, w = plate_img.shape[:2]

    # Upscale
    scale    = 100 / max(h, 1)
    upscaled = cv2.resize(plate_img, (int(w * scale * 1.5), 100),
                          interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)

    clahe  = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(4, 4))
    cl     = clahe.apply(gray)
    _, otsu = cv2.threshold(cl, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    blur   = cv2.GaussianBlur(gray, (3, 3), 0)
    adapt  = cv2.adaptiveThreshold(blur, 255,
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 21, 10)
    kernel    = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
    sharpened = cv2.filter2D(cl, -1, kernel)

    return [gray, cl, otsu, cv2.bitwise_not(otsu), adapt, sharpened]


def run_ocr(plate_img):
    """
    Run OCR and return (text, is_valid).
    Only text with exactly 10 chars after cleaning counts as valid.
    """
    variants = preprocess_plate(plate_img)
    if not variants:
        return None, False

    best_partial = None
    best_len     = 0

    for variant in variants:
        padded = cv2.copyMakeBorder(variant, 15, 15, 15, 15,
                                    cv2.BORDER_CONSTANT, value=255)
        for cfg in _TESS_CONFIGS:
            try:
                raw  = pytesseract.image_to_string(padded, config=cfg)
                text = clean(raw)
                if len(text) < 4:
                    continue

                text = fix_plate(text)

                # Check exact 10-char valid plate
                if is_valid_plate(text):
                    return text, True   # perfect — return immediately

                # Keep best partial for status display only (won't be saved)
                if len(text) > best_len:
                    best_len     = len(text)
                    best_partial = text

            except Exception:
                continue

    # Return partial read for UI display — but mark as invalid (not saved)
    if best_partial and best_len >= 5:
        return best_partial, False
    return None, False


# Haar cascade
_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_russian_plate_number.xml'
)


def detect_number_plate(frame):
    """
    Returns:
        plate_img  : cropped plate or None
        bbox       : (x,y,w,h) or None
        plate_text : string or None
        status     : 'detected'   → exactly 10 chars, valid, WILL BE SAVED
                     'unreadable' → found region but < 10 chars or invalid, NOT saved
                     'no_plate'   → nothing found
    """
    if frame is None:
        return None, None, None, 'no_plate'

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    found = []
    for scale in [1.05, 1.08, 1.1]:
        plates = _cascade.detectMultiScale(
            gray, scaleFactor=scale, minNeighbors=4,
            minSize=(60, 20), maxSize=(600, 200)
        )
        if len(plates):
            found.extend(plates.tolist())

    # Also scan center crop
    fh, fw = frame.shape[:2]
    cx, cy = fw//4, fh//4
    cc     = frame[cy:fh-cy, cx:fw-cx]
    gray_c = cv2.equalizeHist(cv2.cvtColor(cc, cv2.COLOR_BGR2GRAY))
    pls_c  = _cascade.detectMultiScale(gray_c, 1.05, 4,
                                        minSize=(50,15), maxSize=(500,180))
    if len(pls_c):
        for x,y,w,h in pls_c:
            found.append([x+cx, y+cy, w, h])

    if not found:
        return None, None, None, 'no_plate'

    found.sort(key=lambda p: p[2]*p[3], reverse=True)

    fallback = None
    for x, y, w, h in found[:3]:
        if not (1.5 < w/max(h,1) < 6.5):
            continue
        pad = 6
        crop = frame[max(0,y-pad):min(fh,y+h+pad),
                     max(0,x-pad):min(fw,x+w+pad)]
        text, valid = run_ocr(crop)

        if valid:
            # Exactly 10 chars — will be saved to Excel
            return crop, (x, y, w, h), text, 'detected'
        elif text:
            # Partial read — show on screen but NOT saved
            fallback = (crop, (x, y, w, h), text, 'unreadable')

    if fallback:
        return fallback

    # Region found but no readable text
    x, y, w, h = found[0]
    crop = frame[max(0,y-6):min(fh,y+h+6), max(0,x-6):min(fw,x+w+6)]
    return crop, (x, y, w, h), None, 'unreadable'


def draw_plate_box(frame, bbox, text, status):
    if bbox is None or frame is None:
        return frame
    x, y, w, h   = bbox
    font          = cv2.FONT_HERSHEY_SIMPLEX
    font_scale    = 0.8
    font_thick    = 2

    if status == 'detected' and text:
        color = (0, 255, 0)       # Green — valid 10-char plate
        label = text
        thick = 3
    elif status == 'unreadable':
        color = (0, 165, 255)     # Orange — partial/short read
        label = f"Scanning... ({len(clean(text)) if text else 0}/10)"
        thick = 2
    else:
        return frame

    cv2.rectangle(frame, (x, y), (x+w, y+h), color, thick)
    (tw, th), _ = cv2.getTextSize(label, font, font_scale, font_thick)
    ly = y - 10 if y - 10 > th else y + h + th + 10
    cv2.rectangle(frame, (x, ly-th-8), (x+tw+10, ly+4), color, -1)
    cv2.putText(frame, label, (x+5, ly-2), font, font_scale, (0,0,0), font_thick)
    return frame