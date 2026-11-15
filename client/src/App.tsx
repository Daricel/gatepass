import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { ButtonLink, EmptyState } from "./components/ui";
import { AuthProvider } from "./lib/auth";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { CheckInPage } from "./pages/CheckInPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { EventEditorPage } from "./pages/EventEditorPage";
import { EventsPage } from "./pages/EventsPage";
import { MyTicketsPage } from "./pages/MyTicketsPage";

const organizer = (el: React.ReactNode) => <RequireAuth role="organizer">{el}</RequireAuth>;

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<EventsPage />} />
            <Route path="events/:id" element={<EventDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="tickets" element={<RequireAuth role="attendee"><MyTicketsPage /></RequireAuth>} />
            <Route path="dashboard" element={organizer(<DashboardPage />)} />
            <Route path="dashboard/events/new" element={organizer(<EventEditorPage />)} />
            <Route path="dashboard/events/:id/edit" element={organizer(<EventEditorPage />)} />
            <Route path="dashboard/events/:id/checkin" element={organizer(<CheckInPage />)} />
            <Route
              path="*"
              element={
                <EmptyState title="Wrong door">
                  <p>There's no page at this address.</p>
                  <div className="mt-5">
                    <ButtonLink to="/">Back to the programme</ButtonLink>
                  </div>
                </EmptyState>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
