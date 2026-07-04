# ⛰ TrailRunner Pro

PWA de **registro, planificación y análisis de entrenamientos** orientada a trail running, con soporte para running, cinta, bici estática y fuerza. Importá sesiones de tu reloj **Suunto Race S** y recibí **asesoramiento de carreras con IA** (Gemini): pacing por tramos y plan de nutrición/hidratación.

Incluso sin internet: los datos viven en tu navegador (IndexedDB) y la app es instalable como PWA offline-first.

---

## ✨ Funcionalidades

### Dashboard
- KPIs semanales (duración, distancia, D+, sesiones) con variación % vs. semana anterior.
- **Carga de entrenamiento (ACWR de Foster)**: ratio aguda/crónica con semaforización (equilibrado / atención / riesgo alto / en descarga).
- Gráficos de volumen por semana (distancia + D+) y distribución por deporte.

### Registro manual (`/entrenamientos/nuevo`)
Formularios específicos por deporte:
- **Trail / Running**: distancia, D+/D−, FC, ritmo, RPE, notas.
- **Cinta / Trotadora**: bloques con velocidad (km/h) o ritmo (s/km) + inclinación %; **desnivel + calculado automáticamente** con la fórmula `arctan` (precisa incluso con inclinaciones altas).
- **Bici estática**: potencia, cadencia, FC.
- **Fuerza**: ejercicios libres ( Nombre; Series×Reps;Peso ) por línea.

Histórico en `/entrenamientos` con filtros por deporte y rango de fechas, edición y borrado de sesiones.

### Importación Suunto (`/importar`)
Subí de a un archivo **.FIT o .GPX** exportado desde tu Suunto Race S:
- Vista previa de métricas antes de guardar (duración, distancia, D+, D−, FC, potencia, calorías, puntos GPS, laps).
- El archivo crudo se conserva en IndexedDB por si querés volver a procesarlo.
- Mapeo automático de `sport`/`sub_sport` del FIT a nuestras categorías (trail, running, cinta, bici, fuerza).

### Planificador semanal (`/semana`)
- Calendario Lun-Dom con **drag-and-drop** (arrastrás entrenamientos entre días).
- **Plantillas predefinidas**: "Semana base trail", "Taper pre-carrera", "Volumen trail".
- **Comparativa plan vs. hecho** en vivo: duración, distancia y D+ totales.
- Modal para planificar cada día (deporte, objetivo, estimados) y marcar como completado.

### Carreras + asesor IA (`/carreras`)
- Subí el **GPX** de la ruta: se analiza distancia, D+/D−, ratio D+/km y perfil de elevación.
- **Asesor con Gemini 2.0-flash** (configurable a 2.5-pro):
  - **Pacing por tramos**: ritmo objetivo por tramo según pendiente, perfil del corredor y fatiga acumulada.
  - **Plan de nutrición/hidratación**: carbohidratos g/h, geles, hidratación ml/h, sales, ubicación de avituallamientos.
  - **Estrategia** de carrera en texto libre (conservación, gestión de calor, etc.).
  - **Fallback determinista**: sin `GEMINI_API_KEY`, igual te entrega un plan baseline basado en GAP (Grade-Adjusted Pace) y fórmulas estándar de nutrición para trail.

### Ajustes (`/ajustes`)
Perfil del usuario (peso, edad, altura, FC máx, FC reposo, FTP bici, ritmo umbral trail). **Zonas de FC calculadas en vivo** con el modelo de Karvonen (reserva de FC, 5 zonas).

### PWA
- Instalable desde el navegador (manifest + íconos maskable).
- **Service worker offline-first**: assets y páginas cacheadas, navegación sin conexión.
- Sin backend, sin login, sin nube: solo vos y tu navegador.

---

## 🧱 Stack

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) + **TypeScript** |
| Estilos | **Tailwind CSS v4** + **shadcn/ui** (base-nova) |
| Estado | **Zustand** + **Dexie React Hooks** (`useLiveQuery`) |
| Formularios | **react-hook-form** + **zod** |
| Persistencia | **Dexie** (IndexedDB) — 100% local |
| Gráficos | **Recharts** (barras, líneas, área, pie) |
| Drag-and-drop | **@dnd-kit/core** |
| Subida archivos | **react-dropzone** |
| Fechas | **date-fns** + Intl (formateadores SI en español) |
| Parsers | **@mapbox/togeojson** (GPX) + **fit-decoder** (FIT Suunto) |
| IA | **@google/genai** → Gemini 2.0-flash / 2.5-pro |
| PWA | Manifest + Service Worker custom (offline-first) |
| Contenerización | **Docker** (multi-stage dev/prod) + **docker-compose** |

