import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Alert, Button, ButtonLink, Overprint, PageLoader, Perforation, Progress, Tag, TicketField } from "../components/ui";
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

  const d = new Date(event.startsAt);
  const isPast = d < new Date();
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
      <div className="grid gap-3">
        <ButtonLink to={`/dashboard/events/${event.id}/checkin`}>Open the door</ButtonLink>
        <ButtonLink to={`/dashboard/events/${event.id}/edit`} variant="secondary">
          Edit event
        </ButtonLink>
      </div>
    );
  } else if (myTicket) {
    action = (
      <div className="grid gap-3">
        <p className="bg-yellow px-2 py-1 text-sm font-semibold">You have a ticket for this.</p>
        <ButtonLink to="/tickets" variant="secondary">
          Show my ticket
        </ButtonLink>
      </div>
    );
  } else if (isPast) {
    action = <p className="display text-2xl text-ink-2">Already happened</p>;
  } else if (soldOut) {
    action = (
      <p className="display text-3xl">
        <Overprint>Sold out</Overprint>
      </p>
    );
  } else if (!user) {
    action = (
      <ButtonLink to={`/login?next=/events/${event.id}`} className="w-full">
        Log in to get a ticket
      </ButtonLink>
    );
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
      <Link to="/" className="font-mono text-[11px] font-semibold uppercase text-ink-2 hover:text-ink">
        ← Back to the board
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_21rem]">
        {/* The poster */}
        <article className="grain relative overflow-hidden border-2 border-ink bg-pink p-6 sm:p-10">
          <div aria-hidden className="halftone absolute -right-44 top-28 size-96 rounded-full text-blue opacity-70 mix-blend-multiply" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="display text-[7rem] leading-[0.8] text-violet sm:text-[10rem]">{String(d.getDate()).padStart(2, "0")}</div>
            <div className="text-right font-mono text-sm font-semibold uppercase leading-snug">
              {d.toLocaleString("en-GB", { month: "long" })}
              <br />
              {d.toLocaleString("en-GB", { weekday: "long" })}
              <br />
              Doors {formatTime(event.startsAt)}
            </div>
          </div>
          <h1 className="display relative mt-12 text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[0.9] text-violet [overflow-wrap:break-word]">{event.title}</h1>
          <p className="relative mt-5 font-mono text-xs font-semibold uppercase">Presented by {event.organizerName}</p>
          {event.description && (
            <p className="relative mt-8 max-w-xl whitespace-pre-line border-t-2 border-ink pt-6 text-lg font-medium leading-relaxed">
              {event.description}
            </p>
          )}
        </article>

        {/* The ticket stub with the practical details */}
        <aside className="relative self-start overflow-hidden border-2 border-ink bg-white">
          <div className="flex items-center justify-between bg-blue px-5 py-2.5 text-white">
            <span className="font-mono text-[11px] font-semibold uppercase">Admit one</span>
            <span className="font-mono text-[11px]">Nº {String(event.id).padStart(4, "0")}</span>
          </div>
          <dl className="grid grid-cols-2 gap-5 p-5">
            <TicketField label="Date">{formatDate(event.startsAt)}</TicketField>
            <TicketField label="Doors">{formatTime(event.startsAt)}</TicketField>
            <TicketField label="Venue" className="col-span-2">
              {event.location}
            </TicketField>
            <div className="col-span-2">
              <dt className="mono-label mb-2 flex justify-between text-ink-2">
                <span>Seats</span>
                <span className="font-semibold text-ink">
                  {left} / {event.capacity} left
                </span>
              </dt>
              <dd>
                <Progress value={event.registered} max={event.capacity} tone={soldOut ? "pink" : "blue"} />
              </dd>
            </div>
            {isPast && (
              <div className="col-span-2">
                <Tag>Past event</Tag>
              </div>
            )}
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
