import React from 'react';

export default function SlotGrid({ slots }) {
  if (!slots || slots.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 20 }}>
        No slot data. Start the parking video stream.
      </div>
    );
  }
  return (
    <div className="slot-grid">
      {slots.map(slot => (
        <div key={slot.id} className={`slot-cell ${slot.occupied ? 'occupied' : 'free'}`}>
          <div className="slot-id">P{slot.id}</div>
          <div className="slot-status">{slot.occupied ? 'BUSY' : 'FREE'}</div>
        </div>
      ))}
    </div>
  );
}
