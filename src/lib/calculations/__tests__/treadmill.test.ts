import { describe, it, expect } from "vitest";
import {
  calcularDesnivelCinta,
  calcularSesionCinta,
} from "@/lib/calculations/treadmill";
import type { BloqueCinta } from "@/lib/calculations/treadmill";

describe("calcularDesnivelCinta", () => {
  it("devuelve 0 con inclinacion 0%", () => {
    const d = calcularDesnivelCinta({
      tiempoSeg: 600,
      velocidadMs: 3.33,
      inclinacionPct: 0,
    });
    expect(d).toBeCloseTo(0, 1);
  });

  it("calcula D+ para 10 km/h, 3%, 45 min (~270 m)", () => {
    // 12 km/h = 3.33 m/s, 45 min = 2700 s → 9000 m
    const d = calcularDesnivelCinta({
      tiempoSeg: 2700,
      velocidadMs: 12 / 3.6,
      inclinacionPct: 0.03,
    });
    // 9000 * sin(atan(0.03)) ≈ 9000 * 0.02999 ≈ 269.9 m
    expect(d).toBeGreaterThan(260);
    expect(d).toBeLessThan(280);
  });

  it("devuelve negativo para inclinacion negativa (declive)", () => {
    const d = calcularDesnivelCinta({
      tiempoSeg: 600,
      velocidadMs: 3,
      inclinacionPct: -0.05,
    });
    expect(d).toBeLessThan(0);
  });

  it("usa ritmoSegKm como fallback de velocidad", () => {
    // 5:00 min/km = 300 s/km = 3.33 m/s
    const d = calcularDesnivelCinta({
      tiempoSeg: 600,
      ritmoSegKm: 300,
      inclinacionPct: 0.02,
    });
    expect(d).toBeGreaterThan(0);
  });
});

describe("calcularSesionCinta", () => {
  it("suma bloques correctamente", () => {
    const bloques: BloqueCinta[] = [
      { tiempoSeg: 600, velocidadMs: 3, inclinacionPct: 0.02 },
      { tiempoSeg: 600, velocidadMs: 3, inclinacionPct: -0.01 },
      { tiempoSeg: 300, velocidadMs: 4, inclinacionPct: 0.05 },
    ];
    const r = calcularSesionCinta(bloques);

    expect(r.tiempoTotalSeg).toBe(1500);
    expect(r.distanciaTotalM).toBeCloseTo(600 * 3 + 600 * 3 + 300 * 4, 0);
    expect(r.desnivelPosM).toBeGreaterThan(0);
    expect(r.desnivelNegM).toBeGreaterThan(0);
    expect(r.velocidadMediaMs).toBeGreaterThan(0);
    expect(r.ritmoMedioSegKm).toBeGreaterThan(0);
  });

  it("devuelve cero en todo con array vacio", () => {
    const r = calcularSesionCinta([]);
    expect(r.tiempoTotalSeg).toBe(0);
    expect(r.distanciaTotalM).toBe(0);
    expect(r.desnivelPosM).toBe(0);
    expect(r.desnivelNegM).toBe(0);
    expect(r.velocidadMediaMs).toBe(0);
    expect(r.ritmoMedioSegKm).toBe(0);
  });
});