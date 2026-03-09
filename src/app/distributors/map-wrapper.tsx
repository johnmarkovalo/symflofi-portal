"use client";

import dynamic from "next/dynamic";

const DistributorMap = dynamic(() => import("./distributor-map"), { ssr: false });

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
};

export default function MapWrapper({ distributors }: { distributors: Distributor[] }) {
  return <DistributorMap distributors={distributors} />;
}
