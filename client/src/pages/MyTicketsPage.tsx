import { useState } from "react";
import { Link, useLocation } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { Alert, Badge, Button, ButtonLink, EmptyState, PageLoader } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime, formatTime } from "../lib/format";
import type { Ticket } from "../lib/types";
import { useAsync } from "../lib/useAsync";

function TicketCard({ ticket, highlight, onCancel }: { ticket: Ticket; highlight: boolean; onCancel: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const used = ticket.status === "checked_in";

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${highlight ? "ring-2 ring-indigo-500" : "ring-slate-200"}`}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="flex-1 p-6">
          <div className="flex items-center gap-2">
            {used ? <Badge tone="green">Checked in {ticket.checkedInAt && formatTime(ticket.checkedInAt)}</Badge> : <Badge tone="indigo">Valid</Badge>}
            {highlight && <Badge tone="amber">New</Badge>}
          </div>
          <Link to={`/events/${ticket.event.id}`} className="mt-3 block text-lg font-semibold hover:text-indigo-700">
            {ticket.event.title}
          </Link>
          <p className="mt-1 text-sm text-slate-500">{formatDateTime(ticket.event.startsAt)}</p>
          <p className="text-sm text-slate-500">{ticket.event.location}</p>
          <p className="mt-4 text-xs text-slate-400">Ticket #{ticket.id}</p>

          {!used && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                className="px-2 text-xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(ticket.qrPayload);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied!" : "Copy code"}
              </Button>
              {confirming ? (
                <>
                  <Button
                    variant="danger"
                    className="px-2 text-xs"
                    loading={busy}
                    onClick={async () => {
                      setBusy(true);
                      await onCancel().finally(() => setBusy(false));
                    }}
                  >
                    Yes, cancel ticket
                  </Button>
                  <Button variant="ghost" className="px-2 text-xs" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                </>
              ) : (
                <Button variant="ghost" className="px-2 text-xs text-red-600" onClick={() => setConfirming(true)}>
                  Cancel ticket
                </Button>
              )}
            </div>
          )}
        </div>
        {/* Perforated "stub" with the QR code */}
        <div className="relative flex items-center justify-center border-t-2 border-dashed border-slate-200 bg-slate-50 p-6 sm:border-l-2 sm:border-t-0">
          <div className={used ? "opacity-30 grayscale" : ""}>
            <QRCodeSVG value={ticket.qrPayload} size={156} marginSize={2} className="rounded-lg bg-white" aria-label="Ticket QR code" />
          </div>
          {used && <span className="absolute rotate-[-12deg] rounded border-2 border-emerald-600 px-2 py-1 text-sm font-bold uppercase text-emerald-700">Used</span>}
        </div>
      </div>
    </article>
  );
}

export function MyTicketsPage() {
  const location = useLocation();
  const justRegistered = (location.state as { justRegistered?: number } | null)?.justRegistered;
  const { data, error, loading, reload } = useAsync(() => api.get<{ tickets: Ticket[] }>("/api/tickets/mine"), []);

  if (loading && !data) return <PageLoader />;
  if (error) return <Alert>{error.message}</Alert>;

  const now = new Date().toISOString();
  const upcoming = data!.tickets.filter((t) => t.event.startsAt >= now || t.status === "valid");
  const past = data!.tickets.filter((t) => !upcoming.includes(t));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">My tickets</h1>
      <p className="mt-1 text-sm text-slate-500">Show the QR code at the entrance. Turn your screen brightness up.</p>
      {justRegistered && (
        <div className="mt-4">
          <Alert tone="success">You're in! Your ticket is below.</Alert>
        </div>
      )}
      <div className="mt-6 space-y-4">
        {data!.tickets.length === 0 ? (
          <EmptyState title="No tickets yet">
            <div className="mt-4">
              <ButtonLink to="/">Browse events</ButtonLink>
            </div>
          </EmptyState>
        ) : (
          [...upcoming, ...past].map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              highlight={t.event.id === justRegistered}
              onCancel={async () => {
                await api.del(`/api/tickets/${t.id}`);
                reload();
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
