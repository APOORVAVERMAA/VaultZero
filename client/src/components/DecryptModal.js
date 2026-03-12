import { useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";
import { decryptMessage } from "../utils/crypto";

function parseMediaContent(content) {
  if (!content.startsWith("VZMEDIA:")) return null;
  const firstColon = content.indexOf(":");
  const secondColon = content.indexOf(":", firstColon + 1);
  const thirdColon = content.indexOf(":", secondColon + 1);
  if (firstColon < 0 || secondColon < 0 || thirdColon < 0) return null;
  return {
    mimeType: content.substring(firstColon + 1, secondColon),
    fileName: content.substring(secondColon + 1, thirdColon),
    base64Data: content.substring(thirdColon + 1),
  };
}

function MediaViewer({ media }) {
  const dataUrl = `data:${media.mimeType};base64,${media.base64Data}`;
  const category = media.mimeType.split("/")[0];

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = media.fileName;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          {category === "image" ? (
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : category === "video" ? (
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : category === "audio" ? (
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm text-white font-mono">{media.fileName}</p>
          <p className="text-xs text-gray-400 font-mono">{media.mimeType}</p>
        </div>
      </div>

      <div className="rounded-lg border border-borderSubtle bg-black/40 overflow-hidden">
        {category === "image" && (
          <img src={dataUrl} alt={media.fileName} className="max-w-full max-h-[50vh] mx-auto object-contain" />
        )}
        {category === "video" && (
          <video src={dataUrl} controls className="max-w-full max-h-[50vh] mx-auto" />
        )}
        {category === "audio" && (
          <div className="p-6">
            <audio src={dataUrl} controls className="w-full" />
          </div>
        )}
        {category !== "image" && category !== "video" && category !== "audio" && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400 font-mono mb-2">File preview not available</p>
          </div>
        )}
      </div>

      <button
        onClick={handleDownload}
        className="w-full px-4 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-sm font-mono font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download {media.fileName}
      </button>
    </div>
  );
}

function DecryptModal({ vault, onClose, onRefresh }) {
  const [passphrase, setPassphrase] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!vault) return null;

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-borderSubtle text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 transition-colors";

  const handleDecrypt = async () => {
    setError("");
    try {
      setLoading(true);
      let openedVault;
      try {
        const res = await api.post(`/api/vault/open/${vault.id}`, {});
        openedVault = res.data;
      } catch (apiErr) {
        setError(apiErr?.response?.data?.message || "Failed to fetch vault data from server.");
        return;
      }
      try {
        const result = await decryptMessage(
          openedVault.encrypted_blob,
          openedVault.iv,
          openedVault.salt,
          passphrase
        );
        setDecryptedMessage(result);
        if (onRefresh) onRefresh();
      } catch {
        setError("Decryption failed — incorrect passphrase or corrupted vault data.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl border border-borderSubtle bg-[#0a0d12] shadow-2xl overflow-hidden"
      >
        {/* Vault info header */}
        <div className="px-6 py-4 border-b border-borderSubtle bg-surface/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="font-mono font-bold text-indigo-300 text-sm">VX-{vault.id}</p>
                <p className="text-xs text-gray-400 font-mono uppercase">{vault.vault_type} · {vault.status}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {!decryptedMessage ? (
            <>
              <h3 className="text-sm font-semibold text-white mb-1">Decryption Required</h3>
              <p className="text-sm text-gray-400 font-mono mb-5">
                Enter the passphrase used during vault creation.
              </p>

              <input
                type="password"
                placeholder="Vault passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleDecrypt()}
                className={inputClass}
                autoFocus
              />

              {error && (
                <p className="text-xs text-red-400 font-mono mt-2">{error}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-borderSubtle text-sm font-mono text-gray-400 hover:text-white transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleDecrypt}
                  disabled={loading || !passphrase}
                  className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-mono font-semibold transition-colors disabled:opacity-40"
                >
                  {loading ? "Decrypting..." : "Authorize Access"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Decryption Successful</h3>
              </div>

              {(() => {
                const media = parseMediaContent(decryptedMessage);
                if (media) {
                  return <MediaViewer media={media} />;
                }
                return (
                  <div className="rounded-lg border border-borderSubtle bg-black/40 p-5 min-h-[120px] max-h-[60vh] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-base text-gray-200 font-mono leading-relaxed">
                      {decryptedMessage}
                    </pre>
                  </div>
                );
              })()}

              <button
                onClick={onClose}
                className="w-full mt-4 px-3 py-2 rounded-lg bg-white/[0.03] border border-borderSubtle text-sm font-mono text-gray-400 hover:text-white transition-all"
              >
                Close
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default DecryptModal;