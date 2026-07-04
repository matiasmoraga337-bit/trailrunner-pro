// Parser de archivos FIT (Suunto / Garmin) → ParsedWorkout.
// Usa fit-decoder (CommonJS) vía import dinámico en el navegador.

import type { TrackPoint, Lap, Sport } from "@/lib/types";
import type { ParsedWorkout } from "@/lib/parsers/common";
import type { FitRecord } from "fit-decoder";

// Datos crudos de un record FIT (parcial, campos variables).
type FitData = Record<string, number | Date | undefined>;

// Mapeo de sport / sub_sport de FIT → nuestro enum Sport.
// Ref: FIT SDK globals (sport, sub_sport enums).
function mapearDeporte(sport?: number, subSport?: number): Sport {
  // sport: 1=running, 2=cycling, 3=transition, 5=swimming, 7=fitness_equipment
  if (sport === 1) {
    if (subSport === 11) return "trail"; // trail_running
    if (subSport === 7) return "cinta"; // treadmill
    return "running";
  }
  if (sport === 2) {
    return "bici_estatica"; // cycling (indoor_cycling subSport=6)
  }
  if (sport === 7) {
    if (subSport === 18) return "fuerza"; // strength_training
    return "fuerza";
  }
  return "running";
}

// Usamos FitRecord del módulo de tipos.
export async function parseFit(buffer: ArrayBuffer): Promise<ParsedWorkout | null> {
  const fitDecoder = await import("fit-decoder");

  const raw = fitDecoder.fit2json(buffer);
  const parsed = fitDecoder.parseRecords(raw);

  const records = parsed.records;

  // Buscar mensaje "session"
  const sessions = records.filter((r) => r.type === "session");
  const sessionMsg = sessions[0];
  const lapsMsgs = records.filter((r) => r.type === "lap");
  const recordMsgs = records.filter((r) => r.type === "record");

  const sessionData = (sessionMsg?.data ?? {}) as FitData;

  // Datos de la sesión
  const sport = sessionData.sport;
  const subSport = sessionData.sub_sport;
  const totalElapsed = (sessionData.total_elapsed_time ?? 0) as number;
  const totalDistance = (sessionData.total_distance ?? 0) as number;
  const totalAscent = (sessionData.total_ascent ?? 0) as number;
  const totalDescent = (sessionData.total_descent ?? 0) as number;
  const avgHr = sessionData.avg_heart_rate;
  const maxHr = sessionData.max_heart_rate;
  const avgSpeed = (sessionData.avg_speed ?? 0) as number; // m/s
  const avgPower = sessionData.avg_power;
  const totalCalories = sessionData.total_calories;
  const startTime = sessionData.start_time; // Date object
  const timestamp = sessionData.timestamp; // Date object

  // Fecha
  const fechaInicio: Date =
    startTime instanceof Date ? startTime : timestamp instanceof Date ? timestamp : new Date();
  const fechaInicioIso = fechaInicio.toISOString();

  // Deporte
  const deporte = mapearDeporte(sport, subSport);
  // Revisar: si no es trail/cinta pero hay mucho D+, ajustar a trail
  const finalDeporte = deporte === "running" && totalAscent > 100 ? "trail" : deporte;

  // Traza GPS a partir de "record"
  const traza: TrackPoint[] = [];
  for (const r of recordMsgs) {
    const d = r.data ?? {};
    const lat = d.position_lat;
    const lon = d.position_long;
    if (typeof lat === "number" && typeof lon === "number") {
      const ele = typeof d.altitude === "number" ? d.altitude : undefined;
      const t = d.timestamp instanceof Date ? d.timestamp.getTime() : undefined;
      traza.push({ lat, lon, ele, t });
    }
  }

  // Laps
  const laps: Lap[] = lapsMsgs.map((m, i) => {
    const d = (m.data ?? {}) as FitData;
    return {
      index: i,
      tiempoSeg: Math.round((d.total_elapsed_time ?? 0)),
      distanciaM: Math.round((d.total_distance ?? 0)),
      desnivelPosM: Math.round((d.total_ascent ?? 0)),
      desnivelNegM: Math.round((d.total_descent ?? 0)),
      fcMedia: d.avg_heart_rate,
      fcMax: d.max_heart_rate,
      velocidadMs: d.avg_speed,
      potenciaMedia: d.avg_power,
    };
  });

  // Velocidad y ritmo
  const velocidadMediaMs = avgSpeed || (totalElapsed > 0 ? totalDistance / totalElapsed : 0);
  const ritmoMedioSegKm = velocidadMediaMs > 0 ? Math.round(1000 / velocidadMediaMs) : undefined;

  return {
    deporte: finalDeporte,
    titulo: "Sesión importada",
    fecha: fechaInicioIso.slice(0, 10),
    fechaInicio: fechaInicioIso,
    duracionSeg: Math.round(totalElapsed),
    distanciaM: Math.round(totalDistance),
    desnivelPosM: Math.round(totalAscent),
    desnivelNegM: Math.round(totalDescent),
    fcMedia: avgHr,
    fcMax: maxHr,
    ritmoMedioSegKm,
    velocidadMediaMs: velocidadMediaMs || undefined,
    potenciaMedia: avgPower,
    calorias: totalCalories,
    laps,
    traza,
  };
}