import pandas as pd
import os
from datetime import datetime

EXCEL_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'parking_log.xlsx')
PLATE_LOG  = os.path.join(os.path.dirname(__file__), '..', 'data', 'plate_detections.xlsx')


def _ensure(path, columns):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        pd.DataFrame(columns=columns).to_excel(path, index=False)


# ── Vehicle entry / exit ───────────────────────────────────────────────────

def get_all_vehicles():
    _ensure(EXCEL_FILE, ['vehicle_number','entry_time','exit_time','duration','status'])
    df = pd.read_excel(EXCEL_FILE).fillna('')
    return df.to_dict(orient='records')


def get_active_vehicles():
    _ensure(EXCEL_FILE, ['vehicle_number','entry_time','exit_time','duration','status'])
    df = pd.read_excel(EXCEL_FILE)
    return df[df['status'] == 'inside'].fillna('').to_dict(orient='records')


def add_vehicle_entry(vehicle_number):
    _ensure(EXCEL_FILE, ['vehicle_number','entry_time','exit_time','duration','status'])
    df = pd.read_excel(EXCEL_FILE)
    if not df[(df['vehicle_number'] == vehicle_number) & (df['status'] == 'inside')].empty:
        return False, "Vehicle already inside"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    row = {'vehicle_number': vehicle_number.upper(), 'entry_time': now,
           'exit_time': '', 'duration': '', 'status': 'inside'}
    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    df.to_excel(EXCEL_FILE, index=False)
    return True, "Entry logged"


def update_vehicle_exit(vehicle_number):
    _ensure(EXCEL_FILE, ['vehicle_number','entry_time','exit_time','duration','status'])
    df = pd.read_excel(EXCEL_FILE)
    mask = (df['vehicle_number'] == vehicle_number.upper()) & (df['status'] == 'inside')
    if df[mask].empty:
        return False, "Vehicle not found or already exited"
    now  = datetime.now()
    idx  = df[mask].index[-1]
    entry_time    = datetime.strptime(str(df.at[idx,'entry_time']), "%Y-%m-%d %H:%M:%S")
    duration_mins = int((now - entry_time).total_seconds() / 60)
    df.at[idx,'exit_time'] = now.strftime("%Y-%m-%d %H:%M:%S")
    df.at[idx,'duration']  = f"{duration_mins} min"
    df.at[idx,'status']    = 'exited'
    df.to_excel(EXCEL_FILE, index=False)
    return True, f"Exit logged. Duration: {duration_mins} min"


# ── Plate detection log ────────────────────────────────────────────────────

def log_plate_detection(plate_number):
    _ensure(PLATE_LOG, ['id','plate_number','detected_at'])
    df = pd.read_excel(PLATE_LOG).fillna('')
    now    = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_id = int(df['id'].max()) + 1 if len(df) > 0 and 'id' in df.columns and df['id'].notna().any() else 1
    row    = {'id': new_id, 'plate_number': plate_number, 'detected_at': now}
    df     = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    df.to_excel(PLATE_LOG, index=False)
    return new_id


def get_plate_detections(limit=100):
    _ensure(PLATE_LOG, ['id','plate_number','detected_at'])
    df = pd.read_excel(PLATE_LOG).fillna('')
    # Ensure id column exists
    if 'id' not in df.columns:
        df.insert(0, 'id', range(1, len(df)+1))
        df.to_excel(PLATE_LOG, index=False)
    return df.tail(limit).iloc[::-1].to_dict(orient='records')


def delete_plate_detection(record_id):
    """Delete a single plate detection record by id."""
    _ensure(PLATE_LOG, ['id','plate_number','detected_at'])
    df = pd.read_excel(PLATE_LOG).fillna('')
    if 'id' not in df.columns:
        return False, "No id column found"
    before = len(df)
    df = df[df['id'] != int(record_id)]
    if len(df) == before:
        return False, "Record not found"
    df.to_excel(PLATE_LOG, index=False)
    return True, "Record deleted"


def delete_all_plate_detections():
    """Clear entire plate detection log."""
    _ensure(PLATE_LOG, ['id','plate_number','detected_at'])
    pd.DataFrame(columns=['id','plate_number','detected_at']).to_excel(PLATE_LOG, index=False)
    return True, "All records cleared"


def edit_plate_detection(record_id, new_plate_number):
    """Edit a plate number by record id."""
    _ensure(PLATE_LOG, ['id','plate_number','detected_at'])
    df = pd.read_excel(PLATE_LOG).fillna('')
    if 'id' not in df.columns:
        return False, "No id column found"
    mask = df['id'] == int(record_id)
    if df[mask].empty:
        return False, "Record not found"
    df.loc[mask, 'plate_number'] = new_plate_number.upper().strip()
    df.to_excel(PLATE_LOG, index=False)
    return True, f"Updated to {new_plate_number.upper().strip()}"