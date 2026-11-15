import { Link } from "react-router";
import { Alert, ButtonLink, EmptyState, PageLoader, PageTitle, Progress } from "../components/ui";
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
  const showUp = pastRegistered ? `${Math.round((pastCheckedIn / pastRegistered) * 100)}%` : "—";

  const stats: [string, string | number][] = [
    ["Upcoming events", upcoming.length],
    ["Tickets out", registered],
    ["Show-up rate", showUp],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-8">
        <PageTitle kicker="Organizer" sub="Your events, who's coming, and who actually turned up.">
          Box <span className="italic">office</span>
        </PageTitle>
        <ButtonLink to="/dashboard/events/new">+ New event</ButtonLink>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
        {stats.map(([label, value]) => (
          <div key={label} className="px-2 py-6 first:pl-0 sm:px-6">
            <dt className="mono-label">{label}</dt>
            <dd className="mt-1 font-serif text-5xl leading-none sm:text-6xl">{value}</dd>
          </div>
        ))}
      </dl>

      {events.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="Nothing on the bill yet">Create your first event and share the link.</EmptyState>
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
    <section className="mt-12">
      <h2 className="mb-2 font-serif text-3xl italic">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] table-fixed text-left">
          <thead>
            <tr className="border-y border-ink">
              <th className="mono-label py-2.5 pr-4 font-normal">Event</th>
              <th className="mono-label w-48 px-4 py-2.5 font-normal">Tickets out</th>
              <th className="mono-label w-48 px-4 py-2.5 font-normal">At the door</th>
              <th className="w-36 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-card">
                <td className="py-4 pr-4">
                  <Link to={`/events/${e.id}`} className="text-[17px] font-medium hover:text-accent">
                    {e.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-ink-2">
                    {formatDate(e.startsAt)} · {formatTime(e.startsAt)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="mb-1.5 font-mono text-xs">
                    {e.registered} / {e.capacity}
                  </p>
                  <Progress value={e.registered} max={e.capacity} />
                </td>
                <td className="px-4 py-4">
                  <p className="mb-1.5 font-mono text-xs">
                    {e.checkedIn} / {e.registered}
                  </p>
                  <Progress value={e.checkedIn} max={e.registered} tone="go" />
                </td>
                <td className="whitespace-nowrap py-4 pl-4 text-right font-mono text-xs uppercase tracking-[0.12em]">
                  <Link to={`/dashboard/events/${e.id}/checkin`} className="text-accent hover:underline">
                    Door
                  </Link>
                  <span className="mx-3 text-line">/</span>
                  <Link to={`/dashboard/events/${e.id}/edit`} className="text-ink-2 hover:text-ink">
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
