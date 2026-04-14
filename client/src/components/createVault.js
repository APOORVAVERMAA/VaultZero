import { useState } from "react";
import { motion } from "framer-motion";

const TYPE_META = {
  eternal: { label: "Eternal", desc: "Permanent encrypted storage", color: "border-indigo-500/30 text-indigo-300" },
  destroy: { label: "Self-Destruct", desc: "Destroyed after first read", color: "border-red-500/30 text-red-300" },
  release: { label: "Dead-Man Release", desc: "Released if trigger fires", color: "border-amber-500/30 text-amber-300" },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function CreateVaultModal({
  message,
  setMessage,
  passphrase,
  setPassphrase,
  vaultType,
  setVaultType,
  triggerDays,
  setTriggerDays,
  releaseEmail,
  setReleaseEmail,
  file,
  setFile,
  onClose,
  onSubmit
}) {
  const [contentMode, setContentMode] = useState("text");
  const [triggerValue, setTriggerValue] = useState("");
  const [triggerUnit, setTriggerUnit] = useState("days");
  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-borderSubtle text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 transition-colors";

  // Sync triggerValue + triggerUnit → triggerDays (always in days)
  const updateTriggerDays = (value, unit) => {
    const num = parseInt(value) || 0;
    const multiplier = unit === "years" ? 365 : unit === "months" ? 30 : 1;
    setTriggerDays(String(num * multiplier));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      alert("Media file too large. Maximum allowed size is 10MB.");
      e.target.value = "";
      return;
    }
    setFile(selected);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl border border-borderSubtle bg-[#0a0d12] p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Create Secure Vault</h2>
            <p className="text-xs text-gray-400 font-mono">AES-256-GCM encrypted</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setVaultType(key)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  vaultType === key
                    ? `${meta.color} bg-white/[0.03]`
                    : "border-borderSubtle text-gray-500 hover:border-gray-500"
                }`}
              >
                <p className="text-xs font-mono font-semibold">{meta.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
              </button>
            ))}
          </div>

          {/* Release fields */}
          {vaultType === "release" && (
            <div className="space-y-3 pt-1">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Interval"
                  value={triggerValue}
                  onChange={(e) => {
                    setTriggerValue(e.target.value);
                    updateTriggerDays(e.target.value, triggerUnit);
                  }}
                  className={`${inputClass} flex-1`}
                  min="1"
                />
                <select
                  value={triggerUnit}
                  onChange={(e) => {
                    setTriggerUnit(e.target.value);
                    updateTriggerDays(triggerValue, e.target.value);
                  }}
                  className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-borderSubtle text-white text-sm font-mono focus:outline-none focus:border-indigo-500/40 transition-colors appearance-none cursor-pointer w-28"
                >
                  <option value="days" className="bg-[#0a0d12]">Days</option>
                  <option value="months" className="bg-[#0a0d12]">Months</option>
                  <option value="years" className="bg-[#0a0d12]">Years</option>
                </select>
              </div>
              {triggerDays && (
                <p className="text-xs text-gray-500 font-mono">
                  ≈ {triggerDays} day{triggerDays !== "1" ? "s" : ""} of inactivity before release
                </p>
              )}
              <input
                type="email"
                placeholder="Recipient email address"
                value={releaseEmail}
                onChange={(e) => setReleaseEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {/* Content mode toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-white/[0.02] border border-borderSubtle">
            <button
              onClick={() => { setContentMode("text"); setFile(null); }}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                contentMode === "text"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-500 border border-transparent hover:text-gray-300"
              }`}
            >
              Text Message
            </button>
            <button
              onClick={() => { setContentMode("file"); setMessage(""); }}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                contentMode === "file"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-500 border border-transparent hover:text-gray-300"
              }`}
            >
              File Upload
            </button>
          </div>

          {/* Content input */}
          {contentMode === "text" ? (
            <textarea
              placeholder="Vault message (will be encrypted client-side)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className={`${inputClass} resize-none`}
            />
          ) : (
            <div className="rounded-lg border border-borderSubtle bg-white/[0.02] p-5">
              <label className="flex flex-col items-center justify-center cursor-pointer gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {file ? (
                  <div className="text-center">
                    <p className="text-sm text-white font-mono">{file.name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      {(file.size / 1024).toFixed(1)} KB · {file.type || "unknown type"}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-300">Click to select a file</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">Images, videos, audio, documents · Max 10MB</p>
                  </div>
                )}
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.json,.xml"
                />
              </label>
              {file && (
                <button
                  onClick={() => setFile(null)}
                  className="mt-3 w-full text-xs text-red-400/70 hover:text-red-400 font-mono transition-colors"
                >
                  Remove file
                </button>
              )}
            </div>
          )}

          {/* Passphrase */}
          <div>
            <input
              type="password"
              placeholder="Encryption passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className={inputClass}
            />
            {passphrase.length > 0 && passphrase.length < 10 && (
              <p className="text-xs text-amber-400/80 font-mono mt-1.5">
                ⚠ Weak passphrase — use 10+ characters for maximum security
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/[0.03] border border-borderSubtle text-sm font-mono text-gray-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-mono font-semibold transition-colors"
            >
              Encrypt & Create
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default CreateVaultModal;