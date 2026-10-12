import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, isAdminRole, isStaffRole, useAuth } from "./lib/auth";
import Shell from "./components/Shell";
import GlobalLoader from "./components/GlobalLoader";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import Contact from "./pages/Contact";
import { CustomerLogin, StaffLogin, Register } from "./pages/AuthPages";
import BookAppointment from "./pages/customer/BookAppointment";
import MyBookings from "./pages/customer/MyBookings";
import Dashboard from "./pages/staff/Dashboard";
import CalendarPage from "./pages/staff/CalendarPage";
import NewBooking from "./pages/staff/NewBooking";
import Customers from "./pages/staff/Customers";
import Services from "./pages/staff/Services";
import Settings from "./pages/staff/Settings";
import Developer from "./pages/staff/Developer";
import Billing from "./pages/staff/Billing";
import Salaries from "./pages/staff/Salaries";
import Team from "./pages/staff/Team";

/** Gate: must be signed in, with a role from `allow`; otherwise bounce to the right login. */
function Guard({ allow, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={allow === "customer" ? "/login" : "/salon-login"} replace />;
  const ok = allow === "customer" ? user.role === "customer" : allow === "admin" ? isAdminRole(user.role) : allow === "developer" ? user.role === "developer" : isStaffRole(user.role);
  if (!ok) return <Navigate to={user.role === "customer" ? "/app/book" : "/salon/calendar"} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalLoader />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/salon-login" element={<StaffLogin />} />

          <Route path="/app" element={<Guard allow="customer"><Shell /></Guard>}>
            <Route index element={<Navigate to="book" replace />} />
            <Route path="book" element={<BookAppointment />} />
            <Route path="bookings" element={<MyBookings />} />
          </Route>

          <Route path="/salon" element={<Guard allow="staff"><Shell /></Guard>}>
            <Route index element={<Navigate to="calendar" replace />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="new-booking" element={<NewBooking />} />
            <Route path="customers" element={<Customers />} />
            <Route path="salaries" element={<Salaries />} />
            <Route path="dashboard" element={<Guard allow="admin"><Dashboard /></Guard>} />
            <Route path="services" element={<Guard allow="admin"><Services /></Guard>} />
            <Route path="billing" element={<Guard allow="admin"><Billing /></Guard>} />
            <Route path="team" element={<Guard allow="admin"><Team /></Guard>} />
            <Route path="settings" element={<Guard allow="admin"><Settings /></Guard>} />
            <Route path="developer" element={<Guard allow="developer"><Developer /></Guard>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
