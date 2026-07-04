// Helpers de cálculo de elevación y distancia para trazas GPS.

import type { TrackPoint } from "@/lib/types";

const R_TIERRA_M = 6371000;
const toRad = (grados: number) => (grados * Math.PI) / 180;

/** Distancia haversine entre dos puntos GPS en metros. */
export function haversineM(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** Acumula distancia total y desniveles +/- a partir de una secuencia de puntos. */
export function calcularDistanciaYDesnivel(
  puntos: TrackPoint[]
): { distanciaM: number; desnivelPosM: number; desnivelNegM: number } {
  let distanciaM = 0;
  let desnivelPosM = 0;
  let desnivelNegM = 0;
  if (!puntos.length) return { distanciaM, desnivelPosM, desnivelNegM };

  // Distancia
  for (let i = 1; i < puntos.length; i++) {
    distanciaM += haversineM(
      puntos[i - 1].lat,
      puntos[i - 1].lon,
      puntos[i].lat,
      puntos[i].lon
    );
  }

  // Desniveles (con filtro de ruido: solo cuenta cambios > 1m)
  const UMBRAL_RUIDO = 1;
  let elePrev = puntos[0].ele ?? 0;
  for (let i = 1; i < puntos.length; i++) {
    const ele = puntos[i].ele ?? elePrev;
    const diff = ele - elePrev;
    if (Math.abs(diff) < UMBRAL_RUIDO) {
      // ignorar ruido
    } else if (diff > 0) {
      desnivelPosM += diff;
    } else {
      desnivelNegM += -diff;
    }
    elePrev = ele;
  }

  return { distanciaM, desnivelPosM, desnivelNegM };
}