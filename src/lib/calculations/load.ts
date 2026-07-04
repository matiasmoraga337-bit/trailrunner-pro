import type { WorkoutSession, Sport } from "@/lib/types";
import { formatDateISO } from "@/lib/format";

/** Obtiene el lunes de la semana de una fecha (la semana empieza el lunes). */
export function getLunes(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = r.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  r.setDate(r.getDate() + diff);
  return r;
}

export interface SemanaAgregada {
  lunes: Date;
  fechaStr: string;
  duracionSeg: number;
  distanciaM: number;
  desnivelPosM: number;
  cuentaSesiones: number;
  porDeporte: Record<Sport, { duracionSeg: number; distanciaM: number; cuenta: number }>;
}

/** Agrega sesiones en ventanas de 7 dias (lun-dom) entre desdeLunes y hastaLunes inclusive. */
export function agregarPorSemana(
  sesiones: WorkoutSession[],
  desdeLunes: Date,
  hastaLunes: Date
): SemanaAgregada[] {
  const semanas: SemanaAgregada[] = [];
  const deportes: Sport[] = ["trail", "running", "cinta", "bici_estatica", "fuerza"];

  for (let l = new Date(desdeLunes); l <= hastaLunes; l.setDate(l.getDate() + 7)) {
    const inicioSem = new Date(l);
    const finSem = new Date(l);
    finSem.setDate(finSem.getDate() + 6);
    const iniStr = formatDateISO(inicioSem);
    const finStr = formatDateISO(finSem);

    const porDeporte = {} as SemanaAgregada["porDeporte"];
    deportes.forEach((s) => {
      porDeporte[s] = { duracionSeg: 0, distanciaM: 0, cuenta: 0 };
    });

    let duracionSeg = 0;
    let distanciaM = 0;
    let desnivelPosM = 0;
    let cuenta = 0;

    for (const s of sesiones) {
      const f = (s.fechaInicio ?? s.fecha).slice(0, 10);
      if (f < iniStr || f > finStr) continue;
      duracionSeg += s.duracionSeg;
      distanciaM += s.distanciaM;
      desnivelPosM += s.desnivelPosM;
      cuenta++;
      if (porDeporte[s.sport]) {
        porDeporte[s.sport].duracionSeg += s.duracionSeg;
        porDeporte[s.sport].distanciaM += s.distanciaM;
        porDeporte[s.sport].cuenta++;
      }
    }

    semanas.push({
      lunes: new Date(inicioSem),
      fechaStr: iniStr,
      duracionSeg,
      distanciaM,
      desnivelPosM,
      cuentaSesiones: cuenta,
      porDeporte,
    });
  }
  return semanas;
}

/**
 * Carga de entrenamiento (sRPE-TL de Foster): duracion en min x RPE.
 * Si no hay RPE, usa un valor por defecto de 5 (esfuerzo moderado).
 */
export function calcularCargaSesion(s: { duracionSeg: number; rpe?: number }): number {
  const min = s.duracionSeg / 60;
  return min * (s.rpe ?? 5);
}

export interface CargaResumen {
  agudaAU: number; // suma de los ultimos 7 dias
  cronicaAU: number; // media de las ultimas 4 semanas
  ratioACWR: number; // aguda / cronica
  semanasCarga: { lunes: Date; cargaAU: number }[];
}

/** Calcula carga aguda, cronica y ratio ACWR (modelo de Foster). */
export function calcularCarga(sesiones: WorkoutSession[], hoy: Date): CargaResumen {
  const lunesHace28 = getLunes(new Date(hoy.getTime() - 27 * 86400000));
  const lunesActual = getLunes(hoy);

  const semanasCarga: { lunes: Date; cargaAU: number }[] = [];

  for (let l = new Date(lunesHace28); l <= lunesActual; l.setDate(l.getDate() + 7)) {
    const iniStr = formatDateISO(l);
    const fin = new Date(l);
    fin.setDate(fin.getDate() + 6);
    const finStr = formatDateISO(fin);

    let carga = 0;
    for (const s of sesiones) {
      const f = (s.fechaInicio ?? s.fecha).slice(0, 10);
      if (f >= iniStr && f <= finStr) carga += calcularCargaSesion(s);
    }
    semanasCarga.push({ lunes: new Date(l), cargaAU: Math.round(carga) });
  }

  // Carga aguda = ultima semana (la actual)
  const aguda = semanasCarga.length > 0 ? semanasCarga[semanasCarga.length - 1].cargaAU : 0;

  // Carga cronica = promedio de las ultimas 4 semanas (incluida la actual)
  const ultimas4 = semanasCarga.slice(-4);
  const cronicaTotal = ultimas4.reduce((a, x) => a + x.cargaAU, 0);
  const cronicaAU = ultimas4.length > 0 ? Math.round(cronicaTotal / ultimas4.length) : 0;
  const ratioACWR = cronicaAU > 0 ? aguda / cronicaAU : 0;

  return { agudaAU: aguda, cronicaAU, ratioACWR, semanasCarga };
}