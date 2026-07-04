import Link from "next/link";

const secciones: { href: string; titulo: string; desc: string }[] = [
  { href: "/entrenamientos", titulo: "Entrenamientos", desc: "Registro diario e histórico" },
  { href: "/semana", titulo: "Planificador semanal", desc: "Armá tu semana de entrenamiento" },
  { href: "/importar", titulo: "Importar (Suunto)", desc: "Subí sesiones FIT/GPX de tu reloj" },
  { href: "/carreras", titulo: "Carreras", desc: "Análisis de GPX y asesor con IA" },
  { href: "/ajustes", titulo: "Ajustes", desc: "Tu perfil y zonas" },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-10 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Trail running · Running · Cinta · Bici · Fuerza
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          TrailRunner Pro
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Registra, planificá y analizá tus entrenamientos. Importá sesiones de
          tu Suunto Race S y recibí asesoramiento de carreras con IA.
        </p>
      </header>

      <nav className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {secciones.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold group-hover:text-primary">
              {s.titulo}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </Link>
        ))}
      </nav>

      <p className="mt-12 text-xs text-muted-foreground">
        Datos guardados localmente en este navegador (IndexedDB). Sin nube, sin
        cuenta: solo vos.
      </p>
    </main>
  );
}