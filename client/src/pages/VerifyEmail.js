import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import AuthLayout from "../components/authLayout";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    api.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed.");
      });
  }, [searchParams]);

  return (
    <AuthLayout pageKey="verify-email">
      <div className="text-center py-8">
        {status === "verifying" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-mono">Verifying Email</h2>
            <p className="text-gray-400 text-sm">Please wait...</p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-mono">Email Verified</h2>
            <p className="text-gray-400 text-sm mb-8">{message}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
            >
              Sign In
            </Link>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-mono">Verification Failed</h2>
            <p className="text-gray-400 text-sm mb-8">{message}</p>
            <Link
              to="/register"
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
            >
              Try Again
            </Link>
          </motion.div>
        )}
      </div>
    </AuthLayout>
  );
}

export default VerifyEmail;
