import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import DecryptModal from "../components/DecryptModal";
import CreateVaultModal from "../components/createVault";
import { encryptMessage } from "../utils/crypto";

const STATUS_COLORS = {
  active: { dot: "bg-emerald-400", badge: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  released: { dot: "bg-amber-400", badge: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  destroyed: { dot: "bg-red-400", badge: "text-red-300 border-red-500/30 bg-red-500/10" },
};

const TYPE_META = {
  eternal: { label: "ETERNAL", color: "text-indigo-400", border: "border-indigo-500/20" },
  destroy: { label: "DESTROY", color: "text-red-400", border: "border-red-500/20" },
  release: { label: "RELEASE", color: "text-amber-400", border: "border-amber-500/20" },
};

function Vaults() {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVault, setSelectedVault] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [decryptOpen, setDecryptOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();

  // Create vault state
  const [message, setMessage] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [vaultType, setVaultType] = useState("eternal");
  const [triggerDays, setTriggerDays] = useState("");
  const [releaseEmail, setReleaseEmail] = useState("");
  const [file, setFile] = useState(null);

  // Auto-open create modal from ?create=true
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowCreate(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  useEffect(() => { fetchVaults(); }, [fetchVaults]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vault permanently?")) return;
    try {
      await api.delete(`/api/vault/${id}`);
      if (selectedVault?.id === id) setSelectedVault(null);
      fetchVaults();
    } catch {
      alert("Delete failed");
    }
  };

  const readFileAsBase64 = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleCreateVault = async () => {
    if (!file && !message) { alert("Message or file required"); return; }
    if (!passphrase) { alert("Passphrase required"); return; }
    if (vaultType === "release" && (!triggerDays || !releaseEmail)) {
      alert("Trigger days and recipient email required for release vault.");
      return;
    }
    try {
      let contentToEncrypt;
      if (file) {
        const base64Data = await readFileAsBase64(file);
        contentToEncrypt = `VZMEDIA:${file.type || "application/octet-stream"}:${file.name}:${base64Data}`;
      } else {
        contentToEncrypt = message;
      }
      const encrypted = await encryptMessage(contentToEncrypt, passphrase);
      await api.post("/api/vault/create", {
        encryptedBlob: encrypted.encryptedBlob,
        iv: encrypted.iv,
        salt: encrypted.salt,
        vaultType,
        triggerDays: vaultType === "release" ? parseInt(triggerDays) : null,
        releaseEmail: vaultType === "release" ? releaseEmail : null,
      });
      setShowCreate(false);
      setMessage(""); setPassphrase(""); setVaultType("eternal"); setTriggerDays(""); setReleaseEmail(""); setFile(null);
      fetchVaults();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create vault");
    }
  };

  const filtered = filter === "all" ? vaults : vaults.filter(v => v.vault_type === filter);

  return (
    <div className="min-h-screen p-6 lg:p-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Vault Archive</h1>
          <p className="text-sm text-gray-400 mt-1 font-mono">{vaults.length} vault{vaults.length !== 1 ? "s" : ""} in system</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-xs font-semibold font-mono bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Vault
        </motion.button>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-1.5 mb-6">
        {["all", "eternal", "destroy", "release"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
              filter === f
                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                : "text-gray-500 border border-transparent hover:text-gray-300 hover:border-borderSubtle"
            }`}
          >
            {f}
          </button>
        ))}
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 rounded-xl bg-surface/50 border border-borderSubtle animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-12 h-12 rounded-xl bg-surface border border-borderSubtle flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No vaults found</p>
          <p className="text-gray-500 text-xs font-mono mt-1">Create your first vault to get started</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((vault, idx) => {
            const colors = STATUS_COLORS[vault.status] || STATUS_COLORS.active;
            const typeMeta = TYPE_META[vault.vault_type] || TYPE_META.eternal;
            return (
              <motion.div
                key={vault.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`group relative rounded-xl border bg-surface/40 p-5 cursor-pointer transition-all duration-200 hover:bg-surface/70 ${
                  selectedVault?.id === vault.id
                    ? "border-indigo-500/40 shadow-lg shadow-indigo-500/5"
                    : "border-borderSubtle hover:border-indigo-500/20"
                }`}
                onClick={() => setSelectedVault(vault)}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    <span className="font-mono font-bold text-indigo-300 text-sm">VX-{vault.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider border ${colors.badge}`}>
                    {vault.status}
                  </span>
                </div>

                {/* Type tag */}
                <div className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold border ${typeMeta.border} ${typeMeta.color} bg-white/[0.02] mb-3`}>
                  {typeMeta.label}
                </div>

                {/* Meta */}
                <div className="text-xs text-gray-400 font-mono mb-4">
                  {new Date(vault.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {vault.trigger_days && <span className="ml-2 text-amber-400/70">· {vault.trigger_days}d trigger</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedVault(vault); setDecryptOpen(true); }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                  >
                    Decrypt
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(vault.id); }}
                    className="px-3 py-1.5 rounded-lg text-sm font-mono text-red-400/70 border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateVaultModal
          message={message} setMessage={setMessage}
          passphrase={passphrase} setPassphrase={setPassphrase}
          vaultType={vaultType} setVaultType={setVaultType}
          triggerDays={triggerDays} setTriggerDays={setTriggerDays}
          releaseEmail={releaseEmail} setReleaseEmail={setReleaseEmail}
          file={file} setFile={setFile}
          onClose={() => {
            setShowCreate(false);
            setMessage(""); setPassphrase(""); setVaultType("eternal"); setTriggerDays(""); setReleaseEmail(""); setFile(null);
          }}
          onSubmit={handleCreateVault}
        />
      )}
      <AnimatePresence>
        {decryptOpen && selectedVault && (
          <DecryptModal
            vault={selectedVault}
            onClose={() => setDecryptOpen(false)}
            onRefresh={fetchVaults}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Vaults;
