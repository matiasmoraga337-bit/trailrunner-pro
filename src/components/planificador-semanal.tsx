"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, CalendarDays, Copy, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SelectControl } from "@/components/select-control";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SPORTS,
  type Sport,
  type PlannedWorkout,
  type WorkoutSession,
} from "@/lib/types";
import {
  listarSemana,
  listarSesionesSemana,
  savePlanificada,
  deletePlanificada,
  updatePlanificada,
  PLANTILLAS_PREDEF,
  aplicarPlantilla,
  type PlantillaSemana,
} from "@/lib/db/planificadas";
import { db } from "@/lib/db/db";
import {
  formatDateISO,
  formatDateLarga,
  formatDuration,
  formatDistancia,
  formatDesnivel,
} from "@/lib/format";

const DIAS = ["Lun", "Mar", "MiÃ©", "Jue", "Vie", "SÃ¡b", "Dom"];
const DIAS_LARGO = ["Lunes", "Martes", "MiÃ©rcoles", "Jueves", "Viernes", "SÃ¡bado", "Domingo"];

function getLunesSemana(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = r.getDay(); // 0=dom, 1=lun...
  const diff = dow === 0 ? -6 : 1 - dow;
  r.setDate(r.getDate() + diff);
  return r;
}

export function PlanificadorSemanal() {
  const [lunes, setLunes] = useState<Date>(getLunesSemana(new Date()));
  const [showPlantillas, setShowPlantillas] = useState(false);
  const [editingDia, setEditingDia] = useState<number | null>(null);

  const desdeStr = formatDateISO(lunes);
  const hasta = new Date(lunes);
  hasta.setDate(hasta.getDate() + 6);
  const hastaStr = formatDateISO(hasta);

  const planificadas = useLiveQuery(
    () =>
      db.planificadas
        .where("fecha")
        .between(desdeStr, hastaStr, true, true)
        .toArray(),
    [desdeStr, hastaStr]
  ) ?? [];
  const sesiones = useLiveQuery(
    () =>
      db.sesiones
        .where("fecha")
        .between(desdeStr, hastaStr, true, true)
        .toArray(),
    [desdeStr, hastaStr]
  ) ?? [];

const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const semanaDias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [lunes]);

  const planPorDia = useMemo(() => {
    const map: Record<number, PlannedWorkout[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const p of planificadas) {
      const idx = semanaDias.findIndex((d) => formatDateISO(d) === p.fecha);
      if (idx >= 0) map[idx].push(p);
    }
    return map;
  }, [planificadas, semanaDias]);

  const sesionesPorDia = useMemo(() => {
    const map: Record<number, WorkoutSession[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const s of sesiones) {
      const idx = semanaDias.findIndex((d) => formatDateISO(d) === s.fecha);
      if (idx >= 0) map[idx].push(s);
    }
    return map;
  }, [sesiones, semanaDias]);

  const onDragEnd = async (e: DragEndEvent) => {
    const itemId = e.active.id as string;
    const destDiaIdx = e.over?.id as string | undefined;
    if (!destDiaIdx) return;
    const destIdxNum = parseInt(destDiaIdx, 10);
    if (isNaN(destIdxNum)) return;
    // Buscar el item movido
    let item: PlannedWorkout | undefined;
    for (let i = 0; i < 7 && !item; i++) {
      item = planPorDia[i].find((p) => String(p.id) === itemId);
    }
    if (!item || !item.id) return;
    const nuevaFecha = semanaDias[destIdxNum];
    await updatePlanificada(item.id, { fecha: formatDateISO(nuevaFecha) });
    toast.success("Movido a " + DIAS_LARGO[destIdxNum]);
    
  };

  const onBorrar = async (id: number) => {
    await deletePlanificada(id);
    
  };

  const onToggleCompletada = async (p: PlannedWorkout) => {
    if (!p.id) return;
    await updatePlanificada(p.id, { completada: !p.completada });
    
  };

  const onAplicarPlantilla = async (p: PlantillaSemana) => {
    if (
      !confirm(
        `Esto reemplaza toda la semana con la plantilla "${p.nombre}". Â¿Continuar?`
      )
    )
      return;
    await aplicarPlantilla(p, lunes);
    toast.success("Plantilla aplicada");
    setShowPlantillas(false);
    
  };

  // Totales de la semana (plan)
  const totalesPlan = useMemo(() => {
    let seg = 0;
    let dist = 0;
    let desn = 0;
    for (const p of planificadas) {
      seg += p.duracionEstimadaSeg;
      dist += p.distanciaEstimadaM;
      desn += p.desnivelEstimadoPosM;
    }
    return { seg, dist, desn };
  }, [planificadas]);

  // Totales de la semana (hecho)
  const totalesHecho = useMemo(() => {
    let seg = 0;
    let dist = 0;
    let desn = 0;
    for (const s of sesiones) {
      seg += s.duracionSeg;
      dist += s.distanciaM;
      desn += s.desnivelPosM;
    }
    return { seg, dist, desn };
  }, [sesiones]);

  const semanaActual = getLunesSemana(new Date());
  const esActual = lunes.getTime() === semanaActual.getTime();

  return (
    <div className="space-y-5">
      {/* Controles de semana */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            render={
              <button
                onClick={() => {
                  const prev = new Date(lunes);
                  prev.setDate(prev.getDate() - 7);
                  setLunes(prev);
                }}
              />
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <button
                onClick={() => setLunes(getLunesSemana(new Date()))}
                disabled={esActual}
              />
            }
          >
            <CalendarDays className="h-4 w-4" /> Hoy
          </Button>
          <Button
            variant="outline"
            size="icon"
            render={
              <button
                onClick={() => {
                  const next = new Date(lunes);
                  next.setDate(next.getDate() + 7);
                  setLunes(next);
                }}
              />
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium capitalize">
            {formatDateLarga(lunes)} â€” {formatDateLarga(semanaDias[6])}
          </span>
        </div>
        <Button variant="secondary" onClick={() => setShowPlantillas(true)}>
          <Copy className="h-4 w-4" /> Plantillas
        </Button>
      </div>

      {/* Comparativa plan vs. hecho */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TotalCard
          label="DuraciÃ³n"
          plan={formatDuration(totalesPlan.seg)}
          hecho={formatDuration(totalesHecho.seg)}
        />
        <TotalCard
          label="Distancia"
          plan={formatDistancia(totalesPlan.dist)}
          hecho={formatDistancia(totalesHecho.dist)}
        />
        <TotalCard
          label="Desnivel +"
          plan={formatDesnivel(totalesPlan.desn)}
          hecho={formatDesnivel(totalesHecho.desn)}
          accent
        />
      </div>

      {/* Grilla de 7 dÃ­as */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {semanaDias.map((d, i) => (
            <DiaColumna
              key={i}
              diaIdx={i}
              fecha={d}
              planes={planPorDia[i]}
              sesionesDia={sesionesPorDia[i]}
              onAdd={() => setEditingDia(i)}
              onBorrar={onBorrar}
              onToggleDone={onToggleCompletada}
            />
          ))}
        </div>
      </DndContext>

      {/* Modal plantillas */}
      <Dialog open={showPlantillas} onOpenChange={setShowPlantillas}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plantillas de semana</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {PLANTILLAS_PREDEF.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-xs text-muted-foreground">{p.descripcion}</div>
                </div>
                <Button
                  size="sm"
                  render={<button onClick={() => onAplicarPlantilla(p)} />}
                >
                  Aplicar
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPlantillas(false)}>
              <X className="h-4 w-4" /> Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal nuevo/editar plan del dÃ­a */}
      {editingDia !== null && (
        <NuevoPlanDialog
          diaIdx={editingDia}
          fecha={semanaDias[editingDia]}
          onClose={() => setEditingDia(null)}
          onSaved={() => {
            setEditingDia(null);
            
          }}
        />
      )}
    </div>
  );
}

function DiaColumna({
  diaIdx,
  fecha,
  planes,
  sesionesDia,
  onAdd,
  onBorrar,
  onToggleDone,
}: {
  diaIdx: number;
  fecha: Date;
  planes: PlannedWorkout[];
  sesionesDia: WorkoutSession[];
  onAdd: () => void;
  onBorrar: (id: number) => void;
  onToggleDone: (p: PlannedWorkout) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: String(diaIdx) });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-1.5 rounded-lg border p-2 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border bg-card"
      } min-h-[140px]`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{DIAS[diaIdx]}</div>
          <div className="text-xs text-muted-foreground">
            {fecha.getDate()}/{fecha.getMonth() + 1}
          </div>
        </div>
        <button onClick={onAdd} className="text-muted-foreground hover:text-primary">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {planes.length === 0 && sesionesDia.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground italic">Sin plan</p>
      )}

      {planes.map((p) => (
        <DraggablePlan key={p.id} p={p} onBorrar={onBorrar} onToggleDone={onToggleDone} />
      ))}

      {sesionesDia.length > 0 && (
        <div className="mt-1 border-t border-border pt-1">
          <div className="text-[10px] uppercase text-muted-foreground">Hecho</div>
          {sesionesDia.map((s) => (
            <div key={s.id} className="rounded bg-muted/50 px-1.5 py-0.5 text-xs">
              {s.titulo} Â· {formatDuration(s.duracionSeg)}
              {s.distanciaM > 0 && ` Â· ${formatDistancia(s.distanciaM)}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DraggablePlan({
  p,
  onBorrar,
  onToggleDone,
}: {
  p: PlannedWorkout;
  onBorrar: (id: number) => void;
  onToggleDone: (p: PlannedWorkout) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(p.id),
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  const deporteLabel = SPORTS.find((s) => s.id === p.sport)?.label ?? p.sport;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group cursor-grab rounded-md border p-1.5 text-xs active:cursor-grabbing ${
        p.completada
          ? "border-primary/40 bg-primary/10 line-through opacity-60"
          : "border-border bg-background"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1">
          <div className="font-medium">{p.titulo || deporteLabel}</div>
          <div className="text-[10px] uppercase text-muted-foreground">{deporteLabel}</div>
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onToggleDone(p)}
            className="text-muted-foreground hover:text-primary"
            title="Marcar completado"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => p.id && onBorrar(p.id)}
            className="text-muted-foreground hover:text-destructive"
            title="Borrar"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {p.objetivo && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{p.objetivo}</div>
      )}
      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px]">
        <span>{formatDuration(p.duracionEstimadaSeg)}</span>
        {p.distanciaEstimadaM > 0 && <span>{formatDistancia(p.distanciaEstimadaM)}</span>}
        {p.desnivelEstimadoPosM > 0 && (
          <span>D+ {formatDesnivel(p.desnivelEstimadoPosM)}</span>
        )}
      </div>
    </div>
  );
}

