import React, { useState } from 'react';
import Map from './components/Map';
import IoTSimulator from './components/IoTSimulator';
import './index.css';

function App() {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAnomalyDetected = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="App">
            <header style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#282c34', color: 'white' }}>
                <h1>RADS Anomaly Dashboard</h1>
            </header>

            <div style={{ padding: '0 20px' }}>
                <IoTSimulator onAnomalyDetected={handleAnomalyDetected} />
            </div>

            <Map refreshKey={refreshKey} />
        </div>
    );
}

export default App;
