"use client";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { Coordinates } from "@/lib/location";

const locationIcon = divIcon({
  className: "",
  html: '<div style="width:24px;height:24px;border:3px solid white;border-radius:50% 50% 50% 0;background:#db2777;transform:rotate(-45deg);box-shadow:0 2px 8px #0006"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function MapController({
  coordinates,
  pinSelected,
  onChange,
}: {
  coordinates: Coordinates;
  pinSelected: boolean;
  onChange: (coordinates: Coordinates) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(
      [coordinates.latitude, coordinates.longitude],
      pinSelected ? Math.max(map.getZoom(), 17) : map.getZoom(),
    );
  }, [coordinates.latitude, coordinates.longitude, map, pinSelected]);

  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });

  return null;
}

export function AddressLocationMap({
  coordinates,
  pinSelected,
  onChange,
}: {
  coordinates: Coordinates;
  pinSelected: boolean;
  onChange: (coordinates: Coordinates) => void;
}) {
  return (
    <div className="overflow-hidden rounded-panel border border-styler-line">
      <MapContainer
        center={[coordinates.latitude, coordinates.longitude]}
        zoom={pinSelected ? 17 : 5}
        scrollWheelZoom
        className="h-72 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController coordinates={coordinates} pinSelected={pinSelected} onChange={onChange} />
        {pinSelected && (
          <Marker
            position={[coordinates.latitude, coordinates.longitude]}
            icon={locationIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const { lat, lng } = event.target.getLatLng();
                onChange({ latitude: lat, longitude: lng });
              },
            }}
          />
        )}
      </MapContainer>
      <p className="bg-styler-surface px-3 py-2 text-xs text-styler-muted">
        Drag the pin to your building entrance, or click the map to move it. Address details update for the selected pin.
      </p>
    </div>
  );
}