function TotalCard({
  label,
  plan,
  hecho,
  accent,
}: {
  label: string;
  plan: string;
  hecho: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div>
          <span className="text-[10px] uppercase text-muted-foreground">Plan</span>
          <div className={`text-base font-bold ${accent ? "text-primary" : ""}`}>{plan}</div>
        </div>
        <div className="ml-auto text-right">
          <span className="text-[10px] uppercase text-muted-foreground">Hecho</span>
          <div className="text-base font-bold">{hecho}</div>
        </div>
      </div>
    </div>
  );
}

function NuevoPlanDialog({
  diaIdx,
  fecha,
  onClose,
  onSaved,
}: {
  diaIdx: number;
  fecha: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [deporte, setDeporte] = useState<Sport>("trail");
  const [titulo, setTitulo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [duracionMin, setDuracionMin] = useState(60);
  const [distanciaKm, setDistanciaKm] = useState("");
  const [desnivelM, setDesnivelM] = useState("");
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    await savePlanificada({
      fecha: formatDateISO(fecha),
      sport: deporte,
      titulo: titulo || (SPORTS.find((s) => s.id === deporte)?.label ?? deporte),
      objetivo,
      duracionEstimadaSeg: duracionMin * 60,
      distanciaEstimadaM: distanciaKm ? parseFloat(distanciaKm) * 1000 : 0,
      desnivelEstimadoPosM: desnivelM ? parseInt(desnivelM, 10) : 0,
      completada: false,
    });
    toast.success("Agregado a " + DIAS_LARGO[diaIdx]);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planificar {DIAS_LARGO[diaIdx]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Deporte</Label>
              <SelectControl
                value={deporte}
                onChange={(v) => setDeporte(v as Sport)}
                options={SPORTS.map((s) => ({ value: s.id, label: s.label }))}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label>DuraciÃ³n (min)</Label>
              <Input
                type="number"
                value={duracionMin}
                onChange={(e) => setDuracionMin(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>TÃ­tulo</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Tirada larga"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Objetivo</Label>
            <Textarea
              rows={2}
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Z2 continuo, 5x5' en cuesta..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Distancia estimada (km)</Label>
              <Input
                type="number"
                step="0.1"
                value={distanciaKm}
                onChange={(e) => setDistanciaKm(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Desnivel + estimado (m)</Label>
              <Input
                type="number"
                value={desnivelM}
                onChange={(e) => setDesnivelM(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={saving} onClick={guardar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}