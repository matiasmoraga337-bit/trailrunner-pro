// Formateadores en unidades SI (español, separador de miles "." y decimal ",").
// Sin locale del navegador para mantener consistencia.

const fmt = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
});

const fmt0 = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export const formatDistancia = (m: number): string =>
  m >= 1000 ? `${fmt.format(m / 1000)} km` : `${fmt0.format(m)} m`;

export const formatDistanciaKm = (m: number): string =>
  `${fmt.format(m / 1000)} km`;

export const formatDesnivel = (m: number): string => `${fmt0.format(m)} m`;

export const formatPeso = (kg: number): string => `${fmt.format(kg)} kg`;

export const formatDuration = (seg: number): string => {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.floor(seg % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/** Ritmo en s/km → "m:ss /km" */
export const formatRitmo = (segKm: number): string => {
  if (!segKm || segKm <= 0) return "-";
  const m = Math.floor(segKm / 60);
  const s = Math.round(segKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
};

/** Velocidad m/s → "x.x km/h" */
export const formatVelocidad = (ms: number): string =>
  `${fmt.format(ms * 3.6)} km/h`;

export const formatDateISO = (d: string | Date): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
};

export const formatDateCorta = (d: string | Date): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatDateLarga = (d: string | Date): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
};