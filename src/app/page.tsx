import { Dashboard } from "@/components/dashboard";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Resumen de los &uacute;ltimos entrenamientos, volumen semanal y carga (ACWR).
        </p>
      </header>
      <Dashboard />
    </main>
  );
}