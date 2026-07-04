import { PlanificadorSemanal } from "@/components/planificador-semanal";

export default function SemanaPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Planificador semanal</h1>
        <p className="mt-1 text-muted-foreground">
          Armá tu semana arrastrando entrenamientos entre días. Usá plantillas para
          arrancar rápido y compará lo planificado con lo realizado.
        </p>
      </header>
      <PlanificadorSemanal />
    </main>
  );
}