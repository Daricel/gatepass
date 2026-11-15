import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Alert, Button, Card, Field, PageLoader, TextArea } from "../components/ui";
import { api, fieldErrors } from "../lib/api";
import { toLocalInput } from "../lib/format";
import type { GpEvent } from "../lib/types";
import { useAsync } from "../lib/useAsync";

export function EventEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const existing = useAsync(
    () => (isNew ? Promise.resolve(null) : api.get<{ event: GpEvent }>(`/api/events/${id}`).then((r) => r.event)),
    [id],
  );
  if (existing.loading) return <PageLoader />;
  if (existing.error) return <Alert>{existing.error.message}</Alert>;
  const event = existing.data;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const startsLocal = String(f.get("startsAt"));
    const body = {
      title: String(f.get("title")),
      description: String(f.get("description")),
      location: String(f.get("location")),
      startsAt: startsLocal ? new Date(startsLocal).toISOString() : "",
      capacity: Number(f.get("capacity")),
    };
    setBusy(true);
    setErrors({});
    setError(undefined);
    try {
      const { event: saved } = isNew
        ? await api.post<{ event: GpEvent }>("/api/events", body)
        : await api.put<{ event: GpEvent }>(`/api/events/${id}`, body);
      navigate(`/events/${saved.id}`);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.del(`/api/events/${id}`);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Dashboard
      </Link>
      <Card className="mt-4">
        <h1 className="mb-6 text-xl font-bold">{isNew ? "Create an event" : "Edit event"}</h1>
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Title" name="title" defaultValue={event?.title} required minLength={3} maxLength={120} error={errors.title} />
          <TextArea label="Description" name="description" defaultValue={event?.description} maxLength={2000} error={errors.description} />
          <Field label="Location" name="location" defaultValue={event?.location} required error={errors.location} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Starts at"
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={event ? toLocalInput(event.startsAt) : undefined}
              error={errors.startsAt}
            />
            <Field
              label="Capacity"
              name="capacity"
              type="number"
              min={event?.registered || 1}
              max={100000}
              required
              defaultValue={event?.capacity ?? 50}
              hint={event?.registered ? `${event.registered} already registered` : undefined}
              error={errors.capacity}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="submit" loading={busy}>
              {isNew ? "Create event" : "Save changes"}
            </Button>
            {!isNew &&
              (confirmDelete ? (
                <span className="flex items-center gap-2 text-sm">
                  Delete event and all tickets?
                  <Button type="button" variant="danger" onClick={remove} loading={busy}>
                    Delete
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    No
                  </Button>
                </span>
              ) : (
                <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
                  Delete event
                </Button>
              ))}
          </div>
        </form>
      </Card>
    </div>
  );
}
