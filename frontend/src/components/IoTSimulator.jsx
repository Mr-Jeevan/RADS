import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const IoTSimulator = ({ onAnomalyDetected }) => {
    const [isDriving, setIsDriving] = useState(false);
    const [zValue, setZValue] = useState(1.0);
    const [statusMsg, setStatusMsg] = useState('Idle');
    const intervalRef = useRef(null);

    // Constants
    const BASELINE_Z = 1.0;
    const THRESHOLD = 0.45;
    const UPPER_LIMIT = BASELINE_Z + THRESHOLD; // 1.45g
    const LOWER_LIMIT = BASELINE_Z - THRESHOLD; // 0.55g

    // Trichy Bounding Box
    const MIN_LAT = 10.78;
    const MAX_LAT = 10.82;
    const MIN_LNG = 78.68;
    const MAX_LNG = 78.72;

    const generateRandomCoordinate = () => {
        const lat = Math.random() * (MAX_LAT - MIN_LAT) + MIN_LAT;
        const lng = Math.random() * (MAX_LNG - MIN_LNG) + MIN_LNG;
        return [lng, lat]; // GeoJSON format [longitude, latitude]
    };

    const reportAnomaly = async (type, zVal) => {
        setStatusMsg(`Detected ${type} at ${zVal.toFixed(2)}g! Sending to backend...`);
        try {
            const [lng, lat] = generateRandomCoordinate();
            // Calculate a simple severity based on the variance from the 1.0g baseline
            const severity = parseFloat((Math.abs(BASELINE_Z - zVal) * 2).toFixed(2));

            const payload = {
                type,
                severity,
                location: {
                    type: 'Point',
                    coordinates: [lng, lat]
                }
            };

            await axios.post('http://localhost:5000/api/anomalies', payload);
            setStatusMsg(`✅ Successfully reported ${type} at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

            // Notify parent (App.jsx) to refresh the Map
            if (onAnomalyDetected) {
                onAnomalyDetected();
            }
        } catch (error) {
            console.error("Error posting anomaly:", error);
            setStatusMsg(`❌ Failed to report ${type}: ${error.message}`);
        }
    };

    const processZValue = (val) => {
        setZValue(val);

        // Detection Algorithm Logic
        if (val < LOWER_LIMIT) {
            reportAnomaly('POTHOLE', val);
        } else if (val > UPPER_LIMIT) {
            reportAnomaly('SPEED_BREAKER', val);
        } else {
            setStatusMsg('Monitoring normal driving vibration...');
        }
    };

    // The Data Stream Generator
    useEffect(() => {
        if (isDriving) {
            setStatusMsg('Monitoring normal driving vibration...');
            intervalRef.current = setInterval(() => {
                // Generate normal vibration: 0.9g to 1.1g
                const minNormal = 0.9;
                const maxNormal = 1.1;
                const normalVal = Math.random() * (maxNormal - minNormal) + minNormal;

                // We only want to set the UI Z-value here for the normal stream.
                // We don't call processZValue because we know it's normal and don't want to constantly reset statusMsg.
                setZValue(normalVal);
            }, 100); // 100ms per requirements
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setZValue(BASELINE_Z);
            setStatusMsg('Idle');
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isDriving]);

    // Manual Triggers - These bypass the normal interval
    const triggerPothole = () => {
        if (!isDriving) return;
        const potholeVal = Math.random() * 0.5; // less than 0.5g
        processZValue(potholeVal);
    };

    const triggerSpeedBreaker = () => {
        if (!isDriving) return;
        const speedBreakerVal = Math.random() * 0.5 + 1.5; // greater than 1.5g
        processZValue(speedBreakerVal);
    };

    return (
        <div style={{ padding: '15px', margin: '10px 0', border: '2px solid #333', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '20px' }}>
            <h3>IoT Hardware Simulator (Z-Axis Vibration)</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                <button
                    onClick={() => setIsDriving(!isDriving)}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: isDriving ? '#dc3545' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isDriving ? 'Stop Driving' : 'Start Driving'}
                </button>

                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    Live Z-Axis: <span style={{ color: zValue < LOWER_LIMIT || zValue > UPPER_LIMIT ? 'red' : 'green' }}>{zValue.toFixed(2)}g</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button onClick={triggerPothole} disabled={!isDriving} style={{ padding: '8px 15px', cursor: isDriving ? 'pointer' : 'not-allowed', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                    Trigger Pothole (&lt;0.5g)
                </button>
                <button onClick={triggerSpeedBreaker} disabled={!isDriving} style={{ padding: '8px 15px', cursor: isDriving ? 'pointer' : 'not-allowed', backgroundColor: '#fd7e14', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold' }}>
                    Trigger Speed Breaker (&gt;1.5g)
                </button>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px', fontStyle: 'italic', fontWeight: '500' }}>
                Status: {statusMsg}
            </div>
        </div>
    );
};

export default IoTSimulator;
