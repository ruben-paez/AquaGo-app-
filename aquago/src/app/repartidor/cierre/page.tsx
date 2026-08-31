import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import DailyCloseView from "./DailyCloseView";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = { title: "Cierre del día · AquaGo" };

export default async function CierrePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "repartidor") {
    redirect("/repartidor");
  }
  return <DailyCloseView />;
}
