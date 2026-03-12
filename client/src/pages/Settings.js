import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";

function Settings() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword.length < 8) {
      setPwMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setPwLoading(true);
    try {
      const res = await api.post("/api/user/change-password", { currentPassword, newPassword });
      setPwMessage({ type: "success", text: res.data.message || "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwMessage({ type: "error", text: err.response?.data?.message || "Failed to change password." });
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setDeleteError("Password required."); return; }
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await api.delete("/api/user/account", { data: { password: deletePassword } });
      localStorage.clear();
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-borderSubtle text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 transition-colors";

  return (
    <div className="min-h-screen p-6 lg:p-10">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Settings</h1>
        <p className="text-sm text-gray-400 mt-1 font-mono">System configuration & account management</p>
      </motion.div>

      <div className="space-y-4 max-w-2xl">

        {/* Security — Change Password */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-borderSubtle bg-surface/30 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <h2 className="text-xs font-mono text-gray-400 uppercase tracking-widest">Security</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputClass} />
            <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputClass} />
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />

            {pwMessage && (
              <p className={`text-sm font-mono ${pwMessage.type === "error" ? "text-red-400" : "text-emerald-400"}`}>
                {pwMessage.text}
              </p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-mono font-semibold transition-colors disabled:opacity-50"
            >
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </motion.div>

        {/* Education */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-borderSubtle bg-surface/30 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <h2 className="text-xs font-mono text-gray-400 uppercase tracking-widest">Vault Education</h2>
          </div>
          <p className="text-sm text-gray-400 mb-3">Review vault type specifications and encryption protocols.</p>
          <Link
            to="/vault-review"
            className="inline-block px-4 py-2 rounded-lg bg-white/[0.03] border border-borderSubtle text-sm font-mono text-indigo-300 hover:bg-white/[0.06] hover:border-indigo-500/20 transition-all"
          >
            Review Vault Types →
          </Link>
        </motion.div>

        {/* Account */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-red-500/10 bg-surface/30 p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <h2 className="text-xs font-mono text-gray-400 uppercase tracking-widest">Account</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-white/[0.03] border border-borderSubtle text-sm font-mono text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              End Session
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-lg bg-red-500/5 border border-red-500/15 text-sm font-mono text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              Delete Account
            </button>
          </div>
        </motion.div>

      </div>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowDeleteModal(false); setDeletePassword(""); setDeleteError(""); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-xl border border-red-500/20 bg-[#0a0d12] p-8 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.068 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white">Delete Account</h3>
              </div>
              <p className="text-sm text-gray-400 mb-5 ml-8">
                This action is <span className="text-red-400 font-semibold">permanent and irreversible</span>. All vaults, data, and security questions will be destroyed.
              </p>

              <input
                type="password"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDeleteAccount()}
                className={`${inputClass} border-red-500/20 focus:border-red-500/40`}
                autoFocus
              />

              {deleteError && (
                <p className="text-xs text-red-400 font-mono mt-2">{deleteError}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeletePassword(""); setDeleteError(""); }}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-borderSubtle text-sm font-mono text-gray-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || !deletePassword}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-mono font-semibold transition-colors disabled:opacity-40"
                >
                  {deleteLoading ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Settings;
