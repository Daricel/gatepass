import { useState } from "react";
import { Link, useLocation } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { Alert, Button, ButtonLink, EmptyState, Overprint, PageLoader, PageTitle, Perforation, TicketField, cx } from "../components/ui";
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
    <article
      className={cx(
        "relative flex flex-col overflow-hidden border-2 border-ink bg-white sm:flex-row",
        isNew && "shadow-[10px_10px_0_0_var(--color-pink)]",
      )}
    >
      {/* Coloured band with the printed "admit one" */}
      <div className={cx("grain relative flex items-center justify-between px-5 py-2 sm:w-10 sm:flex-col sm:justify-center sm:px-0 sm:py-5", used ? "bg-ink-2" : "bg-blue")}>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-white sm:rotate-180 sm:[writing-mode:vertical-rl]">
          Admit one · Nº {serial}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden p-6">
        <div aria-hidden className="halftone absolute -right-16 -top-16 size-48 rounded-full text-pink/35" />
        {isNew && <p className="relative mb-3 inline-block bg-yellow px-1.5 font-mono text-[10px] font-semibold uppercase">Just printed</p>}
        <Link to={`/events/${ticket.event.id}`} className="display relative block text-4xl leading-[0.9] [overflow-wrap:anywhere] hover:text-blue">
          {used ? ticket.event.title : <Overprint>{ticket.event.title}</Overprint>}
        </Link>
        <dl className="relative mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <TicketField label="Date">{formatDate(ticket.event.startsAt)}</TicketField>
          <TicketField label="Doors">{formatTime(ticket.event.startsAt)}</TicketField>
          <TicketField label="Holder">{holder}</TicketField>
          <TicketField label="Venue" className="col-span-2 sm:col-span-3">
            {ticket.event.location}
          </TicketField>
        </dl>

        {!used && (
          <div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-ink pt-4 font-mono text-[11px] font-semibold uppercase">
            <Button
              variant="ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(ticket.qrPayload);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied!" : "Copy code"}
            </Button>
            {confirming ? (
              <span className="flex flex-wrap items-center gap-4">
                <span className="normal-case">Give up this seat?</span>
                <Button
                  variant="ghost"
                  className="!text-ink !decoration-pink bg-pink px-1.5"
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

      {/* Stub with the code, printed in the overprint violet */}
      <div className="relative flex flex-col items-center justify-center gap-3 bg-white p-6 sm:w-60">
        <div className={cx("border-2 border-ink bg-white p-2", used && "opacity-20")}>
          <QRCodeSVG value={ticket.qrPayload} size={150} marginSize={1} fgColor="#002284" aria-label="Ticket QR code" />
        </div>
        <span className="mono-label font-semibold">{used ? "Used" : "Scan at the door"}</span>
        {used && (
          <span className="absolute -rotate-12 border-4 border-double border-pink bg-white/70 px-3 py-1 text-center mix-blend-multiply">
            <span className="display block text-2xl text-pink">Admitted</span>
            {ticket.checkedInAt && <span className="block font-mono text-[11px] font-semibold text-pink">{formatTime(ticket.checkedInAt)}</span>}
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
      <PageTitle kicker={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"} in your pocket`} sub="Show the code at the entrance. Turn your screen brightness up so the scanner reads it first time.">
        My tickets
      </PageTitle>

      {justRegistered && (
        <div className="mt-6">
          <Alert tone="success">You're on the list. Your ticket is below.</Alert>
        </div>
      )}

      <div className="mt-10 space-y-8">
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
