import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Alert, Button, ButtonLink, PageLoader, Perforation, Progress, Tag, TicketField } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, formatTime } from "../lib/format";
import type { GpEvent, TicketStatus } from "../lib/types";
import { useAsync } from "../lib/useAsync";

export function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const { data, error, loading } = useAsync(
    () => api.get<{ event: GpEvent; myTicket: { id: number; status: TicketStatus } | null }>(`/api/events/${id}`),
    [id, user?.id],
  );

  if (loading && !data) return <PageLoader />;
  if (error) return <Alert>{error instanceof ApiError && error.status === 404 ? "This event doesn't exist." : error.message}</Alert>;
  if (!data) return null;
  const { event, myTicket } = data;

  const isPast = new Date(event.startsAt) < new Date();
  const left = Math.max(0, event.capacity - event.registered);
  const soldOut = left === 0;
  const isOwner = user?.id === event.organizerId;

  async function register() {
    setBusy(true);
    setActionError(undefined);
    try {
      await api.post(`/api/events/${event.id}/tickets`);
      navigate("/tickets", { state: { justRegistered: event.id } });
    } catch (e) {
      setActionError((e as Error).message);
      setBusy(false);
    }
  }

  let action;
  if (isOwner) {
    action = (
      <div className="grid gap-2">
        <ButtonLink to={`/dashboard/events/${event.id}/checkin`}>Open the door</ButtonLink>
        <ButtonLink to={`/dashboard/events/${event.id}/edit`} variant="secondary">
          Edit event
        </ButtonLink>
      </div>
    );
  } else if (myTicket) {
    action = (
      <div className="grid gap-3">
        <p className="text-sm text-go">✓ You have a ticket for this.</p>
        <ButtonLink to="/tickets" variant="secondary">
          Show my ticket
        </ButtonLink>
      </div>
    );
  } else if (isPast) {
    action = <p className="font-serif text-2xl italic text-ink-2">This one has already happened.</p>;
  } else if (soldOut) {
    action = <p className="font-serif text-2xl italic text-accent">Sold out.</p>;
  } else if (!user) {
    action = <ButtonLink to={`/login?next=/events/${event.id}`} className="w-full">Log in to get a ticket</ButtonLink>;
  } else if (user.role === "organizer") {
    action = <p className="text-sm text-ink-2">Switch to an attendee account to take a ticket.</p>;
  } else {
    action = (
      <Button onClick={register} loading={busy} className="w-full">
        Take a free ticket
      </Button>
    );
  }

  return (
    <div>
      <Link to="/" className="font-mono text-xs uppercase tracking-[0.12em] text-ink-2 hover:text-accent">
        ← Programme
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <article>
          <div className="mb-5 flex flex-wrap gap-2">
            {isPast ? <Tag tone="muted">Past event</Tag> : soldOut ? <Tag tone="accent">Sold out</Tag> : <Tag tone="go">Tickets available</Tag>}
          </div>
          <h1 className="font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl">{event.title}</h1>
          <p className="mono-label mt-5">Presented by {event.organizerName}</p>
          {event.description && (
            <div className="mt-10 border-t border-line pt-8">
              <p className="max-w-2xl whitespace-pre-line text-lg leading-relaxed text-ink-2">{event.description}</p>
            </div>
          )}
        </article>

        {/* The "stub": all practical details, like the side of a printed ticket */}
        <aside className="relative self-start overflow-hidden border border-ink bg-card">
          <div className="flex items-center justify-between bg-ink px-5 py-2.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-card">Admit one</span>
            <span className="font-mono text-[11px] text-card/70">Nº {String(event.id).padStart(4, "0")}</span>
          </div>
          <dl className="grid grid-cols-2 gap-5 p-5">
            <TicketField label="Date">{formatDate(event.startsAt)}</TicketField>
            <TicketField label="Doors">{formatTime(event.startsAt)}</TicketField>
            <TicketField label="Venue" className="col-span-2">
              {event.location}
            </TicketField>
            <div className="col-span-2">
              <dt className="mono-label mb-2 flex justify-between">
                <span>Seats</span>
                <span className="text-ink">
                  {left} of {event.capacity} left
                </span>
              </dt>
              <dd>
                <Progress value={event.registered} max={event.capacity} tone={soldOut ? "accent" : "ink"} />
              </dd>
            </div>
          </dl>
          <Perforation orientation="horizontal" />
          <div className="space-y-3 p-5">
            {actionError && <Alert>{actionError}</Alert>}
            {action}
          </div>
        </aside>
      </div>
    </div>
  );
}