---

## 🚀 Comandos

### Sin Docker (desarrollo local)

```bash
npm install
npm run dev          # http://localhost:3000 (hot reload)
npm run build        # build de producción
npm start            # servir build de producción
npm run lint         # ESLint
npx tsc --noEmit     # typecheck
```

### Con Docker

```bash
docker compose up trailrunner-dev      # dev con hot reload en :3000
docker compose build trailrunner       # construir imagen de producción
docker compose up trailrunner          # producción en :3001
```

---

## ⚙️ Configuración

1. **Gemini (opcional)**: copiá `.env.example` a `.env.local` y completá `GEMINI_API_KEY`. La clave es **gratis** en [Google AI Studio](https://aistudio.google.com/apikey).
   - Sin la key, el asesor de carreras funciona en modo **baseline determinista** (GAP + fórmulas de nutrición).
2. **Unidades**: SI (km, m, kg, °C). **Idioma**: Español.

## 📁 Estructura

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── entrenrenamientos/          # Histórico + registro manual
│   ├── semana/                     # Planificador semanal (drag-drop)
│   ├── importar/                   # Subida FIT/GPX (Suunto)
│   ├── carreras/                   # Listado + detalle con asesor IA
│   ├── ajustes/                    # Perfil y zonas
│   └── api/ia/asesor/route.ts     # Endpoint Gemini
├── components/
│   ├── ui/                         # shadcn/ui
│   ├── dashboard.tsx
│   ├── registro-form.tsx
│   ├── planificador-semanal.tsx
│   ├── importar-panel.tsx
│   ├── carreras-list.tsx
│   ├── carrera-detalle.tsx
│   └── ...
├── lib/
│   ├── types.ts                    # Tipos del dominio
│   ├── format.ts                   # Formateadores SI (es-AR)
│   ├── db/
│   │   ├── db.ts                   # Esquema Dexie
│   │   ├── ajustes.ts
│   │   ├── sesiones.ts
│   │   ├── planificadas.ts
│   │   └── carreras.ts
│   ├── parsers/
│   │   ├── gpx.ts                  # GPX → métricas + traza
│   │   ├── fit.ts                  # FIT Suunto → métricas + traza
│   │   └── common.ts
│   ├── calculations/
│   │   ├── treadmill.ts            # Desnivel en cinta (arctan)
│   │   ├── elevation.ts            # Haversine + acumulación D+/D−
│   │   ├── trail-pacing.ts         # GAP, pacing por tramos, nutrición
│   │   └── load.ts                 # Carga sRPE-TL (Foster ACWR)
│   └── ai/                         # (Placeholder para prompts)
└── types/modules.d.ts              # Declaraciones de tipos (fit-decoder, togeojson)

public/
├── manifest.webmanifest
├── sw.js                           # Service Worker
└── icons/                          # 192/256/384/512 + maskable
```

## 🔒 Privacidad

Todos tus entrenamientos **se guardan solo en tu navegador** (IndexedDB). No hay servidor, no hay cuenta, no hay envío de datos a terceros. La única llamada externa es al endpoint de Gemini (y solo si configurás la `GEMINI_API_KEY` y pedís asesoramiento de carreras).

## 📝 Notas

- Importación de Suunto: **de a un archivo FIT/GPX a la vez**.
- Repo: GitHub público. **Nunca commitear `.env.local`**.

## 🗓 Roadmap (ideas para el futuro)

- Sincronización opcional con la nube (Supabase/Firebase) para respaldo y multi-dispositivo.
- Integración directa con la API de Suunto (OAuth) para sincronización automática.
- Visualización de mapa interactivo (MapLibre) en el detalle de sesiones/carreras.
- Exportación PDF de planes y resúmenes.
- Modo "bulk import" para importar muchos FIT de una carpeta.