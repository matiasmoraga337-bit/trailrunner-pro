import { describe, it, expect } from "vitest";
import {
  haversineM,
  calcularDistanciaYDesnivel,
} from "@/lib/calculations/elevation";
import type { TrackPoint } from "@/lib/types";

describe("haversineM", () => {
  it("devuelve ~0 para el mismo punto", () => {
    const d = haversineM(0, 0, 0, 0);
    expect(d).toBeCloseTo(0, 0);
  });

  it("aprox 111 km entre 0,0 y 1,0 (ecuador)", () => {
    const d = haversineM(0, 0, 1, 0);
    // ~111320 m
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it("aprox 111 km en latitud = 0 entre 0,0 y 0,1 en long", () => {
    const d = haversineM(0, 0, 0, 1);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it("distancia a 60 grados de latitud es ~la mitad (cos 60 = 0.5)", () => {
    const dEquator = haversineM(0, 0, 0, 1);
    const dLat60 = haversineM(60, 0, 60, 1);
    const ratio = dLat60 / dEquator;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });
});

describe("calcularDistanciaYDesnivel", () => {
  it("devuelve 0 para array vacio", () => {
    const r = calcularDistanciaYDesnivel([]);
    expect(r.distanciaM).toBe(0);
    expect(r.desnivelPosM).toBe(0);
    expect(r.desnivelNegM).toBe(0);
  });

  it("acumula distancia y desniveles en 4 puntos", () => {
    const pts: TrackPoint[] = [
      { lat: 0, lon: 0, ele: 0 },
      { lat: 0.001, lon: 0, ele: 50 },
      { lat: 0.002, lon: 0, ele: 120 },
      { lat: 0.003, lon: 0, ele: 100 },
    ];
    const r = calcularDistanciaYDesnivel(pts);
    expect(r.distanciaM).toBeGreaterThan(330);
    expect(r.distanciaM).toBeLessThan(340);
    expect(r.desnivelPosM).toBe(120); // 0→50 (+50) + 50→120 (+70)
    expect(r.desnivelNegM).toBe(20);  // 120→100 (−20)
  });

  it("acumula todos los cambios sin filtrar (umbral=0)", () => {
    const pts: TrackPoint[] = [
      { lat: 0, lon: 0, ele: 100 },
      { lat: 0.001, lon: 0, ele: 100.5 },
      { lat: 0.002, lon: 0, ele: 99.2 },
      { lat: 0.003, lon: 0, ele: 100 },
    ];
    const r = calcularDistanciaYDesnivel(pts);
    // 100->100.5: +0.5, 100.5->99.2: -1.3, 99.2->100: +0.8
    expect(r.desnivelPosM).toBeCloseTo(1.3, 1);
    expect(r.desnivelNegM).toBeCloseTo(1.3, 1);
  });
});