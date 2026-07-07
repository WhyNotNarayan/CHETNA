import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Free Map Wrapper (OpenStreetMap via Leaflet + WebView)
 * Visual style: clean light tiles, standard markers with popups, rounded container
 */

function processChildren(children) {
  const markers = [];
  const circles = [];
  const polylines = [];
  let polygonData = null;

  React.Children.forEach(children, (child) => {
    if (!child) return;

    if (child.type === React.Fragment) {
      const inner = processChildren(child.props.children);
      markers.push(...inner.markers);
      circles.push(...inner.circles);
      polylines.push(...inner.polylines);
      if (inner.polygonData) polygonData = inner.polygonData;
      return;
    }

    const type = child.type?.name || child.type?.displayName;
    const p = child.props;
    if (!p) return;

    try {
      if (type === 'Marker' && p.coordinate) {
        markers.push({
          lat: p.coordinate.latitude,
          lng: p.coordinate.longitude,
          title: p.title || ''
        });
      }

      if (type === 'Circle' && p.center) {
        circles.push({
          lat: p.center.latitude,
          lng: p.center.longitude,
          radius: p.radius || 200,
          color: p.strokeColor || '#EF4444',
          fillColor: p.fillColor || p.strokeColor || '#EF4444',
          fillOpacity: p.fillOpacity != null ? p.fillOpacity : 0.25,
          weight: p.strokeWidth || 2
        });
      }

      if (type === 'Polyline' && p.coordinates && p.coordinates.length >= 2) {
        polylines.push({
          path: p.coordinates,
          color: p.strokeColor || '#3B82F6',
          weight: p.strokeWidth || 5
        });
      }

      if (type === 'Polygon' && p.coordinates && p.coordinates.length >= 3) {
        polygonData = {
          path: p.coordinates,
          color: p.strokeColor || '#333',
          fillColor: p.fillColor || 'rgba(0,0,0,0.05)',
          weight: p.strokeWidth || 2
        };
      }
    } catch (e) {}
  });

  return { markers, circles, polylines, polygonData };
}

const MapView = React.forwardRef(({ children, style, initialRegion, onPress, onLongPress }, ref) => {
  const webViewRef = useRef(null);

  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region, duration) => {
      const zoom = region.latitudeDelta ? Math.round(8 - Math.log2(region.latitudeDelta)) : 13;
      webViewRef.current?.injectJavaScript(`map.flyTo([${region.latitude},${region.longitude}],${zoom},{duration:${(duration || 1000) / 1000}});`);
    },
    fitToCoordinates: (coords) => {
      const json = JSON.stringify(coords.map(c => [c.latitude, c.longitude]));
      webViewRef.current?.injectJavaScript(`map.fitBounds(${json},{padding:[40,40]});`);
    }
  }));

  const { markers, circles, polylines, polygonData } = processChildren(children);
  const childCount = markers.length + circles.length + polylines.length + (polygonData ? 1 : 0);

  const lat = initialRegion?.latitude || 16.027;
  const lng = initialRegion?.longitude || 73.6876;
  const zoom = initialRegion?.latitudeDelta ? Math.round(8 - Math.log2(initialRegion.latitudeDelta)) : 10;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;width:100%;overflow:hidden}
  #map{height:100%;width:100%;background:#f0f0f0}
  .leaflet-container{background:#f0f0f0!important}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([${lat},${lng}],${zoom});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,
  attribution:'&copy; CHETNA Sindhudurg'
}).addTo(map);

map.whenReady(function(){
  map.on('click',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'click',lat:e.latlng.lat,lng:e.latlng.lng}));});
  map.on('contextmenu',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'longpress',lat:e.latlng.lat,lng:e.latlng.lng}));});

  // Polygon (district boundary)
  ${polygonData ? `L.polygon(${JSON.stringify(polygonData.path.map(c => [c.latitude, c.longitude]))},{
    color:'${polygonData.color}',
    fillColor:'${polygonData.fillColor}',
    fillOpacity:0.08,
    weight:${polygonData.weight},
    dashArray:'8 4'
  }).addTo(map);` : ''}

  // Circles (crime areas)
  ${JSON.stringify(circles)}.forEach(function(c){
    L.circle([c.lat,c.lng],{
      radius:c.radius,
      color:c.color,
      fillColor:c.fillColor,
      fillOpacity:c.fillOpacity,
      weight:c.weight
    }).addTo(map);
  });

  // Polylines (crime roads)
  ${JSON.stringify(polylines)}.forEach(function(p){
    L.polyline(p.path.map(function(pt){return[pt.latitude,pt.longitude];}),{
      color:p.color,
      weight:p.weight,
      opacity:0.8,
      lineJoin:'round',
      lineCap:'round'
    }).addTo(map);
  });

  // Markers (standard Leaflet markers with popups)
  ${JSON.stringify(markers)}.forEach(function(m){
    if(m.lat&&m.lng){
      L.marker([m.lat,m.lng]).addTo(map).bindPopup(m.title||'Location');
    }
  });
});
</script>
</body>
</html>`;

  return (
    <View style={[styles.container, style]}>
      <WebView
        key={`map_${childCount}`}
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
  container: { flex: 1, overflow: 'hidden', borderRadius: 20 },
  webview: { flex: 1, backgroundColor: '#f0f0f0' }
});

export default MapView;
export { Marker, Circle, Polyline, Polygon };
