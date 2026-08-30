"use client";

import { clearStoredToken } from "@/lib/session-client";


export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        clearStoredToken();
        window.location.assign("/");
      }}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-danger-soft hover:text-danger"
    >
      Salir
    </button>
  );
}
