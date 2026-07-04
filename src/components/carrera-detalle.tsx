"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Loader2, Sparkles, Clock, Droplet, Battery, Flame } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, formatDistancia, formatDesnivel, formatRitmo } from "@/lib/format";
import type { Race, PuntoElevacion, WorkoutSession } from "@/lib/types";
import { useAjustes } from "@/lib/db/hooks";
import { db } from "@/lib/db/db";

interface AsesorResponse {
  fuente: "gemini" | "determinista";
  modelo?: string;
  warning?: string;
  mensaje?: string;
  // Salida IA
  tramosIA?: { tramo: number; desde_km: number; hasta_km: number; ritmo_s_km: number; rpe_objetivo?: number; notas?: string }[];
  tiempoTotalEstimadoSeg?: number;
  planNutricionIA?: {
    cho_g_h: number;
    total_cho_g: number;
    hidratacion_ml_h: number;
    total_hidratacion_ml: number;
    geles: number;
    sales_mg: number;
    ubicacion_avituallamientos_km?: number[];
    recomendaciones: string[];
  };
  estrategia?: string;
  // Salida base (siempre presente)
  tramosBase?: { index: number; nombre: string; inicioM: number; finM: number; ritmoAjustadoSegKm: number; tiempoEstimadoSeg: number; pendientePct: number }[];
  planBase?: {
    tiempoTotalEstimadoSeg: number;
    carbohidratosG: number;
    carbohidratosGPorHora: number;
    hidratacionMl: number;
    hidratacionMlPorHora: number;
    geles: number;
    salesElectrolitosMg: number;
    recomendaciones: string[];
  };
}

