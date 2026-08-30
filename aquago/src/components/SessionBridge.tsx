"use client";

import { useEffect } from "react";
import {
  SESSION_HEADER,
  SESSION_PARAM,
  getStoredToken,
} from "@/lib/session-client";

/**
 * Mantiene viva la sesión cuando el navegador bloquea las cookies (típico
 * dentro de un iframe particionado).
 *
 * Importante: el parche se instala SIEMPRE y el token se lee en cada llamada,
 * no una sola vez al montar. Antes se leía al montar y, si en ese momento no
 * había token (porque el usuario todavía no había entrado, o porque el
 * sessionStorage estaba bloqueado), el parche nunca se instalaba y los pedidos
 * salían sin sesión: el servidor respondía "Debes iniciar sesión para pedir".
 */
export default function SessionBridge() {
  useEffect(() => {
    /* 1. fetch con cabecera de sesión */
    const originalFetch = window.fetch;

    window.fetch = function patchedFetch(input, init) {
      const token = getStoredToken();
      if (!token) return originalFetch(input, init);
      try {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const abs = new URL(url, window.location.origin);
        if (abs.origin === window.location.origin) {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined)
          );
          headers.set(SESSION_HEADER, token);
          return originalFetch(input, { ...init, headers });
        }
      } catch {
        // Ante cualquier duda, mandamos el fetch tal cual.
      }
      return originalFetch(input, init);
    };

    /* 2. enlaces internos con ?s= */
    const onClick = (e: MouseEvent) => {
      const token = getStoredToken();
      if (!token) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      try {
        const u = new URL(href, window.location.origin);
        if (u.origin !== window.location.origin) return;
        if (u.searchParams.get(SESSION_PARAM) === token) return;
        u.searchParams.set(SESSION_PARAM, token);
        anchor.setAttribute("href", u.pathname + u.search + u.hash);
      } catch {
        // href raro: lo dejamos como está
      }
    };
    document.addEventListener("click", onClick, true);

    /* 3. mantener ?s= en la barra de direcciones */
    const keepParam = (url: string | URL | null | undefined) => {
      const token = getStoredToken();
      if (url == null || !token) return url;
      try {
        const u = new URL(url.toString(), window.location.href);
        if (u.origin !== window.location.origin) return url;
        u.searchParams.set(SESSION_PARAM, token);
        return u.pathname + u.search + u.hash;
      } catch {
        return url;
      }
    };

    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (data, unused, url) {
      return origPush.call(this, data, unused, keepParam(url) as string);
    };
    history.replaceState = function (data, unused, url) {
      return origReplace.call(this, data, unused, keepParam(url) as string);
    };

    const token = getStoredToken();
    if (token) {
      const current = new URL(window.location.href);
      if (current.searchParams.get(SESSION_PARAM) !== token) {
        current.searchParams.set(SESSION_PARAM, token);
        origReplace.call(
          history,
          history.state,
          "",
          current.pathname + current.search + current.hash
        );
      }
    }

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", onClick, true);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return null;
}
