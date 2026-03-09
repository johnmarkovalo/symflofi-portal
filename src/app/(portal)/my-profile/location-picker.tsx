"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
};

function createPinIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 32px; height: 32px;
      background: #8b5cf6;
      border: 3px solid rgba(255,255,255,0.9);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 12px rgba(139,92,246,0.4);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

export default function LocationPicker({ latitude, longitude, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const hasCoords = latitude !== null && longitude !== null;

  const placeMarker = useCallback((map: L.Map, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: createPinIcon(),
        draggable: true,
      }).addTo(map);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        onChangeRef.current(
          Math.round(pos.lat * 1_000_000) / 1_000_000,
          Math.round(pos.lng * 1_000_000) / 1_000_000
        );
      });
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center: [number, number] = hasCoords
      ? [latitude!, longitude!]
      : [12.8797, 121.7740]; // Philippines center

    const map = L.map(mapRef.current, {
      center,
      zoom: hasCoords ? 13 : 6,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    if (hasCoords) {
      placeMarker(map, latitude!, longitude!);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const lat = Math.round(e.latlng.lat * 1_000_000) / 1_000_000;
      const lng = Math.round(e.latlng.lng * 1_000_000) / 1_000_000;
      placeMarker(map, lat, lng);
      onChangeRef.current(lat, lng);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{`
        .leaflet-control-zoom a {
          background: hsl(240 6% 10%) !important;
          color: #e4e4e7 !important;
          border-color: hsl(240 4% 16%) !important;
        }
        .leaflet-control-zoom a:hover {
          background: hsl(240 6% 15%) !important;
        }
        .leaflet-control-attribution {
          background: hsl(240 6% 10% / 0.8) !important;
          color: #71717a !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #8b5cf6 !important;
        }
      `}</style>
      <div
        ref={mapRef}
        className="w-full h-[300px] rounded-xl border border-border overflow-hidden"
      />
    </>
  );
}
