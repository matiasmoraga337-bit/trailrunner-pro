import { describe, it, expect } from "vitest";
import type { PuntoElevacion } from "@/lib/types";
import {
  dividirEnTramos,
  calcularPacingPorTramos,
  calcularPlanNutricion,
} from "@/lib/calculations/trail-pacing";

function makePerfil(
  totalM: number,
  eleInicial: number,
  eleFinal: number
): PuntoElevacion[] {
  const pts: PuntoElevacion[] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const dist = (totalM / steps) * i;
    const ele = eleInicial + ((eleFinal - eleInicial) * i) / steps;
    pts.push({ distanciaM: Math.round(dist), elevacionM: Math.round(ele) });
  }
  return pts;
}

describe("dividirEnTramos", () => {
  it("divide un perfil de 10 km en 5 tramos", () => {
    const perfil = makePerfil(10000, 0, 500);
    const tramos = dividirEnTramos(perfil, 5);
    expect(tramos.length).toBe(5);
    tramos.forEach((t) => {
      expect(t.longitudM).toBeGreaterThan(0);
      expect(t.factorGAP).toBeGreaterThan(0);
    });
    // La pendiente deberia ser ~5% constante
    tramos.forEach((t) => {
      expect(t.pendientePct).toBeGreaterThan(0);
    });
  });

  it("maneja pendiente negativa", () => {
    const perfil = makePerfil(5000, 500, 0);
    const tramos = dividirEnTramos(perfil, 4);
    expect(tramos.length).toBe(4);
    tramos.forEach((t) => {
      expect(t.pendientePct).toBeLessThan(0);
    });
  });

  it("devuelve array vacio si perfil tiene < 2 puntos", () => {
    const tramos = dividirEnTramos([], 5);
    expect(tramos).toEqual([]);
    const tramos2 = dividirEnTramos(
      [{ distanciaM: 0, elevacionM: 0 }],
      5
    );
    expect(tramos2).toEqual([]);
  });
});

describe("calcularPacingPorTramos", () => {
  it("ajusta el ritmo segun GAP para subida fuerte", () => {
    const perfil = makePerfil(10000, 0, 1500); // +15%
    const tramos = dividirEnTramos(perfil, 5);
    const pacing = calcularPacingPorTramos(tramos, 360); // 6:00 /km
    expect(pacing.length).toBe(5);
    // Con >10% de pendiente, factorGAP = 1.5
    pacing.forEach((p) => {
      // Si la pendiente excede 10%, ritmo ajustado >= 360 * 1.5 = 540
      if (p.pendientePct > 10) {
        expect(p.ritmoAjustadoSegKm).toBeGreaterThanOrEqual(500);
      }
    });
  });

  it("ajusta el ritmo para bajada pronunciada", () => {
    const perfil = makePerfil(5000, 500, 0); // > -10%
    const tramos = dividirEnTramos(perfil, 3);
    const pacing = calcularPacingPorTramos(tramos, 300);
    pacing.forEach((p) => {
      expect(p.ritmoAjustadoSegKm).toBeLessThan(300);
    });
  });

  it("devuelve array vacio si no hay tramos", () => {
    const pacing = calcularPacingPorTramos([], 360);
    expect(pacing).toEqual([]);
  });
});

describe("calcularPlanNutricion", () => {
  it("carrera < 1h: solo hidratacion, sin CHO", () => {
    const p = calcularPlanNutricion(1800); // 30 min
    expect(p.carbohidratosGPorHora).toBe(0);
    expect(p.carbohidratosG).toBe(0);
    expect(p.geles).toBe(0);
    expect(p.hidratacionMl).toBeGreaterThan(0);
    expect(p.recomendaciones.length).toBeGreaterThan(0);
  });

  it("carrera 90 min: 30g CHO/h intermedio", () => {
    const p = calcularPlanNutricion(5400); // 90 min = 1.5 h
    expect(p.carbohidratosGPorHora).toBeGreaterThan(0);
    expect(p.hidratacionMl).toBeGreaterThan(0);
  });

  it("carrera ultra: maxima CHO recomendada", () => {
    const p = calcularPlanNutricion(18000); // 5 h
    expect(p.carbohidratosGPorHora).toBeGreaterThanOrEqual(60);
    expect(p.geles).toBeGreaterThan(2);
    expect(p.salesElectrolitosMg).toBeGreaterThan(0);
    // Debe sugerir avituallamientos
    expect(p.recomendaciones.some((r) => r.includes("avituallamiento"))).toBe(true);
  });

  it("calcula tiempo total estimado", () => {
    const p = calcularPlanNutricion(7200);
    expect(p.tiempoTotalEstimadoSeg).toBe(7200);
  });
});