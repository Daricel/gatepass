import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { EventRow } from "../components/EventRow";
import { Alert, EmptyState, PageLoader, cx } from "../components/ui";
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

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      <section className="grid gap-10 border-b border-ink pb-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="mono-label mb-4">Programme · {today}</p>
          <h1 className="font-serif text-6xl leading-[0.9] tracking-tight sm:text-8xl">
            What's <span className="italic text-accent">on</span>
            <br />
            this season.
          </h1>
        </div>
        <div>
          <p className="mb-5 max-w-sm text-ink-2">
            Pick an event, take a free ticket, and show the code at the door. No printing, no queue at the desk.
          </p>
          <label htmlFor="search" className="mono-label mb-1.5 block">
            Search the programme
          </label>
          <input
            id="search"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Title, venue or topic"
            className="w-full border-b-2 border-ink bg-transparent py-2 font-serif text-2xl outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </div>
      </section>

      <div className="flex items-center justify-between border-b border-line py-3">
        <div className="flex gap-6" role="tablist">
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
                "border-b-2 py-1 font-mono text-xs uppercase tracking-[0.12em]",
                past === value ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {data && <span className="mono-label">{data.events.length} listed</span>}
      </div>

      {error && (
        <div className="mt-6">
          <Alert>{error.message}</Alert>
        </div>
      )}
      {loading && !data ? (
        <PageLoader />
      ) : data?.events.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={q ? `Nothing matches “${q}”` : "The programme is empty"}>Try another search, or check back later.</EmptyState>
        </div>
      ) : (
        <ul className={cx("divide-y divide-line", loading && "opacity-50")}>
          {data?.events.map((e) => <EventRow key={e.id} event={e} />)}
        </ul>
      )}
    </div>
  );
}
