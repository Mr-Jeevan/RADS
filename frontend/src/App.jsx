import React from 'react';
import Map from './components/Map';
import './index.css';

function App() {
    return (
        <div className="App">
            <header style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#282c34', color: 'white' }}>
                <h1>RADS Anomaly Dashboard</h1>
            </header>
            <Map />
        </div>
    );
}

export default App;
