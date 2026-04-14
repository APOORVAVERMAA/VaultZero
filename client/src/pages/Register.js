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

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleRegister();
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();

    if (!fullName || !email || !password) {
      setError("All fields are required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/register", {
        fullName,
        name: fullName,
        email,
        password,
      });

      if (res.data.requiresVerification) {
        setVerificationSent(true);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/api/auth/resend-verification", { email });
    } catch {
      setError("Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  if (verificationSent) {
    return (
      <AuthLayout pageKey="verify-sent">
        <div className="text-center py-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-bold text-white mb-2 font-mono">
              Check Your Email
            </h2>
            <p className="text-indigo-400 font-mono text-sm mb-2">{email}</p>
            <p className="text-gray-400 text-sm mb-6 font-mono">
              Verification link sent. Please verify before signing in.
            </p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend Email"}
            </button>
          </motion.div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout pageKey="register">
      <h2 className="text-3xl font-bold text-white mb-2 font-mono">
        Create Account
      </h2>
      <p className="text-gray-400 text-base mb-8 font-mono">Register to secure your encrypted vaults.</p>

      <form onSubmit={handleRegister} className="space-y-5" onKeyDown={handleKeyDown}>
        <div>
          <label className="text-sm text-gray-300 font-medium block mb-2">Full Name</label>
          <input
            className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 transition text-base"
            placeholder="John Doe"
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
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors p-3.5 rounded-xl font-semibold text-white text-base disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Account"}
        </motion.button>
      </form>

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