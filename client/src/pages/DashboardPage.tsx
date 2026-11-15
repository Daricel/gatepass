import { Link } from "react-router";
import { Alert, ButtonLink, Card, EmptyState, PageLoader, Progress } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { GpEvent } from "../lib/types";
import { useAsync } from "../lib/useAsync";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}

export function DashboardPage() {
  const { data, error, loading } = useAsync(() => api.get<{ events: GpEvent[] }>("/api/events/mine"), []);
  if (loading && !data) return <PageLoader />;
  if (error) return <Alert>{error.message}</Alert>;

  const events = data!.events;
  const now = new Date().toISOString();
  const upcoming = events.filter((e) => e.startsAt >= now).reverse();
  const past = events.filter((e) => e.startsAt < now);
  const registered = events.reduce((s, e) => s + e.registered, 0);
  const pastRegistered = past.reduce((s, e) => s + e.registered, 0);
  const pastCheckedIn = past.reduce((s, e) => s + e.checkedIn, 0);
  const showUp = pastRegistered ? `${Math.round((pastCheckedIn / pastRegistered) * 100)}%` : "–";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizer dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Your events, registrations and attendance.</p>
        </div>
        <ButtonLink to="/dashboard/events/new">+ New event</ButtonLink>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming events" value={upcoming.length} />
        <Stat label="Total registrations" value={registered} />
        <Stat label="Show-up rate (past events)" value={showUp} />
      </div>

      {events.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="You haven't created any events">Create your first event and share the link.</EmptyState>
        </div>
      ) : (
        <>
          <EventTable title="Upcoming" events={upcoming} />
          <EventTable title="Past" events={past} />
        </>
      )}
    </div>
  );
}

function EventTable({ title, events }: { title: string; events: GpEvent[] }) {
  if (!events.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Event</th>
              <th className="px-5 py-3 font-semibold">Registered</th>
              <th className="px-5 py-3 font-semibold">Checked in</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <Link to={`/events/${e.id}`} className="font-medium hover:text-indigo-700">
                    {e.title}
                  </Link>
                  <p className="text-xs text-slate-500">{formatDateTime(e.startsAt)}</p>
                </td>
                <td className="w-40 px-5 py-4">
                  <p className="mb-1 text-xs">
                    {e.registered} / {e.capacity}
                  </p>
                  <Progress value={e.registered} max={e.capacity} />
                </td>
                <td className="w-40 px-5 py-4">
                  <p className="mb-1 text-xs">
                    {e.checkedIn} / {e.registered}
                  </p>
                  <Progress value={e.checkedIn} max={e.registered} tone="emerald" />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <Link to={`/dashboard/events/${e.id}/checkin`} className="font-semibold text-indigo-600 hover:underline">
                    Check-in
                  </Link>
                  <span className="mx-2 text-slate-300">|</span>
                  <Link to={`/dashboard/events/${e.id}/edit`} className="text-slate-600 hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
