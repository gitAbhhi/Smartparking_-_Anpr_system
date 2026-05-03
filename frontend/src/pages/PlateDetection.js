// // import React, { useState, useEffect, useRef } from 'react';

// // const API = 'http://localhost:5000/api';

// // export default function PlateDetection({ streamStatus, setStreamStatus }) {
// //   const [camSource, setCamSource]     = useState('0');
// //   const [loading, setLoading]         = useState(false);
// //   const [msg, setMsg]                 = useState(null);
// //   const [detectionStatus, setDetStat] = useState('idle'); // idle | detected | no_plate | unreadable
// //   const [lastPlate, setLastPlate]     = useState(null);
// //   const [plateLog, setPlateLog]       = useState([]);
// //   const [detecting, setDetecting]     = useState(false);
// //   const pollRef = useRef(null);

// //   const plateOn = streamStatus?.plate?.running;

// //   const showMsg = (text, type = 'info') => {
// //     setMsg({ text, type });
// //     setTimeout(() => setMsg(null), 4000);
// //   };

// //   // Fetch plate detection log from Excel
// //   const fetchPlateLog = () => {
// //     fetch(`${API}/plates/log`)
// //       .then(r => r.json())
// //       .then(d => { if (d.success) setPlateLog(d.data); })
// //       .catch(() => {});
// //   };

// //   // Poll background detection status every 2.5s while stream is running
// //   useEffect(() => {
// //     fetchPlateLog();
// //     if (!plateOn) {
// //       clearInterval(pollRef.current);
// //       return;
// //     }
// //     pollRef.current = setInterval(() => {
// //       fetch(`${API}/detect/plate`)
// //         .then(r => r.json())
// //         .then(d => {
// //           if (d.success) {
// //             setDetStat(d.status);
// //             if (d.status === 'detected' && d.plate) {
// //               setLastPlate(d.plate);
// //               fetchPlateLog(); // refresh log when new plate found
// //             } else if (d.status === 'no_plate') {
// //               setLastPlate(null);
// //             }
// //           }
// //         })
// //         .catch(() => {});
// //     }, 2500);
// //     return () => clearInterval(pollRef.current);
// //   }, [plateOn]);

// //   const startStream = async () => {
// //     setLoading(true);
// //     try {
// //       const src = isNaN(camSource) ? camSource : parseInt(camSource);
// //       const r = await fetch(`${API}/stream/plate/start`, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify({ source: src }),
// //       });
// //       const d = await r.json();
// //       if (d.success) {
// //         setStreamStatus(s => ({ ...s, plate: { running: true, source: String(src) } }));
// //         showMsg('Webcam stream started — scanning for plates every 2s', 'success');
// //         setDetStat('idle');
// //       } else {
// //         showMsg(d.message, 'error');
// //       }
// //     } catch {
// //       showMsg('Cannot reach backend', 'error');
// //     }
// //     setLoading(false);
// //   };

// //   const stopStream = async () => {
// //     await fetch(`${API}/stream/plate/stop`, { method: 'POST' });
// //     setStreamStatus(s => ({ ...s, plate: { running: false } }));
// //     setLastPlate(null);
// //     setDetStat('idle');
// //     showMsg('Plate stream stopped', 'info');
// //   };

// //   const detectNow = async () => {
// //     setDetecting(true);
// //     try {
// //       const r = await fetch(`${API}/detect/plate/manual`, { method: 'POST' });
// //       const d = await r.json();
// //       setDetStat(d.status);
// //       if (d.status === 'detected' && d.plate) {
// //         setLastPlate(d.plate);
// //         fetchPlateLog();
// //         showMsg(`✅ Plate detected: ${d.plate} — saved to Excel`, 'success');
// //       } else if (d.status === 'unreadable') {
// //         setLastPlate(null);
// //         showMsg('⚠️ Plate region found but text could not be read clearly', 'error');
// //       } else {
// //         setLastPlate(null);
// //         showMsg('❌ No number plate detected in current frame', 'error');
// //       }
// //     } catch {
// //       showMsg('Detection failed — check backend', 'error');
// //     }
// //     setDetecting(false);
// //   };

