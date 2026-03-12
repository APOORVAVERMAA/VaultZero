import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { motion, AnimatePresence } from "framer-motion";

const TOUR_STEPS = [
  {
    type: "welcome",
    title: "Welcome to VaultZero",
    desc: "Your zero-knowledge encrypted vault system is ready. Let us give you a quick tour of the key areas.",
  },
  {
    target: '[data-tour="vaults"]',
    title: "Vault Archive",
    desc: "Create and manage encrypted vaults here — text or file, with AES-256-GCM encryption.",
    position: "right",
  },
  {
    target: '[data-tour="terminal"]',
    title: "Terminal Interface",
    desc: "Prefer the command line? Access all vault operations through the built-in terminal.",
    position: "right",
  },
  {
    target: '[data-tour="settings"]',
    title: "Security Settings",
    desc: "Change your password, manage your account, and review vault documentation.",
    position: "right",
  },
];

function GuidedTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});
  const [highlightStyle, setHighlightStyle] = useState({});
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (current.type === "welcome" || !current.target) {
      setTooltipStyle({});
      setArrowStyle({});
      setHighlightStyle({});
      return;
    }

    const positionTooltip = () => {
      const el = document.querySelector(current.target);
      if (!el) return;

      const rect = el.getBoundingClientRect();

      // Highlight around the element
      setHighlightStyle({
        position: "fixed",
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        borderRadius: "10px",
      });

      // Tooltip positioned to the right of the element
      const tooltipTop = rect.top + rect.height / 2 - 60;
      setTooltipStyle({
        position: "fixed",
        top: Math.max(16, tooltipTop),
        left: rect.right + 16,
      });

      // Arrow pointing left toward the element
      setArrowStyle({
        position: "absolute",
        top: "50%",
        left: -6,
        transform: "translateY(-50%) rotate(45deg)",
      });
    };

    positionTooltip();
    const observer = new MutationObserver(positionTooltip);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", positionTooltip);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", positionTooltip);
    };
  }, [step, current]);

  // Welcome step — centered modal
  if (current.type === "welcome") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm rounded-2xl border border-indigo-500/20 bg-[#0a0d12] p-8 shadow-2xl shadow-indigo-500/10 text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-lg font-bold font-mono"><span className="text-white">V</span><span className="text-indigo-400">Z</span></span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 font-mono">{current.title}</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-8">{current.desc}</p>
          <div className="flex items-center justify-between">
            <button onClick={onComplete} className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors">
              Skip Tour
            </button>
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-mono font-semibold transition-colors"
            >
              Start Tour
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Targeted step — highlight + tooltip
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100]"
      onClick={onComplete}
    >
      {/* Overlay with hole */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Highlight ring around element */}
      {highlightStyle.width && (
        <div
          style={highlightStyle}
          className="border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] z-[101] pointer-events-none"
        />
      )}

      {/* Tooltip card */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        style={tooltipStyle}
        className="z-[102] w-72"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow */}
        <div
          style={arrowStyle}
          className="w-3 h-3 bg-[#0a0d12] border-l border-b border-indigo-500/20"
        />

        <div className="rounded-xl border border-indigo-500/20 bg-[#0a0d12] p-5 shadow-2xl shadow-indigo-500/10">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-4">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i <= step ? "bg-indigo-500 w-6" : "bg-white/10 w-3"
                }`}
              />
            ))}
          </div>

          <h3 className="text-sm font-bold text-white mb-1.5">{current.title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-5">{current.desc}</p>

          <div className="flex items-center justify-between">
            <button onClick={onComplete} className="text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors">
              Skip
            </button>
            <div className="flex gap-1.5">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-borderSubtle text-xs font-mono text-gray-400 hover:text-white transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => isLast ? onComplete() : setStep(step + 1)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold transition-colors"
              >
                {isLast ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Dashboard() {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [showTour, setShowTour] = useState(() => localStorage.getItem("vaultTourCompleted") !== "true");

  const fetchVaults = useCallback(async () => {
    try {
      const res = await api.get("/api/vault/my-vaults");
      setVaults(res.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get("/api/user/activity");
      setActivity(res.data.slice(0, 5));
    } catch {
      // endpoint may not exist yet
    }
  }, []);

  useEffect(() => {
    fetchVaults();
    fetchActivity();
  }, [fetchVaults, fetchActivity]);

  const activeVaults = vaults.filter(v => v.status === "active").length;
  const releasedVaults = vaults.filter(v => v.status === "released").length;
  const eternalVaults = vaults.filter(v => v.vault_type === "eternal").length;
  const releaseTypeVaults = vaults.filter(v => v.vault_type === "release").length;
  const destroyVaults = vaults.filter(v => v.vault_type === "destroy").length;
  const rawName = localStorage.getItem("fullName");
  const fullName = rawName || (() => {
    const email = localStorage.getItem("email") || "";
    const local = email.split("@")[0] || "User";
    return local.charAt(0).toUpperCase() + local.slice(1);
  })();

  const stats = [
    { label: "Total Vaults", value: vaults.length, color: "text-indigo-300", border: "border-indigo-500/20", glow: "shadow-indigo-500/5" },
    { label: "Active", value: activeVaults, color: "text-emerald-300", border: "border-emerald-500/20", glow: "shadow-emerald-500/5" },
    { label: "Released", value: releasedVaults, color: "text-amber-300", border: "border-amber-500/20", glow: "shadow-amber-500/5" },
  ];

  return (
    <div className="min-h-screen p-6 lg:p-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">System Online</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight font-mono">
          Command Center
        </h1>
        <p className="text-sm text-gray-400 mt-1 font-mono">
          Welcome back, <span className="text-indigo-400">{fullName.split(" ")[0]}</span>
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`p-4 rounded-xl border ${s.border} bg-surface/50 shadow-lg ${s.glow}`}
          >
            <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 font-mono ${s.color}`}>
              {loading ? "—" : String(s.value).padStart(2, "0")}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Quick Actions — Left Column */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-xl border border-borderSubtle bg-surface/30 p-5"
        >
          <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-4">Quick Access</h3>
          <div className="space-y-2">
            {[
              { to: "/vaults", label: "Vault Archive", desc: "Manage encrypted vaults", color: "indigo" },
              { to: "/terminal", label: "Terminal", desc: "Command-line interface", color: "emerald" },
              { to: "/activity", label: "Event Log", desc: "Security audit trail", color: "amber" },
            ].map(({ to, label, desc, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-borderSubtle hover:border-indigo-500/20 hover:bg-white/[0.04] transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-${color}-400`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{label}</p>
                  <p className="text-xs text-gray-400 font-mono">{desc}</p>
                </div>
                <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-400 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Vault Type Distribution */}
          <div className="mt-5 pt-4 border-t border-borderSubtle">
            <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-3">Vault Distribution</h4>
            {vaults.length > 0 ? (
              <div className="space-y-2">
                {[
                  { label: "Eternal", count: eternalVaults, color: "bg-indigo-500" },
                  { label: "Release", count: releaseTypeVaults, color: "bg-amber-500" },
                  { label: "Destroy", count: destroyVaults, color: "bg-red-500" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-16 text-xs text-gray-400 font-mono">{label}</div>
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${(count / vaults.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 font-mono w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 font-mono">No vaults yet</p>
            )}
          </div>
        </motion.div>

        {/* Recent Activity — Right Column */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 rounded-xl border border-borderSubtle bg-surface/30 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest">Recent Events</h3>
            <Link to="/activity" className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm font-mono">No events recorded</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activity.map((evt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    evt.event_type === "created" ? "bg-emerald-400" :
                    evt.event_type === "opened" ? "bg-blue-400" :
                    evt.event_type === "deleted" ? "bg-red-400" :
                    evt.event_type === "released" ? "bg-amber-400" : "bg-gray-500"
                  }`} />
                  <span className="text-sm font-mono text-indigo-400 w-14 flex-shrink-0">VX-{evt.vault_id}</span>
                  <span className="text-sm text-gray-300 capitalize flex-1">{evt.event_type}</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {new Date(evt.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>

      {/* Guided Tour */}
      <AnimatePresence>
        {showTour && (
          <GuidedTour
            onComplete={() => {
              localStorage.setItem("vaultTourCompleted", "true");
              setShowTour(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dashboard;
