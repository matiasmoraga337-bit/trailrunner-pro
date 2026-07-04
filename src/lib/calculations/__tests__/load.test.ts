import { describe, it, expect } from "vitest";
import {
  agregarPorSemana,
  calcularCarga,
  calcularCargaSesion,
  getLunes,
} from "@/lib/calculations/load";
import type { WorkoutSession } from "@/lib/types";
import { formatDateISO } from "@/lib/format";

function sesion(
  fecha: string,
  duracionSeg: number,
  rpe: number,
  sport: WorkoutSession["sport"] = "running",
  distanciaM = 0
): WorkoutSession {
  return {
    fecha,
    fechaInicio: `${fecha}T08:00:00`,
    sport,
    tipo: "otra",
    titulo: "Test",
    duracionSeg,
    distanciaM,
    desnivelPosM: 0,
    rpe,
    fuente: "manual",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe("getLunes", () => {
  it("devuelve lunes para una fecha dada", () => {
    // 2026-07-01 es miercoles
    const l = getLunes(new Date("2026-07-01"));
    expect(l.getDay()).toBe(1); // lunes
    expect(formatDateISO(l)).toBe("2026-06-29");
  });
});

describe("calcularCargaSesion", () => {
  it("duracion_min * rpe", () => {
    expect(calcularCargaSesion({ duracionSeg: 3600, rpe: 5 })).toBe(300); // 60 min * 5
  });

  it("usa rpe=5 por defecto si no se indica", () => {
    expect(calcularCargaSesion({ duracionSeg: 1800 })).toBe(150); // 30 min * 5
  });
});

describe("agregarPorSemana", () => {
  it("agrupa sesiones en semanas", () => {
    const sesiones: WorkoutSession[] = [
      sesion("2026-06-29", 3600, 5, "trail", 10000), // lunes semana 1
      sesion("2026-07-01", 1800, 4, "running", 6000), // miercoles semana 1
      sesion("2026-07-06", 5400, 6, "trail", 18000), // lunes semana 2
    ];
    const lunes1 = new Date("2026-06-29");
    const lunes2 = new Date("2026-07-06");
    const semanas = agregarPorSemana(sesiones, lunes1, lunes2);
    expect(semanas.length).toBe(2);
    expect(semanas[0].cuentaSesiones).toBe(2);
    expect(semanas[0].duracionSeg).toBe(5400);
    expect(semanas[1].cuentaSesiones).toBe(1);
    expect(semanas[1].duracionSeg).toBe(5400);
  });

  it("acumula por deporte", () => {
    const sesiones: WorkoutSession[] = [
      sesion("2026-07-06", 3600, 5, "trail", 12000),
      sesion("2026-07-08", 1800, 4, "fuerza", 0),
    ];
    const semanas = agregarPorSemana(
      sesiones,
      new Date("2026-07-06"),
      new Date("2026-07-06")
    );
    expect(semanas[0].porDeporte.trail.cuenta).toBe(1);
    expect(semanas[0].porDeporte.fuerza.cuenta).toBe(1);
  });
});

describe("calcularCarga", () => {
  it("calcula aguda, cronica y ACWR con al menos 4 semanas de datos", () => {
    const hoy = new Date("2026-07-28");
    const sesiones: WorkoutSession[] = [];
    // 4 semanas atras
    for (let d = 0; d < 28; d++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - (27 - d));
      if (d < 21) {
        // primeras 3 semanas: 1 sesion de 60 min rpe 5 = 300 AU
        sesiones.push(sesion(formatDateISO(fecha), 3600, 5));
      }
      if (d >= 21) {
        // ultima semana (dias 21-27): 1 sesion por dia + una extra de 90 min rpe 8
        sesiones.push(sesion(formatDateISO(fecha), 3600, 5));
      }
    }
    // Agrego sesion extra ultima semana
    sesiones.push(sesion(formatDateISO(hoy), 5400, 8)); // 90 min * 8 = 720 AU

    const carga = calcularCarga(sesiones, hoy);
    expect(carga.agudaAU).toBeGreaterThan(0);
    expect(carga.cronicaAU).toBeGreaterThan(0);
    expect(carga.ratioACWR).toBeGreaterThan(0);
    expect(carga.semanasCarga.length).toBeGreaterThanOrEqual(4);
  });
});