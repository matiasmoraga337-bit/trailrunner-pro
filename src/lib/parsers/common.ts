// Estructura común que devuelven los parsers GPX y FIT.

import type { Lap, Sport, TrackPoint } from "@/lib/types";

export interface ParsedWorkout {
  deporte: Sport;
  titulo: string;
  fecha: string; // ISO date (día)
  fechaInicio: string; // ISO datetime
  duracionSeg: number;
  distanciaM: number;
  desnivelPosM: number;
  desnivelNegM?: number;
  fcMedia?: number;
  fcMax?: number;
  ritmoMedioSegKm?: number;
  velocidadMediaMs?: number;
  potenciaMedia?: number;
  calorias?: number;
  laps: Lap[];
  traza: TrackPoint[];
}