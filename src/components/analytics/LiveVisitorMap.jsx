import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

const normalizeLocation = (raw = {}) => {
  const lat = Number(raw?.latitude);
  const lng = Number(raw?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    city: raw?.city || 'Unknown City',
    country: raw?.country_name || 'Unknown Country',
    lat,
    lng,
  };
};

export default function LiveVisitorMap() {
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadLocation = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error('Location API failed.');
        }

        const normalized = normalizeLocation(data);
        if (!normalized) {
          throw new Error('Invalid location response.');
        }

        if (!active) return;
        setLocation(normalized);
      } catch {
        if (!active) return;
        setError('Unable to fetch visitor location right now.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLocation();

    return () => {
      active = false;
    };
  }, []);

  const center = useMemo(
    () => (location ? { lat: location.lat, lng: location.lng } : DEFAULT_CENTER),
    [location]
  );

  return (
    <div className="dashboard-card dashboard-wide live-map-card">
      <h3>
        <i className="fas fa-map-location-dot"></i> Live Visitor Map
      </h3>
      <p className="executive-subtitle">
        Approximate geolocation from IP data using OpenStreetMap.
      </p>

      <div className="live-map-meta">
        <span>
          <strong>City:</strong> {loading ? 'Loading...' : location?.city || 'N/A'}
        </span>
        <span>
          <strong>Country:</strong> {loading ? 'Loading...' : location?.country || 'N/A'}
        </span>
        <span>
          <strong>Latitude:</strong>{' '}
          {loading ? 'Loading...' : location ? location.lat.toFixed(4) : 'N/A'}
        </span>
        <span>
          <strong>Longitude:</strong>{' '}
          {loading ? 'Loading...' : location ? location.lng.toFixed(4) : 'N/A'}
        </span>
      </div>

      <div className="live-map-wrap" aria-label="Live visitor map">
        <MapContainer center={center} zoom={location ? 7 : 3} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {location && (
            <Marker position={[location.lat, location.lng]}>
              <Popup>
                Visitor near {location.city}, {location.country}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {error ? <small>{error}</small> : null}
    </div>
  );
}
