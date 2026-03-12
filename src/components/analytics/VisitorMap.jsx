import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [20.5937, 78.9629];

const formatVisitTime = (value) => {
  const date = new Date(Number(value || 0));
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const FocusOnVisitor = ({ visitor }) => {
  const map = useMap();

  useEffect(() => {
    if (!visitor) return;
    map.setView([visitor.latitude, visitor.longitude], 10, { animate: true });
  }, [map, visitor]);

  return null;
};

export default function VisitorMap({ visitors = [], selectedVisitor }) {
  const center = selectedVisitor
    ? [selectedVisitor.latitude, selectedVisitor.longitude]
    : visitors[0]
      ? [visitors[0].latitude, visitors[0].longitude]
      : DEFAULT_CENTER;

  return (
    <div className="dashboard-card dashboard-wide visitor-map-card">
      <h3>
        <i className="fas fa-map-marked-alt"></i> Live Visitor Map
      </h3>
      <p className="executive-subtitle">Real-time visitor markers from stored location records.</p>

      <div className="visitor-map-wrap">
        <MapContainer center={center} zoom={visitors.length ? 4 : 3} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FocusOnVisitor visitor={selectedVisitor} />
          {visitors.map((visitor) => (
            <Marker key={visitor.id} position={[visitor.latitude, visitor.longitude]}>
              <Popup>
                <div>
                  <strong>
                    {visitor.city}, {visitor.country}
                  </strong>
                  <br />
                  Visit: {formatVisitTime(visitor.visitTimeMs)}
                  <br />
                  Device: {visitor.deviceType}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
