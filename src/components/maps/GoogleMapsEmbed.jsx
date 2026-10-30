import { buildGoogleMapsEmbedUrl } from "@/lib/actividad-ubicacion.mjs";

export default function GoogleMapsEmbed({
  placeId, direccion, className = "", apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
}) {
  const src = buildGoogleMapsEmbedUrl(placeId, apiKey);
  if (!src) return null;
  return (
    <iframe
      src={src}
      title={direccion ? "Mapa de ubicación: " + direccion : "Ubicación de la actividad en Google Maps"}
      className={"h-64 w-full rounded-sm border-0 " + className}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}
