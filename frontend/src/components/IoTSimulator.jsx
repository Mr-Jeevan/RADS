import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const IoTSimulator = ({ onAnomalyDetected, route, vehiclePosition, setVehiclePosition }) => {
    const [isDriving, setIsDriving] = useState(false);
    const [zValue, setZValue] = useState(1.0);
    const [statusMsg, setStatusMsg] = useState('Idle');

    const dataIntervalRef = useRef(null);
    const motionIntervalRef = useRef(null);
    // Track our progress along the route (0.0 to 1.0)
    const progressRef = useRef(0);

    // Constants
    const BASELINE_Z = 1.0;
    const THRESHOLD = 0.45;
    const UPPER_LIMIT = BASELINE_Z + THRESHOLD; // 1.45g
    const LOWER_LIMIT = BASELINE_Z - THRESHOLD; // 0.55g

    // --- Dynamic Routing Logic ---
    const startDriving = () => {
        if (!route || route.length < 2) {
            setStatusMsg('Please click on the map to set Start and Destination points first.');
            setIsDriving(false);
            return;
        }
        setIsDriving(true);
        setStatusMsg('Driving along route...');
        progressRef.current = 0;
        setVehiclePosition(route[0]);
    };

    const stopDriving = () => {
        setIsDriving(false);
        setStatusMsg('Drive stopped.');
    };

    // Calculate Interpolation
    useEffect(() => {
        if (isDriving && route.length === 2) {
            const [startLat, startLng] = route[0];
            const [endLat, endLng] = route[1];

            // Update position every 100ms
            motionIntervalRef.current = setInterval(() => {
                progressRef.current += 0.005; // Adjust speed here (0.005 = 200 steps)

                if (progressRef.current >= 1) {
                    clearInterval(motionIntervalRef.current);
                    setVehiclePosition([endLat, endLng]); // Ensure it lands exactly on destination
                    stopDriving();
                    setStatusMsg('Destination reached!');
                } else {
                    const currentLat = startLat + (endLat - startLat) * progressRef.current;
                    const currentLng = startLng + (endLng - startLng) * progressRef.current;
                    setVehiclePosition([currentLat, currentLng]);
                }
            }, 100);
        } else {
            if (motionIntervalRef.current) clearInterval(motionIntervalRef.current);
        }

        return () => {
            if (motionIntervalRef.current) clearInterval(motionIntervalRef.current);
        };
    }, [isDriving, route]);


    // --- Anomaly Logic ---
    const reportAnomaly = async (type, zVal) => {
        setStatusMsg(`Detected ${type} at ${zVal.toFixed(2)}g! Sending to backend...`);
        try {
            // CRITICAL FIX: Use actual vehicle position instead of random
            const currentPos = vehiclePosition || route[0];
            if (!currentPos) {
                setStatusMsg(`❌ Cannot report: Vehicle position unknown.`);
                return;
            }
            const [lat, lng] = currentPos;

            const dbType = type === 'POTHOLE' ? 'pothole' : 'speedbreaker';

            const variance = Math.abs(BASELINE_Z - zVal);
            let dbSeverity = 'medium';
            if (variance > 0.6) dbSeverity = 'critical';
            else if (variance > 0.5) dbSeverity = 'high';
            else if (variance <= 0.45) dbSeverity = 'low';

            const payload = {
                type: dbType,
                severity: dbSeverity,
                gForce: parseFloat(zVal.toFixed(2)),
                location: {
                    type: 'Point',
                    coordinates: [lng, lat] // Backend expects [longitude, latitude]
                }
            };

            await axios.post('http://localhost:5000/api/anomalies', payload);
            setStatusMsg(`✅ Successfully reported ${dbType.toUpperCase()} at vehicle location.`);

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

        if (val < LOWER_LIMIT) reportAnomaly('POTHOLE', val);
        else if (val > UPPER_LIMIT) reportAnomaly('SPEED_BREAKER', val);
    };

    useEffect(() => {
        if (isDriving) {
            dataIntervalRef.current = setInterval(() => {
                const minNormal = 0.9;
                const maxNormal = 1.1;
                const normalVal = Math.random() * (maxNormal - minNormal) + minNormal;
                setZValue(normalVal); // Just update UI, don't trigger checks
            }, 100);
        } else {
            if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
            setZValue(BASELINE_Z);
        }

        return () => {
            if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
        };
    }, [isDriving]);

    const triggerPothole = () => {
        if (!isDriving) return;
        processZValue(Math.random() * 0.5);
    };

    const triggerSpeedBreaker = () => {
        if (!isDriving) return;
        processZValue(Math.random() * 0.5 + 1.5);
    };

    return (
        <div style={{ padding: '15px', margin: '10px 0', border: '2px solid #333', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '20px' }}>
            <h3>IoT Hardware Simulator (Z-Axis Vibration)</h3>

            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#555' }}>
                <strong>Instructions:</strong> Click map twice to set Route (Start & Destination), then Start Driving.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                <button
                    onClick={isDriving ? stopDriving : startDriving}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: isDriving ? '#dc3545' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: route.length < 2 ? 0.6 : 1
                    }}
                    disabled={route.length < 2 && !isDriving}
                >
                    {isDriving ? 'Stop Driving' : 'Start Driving'}
                </button>

                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    Live Z-Axis: <span style={{ color: zValue < LOWER_LIMIT || zValue > UPPER_LIMIT ? 'red' : 'green' }}>{zValue.toFixed(2)}g</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button onClick={triggerPothole} disabled={!isDriving} style={{ padding: '8px 15px', cursor: isDriving ? 'pointer' : 'not-allowed', backgroundColor: '#dc3545', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold' }}>
                    Force Pothole (&lt;0.5g)
                </button>
                <button onClick={triggerSpeedBreaker} disabled={!isDriving} style={{ padding: '8px 15px', cursor: isDriving ? 'pointer' : 'not-allowed', backgroundColor: '#ffc107', border: 'none', borderRadius: '4px', color: 'black', fontWeight: 'bold' }}>
                    Force Speed Breaker (&gt;1.5g)
                </button>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px', fontStyle: 'italic', fontWeight: '500' }}>
                Status: {statusMsg}
                {vehiclePosition && ` | Location: ${vehiclePosition[0].toFixed(4)}, ${vehiclePosition[1].toFixed(4)}`}
            </div>
        </div>
    );
};

export default IoTSimulator;
