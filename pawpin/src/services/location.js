function locationError(error) {
  if (error?.code === 1) return new Error("Location permission is blocked. Allow it in your browser site settings.");
  if (error?.code === 2) return new Error("Your device could not determine its location. Turn on Location Services and try again.");
  if (error?.code === 3) return new Error("Location took too long. Move near a window or check Location Services.");
  return new Error("Unable to get your current location");
}

function requestLocation(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is unavailable on this device"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude);
        const longitude = Number(position.coords.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          reject(new Error("Your device returned an invalid location"));
          return;
        }
        resolve({ latitude, longitude, accuracy: position.coords.accuracy });
      },
      (error) => reject(locationError(error)),
      options,
    );
  });
}

export async function getCurrentLocation() {
  try {
    return await requestLocation({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  } catch (freshError) {
    try {
      return await requestLocation({ enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 });
    } catch {
      throw freshError;
    }
  }
}

export function watchCurrentLocation(onLocation, onError) {
  if (!navigator.geolocation) {
    onError(new Error("Location is unavailable on this device"));
    return null;
  }
  return navigator.geolocation.watchPosition(
    (position) => {
      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        onLocation({ latitude, longitude, accuracy: position.coords.accuracy });
      }
    },
    (error) => onError(locationError(error)),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
  );
}

export function stopWatchingLocation(watchId) {
  if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
}
