# TrailRunner Pro

PWA de registro, planificación y análisis de entrenamientos orientada a trail running.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4** + **shadcn/ui**
- **Dexie** (IndexedDB) — persistencia 100% local, sin backend
- **Zustand** + **Dexie React Hooks** para estado
- **Recharts**, **MapLibre GL**, **react-hook-form** + **zod**, **@dnd-kit**, **react-dropzone**, **date-fns**
- **@google/genai** (Gemini) para asesor de carreras (modelo por defecto `gemini-2.0-flash`, opcional `gemini-2.5-pro`)
- **@mapbox/togeojson** (GPX) y **fit-decoder** (FIT de Suunto)
- **Docker** + **docker-compose** para desarrollo y producción

## Comandos

```bash
# Desarrollo local (sin Docker)
npm run dev          # http://localhost:3000
npm run build        # build de producción
npm start            # servir build de producción
npm run lint         # ESLint
# Typecheck (no hay script dedicado): npx tsc --noEmit
```

```bash
# Con Docker
docker compose up trailrunner-dev      # dev con hot reload en :3000
docker compose up trailrunner          # producción en :3001 (requiere build previo)
docker compose build trailrunner       # construir imagen de producción
```

## Configuración

- Copiar `.env.example` a `.env.local` y completar `GEMINI_API_KEY` (gratis en https://aistudio.google.com/apikey). La app funciona sin la key (asesor determinista de fallback).
- Unidades: SI (km, m, kg, °C). Idioma: Español.

## Estructura

```
src/
  app/                # Rutas (App Router)
    entrenamientos/   # Histórico y registro manual
    semana/           # Planificador semanal (drag-drop)
    importar/         # Subida FIT/GPX (Suunto)
    carreras/         # Análisis GPX + asesor IA
    ajustes/          # Perfil de usuario y zonas
  components/
    ui/               # shadcn/ui
  lib/
    types.ts          # Tipos del dominio
    db/db.ts          # Esquema Dexie (IndexedDB)
    parsers/          # gpx.ts, fit.ts
    calculations/     # treadmill.ts (D+ cinta), trail-pacing.ts, nutrition.ts
    ai/               # asesor.ts (Gemini + prompts)
```

## Notas

- Los datos viven en IndexedDB del navegador; no hay sincronización entre dispositivos.
- Importación de Suunto: de a un archivo FIT/GPX a la vez.
- Repo: GitHub público. No commitear `.env.local`.