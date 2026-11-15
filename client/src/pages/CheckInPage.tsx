import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { QrScannerView } from "../components/QrScannerView";
import { Alert, Badge, Button, Card, PageLoader, Progress, cx } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { formatDateTime, formatTime } from "../lib/format";
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

  return (
    <div>
      <Link to="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Dashboard
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-sm text-slate-500">
            {formatDateTime(event.startsAt)} · {event.location}
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <span className={cx("size-2 rounded-full", connected ? "animate-pulse bg-emerald-500" : "bg-slate-300")} />
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="relative">
            <QrScannerView onScan={onScan} paused={!!outcome} />
            {outcome && (
              <div
                role="status"
                aria-live="assertive"
                className={cx(
                  "absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-6 text-center text-white",
                  outcome.kind === "ok" && "bg-emerald-600/95",
                  outcome.kind === "already" && "bg-amber-500/95",
                  outcome.kind === "error" && "bg-red-600/95",
                )}
              >
                <span className="text-6xl" aria-hidden>
                  {outcome.kind === "ok" ? "✓" : outcome.kind === "already" ? "!" : "✕"}
                </span>
                <p className="mt-3 text-2xl font-bold">
                  {outcome.kind === "ok" ? `Welcome, ${outcome.name}!` : outcome.kind === "already" ? "Already checked in" : "Not valid"}
                </p>
                <p className="mt-1 text-white/90">
                  {outcome.kind === "already"
                    ? `${outcome.name}${outcome.at ? ` at ${formatTime(outcome.at)}` : ""}`
                    : outcome.kind === "error"
                      ? outcome.message
                      : "Ticket accepted"}
                </p>
                <Button variant="secondary" className="mt-6" onClick={() => setOutcome(undefined)}>
                  Scan next
                </Button>
              </div>
            )}
          </div>

          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-slate-500">Checked in</p>
              <p className="text-sm text-slate-500">{registered ? Math.round((checkedIn / registered) * 100) : 0}%</p>
            </div>
            <p className="mb-3 text-4xl font-bold tracking-tight">
              {checkedIn}
              <span className="text-xl font-medium text-slate-400"> / {registered}</span>
            </p>
            <Progress value={checkedIn} max={registered} tone="emerald" />
            {stats?.lastCheckIn && (
              <p className="mt-3 text-xs text-slate-500">
                Last: {stats.lastCheckIn.name} at {formatTime(stats.lastCheckIn.at)}
              </p>
            )}
          </Card>

          <div>
            <button onClick={() => setShowPaste((s) => !s)} className="text-sm text-slate-500 underline-offset-2 hover:underline">
              {showPaste ? "Hide" : "No camera? Paste a ticket code"}
            </button>
            {showPaste && (
              <form
                className="mt-2 flex gap-2"
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
                  className="flex-1 rounded-lg px-3 py-2 font-mono text-sm ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <Button type="submit" loading={busy}>
                  Check in
                </Button>
              </form>
            )}
          </div>
        </div>

        <Card className="flex max-h-[44rem] flex-col p-0 lg:col-span-2">
          <div className="border-b border-slate-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Attendees</h2>
              <a href={`/api/events/${id}/attendees.csv`} className="text-sm font-medium text-indigo-600 hover:underline">
                Export CSV
              </a>
            </div>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search attendees"
              className="w-full rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {filtered.map((a) => (
              <li key={a.ticketId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-slate-500">{a.email}</p>
                </div>
                {a.status === "checked_in" ? (
                  <Badge tone="green">{a.checkedInAt ? formatTime(a.checkedInAt) : "In"}</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    disabled={busy}
                    onClick={() => submit(() => api.post<CheckInResult>(`/api/events/${id}/attendees/${a.ticketId}/checkin`))}
                  >
                    Check in
                  </Button>
                )}
              </li>
            ))}
            {attendeesReq.data && filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">{filter ? "No matches" : "No one registered yet"}</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
