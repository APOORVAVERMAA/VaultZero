import { useState } from "react";
import api from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import AuthLayout from "../components/authLayout";

function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/register", { fullName, email, password });
      if (res.data.requiresVerification) {
        setVerificationSent(true);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/api/auth/resend-verification", { email });
    } catch {
      // Silently handle
    } finally {
      setResending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleRegister();
  };

  if (verificationSent) {
    return (
      <AuthLayout pageKey="verify-sent">
        <div className="text-center py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-mono">Check Your Email</h2>
            <p className="text-gray-400 text-sm mb-2">
              We sent a verification link to
            </p>
            <p className="text-indigo-400 font-mono text-sm mb-6">{email}</p>
            <p className="text-gray-500 text-xs mb-8">
              Click the link in your email to activate your account. The link expires in 24 hours.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend verification email"}
              </button>
              <div>
                <Link
                  to="/"
                  className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout pageKey="register">
      <h2 className="text-3xl font-bold text-white mb-2 font-mono">Create Account</h2>
      <p className="text-gray-400 text-base mb-8 font-mono">Set up your secure vault identity.</p>

      <div className="space-y-5" onKeyDown={handleKeyDown}>
        <div>
          <label className="text-sm text-gray-300 font-medium block mb-2">Full Name</label>
          <input
            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 transition text-base"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

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
            placeholder="Min 8 chars, 1 uppercase, 1 number"
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
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors p-3.5 rounded-xl font-semibold text-white text-base disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </motion.button>
      </div>

      <p className="text-gray-400 mt-8 text-sm">
        Already have an account?{" "}
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Register;