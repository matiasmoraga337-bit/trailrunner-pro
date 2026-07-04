import { db, AJUSTES_ID } from "@/lib/db/db";
import type { AjustesUsuario } from "@/lib/types";

/** Lee los ajustes del usuario (singleton). Devuelve null si no existen aún. */
export async function getAjustes(): Promise<AjustesUsuario | undefined> {
  return db.ajustes.get(AJUSTES_ID);
}

/** Guarda (crea o actualiza) los ajustes del usuario con id = 1. */
export async function saveAjustes(
  data: Omit<AjustesUsuario, "id" | "updatedAt">
): Promise<number> {
  const ahora = Date.now();
  await db.ajustes.put({
    ...data,
    id: AJUSTES_ID,
    updatedAt: ahora,
  });
  return AJUSTES_ID;
}

/** Calcula las zonas de FC (5 zonas) basadas en FCmax y FC de reposo. */
export function calcularZonasFc(
  fcMax: number,
  fcRepo: number
): { zona: number; nombre: string; rangoFc: [number, number] }[] {
  // Modelo Karvonen (reserva de FC) con límites típicos:
  // Z1 regenerativa 50-60%, Z2 aeróbica 60-70%, Z3 tempo 70-80%, Z4 umbral 80-90%, Z5 VO2max 90-100%
  const porcentajes: { zona: number; nombre: string; inf: number; sup: number }[] = [
    { zona: 1, nombre: "Regenerativa", inf: 0.5, sup: 0.6 },
    { zona: 2, nombre: "Aeróbica", inf: 0.6, sup: 0.7 },
    { zona: 3, nombre: "Tempo", inf: 0.7, sup: 0.8 },
    { zona: 4, nombre: "Umbral", inf: 0.8, sup: 0.9 },
    { zona: 5, nombre: "VO2max", inf: 0.9, sup: 1.0 },
  ];
  const reserva = fcMax - fcRepo;
  return porcentajes.map((p) => ({
    zona: p.zona,
    nombre: p.nombre,
    rangoFc: [
      Math.round(fcRepo + reserva * p.inf),
      Math.round(fcRepo + reserva * p.sup),
    ],
  }));
}