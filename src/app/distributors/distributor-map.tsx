"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Distributor = {
  id: string;
  business_name: string | null;
  name: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  contact_number: string | null;
  facebook_url: string | null;
  distributor_tier: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Approximate center coordinates for Philippine regions
const regionCoords: Record<string, [number, number]> = {
  "NCR": [14.5995, 120.9842],
  "CAR": [17.3513, 121.1719],
  "Region I – Ilocos": [16.0832, 120.6200],
  "Region II – Cagayan Valley": [16.9754, 121.8107],
  "Region III – Central Luzon": [15.4828, 120.7120],
  "Region IV-A – CALABARZON": [14.1008, 121.0794],
  "Region IV-B – MIMAROPA": [12.8797, 121.0169],
  "Region V – Bicol": [13.4210, 123.4137],
  "Region VI – Western Visayas": [10.7202, 122.5621],
  "Region VII – Central Visayas": [9.8500, 123.8907],
  "Region VIII – Eastern Visayas": [11.2440, 124.9613],
  "Region IX – Zamboanga Peninsula": [7.8325, 123.1597],
  "Region X – Northern Mindanao": [8.0202, 124.6857],
  "Region XI – Davao": [7.1907, 126.0016],
  "Region XII – SOCCSKSARGEN": [6.2707, 124.6857],
  "Region XIII – Caraga": [8.9475, 125.5406],
  "BARMM": [6.9568, 124.2421],
};

// Slight offset per distributor in same region to avoid marker overlap
function getOffset(index: number): [number, number] {
  const angle = (index * 137.5 * Math.PI) / 180; // golden angle
  const radius = 0.08 * Math.sqrt(index + 1);
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

const tierColors: Record<string, string> = {
  bronze: "#b45309",
  silver: "#94a3b8",
  gold: "#eab308",
};

function createMarkerIcon(tier: string | null, state: "default" | "dimmed" | "active" = "default") {
  const color = state === "active" ? "#8b5cf6" : tierColors[tier ?? ""] ?? "#8b5cf6";
  const size = state === "active" ? 34 : 28;
  const borderWidth = state === "active" ? 3 : 2;
  return L.divIcon({
    className: "",
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: ${borderWidth}px solid rgba(255,255,255,${state === "dimmed" ? 0.3 : 0.9});
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: ${state === "active" ? `0 0 16px ${color}80, 0 2px 8px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.3)"};
      opacity: ${state === "dimmed" ? 0.2 : 1};
      transition: opacity 0.2s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

type Props = {
  distributors: Distributor[];
  highlightedId: string | null;
  selectedId: string | null;
};

export default function DistributorMap({ distributors, highlightedId, selectedId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [12.8797, 121.7740],
      zoom: 6,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const regionCount: Record<string, number> = {};

    for (const d of distributors) {
      let lat: number, lng: number;

      if (d.latitude !== null && d.longitude !== null) {
        lat = d.latitude;
        lng = d.longitude;
      } else {
        const region = d.region || "Other";
        const coords = regionCoords[region];
        if (!coords) continue;

        regionCount[region] = (regionCount[region] || 0);
        const offset = getOffset(regionCount[region]);
        regionCount[region]++;
        lat = coords[0] + offset[0];
        lng = coords[1] + offset[1];
      }

      const marker = L.marker(
        [lat, lng],
        { icon: createMarkerIcon(d.distributor_tier) }
      ).addTo(map);

      const displayName = d.business_name || d.name || "SymfloFi Distributor";
      const location = [d.city, d.province].filter(Boolean).join(", ") || d.region || "Philippines";

      let popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 180px;">
          <strong style="font-size: 13px;">${displayName}</strong>
          <div style="font-size: 11px; color: #888; margin-top: 2px;">${location}</div>
      `;

      if (d.contact_number) {
        popupHtml += `<div style="font-size: 12px; margin-top: 6px;"><a href="tel:${d.contact_number}" style="color: #8b5cf6; text-decoration: none;">${d.contact_number}</a></div>`;
      }

      if (d.facebook_url) {
        popupHtml += `<div style="font-size: 12px; margin-top: 3px;"><a href="${d.facebook_url}" target="_blank" rel="noopener noreferrer" style="color: #8b5cf6; text-decoration: none;">Facebook Page</a></div>`;
      }

      popupHtml += `</div>`;

      marker.bindPopup(popupHtml, {
        className: "distributor-popup",
      });

      markersRef.current.set(d.id, marker);
    }

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markersRef.current.clear();
    };
  }, [distributors]);

  // Update marker visibility on hover
  useEffect(() => {
    for (const d of distributors) {
      const marker = markersRef.current.get(d.id);
      if (!marker) continue;

      const isActive = highlightedId === d.id;
      const isDimmed = highlightedId !== null && !isActive;
      const state = isActive ? "active" : isDimmed ? "dimmed" : "default";
      marker.setIcon(createMarkerIcon(d.distributor_tier, state));

      if (highlightedId === d.id) {
        marker.setZIndexOffset(1000);
        marker.openPopup();
      } else {
        marker.setZIndexOffset(0);
        marker.closePopup();
      }
    }
  }, [highlightedId, distributors]);

  // Fly to selected marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (selectedId) {
      const marker = markersRef.current.get(selectedId);
      if (marker) {
        const pos = marker.getLatLng();
        map.flyTo(pos, 13, { duration: 0.8 });
      }
    } else {
      map.flyTo([12.8797, 121.7740], 6, { duration: 0.8 });
    }
  }, [selectedId]);

  return (
    <>
      <style>{`
        .distributor-popup .leaflet-popup-content-wrapper {
          background: hsl(240 6% 10%);
          color: #e4e4e7;
          border: 1px solid hsl(240 4% 16%);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .distributor-popup .leaflet-popup-tip {
          background: hsl(240 6% 10%);
          border: 1px solid hsl(240 4% 16%);
        }
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
        className="w-full h-[400px] lg:h-[calc(100vh-8rem)] rounded-2xl border border-border overflow-hidden"
      />
    </>
  );
}
