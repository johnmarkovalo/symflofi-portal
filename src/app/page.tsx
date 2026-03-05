import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/roles";

export default async function Home() {
  const ctx = await getUserContext();

  if (!ctx) {
    redirect("/login");
  }

  // Always go to dashboard — the layout handles access denied for null roles
  if (ctx.role === "operator") {
    redirect("/licenses");
  }

  redirect("/dashboard");
}
