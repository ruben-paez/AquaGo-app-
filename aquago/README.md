# AquaGo · reparto de agua en Encarnación

Marketplace de aguaterías tipo PedidosYa, especializado en bidones de 20 L.
Primera marca: **AQUAnat — Puramente Encarnacena**.

- App del cliente: registro con dirección en el mapa, pedido, pago en efectivo o
  transferencia, seguimiento del reparto.
- Panel del local: pedidos en vivo, catálogo, comisiones y liquidaciones.
- Modelo de negocio: **10 % de costo de servicio que paga el cliente**. A la
  aguatería no se le cobra comisión ni abono: cobra su precio de lista completo.
- **Motor de reparto**: asigna cada pedido al repartidor óptimo combinando
  distancia real, carga actual y equidad entre el equipo.
- **Comprobantes**: el cliente adjunta la foto de la transferencia en el mismo
  checkout (o después desde *Mis pedidos*) y el local la verifica en un clic.
- **Cobranza automática**: la liquidación vencida suspende la marca sola a los
  5 días de mora, y se reactiva al registrar el pago.
- **Precios en múltiplos de 500 Gs**: nadie redondea a mano en la puerta.
- Analítica: frecuencia de consumo, zonas calientes, clientes en riesgo.

Precios en guaraníes. Recarga 20 L = 12.000 Gs · Bidón completo = 50.000 Gs.

---

## 1. Probarlo en tu computadora

Necesitás **Node.js 20+** y **PostgreSQL**.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar la base
cp .env.example .env
#    editá .env y poné tu cadena de conexión

# 3. Crear las tablas
npx drizzle-kit push

# 4. Cargar catálogo, marcas y 90 días de pedidos de ejemplo
npx tsx scripts/seed.ts

