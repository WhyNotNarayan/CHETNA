import { Platform, View, Text } from 'react-native';

let MapView, Marker, Circle, Polyline, Polygon;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
  Polyline = Maps.Polyline;
  Polygon = Maps.Polygon;
} else {
  // Simple Web Placeholder
  MapView = ({ children, style }) => (
    <View style={[style, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: '#888' }}>Map View not supported on Web</Text>
      {children}
    </View>
  );
  Marker = () => null;
  Circle = () => null;
  Polyline = () => null;
  Polygon = () => null;
}

export default MapView;
export { Marker, Circle, Polyline, Polygon };
