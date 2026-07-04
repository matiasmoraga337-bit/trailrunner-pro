"use client";

import { useEffect, useState } from "react";

/** Detecta si IndexedDB esta disponible y muestra un aviso si no. */
export function IndexedDBCheck({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    try {
      const req = window.indexedDB.open("__test__", 1);
      req.onsuccess = () => {
        req.result.close();
        window.indexedDB.deleteDatabase("__test__");
        setOk(true);
      };
      req.onerror = () => setOk(false);
      req.onblocked = () => setOk(false);
    } catch {
      setOk(false);
    }
  }, []);

  if (!ok) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center">
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-8">
          <h2 className="text-lg font-bold text-destructive">
            IndexedDB no esta disponible
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            TrailRunner Pro necesita IndexedDB para guardar tus entrenamientos
            localmente. Esto puede pasar si estas en modo incognito/privado, o
            si tu navegador bloquea el almacenamiento local.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>• Probá abrir la app en una ventana normal (no incognito).</li>
            <li>
              • En Firefox, verificá que{" "}
              <code className="rounded bg-muted px-1">dom.indexedDB.enabled</code> este
              en <code className="rounded bg-muted px-1">true</code> en{" "}
              <code className="rounded bg-muted px-1">about:config</code>.
            </li>
            <li>
              • En Safari, asegurate de que "Prevenir seguimiento entre sitios"
              este desactivado.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}