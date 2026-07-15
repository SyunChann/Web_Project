export {};

declare global {
  interface Window {
    naver?: typeof naver;
  }

  namespace naver.maps {
    class Map {
      constructor(element: HTMLElement | string, options: MapOptions);
      setCenter(latlng: LatLng): void;
      panTo(latlng: LatLng): void;
      setZoom(zoom: number, effect?: boolean): void;
      getZoom(): number;
      fitBounds(bounds: LatLngBounds, margin?: number): void;
      destroy(): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw: LatLng, ne: LatLng);
      extend(latlng: LatLng): LatLngBounds;
    }

    class Point {
      constructor(x: number, y: number);
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      setIcon(icon: MarkerIcon | string): void;
      getPosition(): LatLng;
    }

    interface MarkerIcon {
      content?: string;
      url?: string;
      size?: Size;
      anchor?: Point;
    }

    interface MapOptions {
      center: LatLng;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      zoomControl?: boolean;
      mapTypeControl?: boolean;
      scaleControl?: boolean;
      logoControl?: boolean;
      mapDataControl?: boolean;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      title?: string;
      icon?: MarkerIcon | string;
      zIndex?: number;
    }

    namespace Event {
      function addListener(
        target: Marker | Map,
        eventName: string,
        handler: (...args: unknown[]) => void,
      ): unknown;
      function removeListener(listener: unknown): void;
      function clearListeners(target: Marker | Map, eventName?: string): void;
    }
  }
}