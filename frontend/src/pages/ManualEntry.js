import React, { useState } from 'react';

const API = 'http://localhost:5000/api';

export default function ManualEntry() {
  const [entryPlate, setEntryPlate] = useState('');
  const [exitPlate, setExitPlate]   = useState('');
  const [msg, setMsg]               = useState(null);
  const [loading, setLoading]       = useState({ entry: false, exit: false, detect: false });

  const showMsg = (text, type = 'info') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleEntry = async () => {
    if (!entryPlate.trim()) return showMsg('Enter a vehicle number', 'error');
    setLoading(l => ({ ...l, entry: true }));
    try {
      const r = await fetch(`${API}/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_number: entryPlate.trim().toUpperCase() }),
      });
      const d = await r.json();
      showMsg(d.message, d.success ? 'success' : 'error');
      if (d.success) setEntryPlate('');
    } catch { showMsg('Backend connection failed', 'error'); }
    setLoading(l => ({ ...l, entry: false }));
  };

  const handleExit = async () => {
    if (!exitPlate.trim()) return showMsg('Enter a vehicle number', 'error');
    setLoading(l => ({ ...l, exit: true }));
    try {
      const r = await fetch(`${API}/exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_number: exitPlate.trim().toUpperCase() }),
      });
      const d = await r.json();
      showMsg(d.message, d.success ? 'success' : 'error');
      if (d.success) setExitPlate('');
    } catch { showMsg('Backend connection failed', 'error'); }
    setLoading(l => ({ ...l, exit: false }));
  };

  const autoFill = async (setter) => {
    setLoading(l => ({ ...l, detect: true }));
    try {
      const r = await fetch(`${API}/detect/plate/manual`, { method: 'POST' });
      const d = await r.json();
      if (d.status === 'detected' && d.plate) {
        setter(d.plate);
        showMsg(`Plate detected: ${d.plate}`, 'success');
      } else {
        showMsg('No plate detected — is the webcam stream running?', 'error');
      }
    } catch { showMsg('Could not reach backend', 'error'); }
    setLoading(l => ({ ...l, detect: false }));
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Manual Entry</div>
        <div className="page-subtitle">LOG VEHICLE ENTRY / EXIT MANUALLY OR VIA CAMERA AUTO-DETECT</div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Vehicle Entry</div>
          <div className="form-group">
            <label className="form-label">Vehicle Number</label>
            <input className="form-input" value={entryPlate}
              onChange={e => setEntryPlate(e.target.value.toUpperCase())}
              placeholder="e.g. DL01AB1234"
              onKeyDown={e => e.key === 'Enter' && handleEntry()} />
          </div>
          <div className="controls-row">
            <button className="btn btn-success" onClick={handleEntry} disabled={loading.entry}>
              {loading.entry ? '...' : '→ Log Entry'}
            </button>
            <button className="btn btn-outline" onClick={() => autoFill(setEntryPlate)} disabled={loading.detect}>
              {loading.detect ? '...' : '📷 Auto-Detect'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Vehicle Exit</div>
          <div className="form-group">
            <label className="form-label">Vehicle Number</label>
            <input className="form-input" value={exitPlate}
              onChange={e => setExitPlate(e.target.value.toUpperCase())}
              placeholder="e.g. DL01AB1234"
              onKeyDown={e => e.key === 'Enter' && handleExit()} />
          </div>
          <div className="controls-row">
            <button className="btn btn-danger" onClick={handleExit} disabled={loading.exit}>
              {loading.exit ? '...' : '← Log Exit'}
            </button>
            <button className="btn btn-outline" onClick={() => autoFill(setExitPlate)} disabled={loading.detect}>
              {loading.detect ? '...' : '📷 Auto-Detect'}
            </button>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-title">Indian Plate Format Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
          {[
            ['Delhi',     'DL01AB1234'], ['Mumbai',    'MH02CD5678'],
            ['Bangalore', 'KA03EF9012'], ['Chennai',   'TN04GH3456'],
            ['Jaipur',    'RJ14IJ7890'], ['Lucknow',   'UP32KL2345'],
          ].map(([city, plate]) => (
            <div key={city} style={{
              padding: '10px 14px', background: 'var(--bg-base)',
              border: '1px solid var(--border)', borderRadius: 6,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{city}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: 'var(--yellow)', letterSpacing: 2 }}>{plate}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
