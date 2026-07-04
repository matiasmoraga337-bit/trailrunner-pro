"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Activity } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectControl } from "@/components/select-control";
import { SPORTS, type Sport, type WorkoutSession } from "@/lib/types";
import { listarTodas, deleteSesion } from "@/lib/db/sesiones";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/db";
import {
  formatDateCorta,
  formatDateLarga,
  formatDistancia,
  formatDesnivel,
  formatDuration,
  formatRitmo,
  formatVelocidad,
} from "@/lib/format";
import { toast } from "sonner";

const FUENTE_LABEL: Record<string, string> = {
  manual: "Manual",
  "importado-suunto": "Suunto",
};

export function EntrenamientosList() {
  // Cargamos con useLiveQuery para reaccionar a cambios en la DB
  const sesiones = useLiveQuery(() => db.sesiones.orderBy("fecha").reverse().toArray(), []);
  const [filtroDeporte, setFiltroDeporte] = useState<string>("todos");
  const [filtroDesde, setFiltroDesde] = useState<string>("");
  const [filtroHasta, setFiltroHasta] = useState<string>("");

  const filtradas = (sesiones ?? []).filter((s) => {
    if (filtroDeporte !== "todos" && s.sport !== filtroDeporte) return false;
    const f = (s.fechaInicio ?? s.fecha).slice(0, 10);
    if (filtroDesde && f < filtroDesde) return false;
    if (filtroHasta && f > filtroHasta) return false;
    return true;
  });

  const onBorrar = async (id: number) => {
    if (!confirm("¿Borrar este entrenamiento? No se puede deshacer.")) return;
    await deleteSesion(id);
    toast.success("Entrenamiento borrado");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase text-muted-foreground">Deporte</label>
            <SelectControl
              value={filtroDeporte}
              onChange={setFiltroDeporte}
              options={[
                { value: "todos", label: "Todos" },
                ...SPORTS.map((s) => ({ value: s.id, label: s.label })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase text-muted-foreground">Desde</label>
            <input
              type="date"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase text-muted-foreground">Hasta</label>
            <input
              type="date"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            />
          </div>
        </div>
        <Button render={<Link href="/entrenamientos/nuevo" />}>
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtradas.length === 0
          ? "Sin entrenamientos en este rango."
          : `${filtradas.length} entrenamiento(s)`}
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Activity className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Todavía no registraste entrenamientos.
          </p>
          <Button variant="secondary" render={<Link href="/entrenamientos/nuevo" />}>
            <Plus className="h-4 w-4" /> Registrar el primero
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtradas.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{s.titulo || deporteLabel(s.sport)}</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {deporteLabel(s.sport)}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {FUENTE_LABEL[s.fuente] ?? s.fuente}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateLarga(s.fechaInicio ?? s.fecha)} · {formatDateCorta(s.fechaInicio ?? s.fecha)}
                  </div>
                </div>
                <button
                  onClick={() => onBorrar(s.id!)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Borrar
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <Metrica label="Duración" valor={formatDuration(s.duracionSeg)} />
                {s.distanciaM > 0 && (
                  <Metrica label="Distancia" valor={formatDistancia(s.distanciaM)} />
                )}
                {s.desnivelPosM > 0 && s.sport !== "fuerza" && (
                  <Metrica label="Desnivel +" valor={formatDesnivel(s.desnivelPosM)} />
                )}
                {s.ritmoMedioSegKm && (
                  <Metrica label="Ritmo" valor={formatRitmo(s.ritmoMedioSegKm)} />
                )}
                {s.velocidadMediaMs && (s.sport === "cinta" || s.sport === "bici_estatica") && (
                  <Metrica label="Velocidad" valor={formatVelocidad(s.velocidadMediaMs)} />
                )}
                {s.potenciaMedia && (
                  <Metrica label="Potencia" valor={`${s.potenciaMedia} W`} />
                )}
                {s.fcMedia && (
                  <Metrica label="FC media" valor={`${s.fcMedia} lpm`} />
                )}
                {s.rpe && (
                  <Metrica label="RPE" valor={`${s.rpe}/10`} />
                )}
              </div>
              {s.notas && (
                <p className="mt-3 text-sm text-muted-foreground italic">&ldquo;{s.notas}&rdquo;</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function deporteLabel(s: Sport) {
  return SPORTS.find((x) => x.id === s)?.label ?? s;
}

function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}: </span>
      <span className="font-medium">{valor}</span>
    </div>
  );
}