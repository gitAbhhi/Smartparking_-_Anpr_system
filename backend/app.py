from flask import Flask
from flask_cors import CORS
from routes.vehicle_routes import vehicle_bp
from routes.slot_routes import slot_bp
from routes.stream_routes import stream_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(vehicle_bp, url_prefix='/api')
app.register_blueprint(slot_bp,    url_prefix='/api')
app.register_blueprint(stream_bp,  url_prefix='/api')

if __name__ == '__main__':
    print("🚗 Smart Parking System Backend")
    print("📡 API:      http://localhost:5000")
    print("🎥 Plate feed:   /api/stream/plate/feed")
    print("🅿  Parking feed: /api/stream/parking/feed")
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
