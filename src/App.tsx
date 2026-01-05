import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { AuthProvider, useAuth } from "./hooks/useAuth"
import Login from "./pages/Login"
import Layout from "./pages/Layout"
import Dashboard from "./pages/Dashboard"
import TechnicianDashboard from "./pages/TechnicianDashboard"
import NewTicket from "./pages/NewTicket"
import TicketList from "./pages/TicketList"
import TicketDetails from "./pages/TicketDetails"
import UserManagement from "./pages/UserManagement"
import Reports from "./pages/Reports"
import PublicTicketForm from "./pages/PublicTicketForm"
import Settings from "./pages/Settings"

function ProtectedRoute() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  return user ? <Outlet /> : <Navigate to="/" replace />
}

function DashboardRoute() {
  const { isTechnician, isAdmin } = useAuth()
  if (isTechnician && !isAdmin) return <TechnicianDashboard />
  return <Dashboard />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* Public route - no auth */}
      <Route path="/formulario-chamado" element={<PublicTicketForm />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/dashboard-tecnico" element={<TechnicianDashboard />} />
          <Route path="/chamados/novo" element={<NewTicket />} />
          <Route path="/chamados" element={<TicketList />} />
          <Route path="/chamados/:id" element={<TicketDetails />} />
          <Route path="/usuarios" element={<UserManagement />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}
