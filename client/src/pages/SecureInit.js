import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const PREDEFINED_SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What city were you born in?",
  "What was the name of your childhood best friend?",
  "What was the make of your first car?",
  "What was the name of your first pet?",
  "What was the street you grew up on?",
  "What is your favorite childhood memory location?"
];

function SecureInit() {
  const navigate = useNavigate();

  const [alternateEmail, setAlternateEmail] = useState("");
  const [selections, setSelections] = useState([
    { question: "", answer: "" },
    { question: "", answer: "" },
    { question: "", answer: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const selectedQuestions = selections.map(s => s.question).filter(Boolean);

  const updateSelection = (index, field, value) => {
    const updated = [...selections];
    updated[index] = { ...updated[index], [field]: value };
    setSelections(updated);
    setErrors(prev => ({ ...prev, [index]: undefined, general: undefined }));
  };

  const validate = () => {
    const newErrors = {};

    if (!alternateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail)) {
      newErrors.email = "Valid alternate email required";
    }

    for (let i = 0; i < 3; i++) {
      if (!selections[i].question) {
        newErrors[i] = "Select a security question";
      } else if (!selections[i].answer || selections[i].answer.trim().length < 2) {
        newErrors[i] = "Answer must be at least 2 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      await api.post("/api/onboarding/complete", {
        alternateEmail,
        questions: selections.map(s => ({
          question: s.question,
          answer: s.answer.trim()
        }))
      });

      localStorage.setItem("onboardingCompleted", "true");
      navigate("/mode-selector");
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Onboarding failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = selections.filter(s => s.question && s.answer.trim().length >= 2).length;

  return (
    <div className="min-h-screen bg-background bg-grid text-gray-200 overflow-auto relative">
      <div className="absolute top-0 left-1/3 w-[500px] h-[300px] bg-indigo-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-8 py-20">

        {/* Progress bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Step 3 of 3</span>
            <span className="text-xs font-mono text-indigo-400/80">Identity Verification</span>
          </div>
          <div className="h-1 bg-surfaceLight rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
              initial={{ width: "66%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/40">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 font-mono">Secure Identity Initialization</h1>
          <p className="text-gray-300 text-base font-mono">
            Set up your recovery questions. These protect your vaults during release.
          </p>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Setup Progress</span>
            <span className="text-indigo-400 font-semibold">{completedCount}/3 questions</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / 3) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </motion.div>

        {/* General Error */}
        <AnimatePresence>
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
            >
              {errors.general}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alternate Email Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-indigo-500/20 bg-surface/50 backdrop-blur-sm p-6 mb-6"
        >
          <label className="text-xs uppercase tracking-widest text-indigo-400/80 font-semibold mb-3 block">
            Alternate Release Email
          </label>
          <p className="text-sm text-gray-400 mb-4 font-mono">
            This email receives vault release links when the dead-man trigger activates.
          </p>
          <input
            type="email"
            placeholder="recipient@example.com"
            value={alternateEmail}
            onChange={(e) => { setAlternateEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
            className="w-full p-4 bg-[#0c0f14] border border-white/10 rounded-xl
                       focus:outline-none focus:border-indigo-500 text-white placeholder-gray-600 transition font-mono"
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-2">{errors.email}</p>
          )}
        </motion.div>

        {/* Security Questions */}
        {selections.map((sel, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className="rounded-2xl border border-indigo-500/20 bg-surface/50 backdrop-blur-sm p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                sel.question && sel.answer.trim().length >= 2
                  ? "bg-indigo-600 text-white"
                  : "bg-white/10 text-gray-500"
              }`}>
                {idx + 1}
              </div>
              <label className="text-xs uppercase tracking-widest text-indigo-400/80 font-semibold">
                Security Question {idx + 1}
              </label>
            </div>

            <select
              value={sel.question}
              onChange={(e) => updateSelection(idx, "question", e.target.value)}
              className="w-full p-4 bg-[#0c0f14] border border-white/10 rounded-xl
                         focus:outline-none focus:border-indigo-500 text-white transition
                         appearance-none cursor-pointer mb-4 font-mono"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236366f1' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center" }}
            >
              <option value="" disabled>Choose a question...</option>
              {PREDEFINED_SECURITY_QUESTIONS.map((q) => (
                <option
                  key={q}
                  value={q}
                  disabled={selectedQuestions.includes(q) && sel.question !== q}
                >
                  {q}
                </option>
              ))}
            </select>

            <AnimatePresence>
              {sel.question && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <input
                    type="text"
                    placeholder="Your answer"
                    value={sel.answer}
                    onChange={(e) => updateSelection(idx, "answer", e.target.value)}
                    className="w-full p-4 bg-[#0c0f14] border border-white/10 rounded-xl
                               focus:outline-none focus:border-indigo-500 text-white placeholder-gray-600 transition font-mono"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {errors[idx] && (
              <p className="text-xs text-red-400 mt-2">{errors[idx]}</p>
            )}
          </motion.div>
        ))}

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-8"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500
                       text-white font-semibold text-base font-mono shadow-lg shadow-indigo-600/30
                       border border-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Initializing..." : "Complete Secure Setup"}
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}

export default SecureInit;