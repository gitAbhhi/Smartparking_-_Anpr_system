import React from 'react';

export default function VehicleTable({ vehicles, limit }) {
  const data = limit ? vehicles.slice(0, limit) : vehicles;
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 20 }}>No vehicle records found.</div>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th><th>Vehicle Number</th><th>Entry Time</th>
            <th>Exit Time</th><th>Duration</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
              <td style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, letterSpacing: 2, color: 'var(--yellow)' }}>
                {v.vehicle_number}
              </td>
              <td>{v.entry_time || '—'}</td>
              <td>{v.exit_time || '—'}</td>
              <td>{v.duration || '—'}</td>
              <td>
                <span className={`badge ${v.status}`}>
                  {v.status === 'inside' ? '◉ Inside' : '✓ Exited'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
