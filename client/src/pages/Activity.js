import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";

const EVENT_META = {
  created:         { color: "bg-emerald-400", label: "Vault Created",    icon: "+" },
  opened:          { color: "bg-blue-400",    label: "Vault Opened",     icon: "→" },
  deleted:         { color: "bg-red-400",     label: "Vault Deleted",    icon: "×" },
  released:        { color: "bg-amber-400",   label: "Vault Released",   icon: "↗" },
  destroyed:       { color: "bg-red-500",     label: "Vault Destroyed",  icon: "⊘" },
  tamper_detected: { color: "bg-rose-500",    label: "Tamper Detected",  icon: "!" },
};

function Activity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.get("/api/user/activity");
      setEvents(res.data);
    } catch {
      // endpoint may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  return (
    <div className="min-h-screen p-6 lg:p-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Event Log</h1>
        <p className="text-sm text-gray-400 mt-1 font-mono">{events.length} event{events.length !== 1 ? "s" : ""} recorded</p>
      </motion.div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 rounded-xl bg-surface/50 border border-borderSubtle animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-12 h-12 rounded-xl bg-surface border border-borderSubtle flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No events recorded</p>
          <p className="text-gray-500 text-xs font-mono mt-1">Activity will appear as you use your vaults</p>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-borderSubtle bg-surface/30 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 text-xs font-mono text-gray-400 uppercase tracking-widest border-b border-borderSubtle bg-surface/50">
            <div className="col-span-1">Type</div>
            <div className="col-span-3">Event</div>
            <div className="col-span-2">Vault</div>
            <div className="col-span-3">Timestamp</div>
            <div className="col-span-3">Details</div>
          </div>

          {/* Events */}
          <div className="divide-y divide-borderSubtle">
            {events.map((evt, i) => {
              const meta = EVENT_META[evt.event_type] || { color: "bg-gray-400", label: evt.event_type, icon: "·" };
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-white/[0.015] transition-colors items-center"
                >
                  <div className="col-span-1">
                    <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-mono font-bold ${meta.color}/15`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm font-medium text-gray-300">{meta.label}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-mono text-indigo-400">VX-{evt.vault_id}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs font-mono text-gray-400">
                      {new Date(evt.created_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs font-mono text-gray-500">
                      {evt.ip_address ? `IP ${evt.ip_address}` : "—"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Activity;
