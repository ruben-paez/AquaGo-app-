import { getCompanySettings } from "@/lib/company-settings";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Política de Privacidad · AquaGo" };

function H({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="mt-8 font-display text-lg font-bold text-water-800">
      {n}. {children}
    </h2>
  );
}

export default async function PrivacidadPage() {
  const co = await getCompanySettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Última actualización: septiembre 2026 · {co.name}
        </p>

        <div className="prose-aqua mt-6 space-y-1 text-[15px] leading-relaxed text-ink">
          <H n="1">Responsable del tratamiento</H>
          <p>
            {co.name} ("AquaGo Company"), con domicilio de contacto en{" "}
            <a className="font-semibold text-water-700" href={`mailto:${co.email}`}>{co.email}</a>
            {co.phone && <> y teléfono {co.phone}</>}, es responsable del tratamiento de los
            datos personales recolectados a través de la aplicación, conforme a la Ley
            N° 6534/2020 de Protección de Datos Personales de la República del Paraguay.
          </p>

          <H n="2">Datos que recolectamos</H>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Datos de cuenta:</b> nombre, teléfono, correo electrónico y contraseña (almacenada únicamente como cifrado irreversible).</li>
            <li><b>Datos de entrega:</b> dirección descrita y punto geográfico (coordenadas) que usted marca en el mapa.</li>
            <li><b>Datos de pedidos:</b> historial de compras, montos, forma de pago y notas que usted escriba.</li>
            <li><b>Comprobantes:</b> imágenes o documentos de transferencia que usted adjunte voluntariamente.</li>
            <li><b>Ubicación en tiempo real:</b> únicamente para vendedores, mientras su jornada esté activa (siempre voluntaria, se puede apagar).</li>
            <li><b>Notificaciones:</b> registro del dispositivo, solo si usted activa los avisos.</li>
          </ul>

          <H n="3">Para qué usamos sus datos</H>
          <p>
            Procesar y entregar sus pedidos; permitir el chat con el vendedor asignado;
            enviar notificaciones del estado del pedido y recordatorios de recarga (solo
            con su permiso); dar soporte; prevenir fraudes; y generar estadísticas
            agregadas y anónimas para mejorar el servicio. No enviamos publicidad de
            terceros.
          </p>

          <H n="4">Con quién compartimos sus datos</H>
          <p>
            Únicamente con: <b>la marca del pedido y su vendedor asignado</b>, quienes
            reciben nombre, dirección, teléfono y punto de entrega con la exclusiva finalidad
            de realizar la entrega; y con proveedores técnicos imprescindibles para operar
            (hosting y base de datos), que procesan los datos por cuenta de {co.name}.
            <b> No vendemos, alquilamos ni cedemos sus datos personales a terceros</b> con
            fines publicitarios.
          </p>

          <H n="5">Ubicación</H>
          <p>
            La ubicación del <b>cliente</b> se usa solo para fijar el punto de entrega
            (no se rastrea en tiempo real). La ubicación del <b>vendedor</b> se comparte
            mientras dura su jornada de reparto para que la marca y los clientes puedan
            seguir la entrega, y cesa al terminar la jornada o al pausar el GPS.
          </p>

          <H n="6">Notificaciones push</H>
          <p>
            Se activan únicamente con su consentimiento (botón de campana) y puede
            desactivarlas en cualquier momento desde su navegador o sistema operativo.
          </p>

          <H n="7">Plazo de conservación</H>
          <p>
            Los datos de cuenta se conservan mientras exista la cuenta. Los pedidos y
            comprobantes se conservan por el plazo aplicable a fines contables y de
            garantía. Luego, los datos se eliminan o anonimizan de forma segura.
          </p>

          <H n="8">Sus derechos</H>
          <p>
            Puede solicitar en todo momento el acceso, la rectificación o la eliminación
            de sus datos, y cerrar su cuenta, escribiendo a{" "}
            <a className="font-semibold text-water-700" href={`mailto:${co.email}`}>{co.email}</a>. Responderemos en
            un plazo razonable conforme a la ley.
          </p>

          <H n="9">Seguridad</H>
          <p>
            Aplicamos medidas técnicas y organizativas razonables: contraseñas cifradas
            (nunca almacenadas en texto plano), conexión cifrada (HTTPS), sesiones
            controladas por tokens con expiración y acceso a los datos limitado por roles.
            Ningún sistema es infalible; si detectamos un incidente que le afecte, se lo
            notificaremos.
          </p>

          <H n="10">Menores</H>
          <p>
            La plataforma no está dirigida a menores de 14 años. Si detectamos una cuenta
            de un menor sin representación, la eliminaremos.
          </p>

          <H n="11">Cambios en esta política</H>
          <p>
            Publicamos siempre la versión vigente en esta página, con su fecha de
            actualización. Los cambios sustanciales se avisan dentro de la aplicación.
          </p>

          <H n="12">Contacto</H>
          <p>
            {co.name} · <a className="font-semibold text-water-700" href={`mailto:${co.email}`}>{co.email}</a>
            {co.phone && <> · {co.phone}</>}
          </p>
        </div>

        <p className="mt-10 text-xs text-ink-soft">
          Ver también: <a className="font-semibold text-water-700 underline" href="/terminos">Términos y Condiciones</a> ·{" "}
          <a className="font-semibold text-water-700 underline" href="/ayuda">Ayuda</a>
        </p>
      </main>
    </div>
  );
}
