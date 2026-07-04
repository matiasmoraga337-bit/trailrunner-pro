import { db } from "@/lib/db/db";
import type { WorkoutSession, Sport } from "@/lib/types";
import { formatDateISO } from "@/lib/format";

export async function getSesion(id: number) {
  return db.sesiones.get(id);
}

export async function saveSesion(data: Omit<WorkoutSession, "id" | "createdAt" | "updatedAt">) {
  const ahora = Date.now();
  const id = await db.sesiones.add({
    ...data,
    createdAt: ahora,
    updatedAt: ahora,
  });
  return id;
}

export async function updateSesion(id: number, cambios: Partial<WorkoutSession>) {
  await db.sesiones.update(id, { ...cambios, updatedAt: Date.now() });
}

export async function deleteSesion(id: number) {
  await db.sesiones.delete(id);
}

/** Lista sesiones en un rango de fechas (inclusive), opcionalmente filtradas por deporte. */
export async function listarSesiones(
  desde: Date,
  hasta: Date,
  sport?: Sport
): Promise<WorkoutSession[]> {
  const desdeStr = formatDateISO(desde);
  const hastaStr = formatDateISO(hasta);
  const coleccion = db.sesiones
    .where("fecha")
    .between(desdeStr, hastaStr, true, true);
  let items = await coleccion.toArray();
  if (sport) items = items.filter((s) => s.sport === sport);
  // Más recientes primero
  items.sort((a, b) => (b.fechaInicio ?? b.fecha).localeCompare(a.fechaInicio ?? a.fecha));
  return items;
}

/** Lista todas las sesiones ordenadas por fecha desc. */
export async function listarTodas(): Promise<WorkoutSession[]> {
  const items = await db.sesiones.orderBy("fecha").reverse().toArray();
  return items;
}