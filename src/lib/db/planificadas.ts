import { db } from "@/lib/db/db";
import type { PlannedWorkout, Sport } from "@/lib/types";
import { formatDateISO } from "@/lib/format";

export async function getPlanificada(id: number) {
  return db.planificadas.get(id);
}

export async function savePlanificada(
  data: Omit<PlannedWorkout, "id" | "createdAt" | "updatedAt">
) {
  const ahora = Date.now();
  const id = await db.planificadas.add({
    ...data,
    createdAt: ahora,
    updatedAt: ahora,
  });
  return id;
}

export async function updatePlanificada(
  id: number,
  cambios: Partial<PlannedWorkout>
) {
  await db.planificadas.update(id, { ...cambios, updatedAt: Date.now() });
}

export async function deletePlanificada(id: number) {
  await db.planificadas.delete(id);
}

/** Lista entrenamientos planificados para una semana (lun-dom). */
export async function listarSemana(
  lunes: Date
): Promise<PlannedWorkout[]> {
  const dom = new Date(lunes);
  dom.setDate(dom.getDate() + 6);
  const desdeStr = formatDateISO(lunes);
  const hastaStr = formatDateISO(dom);
  const items = await db.planificadas
    .where("fecha")
    .between(desdeStr, hastaStr, true, true)
    .toArray();
  items.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return items;
}

/** Lista sesiones realizadas para una semana (para comparativa plan vs. hecho). */
export async function listarSesionesSemana(lunes: Date) {
  const dom = new Date(lunes);
  dom.setDate(dom.getDate() + 6);
  const desdeStr = formatDateISO(lunes);
  const hastaStr = formatDateISO(dom);
  const items = await db.sesiones
    .where("fecha")
    .between(desdeStr, hastaStr, true, true)
    .toArray();
  return items;
}

// --- Plantillas ---

export interface PlantillaDia {
  sport: Sport;
  titulo: string;
  objetivo: string;
  duracionEstimadaSeg: number;
  distanciaEstimadaM: number;
  desnivelEstimadoPosM: number;
}

export interface PlantillaSemana {
  id: string;
  nombre: string;
  descripcion: string;
  // 0 = lunes ... 6 = domingo
  dias: (PlantillaDia | null)[];
}

