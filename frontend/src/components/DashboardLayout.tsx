import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Moon,
  PackageCheck,
  PackageOpen,
  Route as RouteIcon,
  Settings,
  Sun,
  Truck,
  UserRound,
  Zap,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useTheme } from "./ThemeProvider";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar_url?: string | null;
};

const groups = [
  {
    title: "Overview",
    items: [
      {
        label: "Command center",
        path: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Locations", path: "/locations", icon: MapPinned },
      { label: "Inventory", path: "/inventory", icon: Boxes },
      { label: "Demand forecast", path: "/forecast", icon: Activity },
      { label: "Supply requests", path: "/requests", icon: PackageCheck },
      { label: "Transport", path: "/transport", icon: Truck },
      { label: "Routes", path: "/routes", icon: RouteIcon },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Optimization", path: "/optimization", icon: Zap },
      { label: "Scenarios", path: "/scenarios", icon: GitBranch },
      {
        label: "Alerts",
        path: "/alerts",
        icon: AlertTriangle,
        badge: 5,
      },
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
      { label: "AI assistant", path: "/assistant", icon: BrainCircuit },
    ],
  },
];

function readStoredUser(): StoredUser {
  try {
    return JSON.parse(
      localStorage.getItem("logiforge_user") || "{}"
    );
  } catch {
    return {};
  }
}

function getInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DP"
  );
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(5);
  const [user, setUser] = useState<StoredUser>(readStoredUser);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem("lf-collapsed") === "1"
      );
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  useEffect(() => {
    const syncProfile = () => {
      setUser(readStoredUser());
    };

    window.addEventListener(
      "logiforge_profile_updated",
      syncProfile
    );

    return () => {
      window.removeEventListener(
        "logiforge_profile_updated",
        syncProfile
      );
    };
  }, []);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileOpen(false);
      }

      if (
        notifRef.current &&
        !notifRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
    };

    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleMouseDown
    );
    document.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleMouseDown
      );
      document.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, []);

  const initials = getInitials(user.name);
  const displayName = user.name || "Demo Planner";
  const displayEmail = user.email || "planner@logiforge.demo";

  const goTo = (path: string) => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileOpen(false);
    navigate(path);
  };

  const logout = () => {
    localStorage.removeItem("logiforge_token");
    localStorage.removeItem("logiforge_user");
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileOpen(false);
    navigate("/login");
  };

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;

      try {
        localStorage.setItem(
          "lf-collapsed",
          next ? "1" : "0"
        );
      } catch {
        // Ignore storage errors.
      }

      return next;
    });
  };

  return (
    <div
      className={`lf-shell ${
        collapsed ? "collapsed" : ""
      } ${mobileOpen ? "open" : ""}`}
    >
      <aside
        className="lf-side"
        aria-label="Main navigation"
        style={{ overflow: "visible" }}
      >
        <div className="lf-brand">
          <NavLink
            to="/dashboard"
            className="lf-brand-link"
            onClick={() => goTo("/dashboard")}
          >
            <svg
              className="lf-brand-logo"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="2"
                width="44"
                height="44"
                rx="13"
                fill="#0a2a33"
              />
              <path
                d="M13 31l11-14 11 14"
                stroke="#5eead4"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="24"
                cy="17"
                r="3.4"
                fill="#fff"
              />
              <circle
                cx="13"
                cy="31"
                r="2.6"
                fill="#14899a"
              />
              <circle
                cx="35"
                cy="31"
                r="2.6"
                fill="#14899a"
              />
            </svg>

            <span className="lf-brand-copy">
              <b>
                logiforge<i>AI</i>
              </b>
              <small>Command system</small>
            </span>
          </NavLink>
        </div>

        <button
          type="button"
          className="lf-fold"
          onClick={toggleSidebar}
          aria-label={
            collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={
            collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
        >
          {collapsed ? (
            <ChevronRight size={15} />
          ) : (
            <ChevronLeft size={15} />
          )}
        </button>

        <nav
          className="lf-nav"
          aria-label="Primary navigation"
        >
          {groups.map((group) => (
            <div className="lf-group" key={group.title}>
              <h2>{group.title}</h2>

              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={
                      collapsed ? item.label : undefined
                    }
                    className={({ isActive }) =>
                      `lf-link ${
                        isActive ? "active" : ""
                      }`
                    }
                    onClick={() => {
                      setMobileOpen(false);
                      setProfileOpen(false);
                      setNotificationsOpen(false);
                    }}
                  >
                    <Icon className="lf-i" size={19} />
                    <span className="lf-label">
                      {item.label}
                    </span>
                    {item.badge ? (
                      <em className="lf-badge">
                        {item.badge}
                      </em>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

      </aside>

      <button
        type="button"
        className="lf-scrim"
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />

      <div className="lf-main">
        <header className="lf-top">
          <button
            type="button"
            className="lf-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={19} />
          </button>

          <div className="lf-top-title">
            {/* <small>Logiforge AI</small> */}
            <h1>Predictive Logistics Command Center</h1>
          </div>

          <div className="lf-actions">
            <div className="lf-wrap" ref={notifRef}>
              <button
                type="button"
                className={`lf-chip lf-bell ${
                  unread === 0 ? "read" : ""
                }`}
                aria-label={`Notifications, ${unread} unread`}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen(
                    (value) => !value
                  );
                  setProfileOpen(false);
                }}
              >
                <Bell className="lf-i" size={18} />
                {unread > 0 && <i className="lf-dot" />}
              </button>

              {notificationsOpen && (
                <div className="lf-menu lf-notif-menu">
                  <h3>
                    Notifications
                    <button
                      type="button"
                      onClick={() => setUnread(0)}
                    >
                      Mark all as read
                    </button>
                  </h3>

                  <button
                    type="button"
                    className="lf-notification critical"
                    onClick={() =>
                      setUnread((value) =>
                        Math.max(0, value - 1)
                      )
                    }
                  >
                    <span className="lf-notification-icon">
                      <AlertCircle size={18} />
                    </span>
                    <span>
                      <strong>
                        Fuel stockout predicted at A07
                      </strong>
                      <p>
                        Days of supply fell below 2. Review the allocation plan.
                      </p>
                      <time>12m ago</time>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="lf-notification warning"
                    onClick={() =>
                      setUnread((value) =>
                        Math.max(0, value - 1)
                      )
                    }
                  >
                    <span className="lf-notification-icon">
                      <PackageOpen size={18} />
                    </span>
                    <span>
                      <strong>
                        Medical stock is amber at D03
                      </strong>
                      <p>
                        Daily consumption is 18% above forecast.
                      </p>
                      <time>1h ago</time>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="lf-notification"
                    onClick={() =>
                      setUnread((value) =>
                        Math.max(0, value - 1)
                      )
                    }
                  >
                    <span className="lf-notification-icon">
                      <CheckCircle2 size={18} />
                    </span>
                    <span>
                      <strong>
                        Route D01 → A12 re-optimized
                      </strong>
                      <p>
                        Transit time reduced by 14 minutes.
                      </p>
                      <time>3h ago</time>
                    </span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="lf-chip lf-theme"
              onClick={toggleTheme}
              aria-label="Switch appearance"
            >
              <span className="lf-ico">
                {theme === "dark" ? (
                  <Moon className="lf-i" size={18} />
                ) : (
                  <Sun className="lf-i" size={18} />
                )}
              </span>
              <span className="lf-txt">
                <b>
                  {theme === "dark" ? "Dark" : "Light"}
                </b>
                <span className="lf-sub">Appearance</span>
              </span>
              <i className="lf-switch" aria-hidden="true" />
            </button>

            <i className="lf-divider" />

            <div
              className="lf-wrap lf-profile"
              ref={profileRef}
            >
              <button
                type="button"
                className="lf-chip lf-profile-chip"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
              >
                <span className="lf-avatar">
                  {initials}
                </span>
                <span className="lf-txt">
                  <b>{displayName}</b>
                  <span className="lf-sub">
                    Logistics planner
                  </span>
                </span>
                <ChevronDown
                  className="lf-chevron"
                  size={18}
                />
              </button>

              {profileOpen && (
                <div
                  className="lf-menu lf-profile-menu"
                  role="menu"
                >
                  <div className="lf-who">
                    <span className="lf-avatar">
                      {initials}
                    </span>
                    <div>
                      <strong>{displayName}</strong>
                      <span>{displayEmail}</span>
                    </div>
                  </div>

                  <div className="lf-sep" />

                  <button
                    type="button"
                    className="lf-item"
                    onClick={() => goTo("/profile")}
                  >
                    <UserRound size={18} />
                    <span>My profile</span>
                  </button>

                  <button
                    type="button"
                    className="lf-item"
                    onClick={() => goTo("/settings")}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>

                  <div className="lf-sep" />

                  <button
                    type="button"
                    className="lf-item lf-item-out"
                    onClick={logout}
                  >
                    <LogOut size={18} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="lf-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
