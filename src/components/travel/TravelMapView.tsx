/// <reference types="google.maps" />
"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsLibrary } from "@/lib/googleMaps";

export type TravelRouteStop = {
  storeName: string;
  address?: string;
  latitude: number;
  longitude: number;
  mapUrl?: string;
  visitedAt: string;
  visitedTime?: string;
};

type TravelMapViewProps = {
  stops: TravelRouteStop[];
};

type TravelMapMarker = google.maps.marker.AdvancedMarkerElement;

export function TravelMapView({ stops }: TravelMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<TravelMapMarker[]>([]);
  const lineRef = useRef<google.maps.Polyline | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.all([loadGoogleMapsLibrary("maps"), loadGoogleMapsLibrary("marker")])
      .then(([mapsLibrary, markerLibrary]) => {
        if (!isMounted || !mapContainerRef.current) return;

        markerRefs.current.forEach((marker) => { marker.map = null; });
        markerRefs.current = [];
        lineRef.current?.setMap(null);

        const firstStop = stops[0];
        const map = new mapsLibrary.Map(mapContainerRef.current, {
          center: { lat: firstStop.latitude, lng: firstStop.longitude },
          zoom: stops.length === 1 ? 15 : 12,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
        });
        mapRef.current = map;
        const bounds = new google.maps.LatLngBounds();
        const path = stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }));

        stops.forEach((stop, index) => {
          const position = path[index];
          bounds.extend(position);
          const pin = new markerLibrary.PinElement({
            background: index === selectedIndex ? "#3f6212" : "#65a30d",
            borderColor: "#ffffff",
            glyphText: String(index + 1),
            glyphColor: "#ffffff",
            scale: 1.15,
          });
          const marker = new markerLibrary.AdvancedMarkerElement({
            map,
            position,
            title: `${index + 1}. ${stop.storeName}`,
            content: pin,
          });

          marker.addEventListener("gmp-click", () => {
            setSelectedIndex(index);
            map.panTo(position);
          });
          markerRefs.current.push(marker);
        });

        if (path.length > 1) {
          lineRef.current = new google.maps.Polyline({
            map,
            path,
            geodesic: true,
            strokeColor: "#65a30d",
            strokeOpacity: 0.85,
            strokeWeight: 4,
          });
          map.fitBounds(bounds, 64);
        }
      })
      .catch((error: unknown) => {
        console.error("Google Maps 지도를 불러오지 못했습니다.", error);
        setErrorMessage("Google Maps 지도를 불러오지 못했습니다. API 설정을 확인해 주세요.");
      });

    return () => {
      isMounted = false;
      markerRefs.current.forEach((marker) => { marker.map = null; });
      markerRefs.current = [];
      lineRef.current?.setMap(null);
      lineRef.current = null;
      mapRef.current = null;
    };
  }, [stops]);

  function selectStop(index: number) {
    const stop = stops[index];

    setSelectedIndex(index);
    mapRef.current?.panTo({ lat: stop.latitude, lng: stop.longitude });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#d9efb9] bg-white shadow-sm">
      <div className="relative min-h-[420px] bg-[#f5efe6] sm:min-h-[560px]">
        <div ref={mapContainerRef} className="absolute inset-0" />
        {errorMessage ? <p className="absolute inset-x-4 top-4 rounded-md border border-[#f0c9c6] bg-[#fff5f3] px-4 py-3 text-sm font-bold text-[#a73735] shadow-sm">{errorMessage}</p> : null}
      </div>
      <ol className="grid divide-y divide-[#e8f5d5]">
        {stops.map((stop, index) => (
          <li key={`${stop.storeName}-${index}`}>
            <button type="button" onClick={() => selectStop(index)} className={`flex w-full items-start gap-3 px-5 py-4 text-left transition ${selectedIndex === index ? "bg-[#f7fee7]" : "hover:bg-[#fbfff5]"}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#65a30d] text-sm font-black text-white">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-[#17202a]">{stop.storeName}</strong>
                {stop.address ? <span className="mt-1 block text-xs leading-5 text-[#64748b]">{stop.address}</span> : null}
              </span>
              <span className="shrink-0 text-xs font-bold text-[#4d7c0f]">{stop.visitedTime?.slice(0, 5) ?? "시간 미정"}</span>
            </button>
            {selectedIndex === index && stop.mapUrl ? <a href={stop.mapUrl} target="_blank" rel="noopener noreferrer" className="mb-4 ml-16 inline-flex items-center gap-1 text-xs font-bold text-[#4d7c0f] hover:text-[#3f6212]">Google Maps <ExternalLink size={13} /></a> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
