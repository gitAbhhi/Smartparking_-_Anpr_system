import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import PlateDetection from './pages/PlateDetection';
import ParkingSlots from './pages/ParkingSlots';
import VehicleLogs from './pages/VehicleLogs';
import ManualEntry from './pages/ManualEntry';
import './App.css';

const API = 'http://localhost:5000/api';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [streamStatus, setStreamStatus] = useState({
    plate:   { running: false },
    parking: { running: false },
  });

  const fetchStatus = () => {
    fetch(`${API}/stream/status`)
      .then(r => r.json())
      .then(d => { if (d.success) setStreamStatus(d); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, 4000);
    return () => clearInterval(iv);
  }, []);

  const pages = {
    dashboard: <Dashboard streamStatus={streamStatus} />,
    plate:     <PlateDetection streamStatus={streamStatus} setStreamStatus={setStreamStatus} />,
    parking:   <ParkingSlots streamStatus={streamStatus} setStreamStatus={setStreamStatus} />,
    logs:      <VehicleLogs />,
    entry:     <ManualEntry />,
  };

  return (
    <div className="app">
      <Navbar page={page} setPage={setPage} streamStatus={streamStatus} />
      <main className="main-content">{pages[page]}</main>
    </div>
  );
}
