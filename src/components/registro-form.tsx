"use client";

import { useState, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectControl } from "@/components/select-control";
import { SPORTS, type Sport, type SessionType } from "@/lib/types";
import { saveSesion } from "@/lib/db/sesiones";
import { calcularSesionCinta, type BloqueCinta } from "@/lib/calculations/treadmill";
import { formatDistancia, formatDesnivel, formatDuration, formatRitmo, formatVelocidad } from "@/lib/format";

const TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "larga", label: "Larga" },
  { value: "regenerativa", label: "Regenerativa" },
  { value: "intervalos", label: "Intervalos" },
  { value: "tempo", label: "Tempo" },
  { value: "fuerza", label: "Fuerza" },
  { value: "competencia", label: "Competencia" },
  { value: "otra", label: "Otra" },
];

interface FormState {
  fecha: string;
  deporte: Sport;
  tipo: SessionType;
  titulo: string;
  duracionMin: number;
  rpe: number;
  notas: string;
  // Trail/running
  distanciaKm?: number;
  desnivelPosM?: number;
  desnivelNegM?: number;
  fcMedia?: number;
  fcMax?: number;
  ritmoSegKm?: number;
  // Bici estática
  potenciaMedia?: number;
  cadencia?: number;
  // Fuerza
  ejerciciosRaw?: string; // textarea (1 por línea: "Sentadilla;4x8;60")
  // Cinta: bloques
  bloques?: BloqueCintaForm[];
}

interface BloqueCintaForm {
  tiempoMin: number;
  velocidadKmh?: number;
  ritmoSegKm?: number;
  inclinacionPct: number; // ej: 1.5 = 1.5%
}

// Convierte ritmo (s/km) ↔ velocidad (km/h). V = 3600 / ritmo
const ritmoToVel = (r?: number) =>
  r && r > 0 ? 3600 / r : undefined;
const velToRitmo = (v?: number) =>
  v && v > 0 ? 3600 / v : undefined;
// Inclinación del form (1.5) → fracción (0.015) para el cálculo
const pctToFraccion = (p: number) => p / 100;

const hoy = () => new Date().toISOString().slice(0, 10);

