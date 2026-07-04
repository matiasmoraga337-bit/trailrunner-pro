import { EntrenamientosList } from "@/components/entrenamientos-list";

export default function EntrenamientosPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Entrenamientos</h1>
        <p className="mt-1 text-muted-foreground">
          Histórico de sesiones registradas manualmente o importadas del Suunto.
        </p>
      </header>
      <EntrenamientosList />
    </main>
  );
}