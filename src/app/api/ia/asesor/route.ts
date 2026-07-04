import { NextResponse } from "next/server";
import {
  dividirEnTramos,
  calcularPacingPorTramos,
  calcularPlanNutricion,
} from "@/lib/calculations/trail-pacing";
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

function compactarPerfil(perfil: PuntoElevacion[]) {
  const sampling = Math.max(1, Math.floor(perfil.length / 50));
  return perfil
    .filter((_, i) => i % sampling === 0)
    .map((p) => ({
      d_km: +(p.distanciaM / 1000).toFixed(2),
      elev: Math.round(p.elevacionM),
    }));
}

function resumenTramos(pacingBase: ReturnType<typeof calcularPacingPorTramos>) {
  return pacingBase.map((t) => ({
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
}

function buildPrompt(params: {
  nombreCarrera: string;
  distanciaM: number;
  desnivelPosM: number;
  perfilCompacto: ReturnType<typeof compactarPerfil>;
  ritmoBaseSegKm: number;
  pesoKg?: number;
  fcMax?: number;
  umbralTrailPaceSegKm?: number;
  resumen: ReturnType<typeof resumenTramos>;
  tiempoTotalBase: number;
  planBase: ReturnType<typeof calcularPlanNutricion>;
}) {
  const {
    nombreCarrera,
    distanciaM,
    desnivelPosM,
    perfilCompacto,
    ritmoBaseSegKm,
    pesoKg,
    fcMax,
    umbralTrailPaceSegKm,
    resumen,
    tiempoTotalBase,
    planBase,
  } = params;

  return `Sos un coach experto en Ultra-Trail y carreras de montaña. Asesorá a un runner para "${nombreCarrera}".

DATOS DE LA CARRERA:
- Distancia: ${(distanciaM / 1000).toFixed(2)} km
- Desnivel positivo total: ${desnivelPosM} m

PERFIL DE ELEVACION:
${JSON.stringify(perfilCompacto)}

PERFIL DEL RUNNER:
- Ritmo base llano: ${formatPace(ritmoBaseSegKm)}
- Peso: ${pesoKg ?? "n/d"} kg
- FC max: ${fcMax ?? "n/d"} lpm
- Ritmo umbral trail: ${umbralTrailPaceSegKm ? formatPace(umbralTrailPaceSegKm) : "n/d"}

ESTRATEGIA BASE CALCULADA (GAP):
${JSON.stringify(resumen, null, 2)}
- Tiempo total estimado: ${Math.floor(tiempoTotalBase / 60)} min

Devolvé SOLO JSON valido con esta estructura:
{
  "tramos": [
    {"tramo": 1, "desde_km": 0, "hasta_km": 5, "ritmo_s_km": 360, "rpe_objetivo": 3, "notas": "..."}
  ],
  "tiempo_total_seg": 21600,
  "plan_nutricion": {
    "cho_g_h": 60,
    "total_cho_g": 360,
    "hidratacion_ml_h": 600,
    "total_hidratacion_ml": 3600,
    "geles": 14,
    "sales_mg": 3000,
    "ubicacion_avituallamientos_km": [5, 12, 20, 28],
    "recomendaciones": ["..."],
    "estrategia": "..."
  }
}
Usa español argentino, tuteo, se concreto.`;
}

function formatPace(sKm: number): string {
  if (sKm <= 0) return "n/d";
  const m = Math.floor(sKm / 60);
  const s = sKm % 60;
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function extractJson(text: string): string {
  // Quitar fences markdown (```json ... ```)
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  // Buscar el objeto JSON mas externo
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se encontro JSON en la respuesta de la IA");
  return match[0];
}

function parseIaResponse(text: string) {
  const json = extractJson(text);
  return JSON.parse(json);
}

// ── OLLAMA ──────────────────────────────────────────────
async function asesorOllama(
  apiBase: string,
  model: string,
  prompt: string
): Promise<string | null> {
  const url = `${apiBase}/v1/chat/completions`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Sos un coach de trail running. Respondé UNICAMENTE con el JSON solicitado. " +
            "No agregues saludos, explicaciones ni texto fuera del JSON. " +
            "Empezá directamente con '{' y terminá con '}'.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Ollama error ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? null;
}

// ── GEMINI ─────────────────────────────────────────────
async function asesorGemini(
  apiKey: string,
  model: string,
  prompt: string,
  schema: Record<string, unknown>
): Promise<string | null> {
  const { GoogleGenAI, Type } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const resp = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });
  return resp.text ?? null;
}

// ── MAIN ───────────────────────────────────────────────
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
      { error: "Faltan datos de la carrera" },
      { status: 400 }
    );
  }

  // Baseline determinista (siempre util)
  const numTramos = Math.min(10, Math.max(5, Math.ceil(distanciaM / 5000)));
  const tramos = dividirEnTramos(perfilElevacion, numTramos);
  const pacingBase = calcularPacingPorTramos(tramos, ritmoBaseSegKm);
  const tiempoTotalBase = pacingBase.reduce((a, t) => a + t.tiempoEstimadoSeg, 0);
  const planBase = calcularPlanNutricion(tiempoTotalBase, pesoKg);

  const perfilCompacto = compactarPerfil(perfilElevacion);
  const resumen = resumenTramos(pacingBase);
  const prompt = buildPrompt({
    nombreCarrera,
    distanciaM,
    desnivelPosM,
    perfilCompacto,
    ritmoBaseSegKm,
    pesoKg,
    fcMax,
    umbralTrailPaceSegKm,
    resumen,
    tiempoTotalBase,
    planBase,
  });

  // Gemini schema
  const schema = {
    type: "OBJECT",
    properties: {
      tramos: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            tramo: { type: "NUMBER" },
            desde_km: { type: "NUMBER" },
            hasta_km: { type: "NUMBER" },
            ritmo_s_km: { type: "NUMBER" },
            rpe_objetivo: { type: "NUMBER" },
            notas: { type: "STRING" },
          },
          required: ["tramo", "desde_km", "hasta_km", "ritmo_s_km"],
        },
      },
      tiempo_total_seg: { type: "NUMBER" },
      plan_nutricion: {
        type: "OBJECT",
        properties: {
          cho_g_h: { type: "NUMBER" },
          total_cho_g: { type: "NUMBER" },
          hidratacion_ml_h: { type: "NUMBER" },
          total_hidratacion_ml: { type: "NUMBER" },
          geles: { type: "NUMBER" },
          sales_mg: { type: "NUMBER" },
          ubicacion_avituallamientos_km: {
            type: "ARRAY",
            items: { type: "NUMBER" },
          },
          recomendaciones: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          estrategia: { type: "STRING" },
        },
      },
    },
    required: ["tramos", "tiempo_total_seg", "plan_nutricion"],
  };

  const provider = (process.env.AI_PROVIDER ?? "").toLowerCase();
  let resultText: string | null = null;

  try {
    if (provider === "ollama") {
      const ollamaHost = process.env.OLLAMA_HOST ?? "http://localhost:11434";
      const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
      resultText = await asesorOllama(ollamaHost, ollamaModel, prompt);
    } else if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Falta GEMINI_API_KEY");
      const model = process.env.GEMINI_MODEL_FLASH ?? "gemini-2.0-flash-lite";
      resultText = await asesorGemini(apiKey, model, prompt, schema);
    } else {
      // Sin provider -> baseline
      return NextResponse.json({
        fuente: "determinista",
        mensaje:
          "Modo baseline. Configura AI_PROVIDER=ollama o AI_PROVIDER=gemini en .env para IA.",
        tramos: pacingBase,
        tiempoTotalEstimadoSeg: tiempoTotalBase,
        planNutricion: planBase,
      });
    }

    if (resultText) {
      const parsed = parseIaResponse(resultText);
      return NextResponse.json({
        fuente: provider,
        modelo: process.env.OLLAMA_MODEL ?? process.env.GEMINI_MODEL_FLASH,
        tramosIA: parsed.tramos ?? [],
        tiempoTotalEstimadoSeg: parsed.tiempo_total_seg ?? tiempoTotalBase,
        planNutricionIA: parsed.plan_nutricion ?? null,
        estrategia: parsed.estrategia ?? "",
        tramosBase: pacingBase,
        planBase,
      });
    }

    throw new Error("Respuesta vacia de la IA");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Desconocido";
    console.error(`Error IA (${provider}):`, msg);
    return NextResponse.json(
      {
        fuente: "determinista",
        warning: `No se pudo contactar a ${provider}: ${msg.slice(0, 250)}`,
        tramos: pacingBase,
        tiempoTotalEstimadoSeg: tiempoTotalBase,
        planNutricion: planBase,
      },
      { status: 200 }
    );
  }
}