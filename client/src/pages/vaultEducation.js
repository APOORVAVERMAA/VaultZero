import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

const VAULT_TYPES = [
  {
    name: "Eternal Vault",
    tag: "PERMANENT",
    desc: "Remains encrypted and accessible only to you. No expiration, no trigger. Your data persists as long as VaultZero exists.",
    detail: "Best for: long-term secrets, credentials, important documents.",
    color: "indigo",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    name: "Self-Destruct Vault",
    tag: "ONE-TIME",
    desc: "Permanently destroyed after first access. Once opened, the encrypted content is wiped from the server irrecoverably.",
    detail: "Best for: one-time passwords, temporary credentials, sensitive messages.",
    color: "red",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    name: "Dead-Man Release Vault",
    tag: "TRIGGERED",
    desc: "Automatically releases encrypted data to a designated email after a period of inactivity. The recipient still needs the passphrase to decrypt.",
    detail: "Best for: digital inheritance, emergency access, dead-man switches.",
    color: "amber",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function VaultEducation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReview = searchParams.get("review") === "true";

  const handleContinue = () => {
    if (isReview) {
      navigate("/settings");
    } else {
      navigate("/secure-init");
    }
  };

  const colorMap = {
    indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400", tag: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", tag: "bg-red-500/20 text-red-300 border-red-500/30" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", tag: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  };

  return (
    <div className="min-h-screen bg-background bg-grid relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-indigo-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-8 py-20">
        {/* Progress bar */}
        {!isReview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Step 2 of 3</span>
              <span className="text-xs font-mono text-indigo-400/80">Vault Classification</span>
            </div>
            <div className="h-1 bg-surfaceLight rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                initial={{ width: "33%" }}
                animate={{ width: "66%" }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          {isReview && (
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Settings
            </button>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-mono text-indigo-400 tracking-wider uppercase">
              {isReview ? "Reference Material" : "Classification: Briefing"}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4 font-mono">Vault Classifications</h1>
          <p className="text-gray-400 text-base font-mono">
            {isReview
              ? "Review the three vault types available in VaultZero."
              : "Understand the three vault types before creating your first vault."}
          </p>
        </motion.div>

        {/* Vault Types */}
        <div className="space-y-5 mb-12">
          {VAULT_TYPES.map((vt, i) => {
            const c = colorMap[vt.color];
            return (
              <motion.div
                key={vt.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.12 }}
                className={`rounded-2xl border ${c.border} bg-surface/50 backdrop-blur-sm p-7`}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0 ${c.text}`}>
                    {vt.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-white font-mono">{vt.name}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider border ${c.tag}`}>
                        {vt.tag}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3 font-mono">{vt.desc}</p>
                    <p className="text-xs text-gray-400 font-mono">{vt.detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Continue */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleContinue}
            className="w-full px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base font-mono shadow-lg shadow-indigo-600/30 border border-indigo-500/40 transition-all"
          >
            {isReview ? "Back to Settings" : "Continue Setup"}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

export default VaultEducation;