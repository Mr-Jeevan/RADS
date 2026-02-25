import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// ------------------------------------------------------------------
// Custom Icons
// ------------------------------------------------------------------
const createCustomIcon = (color, label) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
        ">${label}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

const potholeIcon = createCustomIcon('#dc3545', 'P'); // Red
const speedBreakerIcon = createCustomIcon('#ffc107', 'S'); // Yellow
const startIcon = createCustomIcon('#28a745', 'A'); // Green Start
const destIcon = createCustomIcon('#17a2b8', 'B'); // Teal Dest
const vehicleIcon = createCustomIcon('#007bff', '🚗'); // Blue Car

// ------------------------------------------------------------------
// Map Click Handler Component
// ------------------------------------------------------------------
const MapClickSetup = ({ route, setRoute, setVehiclePosition }) => {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            if (route.length === 0) {
                // Set Start Point
                setRoute([[lat, lng]]);
                setVehiclePosition([lat, lng]); // Vehicle begins at Start
            } else if (route.length === 1) {
                // Set Destination Point
                setRoute([...route, [lat, lng]]);
            } else {
                // Reset route if clicked again after both are set
                setRoute([[lat, lng]]);
                setVehiclePosition([lat, lng]);
            }
        }
    });
    return null;
};

// ------------------------------------------------------------------
// Main Map Component
// ------------------------------------------------------------------
function Map({ refreshKey, route, setRoute, vehiclePosition, setVehiclePosition }) {
    const [anomalies, setAnomalies] = useState([]);

    useEffect(() => {
        const fetchAnomalies = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/anomalies');
                setAnomalies(response.data);
            } catch (error) {
                console.error('Error fetching anomalies:', error);
            }
        };
        fetchAnomalies();
    }, [refreshKey]);

    const mapCenter = [10.7905, 78.7047]; // Trichy

    return (
        <MapContainer center={mapCenter} zoom={13} style={{ height: '70vh', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />

            {/* Click listener to set route */}
            <MapClickSetup route={route} setRoute={setRoute} setVehiclePosition={setVehiclePosition} />

            {/* Render User Route and Vehicle */}
            {route.length > 0 && <Marker position={route[0]} icon={startIcon}><Popup>Start Point</Popup></Marker>}
            {route.length > 1 && <Marker position={route[1]} icon={destIcon}><Popup>Destination</Popup></Marker>}
            {route.length > 1 && <Polyline positions={route} color="blue" weight={4} opacity={0.6} />}
            {vehiclePosition && <Marker position={vehiclePosition} icon={vehicleIcon}><Popup>Live Vehicle Simulation</Popup></Marker>}

            {/* Render Fetched Anomalies */}
            {anomalies.map((anomaly, idx) => {
                const [lng, lat] = anomaly.location?.coordinates || [0, 0];
                const position = [lat, lng];

                // Select Icon
                const icon = anomaly.type === 'pothole' ? potholeIcon : speedBreakerIcon;

                return (
                    <Marker key={idx} position={position} icon={icon}>
                        <Popup>
                            <strong>Type:</strong> {anomaly.type.toUpperCase()}<br />
                            <strong>Severity:</strong> {anomaly.severity.toUpperCase()} ({anomaly.gForce}g)
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}

export default Map;