// //   const statusBox = () => {
// //     if (detectionStatus === 'detected' && lastPlate) {
// //       return (
// //         <div className="plate-result detected">
// //           <div className="plate-label">✅ PLATE DETECTED</div>
// //           <div className="plate-number">{lastPlate}</div>
// //           <div className="plate-sub">Saved to Excel · plate_detections.xlsx</div>
// //         </div>
// //       );
// //     }
// //     if (detectionStatus === 'no_plate') {
// //       return (
// //         <div className="plate-result no-plate">
// //           <div className="plate-label">❌ NO PLATE DETECTED</div>
// //           <div className="plate-sub">No vehicle number plate found in frame</div>
// //         </div>
// //       );
// //     }
// //     if (detectionStatus === 'unreadable') {
// //       return (
// //         <div className="plate-result unreadable">
// //           <div className="plate-label">⚠️ PLATE UNREADABLE</div>
// //           <div className="plate-sub">Region found but OCR could not read text — adjust angle/lighting</div>
// //         </div>
// //       );
// //     }
// //     return (
// //       <div className="plate-result idle">
// //         <div className="plate-label">— WAITING —</div>
// //         <div className="plate-sub">Start webcam stream to begin scanning</div>
// //       </div>
// //     );
// //   };

// //   return (
// //     <div>
// //       <div className="page-header">
// //         <div className="page-title">Number Plate Detection</div>
// //         <div className="page-subtitle">WEBCAM ONLY · EASYOCR · AUTO-SAVES TO EXCEL</div>
// //       </div>

// //       {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

// //       <div className="grid-2 mb-4">
// //         {/* Controls */}
// //         <div className="card">
// //           <div className="card-title">Webcam Source</div>
// //           <div className="form-group">
// //             <label className="form-label">Camera Index (0 = default webcam, 1 = second cam)</label>
// //             <input
// //               className="form-input"
// //               value={camSource}
// //               onChange={e => setCamSource(e.target.value)}
// //               placeholder="0"
// //               disabled={plateOn}
// //             />
// //           </div>
// //           <div className="controls-row">
// //             <button className="btn btn-primary" onClick={startStream}
// //               disabled={loading || plateOn}>
// //               {loading ? 'Starting...' : '▶ Start Webcam'}
// //             </button>
// //             <button className="btn btn-danger" onClick={stopStream}
// //               disabled={!plateOn}>
// //               ■ Stop
// //             </button>
// //             <button className="btn btn-outline" onClick={detectNow}
// //               disabled={!plateOn || detecting}>
// //               {detecting ? 'Scanning...' : '🔍 Detect Now'}
// //             </button>
// //           </div>

// //           <div style={{ marginTop: 20 }}>
// //             <div className="card-title">Detection Status</div>
// //             {statusBox()}
// //           </div>

// //           <div className="tip-box mt-4">
// //             <div className="tip-title">💡 Tips for better detection</div>
// //             <ul className="tip-list">
// //               <li>Ensure plate is well-lit and not glared</li>
// //               <li>Camera angle should be within 30° of plate</li>
// //               <li>Plate should fill at least 1/4 of frame width</li>
// //               <li>Auto-scan runs every 2s in background</li>
// //               <li>Use "Detect Now" for immediate single scan</li>
// //               <li>Only valid Indian plate formats are saved</li>
// //             </ul>
// //           </div>
// //         </div>

// //         {/* Live feed */}
// //         <div className="card">
// //           <div className="card-title">Live Webcam Feed</div>
// //           {plateOn
// //             ? <img src={`${API}/stream/plate/feed`} className="video-feed" alt="plate feed" />
// //             : <div className="video-placeholder">
// //                 <span style={{ fontSize: 40 }}>🔍</span>
// //                 <span>Plate detection feed offline</span>
// //                 <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Start webcam to begin</span>
// //               </div>
// //           }
// //         </div>
// //       </div>