export function CarreraDetalle({ carrera }: { carrera: Race }) {
  const ajustes = useAjustes();
  const [ritmoBase, setRitmoBase] = useState<number>(360);
  const [asesor, setAsesor] = useState<AsesorResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Ritmo base sugerido: umbral del corredor si existe, default 6:00/km
  useState(() => {
    if (ajustes?.umbralTrailPaceSegKm) setRitmoBase(ajustes.umbralTrailPaceSegKm);
  });

  const perfil: PuntoElevacion[] = carrera.perfilElevacion ?? [];

  const dataPerfil = perfil.map((p) => ({
    km: +(p.distanciaM / 1000).toFixed(2),
    elev: Math.round(p.elevacionM),
  }));

  const pedirAsesor = async () => {
    setLoading(true);
    setAsesor(null);
    try {
      const resp = await fetch("/api/ia/asesor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreCarrera: carrera.nombre,
          distanciaM: carrera.distanciaM,
          desnivelPosM: carrera.desnivelPosM,
          perfilElevacion: perfil,
          ritmoBaseSegKm: ritmoBase,
          pesoKg: ajustes?.pesoKg,
          fcMax: ajustes?.fcMax,
          umbralTrailPaceSegKm: ajustes?.umbralTrailPaceSegKm,
        }),
      });
      if (!resp.ok) throw new Error("Error en el asesor");
      const data: AsesorResponse = await resp.json();
      setAsesor(data);
      if (data.fuente === "gemini") {
        toast.success("Asesoramiento de IA listo");
      } else if (data.warning) {
        toast.warning("Modo baseline", { description: data.warning });
      } else if (data.mensaje) {
        toast.info(data.mensaje);
      }
    } catch (e) {
      toast.error("No se pudo obtener asesoramiento", {
        description: e instanceof Error ? e.message : "",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcular tiempo total basado en los tramos IA (si hay) o plan base
  const tiempoTotalIA = asesor?.tiempoTotalEstimadoSeg;
  const planIA = asesor?.planNutricionIA;
  const tramosIA = asesor?.tramosIA;

  return (
    <div className="space-y-6">
      {/* KPIs de la carrera */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCarrera label="Distancia" valor={formatDistancia(carrera.distanciaM)} />
        <KpiCarrera
          label="Desnivel +"
          valor={formatDesnivel(carrera.desnivelPosM)}
          accent
        />
        <KpiCarrera
          label="Desnivel −"
          valor={formatDesnivel(carrera.desnivelNegM ?? 0)}
        />
        <KpiCarrera
          label="D+ / km"
          valor={`${(carrera.desnivelPosM / Math.max(carrera.distanciaM / 1000, 0.1)).toFixed(0)} m/km`}
        />
      </section>

      {/* Perfil de elevacion */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Perfil de elevacion</h2>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataPerfil}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="km"
                fontSize={12}
                label={{ value: "km", position: "insideBottomRight", dy: 12, fontSize: 11 }}
                domain={["dataMin", "dataMax"]}
              />
              <YAxis fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v, n) => [v, n === "elev" ? "Elevacion (m)" : n]}
              />
              <Area
                type="monotone"
                dataKey="elev"
                stroke="#f97316"
                fill="url(#grad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Asesor */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Asesor de carrera
            </h2>
            <p className="text-xs text-muted-foreground">
              Personaliza el ritmo base y dejanos recomendarte el pacing por tramos y el plan de nutricion.
            </p>
          </div>
          {asesor?.fuente === "gemini" && (
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {asesor.modelo}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Ritmo base objetivo (s/km)</Label>
            <Input
              type="number"
              value={ritmoBase}
              onChange={(e) => setRitmoBase(Number(e.target.value))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              {ritmoBase > 0 ? formatRitmo(ritmoBase) : "—"} en llano
            </p>
          </div>
          <Button onClick={pedirAsesor} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {asesor ? "Volver a asesorar" : "Asesorar"}
          </Button>
        </div>

        {asesor && (
          <div className="mt-5 space-y-5">
            {/* Tiempo total estimado */}
            {tiempoTotalIA && (
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tiempo estimado:</span>
                  <span className="text-xl font-bold">
                    {formatDuration(tiempoTotalIA)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({(tiempoTotalIA / 3600).toFixed(1)} h)
                  </span>
                </div>
              </div>
            )}

            {/* Estrategia (IA texto libre) */}
            {asesor.estrategia && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <h3 className="mb-1 text-sm font-semibold">Estrategia</h3>
                <p className="text-sm whitespace-pre-line">{asesor.estrategia}</p>
              </div>
            )}

            {/* Pacing por tramos (IA o base) */}
            {(tramosIA ?? asesor.tramosBase) && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Pacing por tramos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground">
                        <th className="py-1 pr-3">Tramo</th>
                        <th className="py-1 pr-3">Desde</th>
                        <th className="py-1 pr-3">Hasta</th>
                        <th className="py-1 pr-3">Ritmo</th>
                        <th className="py-1 pr-3">T. estimado</th>
                        <th className="py-1 pr-3">RPE</th>
                        <th className="py-1">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tramosIA && tramosIA.length > 0
                        ? tramosIA.map((t) => (
                            <tr key={t.tramo} className="border-t border-border">
                              <td className="py-1.5 pr-3 font-medium">{t.tramo}</td>
                              <td className="py-1.5 pr-3">{t.desde_km} km</td>
                              <td className="py-1.5 pr-3">{t.hasta_km} km</td>
                              <td className="py-1.5 pr-3">{formatRitmo(t.ritmo_s_km)}</td>
                              <td className="py-1.5 pr-3 text-muted-foreground">
                                {asesor.tramosBase?.[t.tramo - 1]
                                  ? formatDuration(asesor.tramosBase![t.tramo - 1].tiempoEstimadoSeg)
                                  : "—"}
                              </td>
                              <td className="py-1.5 pr-3">{t.rpe_objetivo ?? "—"}</td>
                              <td className="py-1.5 text-muted-foreground">{t.notas ?? ""}</td>
                            </tr>
                          ))
                        : asesor.tramosBase?.map((t) => (
                            <tr key={t.index} className="border-t border-border">
                              <td className="py-1.5 pr-3 font-medium">{t.index + 1}</td>
                              <td className="py-1.5 pr-3">
                                {(t.inicioM / 1000).toFixed(1)} km
                              </td>
                              <td className="py-1.5 pr-3">{(t.finM / 1000).toFixed(1)} km</td>
                              <td className="py-1.5 pr-3">{formatRitmo(t.ritmoAjustadoSegKm)}</td>
                              <td className="py-1.5 pr-3">{formatDuration(t.tiempoEstimadoSeg)}</td>
                              <td className="py-1.5 pr-3 text-muted-foreground">
                                {t.pendientePct > 0 ? `+${Math.round(t.pendientePct)}%` : `${Math.round(t.pendientePct)}%`}
                              </td>
                              <td className="py-1.5"></td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Plan de nutricion */}
            {(planIA ?? asesor.planBase) && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Plan de nutricion e hidratacion</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {planIA ? (
                    <>
                      <NutricionCard
                        icon={<Flame className="h-4 w-4" />}
                        label="Carbohidratos"
                        valor={`${planIA.cho_g_h} g/h`}
                        sub={`${planIA.total_cho_g} g total`}
                      />
                      <NutricionCard
                        icon={<Battery className="h-4 w-4" />}
                        label="Geles"
                        valor={`${planIA.geles}`}
                      />
                      <NutricionCard
                        icon={<Droplet className="h-4 w-4" />}
                        label="Hidratacion"
                        valor={`${planIA.hidratacion_ml_h} ml/h`}
                        sub={`${planIA.total_hidratacion_ml} ml total`}
                      />
                      <NutricionCard
                        icon={<Battery className="h-4 w-4" />}
                        label="Sales"
                        valor={`${planIA.sales_mg} mg`}
                      />
                    </>
                  ) : (
                    <>
                      <NutricionCard
                        icon={<Flame className="h-4 w-4" />}
                        label="Carbohidratos"
                        valor={`${asesor.planBase!.carbohidratosGPorHora} g/h`}
                        sub={`${asesor.planBase!.carbohidratosG} g total`}
                      />
                      <NutricionCard
                        icon={<Battery className="h-4 w-4" />}
                        label="Geles"
                        valor={`${asesor.planBase!.geles}`}
                      />
                      <NutricionCard
                        icon={<Droplet className="h-4 w-4" />}
                        label="Hidratacion"
                        valor={`${asesor.planBase!.hidratacionMlPorHora} ml/h`}
                        sub={`${asesor.planBase!.hidratacionMl} ml total`}
                      />
                      <NutricionCard
                        icon={<Battery className="h-4 w-4" />}
                        label="Sales"
                        valor={`${asesor.planBase!.salesElectrolitosMg} mg`}
                      />
                    </>
                  )}
                </div>

                {/* Recomendaciones */}
                <ul className="mt-3 space-y-1 text-sm">
                  {(planIA?.recomendaciones ?? asesor.planBase?.recomendaciones ?? []).map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>

                {/* Avituallamientos */}
                {planIA?.ubicacion_avituallamientos_km && planIA.ubicacion_avituallamientos_km.length > 0 && (
                  <div className="mt-3 rounded-lg bg-muted/40 p-3">
                    <h4 className="mb-1 text-sm font-medium">Abituallamientos sugeridos</h4>
                    <div className="flex flex-wrap gap-2">
                      {planIA.ubicacion_avituallamientos_km.map((km, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          km {km}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {asesor.warning && (
              <p className="text-xs text-muted-foreground italic">{asesor.warning}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCarrera({ label, valor, accent }: { label: string; valor: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold ${accent ? "text-primary" : ""}`}>{valor}</div>
    </div>
  );
}

function NutricionCard({
  icon,
  label,
  valor,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-bold">{valor}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}