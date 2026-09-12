import { useCallback, useEffect, useState } from "react";

export type UserLocation = { latitude: number; longitude: number; accuracy: number };
export type LocationStatus = "locating" | "ready" | "unavailable" | "denied" | "timeout";

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>();
  const [status, setStatus] = useState<LocationStatus>("locating");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
        setStatus("ready");
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [attempt]);

  return { location, status, retry };
}
