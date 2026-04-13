import { useState } from "react";
import api from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import AuthLayout from "../components/authLayout";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) return;
    setError("");
    setNeedsVerification(false);
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("termsAccepted", res.data.termsAccepted);
      localStorage.setItem("onboardingCompleted", res.data.onboardingCompleted);
      localStorage.setItem("fullName", res.data.fullName || "");
      localStorage.setItem("email", email.trim().toLowerCase());

      if (!res.data.termsAccepted) {
        navigate("/policy");
      } else if (!res.data.onboardingCompleted) {
        navigate("/vault-education");
      } else {
        // Onboarding complete — check for stored mode preference
        const mode = localStorage.getItem("vaultInterfaceMode");
        if (mode === "terminal") {
          navigate("/terminal");
        } else if (mode === "ui") {
          navigate("/dashboard");
        } else {
          navigate("/mode-selector");
        }
      }
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        setNeedsVerification(true);
        setError("Please verify your email before signing in.");
      } else {
        setError(err.response?.data?.message || "Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await api.post("/api/auth/resend-verification", { email });
      setError("Verification email sent. Check your inbox.");
      setNeedsVerification(false);
    } catch {
      setError("Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <AuthLayout pageKey="login">
      <h2 className="text-3xl font-bold text-white mb-2 font-mono">Welcome Back</h2>
      <p className="text-gray-400 text-base mb-8 font-mono">Sign in to access your encrypted vaults.</p>

      <div className="space-y-5" onKeyDown={handleKeyDown}>
        <div>
          <label className="text-sm text-gray-300 font-medium block mb-2">Email</label>
          <input
            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 transition text-base"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-300 font-medium block mb-2">Password</label>
          <input
            type="password"
            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 transition text-base"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
          >
            {error}
            {needsVerification && (
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="block mx-auto mt-2 text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend verification email"}
              </button>
            )}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors p-3.5 rounded-xl font-semibold text-white text-base disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </motion.button>
      </div>

      <p className="text-gray-400 mt-8 text-sm">
        Don't have an account?{" "}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
