import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Free Map Wrapper (OpenStreetMap via Leaflet)
 * Renders Marker, Polyline, Circle, Polygon via React children.
 */

function buildLeafletScript(children) {
  let s = '';
  React.Children.forEach(children, (child) => {
    if (!child) return;
    const type = child.type?.name || child.type?.displayName;
    const p = child.props;
    if (!p) return;
    try {
      if (type === 'Marker' && p.coordinate) {
        const { latitude: lat, longitude: lng } = p.coordinate;
        if (lat == null || lng == null) return;
        const popup = p.title ? `.bindPopup('${String(p.title).replace(/'/g, "\\'")}')` : '';
        s += `L.circleMarker([${lat},${lng}],{radius:8,fillColor:'#EF4444',color:'#fff',weight:2,fillOpacity:1}).addTo(map)${popup};`;
      }
      if (type === 'Polyline' && p.coordinates && p.coordinates.length >= 2) {
        const coords = p.coordinates.map(c => `[${c.latitude},${c.longitude}]`).join(',');
        s += `L.polyline([${coords}],{color:'${p.strokeColor||'#3B82F6'}',weight:${p.strokeWidth||4},opacity:0.9,lineJoin:'round',lineCap:'round'}).addTo(map);`;
      }
      if (type === 'Circle' && p.center) {
        s += `L.circle([${p.center.latitude},${p.center.longitude}],{radius:${p.radius||200},color:'${p.strokeColor||'#EF4444'}',fillColor:'${p.fillColor||p.strokeColor||'#EF4444'}',fillOpacity:${p.fillOpacity!=null?p.fillOpacity:0.2},weight:${p.strokeWidth||2}}).addTo(map);`;
      }
      if (type === 'Polygon' && p.coordinates && p.coordinates.length >= 3) {
        const coords = p.coordinates.map(c => `[${c.latitude},${c.longitude}]`).join(',');
        s += `L.polygon([${coords}],{color:'${p.strokeColor||'#333'}',fillColor:'${p.fillColor||'rgba(0,0,0,0.05)'}',fillOpacity:0.08,weight:${p.strokeWidth||2},dashArray:'8 4'}).addTo(map);`;
      }
    } catch (e) {}
  });
  return s;
}

const MapView = React.forwardRef(({
  children,
  style,
  initialRegion,
  onPress,
  onLongPress,
}, ref) => {
  const webViewRef = useRef(null);

  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => {
      const zoom = region.latitudeDelta ? Math.round(8 - Math.log2(region.latitudeDelta)) : 13;
      webViewRef.current?.injectJavaScript(`map.flyTo([${region.latitude},${region.longitude}],${zoom},{duration:${(duration||1000)/1000}});`);
    },
    fitToCoordinates: (coords) => {
      const json = JSON.stringify(coords.map(c => [c.latitude, c.longitude]));
      webViewRef.current?.injectJavaScript(`map.fitBounds(${json},{padding:[40,40]});`);
    }
  }));

  const leafletScript = buildLeafletScript(children);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;width:100%;overflow:hidden}#map{height:100%;width:100%;background:#e8e8e8}</style>
</head>
<body>
<div id="map"></div>
  <script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${initialRegion?.latitude||16.027},${initialRegion?.longitude||73.6876}],${initialRegion?.latitudeDelta?Math.round(8-Math.log2(initialRegion.latitudeDelta)):10});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
map.whenReady(function(){
map.on('click',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'click',lat:e.latlng.lat,lng:e.latlng.lng}));});
map.on('contextmenu',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'longpress',lat:e.latlng.lat,lng:e.latlng.lng}));});
${leafletScript}
});
</script>
</body></html>`;

  return (
    <View style={[styles.container, style]}>
      <WebView
        key={`map_${React.Children.count(children)}`}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        scrollEnabled={false}
        style={styles.webview}
        onMessage={(event) => {
          try {
            const d = JSON.parse(event.nativeEvent.data);
            if (d.lat == null || d.lng == null) return;
            const coord = { latitude: d.lat, longitude: d.lng };
            if (d.type === 'click' && onPress) onPress({ nativeEvent: { coordinate: coord } });
            if (d.type === 'longpress' && onLongPress) onLongPress({ nativeEvent: { coordinate: coord } });
          } catch (e) {}
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
  container: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#e8e8e8' }
});

export default MapView;
export { Marker, Circle, Polyline, Polygon };
