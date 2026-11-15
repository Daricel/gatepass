import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { QrScannerView } from "../components/QrScannerView";
import { Alert, Button, PageLoader, Progress, cx } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";
import type { Attendee, CheckInResult, GpEvent } from "../lib/types";
import { useAsync } from "../lib/useAsync";

type ScanOutcome =
  | { kind: "ok"; name: string }
  | { kind: "already"; name: string; at?: string }
  | { kind: "error"; message: string };

interface LiveStats {
  registered: number;
  checkedIn: number;
  lastCheckIn?: { name: string; at: string };
}

function describeError(err: unknown): ScanOutcome {
  if (err instanceof ApiError && err.code === "already_checked_in") {
    const d = err.details as { checkedInAt?: string; attendee?: { name: string } } | undefined;
    return { kind: "already", name: d?.attendee?.name ?? "This person", at: d?.checkedInAt };
  }
  return { kind: "error", message: (err as Error).message };
}

function feedback(ok: boolean) {
  navigator.vibrate?.(ok ? 80 : [60, 60, 60]);
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    /* audio is optional */
  }
}

export function CheckInPage() {
  const { id } = useParams();
  const eventReq = useAsync(() => api.get<{ event: GpEvent }>(`/api/events/${id}`).then((r) => r.event), [id]);
  const attendeesReq = useAsync(() => api.get<{ attendees: Attendee[] }>(`/api/events/${id}/attendees`).then((r) => r.attendees), [id]);

  const [stats, setStats] = useState<LiveStats>();
  const [connected, setConnected] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome>();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const lastScan = useRef({ text: "", at: 0 });
  const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reloadAttendees = attendeesReq.reload;

  // Live stats over Server-Sent Events. Other door scanners update this screen too.
  useEffect(() => {
    const es = new EventSource(`/api/events/${id}/live`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (m) => {
      setStats(JSON.parse(m.data));
      reloadAttendees();
    };
    return () => es.close();
  }, [id, reloadAttendees]);

  const show = useCallback((o: ScanOutcome) => {
    setOutcome(o);
    feedback(o.kind === "ok");
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setOutcome(undefined), 3500);
  }, []);

  const submit = useCallback(
    async (request: () => Promise<CheckInResult>) => {
      setBusy(true);
      try {
        const r = await request();
        show({ kind: "ok", name: r.attendee.name });
      } catch (e) {
        show(describeError(e));
      } finally {
        setBusy(false);
      }
    },
    [show],
  );

  const onScan = useCallback(
    (text: string) => {
      // The camera decodes the same code many times per second; ignore repeats for 3s.
      const now = Date.now();
      if (busy || (text === lastScan.current.text && now - lastScan.current.at < 3000)) return;
      lastScan.current = { text, at: now };
      submit(() => api.post<CheckInResult>(`/api/events/${id}/checkin`, { payload: text }));
    },
    [busy, id, submit],
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = attendeesReq.data ?? [];
    return q ? list.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)) : list;
  }, [attendeesReq.data, filter]);

  if (eventReq.loading && !eventReq.data) return <PageLoader />;
  if (eventReq.error) return <Alert>{eventReq.error.message}</Alert>;
  const event = eventReq.data!;
  const registered = stats?.registered ?? event.registered;
  const checkedIn = stats?.checkedIn ?? event.checkedIn;

  const pct = registered ? Math.round((checkedIn / registered) * 100) : 0;
  const verdict = outcome && {
    ok: { bg: "bg-go", title: "Admitted.", line: outcome.kind === "ok" ? `Welcome, ${outcome.name}.` : "" },
    already: {
      bg: "bg-warn",
      title: "Already in.",
      line: outcome.kind === "already" ? `${outcome.name}${outcome.at ? ` came through at ${formatTime(outcome.at)}` : ""}.` : "",
    },
    error: { bg: "bg-accent", title: "Rejected.", line: outcome.kind === "error" ? outcome.message : "" },
  }[outcome.kind];

  return (
    <div>
      <Link to="/dashboard" className="font-mono text-xs uppercase tracking-[0.12em] text-ink-2 hover:text-accent">
        ← Box office
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-6">
        <div>
          <p className="mono-label mb-2">
            Door · {formatDate(event.startsAt)} · {event.location}
          </p>
          <h1 className="font-serif text-5xl leading-[0.95] tracking-tight">{event.title}</h1>
        </div>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span className={cx("size-2 rounded-full", connected ? "animate-pulse bg-accent" : "bg-ink-3")} />
          {connected ? "Live" : "Connecting"}
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <div className="relative border border-ink bg-ink">
            <QrScannerView onScan={onScan} paused={!!outcome} />
            {verdict && (
              <div
                role="status"
                aria-live="assertive"
                className={cx("absolute inset-0 flex flex-col justify-between p-6 text-card sm:p-10", verdict.bg)}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-card/80">
                  {outcome!.kind === "ok" ? "Ticket valid" : outcome!.kind === "already" ? "Ticket already used" : "Ticket not valid"}
                </span>
                <div>
                  <p className="font-serif text-7xl leading-none sm:text-8xl">{verdict.title}</p>
                  <p className="mt-3 text-lg text-card/90">{verdict.line}</p>
                </div>
                <button
                  onClick={() => setOutcome(undefined)}
                  className="self-start border border-card px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] hover:bg-card hover:text-ink"
                >
                  Scan next
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[auto_1fr] items-end gap-x-8 border-y border-line py-5">
            <div>
              <p className="mono-label">Through the door</p>
              <p className="font-serif text-7xl leading-none">
                {checkedIn}
                <span className="text-3xl text-ink-3"> / {registered}</span>
              </p>
            </div>
            <div className="pb-2">
              <p className="mb-2 text-right font-mono text-xs">{pct}%</p>
              <Progress value={checkedIn} max={registered} tone="go" />
              <p className="mt-2 h-4 truncate text-right font-mono text-[11px] text-ink-2">
                {stats?.lastCheckIn && `Last in: ${stats.lastCheckIn.name}, ${formatTime(stats.lastCheckIn.at)}`}
              </p>
            </div>
          </div>

          <div>
            <button onClick={() => setShowPaste((s) => !s)} className="font-mono text-xs uppercase tracking-[0.12em] text-ink-2 hover:text-ink">
              {showPaste ? "− Hide code entry" : "+ No camera? Type or paste a code"}
            </button>
            {showPaste && (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem("payload") as HTMLInputElement;
                  submit(() => api.post<CheckInResult>(`/api/events/${id}/checkin`, { payload: input.value }));
                  input.value = "";
                }}
              >
                <input
                  name="payload"
                  placeholder="GP1.…"
                  aria-label="Ticket code"
                  className="flex-1 border border-line bg-card px-3 font-mono text-sm outline-none focus:border-ink"
                />
                <Button type="submit" loading={busy}>
                  Check in
                </Button>
              </form>
            )}
          </div>
        </div>

        <section className="flex max-h-[46rem] flex-col border border-ink bg-card">
          <div className="border-b border-ink p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-3xl italic">Guest list</h2>
              <a href={`/api/events/${id}/attendees.csv`} className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent hover:underline">
                Export CSV
              </a>
            </div>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a name or email"
              aria-label="Search guest list"
              className="w-full border border-line bg-paper/60 px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-ink"
            />
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {filtered.map((a) => (
              <li key={a.ticketId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className={cx("truncate text-[15px]", a.status === "checked_in" && "text-ink-2")}>{a.name}</p>
                  <p className="truncate font-mono text-[11px] text-ink-3">{a.email}</p>
                </div>
                {a.status === "checked_in" ? (
                  <span className="shrink-0 font-mono text-xs text-go">✓ {a.checkedInAt ? formatTime(a.checkedInAt) : "In"}</span>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => submit(() => api.post<CheckInResult>(`/api/events/${id}/attendees/${a.ticketId}/checkin`))}
                    className="shrink-0 border border-ink px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] hover:bg-ink hover:text-card disabled:opacity-40"
                  >
                    Let in
                  </button>
                )}
              </li>
            ))}
            {attendeesReq.data && filtered.length === 0 && (
              <li className="px-4 py-10 text-center font-serif text-xl italic text-ink-2">{filter ? "No one by that name" : "No one on the list yet"}</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
