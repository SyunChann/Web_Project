const NAVER_MAPS_SCRIPT_ID = "naver-maps-script";

let loadPromise: Promise<void> | null = null;

/**
 * 네이버 지도 JS SDK(maps.js)를 1회만 로드하고,
 * 이미 로드되어 있으면 즉시 resolve 되는 프로미스를 반환합니다.
 */
export function loadNaverMapsScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("네이버 지도는 브라우저 환경에서만 로드할 수 있습니다."),
    );
  }

  if (window.naver?.maps) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

    if (!clientId) {
      loadPromise = null;
      reject(
        new Error(
          "NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 환경변수가 설정되지 않았습니다.",
        ),
      );
      return;
    }

    const existingScript = document.getElementById(
      NAVER_MAPS_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => {
        loadPromise = null;
        reject(new Error("네이버 지도 스크립트 로드에 실패했습니다."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = NAVER_MAPS_SCRIPT_ID;
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("네이버 지도 스크립트 로드에 실패했습니다."));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
