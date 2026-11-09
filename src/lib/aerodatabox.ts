import "server-only";

const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";
const AERODATABOX_URL = `https://${AERODATABOX_HOST}/flights/airports/iata/ICN`;

type AeroDateTime = {
  utc?: string;
  local?: string;
};

type AeroAirport = {
  iata?: string;
  icao?: string;
  name?: string;
  shortName?: string;
  municipalityName?: string;
  countryCode?: string;
};

type AeroMovement = {
  airport?: AeroAirport;
  scheduledTime?: AeroDateTime;
  revisedTime?: AeroDateTime;
  terminal?: string;
  gate?: string;
};

type AeroFlight = {
  number?: string;
  status?: string;
  airline?: {
    name?: string;
    iata?: string;
    icao?: string;
  };
  departure?: AeroMovement;
  arrival?: AeroMovement;
};

type AeroFidsResponse = {
  departures?: AeroFlight[];
};

export type DepartureStatusTone = "scheduled" | "delayed" | "boarding" | "departed" | "canceled";

export type DepartureBoardFlight = {
  id: string;
  number: string;
  airline: string;
  destination: string;
  destinationCode: string;
  scheduledAt?: string;
  revisedAt?: string;
  terminal: string;
  gate: string;
  status: string;
  statusTone: DepartureStatusTone;
};

export type DepartureBoardResult =
  | { state: "ready"; flights: DepartureBoardFlight[]; updatedAt: string }
  | { state: "empty"; flights: []; updatedAt: string }
  | { state: "missing-key" | "rate-limit" | "unavailable"; flights: []; updatedAt?: string };

export async function getJapanDepartures(): Promise<DepartureBoardResult> {
  const apiKey = process.env.AERODATABOX_API_KEY;

  if (!apiKey) {
    return { state: "missing-key", flights: [] };
  }

  const query = new URLSearchParams({
    offsetMinutes: "-120",
    durationMinutes: "720",
    direction: "Departure",
    withLeg: "true",
    withCancelled: "true",
    withCodeshared: "false",
    withCargo: "false",
    withPrivate: "false",
    withLocation: "false",
  });

  try {
    const response = await fetch(`${AERODATABOX_URL}?${query}`, {
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Host": AERODATABOX_HOST,
        "X-RapidAPI-Key": apiKey,
      },
      next: { revalidate: 300 },
    });

    if (response.status === 429) {
      return { state: "rate-limit", flights: [] };
    }

    if (!response.ok) {
      return { state: "unavailable", flights: [] };
    }

    const payload = (await response.json()) as AeroFidsResponse;
    if (!Array.isArray(payload.departures)) {
      return { state: "unavailable", flights: [] };
    }

    const updatedAt = response.headers.get("date") ?? new Date().toISOString();
    const flights = payload.departures
      .filter((flight) => flight.arrival?.airport?.countryCode?.toUpperCase() === "JP")
      .map(toBoardFlight)
      .sort((a, b) => getSortTime(a) - getSortTime(b));

    if (flights.length === 0) {
      return { state: "empty", flights: [], updatedAt };
    }

    return { state: "ready", flights, updatedAt };
  } catch {
    return { state: "unavailable", flights: [] };
  }
}

function toBoardFlight(flight: AeroFlight, index: number): DepartureBoardFlight {
  const airport = flight.arrival?.airport;
  const scheduledAt = getDateTime(flight.departure?.scheduledTime);
  const revisedAt = getDateTime(flight.departure?.revisedTime);
  const statusTone = getStatusTone(flight.status, scheduledAt, revisedAt);

  return {
    id: `${flight.number ?? "flight"}-${scheduledAt ?? index}`,
    number: flight.number ?? "-",
    airline: flight.airline?.name ?? flight.airline?.iata ?? flight.airline?.icao ?? "항공사 정보 없음",
    destination: airport?.municipalityName ?? airport?.shortName ?? airport?.name ?? "목적지 정보 없음",
    destinationCode: airport?.iata ?? airport?.icao ?? "-",
    scheduledAt,
    revisedAt: revisedAt !== scheduledAt ? revisedAt : undefined,
    terminal: flight.departure?.terminal ?? "-",
    gate: flight.departure?.gate ?? "-",
    status: getStatusLabel(flight.status, statusTone),
    statusTone,
  };
}

function getDateTime(value?: AeroDateTime) {
  if (value?.utc) return value.utc;
  if (!value?.local) return undefined;

  // Departure local times belong to ICN; make the KST offset explicit when the API omits it.
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.local) ? value.local : `${value.local}+09:00`;
}

function getSortTime(flight: DepartureBoardFlight) {
  const value = flight.revisedAt ?? flight.scheduledAt;
  if (!value) return Number.MAX_SAFE_INTEGER;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function getStatusTone(status?: string, scheduledAt?: string, revisedAt?: string): DepartureStatusTone {
  if (status === "Canceled" || status === "CanceledUncertain") return "canceled";
  if (status === "Boarding" || status === "GateClosed") return "boarding";
  if (status === "Departed" || status === "EnRoute" || status === "Arrived") return "departed";
  if (status === "Delayed" || isMeaningfullyDelayed(scheduledAt, revisedAt)) return "delayed";
  return "scheduled";
}

function isMeaningfullyDelayed(scheduledAt?: string, revisedAt?: string) {
  if (!scheduledAt || !revisedAt) return false;

  const scheduled = Date.parse(scheduledAt);
  const revised = Date.parse(revisedAt);
  return !Number.isNaN(scheduled) && !Number.isNaN(revised) && revised - scheduled >= 10 * 60 * 1000;
}

function getStatusLabel(status: string | undefined, tone: DepartureStatusTone) {
  if (tone === "canceled") return status === "CanceledUncertain" ? "결항 확인 중" : "결항";
  if (tone === "boarding") return status === "GateClosed" ? "탑승 마감" : "탑승 중";
  if (tone === "departed") return "출발";
  if (tone === "delayed") return "지연";

  const labels: Record<string, string> = {
    CheckIn: "수속 중",
    Expected: "예정",
    Unknown: "확인 중",
  };
  return status ? labels[status] ?? "예정" : "확인 중";
}
