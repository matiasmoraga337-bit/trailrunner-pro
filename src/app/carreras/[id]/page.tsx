import { CarreraDetalleLoader } from "@/components/carrera-detalle-loader";

export default async function CarreraDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CarreraDetalleLoader id={Number(id)} />;
}