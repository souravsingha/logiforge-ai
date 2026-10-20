import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { ThemeProvider } from "./components/ThemeProvider";
import DashboardLayout from "./components/DashboardLayout";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Locations from "./pages/Locations";
import Inventory from "./pages/Inventory";
import Forecast from "./pages/Forecast";
import Alerts from "./pages/Alerts";
import Requests from "./pages/Requests";
import Transport from "./pages/Transport";
import RoutesPage from "./pages/Routes";
import Optimization from "./pages/Optimization";
import Scenarios from "./pages/Scenarios";
import Analytics from "./pages/Analytics";
import Assistant from "./pages/Assistant";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* =========================
              PUBLIC PAGES
          ========================= */}

          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />

          {/* =========================
              PROTECTED COMMAND CENTER
          ========================= */}

          <Route element={<DashboardLayout />}>
            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* Locations */}
            <Route
              path="/locations"
              element={<Locations />}
            />

            {/* Inventory */}
            <Route
              path="/inventory"
              element={<Inventory />}
            />

            {/* Demand Forecast */}
            <Route
              path="/forecast"
              element={<Forecast />}
            />

            {/* Supply Requests */}
            <Route
              path="/requests"
              element={<Requests />}
            />

            {/* Transport */}
            <Route
              path="/transport"
              element={<Transport />}
            />

            {/* Routes */}
            <Route
              path="/routes"
              element={<RoutesPage />}
            />

            {/* Optimization */}
            <Route
              path="/optimization"
              element={<Optimization />}
            />

            {/* Scenario Simulation */}
            <Route
              path="/scenarios"
              element={<Scenarios />}
            />

            {/* Alerts */}
            <Route
              path="/alerts"
              element={<Alerts />}
            />

            {/* Analytics */}
            <Route
              path="/analytics"
              element={<Analytics />}
            />

            {/* AI Assistant */}
            <Route
              path="/assistant"
              element={<Assistant />}
            />

            {/* My Profile */}
            <Route
              path="/profile"
              element={<Profile />}
            />

            {/* System Settings */}
            <Route
              path="/settings"
              element={<Settings />}
            />
          </Route>

          {/* =========================
              UNKNOWN ROUTE
          ========================= */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
