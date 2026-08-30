"use client";

export const SESSION_HEADER = "x-aquago-session";
export const SESSION_PARAM = "s";
const STORAGE_KEY = "aquago_token";

/**
 * Copia en memoria del token.
 *
 * Es la fuente más confiable: dentro de un iframe particionado el navegador
 * puede bloquear tanto las cookies como el sessionStorage, y en ese caso la
 * memoria del módulo es lo único que sobrevive mientras la pestaña está viva.
 */
let memoryToken: string | null = null;

/** ¿Estamos corriendo dentro de un iframe? */
export function isFramed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Token inyectado por el servidor en el HTML. Es la fuente más confiable:
 * si el servidor renderizó la página con sesión, acá está ese mismo token,
 * sin depender de cookies, de la URL ni del sessionStorage.
 */
function readMetaToken(): string | null {
  try {
    const el = document.querySelector('meta[name="aquago-session"]');
    return el?.getAttribute("content") || null;
  } catch {
    return null;
  }
}

function readUrlToken(): string | null {
  try {
    return new URL(window.location.href).searchParams.get(SESSION_PARAM);
  } catch {
    return null;
  }
}

function readStorageToken(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Busca el token, en orden de confiabilidad:
 * meta del servidor → memoria → URL → sessionStorage.
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  const fromMeta = readMetaToken();
  if (fromMeta) {
    if (fromMeta !== memoryToken) setStoredToken(fromMeta);
    return fromMeta;
  }

  if (memoryToken) return memoryToken;

  const fromUrl = readUrlToken();
  if (fromUrl) {
    setStoredToken(fromUrl);
    return fromUrl;
  }

  const fromStorage = readStorageToken();
  if (fromStorage) {
    memoryToken = fromStorage;
    return fromStorage;
  }
  return null;
}

export function setStoredToken(token: string) {
  memoryToken = token;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Bloqueado: nos alcanza con la memoria y con el token en la URL.
  }
}

export function clearStoredToken() {
  memoryToken = null;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada que hacer
  }
}

/** Agrega `?s=token` a una URL del mismo origen. */
export function withSession(url: string, token: string | null): string {
  if (!token) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (u.origin !== window.location.origin) return url;
    u.searchParams.set(SESSION_PARAM, token);
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}

/** Cabeceras con la sesión, para usar en cualquier fetch propio. */
export function sessionHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  const token = getStoredToken();
  if (token) h.set(SESSION_HEADER, token);
  return h;
}

/** ¿La cookie de sesión llega al servidor? */
export async function cookiesWork(): Promise<boolean> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Navegación completa que preserva la sesión.
 *
 * Siempre arrastra el token en la URL cuando lo tenemos. Antes esto dependía
 * de comprobar si la cookie funcionaba, pero esa prueba puede dar verdadera
 * para un fetch y falsa para la navegación de nivel superior dentro de un
 * iframe: ahí se perdía la sesión al cambiar de página.
 */
export async function gotoWithSession(path: string, token?: string | null) {
  if (token) setStoredToken(token);
  const t = token ?? getStoredToken();
  window.location.assign(withSession(path, t ?? null));
}

const ROLE_KEY = "aquago_role";
let memoryRole: string | null = null;

/** Recuerda con qué rol de demo se entró, para poder reconectar solo. */
export function setDemoRole(role: string) {
  memoryRole = role;
  try {
    window.sessionStorage.setItem(ROLE_KEY, role);
  } catch {
    // memoria alcanza
  }
}

export function getDemoRole(): string | null {
  if (memoryRole) return memoryRole;
  try {
    return window.sessionStorage.getItem(ROLE_KEY);
  } catch {
    return null;
  }
}

/**
 * Reabre la sesión de demo y devuelve el token nuevo.
 *
 * Se usa cuando una acción devuelve 401: en vez de dejar al usuario trabado
 * con "iniciá sesión", la app se reconecta sola y reintenta.
 */
export async function reconnectDemo(role?: string): Promise<string | null> {
  const r = role ?? getDemoRole() ?? "cliente";
  try {
    const res = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: r }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.token) {
      setStoredToken(d.token);
      setDemoRole(r);
      return d.token as string;
    }
  } catch {
    // sin conexión
  }
  return null;
}
