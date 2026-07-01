import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

const MapView = ({ children, style, initialRegion }) => {
  const mapHtml = useMemo(() => {
    // Extracting marker and path data from children for the web engine
    const markers = [];
    const circles = [];
    const polylines = [];

    const processChildren = (childrenArray) => {
      React.Children.forEach(childrenArray, (child) => {
        if (!child) return;
        
        // Handle Fragments
        if (child.type === React.Fragment) {
          processChildren(child.props.children);
          return;
        }

        // Marker detection
        if (child.props.coordinate) {
          markers.push({
            lat: child.props.coordinate.latitude,
            lng: child.props.coordinate.longitude,
            title: child.props.title || 'Danger Zone'
          });
        }
        
        // Circle (Red Zones) detection
        if (child.props.radius && child.props.center) {
          circles.push({
            lat: child.props.center.latitude,
            lng: child.props.center.longitude,
            radius: child.props.radius,
            color: child.props.strokeColor || '#ff0000'
          });
        }
        
        // Polyline/Polygon detection
        if (child.props.coordinates && !child.props.radius && child.props.coordinates.length > 0) {
          polylines.push({
            path: child.props.coordinates,
            color: child.props.strokeColor || '#ff0000',
            weight: child.props.strokeWidth || 5
          });
        }
      });
    };

    processChildren(children);

    const lat = initialRegion?.latitude || 16.05;
    const lng = initialRegion?.longitude || 73.65;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; background: #fff; }
          #map { height: 100vh; width: 100vw; background: #f0f0f0; }
          .leaflet-container { background: #f0f0f0 !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lng}], 11);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; CHETNA Sindhudurg'
          }).addTo(map);

          const markers = ${JSON.stringify(markers)};
          const circles = ${JSON.stringify(circles)};
          const polylines = ${JSON.stringify(polylines)};

          circles.forEach(c => {
            L.circle([c.lat, c.lng], {
              color: c.color,
              fillColor: c.color,
              fillOpacity: 0.3,
              radius: c.radius
            }).addTo(map);
          });

          polylines.forEach(p => {
            L.polyline(p.path.map(pt => [pt.latitude, pt.longitude]), {
              color: p.color,
              weight: 5,
              opacity: 0.8
            }).addTo(map);
          });

          markers.forEach(m => {
            L.marker([m.lat, m.lng]).addTo(map).bindPopup(m.title);
          });
        </script>
      </body>
      </html>
    `;
  }, [children, initialRegion]);

  return (
    <View style={[style, { overflow: 'hidden', borderRadius: 20 }]}>
      <iframe 
        srcDoc={mapHtml} 
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Sindhudurg Live Map"
      />
    </View>
  );
};

const Marker = ({ children }) => children || null;
const Circle = () => null;
const Polyline = () => null;
const Polygon = () => null;

export default MapView;
export { Marker, Circle, Polyline, Polygon };
