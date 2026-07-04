// Calculos deterministas de pacing por tramos y nutricion.
// Usados como fallback cuando no hay API key de Gemini, o como baseline
// que el modelo refina.

import type { PuntoElevacion } from "@/lib/types";

// Coeficiente NaISMITH + ajuste para trail:
// Fórmula base: 60 min por cada 5 km + 60 min por cada 600 m de D+.
// Ajuste trail-running: +10% sobre terreno técnico.
// GAP (Grade-Adjusted Pace) por pendiente (en %):
//   - Subida > 10%: 1.5x del ritmo base
//   - Subida 5-10%: 1.2x
//   - Subida 0-5%: 1.05x
//   - Bajada > -10%: 0.7x (pera cuidado: técnico en trail)
//   - Bajada -5 a -10%: 0.85x
//   - Bajada 0 a -5%: 0.95x

export interface Tramo {
  index: number;
  nombre: string; // "Tramo 1"
  inicioM: number;
  finM: number;
  longitudM: number;
  elevacionInicialM: number;
  elevacionFinalM: number;
  pendientePct: number;
  factorGAP: number; // multiplicadores sobre ritmo base
}

// Divide el perfil en N tramos equidistantes en distancia.
export function dividirEnTramos(
  perfil: PuntoElevacion[],
  numTramos: number
): Tramo[] {
  if (perfil.length < 2 || numTramos < 1) return [];
  const totalM = perfil[perfil.length - 1].distanciaM;
  if (totalM <= 0) return [];
  const paso = totalM / numTramos;
  const tramos: Tramo[] = [];

  for (let i = 0; i < numTramos; i++) {
    const inicioM = Math.round(i * paso);
    const finM = Math.round((i + 1) * paso);
    const eleInicio = interpolarEle(perfil, inicioM);
    const eleFin = interpolarEle(perfil, finM);
    const pendientePct = finM > inicioM ? ((eleFin - eleInicio) / (finM - inicioM)) * 100 : 0;
    const factorGAP = calcularFactorGAP(pendientePct);
    tramos.push({
      index: i,
      nombre: `Tramo ${i + 1}`,
      inicioM,
      finM,
      longitudM: finM - inicioM,
      elevacionInicialM: eleInicio,
      elevacionFinalM: eleFin,
      pendientePct,
      factorGAP,
    });
  }
  return tramos;
}

function interpolarEle(perfil: PuntoElevacion[], distanciaM: number): number {
  if (perfil.length === 0) return 0;
  if (distanciaM <= perfil[0].distanciaM) return perfil[0].elevacionM;
  if (distanciaM >= perfil[perfil.length - 1].distanciaM)
    return perfil[perfil.length - 1].elevacionM;
  // Buscar punto más cercano
  for (let i = 1; i < perfil.length; i++) {
    if (perfil[i].distanciaM >= distanciaM) {
      const a = perfil[i - 1];
      const b = perfil[i];
      const span = b.distanciaM - a.distanciaM || 1;
      const t = (distanciaM - a.distanciaM) / span;
      return a.elevacionM + t * (b.elevacionM - a.elevacionM);
    }
  }
  return 0;
}

function calcularFactorGAP(pendientePct: number): number {
  // pendientePct = (eleFinal - eleInicial) / longitud * 100
  if (pendientePct > 10) return 1.5;
  if (pendientePct > 5) return 1.2;
  if (pendientePct > 0) return 1.05;
  if (pendientePct > -5) return 0.95;
  if (pendientePct > -10) return 0.85;
  return 0.7; // > -10% (bajada fuerte, terreno técnico reduce ganancia)
}

export interface PacingTramo extends Tramo {
  ritmoBaseSegKm: number; // ritmo objetivo base (entrada del usuario)
  ritmoAjustadoSegKm: number; // ritmo ajustado por GAP
  tiempoEstimadoSeg: number; // tiempo estimado para el tramo
}

/**
 * Estrategia de pacing: aplica el modelo de GAP sobre el ritmo base del usuario.
 * ritmoBaseSegKm = ritmo objetivo en llano (velocidad de carrera objetivo promedio).
 */
