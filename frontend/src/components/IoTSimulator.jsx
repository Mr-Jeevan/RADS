import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as turf from '@turf/turf';

const IoTSimulator = ({
    onAnomalyDetected,
    startPoint,
    endPoint,
    route,
    vehiclePosition,
    setVehiclePosition,
    trackingMode,
    setTrackingMode
}) => {
    const [isDriving, setIsDriving] = useState(false);
    const [zValue, setZValue] = useState(1.0);
    const [statusMsg, setStatusMsg] = useState('Idle');

    const dataIntervalRef = useRef(null);
    const motionIntervalRef = useRef(null);
    const distanceRef = useRef(0); // Current distance travelled in kilometers
    const watchIdRef = useRef(null); // Reference for the geolocation watcher

    // Constants
    const BASELINE_Z = 1.0;
    const THRESHOLD = 0.45;
    const UPPER_LIMIT = BASELINE_Z + THRESHOLD; // 1.45g
    const LOWER_LIMIT = BASELINE_Z - THRESHOLD; // 0.55g

    // --- Geolocation Hook (Phase 3.0) ---
    useEffect(() => {
        if (trackingMode === 'REALTIME') {
            if ("geolocation" in navigator) {
                setStatusMsg('Initializing Real-Time Geolocation...');
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        setVehiclePosition([latitude, longitude]);
                        setStatusMsg(`Tracking GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                        // Make error messages user-friendly
                        if (error.code === 1) setStatusMsg('❌ GPS Error: Permission Denied');
                        else if (error.code === 2) setStatusMsg('❌ GPS Error: Position Unavailable');
                        else if (error.code === 3) setStatusMsg('❌ GPS Error: Timeout');
                        else setStatusMsg(`❌ GPS Error: ${error.message}`);
                    },
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
                );
            } else {
                setStatusMsg('❌ Geolocation is not supported by your browser.');
            }
        } else {
            // Cleanup watch when switching away from REALTIME
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
                setStatusMsg('Idle (Auto Simulated Mode)');
            }
        }

        // Cleanup on unmount
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [trackingMode, setVehiclePosition]);

    // --- Dynamic Routing Logic (Phase 2.5) ---
    const startDriving = () => {
        if (!startPoint || !endPoint || !route || route.length < 2) {
            setStatusMsg('Please click on the map to set Start and Destination points first.');
            setIsDriving(false);
            return;
        }
        setIsDriving(true);
        setStatusMsg('Driving along route at 80 km/h...');
        distanceRef.current = 0;
        setVehiclePosition(route[0]);
    };

    const stopDriving = () => {
        setIsDriving(false);
        setStatusMsg('Drive stopped.');
    };

    // Calculate Interpolation using Turf.js
    useEffect(() => {
        if (trackingMode === 'REALTIME') {
            setIsDriving(false); // Can't auto drive in realtime
            return;
        }

        if (isDriving && route.length > 1) {
            const turfCoords = route.map(pos => [pos[1], pos[0]]); // [lng, lat]
            const line = turf.lineString(turfCoords);
            const totalDistance = turf.length(line, { units: 'kilometers' });

            // 80 km/h interpolation
            const speedKmh = 80;
            const distancePerTick = (speedKmh / 3600) * 0.1;

            motionIntervalRef.current = setInterval(() => {
                distanceRef.current += distancePerTick;

                if (distanceRef.current >= totalDistance) {
                    clearInterval(motionIntervalRef.current);
                    setVehiclePosition(route[route.length - 1]);
                    stopDriving();
                    setStatusMsg('Destination reached!');
                } else {
                    const along = turf.along(line, distanceRef.current, { units: 'kilometers' });
                    setVehiclePosition([along.geometry.coordinates[1], along.geometry.coordinates[0]]); // [lat, lng]
                }
            }, 100);
        } else {
            if (motionIntervalRef.current) clearInterval(motionIntervalRef.current);
        }

        return () => {
            if (motionIntervalRef.current) clearInterval(motionIntervalRef.current);
        };
    }, [isDriving, route, trackingMode, setVehiclePosition]);


    // --- Anomaly Logic ---
    const reportAnomaly = async (type, zVal) => {
        setStatusMsg(`Detected ${type} at ${zVal.toFixed(2)}g! Sending to backend...`);
        try {
            const currentPos = vehiclePosition || startPoint;
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
                    coordinates: [lng, lat]
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

    // Simulate normal vibration stream only when driving in auto mode or just constantly in realtime mode
    useEffect(() => {
        if (isDriving || trackingMode === 'REALTIME') {
            dataIntervalRef.current = setInterval(() => {
                const minNormal = 0.9;
                const maxNormal = 1.1;
                const normalVal = Math.random() * (maxNormal - minNormal) + minNormal;
                setZValue(normalVal);
            }, 100);
        } else {
            if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
            setZValue(BASELINE_Z);
        }

        return () => {
            if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
        };
    }, [isDriving, trackingMode]);

    const triggerPothole = () => processZValue(Math.random() * 0.5);
    const triggerSpeedBreaker = () => processZValue(Math.random() * 0.5 + 1.5);

    return (
        <div style={{ padding: '15px', margin: '10px 0', border: '2px solid #333', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>IoT Hardware Simulator (Z-Axis Vibration - Phase 3.0)</h3>

                {/* Tracking Mode Toggles */}
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                        onClick={() => setTrackingMode('AUTO')}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: trackingMode === 'AUTO' ? '#0d6efd' : '#e9ecef',
                            color: trackingMode === 'AUTO' ? 'white' : 'black',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Auto Route
                    </button>
                    <button
                        onClick={() => setTrackingMode('REALTIME')}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: trackingMode === 'REALTIME' ? '#0d6efd' : '#e9ecef',
                            color: trackingMode === 'REALTIME' ? 'white' : 'black',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Real-Time GPS
                    </button>
                </div>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#555' }}>
                {trackingMode === 'AUTO'
                    ? <strong>Auto Mode: Click map twice to set OSRM Route, then Start Driving.</strong>
                    : <strong>Real-Time Mode: Tracking physical device location via GPS.</strong>
                }
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                {trackingMode === 'AUTO' && (
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
                            opacity: (!startPoint || !endPoint) ? 0.6 : 1
                        }}
                        disabled={(!startPoint || !endPoint) && !isDriving}
                    >
                        {isDriving ? 'Stop Driving' : 'Start Simulated Drive'}
                    </button>
                )}

                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    Live Z-Axis: <span style={{ color: zValue < LOWER_LIMIT || zValue > UPPER_LIMIT ? 'red' : 'green' }}>{zValue.toFixed(2)}g</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                    onClick={triggerPothole}
                    disabled={trackingMode === 'AUTO' && !isDriving}
                    style={{
                        padding: '8px 15px',
                        cursor: (trackingMode === 'AUTO' && !isDriving) ? 'not-allowed' : 'pointer',
                        backgroundColor: '#dc3545',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                    Force Pothole (&lt;0.5g)
                </button>
                <button
                    onClick={triggerSpeedBreaker}
                    disabled={trackingMode === 'AUTO' && !isDriving}
                    style={{
                        padding: '8px 15px',
                        cursor: (trackingMode === 'AUTO' && !isDriving) ? 'not-allowed' : 'pointer',
                        backgroundColor: '#ffc107',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'black',
                        fontWeight: 'bold'
                    }}>
                    Force Speed Breaker (&gt;1.5g)
                </button>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px', fontStyle: 'italic', fontWeight: '500' }}>
                Status: {statusMsg}
            </div>
        </div>
    );
};

export default IoTSimulator;
