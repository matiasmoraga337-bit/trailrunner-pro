import { CarrerasList } from "@/components/carreras-list";

export default function CarrerasPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Carreras</h1>
        <p className="mt-1 text-muted-foreground">
          Subí el GPX de la ruta y recibí asesoramiento de pacing, nutrición y estrategia.
        </p>
      </header>
      <CarrerasList />
    </main>
  );
}