"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { Clock3, LocateFixed, MapPinned, Radio, Square } from "lucide-react";

import { apiRequest } from "@/components/api-client";
import { distanceInKilometres, type Coordinates } from "@/lib/location";

type LocationPoint = Coordinates & { sharedAt: string | Date };

const customerIcon = divIcon({
  className: "",
  html: '<div style="width:24px;height:24px;border:3px solid white;border-radius:50% 50% 50% 0;background:#db2777;transform:rotate(-45deg);box-shadow:0 2px 8px #0006"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const professionalIcon = divIcon({
  className: "",
  html: '<div style="width:20px;height:20px;border:3px solid white;border-radius:50%;background:#2563eb;box-shadow:0 2px 8px #0006"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function FollowLiveLocation({ destination, current }: { destination: Coordinates | null; current: Coordinates | null }) {
  const map = useMap();
  const initialized = useRef(false);
  const lastCurrent = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (!initialized.current) {
      if (current && destination) {
        map.fitBounds(
          [
            [destination.latitude, destination.longitude],
            [current.latitude, current.longitude],
          ],
          { padding: [36, 36] },
        );
      } else if (current || destination) {
        const center = current || destination!;
        map.setView([center.latitude, center.longitude], 15);
      }
      initialized.current = true;
      lastCurrent.current = current;
      return;
    }

    if (
      current
      && (!lastCurrent.current
        || current.latitude !== lastCurrent.current.latitude
        || current.longitude !== lastCurrent.current.longitude)
    ) {
      map.panTo([current.latitude, current.longitude], { animate: true, duration: 0.6 });
      lastCurrent.current = current;
    }
  }, [current?.latitude, current?.longitude, destination?.latitude, destination?.longitude, map]);

  return null;
}

