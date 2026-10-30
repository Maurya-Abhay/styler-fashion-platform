"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";

import type { Coordinates } from "@/lib/location";
import { getCurrentCoordinates, reverseGeocode } from "@/lib/location";

const AddressLocationMap = dynamic(
  () => import("@/components/address-location-map").then((module) => module.AddressLocationMap),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-panel bg-styler-surface-2" /> },
);

const INDIA_CENTER: Coordinates = { latitude: 20.5937, longitude: 78.9629 };

type ProfessionalLocation = {
  city?: string;
  state?: string;
  postalCode?: string;
  baseLocation?: Coordinates;
};

export function ProfessionalLocationEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: ProfessionalLocation;
  onChange: (patch: Partial<ProfessionalLocation>) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupId = useRef(0);
  const hasCoordinates = Number.isFinite(value.baseLocation?.latitude)
    && Number.isFinite(value.baseLocation?.longitude);
  const coordinates = hasCoordinates ? value.baseLocation! : INDIA_CENTER;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    lookupId.current += 1;
  }, []);

  function selectPin(next: Coordinates) {
    onChange({
      baseLocation: next,
      city: "",
      state: "",
      postalCode: "",
    });
    setError("");
    setMessage("Pin selected. Looking up the address...");
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    const requestId = ++lookupId.current;
    timer.current = setTimeout(() => {
      void reverseGeocode(next)
        .then((address) => {
          if (lookupId.current !== requestId) return;
          onChange({
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          });
          setMessage("Location found. Check the city and pin code before saving.");
        })
        .catch((cause) => {
          if (lookupId.current !== requestId) return;
          setError(cause instanceof Error ? cause.message : "Could not look up this address.");
          setMessage("The map pin is saved here. Enter any missing city or state manually.");
        })
        .finally(() => {
          if (lookupId.current === requestId) setBusy(false);
        });
    }, 1_200);
  }

  async function useCurrentLocation() {
    if (timer.current) clearTimeout(timer.current);
    lookupId.current += 1;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const current = await getCurrentCoordinates();
      selectPin(current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not determine your current location.");
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-styler-line bg-styler-surface-2 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-styler-ink">
            <MapPin size={14} className="text-styler-accent" />
            Studio service location
          </h3>
          <p className="mt-1 max-w-2xl text-[10px] leading-5 text-styler-muted">
            Allow location access or place the pin on your studio. Nearby customer requests use this private pin;
            customers see your city, not your exact coordinates.
          </p>
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={disabled || busy}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-styler-accent px-3 py-2 text-[10px] font-semibold text-white hover:bg-styler-accent-strong disabled:opacity-60"
        >
          <LocateFixed size={13} />
          {busy ? (message.includes("Looking up") ? "Looking up address..." : "Finding location...") : "Use current location"}
        </button>
      </div>

      <AddressLocationMap
        coordinates={coordinates}
        pinSelected={Boolean(hasCoordinates)}
        onChange={selectPin}
      />

      {message && <p className="text-[10px] text-styler-muted">{message}</p>}
      {error && <p role="alert" className="text-[10px] text-rose-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[10px] font-semibold text-styler-ink-soft">
          City
          <input
            value={value.city || ""}
            onChange={(event) => onChange({ city: event.target.value })}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-styler-line bg-styler-surface px-3 py-2 text-xs text-styler-ink outline-none"
            autoComplete="address-level2"
          />
        </label>
        <label className="text-[10px] font-semibold text-styler-ink-soft">
          State
          <input
            value={value.state || ""}
            onChange={(event) => onChange({ state: event.target.value })}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-styler-line bg-styler-surface px-3 py-2 text-xs text-styler-ink outline-none"
            autoComplete="address-level1"
          />
        </label>
        <label className="text-[10px] font-semibold text-styler-ink-soft">
          PIN code (if available)
          <input
            value={value.postalCode || ""}
            onChange={(event) => onChange({ postalCode: event.target.value })}
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-styler-line bg-styler-surface px-3 py-2 text-xs text-styler-ink outline-none"
            autoComplete="postal-code"
          />
        </label>
      </div>

      {hasCoordinates && (
        <p className="text-[10px] text-styler-muted">
          Pin: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
        </p>
      )}
    </section>
  );
}
