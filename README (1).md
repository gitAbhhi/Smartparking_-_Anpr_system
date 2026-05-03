# 🅿 SmartPark v2 — Intelligent Parking System
### Computer Vision · Flask API · React Dashboard · Excel Storage

---

## 📁 Project Structure

```
smart-parking/
├── backend/
│   ├── app.py                        ← Flask entry point
│   ├── requirements.txt              ← Python dependencies
│   ├── data/
│   │   ├── parking_log.xlsx          ← Auto-created: vehicle entry/exit log
│   │   ├── plate_detections.xlsx     ← Auto-created: detected plate numbers
│   │   └── slots_config.json         ← Parking slot coordinates
│   ├── models/
│   │   ├── vehicle_model.py          ← Excel CRUD for vehicles + plate log
│   │   └── slot_model.py             ← Slot coordinate config
│   ├── routes/
│   │   ├── vehicle_routes.py         ← /entry /exit /vehicles APIs
│   │   ├── slot_routes.py            ← /slots API
│   │   └── stream_routes.py          ← /stream/* + MJPEG feeds + plate log API
│   └── utils/
│       ├── number_plate.py           ← EasyOCR + 5-pass preprocessing pipeline
│       ├── parking_detection.py      ← OpenCV slot occupancy analysis
│       └── stream_manager.py         ← TWO independent stream managers
│
└── frontend/
    ├── package.json
    └── src/
        ├── App.js                    ← Router + global stream status
        ├── App.css                   ← Full dark industrial design system
        ├── index.js                  ← React entry
        ├── components/
        │   ├── Navbar.js             ← Nav with CAM + VIDEO status badges
        │   ├── SlotGrid.js           ← Visual slot map (green=free, red=busy)
        │   └── VehicleTable.js       ← Reusable vehicle log table
        └── pages/
            ├── Dashboard.js          ← Overview: stats, slot map, plate log
            ├── PlateDetection.js     ← WEBCAM stream + plate log table
            ├── ParkingSlots.js       ← VIDEO FILE stream + slot map
            ├── VehicleLogs.js        ← Full log with filter + search
            └── ManualEntry.js        ← Manual entry/exit + camera auto-fill
```

---

## ⚙️ Setup Instructions

### Step 1 — Extract the Project

```
Unzip smart-parking-v2.zip
cd smart-parking
```

---

### Step 2 — Backend Setup

```bash
cd backend

# (Recommended) Create virtual environment
python -m venv venv

# Activate — Windows:
venv\Scripts\activate

# Activate — Mac/Linux:
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
```

Backend runs at: **http://localhost:5000**

> **Note on EasyOCR:** First run downloads model weights (~200MB). This happens once only. After that startup is instant.

---

### Step 3 — Frontend Setup

Open a **new terminal**:

```bash
cd frontend
npm install
npm start
```

Frontend runs at: **http://localhost:3000**

---

## 🚀 How to Use — Two Independent Features

### 🔍 Feature 1: Number Plate Detection (Webcam)

1. Click **🔍 Plate Detection** in the navbar
2. Enter webcam index (`0` = default, `1` = second camera)
3. Click **▶ Start Webcam**
4. Live feed shows webcam with detection overlay
5. Plates are auto-scanned every 2 seconds in the background
6. Use **🔍 Detect Now** for an immediate single-frame scan
7. When a valid plate is found:
   - ✅ Plate number shown in large yellow text on screen
   - Saved automatically to `plate_detections.xlsx`
   - Appears instantly in the Detection Log table below
8. When no plate is found: ❌ **NO PLATE DETECTED** message shown, nothing saved
9. When plate region found but unreadable: ⚠️ **PLATE UNREADABLE** message shown

> **Runs completely independently from parking slot detection**

---

### 🅿 Feature 2: Parking Slot Detection (Video File)

1. Click **🅿 Parking Slots** in the navbar
2. Enter the full path to your parking lot video file
   - Example Windows: `C:\Users\YourName\Videos\parking.mp4`
   - Example Linux/Mac: `/home/user/videos/parking.mp4`
3. Click **▶ Start Video**
4. Live feed shows slot detection overlay — 🟢 Green = Free, 🔴 Red = Occupied
5. Slot map updates live every 3 seconds
6. Video file loops automatically (great for demo/college presentation)

> **Runs completely independently from webcam / plate detection**

---

### Running Both at the Same Time

Both features can run **simultaneously** with no conflict:
- Plate Detection page → using Webcam (port 0)
- Parking Slots page → using video file

The Navbar shows two separate status badges:
- `CAM LIVE / OFF` → webcam stream status
- `VIDEO LIVE / OFF` → parking video status

---

## 📊 Excel Output Files

### plate_detections.xlsx — Plate Detection Log

| plate_number | detected_at         |
|-------------|---------------------|
| DL01AB1234  | 2024-01-15 10:05:32 |
| MH02CD5678  | 2024-01-15 10:07:14 |

Only valid Indian plate numbers are saved (format: AA00AA0000).
No plate detected = nothing saved.

---

### parking_log.xlsx — Vehicle Entry/Exit Log

