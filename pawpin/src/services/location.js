export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is unavailable on this device"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => reject(new Error("Allow location access so nearby shelters receive the correct pin")),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

export function watchCurrentLocation(onLocation, onError) {
  if (!navigator.geolocation) {
    onError(new Error("Location is unavailable on this device"));
    return null;
  }
  return navigator.geolocation.watchPosition(
    (position) => onLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }),
    () => onError(new Error("Allow location access to keep sharing while this screen is open")),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
  );
}

export function stopWatchingLocation(watchId) {
  if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
}