export function calcularPacingPorTramos(
  tramos: Tramo[],
  ritmoBaseSegKm: number
): PacingTramo[] {
  return tramos.map((t) => {
    const ritmoAjustado = ritmoBaseSegKm * t.factorGAP;
    const km = t.longitudM / 1000;
    const tiempoEstimadoSeg = Math.round(ritmoAjustado * km);
    return {
      ...t,
      ritmoBaseSegKm,
      ritmoAjustadoSegKm: Math.round(ritmoAjustado),
      tiempoEstimadoSeg,
    };
  });
}

// --- Nutrición ---

export interface PlanNutricion {
  tiempoTotalEstimadoSeg: number;
  carbohidratosG: number; // total
  carbohidratosGPorHora: number; // g/h
  hidratacionMl: number; // total
  hidratacionMlPorHora: number; // ml/h
  geles: number; // cantidad aprox
  salesElectrolitosMg: number; // total sodio aprox
  recomendaciones: string[];
}

/**
 * Plan de nutricion/hidratacion segun duracion estimada.
 * Basado en recomendaciones estándar de trail running:
 *   - < 60 min: solo agua
 *   - 60-90 min: 30g CHO/h
 *   - 90-180 min: 60g CHO/h
 *   - > 180 min: 60-90g CHO/h
 *   - hidratacion: 400-800 ml/h segun temperatura/sudor
 *   -sales: 300-700 mg sodio/h (>2h)
 */
export function calcularPlanNutricion(
  tiempoTotalEstimadoSeg: number,
  pesoKg: number = 70
): PlanNutricion {
  const horas = tiempoTotalEstimadoSeg / 3600;
  let choPorHora = 0;
  let hidratacionPorHora = 0;
  const horasHydrationBase = 500;
  let salesPorHora = 0;
  const recomendaciones: string[] = [];

  if (horas > 2.5) {
    choPorHora = Math.min(90, Math.round(30 + (horas - 1) * 15));
    hidratacionPorHora = 600;
    salesPorHora = 500;
    recomendaciones.push(
      `Carrera larga (${horas.toFixed(1)} h): apuntá a ${choPorHora} g/h de carbohidratos.`
    );
    recomendaciones.push(
      "Combiná geles (25-30g CHO) + bebida deportiva (6-8% CHO). Empezá a comer desde el minuto 45."
    );
    recomendaciones.push(
      `${hidratacionPorHora} ml/h de líquido. Si día caluroso, sumá 100-200 ml/h.`
    );
    recomendaciones.push(
      `${salesPorHora} mg/h de sodio (1 cápsula electrolito/hora).`
    );
  } else if (horas > 1.5) {
    choPorHora = 45;
    hidratacionPorHora = 500;
    salesPorHora = 300;
    recomendaciones.push(
      `Carrera media (${horas.toFixed(1)} h): ${choPorHora} g/h de carbohidratos (gel cada 30-40 min).`
    );
    recomendaciones.push(`${hidratacionPorHora} ml/h + ${salesPorHora} mg/h sodio.`);
  } else if (horas > 1) {
    choPorHora = 30;
    hidratacionPorHora = 400;
    recomendaciones.push(
      `Carrera corta (${horas.toFixed(1)} h): ${choPorHora} g/h de carbohidratos (gel opcional).`
    );
  } else {
    hidratacionPorHora = 400;
    recomendaciones.push("Carrera < 1 h: agua suficiente. Hidratación normal pre-carrera.");
  }

  const carbohidratosG = Math.round(choPorHora * horas);
  const hidratacionMl = Math.round(hidratacionPorHora * horas);
  const geles = Math.ceil(carbohidratosG / 25);
  const salesElectrolitosMg = Math.round(salesPorHora * horas);

  // Puntos de avituallamiento: 1 cada ~30-45 min para carreras > 90 min
  if (horas > 1.5) {
    const numAvituallamientos = Math.max(1, Math.floor(horas / 0.66));
    recomendaciones.push(
      `Pensá en ${numAvituallamientos} punto(s) de avituallamiento a lo largo de la ruta (aprox cada 30-45 min).`
    );
  }

  return {
    tiempoTotalEstimadoSeg: Math.round(tiempoTotalEstimadoSeg),
    carbohidratosG,
    carbohidratosGPorHora: choPorHora,
    hidratacionMl,
    hidratacionMlPorHora: hidratacionPorHora,
    geles,
    salesElectrolitosMg,
    recomendaciones,
  };
}