import { NextResponse, type NextRequest } from "next/server";

const SESSION_HEADER = "x-aquago-session";
const SESSION_PARAM = "s";

/**
 * Puente de sesión para cuando la app corre embebida en un iframe.
 *
 * Dentro de un iframe de otro dominio, el navegador puede descartar la cookie
 * de sesión. Para que la demo igual funcione, el token viaja en la URL
 * (`?s=...`) y acá lo convertimos en una cabecera que el servidor sabe leer.
 *
 * En uso normal (pestaña propia) la cookie alcanza y esto nunca se activa.
 */
export function middleware(req: NextRequest) {
  const token = req.nextUrl.searchParams.get(SESSION_PARAM);
  if (!token) return NextResponse.next();

  const headers = new Headers(req.headers);
  headers.set(SESSION_HEADER, token);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
