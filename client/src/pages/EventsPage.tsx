import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { EventCard } from "../components/EventCard";
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

  return (
    <div>
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-10 text-white sm:px-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find your next event</h1>
        <p className="mt-2 max-w-xl text-indigo-100">
          Register in one click, get a QR ticket on your phone, and walk straight in.
        </p>
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by title, place or topic…"
          aria-label="Search events"
          className="mt-6 w-full max-w-lg rounded-xl border-0 px-4 py-3 text-slate-900 shadow-lg outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-300"
        />
      </div>

      <div className="mb-4 flex gap-2">
        {[
          ["Upcoming", false],
          ["Past", true],
        ].map(([label, value]) => (
          <button
            key={String(label)}
            onClick={() => setParams((p) => (value ? p.set("past", "true") : p.delete("past"), p))}
            className={cx(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              past === value ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Alert>{error.message}</Alert>}
      {loading && !data ? (
        <PageLoader />
      ) : data?.events.length === 0 ? (
        <EmptyState title={q ? `No events match "${q}"` : "No events yet"}>Try another search, or check back later.</EmptyState>
      ) : (
        <div className={cx("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", loading && "opacity-60")}>
          {data?.events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}
