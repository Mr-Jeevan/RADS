import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
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
// Map Centerer (Phase 3.0)
// Auto-pans the map to the vehicle's live GPS location
// ------------------------------------------------------------------
const MapCenterer = ({ vehiclePosition, trackingMode }) => {
    const map = useMap();
    useEffect(() => {
        if (trackingMode === 'REALTIME' && vehiclePosition) {
            map.flyTo(vehiclePosition, map.getZoom(), {
                animate: true,
                duration: 1.5 // Smooth animation
            });
        }
    }, [vehiclePosition, trackingMode, map]);
    return null;
};

// ------------------------------------------------------------------
// Map Click Handler Component
// ------------------------------------------------------------------
const MapClickSetup = ({ startPoint, setStartPoint, endPoint, setEndPoint, setRoute, setVehiclePosition, trackingMode }) => {
    useMapEvents({
        async click(e) {
            // Disable manual routing if we are in real-time tracking mode
            if (trackingMode === 'REALTIME') return;

            const { lat, lng } = e.latlng;

            if (!startPoint || (startPoint && endPoint)) {
                // First click, or reset everything if clicked a 3rd time
                setStartPoint([lat, lng]);
                setEndPoint(null);
                setRoute([]);
                setVehiclePosition([lat, lng]); // Vehicle begins at Start
            } else if (startPoint && !endPoint) {
                // Second click: Set Destination and Fetch Route
                setEndPoint([lat, lng]);
                try {
                    // Fetch real road route from OSRM
                    const response = await axios.get(
                        `https://router.project-osrm.org/route/v1/driving/${startPoint[1]},${startPoint[0]};${lng},${lat}?overview=full&geometries=geojson`
                    );

                    if (response.data.routes && response.data.routes.length > 0) {
                        // OSRM returns coordinates in [lng, lat] format
                        const geoJsonCoords = response.data.routes[0].geometry.coordinates;

                        // Convert to [lat, lng] for Leaflet Polyline
                        const leafletRoute = geoJsonCoords.map(coord => [coord[1], coord[0]]);
                        setRoute(leafletRoute);
                    }
                } catch (error) {
                    console.error("OSRM Route fetching error:", error);
                    alert("Failed to fetch route. OSRM API might be rate-limiting.");
                }
            }
        }
    });
    return null;
};

// ------------------------------------------------------------------
// Main Map Component
// ------------------------------------------------------------------
function Map({ refreshKey, startPoint, setStartPoint, endPoint, setEndPoint, route, setRoute, vehiclePosition, setVehiclePosition, trackingMode }) {
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

    const mapCenter = [10.7905, 78.7047]; // Trichy default

    return (
        <MapContainer center={mapCenter} zoom={13} style={{ height: '70vh', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />

            {/* Auto-pan logic when tracking real device */}
            <MapCenterer vehiclePosition={vehiclePosition} trackingMode={trackingMode} />

            {/* Click listener to set route */}
            <MapClickSetup
                startPoint={startPoint} setStartPoint={setStartPoint}
                endPoint={endPoint} setEndPoint={setEndPoint}
                setRoute={setRoute} setVehiclePosition={setVehiclePosition}
                trackingMode={trackingMode}
            />

            {/* Render User Route and Vehicle */}
            {trackingMode === 'AUTO' && startPoint && <Marker position={startPoint} icon={startIcon}><Popup>Start Point</Popup></Marker>}
            {trackingMode === 'AUTO' && endPoint && <Marker position={endPoint} icon={destIcon}><Popup>Destination</Popup></Marker>}
            {trackingMode === 'AUTO' && route.length > 0 && <Polyline positions={route} color="blue" weight={5} opacity={0.6} />}

            {/* The Vehicle renders in both modes exactly where the state says it is */}
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
