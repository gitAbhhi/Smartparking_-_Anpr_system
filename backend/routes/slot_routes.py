from flask import Blueprint, jsonify, request
from models.slot_model import load_slots, save_slots, get_slots_status
from utils.stream_manager import parking_stream
from utils.parking_detection import analyze_slots

slot_bp = Blueprint('slot', __name__)
_last_slot_status = []


@slot_bp.route('/slots', methods=['GET'])
def get_slots():
    global _last_slot_status
    frame = parking_stream.get_frame()
    if frame is not None:
        _, slots_data, _ = analyze_slots(frame)
        _last_slot_status = slots_data
    elif not _last_slot_status:
        _last_slot_status = get_slots_status([])

    total    = len(_last_slot_status)
    occupied = sum(1 for s in _last_slot_status if s.get('occupied'))
    return jsonify({
        "success": True,
        "data": _last_slot_status,
        "summary": {"total": total, "free": total - occupied, "occupied": occupied}
    })


@slot_bp.route('/slots/config', methods=['GET'])
def get_config():
    return jsonify({"success": True, "data": load_slots()})


@slot_bp.route('/slots/config', methods=['POST'])
def update_config():
    slots = (request.get_json() or {}).get('slots', [])
    if not slots:
        return jsonify({"success": False, "message": "No slots provided"}), 400
    save_slots(slots)
    return jsonify({"success": True, "message": f"{len(slots)} slots saved"})
