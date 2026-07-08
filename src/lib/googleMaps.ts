import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let isGoogleMapsConfigured = false;

function configureGoogleMaps() {
  if (isGoogleMapsConfigured) {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key is not configured.");
  }

  setOptions({
    key: apiKey,
    v: "weekly",
  });

  isGoogleMapsConfigured = true;
}

export function loadGoogleMapsLibrary(
  name: "maps",
): Promise<google.maps.MapsLibrary>;
export function loadGoogleMapsLibrary(
  name: "places",
): Promise<google.maps.PlacesLibrary>;
export function loadGoogleMapsLibrary(
  name: "marker",
): Promise<google.maps.MarkerLibrary>;
export function loadGoogleMapsLibrary(name: "maps" | "places" | "marker") {
  configureGoogleMaps();

  return importLibrary(name);
}