// //       {/* Plate Detection Log */}
// //       <div className="card">
// //         <div className="flex-between mb-4">
// //           <div className="card-title" style={{ marginBottom: 0 }}>Detection Log</div>
// //           <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
// //             <span className="text-mono text-sm text-muted">{plateLog.length} records · plate_detections.xlsx</span>
// //             <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 11 }}
// //               onClick={fetchPlateLog}>↺ Refresh</button>
// //           </div>
// //         </div>

// //         {plateLog.length === 0
// //           ? <div className="text-mono text-sm text-muted" style={{ padding: '20px 0' }}>
// //               No plates detected yet. Start the webcam and point it at a number plate.
// //             </div>
// //           : <div className="table-wrap">
// //               <table className="data-table">
// //                 <thead>
// //                   <tr>
// //                     <th>#</th>
// //                     <th>Plate Number</th>
// //                     <th>Detected At</th>
// //                   </tr>
// //                 </thead>
// //                 <tbody>
// //                   {plateLog.map((p, i) => (
// //                     <tr key={i}>
// //                       <td style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
// //                       <td>
// //                         <span style={{
// //                           fontFamily: 'var(--font-display)',
// //                           fontSize: 18,
// //                           fontWeight: 900,
// //                           letterSpacing: 3,
// //                           color: 'var(--yellow)',
// //                         }}>{p.plate_number}</span>
// //                       </td>
// //                       <td style={{ color: 'var(--text-muted)' }}>{p.detected_at}</td>
// //                     </tr>
// //                   ))}
// //                 </tbody>
// //               </table>
// //             </div>
// //         }
// //       </div>
// //     </div>
// //   );
// // }
// import React, { useState, useEffect, useRef } from 'react';

// const API = 'http://localhost:5000/api';
// // Use relative URL for MJPEG feeds so React proxy handles it
// const FEED = '/api/stream/plate/feed';

// export default function PlateDetection({ streamStatus, setStreamStatus }) {
//   const [camSource, setCamSource]     = useState('0');
//   const [loading, setLoading]         = useState(false);
//   const [msg, setMsg]                 = useState(null);
//   const [detectionStatus, setDetStat] = useState('idle');
//   const [lastPlate, setLastPlate]     = useState(null);
//   const [plateLog, setPlateLog]       = useState([]);
//   const [detecting, setDetecting]     = useState(false);
//   const [feedKey, setFeedKey]         = useState(0); // force img reload
//   const pollRef = useRef(null);

//   const plateOn = streamStatus?.plate?.running;

//   const showMsg = (text, type = 'info') => {
//     setMsg({ text, type });
//     setTimeout(() => setMsg(null), 4000);
//   };

//   const fetchPlateLog = () => {
//     fetch(`${API}/plates/log`)
//       .then(r => r.json())
//       .then(d => { if (d.success) setPlateLog(d.data); })
//       .catch(() => {});
//   };

//   useEffect(() => {
//     fetchPlateLog();
//     if (!plateOn) {
//       clearInterval(pollRef.current);
//       return;
//     }
//     pollRef.current = setInterval(() => {
//       fetch(`${API}/detect/plate`)
//         .then(r => r.json())
//         .then(d => {
//           if (d.success) {
//             setDetStat(d.status);
//             if (d.status === 'detected' && d.plate) {
//               setLastPlate(d.plate);
//               fetchPlateLog();
//             } else if (d.status === 'no_plate') {
//               setLastPlate(null);
//             }
//           }
//         })
//         .catch(() => {});
//     }, 2500);
//     return () => clearInterval(pollRef.current);
//   }, [plateOn]);

//   const startStream = async () => {
//     setLoading(true);
//     try {
//       const src = isNaN(camSource) ? camSource : parseInt(camSource);
//       const r = await fetch(`${API}/stream/plate/start`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ source: src }),
//       });
//       const d = await r.json();
//       if (d.success) {
//         setStreamStatus(s => ({ ...s, plate: { running: true, source: String(src) } }));
//         setDetStat('idle');
//         setFeedKey(k => k + 1); // reload the img tag
//         showMsg('Webcam stream started — scanning for plates every 2s', 'success');
//       } else {
//         showMsg(d.message, 'error');
//       }
//     } catch {
//       showMsg('Cannot reach backend — is Flask running on port 5000?', 'error');
//     }
//     setLoading(false);
//   };

