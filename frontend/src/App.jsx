import React, { useState } from 'react';
import Map from './components/Map';
import IoTSimulator from './components/IoTSimulator';
import './index.css';

function App() {
    const [refreshKey, setRefreshKey] = useState(0);

    // Phase 2.5: Shared State for Real Road Routing & Moving Vehicle
    const [startPoint, setStartPoint] = useState(null);
    const [endPoint, setEndPoint] = useState(null);
    const [route, setRoute] = useState([]); // GeoJSON LineString coordinates from OSRM
    const [vehiclePosition, setVehiclePosition] = useState(null); // Current [lat, lng] of the vehicle

    // Phase 3.0: Dual-Mode Tracking State
    const [trackingMode, setTrackingMode] = useState('AUTO'); // 'AUTO' or 'REALTIME'

    const handleAnomalyDetected = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="App">
            <header style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#282c34', color: 'white' }}>
                <h1>RADS Anomaly Dashboard</h1>
            </header>

            <div style={{ padding: '0 20px' }}>
                <IoTSimulator
                    onAnomalyDetected={handleAnomalyDetected}
                    startPoint={startPoint}
                    endPoint={endPoint}
                    route={route}
                    vehiclePosition={vehiclePosition}
                    setVehiclePosition={setVehiclePosition}
                    trackingMode={trackingMode}
                    setTrackingMode={setTrackingMode}
                />
            </div>

            <Map
                refreshKey={refreshKey}
                startPoint={startPoint}
                setStartPoint={setStartPoint}
                endPoint={endPoint}
                setEndPoint={setEndPoint}
                route={route}
                setRoute={setRoute}
                vehiclePosition={vehiclePosition}
                setVehiclePosition={setVehiclePosition}
                trackingMode={trackingMode}
            />
        </div>
    );
}

export default App;
