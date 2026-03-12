import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

const SECTIONS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Zero-Knowledge Encryption",
    desc: "VaultZero operates under a zero-knowledge model. Your passphrase never leaves your device. The server stores only encrypted data it cannot read.",
    color: "indigo",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Dead-Man Release Protocol",
    desc: "Release vaults activate based on inactivity thresholds. When triggered, encrypted data is sent to your designated recipient. The data remains encrypted and requires the vault passphrase.",
    color: "amber",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    title: "Irrecoverable by Design",
    desc: "VaultZero cannot recover lost passphrases. There is no master key, no backdoor, and no recovery mechanism. You are solely responsible for maintaining access to your vaults.",
    color: "red",
  },
];

function Policy() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  const handleAccept = async () => {
    try {
      await api.post("/api/onboarding/accept-policy");
      localStorage.setItem("termsAccepted", "true");
      navigate("/vault-education");
    } catch {
      alert("Failed to accept policy. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-8 py-20">
        {/* Progress bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Step 1 of 3</span>
            <span className="text-xs font-mono text-indigo-400/80">Security Briefing</span>
          </div>
          <div className="h-1 bg-surfaceLight rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "33%" }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-mono text-indigo-400 tracking-wider uppercase">Classification: Required</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4 font-mono">Security Briefing</h1>
          <p className="text-gray-400 text-base font-mono">Review and acknowledge the VaultZero security protocol before proceeding.</p>
        </motion.div>

        {/* Policy Sections */}
        <div className="space-y-4 mb-12">
          {SECTIONS.map((section, i) => {
            const colorMap = {
              indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400", icon: "text-indigo-400" },
              amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: "text-amber-400" },
              red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: "text-red-400" },
            };
            const c = colorMap[section.color];
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`rounded-2xl border ${c.border} bg-surface/50 backdrop-blur-sm p-6`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base mb-2 font-mono">{section.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed font-mono">{section.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Terms Agreement */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <label className="flex items-start gap-3 mb-6 cursor-pointer group">
            <div className="mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded-md border-2 border-gray-600 bg-white/[0.03] flex items-center justify-center transition-all peer-checked:border-indigo-500 peer-checked:bg-indigo-600 group-hover:border-gray-400">
                {agreed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-300 font-mono leading-relaxed">
              I have read and agree to the VaultZero Security Terms, Privacy Policy, and acknowledge that lost passphrases are <span className="text-red-400 font-semibold">irrecoverable</span>.
            </span>
          </label>

          <motion.button
            whileHover={agreed ? { scale: 1.01 } : {}}
            whileTap={agreed ? { scale: 0.99 } : {}}
            onClick={handleAccept}
            disabled={!agreed}
            className={`w-full px-8 py-4 rounded-xl font-semibold text-base font-mono shadow-lg transition-all ${
              agreed
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 border border-indigo-500/40"
                : "bg-white/[0.03] text-gray-600 border border-borderSubtle cursor-not-allowed"
            }`}
          >
            I Accept These Terms & Continue
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

export default Policy;