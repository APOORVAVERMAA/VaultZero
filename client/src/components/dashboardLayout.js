import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  {
    label: "Command Center",
    path: "/dashboard",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    label: "Vault Archive",
    path: "/vaults",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    label: "Event Log",
    path: "/activity",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    label: "Terminal",
    path: "/terminal",
    accent: "emerald",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    path: "/settings",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const [time, setTime] = useState(new Date());
  const [showTagline, setShowTagline] = useState(false);
  const rawName = localStorage.getItem("fullName");
  const fullName = rawName || (() => {
    const email = localStorage.getItem("email") || "";
    const local = email.split("@")[0] || "User";
    return local.charAt(0).toUpperCase() + local.slice(1);
  })();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    const userEmail = (localStorage.getItem("email") || "").trim().toLowerCase();
    const userTourKey = userEmail ? `vaultTourCompleted:${userEmail}` : "vaultTourCompleted";
    const tourCompleted = localStorage.getItem(userTourKey);
    const interfaceMode = localStorage.getItem("vaultInterfaceMode");
    localStorage.clear();
    if (tourCompleted) localStorage.setItem(userTourKey, tourCompleted);
    if (interfaceMode) localStorage.setItem("vaultInterfaceMode", interfaceMode);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background text-gray-200">

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-borderSubtle bg-[#08090e]/95 backdrop-blur-xl"
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 h-16 border-b border-borderSubtle group cursor-pointer overflow-hidden"
          onMouseEnter={() => setShowTagline(true)}
          onMouseLeave={() => setShowTagline(false)}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <span className="font-bold text-[11px] font-mono"><span className="text-white">V</span><span className="text-indigo-400">Z</span></span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="text-sm font-bold tracking-tight leading-none font-mono">
                  <span className="text-white">Vault</span><span className="text-indigo-400">Zero</span>
                </p>
                <AnimatePresence mode="wait">
                  {showTagline ? (
                    <motion.p
                      key="tagline"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                      className="text-[8px] text-indigo-400/60 font-mono tracking-wide mt-1 whitespace-nowrap"
                    >
                      secure · private · permanent
                    </motion.p>
                  ) : (
                    <motion.div
                      key="dots"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1 mt-1.5"
                    >
                      <div className="w-1 h-1 rounded-full bg-indigo-500/40" />
                      <div className="w-1 h-1 rounded-full bg-indigo-500/25" />
                      <div className="w-1 h-1 rounded-full bg-indigo-500/15" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status indicator */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 border-b border-borderSubtle"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-gray-400">
                  {time.toLocaleTimeString("en-US", { hour12: false })} UTC
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isTerminal = item.accent === "emerald";
            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-tour={item.path.replace("/", "")}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? isTerminal
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-indigo-500/10 text-indigo-300"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                  }`
                }
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-borderSubtle p-2 space-y-1">
          {/* Mode switch */}
          <button
            onClick={() => {
              const current = localStorage.getItem("vaultInterfaceMode");
              const target = current === "terminal" ? "/dashboard" : "/terminal";
              localStorage.setItem("vaultInterfaceMode", current === "terminal" ? "ui" : "terminal");
              navigate(target);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] transition-all"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  {location.pathname === "/terminal" ? "Switch to UI" : "Switch to Terminal"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] transition-all"
          >
            <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-3 py-2">
                <p className="text-xs text-gray-400 font-mono truncate">{fullName}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Main */}
      <motion.main
        animate={{ marginLeft: collapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 min-h-screen bg-grid scanline-overlay relative"
      >
        <Outlet />
      </motion.main>
    </div>
  );
}

export default DashboardLayout;
