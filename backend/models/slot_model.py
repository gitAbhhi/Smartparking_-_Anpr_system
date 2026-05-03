import os
import json

SLOTS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'slots_config.json')

DEFAULT_SLOTS = [
    {"id": 1,  "x": 50,  "y": 50,  "w": 100, "h": 50},
    {"id": 2,  "x": 170, "y": 50,  "w": 100, "h": 50},
    {"id": 3,  "x": 290, "y": 50,  "w": 100, "h": 50},
    {"id": 4,  "x": 410, "y": 50,  "w": 100, "h": 50},
    {"id": 5,  "x": 530, "y": 50,  "w": 100, "h": 50},
    {"id": 6,  "x": 50,  "y": 150, "w": 100, "h": 50},
    {"id": 7,  "x": 170, "y": 150, "w": 100, "h": 50},
    {"id": 8,  "x": 290, "y": 150, "w": 100, "h": 50},
    {"id": 9,  "x": 410, "y": 150, "w": 100, "h": 50},
    {"id": 10, "x": 530, "y": 150, "w": 100, "h": 50},
    {"id": 11, "x": 50,  "y": 250, "w": 100, "h": 50},
    {"id": 12, "x": 170, "y": 250, "w": 100, "h": 50},
]


def load_slots():
    os.makedirs(os.path.dirname(SLOTS_FILE), exist_ok=True)
    if not os.path.exists(SLOTS_FILE):
        save_slots(DEFAULT_SLOTS)
    with open(SLOTS_FILE, 'r') as f:
        return json.load(f)


def save_slots(slots):
    os.makedirs(os.path.dirname(SLOTS_FILE), exist_ok=True)
    with open(SLOTS_FILE, 'w') as f:
        json.dump(slots, f, indent=2)


def get_slots_status(occupied_ids=[]):
    return [{**s, "occupied": s["id"] in occupied_ids} for s in load_slots()]
