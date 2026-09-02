import { getCompanySettings } from "@/lib/company-settings";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ayuda · AquaGo" };

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Cómo hago un pedido?",
    a: <>Tocá «Pedir ahora», elegí tu marca, sumá los bidones al carrito, marcá tu punto de entrega en el mapa y confirmá el pago. Recibís un código de seguimiento al instante.</>,
  },
  {
    q: "¿Qué zonas cubren y cuánto demora?",
    a: <>Cubrimos Encarnación y alrededores. El tiempo habitual es de 30 a 60 minutos, y podés seguir al vendedor en el mapa en vivo mientras viene.</>,
  },
  {
    q: "¿Cómo puedo pagar?",
    a: <>En <b>efectivo</b> al recibir (podés indicar con qué billete pagás para el vuelto) o por <b>transferencia bancaria</b>: los datos de la cuenta aparecen al momento de pagar, y podés adjuntar el comprobante para confirmar más rápido.</>,
  },
  {
    q: "¿Puedo cancelar un pedido?",
    a: <>Antes de confirmarlo, sí: con el botón «Cancelar pedido». Después de confirmado se convierte en compromiso de compra; si algo salió mal, escribinos y lo resolvemos.</>,
  },
  {
    q: "¿Dónde está mi pedido?",
    a: <>En «Mis pedidos» ves el estado en tiempo real: recibido, aceptada, en camino (con mapa del vendedor) y entregada.</>,
  },
  {
    q: "¿Cómo hablo con el vendedor?",
    a: <>Dentro de tu pedido activo tenés el botón «Conversar con el vendedor». Le llegan tus mensajes al instante.</>,
  },
  {
    q: "¿El bidón es mío?",
    a: <>Dependiendo del producto: la «recarga» es para tu bidón de 20 L ya existente (el vendedor lo cambia vacío por lleno); el «bidón completo» incluye el envase nuevo.</>,
  },
  {
    q: "¿Cómo activo los avisos de mi pedido?",
    a: <>Tocá la campanita 🔔 «Activar avisos» en la app. En iPhone, primero agregá AquaGo a tu pantalla de inicio (Compartir → Agregar) y después activá los avisos.</>,
  },
  {
    q: "Olvidé mi contraseña, ¿qué hago?",
    a: <>Escribinos al soporte de abajo y te ayudamos a recuperar tu cuenta en minutos.</>,
  },
  {
    q: "¿Tengo que instalar una app?",
    a: <>No hace falta: funciona directo en el navegador. Si querés, agregala a tu pantalla de inicio para abrirla como una app. Muy pronto también habrá app nativa con notificaciones mejoradas.</>,
  },
  {
    q: "Tengo una aguatería, ¿cómo sumo mi marca?",
    a: <>¡Bienvenido/a! Escribinos al soporte: te creamos la cuenta de marca, cargás tu catálogo y tus vendedores, y empezás a recibir pedidos el mismo día.</>,
  },
];

export default async function AyudaPage() {
  const co = await getCompanySettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Ayuda</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Las respuestas más frecuentes. Si te queda alguna duda, escribinos:{" "}
          <a className="font-semibold text-water-700" href={`mailto:${co.email}`}>{co.email}</a>
          {co.phone && <> · {co.phone}</>}
        </p>

        <div className="mt-6 space-y-3">
          {FAQ.map((f, i) => (
            <details key={i} className="group rounded-2xl border border-ink/10 bg-white p-4 shadow-card">
              <summary className="cursor-pointer list-none font-display text-[15px] font-bold text-ink marker:hidden">
                <span className="mr-2 text-water-600 group-open:hidden">＋</span>
                <span className="mr-2 hidden text-water-600 group-open:inline">－</span>
                {f.q}
              </summary>
              <p className="mt-2 pl-6 text-sm leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-xs text-ink-soft">
          Ver también: <a className="font-semibold text-water-700 underline" href="/terminos">Términos y Condiciones</a> ·{" "}
          <a className="font-semibold text-water-700 underline" href="/privacidad">Política de Privacidad</a>
        </p>
      </main>
    </div>
  );
}