# 5. Levantar
npm run dev
```

Abrí <http://localhost:3000>.

### ¿No tenés PostgreSQL instalado?

Con Docker, en una línea:

```bash
docker run --name aquago-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aquago -p 5432:5432 -d postgres:16
```

Y en `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/aquago
```

---

## 2. Cuentas de prueba

| Rol | Email | Contraseña | Qué ve |
|---|---|---|---|
| Cliente | `cliente@demo.com.py` | `cliente123` | Pedir y seguir la entrega |
| Plataforma | `admin@aquago.com.py` | `admin123` | Comisiones, liquidaciones, datos |
| Marca AQUAnat | `marca@aquanat.com.py` | `marca123` | Pedidos y catálogo del local |

En `/login` están los tres como botones de acceso directo, y arriba de todo hay
una **barra de demo** para cambiar de rol con un clic.

### Sesión dentro de un iframe

Si la app corre embebida (por ejemplo en una vista previa), el navegador puede
descartar la cookie de sesión por las políticas de cookies de terceros. Para que
la demo funcione igual, hay tres capas:

1. La cookie se emite con `SameSite=None; Secure; Partitioned` (CHIPS), que es
   lo que Chrome acepta dentro de un iframe.
2. Si aun así se pierde, el token viaja en la URL (`?s=...`) y `middleware.ts`
   lo convierte en la cabecera `x-aquago-session` que lee el servidor.
3. `SessionBridge` mantiene ese token en los enlaces internos y en los `fetch`,
   para que la sesión sobreviva a la navegación y a las recargas.

En una pestaña normal nada de esto se activa: alcanza con la cookie.

---

## 3. Instalarla en el celular (sin Play Store)

> **Requisito para las dos vías:** la app tiene que estar publicada en una URL
> pública. Es el paso 4 y toma unos 10 minutos. Desde el sandbox de desarrollo
> no se puede instalar nada.

### Vía A — PWA: sin APK, en 20 segundos ⭐ recomendada

La app ya tiene manifiesto e íconos, así que **se instala desde el navegador**:

- **Android / Chrome:** abrí la URL → menú **⋮** → *Instalar aplicación*
  (a veces aparece como *Agregar a pantalla principal*).
- **iPhone / Safari:** abrí la URL → botón **Compartir** → *Agregar a inicio*.

Queda con el ícono de AquaGo en el escritorio, se abre a pantalla completa y sin
barra de direcciones. Para el usuario final es igual que una app descargada.

Ventaja grande sobre el APK: cuando actualizás la web, **el celular ya tiene la
versión nueva** sin reinstalar nada.

### Vía B — APK de Android (archivo instalable)

Si necesitás sí o sí el `.apk` (por ejemplo para mandarlo por WhatsApp), el
proyecto trae todo listo para generarlo **en la nube, gratis**, sin instalar
Android Studio:

1. Subí el proyecto a un repositorio de GitHub.
2. Entrá a la pestaña **Actions** del repo.
3. Elegí **"Generar APK de AquaGo"** → botón **Run workflow**.
4. Escribí la URL de tu app publicada y confirmá.
5. A los ~5 minutos, descargá **AquaGo-APK** desde *Artifacts*.

Para instalarlo en el teléfono hay que permitir *"Instalar apps de orígenes
desconocidos"* en Ajustes. Es un APK de depuración: sirve perfecto para probar
con tu equipo y clientes, pero **no se puede subir a Play Store** sin firmarlo
con una clave de producción.

El archivo `capacitor.config.ts` define cómo se arma la app nativa. El APK es un
contenedor que abre tu web: por eso al actualizar el sitio, la app se actualiza
sola.

### Vía C — Las tiendas, cuando el negocio lo justifique

| Plataforma | Canal | Costo | Alcance |
|---|---|---|---|
| Android | Prueba interna de Play Console | US$ 25 único | 100 testers, listo en horas |
| iOS | TestFlight | US$ 99/año | 10.000 testers |

**Mi recomendación:** empezá por la PWA. Instalala en el celular del dueño de
AQUAnat y en el de dos o tres clientes fieles. Si en dos semanas ves pedidos
reales entrando, ahí recién gastás en las tiendas.

## 4. Publicarlo en internet (gratis)

ómo probar el flujo completo

1. **Entrá como cliente** → *Pedir ahora*.
2. Elegí **AQUAnat** → sumá 1 recarga → tocá el mapa para marcar tu casa.
3. Pagá en **efectivo con 50.000** y mirá el vuelto calculado.
4. Confirmá y andá a **Mis pedidos**: ahí está el seguimiento.
5. Cerrá sesión y entrá como **plataforma**:
   - *Pedidos*: pasá el pedido a "en camino" y asignale repartidor.
   - *Comisiones*: mirá el asiento generado y probá **Correr liquidación**.
   - *Datos*: frecuencia de consumo, zonas, clientes que se enfrían.
6. Volvé como cliente y vas a ver el estado actualizado.

La página **/negocio** explica el modelo de comisiones con un simulador.

### Probar el reparto automático

En el panel, pestaña **Reparto**:

- Elegí el modo (*cercanía*, *equilibrado* o *equitativo*) y mirá cómo cambia a
  quién le toca cada pedido.
- Apagá **"Asignar automáticamente"** y hacé un par de pedidos: quedan en la cola.
- Tocá **"Ver cálculo"** en un pedido para ver el puntaje de cada repartidor y
  entender por qué gana uno.
- **"Despachar los N"** asigna toda la cola de una, recalculando la carga en
  cada paso.

### Probar el comprobante de transferencia

1. Como cliente, pedí algo eligiendo **Transferencia**.
2. En *Mis pedidos* aparece el bloque **Comprobante**: subí cualquier foto.
3. Entrá como plataforma → pestaña *Pedidos* → el pedido muestra
   **"comprobante por revisar"**. Abrilo, mirá la imagen y tocá *Verificar pago*.
4. Si el monto declarado no coincide con el total, la app lo marca en rojo.

### Probar la suspensión por mora

```bash
# 1. Emitir la liquidación desde el panel (pestaña Comisiones)
# 2. Simular que venció hace una semana:
psql "$DATABASE_URL" -c "UPDATE settlements SET due_date = now() - interval '7 days' WHERE status <> 'pagada'"
# 3. Recargar la pestaña Comisiones: la marca queda SUSPENDIDA
#    y desaparece de /pedir. Al registrar el pago se reactiva sola.
```

Escalada: vencimiento → `por_vencer` (aviso) → 5 días de mora → `suspendida`
(no recibe pedidos) → pago registrado → `al_dia`.

Cómo decide el motor (`src/lib/dispatch.ts`):

```
puntaje = distancia_km          × peso_distancia
        + pedidos_activos × 1,5 × peso_carga
        + entregas_hoy_norm × 3 × peso_equidad
```

Gana el puntaje más bajo. Quedan afuera los que están fuera de turno, inactivos
o con la capacidad llena. El **índice de equidad** (Jain) muestra qué tan parejo
quedó el reparto: 100 % es perfecto.

---

## 5. Estructura

```
src/
  app/
    page.tsx            portada
    negocio/            modelo de negocio + simulador
    pedir/              flujo de pedido (marca → productos → mapa → pago)
    mis-pedidos/        seguimiento del cliente
    admin/              panel: pedidos, catálogo, comisiones, datos
    api/                endpoints REST
  components/           mapa, marca, iconos
  db/schema.ts          tablas (Drizzle)
  lib/
    pricing.ts          comisiones, planes, proyecciones
    settle.ts           liquidaciones automáticas
    analytics.ts        consultas de inteligencia de negocio
    zones.ts            barrios de Encarnación
scripts/seed.ts         datos de ejemplo
```

---

## 6. Antes de usarlo en producción

Esto es un prototipo funcional. Para operar de verdad, faltaría:

- **Cobros reales**: integrar Bancard / Tigo Money / Pago Móvil en vez de
  confirmar la transferencia a mano.
- **Notificaciones**: WhatsApp o SMS al cambiar el estado del pedido.
- **GPS del repartidor**: hoy el seguimiento es por estados, no en tiempo real.
- **Contrato de alta**: dejar por escrito que los datos de clientes son de la
  plataforma, y el consentimiento para avisos de recompra.
- **Backups** de la base y política de retención de datos personales.
