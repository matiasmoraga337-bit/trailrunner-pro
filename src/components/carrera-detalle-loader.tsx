"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/db";
import { CarreraDetalle } from "@/components/carrera-detalle";
import { Activity } from "lucide-react";
import Link from "next/link";

export function CarreraDetalleLoader({ id }: { id: number }) {
  const carrera = useLiveQuery(() => db.carreras.get(id), [id]);

  if (!carrera) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Cargando carrera...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{carrera.nombre}</h1>
        {carrera.fecha && (
          <p className="mt-1 text-muted-foreground">{carrera.fecha}</p>
        )}
      </header>
      <CarreraDetalle carrera={carrera} />
    </main>
  );
}