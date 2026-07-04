/**
 * Cálculo de desnivel positivo (D+) en trotadora / cinta.
 *
 * La inclinación de la cinta se expresa como porcentaje (grade):
 *   inclinacionPct = 0.03 significa 3%.
 * El desnivel vertical ascendido es:
 *   desnivelMetros = distancia * sin(theta)
 * donde theta = arctan(inclinacionPct).
 * Usamos arctan (no aproximación lineal) para mayor precisión con
 * inclinaciones altas (>10%).
 *
 * Alternativamente, d = distancia * tan(theta) también es válido porque
 * distancia horizontal = distancia_cinta * cos(theta), y
 * desnivel = distancia_horizontal * tan(theta) = distancia_cinta * sin(theta).
 */

export interface BloqueCinta {
  tiempoSeg: number;
  velocidadMs?: number; // Si se conoce velocidad directamente
  ritmoSegKm?: number; // o ritmo en s/km
  inclinacionPct: number; // ej: 0.01 = 1%
}

export interface ResultadoCinta {
  tiempoTotalSeg: number;
  distanciaTotalM: number;
  desnivelPosM: number;
  desnivelNegM: number;
  velocidadMediaMs: number;
  ritmoMedioSegKm: number;
}

const ritmoToVelocidadMs = (ritmoSegKm: number): number =>
  ritmoSegKm > 0 ? 1000 / ritmoSegKm : 0;

export function calcularDesnivelCinta(bloque: BloqueCinta): number {
  const velocidadMs =
    bloque.velocidadMs ?? (bloque.ritmoSegKm ? ritmoToVelocidadMs(bloque.ritmoSegKm) : 0);
  const distanciaM = velocidadMs * bloque.tiempoSeg;
  const theta = Math.atan(bloque.inclinacionPct);
  const desnivel = distanciaM * Math.sin(theta);
  return desnivel; // positivo si inclinación > 0, negativo si declive
}

export function calcularSesionCinta(bloques: BloqueCinta[]): ResultadoCinta {
  let tiempoTotalSeg = 0;
  let distanciaTotalM = 0;
  let desnivelPosM = 0;
  let desnivelNegM = 0;

  for (const b of bloques) {
    const velocidadMs =
      b.velocidadMs ?? (b.ritmoSegKm ? ritmoToVelocidadMs(b.ritmoSegKm) : 0);
    const distanciaM = velocidadMs * b.tiempoSeg;
    const desnivel = calcularDesnivelCinta(b);

    tiempoTotalSeg += b.tiempoSeg;
    distanciaTotalM += distanciaM;
    if (desnivel > 0) desnivelPosM += desnivel;
    else desnivelNegM += -desnivel; // acumulamos como valor positivo
  }

  const velocidadMediaMs = tiempoTotalSeg > 0 ? distanciaTotalM / tiempoTotalSeg : 0;
  const ritmoMedioSegKm = velocidadMediaMs > 0 ? 1000 / velocidadMediaMs : 0;

  return {
    tiempoTotalSeg,
    distanciaTotalM,
    desnivelPosM,
    desnivelNegM,
    velocidadMediaMs,
    ritmoMedioSegKm,
  };
}