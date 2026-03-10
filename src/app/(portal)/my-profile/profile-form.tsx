"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useToast } from "@/components/toast";
import { updateDistributorProfile } from "./actions";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false });

type ProfileData = {
  business_name: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  contact_number: string | null;
  facebook_url: string | null;
  is_listed: boolean;
  latitude: number | null;
  longitude: number | null;
};

const REGIONS = [
  "NCR",
  "CAR",
  "Region I – Ilocos",
  "Region II – Cagayan Valley",
  "Region III – Central Luzon",
  "Region IV-A – CALABARZON",
  "Region IV-B – MIMAROPA",
  "Region V – Bicol",
  "Region VI – Western Visayas",
  "Region VII – Central Visayas",
  "Region VIII – Eastern Visayas",
  "Region IX – Zamboanga Peninsula",
  "Region X – Northern Mindanao",
  "Region XI – Davao",
  "Region XII – SOCCSKSARGEN",
  "Region XIII – Caraga",
  "BARMM",
];

export default function ProfileForm({ initial }: { initial: ProfileData }) {
  const [form, setForm] = useState({
    business_name: initial.business_name ?? "",
    region: initial.region ?? "",
    province: initial.province ?? "",
    city: initial.city ?? "",
    contact_number: initial.contact_number ?? "",
    facebook_url: initial.facebook_url ?? "",
    is_listed: initial.is_listed ?? false,
    latitude: initial.latitude ?? null,
    longitude: initial.longitude ?? null,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    setSaved(false);

    const result = await updateDistributorProfile(form);

    if (result.error) {
      toast(result.error, "error");
      setError(result.error);
    } else {
      toast("Profile saved");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">{error}</p>
      )}

      {/* Listing toggle */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Public Directory Listing</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Show your profile on the public <a href="/distributors" target="_blank" className="text-primary hover:underline">Distributors</a> page
            </p>
          </div>
          <button
            onClick={() => update("is_listed", !form.is_listed)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_listed ? "bg-primary" : "bg-muted border border-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.is_listed ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Profile fields */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Business Information</h3>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Business Name</label>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => update("business_name", e.target.value)}
            placeholder="Your business or shop name"
            className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Displayed on the public directory instead of your personal name</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Region</label>
            <select
              value={form.region}
              onChange={(e) => update("region", e.target.value)}
              className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              <option value="">Select region</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Province</label>
            <input
              type="text"
              value={form.province}
              onChange={(e) => update("province", e.target.value)}
              placeholder="e.g. Cebu"
              className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">City / Municipality</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="e.g. Cebu City"
              className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Number</label>
            <input
              type="tel"
              value={form.contact_number}
              onChange={(e) => update("contact_number", e.target.value)}
              placeholder="09XX XXX XXXX"
              className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Facebook Page URL</label>
            <input
              type="url"
              value={form.facebook_url}
              onChange={(e) => update("facebook_url", e.target.value)}
              placeholder="https://facebook.com/yourpage"
              className="w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Map pin */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Map Location</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click on the map to place your pin. Drag to adjust. This is shown on the public distributor directory.
          </p>
        </div>

        <LocationPicker
          latitude={form.latitude}
          longitude={form.longitude}
          onChange={(lat, lng) => {
            setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
            setSaved(false);
          }}
        />

        {form.latitude !== null && form.longitude !== null && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono">
              {form.latitude}, {form.longitude}
            </p>
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, latitude: null, longitude: null }));
                setSaved(false);
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove pin
            </button>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-400">Profile saved</span>
        )}
      </div>
    </div>
  );
}