//   const stopStream = async () => {
//     await fetch(`${API}/stream/plate/stop`, { method: 'POST' });
//     setStreamStatus(s => ({ ...s, plate: { running: false } }));
//     setLastPlate(null);
//     setDetStat('idle');
//     showMsg('Plate stream stopped', 'info');
//   };

//   const detectNow = async () => {
//     setDetecting(true);
//     try {
//       const r = await fetch(`${API}/detect/plate/manual`, { method: 'POST' });
//       const d = await r.json();
//       setDetStat(d.status);
//       if (d.status === 'detected' && d.plate) {
//         setLastPlate(d.plate);
//         fetchPlateLog();
//         showMsg(`✅ Plate detected: ${d.plate} — saved to Excel`, 'success');
//       } else if (d.status === 'unreadable') {
//         setLastPlate(null);
//         showMsg('⚠️ Plate region found but text could not be read clearly', 'error');
//       } else {
//         setLastPlate(null);
//         showMsg('❌ No number plate detected in current frame', 'error');
//       }
//     } catch {
//       showMsg('Detection failed — check backend', 'error');
//     }
//     setDetecting(false);
//   };

//   const statusBox = () => {
//     if (detectionStatus === 'detected' && lastPlate) {
//       return (
//         <div className="plate-result detected">
//           <div className="plate-label">✅ PLATE DETECTED</div>
//           <div className="plate-number">{lastPlate}</div>
//           <div className="plate-sub">Saved to Excel · plate_detections.xlsx</div>
//         </div>
//       );
//     }
//     if (detectionStatus === 'no_plate') {
//       return (
//         <div className="plate-result no-plate">
//           <div className="plate-label">❌ NO PLATE DETECTED</div>
//           <div className="plate-sub">No vehicle number plate found in frame</div>
//         </div>
//       );
//     }
//     if (detectionStatus === 'unreadable') {
//       return (
//         <div className="plate-result unreadable">
//           <div className="plate-label">⚠️ PLATE UNREADABLE</div>
//           <div className="plate-sub">Region found but OCR could not read — adjust angle/lighting</div>
//         </div>
//       );
//     }
//     return (
//       <div className="plate-result idle">
//         <div className="plate-label">— WAITING —</div>
//         <div className="plate-sub">Start webcam stream to begin scanning</div>
//       </div>
//     );
//   };

//   return (
//     <div>
//       <div className="page-header">
//         <div className="page-title">Number Plate Detection</div>
//         <div className="page-subtitle">WEBCAM ONLY · EASYOCR · AUTO-SAVES TO EXCEL</div>
//       </div>

//       {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

//       <div className="grid-2 mb-4">
//         {/* Controls */}
//         <div className="card">
//           <div className="card-title">Webcam Source</div>
//           <div className="form-group">
//             <label className="form-label">Camera Index (0 = default webcam, 1 = second cam)</label>
//             <input
//               className="form-input"
//               value={camSource}
//               onChange={e => setCamSource(e.target.value)}
//               placeholder="0"
//               disabled={plateOn}
//             />
//           </div>
//           <div className="controls-row">
//             <button className="btn btn-primary" onClick={startStream}
//               disabled={loading || plateOn}>
//               {loading ? 'Starting...' : '▶ Start Webcam'}
//             </button>
//             <button className="btn btn-danger" onClick={stopStream}
//               disabled={!plateOn}>
//               ■ Stop
//             </button>
//             <button className="btn btn-outline" onClick={detectNow}
//               disabled={!plateOn || detecting}>
//               {detecting ? 'Scanning...' : '🔍 Detect Now'}
//             </button>
//           </div>

//           <div style={{ marginTop: 20 }}>
//             <div className="card-title">Detection Status</div>
//             {statusBox()}
//           </div>