function formatElapsed(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (totalMinutes < 1) return "less than a minute";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function minutesRemaining(distanceKm: number) {
  return Math.max(1, Math.ceil((distanceKm / 20) * 60 + 5));
}

export function ProfessionalBookingNavigation({
  bookingId,
  viewerRole,
  destination,
  addressLabel,
  enabled,
  professionalLocation,
  professionalLocationHistory = [],
  professionalLocationStartedAt,
  etaMinutes,
  etaUpdatedAt,
}: {
  bookingId: string;
  viewerRole: "customer" | "professional";
  destination: Coordinates | null;
  addressLabel: string;
  enabled: boolean;
  professionalLocation?: (Coordinates & { sharedAt?: string | Date }) | null;
  professionalLocationHistory?: LocationPoint[];
  professionalLocationStartedAt?: string | Date | null;
  etaMinutes?: number | null;
  etaUpdatedAt?: string | Date | null;
}) {
  const [sharing, setSharing] = useState(false);
  const [current, setCurrent] = useState<Coordinates | null>(null);
  const [localHistory, setLocalHistory] = useState<LocationPoint[]>([]);
  const [localStartedAt, setLocalStartedAt] = useState<string | null>(null);
  const [localLastSeenAt, setLocalLastSeenAt] = useState<string | null>(null);
  const [sharingStopped, setSharingStopped] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const watchId = useRef<number | null>(null);
  const lastSentAt = useRef(0);
  const sharingRef = useRef(false);

  const trackedLocation = viewerRole === "customer"
    ? professionalLocation || null
    : current || (sharingStopped ? null : professionalLocation || null);
  const history = useMemo(() => {
    const points = new Map<number, LocationPoint>();
    const savedHistory = viewerRole === "professional" && sharingStopped ? [] : professionalLocationHistory;
    for (const point of [...savedHistory, ...localHistory]) {
      const timestamp = new Date(point.sharedAt).getTime();
      if (Number.isFinite(timestamp) && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
        points.set(timestamp, point);
      }
    }
    return [...points.values()].sort((a, b) => new Date(a.sharedAt).getTime() - new Date(b.sharedAt).getTime());
  }, [localHistory, professionalLocationHistory, sharingStopped, viewerRole]);
  const distance = destination && trackedLocation
    ? distanceInKilometres(trackedLocation, destination)
    : null;
  const startedAt = viewerRole === "professional"
    ? sharingStopped ? null : localStartedAt || professionalLocationStartedAt
    : professionalLocationStartedAt;
  const newestPointAt = viewerRole === "professional"
    ? sharingStopped ? null : localLastSeenAt || professionalLocation?.sharedAt || null
    : professionalLocation?.sharedAt || null;
  const etaTarget = etaMinutes != null && etaUpdatedAt
    ? new Date(etaUpdatedAt).getTime() + etaMinutes * 60_000
    : null;
  const etaLeft = etaTarget != null && Number.isFinite(etaTarget)
    ? Math.max(0, Math.ceil((etaTarget - now) / 60_000))
    : null;
  const estimatedMinutes = etaLeft ?? (distance == null ? null : minutesRemaining(distance));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  function stopTracking() {
    const wasSharing = sharingRef.current;
    sharingRef.current = false;
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    lastSentAt.current = 0;
    setSharing(false);
    setCurrent(null);
    setLocalHistory([]);
    setLocalStartedAt(null);
    setLocalLastSeenAt(null);
    setSharingStopped(true);
    if (viewerRole === "professional" && wasSharing) {
      void apiRequest(`/api/professional/bookings/${bookingId}/location`, { method: "DELETE" })
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not stop sharing your location."));
    }
  }

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    if (sharingRef.current) {
      sharingRef.current = false;
      void apiRequest(`/api/professional/bookings/${bookingId}/location`, { method: "DELETE" })
        .catch((cause) => console.error("Could not stop booking location sharing", cause));
    }
  }, [bookingId]);

  useEffect(() => {
    if (!enabled) stopTracking();
  }, [enabled]);

  function startTracking() {
    if (viewerRole !== "professional") return;
    if (!navigator.geolocation) {
      setError("Location services are not available in this browser.");
      return;
    }
    setError("");
    setSharingStopped(false);
    sharingRef.current = true;
    setSharing(true);
    setLocalStartedAt(new Date().toISOString());
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const coordinates = { latitude: coords.latitude, longitude: coords.longitude };
        const sentAt = Date.now();
        setCurrent(coordinates);
        setLocalLastSeenAt(new Date(sentAt).toISOString());
        if (sentAt - lastSentAt.current < 12_000) return;
        lastSentAt.current = sentAt;
        const point = { ...coordinates, sharedAt: new Date(sentAt).toISOString() };
        setLocalHistory((previous) => [...previous, point].slice(-120));
        void apiRequest(`/api/professional/bookings/${bookingId}/location`, {
          method: "PATCH",
          body: JSON.stringify(coordinates),
        }).catch((cause) => {
          setError(cause instanceof Error ? cause.message : "Could not share your live location.");
        });
      },
      (cause) => {
        stopTracking();
        setError(cause.code === cause.PERMISSION_DENIED
          ? "Location permission was denied. Allow it in your browser to share live location."
          : "Your current location could not be determined. Try again.");
      },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 15_000 },
    );
  }

  const mapCenter = trackedLocation || destination;
  const mapTrail = history.map((point) => [point.latitude, point.longitude] as [number, number]);
  if (trackedLocation && history.length > 0) {
    const last = history[history.length - 1];
    if (last.latitude !== trackedLocation.latitude || last.longitude !== trackedLocation.longitude) {
      mapTrail.push([trackedLocation.latitude, trackedLocation.longitude]);
    }
  }
  const locationAge = newestPointAt ? Math.max(0, now - new Date(newestPointAt).getTime()) : null;
  const liveIsRecent = locationAge != null && locationAge <= 2 * 60_000;
  const updatedLabel = locationAge == null || locationAge < 10_000
    ? "just now"
    : locationAge < 60_000
      ? "less than a minute ago"
      : `${Math.floor(locationAge / 60_000)} min ago`;

  return (
    <section className="space-y-3 rounded-xl border border-styler-line bg-styler-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-styler-ink">
            <MapPinned size={14} className="text-styler-accent" />
            {viewerRole === "professional" ? "In-app trip tracking" : "Track your professional"}
          </h3>
          <p className="mt-1 text-[10px] leading-5 text-styler-muted">
            {viewerRole === "professional"
              ? "Share your location to see your movement here and let your customer follow the trip. Sharing is optional."
              : "Follow the professional's live position and recent route here. No external maps app is needed."}
          </p>
        </div>
        {enabled && viewerRole === "professional" && (
          <button
            type="button"
            onClick={sharing ? stopTracking : startTracking}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-styler-line px-3 py-2 text-[10px] font-semibold text-styler-ink hover:bg-styler-surface-2"
          >
            {sharing ? <Square size={12} /> : <LocateFixed size={13} />}
            {sharing ? "Stop sharing" : "Start live tracking"}
          </button>
        )}
      </div>

      {!enabled ? (
        <p className="rounded-lg bg-styler-surface-2 p-3 text-[10px] text-styler-muted">
          In-app tracking is available after the booking is confirmed.
        </p>
      ) : (
        <>
          {mapCenter && (
            <div className="overflow-hidden rounded-panel border border-styler-line">
              <MapContainer
                center={[mapCenter.latitude, mapCenter.longitude]}
                zoom={15}
                scrollWheelZoom
                className="h-72 w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FollowLiveLocation destination={destination} current={trackedLocation} />
                {destination && <Marker position={[destination.latitude, destination.longitude]} icon={customerIcon} />}
                {trackedLocation && <Marker position={[trackedLocation.latitude, trackedLocation.longitude]} icon={professionalIcon} />}
                {mapTrail.length > 1 && (
                  <Polyline
                    positions={mapTrail}
                    pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }}
                  />
                )}
                {trackedLocation && destination && (
                  <Polyline
                    positions={[
                      [trackedLocation.latitude, trackedLocation.longitude],
                      [destination.latitude, destination.longitude],
                    ]}
                    pathOptions={{ color: "#db2777", weight: 3, opacity: 0.7, dashArray: "7 8" }}
                  />
                )}
              </MapContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-styler-surface-2 p-3">
              <span className="flex items-center gap-1 text-[9px] text-styler-muted"><Radio size={11} /> Status</span>
              <strong className="mt-1 block text-xs text-styler-ink">
                {viewerRole === "professional"
                  ? (sharing ? "Sharing live" : professionalLocation ? "Last trip" : "Not sharing")
                  : (liveIsRecent ? "Live now" : "Waiting")}
              </strong>
            </div>
            <div className="rounded-lg bg-styler-surface-2 p-3">
              <span className="flex items-center gap-1 text-[9px] text-styler-muted"><Clock3 size={11} /> Trip time</span>
              <strong className="mt-1 block text-xs text-styler-ink">
                {startedAt ? formatElapsed(now - new Date(startedAt).getTime()) : "Not started"}
              </strong>
            </div>
            <div className="rounded-lg bg-styler-surface-2 p-3">
              <span className="text-[9px] text-styler-muted">Direct distance</span>
              <strong className="mt-1 block text-xs text-styler-ink">
                {distance == null ? "—" : `${distance.toFixed(1)} km`}
              </strong>
            </div>
            <div className="rounded-lg bg-styler-surface-2 p-3">
              <span className="text-[9px] text-styler-muted">Estimated arrival</span>
              <strong className="mt-1 block text-xs text-styler-ink">
                {etaLeft === 0 ? "Arriving now" : estimatedMinutes == null ? "—" : `About ${estimatedMinutes} min`}
              </strong>
            </div>
          </div>

          <p className="text-[10px] text-styler-muted">
            {viewerRole === "customer"
              ? professionalLocation
                ? `Location updates every few seconds${locationAge == null ? "" : ` · updated ${updatedLabel}`}. ${etaMinutes != null ? "ETA is the professional's latest estimate." : "Arrival time is approximate and based on direct distance."}`
                : "Waiting for the professional to start sharing their location. Their booking status and ETA updates remain visible above."
              : destination
                ? "The dashed line shows direct distance, not a road route. Arrival time is an estimate; use the in-app map to follow your progress."
                : `No GPS pin is saved for this service address${addressLabel ? ` (${addressLabel})` : ""}.`}
          </p>
          {error && <p role="alert" className="text-[10px] text-rose-600">{error}</p>}
        </>
      )}
    </section>
  );
}
