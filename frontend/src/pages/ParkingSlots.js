import React, { useState, useEffect } from 'react';
import SlotGrid from '../components/SlotGrid';

const API  = 'http://localhost:5000/api';
const FEED = '/api/stream/parking/feed'; // proxied through React dev server

export default function ParkingSlots({ streamStatus, setStreamStatus }) {
  const [videoPath, setVideoPath] = useState('');
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null);
  const [slots, setSlots]         = useState([]);
  const [summary, setSummary]     = useState({ total: 0, free: 0, occupied: 0 });
  const [feedKey, setFeedKey]     = useState(0);

  const parkingOn = streamStatus?.parking?.running;

  const showMsg = (text, type = 'info') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    if (!parkingOn) return;
    const iv = setInterval(() => {
      fetch(`${API}/slots`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setSlots(d.data || []);
            setSummary(d.summary || { total: 0, free: 0, occupied: 0 });
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(iv);
  }, [parkingOn]);

  const startStream = async () => {
    if (!videoPath.trim()) {
      showMsg('Please enter a video file path', 'error');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/stream/parking/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: videoPath.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setStreamStatus(s => ({ ...s, parking: { running: true, source: videoPath } }));
        setFeedKey(k => k + 1);
        showMsg('Parking video stream started — slot detection active', 'success');
      } else {
        showMsg(d.message, 'error');
      }
    } catch {
      showMsg('Cannot reach backend', 'error');
    }
    setLoading(false);
  };

  const stopStream = async () => {
    await fetch(`${API}/stream/parking/stop`, { method: 'POST' });
    setStreamStatus(s => ({ ...s, parking: { running: false } }));
    showMsg('Parking stream stopped', 'info');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Parking Slot Detection</div>
        <div className="page-subtitle">VIDEO FILE INPUT · REAL-TIME SLOT OCCUPANCY · RUNS INDEPENDENTLY</div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="grid-2 mb-4">
        <div className="card">
          <div className="card-title">Video File Source</div>
          <div className="form-group">
            <label className="form-label">Full path to parking lot video file</label>
            <input
              className="form-input"
              value={videoPath}
              onChange={e => setVideoPath(e.target.value)}
              placeholder="C:\videos\parking_lot.mp4"
              disabled={parkingOn}
            />
          </div>
          <div className="controls-row">
            <button className="btn btn-primary" onClick={startStream}
              disabled={loading || parkingOn}>
              {loading ? 'Starting...' : '▶ Start Video'}
            </button>
            <button className="btn btn-danger" onClick={stopStream}
              disabled={!parkingOn}>
              ■ Stop
            </button>
          </div>

          <div className="tip-box mt-4">
            <div className="tip-title">ℹ️ How it works</div>
            <ul className="tip-list">
              <li>Runs independently from webcam / plate detection</li>
              <li>Video file loops automatically for demo</li>
              <li>🟢 Green border = Free &nbsp; 🔴 Red border = Occupied</li>
              <li>Adjust slot coordinates in <code>slot_model.py</code> for your lot</li>
            </ul>
          </div>
        </div>

        <div>
          <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
            <div className="stat-card blue">
              <div className="stat-label">Total Slots</div>
              <div className="stat-value">{summary.total}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Free</div>
              <div className="stat-value">{summary.free}</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">Occupied</div>
              <div className="stat-value">{summary.occupied}</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-label">Utilisation</div>
              <div className="stat-value" style={{ fontSize: 30 }}>
                {summary.total > 0
                  ? `${Math.round((summary.occupied / summary.total) * 100)}%`
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <div className="card">
          <div className="card-title">
            Live Parking Feed
            {parkingOn && (
              <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>
                ● STREAMING
              </span>
            )}
          </div>
          {parkingOn ? (
            <div>
              <img
                key={feedKey}
                src={`${FEED}?t=${feedKey}`}
                className="video-feed"
                alt="parking feed"
                onError={() => setTimeout(() => setFeedKey(k => k + 1), 2000)}
                style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', minHeight: 240, background: '#000' }}
              />
              <div style={{
                marginTop: 10, padding: '8px 12px',
                background: 'rgba(255,215,64,0.05)',
                border: '1px solid rgba(255,215,64,0.15)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--text-muted)'
              }}>
                If feed appears black: open <span style={{ color: 'var(--yellow)' }}>http://localhost:5000/api/stream/parking/feed</span> directly
              </div>
            </div>
          ) : (
            <div className="video-placeholder">
              <span style={{ fontSize: 40 }}>🅿</span>
              <span>Parking slot feed offline</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Enter video path and click Start</span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Slot Map (Live)</div>
          {slots.length > 0
            ? <SlotGrid slots={slots} />
            : <div className="text-mono text-sm text-muted" style={{ padding: '20px 0' }}>
                Slot data will appear once video stream is running.
              </div>
          }
        </div>
      </div>

      {parkingOn && summary.total > 0 && (
        <div className="card">
          <div className="card-title">Capacity Bar</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{
                height: 22, background: 'var(--bg-base)',
                border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(summary.occupied / summary.total) * 100}%`,
                  height: '100%',
                  background: summary.occupied / summary.total > 0.8
                    ? 'var(--red)' : 'linear-gradient(90deg, var(--green), var(--accent))',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 24,
              fontWeight: 900, color: 'var(--accent)', minWidth: 55
            }}>
              {Math.round((summary.occupied / summary.total) * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}