"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/roles";

export async function updateDistributorProfile(formData: {
  business_name: string;
  region: string;
  province: string;
  city: string;
  contact_number: string;
  facebook_url: string;
  is_listed: boolean;
  latitude: number | null;
  longitude: number | null;
}) {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "operator" || !ctx.operatorId || !ctx.isDistributor) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("operators")
    .update({
      business_name: formData.business_name || null,
      region: formData.region || null,
      province: formData.province || null,
      city: formData.city || null,
      contact_number: formData.contact_number || null,
      facebook_url: formData.facebook_url || null,
      is_listed: formData.is_listed,
      latitude: formData.latitude,
      longitude: formData.longitude,
    })
    .eq("id", ctx.operatorId);

  if (error) return { error: error.message };
  return { success: true };
}
