import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Alert, Badge, Button, ButtonLink, Card, PageLoader, Progress } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
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
  const soldOut = event.registered >= event.capacity;
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
      <div className="flex flex-wrap gap-2">
        <ButtonLink to={`/dashboard/events/${event.id}/checkin`}>Open check-in</ButtonLink>
        <ButtonLink to={`/dashboard/events/${event.id}/edit`} variant="secondary">
          Edit
        </ButtonLink>
      </div>
    );
  } else if (myTicket) {
    action = (
      <div className="space-y-3">
        <Alert tone="success">You're registered for this event.</Alert>
        <ButtonLink to="/tickets">Show my ticket</ButtonLink>
      </div>
    );
  } else if (isPast) {
    action = <Alert tone="info">This event has already started.</Alert>;
  } else if (soldOut) {
    action = <Alert tone="info">This event is sold out.</Alert>;
  } else if (!user) {
    action = <ButtonLink to={`/login?next=/events/${event.id}`}>Log in to register</ButtonLink>;
  } else if (user.role === "organizer") {
    action = <p className="text-sm text-slate-500">Log in with an attendee account to register.</p>;
  } else {
    action = (
      <Button onClick={register} loading={busy} className="w-full sm:w-auto">
        Get a free ticket
      </Button>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:underline">
        ← All events
      </Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
            <p className="mt-1 text-sm text-slate-500">Organized by {event.organizerName}</p>
          </div>
          {isPast ? <Badge>Past event</Badge> : soldOut ? <Badge tone="red">Sold out</Badge> : <Badge tone="green">Open</Badge>}
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">When</dt>
            <dd className="mt-1 text-sm">{formatDateTime(event.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Where</dt>
            <dd className="mt-1 text-sm">{event.location}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Spots</dt>
            <dd className="mt-1 space-y-1 text-sm">
              <span>
                {Math.max(0, event.capacity - event.registered)} of {event.capacity} left
              </span>
              <Progress value={event.registered} max={event.capacity} />
            </dd>
          </div>
        </dl>

        {event.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-slate-700">{event.description}</p>}

        <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
          {actionError && <Alert>{actionError}</Alert>}
          {action}
        </div>
      </Card>
    </div>
  );
}
