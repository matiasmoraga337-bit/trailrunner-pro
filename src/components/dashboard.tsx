"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Activity,
  Mountain,
  Clock,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { SPORTS } from "@/lib/types";
import { db } from "@/lib/db/db";
import {
  agregarPorSemana,
  calcularCarga,
  getLunes,
} from "@/lib/calculations/load";
import {
  formatDuration,
  formatDistancia,
  formatDesnivel,
  formatDateCorta,
} from "@/lib/format";

const COLORES_DEPORTE: Record<string, string> = {
  trail: "#f97316",
  running: "#3b82f6",
  cinta: "#22c55e",
  bici_estatica: "#a855f7",
  fuerza: "#ef4444",
};

export function Dashboard() {
  const sesiones = useLiveQuery(() => db.sesiones.toArray(), []);

  const stats = useMemo(() => {
    if (!sesiones) return null;
    const hoy = new Date();
    const lunesActual = getLunes(hoy);
    const lunesHace12 = new Date(lunesActual);
    lunesHace12.setDate(lunesHace12.getDate() - 11 * 7);

    const semanas = agregarPorSemana(sesiones, lunesHace12, lunesActual);
    const carga = calcularCarga(sesiones, hoy);

    // KPIs: semana actual vs semana anterior
    const semanaActual = semanas[semanas.length - 1] ?? null;
    const semanaPrev = semanas[semanas.length - 2] ?? null;

    return {
      semanas,
      carga,
      semanaActual,
      semanaPrev,
    };
  }, [sesiones]);

  if (!stats || !stats.semanaActual) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Activity className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          Aun no hay entrenamientos registrados. Empezá{" "}
          <a href="/entrenamientos/nuevo" className="text-primary underline">
            acá
          </a>{" "}
          o{" "}
          <a href="/importar" className="text-primary underline">
            importá
          </a>{" "}
          uno de tu Suunto.
        </p>
      </div>
    );
  }

  // Datos para gráfico de volumen por semana (distancia y D+)
  const dataVolumen = stats.semanas.map((s) => ({
    semana: formatDateCorta(s.lunes).slice(0, 5), // dd/mm
    distanciaKm: +(s.distanciaM / 1000).toFixed(1),
    desnivelM: Math.round(s.desnivelPosM),
    duracionMin: Math.round(s.duracionSeg / 60),
  }));

  // Datos para gráfico de distribucion por deporte (ultima semana)
  const dataDeporte = SPORTS.map((sport) => {
    const datos = stats.semanaActual!.porDeporte[sport.id];
    return {
      nombre: sport.label,
      sport: sport.id,
      duracionMin: Math.round(datos.duracionSeg / 60),
      sesiones: datos.cuenta,
      distanciaKm: +(datos.distanciaM / 1000).toFixed(1),
    };
  }).filter((x) => x.sesiones > 0);

  // Datos para grafico de carga (ACWR)
  const dataCarga = stats.carga.semanasCarga.map((s) => ({
    semana: formatDateCorta(s.lunes).slice(0, 5),
    carga: s.cargaAU,
  }));

  const ratio = stats.carga.ratioACWR;
  let ratioColor = "text-muted-foreground";
  let ratioIcon = <Minus className="h-5 w-5" />;
  let ratioLabel = "Pendiente";
  if (ratio > 0) {
    if (ratio > 1.5) {
      ratioColor = "text-destructive";
      ratioIcon = <TrendingUp className="h-5 w-5" />;
      ratioLabel = "Riesgo alto";
    } else if (ratio > 1.3) {
      ratioColor = "text-amber-500";
      ratioIcon = <TrendingUp className="h-5 w-5" />;
      ratioLabel = "Atencion";
    } else if (ratio >= 0.8) {
      ratioColor = "text-emerald-600";
      ratioIcon = <Minus className="h-5 w-5" />;
      ratioLabel = "Equilibrado";
    } else {
      ratioColor = "text-blue-500";
      ratioIcon = <TrendingDown className="h-5 w-5" />;
      ratioLabel = "En descarga";
    }
  }

  const sa = stats.semanaActual;
  const sp = stats.semanaPrev;
  const diff = (calc: (s: typeof sa) => number): { v: number; up: boolean | null } => {
    if (!sp) return { v: 0, up: null };
    const a = calc(sa);
    const b = calc(sp);
    return { v: b === 0 ? 0 : ((a - b) / b) * 100, up: a > b };
  };

  return (
    <div className="space-y-6">
      {/* KPIs semana actual */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={<Clock className="h-5 w-5" />}
          label="Duración semanal"
          valor={formatDuration(sa.duracionSeg)}
          delta={diff((s) => s.duracionSeg)}
        />
        <Kpi
          icon={<Activity className="h-5 w-5" />}
          label="Distancia semanal"
          valor={formatDistancia(sa.distanciaM)}
          delta={diff((s) => s.distanciaM)}
        />
        <Kpi
          icon={<Mountain className="h-5 w-5" />}
          label="Desnivel + semanal"
          valor={formatDesnivel(sa.desnivelPosM)}
          delta={diff((s) => s.desnivelPosM)}
          accent
        />
        <Kpi
          icon={<Flame className="h-5 w-5" />}
          label="Sesiones"
          valor={`${sa.cuentaSesiones}`}
          delta={diff((s) => s.cuentaSesiones)}
        />
      </section>

      {/* Carga ACWR */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Carga de entrenamiento</h2>
            <p className="text-xs text-muted-foreground">
              Modelo sRPE-TL (Foster) · aguda = ult. 7 d&iacute;as · cr&oacute;nica = media ult. 4 semanas
            </p>
          </div>
          <div className={`flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 ${ratioColor}`}>
            {ratioIcon}
            <div>
              <div className="text-lg font-bold leading-none">
                {ratio > 0 ? ratio.toFixed(2) : "—"}
              </div>
              <div className="text-xs uppercase leading-none">{ratioLabel}</div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat label="Carga aguda" valor={`${stats.carga.agudaAU} AU`} />
          <MiniStat label="Carga cr&oacute;nica" valor={`${stats.carga.cronicaAU} AU`} />
          <MiniStat label="Ratio ACWR" valor={ratio > 0 ? ratio.toFixed(2) : "—"} />
        </div>
        <div className="mt-4 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataCarga}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semana" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="carga"
                name="Carga (AU)"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Volumen por semana */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Volumen por semana</h2>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataVolumen}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semana" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="distanciaKm"
                name="Distancia (km)"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="desnivelM"
                name="Desnivel + (m)"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Distribucion por deporte */}
      {dataDeporte.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Distribuci&oacute;n por deporte (esta semana)</h2>
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataDeporte}
                    dataKey="duracionMin"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {dataDeporte.map((d) => (
                      <Cell key={d.sport} fill={COLORES_DEPORTE[d.sport] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-sm">
              {dataDeporte.map((d) => (
                <li key={d.sport} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ background: COLORES_DEPORTE[d.sport] ?? "#94a3b8" }}
                    />
                    {d.nombre}
                  </span>
                  <span className="text-muted-foreground">
                    {d.sesiones}x · {d.duracionMin} min
                    {d.distanciaKm > 0 && ` · ${d.distanciaKm} km`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  valor,
  delta,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  delta: { v: number; up: boolean | null };
  accent?: boolean;
}) {
  let deltaText = "";
  let deltaColor = "";
  if (delta.up === null) {
    deltaText = "—";
  } else {
    const pct = delta.v === 0 ? "0%" : `${delta.up ? "+" : ""}${delta.v.toFixed(0)}%`;
    deltaText = pct;
    deltaColor = delta.v === 0 ? "text-muted-foreground" : delta.up ? "text-emerald-600" : "text-amber-500";
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <div className={`text-2xl font-bold ${accent ? "text-primary" : ""}`}>{valor}</div>
        <span className={`text-xs ${deltaColor}`}>{deltaText}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{valor}</div>
    </div>
  );
}