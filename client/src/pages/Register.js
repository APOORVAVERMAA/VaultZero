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
            <p className="text-indigo-400 font-mono text-sm mb-6">{email}</p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-indigo-400"
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

      {/* ✅ FORM FIX */}
      <form onSubmit={handleRegister} className="space-y-5">

        <input
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-400">{error}</p>}

        {/* ✅ IMPORTANT: type="submit" */}
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>

      </form>

      <Link to="/">Sign in</Link>
    </AuthLayout>
  );
}

export default Register;