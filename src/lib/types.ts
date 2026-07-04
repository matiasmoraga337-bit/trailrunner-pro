// Tipos centrales del dominio de TrailRunner Pro.
// Unidades: SI (km, m, kg, °C) salvo donde se indique.

export type Sport =
  | "trail"
  | "running"
  | "cinta"
  | "bici_estatica"
  | "fuerza";

export const SPORTS: { id: Sport; label: string }[] = [
  { id: "trail", label: "Trail running" },
  { id: "running", label: "Running" },
  { id: "cinta", label: "Cinta / Trotadora" },
  { id: "bici_estatica", label: "Bici estática" },
  { id: "fuerza", label: "Fuerza" },
];

export type SessionSource = "manual" | "importado-suunto";

export type SessionType =
  | "larga"
  | "regenerativa"
  | "intervalos"
  | "tempo"
  | "fuerza"
  | "competencia"
  | "otra";

/** Tramo/vuelta de una sesión. */
export interface Lap {
  index: number;
  tiempoSeg: number;
  distanciaM: number;
  desnivelPosM?: number;
  desnivelNegM?: number;
  fcMedia?: number;
  fcMax?: number;
  ritmoMedioSegKm?: number;
  velocidadMs?: number;
  inclinacionPct?: number; // Cinta
  potenciaMedia?: number; // Bici estática
}

/** Coordenada de una traza GPS. */
export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  t?: number; // epoch ms
}

/**
 * Sesión de entrenamiento realizada (registro final).
 * Equivale a un workout ya hecho, ya sea manual o importado del Suunto.
 */
export interface WorkoutSession {
  id?: number;
  fecha: string; // ISO date (sólo día) o ISO datetime del inicio
  fechaInicio?: string; // ISO datetime inicio real
  sport: Sport;
  tipo: SessionType;
  titulo: string;
  duracionSeg: number;
  distanciaM: number;
  desnivelPosM: number;
  desnivelNegM?: number;
  fcMedia?: number;
  fcMax?: number;
  ritmoMedioSegKm?: number; // s/km
  velocidadMediaMs?: number;
  potenciaMedia?: number; // Bici
  calorias?: number;
  rpe?: number; // 1-10
  notas?: string;
  fuente: SessionSource;
  archivoRawId?: number; // ref al Blob guardado en tabla ArchivoRaw
  datosLaps?: Lap[];
  traza?: TrackPoint[]; // Solo trail/running al aire
  createdAt?: number;
  updatedAt?: number;
}

/** Entrenamiento planificado para un día de la semana. */
export interface PlannedWorkout {
  id?: number;
  fecha: string; // ISO date (día)
  sport: Sport;
  titulo: string;
  objetivo: string;
  duracionEstimadaSeg: number;
  distanciaEstimadaM: number;
  desnivelEstimadoPosM: number;
  completada: boolean;
  sessionIdRelacionada?: number;
  createdAt?: number;
  updatedAt?: number;
}

/** Carrera con su ruta GPX cargada para análisis y asesoramiento. */
export interface Race {
  id?: number;
  nombre: string;
  fecha?: string;
  distanciaM: number;
  desnivelPosM: number;
  desnivelNegM: number;
  gpxRawId?: number; // Blob original del GPX
  geoJSON?: GeoJSON.FeatureCollection;
  perfilElevacion: PuntoElevacion[];
  cutoffsSeg?: number[]; // Tiempos límite por sectores
  createdAt?: number;
}

export interface PuntoElevacion {
  distanciaM: number; // distancia acumulada desde el inicio
  elevacionM: number;
}

/** Archivo binario crudo (FIT/GPX) conservado para re-procesamiento. */
export interface ArchivoRaw {
  id?: number;
  nombre: string;
  tipo: "fit" | "gpx";
  bytes: Blob;
  createdAt?: number;
}

/** Ajustes del usuario (único registro local). */
export interface AjustesUsuario {
  id?: number;
  nombre: string;
  pesoKg: number;
  edad?: number;
  alturaCm?: number;
  fcMax?: number;
  fcRepo?: number;
  ftpBici?: number; // W
  umbralTrailPaceSegKm?: number; // ritmo umbral en trail
  // Zonas de FC (5 zonas) basadas en % FCmax o FC reserva
  zonasFc: number[]; // límites inferiores en %, último = 100
  fechaNacimiento?: string;
  updatedAt?: number;
}