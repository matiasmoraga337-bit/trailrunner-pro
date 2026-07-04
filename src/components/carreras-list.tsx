"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  MapPin,
  Trash2,
  Mountain,
  Activity,
  Loader2,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { listarCarreras, deleteCarrera, crearCarreraDesdeGpx } from "@/lib/db/carreras";
import { db } from "@/lib/db/db";
import { formatDistancia, formatDesnivel } from "@/lib/format";
import type { Race } from "@/lib/types";

export function CarrerasList() {
  const carreras = useLiveQuery(() => db.carreras.orderBy("createdAt").reverse().toArray(), []);
  const router = useRouter();
  const [showCrear, setShowCrear] = useState(false);

  const onBorrar = async (id: number) => {
    if (!confirm("¿Borrar esta carrera y su GPX?")) return;
    await deleteCarrera(id);
    toast.success("Carrera borrada");
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setShowCrear(true)}>
          <Plus className="h-4 w-4" /> Nueva carrera
        </Button>
      </div>

      {(carreras?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Todavía no cargaste ninguna carrera.</p>
          <Button variant="secondary" onClick={() => setShowCrear(true)}>
            <Plus className="h-4 w-4" /> Subir una ruta GPX
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {carreras!.map((c) => (
            <li
              key={c.id}
              className="group cursor-pointer rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
              onClick={() => router.push(`/carreras/${c.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{c.nombre}</h3>
                  {c.fecha && (
                    <p className="text-xs text-muted-foreground">{c.fecha}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBorrar(c.id!);
                  }}
                  className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <MiniMetric
                  icon={<Activity className="h-3.5 w-3.5" />}
                  label="Distancia"
                  valor={formatDistancia(c.distanciaM)}
                />
                <MiniMetric
                  icon={<Mountain className="h-3.5 w-3.5" />}
                  label="Desnivel +"
                  valor={formatDesnivel(c.desnivelPosM)}
                />
                <MiniMetric
                  icon={<Mountain className="h-3.5 w-3.5" />}
                  label="Desnivel −"
                  valor={formatDesnivel(c.desnivelNegM ?? 0)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {showCrear && (
        <CrearCarreraDialog onClose={() => setShowCrear(false)} />
      )}
    </div>
  );
}

function CrearCarreraDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [gpxTexto, setGpxTexto] = useState<string>("");
  const [gpxBlob, setGpxBlob] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const dropzone = useDropzone({
    onDrop: async (files) => {
      if (!files.length) return;
      const f = files[0];
      if (!f.name.toLowerCase().endsWith(".gpx")) {
        toast.error("Solo se aceptan archivos .gpx");
        return;
      }
      const txt = await f.text();
      setGpxTexto(txt);
      setGpxBlob(f);
    },
    accept: { "application/gpx+xml": [".gpx"] },
    maxFiles: 1,
  });

  const guardar = async () => {
    if (!nombre) {
      toast.error("Poné un nombre");
      return;
    }
    if (!gpxTexto || !gpxBlob) {
      toast.error("Subí un GPX");
      return;
    }
    setSaving(true);
    try {
      const id = await crearCarreraDesdeGpx(nombre, fecha || undefined, gpxTexto, gpxBlob);
      toast.success("Carrera creada", { description: "Ahora podes analizarla y pedir asesoramiento." });
      router.push(`/carreras/${id}`);
    } catch (e) {
      toast.error("Error al crear", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva carrera</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nombre de la carrera</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Ultra Trail Andes 50K"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha (opcional)</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Archivo GPX de la ruta</Label>
            <div
              {...dropzone.getRootProps()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:border-primary/60"
            >
              <input {...dropzone.getInputProps()} />
              <FileUp className="h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {gpxBlob ? gpxBlob.name : "Arrastrá o hacé clic (.gpx)"}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={guardar}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniMetric({
  icon,
  label,
  valor,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1">
      <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold">{valor}</div>
    </div>
  );
}