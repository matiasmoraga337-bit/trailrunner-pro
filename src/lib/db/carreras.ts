import { db } from "@/lib/db/db";
import type { Race, PuntoElevacion } from "@/lib/types";
import { parseGpx } from "@/lib/parsers/gpx";
import type { ParsedWorkout } from "@/lib/parsers/common";
import { formatDateISO } from "@/lib/format";

export async function getCarrera(id: number) {
  return db.carreras.get(id);
}

export async function listarCarreras(): Promise<Race[]> {
  const items = await db.carreras.orderBy("createdAt").reverse().toArray();
  return items;
}

export async function deleteCarrera(id: number) {
  // Borrar el GPX raw asociado si existe
  const c = await db.carreras.get(id);
  if (c?.gpxRawId) await db.archivos.delete(c.gpxRawId);
  await db.carreras.delete(id);
}

/**
 * Crea una carrera a partir de un GPX (string o Document).
 * Analiza distancia, D+/D-, perfil de elevacion y lo guarda todo.
 */
export async function crearCarreraDesdeGpx(
  nombre: string,
  fecha: string | undefined,
  gpxTexto: string,
  gpxBlob: Blob
): Promise<number> {
  const parsed: ParsedWorkout | null = parseGpx(gpxTexto);
  if (!parsed) throw new Error("GPX sin trackpoints validos");

  // Guardar blob crudo
  const rawId = await db.archivos.add({
    nombre: `${nombre}.gpx`,
    tipo: "gpx",
    bytes: gpxBlob,
    createdAt: Date.now(),
  });

  // Construir perfil de elevacion: distancia acumulada + elevacion por punto
  const perfilElevacion: PuntoElevacion[] = [];
  let distAcum = 0;
  const pts = parsed.traza;
  if (pts.length > 0) {
    perfilElevacion.push({
      distanciaM: 0,
      elevacionM: pts[0].ele ?? 0,
    });
    for (let i = 1; i < pts.length; i++) {
      // haversine approximado por punti
      const { haversineM } = await import("@/lib/calculations/elevation");
      distAcum += haversineM(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
      perfilElevacion.push({
        distanciaM: Math.round(distAcum),
        elevacionM: pts[i].ele ?? pts[i - 1].ele ?? 0,
      });
    }
  }

  const ahora = Date.now();
  const id = await db.carreras.add({
    nombre,
    fecha,
    distanciaM: parsed.distanciaM,
    desnivelPosM: parsed.desnivelPosM,
    desnivelNegM: parsed.desnivelNegM ?? 0,
    gpxRawId: rawId as number,
    perfilElevacion,
    createdAt: ahora,
  });
  return id as number;
}