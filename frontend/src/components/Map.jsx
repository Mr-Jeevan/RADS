import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import axios from 'axios';

// Fix default icon issue in Leaflet when using bundlers like Vite
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

function Map({ refreshKey }) {
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

    const mapCenter = [10.7905, 78.7047]; // Latitude, Longitude for Trichy

    return (
        <MapContainer center={mapCenter} zoom={13} style={{ height: '80vh', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            {anomalies.map((anomaly, idx) => {
                // GeoJSON coordinates are [lng, lat]; Leaflet expects [lat, lng]
                const [lng, lat] = anomaly.location?.coordinates || [0, 0];
                const position = [lat, lng];
                return (
                    <Marker key={idx} position={position}>
                        <Popup>
                            <strong>Type:</strong> {anomaly.type}<br />
                            <strong>Severity:</strong> {anomaly.severity}
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}

export default Map;
