import { AjustesForm } from "@/components/ajustes-form";

export default function AjustesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-muted-foreground">
          Tu perfil y zonas. Lo usamos para personalizar los cálculos y el
          asesor de carreras.
        </p>
      </header>
      <AjustesForm />
    </main>
  );
}