export function RegistroForm() {
  const router = useRouter();
  const form = useForm<FormState>({
    defaultValues: {
      fecha: hoy(),
      deporte: "trail",
      tipo: "otra",
      titulo: "",
      duracionMin: 60,
      rpe: 5,
      notas: "",
    },
  });
  const deporte = form.watch("deporte");
  const bloques = form.watch("bloques");
  const [usarRitmo, setUsarRitmo] = useState(false);

  // Cálculo en vivo de la sesión de cinta
  const resCinta = useMemo(() => {
    if (deporte !== "cinta" || !bloques?.length) return null;
    const bloquesCalc: BloqueCinta[] = bloques.map((b) => {
      const velocidadMs =
        usarRitmo && b.ritmoSegKm
          ? (1000 / b.ritmoSegKm)
          : b.velocidadKmh
          ? (b.velocidadKmh / 3.6)
          : 0;
      return {
        tiempoSeg: (b.tiempoMin || 0) * 60,
        velocidadMs,
        inclinacionPct: pctToFraccion(b.inclinacionPct || 0),
      };
    });
    return calcularSesionCinta(bloquesCalc);
  }, [deporte, bloques, usarRitmo]);

  // Auto-rellenar duración/distribución/desnivel en cinta
  const aplicarResCinta = () => {
    if (!resCinta) return;
    form.setValue("duracionMin", Math.round(resCinta.tiempoTotalSeg / 60));
    form.setValue("distanciaKm", +(resCinta.distanciaTotalM / 1000).toFixed(2));
    form.setValue("desnivelPosM", Math.round(resCinta.desnivelPosM));
    form.setValue("desnivelNegM", Math.round(resCinta.desnivelNegM));
    if (resCinta.velocidadMediaMs > 0) {
      form.setValue("ritmoSegKm", Math.round(1000 / resCinta.velocidadMediaMs));
    }
  };

  const onSubmit = async (v: FormState) => {
    const duracionSeg = (v.duracionMin || 0) * 60;
    const distanciaM =
      v.distanciaKm != null ? Math.round(v.distanciaKm * 1000) : 0;

    let desnivelPosM = v.desnivelPosM ?? 0;
    let desnivelNegM = v.desnivelNegM;
    let ritmoSegKm = v.ritmoSegKm;
    let velocidadMediaMs: number | undefined;
    const potenciaMedia = v.potenciaMedia;

    if (deporte === "cinta" && resCinta) {
      desnivelPosM = Math.round(resCinta.desnivelPosM);
      desnivelNegM = Math.round(resCinta.desnivelNegM);
      ritmoSegKm = resCinta.ritmoMedioSegKm > 0 ? Math.round(resCinta.ritmoMedioSegKm) : undefined;
      velocidadMediaMs = resCinta.velocidadMediaMs;
    }
    if (ritmoSegKm && !velocidadMediaMs) {
      velocidadMediaMs = 1000 / ritmoSegKm;
    }

    let datosLaps;
    if (deporte === "cinta" && v.bloques) {
      datosLaps = v.bloques.map((b, i) => ({
        index: i,
        tiempoSeg: (b.tiempoMin || 0) * 60,
        distanciaM:
          usarRitmo && b.ritmoSegKm
            ? (1000 / b.ritmoSegKm) * (b.tiempoMin || 0) * 60
            : (b.velocidadKmh || 0) / 3.6 * (b.tiempoMin || 0) * 60,
        desnivelPosM:
          (b.inclinacionPct || 0) > 0
            ? Math.round(((usarRitmo && b.ritmoSegKm
                ? 1000 / b.ritmoSegKm
                : (b.velocidadKmh || 0) / 3.6) *
              (b.tiempoMin || 0) * 60 *
              Math.sin(Math.atan(pctToFraccion(b.inclinacionPct || 0)))))
            : 0,
        inclinacionPct: b.inclinacionPct,
        velocidadMs: usarRitmo && b.ritmoSegKm ? 1000 / b.ritmoSegKm : (b.velocidadKmh || 0) / 3.6,
      }));
    }

    let traza;
    // Solo para trail/running al aire libre, traza no la pedimos en este form (ver Importar)

    await saveSesion({
      fecha: v.fecha,
      fechaInicio: v.fecha + "T00:00:00",
      sport: v.deporte,
      tipo: v.tipo,
      titulo: v.titulo || labelDeporte(v.deporte),
      duracionSeg,
      distanciaM,
      desnivelPosM,
      desnivelNegM,
      fcMedia: v.fcMedia,
      fcMax: v.fcMax,
      ritmoMedioSegKm: ritmoSegKm,
      velocidadMediaMs,
      potenciaMedia,
      calorias: undefined,
      rpe: v.rpe,
      notas: v.notas,
      fuente: "manual",
      datosLaps,
      traza,
    } as Parameters<typeof saveSesion>[0]);

    toast.success("Entrenamiento guardado", {
      description: `${labelDeporte(v.deporte)} · ${formatDuration(duracionSeg)}`,
    });
    router.push("/entrenamientos");
  };

  const agregarBloque = () => {
    const act = form.getValues("bloques") ?? [];
    form.setValue("bloques", [
      ...act,
      { tiempoMin: 10, velocidadKmh: 10, inclinacionPct: 0 },
    ]);
  };
  const quitarBloque = (i: number) => {
    const act = form.getValues("bloques") ?? [];
    form.setValue("bloques", act.filter((_, idx) => idx !== i));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* ----- Campos comunes ----- */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input type="date" {...form.register("fecha")} />
        </div>
        <div className="space-y-1.5">
          <Label>Deporte</Label>
          <Controller
            control={form.control}
            name="deporte"
            render={({ field }) => (
              <SelectControl
                value={field.value}
                onChange={field.onChange}
                options={SPORTS.map((s) => ({ value: s.id, label: s.label }))}
                className="w-full"
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de sesión</Label>
          <Controller
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <SelectControl
                value={field.value}
                onChange={field.onChange}
                options={TYPE_OPTIONS}
                className="w-full"
              />
            )}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input {...form.register("titulo")} placeholder="Ej: Tirada larga en sierra" />
        </div>
        <div className="space-y-1.5">
          <Label>Duración (min)</Label>
          <Input type="number" step="1" {...form.register("duracionMin", { valueAsNumber: true })} />
        </div>
      </section>

      {/* ----- Campos por deporte ----- */}
      {(deporte === "trail" || deporte === "running") && (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Datos al aire libre
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Distancia (km)">
              <Input type="number" step="0.01" {...form.register("distanciaKm", { valueAsNumber: true })} />
            </Field>
            <Field label="Desnivel + (m)">
              <Input type="number" step="1" {...form.register("desnivelPosM", { valueAsNumber: true })} />
            </Field>
            <Field label="Desnivel − (m)">
              <Input type="number" step="1" {...form.register("desnivelNegM", { valueAsNumber: true })} />
            </Field>
            <Field label="FC media (lat/min)">
              <Input type="number" {...form.register("fcMedia", { valueAsNumber: true })} />
            </Field>
            <Field label="FC máx (lat/min)">
              <Input type="number" {...form.register("fcMax", { valueAsNumber: true })} />
            </Field>
            <Field label="Ritmo medio (s/km)">
              <Input type="number" step="1" {...form.register("ritmoSegKm", { valueAsNumber: true })} placeholder="Ej: 360 = 6:00" />
            </Field>
          </div>
        </section>
      )}

      {deporte === "cinta" && (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Bloques de cinta
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setUsarRitmo(false)}
                className={`rounded px-2 py-1 ${!usarRitmo ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                Velocidad
              </button>
              <button
                type="button"
                onClick={() => setUsarRitmo(true)}
                className={`rounded px-2 py-1 ${usarRitmo ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                Ritmo
              </button>
            </div>
          </div>

          {bloques?.map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <Field label={`Bloque ${i + 1} · Min`}>
                <Input
                  type="number"
                  step="1"
                  {...form.register(`bloques.${i}.tiempoMin`, { valueAsNumber: true })}
                />
              </Field>
              {usarRitmo ? (
                <Field label="Ritmo (s/km)">
                  <Input
                    type="number"
                    step="1"
                    {...form.register(`bloques.${i}.ritmoSegKm`, { valueAsNumber: true })}
                  />
                </Field>
              ) : (
                <Field label="Velocidad (km/h)">
                  <Input
                    type="number"
                    step="0.1"
                    {...form.register(`bloques.${i}.velocidadKmh`, { valueAsNumber: true })}
                  />
                </Field>
              )}
              <Field label="Inclinación (%)">
                <Input
                  type="number"
                  step="0.1"
                  {...form.register(`bloques.${i}.inclinacionPct`, { valueAsNumber: true })}
                />
              </Field>
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="icon" onClick={() => quitarBloque(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={agregarBloque}>
              <Plus className="h-4 w-4" /> Añadir bloque
            </Button>
          </div>

          {resCinta && (
            <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-4">
              <Metrica label="Tiempo" valor={formatDuration(resCinta.tiempoTotalSeg)} />
              <Metrica label="Distancia" valor={formatDistancia(resCinta.distanciaTotalM)} />
              <Metrica label="Desnivel +" valor={formatDesnivel(resCinta.desnivelPosM)} accent />
              <Metrica label="Desnivel −" valor={formatDesnivel(resCinta.desnivelNegM)} />
              <Metrica label="Vel. media" valor={formatVelocidad(resCinta.velocidadMediaMs)} />
              <Metrica label="Ritmo medio" valor={formatRitmo(resCinta.ritmoMedioSegKm)} />
              <div className="col-span-2 flex items-end justify-end">
                <Button type="button" size="sm" variant="secondary" onClick={aplicarResCinta}>
                  Aplicar a la sesión
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {deporte === "bici_estatica" && (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Bici estática
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Potencia media (W)">
              <Input type="number" {...form.register("potenciaMedia", { valueAsNumber: true })} />
            </Field>
            <Field label="Cadencia media (rpm)">
              <Input type="number" {...form.register("cadencia", { valueAsNumber: true })} />
            </Field>
            <Field label="FC media (lat/min)">
              <Input type="number" {...form.register("fcMedia", { valueAsNumber: true })} />
            </Field>
          </div>
        </section>
      )}

      {deporte === "fuerza" && (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ejercicios
          </h3>
          <p className="text-xs text-muted-foreground">
            Un ejercicio por línea, formato:{" "}
            <code className="rounded bg-muted px-1">nombre; series x reps; peso</code>.
            Ej: <code className="rounded bg-muted px-1">Sentadilla;4x8;60</code>
          </p>
          <Textarea
            rows={6}
            {...form.register("ejerciciosRaw")}
            placeholder={"Sentadilla;4x8;60\nPeso muerto;4x6;80\nPress banca;4x10;50"}
          />
        </section>
      )}

      {/* ----- Cierre ----- */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label={`RPE (1–10): ${form.watch("rpe")}`}>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={form.watch("rpe")}
            onChange={(e) => form.setValue("rpe", Number(e.target.value))}
            className="w-full"
          />
        </Field>
        <Field label="Notas">
          <Textarea rows={2} {...form.register("notas")} placeholder="Sensaciones, terreno, clima…" />
        </Field>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar entrenamiento
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/entrenamientos")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function labelDeporte(s: Sport) {
  return SPORTS.find((x) => x.id === s)?.label ?? s;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Metrica({ label, valor, accent }: { label: string; valor: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-bold ${accent ? "text-primary" : ""}`}>{valor}</div>
    </div>
  );
}