//           <div className="tip-box mt-4">
//             <div className="tip-title">💡 Tips for better detection</div>
//             <ul className="tip-list">
//               <li>Ensure plate is well-lit and not glared</li>
//               <li>Camera angle should be within 30° of plate</li>
//               <li>Plate should fill at least 1/4 of frame width</li>
//               <li>Auto-scan runs every 2s in background</li>
//               <li>Use "Detect Now" for immediate single scan</li>
//               <li>Only valid Indian plate formats are saved</li>
//             </ul>
//           </div>
//         </div>

//         {/* Live feed */}
//         <div className="card">
//           <div className="card-title">
//             Live Webcam Feed
//             {plateOn && (
//               <span style={{
//                 marginLeft: 'auto', fontSize: 10,
//                 fontFamily: 'var(--font-mono)',
//                 color: 'var(--green)'
//               }}>● STREAMING</span>
//             )}
//           </div>

//           {plateOn ? (
//             <div style={{ position: 'relative' }}>
//               <img
//                 key={feedKey}
//                 src={`${FEED}?t=${feedKey}`}
//                 className="video-feed"
//                 alt="plate feed"
//                 onError={() => {
//                   // Retry after 2 seconds if stream not ready yet
//                   setTimeout(() => setFeedKey(k => k + 1), 2000);
//                 }}
//                 style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)', minHeight: 240, background: '#000' }}
//               />
//             </div>
//           ) : (
//             <div className="video-placeholder">
//               <span style={{ fontSize: 40 }}>🔍</span>
//               <span>Plate detection feed offline</span>
//               <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Start webcam to begin</span>
//             </div>
//           )}

//           {/* Quick troubleshoot tip shown while streaming */}
//           {plateOn && (
//             <div style={{
//               marginTop: 10, padding: '8px 12px',
//               background: 'rgba(0,194,255,0.05)',
//               border: '1px solid rgba(0,194,255,0.15)',
//               borderRadius: 6,
//               fontFamily: 'var(--font-mono)', fontSize: 11,
//               color: 'var(--text-muted)'
//             }}>
//               If feed appears black: open <span style={{ color: 'var(--accent)' }}>http://localhost:5000/api/stream/plate/feed</span> directly in browser to test
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Plate Detection Log */}
//       <div className="card">
//         <div className="flex-between mb-4">
//           <div className="card-title" style={{ marginBottom: 0 }}>Detection Log</div>
//           <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
//             <span className="text-mono text-sm text-muted">
//               {plateLog.length} records · plate_detections.xlsx
//             </span>
//             <button className="btn btn-outline"
//               style={{ padding: '4px 12px', fontSize: 11 }}
//               onClick={fetchPlateLog}>↺ Refresh</button>
//           </div>
//         </div>

//         {plateLog.length === 0 ? (
//           <div className="text-mono text-sm text-muted" style={{ padding: '20px 0' }}>
//             No plates detected yet. Start the webcam and point it at a number plate.
//           </div>
//         ) : (
//           <div className="table-wrap">
//             <table className="data-table">
//               <thead>
//                 <tr><th>#</th><th>Plate Number</th><th>Detected At</th></tr>
//               </thead>
//               <tbody>
//                 {plateLog.map((p, i) => (
//                   <tr key={i}>
//                     <td style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
//                     <td>
//                       <span style={{
//                         fontFamily: 'var(--font-display)', fontSize: 18,
//                         fontWeight: 900, letterSpacing: 3, color: 'var(--yellow)',
//                       }}>{p.plate_number}</span>
//                     </td>
//                     <td style={{ color: 'var(--text-muted)' }}>{p.detected_at}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect, useRef } from 'react';

const API        = 'http://localhost:5000/api';
const PLATE_FEED = 'http://localhost:5000/api/stream/plate/feed';

