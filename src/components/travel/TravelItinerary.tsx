import { CalendarDays, Clock3, MapPin } from "lucide-react";
import Link from "next/link";
import type { Travel } from "@/data/travel";

type TravelItineraryProps = {
  items: Travel[];
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function sortItineraryItems(items: Travel[]) {
  const stops = items.flatMap((item) =>
    item.itinerary.length
      ? item.itinerary.map((stop) => ({
          ...item,
          ...stop,
          title: item.tripTitle ?? item.title,
        }))
      : [item],
  );

  return stops.sort(
    (a, b) => timelineTimestamp(a.visitedAt, a.visitedTime) - timelineTimestamp(b.visitedAt, b.visitedTime),
  );
}

function timelineTimestamp(date: string, time?: string) {
  const value = Date.parse(`${date}T${time?.slice(0, 5) || "23:59"}:00`);

  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

export function TravelItinerary({ items }: TravelItineraryProps) {
  const itinerary = sortItineraryItems(items);
  const groups = itinerary.reduce<Map<string, Travel[]>>((result, item) => {
    const group = result.get(item.visitedAt) ?? [];

    group.push(item);
    result.set(item.visitedAt, group);
    return result;
  }, new Map());

  return (
    <section className="rounded-lg border border-[#d9efb9] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#4d7c0f]">ITINERARY</p>
          <h2 className="mt-2 text-2xl font-black text-[#17202a]">여행 동선</h2>
          <p className="mt-2 text-sm leading-6 text-[#52616b]">
            방문일과 시간을 기준으로 저장한 장소를 순서대로 보여줍니다.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md bg-[#f7fee7] px-3 py-2 text-sm font-bold text-[#4d7c0f]">
          <MapPin size={16} aria-hidden="true" />
          {items.length}개 장소
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-[#cce5a4] bg-[#fbfff5] p-6 text-center">
          <CalendarDays className="mx-auto text-[#65a30d]" size={24} aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-[#334155]">아직 정리할 여행 동선이 없습니다.</p>
          <p className="mt-1 text-xs leading-5 text-[#64748b]">여행 장소를 기록하고 방문일과 시간을 입력해 보세요.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {Array.from(groups.entries()).map(([date, dayItems]) => (
            <div key={date} className="grid gap-3">
              <h3 className="flex items-center gap-2 text-sm font-black text-[#3f6212]">
                <CalendarDays size={16} aria-hidden="true" />
                {formatDate(date)}
              </h3>
              <ol className="grid gap-2 border-l-2 border-[#d9efb9] pl-4">
                {dayItems.map((item) => (
                  <li key={item.id} className="relative">
                    <span className="absolute -left-[1.35rem] top-5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#65a30d]" />
                    <Link
                      href={`/travel/${item.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#e5e7eb] bg-[#fbfaf7] px-4 py-3 transition hover:border-[#84cc16] hover:bg-[#f7fee7]"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#17202a]">{item.storeName}</p>
                        {item.title ? <p className="mt-1 text-xs font-bold text-[#4d7c0f]">{item.title}</p> : null}
                        {item.address ? <p className="mt-1 line-clamp-1 text-xs text-[#64748b]">{item.address}</p> : null}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#4d7c0f]">
                        <Clock3 size={15} aria-hidden="true" />
                        {item.visitedTime?.slice(0, 5) ?? "시간 미정"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
