import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/roles";

export default async function Home() {
  const ctx = await getUserContext();

  if (!ctx || !ctx.role) {
    redirect("/login");
  }

  if (ctx.role === "admin") {
    redirect("/dashboard");
  }

  redirect("/licenses");
}