// Plantillas predefinidas (trail running)
export const PLANTILLAS_PREDEF: PlantillaSemana[] = [
  {
    id: "base-trail",
    nombre: "Semana base trail",
    descripcion:
      "Semana aeróbica de construcción para trail. Volumen moderado, 1 sesión de calidad.",
    dias: [
      null,
      {
        sport: "trail",
        titulo: "Series cuesta",
        objetivo: "Fuerza aeróbica, 6x2' cuesta arriba",
        duracionEstimadaSeg: 3600,
        distanciaEstimadaM: 8000,
        desnivelEstimadoPosM: 400,
      },
      {
        sport: "running",
        titulo: "Rodaje suave",
        objetivo: "Recuperación Z2",
        duracionEstimadaSeg: 2700,
        distanciaEstimadaM: 6000,
        desnivelEstimadoPosM: 0,
      },
      null,
      {
        sport: "trail",
        titulo: "Tirada larga",
        objetivo: "Resistencia, Z2 continuo",
        duracionEstimadaSeg: 7200,
        distanciaEstimadaM: 18000,
        desnivelEstimadoPosM: 800,
      },
      {
        sport: "fuerza",
        titulo: "Fuerza piernas",
        objetivo: "Sentadilla, peso muerto, zancadas",
        duracionEstimadaSeg: 3000,
        distanciaEstimadaM: 0,
        desnivelEstimadoPosM: 0,
      },
      null,
      {
        sport: "running",
        titulo: "Regenerativa",
        objetivo: "Z1, 30' trote suave",
        duracionEstimadaSeg: 1800,
        distanciaEstimadaM: 4000,
        desnivelEstimadoPosM: 0,
      },
    ],
  },
  {
    id: "taper-carrera",
    nombre: "Taper pre-carrera",
    descripcion:
      "Semana de descarga antes de una carrera. Reduce volumen, mantén algo de intensidad.",
    dias: [
      null,
      {
        sport: "running",
        titulo: "Rodaje + progresiones",
        objetivo: "40' Z2 + 4x20\" progresivo",
        duracionEstimadaSeg: 3000,
        distanciaEstimadaM: 7000,
        desnivelEstimadoPosM: 0,
      },
      null,
      {
        sport: "running",
        titulo: "Activación",
        objetivo: "30' + 6x100m a ritmo de carrera",
        duracionEstimadaSeg: 2100,
        distanciaEstimadaM: 5000,
        desnivelEstimadoPosM: 0,
      },
      null,
      {
        sport: "running",
        titulo: "Recuperación",
        objetivo: "20' trote muy suave",
        duracionEstimadaSeg: 1200,
        distanciaEstimadaM: 2500,
        desnivelEstimadoPosM: 0,
      },
      null,
      null,
    ],
  },
  {
    id: "volumen-trail",
    nombre: "Volumen trail",
    descripcion:
      "Semana de alto volumen para acumular_DISTANCE/D+. 4 días de trail + 1 fuerza.",
    dias: [
      {
        sport: "trail",
        titulo: "Trail rodaje",
        objetivo: "Z2, 60' continuo",
        duracionEstimadaSeg: 3600,
        distanciaEstimadaM: 10000,
        desnivelEstimadoPosM: 500,
      },
      null,
      {
        sport: "trail",
        titulo: "Trail intervalos",
        objetivo: "5x5' Z4 con bajada",
        duracionEstimadaSeg: 4200,
        distanciaEstimadaM: 12000,
        desnivelEstimadoPosM: 600,
      },
      {
        sport: "running",
        titulo: "Rodaje suave",
        objetivo: "Z2, 45'",
        duracionEstimadaSeg: 2700,
        distanciaEstimadaM: 8000,
        desnivelEstimadoPosM: 0,
      },
      {
        sport: "fuerza",
        titulo: "Fuerza core/piernas",
        objetivo: "Circuito 45'",
        duracionEstimadaSeg: 2700,
        distanciaEstimadaM: 0,
        desnivelEstimadoPosM: 0,
      },
      null,
      {
        sport: "trail",
        titulo: "Tirada larga",
        objetivo: "Z2, 3h mínimo",
        duracionEstimadaSeg: 10800,
        distanciaEstimadaM: 25000,
        desnivelEstimadoPosM: 1200,
      },
    ],
  },
];

// Persistencia de plantillas personalizadas en la tabla meta
const PLANTILLAS_KEY = "plantillas-custom";

export async function getPlantillasCustom(): Promise<PlantillaSemana[]> {
  const rec = await db.meta.get(PLANTILLAS_KEY);
  return (rec?.valor as PlantillaSemana[]) ?? [];
}

export async function savePlantillaCustom(p: PlantillaSemana) {
  const act = await getPlantillasCustom();
  const idx = act.findIndex((x) => x.id === p.id);
  if (idx >= 0) act[idx] = p;
  else act.push(p);
  await db.meta.put({ clave: PLANTILLAS_KEY, valor: act });
}

/** Aplica una plantilla a una semana, eliminando lo planificado previamente. */
export async function aplicarPlantilla(
  plantilla: PlantillaSemana,
  lunes: Date
) {
  // Borrar planificadas de esa semana
  const existentes = await listarSemana(lunes);
  await db.planificadas.bulkDelete(existentes.map((e) => e.id!).filter(Boolean));

  // Agregar las nuevas
  const ahora = Date.now();
  const nuevas: PlannedWorkout[] = [];
  for (let i = 0; i < 7; i++) {
    const dia = plantilla.dias[i];
    if (!dia) continue;
    const fecha = new Date(lunes);
    fecha.setDate(fecha.getDate() + i);
    nuevas.push({
      fecha: formatDateISO(fecha),
      sport: dia.sport,
      titulo: dia.titulo,
      objetivo: dia.objetivo,
      duracionEstimadaSeg: dia.duracionEstimadaSeg,
      distanciaEstimadaM: dia.distanciaEstimadaM,
      desnivelEstimadoPosM: dia.desnivelEstimadoPosM,
      completada: false,
      createdAt: ahora,
      updatedAt: ahora,
    });
  }
  if (nuevas.length > 0) await db.planificadas.bulkAdd(nuevas);
}