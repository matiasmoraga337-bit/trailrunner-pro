import Dexie, { type Table } from "dexie";
import type {
  ArchivoRaw,
  PlannedWorkout,
  Race,
  WorkoutSession,
  AjustesUsuario,
} from "@/lib/types";

/**
 * Base de datos local (IndexedDB) de TrailRunner Pro.
 * Todo se guarda en el navegador del usuario. No hay backend.
 */
export class TrailRunnerDB extends Dexie {
  sesiones!: Table<WorkoutSession, number>;
  planificadas!: Table<PlannedWorkout, number>;
  carreras!: Table<Race, number>;
  archivos!: Table<ArchivoRaw, number>;
  ajustes!: Table<AjustesUsuario, number>;
  meta!: Table<{ clave: string; valor: unknown }, string>;

  constructor() {
    super("trailrunner-pro");
    this.version(1).stores({
      sesiones: "++id, fecha, sport, tipo, fuente, createdAt",
      planificadas: "++id, fecha, sport, completada, createdAt",
      carreras: "++id, nombre, fecha, createdAt",
      archivos: "++id, tipo, createdAt",
      ajustes: "++id",
      meta: "clave",
    });
  }
}

let _db: TrailRunnerDB | null = null;

function getDb(): TrailRunnerDB {
  if (!_db) {
    if (typeof window === "undefined") {
      throw new Error("Dexie solo funciona en el navegador");
    }
    _db = new TrailRunnerDB();
  }
  return _db;
}

/** Instancia de la base de datos, con inicializacion lazy para evitar errores en SSR. */
export const db = new Proxy({} as TrailRunnerDB, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop];
  },
});

/** Singleton de ajustes (id = 1). */
export const AJUSTES_ID = 1;