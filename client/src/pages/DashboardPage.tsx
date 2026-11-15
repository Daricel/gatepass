import { Link } from "react-router";
import { Alert, ButtonLink, EmptyState, PageLoader, PageTitle, Progress, cx } from "../components/ui";
import { api } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";
import type { GpEvent } from "../lib/types";
import { useAsync } from "../lib/useAsync";

export function DashboardPage() {
  const { data, error, loading } = useAsync(() => api.get<{ events: GpEvent[] }>("/api/events/mine"), []);
  if (loading && !data) return <PageLoader />;
  if (error) return <Alert>{error.message}</Alert>;

  const events = data!.events;
  const now = new Date().toISOString();
  const upcoming = events.filter((e) => e.startsAt >= now).reverse();
  const past = events.filter((e) => e.startsAt < now);
  const registered = upcoming.reduce((s, e) => s + e.registered, 0);
  const pastRegistered = past.reduce((s, e) => s + e.registered, 0);
  const pastCheckedIn = past.reduce((s, e) => s + e.checkedIn, 0);
  const showUp = pastRegistered ? `${Math.round((pastCheckedIn / pastRegistered) * 100)}%` : "–";

  const stats: [string, string | number, string][] = [
    ["Upcoming events", upcoming.length, "bg-pink text-violet -rotate-1"],
    ["Tickets out", registered, "bg-blue text-white rotate-[0.5deg]"],
    ["Show-up rate", showUp, "bg-yellow text-blue -rotate-[0.5deg]"],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <PageTitle kicker="Organizer" sub="Your events, who's coming, and who actually turned up.">
          The office
        </PageTitle>
        <ButtonLink to="/dashboard/events/new">+ New event</ButtonLink>
      </div>

      <dl className="mt-10 grid gap-5 sm:grid-cols-3">
        {stats.map(([label, value, ink]) => (
          <div key={label} className={cx("grain relative overflow-hidden border-2 border-ink p-5", ink)}>
            <dt className="mono-label relative font-semibold">{label}</dt>
            <dd className="display relative mt-3 text-7xl">{value}</dd>
          </div>
        ))}
      </dl>

      {events.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="Nothing on the board yet">Put up your first event and share the link.</EmptyState>
        </div>
      ) : (
        <>
          <EventTable title="Coming up" events={upcoming} />
          <EventTable title="Archive" events={past} />
        </>
      )}
    </div>
  );
}

function EventTable({ title, events }: { title: string; events: GpEvent[] }) {
  if (!events.length) return null;
  return (
    <section className="mt-14">
      <h2 className="display mb-3 text-3xl">{title}</h2>
      <div className="overflow-x-auto border-2 border-ink bg-white">
        <table className="w-full min-w-[42rem] table-fixed text-left">
          <thead className="bg-ink text-stock">
            <tr>
              <th className="mono-label px-4 py-2.5 font-semibold">Event</th>
              <th className="mono-label w-48 px-4 py-2.5 font-semibold">Tickets out</th>
              <th className="mono-label w-48 px-4 py-2.5 font-semibold">At the door</th>
              <th className="w-36 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-ink">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-yellow/40">
                <td className="px-4 py-4">
                  <Link to={`/events/${e.id}`} className="text-[17px] font-bold hover:text-blue">
                    {e.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-2">
                    {formatDate(e.startsAt)} · {formatTime(e.startsAt)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="mb-1.5 font-mono text-xs font-semibold">
                    {e.registered} / {e.capacity}
                  </p>
                  <Progress value={e.registered} max={e.capacity} tone={e.registered >= e.capacity ? "pink" : "blue"} />
                </td>
                <td className="px-4 py-4">
                  <p className="mb-1.5 font-mono text-xs font-semibold">
                    {e.checkedIn} / {e.registered}
                  </p>
                  <Progress value={e.checkedIn} max={e.registered} tone="ink" />
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-[11px] font-semibold uppercase">
                  <Link to={`/dashboard/events/${e.id}/checkin`} className="bg-pink px-1.5 py-0.5 hover:bg-yellow">
                    Door
                  </Link>
                  <Link to={`/dashboard/events/${e.id}/edit`} className="ml-3 text-ink-2 hover:text-ink">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
