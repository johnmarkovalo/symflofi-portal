import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";
import OperatorCodeChip from "@/components/operator-code-chip";

export default async function MyProfilePage() {
  const ctx = await getUserContext();
  if (!ctx || ctx.role !== "operator" || !ctx.isDistributor || !ctx.operatorId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: operator } = await supabase
    .from("operators")
    .select("business_name, region, province, city, contact_number, facebook_url, is_listed, distributor_tier, latitude, longitude")
    .eq("id", ctx.operatorId)
    .single();

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Distributor Profile</h1>
          {ctx.operatorCode && <OperatorCodeChip code={ctx.operatorCode} />}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your public profile shown on the distributor directory.
        </p>
      </div>

      <ProfileForm
        initial={{
          business_name: operator?.business_name ?? null,
          region: operator?.region ?? null,
          province: operator?.province ?? null,
          city: operator?.city ?? null,
          contact_number: operator?.contact_number ?? null,
          facebook_url: operator?.facebook_url ?? null,
          is_listed: operator?.is_listed ?? false,
          latitude: operator?.latitude ?? null,
          longitude: operator?.longitude ?? null,
        }}
      />
    </div>
  );
}
