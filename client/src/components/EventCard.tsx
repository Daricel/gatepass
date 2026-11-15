import { Link } from "react-router";
import { formatDate, formatTime, relativeDays } from "../lib/format";
import type { GpEvent } from "../lib/types";
import { Badge, Progress } from "./ui";

export function EventCard({ event }: { event: GpEvent }) {
  const left = event.capacity - event.registered;
  const soon = relativeDays(event.startsAt);
  const d = new Date(event.startsAt);
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-200"
    >
      <div className="flex items-start gap-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-indigo-50 py-2 text-indigo-700">
          <span className="text-xs font-semibold uppercase">{d.toLocaleString(undefined, { month: "short" })}</span>
          <span className="text-2xl font-bold leading-none">{d.getDate()}</span>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-700">{event.title}</h3>
          <p className="mt-1 truncate text-sm text-slate-500">{event.location}</p>
          <p className="text-sm text-slate-500">
            {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Progress value={event.registered} max={event.capacity} />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {event.registered}/{event.capacity} registered
          </span>
          <span className="flex gap-1">
            {soon && soon !== "Past" && <Badge tone="indigo">{soon}</Badge>}
            {left <= 0 ? <Badge tone="red">Sold out</Badge> : left <= 5 && <Badge tone="amber">{left} left</Badge>}
          </span>
        </div>
      </div>
    </Link>
  );
}
