import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Free Straight Map Wrapper (OpenStreetMap via Leaflet)
 * This replaces react-native-maps to avoid Google API Key errors.
 */

const MapView = React.forwardRef(({
  children,
  style,
  initialRegion,
  onPress,
  onLongPress,
  showsUserLocation
}, ref) => {
  const webViewRef = useRef(null);

  // Expose methods like animateToRegion to the parent via ref
  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => {
      const script = `map.flyTo([${region.latitude}, ${region.longitude}], 15, { duration: ${duration / 1000} });`;
      webViewRef.current?.injectJavaScript(script);
    },
    fitToCoordinates: (coords, options) => {
      const json = JSON.stringify(coords.map(c => [c.latitude, c.longitude]));
      const script = `map.fitBounds(${json}, { padding: [20, 20] });`;
      webViewRef.current?.injectJavaScript(script);
    }
  }));

  // Translate React children (Markers, Polylines) into Leaflet JS
  const leafletElements = useMemo(() => {
    let scripts = '';
    React.Children.forEach(children, (child) => {
      if (!child) return;

      const type = child.type.name || child.type.displayName;
      const props = child.props;

      if (type === 'Marker') {
        scripts += `L.marker([${props.coordinate.latitude}, ${props.coordinate.longitude}]).addTo(map)${props.title ? `.bindPopup('${props.title}')` : ''};`;
      } else if (type === 'Polyline') {
        const path = JSON.stringify(props.coordinates.map(c => [c.latitude, c.longitude]));
        scripts += `L.polyline(${path}, { color: '${props.strokeColor || 'blue'}', weight: ${props.strokeWidth || 3} }).addTo(map);`;
      } else if (type === 'Circle') {
        scripts += `L.circle([${props.center.latitude}, ${props.center.longitude}], { radius: ${props.radius}, color: '${props.strokeColor || 'red'}', fillColor: '${props.fillColor || 'red'}', fillOpacity: 0.2 }).addTo(map);`;
      }
    });
    return scripts;
  }, [children]);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; background: #222; }
        .leaflet-container { background: #111 !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${initialRegion?.latitude || 16.0}, ${initialRegion?.longitude || 73.6}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        map.on('click', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'onPress', coordinate: e.latlng }));
        });

        map.on('contextmenu', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'onLongPress', coordinate: e.latlng }));
        });

        ${leafletElements}
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        scrollEnabled={false}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);
          const coord = { latitude: data.coordinate.lat, longitude: data.coordinate.lng };
          if (data.type === 'onPress' && onPress) onPress({ nativeEvent: { coordinate: coord } });
          if (data.type === 'onLongPress' && onLongPress) onLongPress({ nativeEvent: { coordinate: coord } });
        }}
      />
    </View>
  );
});

const Marker = ({ children }) => null;
const Circle = () => null;
const Polyline = () => null;
const Polygon = () => null;

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' }
});

export default MapView;
export { Marker, Circle, Polyline, Polygon };
