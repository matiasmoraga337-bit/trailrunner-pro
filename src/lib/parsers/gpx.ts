// Parser de archivos GPX (XML) → ParsedWorkout.
// Funciona en el navegador usando DOMParser.

import type { TrackPoint, Lap } from "@/lib/types";
import type { ParsedWorkout } from "@/lib/parsers/common";
import { calcularDistanciaYDesnivel } from "@/lib/calculations/elevation";

/**
 * Parsea un GPX (string o Document) y devuelve una sesión pre-armada.
 * El GPX solo contiene trkpt con lat/lon/ele/time; las métricas se calculan.
 */
export function parseGpx(input: string | Document): ParsedWorkout | null {
  const doc =
    typeof input === "string"
      ? new DOMParser().parseFromString(input, "application/xml")
      : input;

  // Validación básica
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("GPX inválido: error de XML");

  const trkpts = Array.from(doc.querySelectorAll("trkpt"));
  if (trkpts.length === 0) return null;

  const puntos: TrackPoint[] = trkpts.map((pt) => {
    const lat = parseFloat(pt.getAttribute("lat") ?? "0");
    const lon = parseFloat(pt.getAttribute("lon") ?? "0");
    const eleEl = pt.querySelector("ele");
    const timeEl = pt.querySelector("time");
    const ele = eleEl ? parseFloat(eleEl.textContent ?? "") : undefined;
    const t = timeEl ? Date.parse(timeEl.textContent ?? "") : undefined;
    return { lat, lon, ele, t };
  });

  const { distanciaM, desnivelPosM, desnivelNegM } =
    calcularDistanciaYDesnivel(puntos);

  // Tiempo total
  const ts = puntos.map((p) => p.t).filter(Boolean) as number[];
  const duracionSeg =
    ts.length > 1 ? Math.round((ts[ts.length - 1] - ts[0]) / 1000) : 0;

  // Fecha de inicio
  const primerT = ts[0] ?? Date.now();
  const fechaInicioIso = new Date(primerT).toISOString();

  // FC si está presente en extensiones (Garmin TrackPointExtension)
  const fcs = trkpts
    .map((pt) => {
      const hr = pt.querySelector("extensions TrackPointExtension hr, extensions hr");
      return hr ? parseInt(hr.textContent ?? "", 10) : undefined;
    })
    .filter((v): v is number => typeof v === "number" && v > 0);
  const fcMedia =
    fcs.length > 0
      ? Math.round(fcs.reduce((a, b) => a + b, 0) / fcs.length)
      : undefined;
  const fcMax = fcs.length > 0 ? Math.max(...fcs) : undefined;

  const velocidadMediaMs = duracionSeg > 0 ? distanciaM / duracionSeg : 0;
  const ritmoMedioSegKm =
    velocidadMediaMs > 0 ? Math.round(1000 / velocidadMediaMs) : undefined;

  // Título: nombre del track si existe
  const nombre = doc.querySelector("trk > name")?.textContent ?? undefined;

  // Laps: un GPX puede tener varios <trkseg>; los dividimos por trkseg
  const laps: Lap[] = [];
  const segs = Array.from(doc.querySelectorAll("trkseg"));
  if (segs.length > 1) {
    let index = 0;
    let distAcum = 0;
    for (const seg of segs) {
      const segPts = Array.from(seg.querySelectorAll("trkpt"));
      const pts: TrackPoint[] = segPts.map((pt) => ({
        lat: parseFloat(pt.getAttribute("lat") ?? "0"),
        lon: parseFloat(pt.getAttribute("lon") ?? "0"),
        ele: pt.querySelector("ele")
          ? parseFloat(pt.querySelector("ele")?.textContent ?? "")
          : undefined,
        t: pt.querySelector("time")
          ? Date.parse(pt.querySelector("time")?.textContent ?? "")
          : undefined,
      }));
      const segMetrics = calcularDistanciaYDesnivel(pts);
      const segTime = pts.map((p) => p.t).filter(Boolean) as number[];
      const tiempoSeg =
        segTime.length > 1
          ? Math.round((segTime[segTime.length - 1] - segTime[0]) / 1000)
          : 0;
      laps.push({
        index,
        tiempoSeg,
        distanciaM: segMetrics.distanciaM,
        desnivelPosM: Math.round(segMetrics.desnivelPosM),
      });
      distAcum += segMetrics.distanciaM;
      index++;
    }
  }

  return {
    deporte: desnivelPosM > 100 ? "trail" : "running",
    titulo: nombre ?? "Sesión GPX",
    fecha: fechaInicioIso.slice(0, 10),
    fechaInicio: fechaInicioIso,
    duracionSeg,
    distanciaM: Math.round(distanciaM),
    desnivelPosM: Math.round(desnivelPosM),
    desnivelNegM: Math.round(desnivelNegM),
    fcMedia,
    fcMax,
    ritmoMedioSegKm,
    velocidadMediaMs: velocidadMediaMs || undefined,
    laps,
    traza: puntos,
  };
}