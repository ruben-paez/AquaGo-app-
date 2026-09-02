import { getCompanySettings } from "@/lib/company-settings";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Términos y Condiciones · AquaGo" };

function H({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="mt-8 font-display text-lg font-bold text-water-800">
      {n}. {children}
    </h2>
  );
}

export default async function TerminosPage() {
  const co = await getCompanySettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Términos y Condiciones</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Última actualización: septiembre 2026 · {co.name}
        </p>

        <div className="prose-aqua mt-6 space-y-1 text-[15px] leading-relaxed text-ink">
          <H n="1">Objeto y aceptación</H>
          <p>
            Bienvenido/a a AquaGo. Al crear una cuenta, realizar un pedido o utilizar
            cualquiera de las funciones de la aplicación, usted acepta estos Términos y
            Condiciones y la <a className="font-semibold text-water-700 underline" href="/privacidad">Política de Privacidad</a>.
            Si no está de acuerdo, por favor no utilice la plataforma.
          </p>

          <H n="2">Qué es AquaGo</H>
          <p>
            AquaGo es una plataforma tecnológica que conecta a clientes con marcas de agua
            y productos afines para la compra de bidones de 20 litros y accesorios con
            entrega a domicilio en Encarnación y alrededores. <b>Los productos son vendidos
            por cada marca adherida</b>; {co.name} provee la aplicación, el sistema de
            despacho, la intermediación del pago y el soporte de la plataforma.
          </p>

          <H n="3">Registro y cuenta</H>
          <p>
            Para pedir debe registrarse con nombre, teléfono y correo válidos. Usted es
            responsable de la veracidad de sus datos y de custodiar su contraseña. Las
            cuentas son personales e intransferibles. La plataforma no está dirigida a
            menores de 14 años salvo con autorización y supervisión de su representante legal.
          </p>

          <H n="4">Pedidos, precios y pago</H>
          <p>
            Los precios de los productos son definidos por cada marca y se muestran antes
            de confirmar. El pago puede realizarse en <b>efectivo</b> al momento de la
            entrega (indicando con qué billete abona para preparar el vuelto) o por
            <b> transferencia bancaria</b> a los datos informados en la aplicación, pudiendo
            solicitarse el comprobante correspondiente. Un pedido se considera confirmado
            cuando la aplicación le asigna un código de seguimiento (formato AQG-XXXXX).
          </p>

          <H n="5">Entregas</H>
          <p>
            La cobertura y los tiempos de entrega son <b>estimados</b> ( habitualmente
            30 a 60 minutos dentro de la zona habilitada) y pueden verse afectados por
            factores ajenos a la plataforma: clima, tránsito, dirección de difícil acceso
            o fuerza mayor. La entrega se realiza en el punto indicado en el mapa al
            realizar el pedido; puede recibirla cualquier persona adulta presente en el
            domicilio.
          </p>

          <H n="6">Cancelaciones y reclamos</H>
          <p>
            Antes de confirmar el pago, el pedido puede cancelarse libremente desde la
            aplicación. Una vez confirmado, constituye compromiso de compra. Si recibe un
            producto en mal estado, incompleto o distinto al solicitado, puede reclamarlo
            desde el chat del pedido o a los contactos de soporte; la marca gestionará la
            reposición o el ajuste correspondiente.
          </p>

          <H n="7">Uso aceptable</H>
          <p>
            Queda prohibido: proporcionar datos falsos; realizar pedidos sin intención de
            recibirlos (pedidos falsos); abusar de los mecanismos de reclamo; revender los
            productos sin acuerdo previo con la marca; e intentar interferir, descifrar o
            vulnerar la plataforma. {co.name} puede suspender cuentas que incurran en estas
            conductas.
          </p>

          <H n="8">Marcas y vendedores</H>
          <p>
            Cada marca adherida es responsable exclusiva de su catálogo, precios, stock y
            de la calidad de sus productos. Los vendedores/repartidores registrados en la
            plataforma pertenecen a la estructura de cada marca, sin vínculo laboral con
            {co.name}.
          </p>

          <H n="9">Propiedad intelectual</H>
          <p>
            La marca, el logotipo, el diseño y el software de AquaGo pertenecen a {co.name}
            ("AquaGo Company"). Queda prohibida su reproducción total o parcial sin
            autorización escrita.
          </p>

          <H n="10">Limitación de responsabilidad</H>
          <p>
            {co.name} no será responsable por interrupciones atribuibles a servicios de
            terceros (conectividad, GPS del dispositivo, servicios bancarios), ni por el
            contenido de los catálogos publicados por las marcas. La responsabilidad de
            AquaGo se limita, en todo caso, al valor del servicio de la plataforma
            involucrado en el pedido reclamado.
          </p>

          <H n="11">Modificaciones</H>
          <p>
            Estos términos pueden actualizarse. La versión vigente se publica siempre en
            esta página, y los cambios sustanciales se comunicarán dentro de la aplicación.
          </p>

          <H n="12">Ley aplicable y jurisdicción</H>
          <p>
            Estos términos se rigen por las leyes de la República del Paraguay. Cualquier
            controversia se somete a los tribunales de la ciudad de Encarnación, sin
            perjuicio de las acciones ante la autoridad de defensa del consumidor
            (Decreto N° 9.486/12 y Ley N° 1.334/98).
          </p>

          <H n="13">Contacto</H>
          <p>
            {co.name} · Soporte: <a className="font-semibold text-water-700" href={`mailto:${co.email}`}>{co.email}</a>
            {co.phone && <> · Tel: {co.phone}</>}
          </p>
        </div>

        <p className="mt-10 text-xs text-ink-soft">
          Ver también: <a className="font-semibold text-water-700 underline" href="/privacidad">Política de Privacidad</a> ·{" "}
          <a className="font-semibold text-water-700 underline" href="/ayuda">Ayuda</a>
        </p>
      </main>
    </div>
  );
}
