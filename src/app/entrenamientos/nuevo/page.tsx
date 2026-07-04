import { RegistroForm } from "@/components/registro-form";

export default function NuevoEntrenamientoPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo entrenamiento</h1>
        <p className="mt-1 text-muted-foreground">
          Registro manual. Para sesiones de tu Suunto usá{" "}
          <a href="/importar" className="text-primary underline">Importar</a>.
        </p>
      </header>
      <RegistroForm />
    </main>
  );
}