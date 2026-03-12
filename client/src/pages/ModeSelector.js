import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function ModeSelector() {
  const navigate = useNavigate();

  const selectMode = (mode) => {
    localStorage.setItem("vaultInterfaceMode", mode);
    navigate(mode === "terminal" ? "/terminal" : "/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background bg-grid relative overflow-hidden flex items-center justify-center">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-mono text-indigo-400 tracking-wider uppercase">System Ready</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight font-mono">
            Choose Your Interface
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Select how you want to interact with VaultZero. You can switch at any time from the navigation.
          </p>
        </motion.div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Secure Interface */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectMode("ui")}
            className="group relative text-left p-8 rounded-2xl border border-indigo-500/15 bg-surface/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:bg-indigo-500/10 transition-colors" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:bg-indigo-500/15 transition-colors">
                <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Secure Interface</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Visual dashboard with vault cards, activity feeds, and point-and-click management.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400/70 uppercase tracking-wider">
                <span>Launch UI</span>
                <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>

          {/* Terminal Interface */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectMode("terminal")}
            className="group relative text-left p-8 rounded-2xl border border-emerald-500/15 bg-surface/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:bg-emerald-500/10 transition-colors" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:bg-emerald-500/15 transition-colors">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Terminal Interface</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Command-line environment for direct vault operations. Full system control via typed commands.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/70 uppercase tracking-wider">
                <span>Launch Terminal</span>
                <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-500 mt-10 font-mono"
        >
          Preference stored locally. Switch anytime from the sidebar.
        </motion.p>
      </div>
    </div>
  );
}

export default ModeSelector;
