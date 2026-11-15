import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { EventPoster } from "../components/EventPoster";
import { Alert, EmptyState, Overprint, PageLoader, cx } from "../components/ui";
import { api } from "../lib/api";
import type { GpEvent } from "../lib/types";
import { useAsync } from "../lib/useAsync";

export function EventsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const past = params.get("past") === "true";
  const [input, setInput] = useState(q);

  // Debounce typing so we don't send a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (input !== q) setParams((p) => (input ? p.set("q", input) : p.delete("q"), p), { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [input, q, setParams]);

  const { data, error, loading } = useAsync(
    () => api.get<{ events: GpEvent[] }>(`/api/events?${new URLSearchParams({ ...(q && { q }), past: String(past) })}`),
    [q, past],
  );

  return (
    <div>
      <section className="relative mb-12">
        {/* Two overlapping shapes, one per ink: the overlap prints violet */}
        <div aria-hidden className="pointer-events-none absolute -right-4 -top-6 hidden h-64 w-64 sm:block lg:right-10">
          <div className="grain absolute right-16 top-0 size-52 rounded-full bg-pink" />
          <div className="grain absolute bottom-0 right-0 size-44 bg-blue mix-blend-multiply" />
        </div>

        <p className="mono-label relative mb-4 font-semibold">
          <span className="bg-yellow px-1">Free entry</span> · Show your code at the door
        </p>
        <h1 className="display relative text-[clamp(3.5rem,11vw,8.5rem)]">
          <Overprint>What's</Overprint>
          <br />
          <Overprint base="text-pink" over="text-blue">
            on.
          </Overprint>
        </h1>

        <div className="relative mt-10 max-w-xl">
          <label htmlFor="search" className="mono-label mb-2 block font-semibold">
            Search the board
          </label>
          <input
            id="search"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Workshop, Cluj, hackathon…"
            className="w-full border-2 border-ink bg-white px-4 py-3 text-lg font-medium outline-none placeholder:text-ink-2/50 focus:shadow-[6px_6px_0_0_var(--color-pink)]"
          />
        </div>
      </section>

      <div className="mb-8 flex items-center justify-between border-y-2 border-ink py-2.5">
        <div className="flex gap-2" role="tablist">
          {(
            [
              ["Upcoming", false],
              ["Past", true],
            ] as const
          ).map(([label, value]) => (
            <button
              key={label}
              role="tab"
              aria-selected={past === value}
              onClick={() => setParams((p) => (value ? p.set("past", "true") : p.delete("past"), p))}
              className={cx(
                "px-2 py-1 font-mono text-[11px] font-semibold uppercase",
                past === value ? "bg-ink text-stock" : "text-ink-2 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {data && <span className="mono-label">{data.events.length} flyers</span>}
      </div>

      {error && <Alert>{error.message}</Alert>}
      {loading && !data ? (
        <PageLoader />
      ) : data?.events.length === 0 ? (
        <EmptyState title={q ? `Nothing for “${q}”` : "The board is empty"}>Try another search, or check back later.</EmptyState>
      ) : (
        <div className={cx("grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3", loading && "opacity-50")}>
          {data?.events.map((e, i) => <EventPoster key={e.id} event={e} index={i} />)}
        </div>
      )}
    </div>
  );
}
