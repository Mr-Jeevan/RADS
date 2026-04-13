import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import * as turf from '@turf/turf';

const IoTSimulator = ({
    onAnomalyDetected,
    startPoint,
    endPoint,
    route,
    vehiclePosition,
    setVehiclePosition
}) => {

    const [isDriving, setIsDriving] = useState(false);
    const [statusMsg, setStatusMsg] = useState('Idle');

    const motionIntervalRef = useRef(null);
    const distanceRef = useRef(0);

    // ✅ Define anomaly points ON ROUTE (lat, lng)
    const anomalyPointsRef = useRef([
        { id: 1, type: 'pothole', coordinates: null, triggered: false },
        { id: 2, type: 'speedbreaker', coordinates: null, triggered: false }
    ]);

    // ================= INIT ANOMALY POINTS =================
    useEffect(() => {
        if (route.length > 5) {
            anomalyPointsRef.current[0].coordinates = route[Math.floor(route.length * 0.3)];
            anomalyPointsRef.current[1].coordinates = route[Math.floor(route.length * 0.7)];
        }
    }, [route]);

    // ================= START / STOP =================
    const startDriving = () => {
        if (!route || route.length < 2) {
            setStatusMsg('Set route first');
            return;
        }

        setIsDriving(true);
        setStatusMsg('Driving...');
        distanceRef.current = 0;

        // Reset triggers
        anomalyPointsRef.current.forEach(p => p.triggered = false);
    };

    const stopDriving = () => {
        setIsDriving(false);
        setStatusMsg('Stopped');
    };

    // ================= DISTANCE CHECK =================
    const checkNearbyAnomaly = async (vehiclePos) => {

        for (let point of anomalyPointsRef.current) {
            if (!point.coordinates || point.triggered) continue;

            const distance = turf.distance(
                turf.point([vehiclePos[1], vehiclePos[0]]),
                turf.point([point.coordinates[1], point.coordinates[0]]),
                { units: 'meters' }
            );

            if (distance < 10) {
                point.triggered = true;

                const zVal = point.type === 'pothole'
                    ? Math.random() * 0.4
                    : 1.6 + Math.random() * 0.3;

                await reportAnomaly(point.type, zVal, vehiclePos);
            }
        }
    };

    // ================= REPORT =================
    const reportAnomaly = async (type, zVal, pos) => {
        try {
            const [lat, lng] = pos;

            const payload = {
                type: type,
                severity: zVal < 0.5 ? 'low' : 'high',
                gForce: parseFloat(zVal.toFixed(2)),
                location: {
                    type: 'Point',
                    coordinates: [lng, lat] // IMPORTANT: lng, lat
                }
            };

            await api.post('/api/anomalies', payload);

            setStatusMsg(`✅ ${type} sent`);

            if (onAnomalyDetected) onAnomalyDetected();

        } catch (err) {
            console.error(err);
            setStatusMsg('❌ Failed to send');
        }
    };

    // ================= MOTION =================
    useEffect(() => {
        if (!isDriving || route.length < 2) return;

        const line = turf.lineString(route.map(p => [p[1], p[0]]));
        const totalDistance = turf.length(line, { units: 'kilometers' });

        const speed = 60; // km/h
        const step = (speed / 3600) * 0.1;

        motionIntervalRef.current = setInterval(() => {

            distanceRef.current += step;

            if (distanceRef.current >= totalDistance) {
                stopDriving();
                setStatusMsg('Reached destination');
                return;
            }

            const point = turf.along(line, distanceRef.current, { units: 'kilometers' });
            const newPos = [point.geometry.coordinates[1], point.geometry.coordinates[0]];

            setVehiclePosition(newPos);

            // 🔥 KEY PART
            checkNearbyAnomaly(newPos);

        }, 100);

        return () => clearInterval(motionIntervalRef.current);

    }, [isDriving, route]);

    return (
        <div style={{ padding: 15, border: '1px solid black' }}>
            <h3>IoT Route Simulator</h3>

            <button onClick={isDriving ? stopDriving : startDriving}>
                {isDriving ? 'Stop' : 'Start'}
            </button>

            <p>Status: {statusMsg}</p>
        </div>
    );
};

export default IoTSimulator;