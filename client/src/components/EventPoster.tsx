import { Link } from "react-router";
import { formatTime, relativeDays } from "../lib/format";
import type { GpEvent } from "../lib/types";
import { POSTER_INKS, Tag, cx } from "./ui";

const TILTS = ["-rotate-1", "rotate-[0.6deg]", "-rotate-[0.4deg]", "rotate-1"];
// Each poster gets one geometric shape printed in its second ink.
const SHAPES = [
  "absolute -right-14 top-[38%] size-44 rounded-full",
  "absolute -bottom-10 -right-8 size-40 rotate-12",
  "absolute -right-16 top-1/3 h-24 w-56 -rotate-12",
];

/** One flyer on the noticeboard. */
export function EventPoster({ event, index }: { event: GpEvent; index: number }) {
  const ink = POSTER_INKS[index % POSTER_INKS.length];
  const d = new Date(event.startsAt);
  const left = event.capacity - event.registered;
  const soon = relativeDays(event.startsAt);
  const soldOut = left <= 0;

  return (
    <Link
      to={`/events/${event.id}`}
      className={cx(
        "group relative flex min-h-[23rem] flex-col overflow-hidden border-2 border-ink p-5 transition-transform duration-200 hover:z-10 hover:rotate-0 hover:scale-[1.02]",
        "grain",
        ink.bg,
        TILTS[index % TILTS.length],
      )}
    >
      <div aria-hidden className={cx(SHAPES[index % SHAPES.length], "halftone opacity-60 mix-blend-multiply", ink.shape)} />

      <div className="relative flex items-start justify-between gap-2">
        <div className={cx("display text-[5.5rem] leading-[0.8]", ink.text)}>{String(d.getDate()).padStart(2, "0")}</div>
        <div className={cx("text-right font-mono text-[11px] font-semibold uppercase leading-tight", ink.sub)}>
          {d.toLocaleString("en-GB", { month: "short" })}
          <br />
          {d.toLocaleString("en-GB", { weekday: "short" })} {formatTime(event.startsAt)}
        </div>
      </div>

      <h3 className={cx("display relative mt-auto pt-10 text-[1.75rem] leading-[0.92] [overflow-wrap:break-word]", ink.text)}>{event.title}</h3>
      <p className={cx("relative mt-3 font-mono text-[11px]", ink.sub)}>{event.location}</p>

      <div className="relative mt-4 flex items-center justify-between gap-2 border-t-2 border-current pt-3">
        <span className={cx("font-mono text-[11px] font-semibold", ink.sub)}>
          {soldOut ? "No seats left" : `${left} of ${event.capacity} seats left`}
        </span>
        <span className="flex gap-1">
          {soon && soon !== "Past" && <Tag tone="white">{soon}</Tag>}
          {soldOut && <Tag tone="white">Sold out</Tag>}
        </span>
      </div>
    </Link>
  );
}
