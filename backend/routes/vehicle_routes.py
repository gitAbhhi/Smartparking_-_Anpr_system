from flask import Blueprint, jsonify, request
from models.vehicle_model import (
    get_all_vehicles, add_vehicle_entry,
    update_vehicle_exit, get_active_vehicles
)

vehicle_bp = Blueprint('vehicle', __name__)


@vehicle_bp.route('/vehicles', methods=['GET'])
def get_vehicles():
    vehicles = get_all_vehicles()
    return jsonify({"success": True, "data": vehicles, "count": len(vehicles)})


@vehicle_bp.route('/vehicles/active', methods=['GET'])
def get_active():
    vehicles = get_active_vehicles()
    return jsonify({"success": True, "data": vehicles, "count": len(vehicles)})


@vehicle_bp.route('/entry', methods=['POST'])
def vehicle_entry():
    data = request.get_json()
    vehicle_number = data.get('vehicle_number', '').strip().upper()
    if not vehicle_number:
        return jsonify({"success": False, "message": "Vehicle number required"}), 400
    success, message = add_vehicle_entry(vehicle_number)
    return jsonify({"success": success, "message": message}), (200 if success else 400)


@vehicle_bp.route('/exit', methods=['POST'])
def vehicle_exit():
    data = request.get_json()
    vehicle_number = data.get('vehicle_number', '').strip().upper()
    if not vehicle_number:
        return jsonify({"success": False, "message": "Vehicle number required"}), 400
    success, message = update_vehicle_exit(vehicle_number)
    return jsonify({"success": success, "message": message}), (200 if success else 400)
