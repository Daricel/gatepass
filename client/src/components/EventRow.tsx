import { Link } from "react-router";
import { formatTime, relativeDays } from "../lib/format";
import type { GpEvent } from "../lib/types";
import { Progress, Tag } from "./ui";

/** One line of the "programme": date block · title & venue · availability. */
export function EventRow({ event }: { event: GpEvent }) {
  const d = new Date(event.startsAt);
  const left = event.capacity - event.registered;
  const soon = relativeDays(event.startsAt);
  const soldOut = left <= 0;

  return (
    <li>
      <Link
        to={`/events/${event.id}`}
        className="group grid grid-cols-[4.5rem_1fr] items-center gap-x-5 gap-y-3 py-6 transition-colors hover:bg-card sm:grid-cols-[6rem_1fr_11rem_2rem] sm:px-3"
      >
        <div className="text-center">
          <div className="mono-label">{d.toLocaleString("en-GB", { weekday: "short" })}</div>
          <div className="font-serif text-5xl leading-none">{d.getDate()}</div>
          <div className="mono-label">{d.toLocaleString("en-GB", { month: "short" })}</div>
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {soon && soon !== "Past" && <Tag tone="accent">{soon}</Tag>}
            {soldOut ? <Tag tone="muted">Sold out</Tag> : left <= 5 && <Tag tone="warn">{left} left</Tag>}
          </div>
          <h3 className="font-serif text-[1.9rem] leading-tight tracking-tight group-hover:text-accent">{event.title}</h3>
          <p className="mt-1 font-mono text-xs text-ink-2">
            {formatTime(event.startsAt)} — {event.location}
          </p>
        </div>

        <div className="col-start-2 sm:col-start-3">
          <div className="mb-1.5 flex justify-between font-mono text-xs">
            <span className="text-ink-2">Seats taken</span>
            <span>
              {event.registered}/{event.capacity}
            </span>
          </div>
          <Progress value={event.registered} max={event.capacity} tone={soldOut ? "accent" : "ink"} />
        </div>

        <span
          aria-hidden
          className="hidden text-right font-serif text-3xl text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-accent sm:block"
        >
          →
        </span>
      </Link>
    </li>
  );
}
