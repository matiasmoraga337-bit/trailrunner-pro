import { notFound } from "next/navigation";
import { getCarrera } from "@/lib/db/carreras";
import { CarreraDetalle } from "@/components/carrera-detalle";

export default async function CarreraDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carrera = await getCarrera(Number(id));
  if (!carrera) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{carrera.nombre}</h1>
        {carrera.fecha && (
          <p className="mt-1 text-muted-foreground">{carrera.fecha}</p>
        )}
      </header>
      <CarreraDetalle carrera={carrera} />
    </main>
  );
}