function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function findNearestSecretCops(senderLat, senderLng, cops, limit = 5) {
  return cops
    .map(cop => {
      // Determine cop's location using live lastLocation or registration coordinates
      const lat = cop.lastLocation ? cop.lastLocation.latitude : cop.latitude;
      const lng = cop.lastLocation ? cop.lastLocation.longitude : cop.longitude;
      
      if (lat === null || lat === undefined || lng === null || lng === undefined) {
        return { ...cop, distance: Infinity };
      }
      
      const distance = getDistance(senderLat, senderLng, lat, lng);
      return { ...cop, distance };
    })
    .filter(cop => cop.distance !== Infinity)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

module.exports = {
  getDistance,
  findNearestSecretCops
};
