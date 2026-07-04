import { ImportarPanel } from "@/components/importar-panel";

export default function ImportarPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Importar desde Suunto</h1>
        <p className="mt-1 text-muted-foreground">
          Subí un archivo <strong>.FIT</strong> o <strong>.GPX</strong> exportado desde tu
          Suunto Race S. Vas a ver una vista previa antes de guardarlo.
        </p>
      </header>
      <ImportarPanel />
    </main>
  );
}