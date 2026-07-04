import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { dividirEnTramos, calcularPacingPorTramos, calcularPlanNutricion, type PacingTramo } from "@/lib/calculations/trail-pacing";
import type { PuntoElevacion } from "@/lib/types";

export const runtime = "nodejs";

interface AsesorRequest {
  nombreCarrera: string;
  distanciaM: number;
  desnivelPosM: number;
  perfilElevacion: PuntoElevacion[];
  ritmoBaseSegKm: number;
  pesoKg?: number;
  fcMax?: number;
  umbralTrailPaceSegKm?: number;
}

export async function POST(req: Request) {
  let body: AsesorRequest;
  try {
    body = (await req.json()) as AsesorRequest;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const {
    nombreCarrera,
    distanciaM,
    desnivelPosM,
    perfilElevacion,
    ritmoBaseSegKm,
    pesoKg,
    fcMax,
    umbralTrailPaceSegKm,
  } = body;

  if (!perfilElevacion?.length || distanciaM <= 0) {
    return NextResponse.json(
      { error: "Faltan datos de la carrera (perfil/datos)." },
      { status: 400 }
    );
  }

  // Calcular baseline determinista (siempre util)
  const numTramos = Math.min(10, Math.max(5, Math.ceil(distanciaM / 5000)));
  const tramos = dividirEnTramos(perfilElevacion, numTramos);
  const pacingBase = calcularPacingPorTramos(tramos, ritmoBaseSegKm);
  const tiempoTotalBase = pacingBase.reduce((a, t) => a + t.tiempoEstimadoSeg, 0);
  const planBase = calcularPlanNutricion(tiempoTotalBase, pesoKg);

  // Sin API key -> devolver baseline
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      fuente: "determinista",
      mensaje:
        "Modo baseline (sin GEMINI_API_KEY). Definí la key en .env.local para asesoramiento personalizado con IA.",
      tramos: pacingBase,
      tiempoTotalEstimadoSeg: tiempoTotalBase,
      planNutricion: planBase,
    });
  }

  // ---Asesor IA con Gemini ---
  const modelo = process.env.GEMINI_MODEL_FLASH ?? "gemini-2.0-flash";

  // Preparar perfil compacto (muestreo reducido, no pasar todo)
  const sampling = Math.max(1, Math.floor(perfilElevacion.length / 50));
  const perfilCompacto = perfilElevacion
    .filter((_, i) => i % sampling === 0)
    .map((p) => ({ d_km: +(p.distanciaM / 1000).toFixed(2), elev: Math.round(p.elevacionM) }));

  const resumenTramos = pacingBase.map((t) => ({
    tramo: t.index + 1,
    desde_km: +(t.inicioM / 1000).toFixed(1),
    hasta_km: +(t.finM / 1000).toFixed(1),
    longitud_m: t.longitudM,
    pendiente_pct: +t.pendientePct.toFixed(1),
    elev_inicio_m: Math.round(t.elevacionInicialM),
    elev_fin_m: Math.round(t.elevacionFinalM),
    ritmo_ajustado_s_km: t.ritmoAjustadoSegKm,
    tiempo_estimado_seg: t.tiempoEstimadoSeg,
  }));

  const prompt = `Sos un coach experto en Ultra-Trail y carreras de montaña. Un runner pidió asesoramiento para la carrera "${nombreCarrera}".

DATOS DE LA CARRERA:
- Distancia: ${(distanciaM / 1000).toFixed(2)} km
- Desnivel positivo total: ${desnivelPosM} m

PERFIL DE ELEVACIÓN (distancia en km, elevación en m):
${JSON.stringify(perfilCompacto)}

PERFIL DEL RUNNER:
- Ritmo base objetivo en llano: ${ritmoBaseSegKm} s/km (${Math.floor(ritmoBaseSegKm / 60)}:${String(ritmoBaseSegKm % 60).padStart(2, "0")} /km)
- Peso: ${pesoKg ?? "n/d"} kg
- FC max: ${fcMax ?? "n/d"} lpm
- Ritmo umbral trail: ${umbralTrailPaceSegKm ? `${umbralTrailPaceSegKm} s/km` : "n/d"}

ESTRATEGIA BASE YA CALCULADA (baseline determinista, Hicks-GAP):
${JSON.stringify(resumenTramos, null, 2)}
- Tiempo total estimado base: ${Math.floor(tiempoTotalBase / 60)} min
- Plan de nutrición base: ${JSON.stringify(planBase)}

TAREA:
Refiná y personalizá esta estrategia. Devuelve:
1. Un pacing ajustado por tramo (puede modificar el ritmo de cada tramo según pendiente, altitud, fatiga acumulada, etc.).
2. Un plan de nutrición/hidratación más detallado (geles, bebida, electrolitos, ubicación de avituallamientos según km de la ruta).
3. Una nota corta con estrategia de carrera (clientes, ritmo temperatura, conservación).

Usá lenguaje en español argentino (tuteo). Sé concreto y práctico.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      tramos: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            tramo: { type: Type.NUMBER },
            desde_km: { type: Type.NUMBER },
            hasta_km: { type: Type.NUMBER },
            ritmo_s_km: { type: Type.NUMBER },
            rpe_objetivo: { type: Type.NUMBER },
            notas: { type: Type.STRING },
          },
          required: ["tramo", "desde_km", "hasta_km", "ritmo_s_km"],
        },
      },
      tiempo_total_seg: { type: Type.NUMBER },
      plan_nutricion: {
        type: Type.OBJECT,
        properties: {
          cho_g_h: { type: Type.NUMBER },
          total_cho_g: { type: Type.NUMBER },
          hidratacion_ml_h: { type: Type.NUMBER },
          total_hidratacion_ml: { type: Type.NUMBER },
          geles: { type: Type.NUMBER },
          sales_mg: { type: Type.NUMBER },
          ubicacion_avituallamientos_km: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
          },
          recomendaciones: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      },
      estrategia: { type: Type.STRING },
    },
    required: ["tramos", "tiempo_total_seg", "plan_nutricion"],
  };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const resp = await ai.models.generateContent({
      model: modelo,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = resp.text;
    if (!text) throw new Error("Respuesta vacía de Gemini");
    const parsed = JSON.parse(text);

    return NextResponse.json({
      fuente: "gemini",
      modelo,
      tramosIA: parsed.tramos ?? [],
      tiempoTotalEstimadoSeg: parsed.tiempo_total_seg ?? tiempoTotalBase,
      planNutricionIA: parsed.plan_nutricion ?? null,
      estrategia: parsed.estrategia ?? "",
      tramosBase: pacingBase,
      planBase,
    });
  } catch (e) {
    console.error("Error Gemini:", e);
    return NextResponse.json(
      {
        fuente: "determinista",
        warning:
          "No se pudo contactar a Gemini: " + (e instanceof Error ? e.message : "?"),
        tramos: pacingBase,
        tiempoTotalEstimadoSeg: tiempoTotalBase,
        planNutricion: planBase,
      },
      { status: 200 }
    );
  }
}