import React, { useState, useEffect } from 'react';
import VehicleTable from '../components/VehicleTable';

const API = 'http://localhost:5000/api';

export default function VehicleLogs() {
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  const fetchVehicles = () => {
    fetch(`${API}/vehicles`)
      .then(r => r.json())
      .then(d => { if (d.success) setVehicles(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
    const iv = setInterval(fetchVehicles, 5000);
    return () => clearInterval(iv);
  }, []);

  const filtered = vehicles.filter(v => {
    const matchFilter = filter === 'all' || v.status === filter;
    const matchSearch = !search || v.vehicle_number?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const insideCount = vehicles.filter(v => v.status === 'inside').length;
  const exitedCount = vehicles.filter(v => v.status === 'exited').length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Vehicle Logs</div>
        <div className="page-subtitle">COMPLETE ENTRY / EXIT HISTORY · EXCEL STORED</div>
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card blue">
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{vehicles.length}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Currently Inside</div>
          <div className="stat-value">{insideCount}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Exited</div>
          <div className="stat-value">{exitedCount}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'inside', 'exited'].map(f => (
              <button key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(f)}
                style={{ padding: '6px 14px', fontSize: 12 }}>
                {f === 'all' ? 'All' : f === 'inside' ? '◉ Inside' : '✓ Exited'}
              </button>
            ))}
          </div>
          <input className="form-input" style={{ width: 220 }}
            placeholder="Search plate number..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading
          ? <div className="text-mono text-sm text-muted">Loading records...</div>
          : <VehicleTable vehicles={filtered} />
        }
      </div>
    </div>
  );
}
