import React, { useState, useEffect } from 'react';
import SlotGrid from '../components/SlotGrid';
import VehicleTable from '../components/VehicleTable';

const API = 'http://localhost:5000/api';

export default function Dashboard({ streamStatus }) {
  const [slots, setSlots]         = useState([]);
  const [summary, setSummary]     = useState({ total: 0, free: 0, occupied: 0 });
  const [vehicles, setVehicles]   = useState([]);
  const [plateLog, setPlateLog]   = useState([]);
  const [lastPlate, setLastPlate] = useState(null);

  useEffect(() => {
    const fetch_all = () => {
      fetch(`${API}/slots`).then(r => r.json()).then(d => {
        if (d.success) { setSlots(d.data || []); setSummary(d.summary || {}); }
      }).catch(() => {});

      fetch(`${API}/vehicles`).then(r => r.json()).then(d => {
        if (d.success) setVehicles(d.data || []);
      }).catch(() => {});

      fetch(`${API}/plates/log`).then(r => r.json()).then(d => {
        if (d.success) setPlateLog(d.data?.slice(0, 5) || []);
      }).catch(() => {});

      fetch(`${API}/detect/plate`).then(r => r.json()).then(d => {
        if (d.success && d.status === 'detected') setLastPlate(d.plate);
      }).catch(() => {});
    };

    fetch_all();
    const iv = setInterval(fetch_all, 3000);
    return () => clearInterval(iv);
  }, []);

  const plateOn   = streamStatus?.plate?.running;
  const parkingOn = streamStatus?.parking?.running;
  const activeCount = vehicles.filter(v => v.status === 'inside').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">SYSTEM OVERVIEW · AUTO-REFRESH 3s</div>
      </div>

      {/* Stream Status Banner */}
      <div className="stream-status-bar mb-4">
        <div className={`stream-card ${plateOn ? 'active' : 'inactive'}`}>
          <div className="stream-icon">🔍</div>
          <div>
            <div className="stream-name">Plate Detection</div>
            <div className="stream-state">{plateOn ? '● WEBCAM LIVE' : '○ OFFLINE'}</div>
          </div>
          {lastPlate && plateOn && (
            <div className="stream-plate">{lastPlate}</div>
          )}
        </div>
        <div className={`stream-card ${parkingOn ? 'active' : 'inactive'}`}>
          <div className="stream-icon">🅿</div>
          <div>
            <div className="stream-name">Slot Detection</div>
            <div className="stream-state">{parkingOn ? '● VIDEO LIVE' : '○ OFFLINE'}</div>
          </div>
          {parkingOn && (
            <div className="stream-plate" style={{ color: 'var(--green)' }}>
              {summary.free} FREE
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid mb-4">
        <div className="stat-card blue">
          <div className="stat-label">Total Slots</div>
          <div className="stat-value">{summary.total}</div>
          <div className="stat-sub">parking spaces</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Free Slots</div>
          <div className="stat-value">{summary.free}</div>
          <div className="stat-sub">available</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Occupied</div>
          <div className="stat-value">{summary.occupied}</div>
          <div className="stat-sub">taken</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Active Vehicles</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-sub">currently inside</div>
        </div>
      </div>

      <div className="grid-2 mb-4">
        {/* Slot Map */}
        <div className="card">
          <div className="card-title">Slot Map</div>
          {slots.length > 0
            ? <SlotGrid slots={slots} />
            : <div className="text-mono text-sm text-muted">
                Start parking video stream to see live slot map
              </div>
          }
        </div>

        {/* Recent plate detections */}
        <div className="card">
          <div className="card-title">Recent Plate Detections</div>
          {plateLog.length === 0
            ? <div className="text-mono text-sm text-muted">
                No plates detected yet — start webcam stream
              </div>
            : <table className="data-table">
                <thead>
                  <tr><th>Plate</th><th>Detected At</th></tr>
                </thead>
                <tbody>
                  {plateLog.map((p, i) => (
                    <tr key={i}>
                      <td style={{
                        fontFamily: 'var(--font-display)', fontSize: 18,
                        fontWeight: 900, letterSpacing: 3, color: 'var(--yellow)',
                      }}>{p.plate_number}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.detected_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>

      {/* Recent vehicle logs */}
      <div className="card">
        <div className="flex-between mb-4">
          <div className="card-title" style={{ marginBottom: 0 }}>Recent Vehicle Logs</div>
          <span className="text-mono text-sm text-muted">{vehicles.length} total records</span>
        </div>
        <VehicleTable vehicles={vehicles} limit={6} />
      </div>
    </div>
  );
}
