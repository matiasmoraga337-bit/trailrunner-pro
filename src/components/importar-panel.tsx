"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Loader2, Save, FileText, CheckCircle2 } from "lucide-react";
import type { ParsedWorkout } from "@/lib/parsers/common";
import { parseGpx } from "@/lib/parsers/gpx";
import { parseFit } from "@/lib/parsers/fit";
import { saveSesion } from "@/lib/db/sesiones";
import { db } from "@/lib/db/db";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  formatDistancia,
  formatDesnivel,
  formatDuration,
  formatRitmo,
  formatDateLarga,
} from "@/lib/format";
import { SPORTS } from "@/lib/types";

type Estado = "idle" | "parsing" | "preview" | "guardando";

export function ImportarPanel() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("idle");
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>("");

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const file = files[0];
      setNombreArchivo(file.name);
      setEstado("parsing");
      setParsed(null);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "gpx") {
          const text = await file.text();
          const res = parseGpx(text);
          if (!res) throw new Error("No se encontraron trkpt en el GPX");
          setParsed(res);
          setEstado("preview");
        } else if (ext === "fit") {
          const buffer = await file.arrayBuffer();
          const res = await parseFit(buffer);
          if (!res) throw new Error("No se pudo leer el FIT");
          // Guardar archivo raw para re-procesamiento futuro
          const rawId = await db.archivos.add({
            nombre: file.name,
            tipo: "fit",
            bytes: new Blob([buffer]),
            createdAt: Date.now(),
          });
          (res as ParsedWorkout & { _rawId?: number })._rawId = rawId as number;
          setParsed(res);
          setEstado("preview");
        } else {
          throw new Error("Formato no soportado. Use .fit o .gpx");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al parsear";
        toast.error("No se pudo importar", { description: msg });
        setEstado("idle");
      }
    },
    []
  );

  const dropzone = useDropzone({
    onDrop,
    accept: {
      "application/gpx+xml": [".gpx"],
      "application/vnd.garmin.fit": [".fit"],
    },
    maxFiles: 1,
    disabled: estado !== "idle",
  });

  const guardar = async () => {
    if (!parsed) return;
    setEstado("guardando");
    try {
      const deporteLabel =
        SPORTS.find((s) => s.id === parsed.deporte)?.label ?? parsed.deporte;
      const rawId = (parsed as ParsedWorkout & { _rawId?: number })._rawId;
      await saveSesion({
        fecha: parsed.fecha,
        fechaInicio: parsed.fechaInicio,
        sport: parsed.deporte,
        tipo: "otra",
        titulo: parsed.titulo || deporteLabel,
        duracionSeg: parsed.duracionSeg,
        distanciaM: parsed.distanciaM,
        desnivelPosM: parsed.desnivelPosM,
        desnivelNegM: parsed.desnivelNegM,
        fcMedia: parsed.fcMedia,
        fcMax: parsed.fcMax,
        ritmoMedioSegKm: parsed.ritmoMedioSegKm,
        velocidadMediaMs: parsed.velocidadMediaMs,
        potenciaMedia: parsed.potenciaMedia,
        calorias: parsed.calorias,
        rpe: undefined,
        notas: `Importado de ${nombreArchivo}`,
        fuente: "importado-suunto",
        archivoRawId: rawId,
        datosLaps: parsed.laps.length > 0 ? parsed.laps : undefined,
        traza: parsed.traza.length > 0 ? parsed.traza : undefined,
      } as Parameters<typeof saveSesion>[0]);
      toast.success("Sesión importada", {
        description: `${deporteLabel} · ${formatDuration(parsed.duracionSeg)} · ${formatDistancia(parsed.distanciaM)}`,
      });
      router.push("/entrenamientos");
    } catch (e) {
      toast.error("No se pudo guardar", {
        description: e instanceof Error ? e.message : "",
      });
      setEstado("preview");
    }
  };

  const cancelar = () => {
    setEstado("idle");
    setParsed(null);
    setNombreArchivo("");
  };

  return (
    <div className="space-y-6">
      {estado === "idle" && (
        <div
          {...dropzone.getRootProps()}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 py-16 text-center transition hover:border-primary/60 hover:bg-muted/40"
        >
          <input {...dropzone.getInputProps()} />
          <FileText className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-base font-medium">Arrastrá tu archivo aquí</p>
            <p className="text-sm text-muted-foreground">
              o hacé clic para elegirlo · formato .FIT o .GPX (de a uno por vez)
            </p>
          </div>
        </div>
      )}

      {estado === "parsing" && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Procesando {nombreArchivo}…</p>
        </div>
      )}

      {(estado === "preview" || estado === "guardando") && parsed && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span>
              Archivo <strong>{nombreArchivo}</strong> parseado. Mirá los datos antes de
              guardar.
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{parsed.titulo}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {formatDateLarga(parsed.fechaInicio)}
                </p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                {SPORTS.find((s) => s.id === parsed.deporte)?.label ?? parsed.deporte}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Item label="Duración" valor={formatDuration(parsed.duracionSeg)} />
              <Item
                label="Distancia"
                valor={parsed.distanciaM > 0 ? formatDistancia(parsed.distanciaM) : "—"}
              />
              <Item
                label="Desnivel +"
                valor={parsed.desnivelPosM > 0 ? formatDesnivel(parsed.desnivelPosM) : "—"}
                accent
              />
              <Item
                label="Desnivel −"
                valor={parsed.desnivelNegM ? formatDesnivel(parsed.desnivelNegM) : "—"}
              />
              {parsed.ritmoMedioSegKm && (
                <Item label="Ritmo medio" valor={formatRitmo(parsed.ritmoMedioSegKm)} />
              )}
              {parsed.fcMedia && (
                <Item label="FC media" valor={`${parsed.fcMedia} lpm`} />
              )}
              {parsed.fcMax && (
                <Item label="FC máx" valor={`${parsed.fcMax} lpm`} />
              )}
              {parsed.potenciaMedia && (
                <Item label="Potencia" valor={`${parsed.potenciaMedia} W`} />
              )}
              {parsed.calorias && (
                <Item label="Calorías" valor={`${parsed.calorias} kcal`} />
              )}
              {parsed.traza.length > 0 && (
                <Item label="Puntos GPS" valor={`${parsed.traza.length}`} />
              )}
              {parsed.laps.length > 0 && (
                <Item label="Laps" valor={`${parsed.laps.length}`} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={guardar} disabled={estado === "guardando"}>
              {estado === "guardando" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar entrenamiento
            </Button>
            <Button variant="ghost" onClick={cancelar} disabled={estado === "guardando"}>
              Cancelar y subir otro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ label, valor, accent }: { label: string; valor: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${accent ? "text-primary" : ""}`}>{valor}</div>
    </div>
  );
}