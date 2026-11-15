import { useState } from "react";
import { Link, useLocation } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { Alert, Button, ButtonLink, EmptyState, PageLoader, PageTitle, Perforation, TicketField, cx } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, formatTime } from "../lib/format";
import type { Ticket } from "../lib/types";
import { useAsync } from "../lib/useAsync";

function TicketCard({ ticket, holder, isNew, onCancel }: { ticket: Ticket; holder: string; isNew: boolean; onCancel: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const used = ticket.status === "checked_in";
  const serial = String(ticket.id).padStart(6, "0");

  return (
    <article className={cx("relative flex flex-col overflow-hidden border bg-card sm:flex-row", isNew ? "border-accent" : "border-ink")}>
      {/* Side band with the printed "admit one" */}
      <div className={cx("flex items-center justify-between px-5 py-2 sm:w-9 sm:flex-col sm:justify-center sm:px-0 sm:py-5", used ? "bg-ink-3" : "bg-accent")}>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-card sm:rotate-180 sm:[writing-mode:vertical-rl]">
          Admit one · Nº {serial}
        </span>
      </div>

      <div className="flex-1 p-6">
        {isNew && <p className="mono-label mb-2 !text-accent">Just issued</p>}
        <Link to={`/events/${ticket.event.id}`} className="font-serif text-4xl leading-none tracking-tight hover:text-accent">
          {ticket.event.title}
        </Link>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <TicketField label="Date">{formatDate(ticket.event.startsAt)}</TicketField>
          <TicketField label="Doors">{formatTime(ticket.event.startsAt)}</TicketField>
          <TicketField label="Holder">{holder}</TicketField>
          <TicketField label="Venue" className="col-span-2 sm:col-span-3">
            {ticket.event.location}
          </TicketField>
        </dl>

        {!used && (
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
            <Button
              variant="ghost"
              className="font-mono text-[11px]"
              onClick={async () => {
                await navigator.clipboard.writeText(ticket.qrPayload);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied ✓" : "Copy code"}
            </Button>
            {confirming ? (
              <span className="flex items-center gap-4">
                <span className="text-sm text-ink-2">Give up this seat?</span>
                <Button
                  variant="ghost"
                  className="!text-accent"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    await onCancel().finally(() => setBusy(false));
                  }}
                >
                  Yes, cancel
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Keep it
                </Button>
              </span>
            ) : (
              <Button variant="ghost" onClick={() => setConfirming(true)}>
                Cancel ticket
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="sm:hidden">
        <Perforation orientation="horizontal" />
      </div>
      <div className="hidden sm:flex">
        <Perforation orientation="vertical" />
      </div>

      {/* Stub */}
      <div className="relative flex flex-col items-center justify-center gap-3 p-6 sm:w-60">
        <div className={cx("border border-line bg-white p-2", used && "opacity-25")}>
          <QRCodeSVG value={ticket.qrPayload} size={150} marginSize={1} fgColor="#1d1a16" aria-label="Ticket QR code" />
        </div>
        <span className="mono-label">{used ? "Used" : "Scan at the door"}</span>
        {used && (
          <span className="absolute rotate-[-14deg] border-[3px] border-double border-go px-3 py-1 text-center font-mono text-sm font-medium uppercase tracking-[0.14em] text-go">
            Admitted
            {ticket.checkedInAt && <span className="block text-[11px]">{formatTime(ticket.checkedInAt)}</span>}
          </span>
        )}
      </div>
    </article>
  );
}

export function MyTicketsPage() {
  const location = useLocation();
  const { user } = useAuth();
  const justRegistered = (location.state as { justRegistered?: number } | null)?.justRegistered;
  const { data, error, loading, reload } = useAsync(() => api.get<{ tickets: Ticket[] }>("/api/tickets/mine"), []);

  if (loading && !data) return <PageLoader />;
  if (error) return <Alert>{error.message}</Alert>;

  const tickets = [...data!.tickets].sort((a, b) => Number(a.status === "checked_in") - Number(b.status === "checked_in"));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="border-b border-ink pb-8">
        <PageTitle kicker={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`} sub="Show the code at the entrance. Turning the screen brightness up helps the scanner.">
          My <span className="italic">tickets</span>
        </PageTitle>
      </div>

      {justRegistered && (
        <div className="mt-6">
          <Alert tone="success">You're on the list. Your ticket is below.</Alert>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {tickets.length === 0 ? (
          <EmptyState title="No tickets yet">
            <div className="mt-5">
              <ButtonLink to="/">See what's on</ButtonLink>
            </div>
          </EmptyState>
        ) : (
          tickets.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              holder={user?.name ?? ""}
              isNew={t.event.id === justRegistered}
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
