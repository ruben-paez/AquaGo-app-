import { redirect } from "next/navigation";
import { getSessionToken, getSessionUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/queries";
import type { OrderView } from "@/lib/queries";
import Nav from "@/components/Nav";
import OrdersTracker from "./OrdersTracker";

// Nunca servir una copia cacheada: el token de sesión viaja en el HTML y una
// versión vieja traería un token muerto (de ahí el "Debes iniciar sesión").
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = { title: "Mis pedidos · AquaGo" };

export default async function MisPedidosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sessionToken = await getSessionToken();

  let orders: OrderView[] = [];
  try {
    orders = await getOrdersForUser(user.id);
  } catch {
    orders = [];
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <OrdersTracker initial={orders} sessionToken={sessionToken} />
      </main>
    </div>
  );
}
