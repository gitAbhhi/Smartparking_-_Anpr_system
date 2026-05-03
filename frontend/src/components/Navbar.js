import React from 'react';

const NAV = [
  { id: 'dashboard', label: '⬡ Dashboard' },
  { id: 'plate',     label: '🔍 Plate Detection' },
  { id: 'parking',   label: '🅿 Parking Slots' },
  { id: 'logs',      label: '▤ Vehicle Logs' },
  { id: 'entry',     label: '+ Manual Entry' },
];

export default function Navbar({ page, setPage, streamStatus }) {
  const plateOn   = streamStatus?.plate?.running;
  const parkingOn = streamStatus?.parking?.running;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">🅿</div>
        <div>
          <div className="navbar-title">SmartPark</div>
          <div className="navbar-subtitle">Vision System v2.0</div>
        </div>
      </div>

      {NAV.map(n => (
        <button
          key={n.id}
          className={`nav-btn ${page === n.id ? 'active' : ''}`}
          onClick={() => setPage(n.id)}
        >
          {n.label}
        </button>
      ))}

      <div style={{ display: 'flex', gap: 12, marginLeft: 8 }}>
        <div className="stream-badge">
          <div className={`stream-dot ${plateOn ? '' : 'off'}`} />
          <span>CAM {plateOn ? 'LIVE' : 'OFF'}</span>
        </div>
        <div className="stream-badge">
          <div className={`stream-dot ${parkingOn ? '' : 'off'}`}
               style={{ background: parkingOn ? 'var(--yellow)' : undefined }} />
          <span style={{ color: parkingOn ? 'var(--yellow)' : 'var(--text-dim)' }}>
            VIDEO {parkingOn ? 'LIVE' : 'OFF'}
          </span>
        </div>
      </div>
    </nav>
  );
}
