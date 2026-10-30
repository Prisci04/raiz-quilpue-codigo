"use client";

import GoogleMapsEmbed from "@/components/maps/GoogleMapsEmbed";
import GoogleMapsJavaScriptMap from "@/components/maps/GoogleMapsJavaScriptMap";
import { googleMapsRenderer } from "@/lib/actividad-ubicacion.mjs";

export default function GoogleMapsLocation({ activity, location = null }) {
  const renderer = googleMapsRenderer(activity, {
    mapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    embedKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY,
  });
  const props = { placeId: activity.google_place_id, direccion: activity.direccion || activity.lugar };
  if (renderer === "embed") return <GoogleMapsEmbed {...props} />;
  if (renderer === "javascript") return <GoogleMapsJavaScriptMap key={activity.google_place_id} {...props} location={location} />;
  return null;
}