| vehicle_number | entry_time          | exit_time           | duration | status |
|----------------|---------------------|---------------------|----------|--------|
| DL01AB1234     | 2024-01-15 10:00:00 | 2024-01-15 12:30:00 | 150 min  | exited |
| MH02CD5678     | 2024-01-15 11:15:00 |                     |          | inside |

---

## 📡 API Reference

### Stream Control

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| POST   | `/api/stream/plate/start`   | Start webcam stream `{source: 0}`        |
| POST   | `/api/stream/plate/stop`    | Stop webcam stream                       |
| POST   | `/api/stream/parking/start` | Start video stream `{source: "path.mp4"}`|
| POST   | `/api/stream/parking/stop`  | Stop video stream                        |
| GET    | `/api/stream/status`        | Status of both streams                   |

### Live Feeds (MJPEG)

| Endpoint                     | Description                         |
|------------------------------|-------------------------------------|
| `/api/stream/plate/feed`     | Webcam with plate detection overlay |
| `/api/stream/parking/feed`   | Video with slot detection overlay   |

### Plate Detection

| Method | Endpoint                    | Description                           |
|--------|-----------------------------|---------------------------------------|
| GET    | `/api/detect/plate`         | Last background-detected plate        |
| POST   | `/api/detect/plate/manual`  | Detect plate on current frame now     |
| GET    | `/api/plates/log`           | All saved plate detections from Excel |

### Vehicle Logs

| Method | Endpoint               | Description               |
|--------|------------------------|---------------------------|
| GET    | `/api/vehicles`        | All vehicle records       |
| GET    | `/api/vehicles/active` | Currently parked vehicles |
| POST   | `/api/entry`           | Log vehicle entry         |
| POST   | `/api/exit`            | Log vehicle exit          |

### Parking Slots

| Method | Endpoint            | Description                    |
|--------|---------------------|--------------------------------|
| GET    | `/api/slots`        | Current slot status (live)     |
| GET    | `/api/slots/config` | Slot coordinate config         |
| POST   | `/api/slots/config` | Update slot coordinates        |

---

## 🔧 Calibrating Parking Slots for Your Camera

Edit `backend/models/slot_model.py` → `DEFAULT_SLOTS` list.

Each slot is defined as:
```python
{"id": 1, "x": 50, "y": 50, "w": 100, "h": 50}
#           ↑ left  ↑ top   ↑ width  ↑ height  (pixels)
```

Steps to calibrate:
1. Take a screenshot of your parking lot video frame
2. Open in Paint / Photoshop / any image editor
3. Hover over each parking space corner to get pixel coordinates
4. Update `DEFAULT_SLOTS` with those values
5. Restart the backend — changes take effect immediately

Also adjust `OCCUPANCY_THRESHOLD` in `parking_detection.py` if slots are misdetected:
- Increase value → fewer false "occupied" detections
- Decrease value → more sensitive detection

---

## 🧪 Plate Detection — How It Works

The detection pipeline runs **5 preprocessing passes** on each frame:

```
Frame → Haar Cascade locates plate region
      ↓
Plate crop → 5x preprocessing variants:
   1. CLAHE histogram equalisation
   2. Adaptive threshold (Gaussian)
   3. Otsu threshold on CLAHE image
   4. Bilateral filter + binary threshold
   5. Raw upscaled colour image
      ↓
EasyOCR reads each variant
      ↓
Results validated against Indian plate regex: AA00AA0000
      ↓
Valid plate → saved to Excel + shown on screen
No valid plate → "No Plate Detected" shown, nothing saved
```

---

## 🐞 Troubleshooting

| Problem | Solution |
|---------|----------|
| EasyOCR slow on first run | It downloads model weights (~200MB) once — wait for it |
| Camera won't open | Try webcam index `0`, `1`, or `2` |
| Video file not found | Use the full absolute path, not a relative path |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` again |
| CORS error in browser | Ensure Flask is running on port 5000 |
| Slots all showing occupied | Increase `OCCUPANCY_THRESHOLD` in `parking_detection.py` |
| Plate never detected | Ensure good lighting, plate fills ≥1/4 of frame width |
| Excel file locked | Close the file if currently open in Excel |
| Plate detected but not saved | Only valid Indian plate formats (AA00AA0000) are saved |

---

## 👥 Team Responsibilities

| Role | Files |
|------|-------|
| CV Developer | `utils/number_plate.py`, `utils/parking_detection.py`, `utils/stream_manager.py` |
| Backend Developer | `app.py`, `routes/`, `models/` |
| Frontend Developer | `src/pages/`, `src/components/`, `App.css` |

---

## 🔮 Future Enhancements

- [ ] Payment calculation (parking rate × duration)
- [ ] YOLO v8 for improved plate detection accuracy
- [ ] Mobile app (React Native)
- [ ] SMS/Email alert when lot is full
- [ ] Cloud deployment (Render / Railway / AWS)
- [ ] QR code ticketing system

---

*SmartPark v2.0 — Built for college demonstration*
*Python · OpenCV · EasyOCR · Flask · React*