export default function PlateDetection({ streamStatus, setStreamStatus }) {
  const [camSource, setCamSource]   = useState('0');
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);
  const [detStat, setDetStat]       = useState('idle');
  const [lastPlate, setLastPlate]   = useState(null);
  const [plateLog, setPlateLog]     = useState([]);
  const [detecting, setDetecting]   = useState(false);
  const [showFeed, setShowFeed]     = useState(false);

  // Edit state
  const [editingId, setEditingId]   = useState(null);
  const [editValue, setEditValue]   = useState('');

  // Delete confirm
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const pollRef = useRef(null);
  const plateOn = streamStatus?.plate?.running;

  const showMsg = (text, type = 'info') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchPlateLog = () => {
    fetch(`${API}/plates/log`)
      .then(r => r.json())
      .then(d => { if (d.success) setPlateLog(d.data); })
      .catch(() => {});
  };

  useEffect(() => { fetchPlateLog(); }, []);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!plateOn) return;
    pollRef.current = setInterval(() => {
      fetch(`${API}/detect/plate`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setDetStat(d.status);
            if (d.status === 'detected' && d.plate) {
              setLastPlate(d.plate);
              fetchPlateLog();
            } else if (d.status === 'no_plate') {
              setLastPlate(null);
            }
          }
        }).catch(() => {});
    }, 2500);
    return () => clearInterval(pollRef.current);
  }, [plateOn]);

  // ── Stream controls ──────────────────────────────────────────────────────
  const startStream = async () => {
    setLoading(true); setShowFeed(false);
    try {
      const src = isNaN(camSource) ? camSource : parseInt(camSource);
      const r = await fetch(`${API}/stream/plate/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: src }),
      });
      const d = await r.json();
      if (d.success) {
        setStreamStatus(s => ({ ...s, plate: { running: true, source: String(src) } }));
        setDetStat('idle');
        setTimeout(() => setShowFeed(true), 800);
        showMsg('Webcam started — scanning for plates', 'success');
      } else { showMsg(d.message, 'error'); }
    } catch { showMsg('Cannot reach backend', 'error'); }
    setLoading(false);
  };

  const stopStream = async () => {
    setShowFeed(false);
    await fetch(`${API}/stream/plate/stop`, { method: 'POST' });
    setStreamStatus(s => ({ ...s, plate: { running: false } }));
    setLastPlate(null); setDetStat('idle');
    showMsg('Stream stopped', 'info');
  };

  const detectNow = async () => {
    setDetecting(true);
    try {
      const r = await fetch(`${API}/detect/plate/manual`, { method: 'POST' });
      const d = await r.json();
      setDetStat(d.status);
      if (d.status === 'detected' && d.plate) {
        setLastPlate(d.plate); fetchPlateLog();
        showMsg(`✅ Detected: ${d.plate}`, 'success');
      } else if (d.status === 'unreadable') {
        showMsg('⚠️ Plate found but unreadable — try better lighting', 'error');
      } else {
        showMsg('❌ No plate detected in current frame', 'error');
      }
    } catch { showMsg('Detection failed', 'error'); }
    setDetecting(false);
  };

  // ── Delete single record ─────────────────────────────────────────────────
  const deleteRecord = async (id) => {
    try {
      const r = await fetch(`${API}/plates/delete/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        setPlateLog(prev => prev.filter(p => p.id !== id));
        showMsg('Record deleted', 'success');
      } else { showMsg(d.message, 'error'); }
    } catch { showMsg('Delete failed', 'error'); }
  };

  // ── Clear all records ────────────────────────────────────────────────────
  const clearAll = async () => {
    try {
      const r = await fetch(`${API}/plates/delete-all`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        setPlateLog([]);
        showMsg('All records cleared', 'success');
      } else { showMsg(d.message, 'error'); }
    } catch { showMsg('Clear failed', 'error'); }
    setConfirmClearAll(false);
  };

  // ── Edit record ──────────────────────────────────────────────────────────
  const startEdit = (record) => {
    setEditingId(record.id);
    setEditValue(record.plate_number);
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(''); };

  const saveEdit = async (id) => {
    if (!editValue.trim()) return showMsg('Plate number cannot be empty', 'error');
    try {
      const r = await fetch(`${API}/plates/edit/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate_number: editValue.trim().toUpperCase() }),
      });
      const d = await r.json();
      if (d.success) {
        setPlateLog(prev => prev.map(p =>
          p.id === id ? { ...p, plate_number: editValue.trim().toUpperCase() } : p
        ));
        showMsg('Record updated', 'success');
        cancelEdit();
      } else { showMsg(d.message, 'error'); }
    } catch { showMsg('Edit failed', 'error'); }
  };

  // ── Status box ───────────────────────────────────────────────────────────
  const statusBox = () => {
    if (detStat === 'detected' && lastPlate) return (
      <div className="plate-result detected">
        <div className="plate-label">✅ PLATE DETECTED</div>
        <div className="plate-number">{lastPlate}</div>
        <div className="plate-sub">Saved to Excel · plate_detections.xlsx</div>
      </div>
    );
    if (detStat === 'no_plate') return (
      <div className="plate-result no-plate">
        <div className="plate-label">❌ NO PLATE DETECTED</div>
        <div className="plate-sub">No number plate found in frame</div>
      </div>
    );
    if (detStat === 'unreadable') return (
      <div className="plate-result unreadable">
        <div className="plate-label">⚠️ PLATE UNREADABLE</div>
        <div className="plate-sub">Region found but OCR failed — adjust angle/lighting</div>
      </div>
    );
    return (
      <div className="plate-result idle">
        <div className="plate-label">— WAITING —</div>
        <div className="plate-sub">Start webcam to begin scanning</div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Number Plate Detection</div>
        <div className="page-subtitle">WEBCAM ONLY · TESSERACT OCR · AUTO-SAVES TO EXCEL</div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="grid-2 mb-4">
        {/* Controls */}
        <div className="card">
          <div className="card-title">Webcam Source</div>
          <div className="form-group">
            <label className="form-label">Camera Index (0 = default, 1 = second cam)</label>
            <input className="form-input" value={camSource}
              onChange={e => setCamSource(e.target.value)}
              placeholder="0" disabled={plateOn} />
          </div>
          <div className="controls-row">
            <button className="btn btn-primary" onClick={startStream}
              disabled={loading || plateOn}>
              {loading ? 'Starting...' : '▶ Start Webcam'}
            </button>
            <button className="btn btn-danger" onClick={stopStream} disabled={!plateOn}>
              ■ Stop
            </button>
            <button className="btn btn-outline" onClick={detectNow}
              disabled={!plateOn || detecting}>
              {detecting ? 'Scanning...' : '🔍 Detect Now'}
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="card-title">Detection Status</div>
            {statusBox()}
          </div>

          <div className="tip-box mt-4">
            <div className="tip-title">💡 Tips for better detection</div>
            <ul className="tip-list">
              <li>Good lighting — avoid glare on plate</li>
              <li>Hold plate within 30° of camera angle</li>
              <li>Plate should fill at least 1/4 of frame</li>
              <li>Auto-scan runs every ~0.8s in background</li>
              <li>Only valid Indian formats are saved</li>
            </ul>
          </div>
        </div>

        {/* Live feed */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              Live Webcam Feed
              {plateOn && showFeed && (
                <span style={{ marginLeft: 8, fontSize: 10,
                  fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                  ● LIVE
                </span>
              )}
            </div>
            {plateOn && (
              <button className="btn btn-outline"
                onClick={() => { setShowFeed(false); setTimeout(() => setShowFeed(true), 300); }}
                style={{ padding: '3px 10px', fontSize: 11 }}>↺ Reload</button>
            )}
          </div>

          {plateOn && showFeed ? (
            <img src={PLATE_FEED} alt="plate feed"
              style={{ width:'100%', borderRadius:6, border:'1px solid var(--border)',
                       minHeight:240, background:'#000', display:'block' }}
              onError={() => { setShowFeed(false); setTimeout(() => setShowFeed(true), 2000); }}
            />
          ) : plateOn && !showFeed ? (
            <div className="video-placeholder">
              <div style={{ width:36, height:36, border:'3px solid var(--accent)',
                borderTopColor:'transparent', borderRadius:'50%',
                animation:'spin 1s linear infinite' }} />
              <span>Loading feed...</span>
            </div>
          ) : (
            <div className="video-placeholder">
              <span style={{ fontSize:40 }}>🔍</span>
              <span>Plate detection feed offline</span>
              <span style={{ fontSize:11, color:'var(--text-dim)' }}>Start webcam to begin</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Detection Log with Edit/Delete ── */}
      <div className="card">
        <div className="flex-between mb-4">
          <div className="card-title" style={{ marginBottom: 0 }}>
            Detection Log
            <span style={{ marginLeft: 8, fontFamily:'var(--font-mono)',
              fontSize:11, color:'var(--text-dim)', fontWeight:400 }}>
              {plateLog.length} records · plate_detections.xlsx
            </span>
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn btn-outline"
              style={{ padding:'5px 12px', fontSize:11 }}
              onClick={fetchPlateLog}>↺ Refresh</button>

            {/* Clear All button with confirm */}
            {!confirmClearAll ? (
              <button className="btn btn-danger"
                style={{ padding:'5px 12px', fontSize:11 }}
                onClick={() => setConfirmClearAll(true)}
                disabled={plateLog.length === 0}>
                🗑 Clear All
              </button>
            ) : (
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11,
                  color:'var(--red)' }}>Confirm?</span>
                <button className="btn btn-danger"
                  style={{ padding:'5px 12px', fontSize:11 }}
                  onClick={clearAll}>Yes, Delete All</button>
                <button className="btn btn-outline"
                  style={{ padding:'5px 12px', fontSize:11 }}
                  onClick={() => setConfirmClearAll(false)}>Cancel</button>
              </div>
            )}
          </div>
        </div>

        {plateLog.length === 0 ? (
          <div className="text-mono text-sm text-muted" style={{ padding:'20px 0' }}>
            No plates detected yet. Start the webcam and point it at a number plate.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Plate Number</th>
                  <th>Detected At</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plateLog.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color:'var(--text-dim)' }}>{i + 1}</td>

                    {/* Plate cell — shows input when editing */}
                    <td>
                      {editingId === p.id ? (
                        <input
                          className="form-input"
                          style={{ padding:'4px 8px', fontSize:14,
                            fontFamily:'var(--font-display)',
                            letterSpacing:2, width:160 }}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value.toUpperCase())}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(p.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ fontFamily:'var(--font-display)',
                          fontSize:18, fontWeight:900,
                          letterSpacing:3, color:'var(--yellow)' }}>
                          {p.plate_number}
                        </span>
                      )}
                    </td>

                    <td style={{ color:'var(--text-muted)' }}>{p.detected_at}</td>

                    {/* Action buttons */}
                    <td>
                      {editingId === p.id ? (
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-success"
                            style={{ padding:'4px 10px', fontSize:11 }}
                            onClick={() => saveEdit(p.id)}>
                            ✓ Save
                          </button>
                          <button className="btn btn-outline"
                            style={{ padding:'4px 10px', fontSize:11 }}
                            onClick={cancelEdit}>
                            ✕ Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display:'flex', gap:6 }}>
                          <button
                            onClick={() => startEdit(p)}
                            title="Edit plate number"
                            style={{
                              padding:'4px 10px', fontSize:11,
                              background:'rgba(0,194,255,0.12)',
                              border:'1px solid var(--accent-dim)',
                              color:'var(--accent)', borderRadius:4,
                              cursor:'pointer', fontFamily:'var(--font-ui)',
                              fontWeight:600, transition:'all 0.2s'
                            }}>
                            ✏ Edit
                          </button>
                          <button
                            onClick={() => deleteRecord(p.id)}
                            title="Delete this record"
                            style={{
                              padding:'4px 10px', fontSize:11,
                              background:'rgba(255,61,87,0.1)',
                              border:'1px solid var(--red-dim)',
                              color:'var(--red)', borderRadius:4,
                              cursor:'pointer', fontFamily:'var(--font-ui)',
                              fontWeight:600, transition:'all 0.2s'
                            }}>
                            🗑 Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}