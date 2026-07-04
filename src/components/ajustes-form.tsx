"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAjustes, saveAjustes, calcularZonasFc } from "@/lib/db/ajustes";

const schema = z.object({
  nombre: z.string().min(1, "Ingresá tu nombre"),
  pesoKg: z.coerce.number().positive("Debe ser mayor a 0").max(300),
  edad: z.coerce.number().int().min(10).max(100).optional().or(z.literal("")),
  alturaCm: z.coerce.number().int().min(100).max(250).optional().or(z.literal("")),
  fcMax: z.coerce.number().int().min(100).max(220).optional().or(z.literal("")),
  fcRepo: z.coerce.number().int().min(30).max(120).optional().or(z.literal("")),
  ftpBici: z.coerce.number().int().min(50).max(600).optional().or(z.literal("")),
  umbralTrailPaceSegKm: z.coerce
    .number()
    .min(180)
    .max(900)
    .optional()
    .or(z.literal("")),
});

type FormValues = z.input<typeof schema>;
type SavedValues = z.output<typeof schema>;

export function AjustesForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "",
      pesoKg: 70,
    },
  });

  useEffect(() => {
    getAjustes().then((a) => {
      if (!a) return;
      form.reset({
        nombre: a.nombre,
        pesoKg: a.pesoKg,
        edad: a.edad ?? "",
        alturaCm: a.alturaCm ?? "",
        fcMax: a.fcMax ?? "",
        fcRepo: a.fcRepo ?? "",
        ftpBici: a.ftpBici ?? "",
        umbralTrailPaceSegKm: a.umbralTrailPaceSegKm ?? "",
      });
    });
  }, [form]);

  const onSubmit = async (values: FormValues) => {
    const v = values as SavedValues;
    await saveAjustes({
      nombre: v.nombre,
      pesoKg: v.pesoKg,
      edad: typeof v.edad === "number" ? v.edad : undefined,
      alturaCm: typeof v.alturaCm === "number" ? v.alturaCm : undefined,
      fcMax: typeof v.fcMax === "number" ? v.fcMax : undefined,
      fcRepo: typeof v.fcRepo === "number" ? v.fcRepo : undefined,
      ftpBici: typeof v.ftpBici === "number" ? v.ftpBici : undefined,
      umbralTrailPaceSegKm:
        typeof v.umbralTrailPaceSegKm === "number"
          ? v.umbralTrailPaceSegKm
          : undefined,
      // Zonas por defecto según modelo Karvonen (5 zonas en %)
      zonasFc: [50, 60, 70, 80, 90],
    });
    toast.success("Ajustes guardados", {
      description: "Tu perfil se actualizó localmente.",
    });
  };

  const fcMax = form.watch("fcMax");
  const fcRepo = form.watch("fcRepo");
  const zonas =
    typeof fcMax === "number" &&
    typeof fcRepo === "number" &&
    fcMax > fcRepo
      ? calcularZonasFc(fcMax, fcRepo)
      : null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Datos personales
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" error={form.formState.errors.nombre?.message}>
            <Input {...form.register("nombre")} placeholder="Tu nombre" />
          </Field>
          <Field label="Peso (kg)" error={form.formState.errors.pesoKg?.message}>
            <Input type="number" step="0.1" {...form.register("pesoKg")} />
          </Field>
          <Field label="Edad (años)">
            <Input
              type="number"
              {...form.register("edad")}
              placeholder="Opcional"
            />
          </Field>
          <Field label="Altura (cm)">
            <Input
              type="number"
              {...form.register("alturaCm")}
              placeholder="Opcional"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Frecuencia cardíaca
        </legend>
        <p className="text-xs text-muted-foreground">
          Las zonas se calculan automáticamente con el modelo de Karvonen
          (reserva de FC: FCmax − FCrepo).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="FC máx (lat/min)"
          >
            <Input type="number" {...form.register("fcMax")} placeholder="Opcional" />
          </Field>
          <Field label="FC reposo (lat/min)">
            <Input type="number" {...form.register("fcRepo")} placeholder="Opcional" />
          </Field>
        </div>
        {zonas && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {zonas.map((z) => (
              <div
                key={z.zona}
                className="rounded-lg border border-border bg-card p-2 text-center"
              >
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Z{z.zona} · {z.nombre}
                </div>
                <div className="text-sm font-bold">
                  {z.rangoFc[0]}–{z.rangoFc[1]}
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Umbrales (opcionales)
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="FTP bici (vatios)">
            <Input type="number" {...form.register("ftpBici")} placeholder="Opcional" />
          </Field>
          <Field
            label="Ritmo umbral trail (seg/km)"
            hint="Ej: 360 = 6:00 /km"
          >
            <Input
              type="number"
              {...form.register("umbralTrailPaceSegKm")}
              placeholder="Opcional"
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar ajustes
        </Button>
        <span className="text-xs text-muted-foreground">
          Se guardan en este navegador (IndexedDB).
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}