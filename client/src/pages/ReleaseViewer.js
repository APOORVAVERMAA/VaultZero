import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import { decryptMessage } from "../utils/crypto";

function ReleaseViewer() {

  const { token } = useParams();

  const [vaultData, setVaultData] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState(1);

  // Fetch vault data or security question
  useEffect(() => {
    const fetchVault = async () => {
      try {
        const res = await api.get(`/api/vault/release/${token}`);

        if (res.data.verificationRequired) {
          setQuestion(res.data.question);
          setStep(1);
        } else {
          setVaultData(res.data);
          setStep(2);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Invalid or expired link.");
      } finally {
        setLoading(false);
      }
    };

    fetchVault();
  }, [token]);

  const handleVerify = async () => {
    if (!answer.trim()) {
      setError("Please enter your answer.");
      return;
    }

    try {
      setVerifying(true);
      setError("");

      const res = await api.post(`/api/vault/release/verify/${token}`, { answer: answer.trim() });

      setVaultData(res.data);
      setQuestion(null);
      setStep(2);

    } catch (err) {
      setError(err.response?.data?.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleDecrypt = async () => {
    try {
      setError("");

      const result = await decryptMessage(
        vaultData.encrypted_blob,
        vaultData.iv,
        vaultData.salt,
        passphrase
      );

      setDecryptedMessage(result);
      setStep(3);

    } catch {
      setError("Incorrect passphrase or decryption failed.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e13] text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading secure vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e13] text-gray-200"
      style={{ backgroundImage: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 50%)" }}>

      <div className="w-[520px] bg-[#121620] border border-indigo-500/20 p-10 rounded-3xl shadow-xl shadow-indigo-500/20">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/40">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white font-mono">
            Secure Vault Release
          </h2>
          <p className="text-xs text-gray-500 mt-2">Step {step} of 3</p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
              s <= step ? "bg-indigo-500" : "bg-white/10"
            }`} />
          ))}
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* STEP 1: Security Question Verification */}
        {question && !vaultData && (
          <div>
            <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-5 mb-6">
              <p className="text-xs uppercase tracking-widest text-indigo-400/70 font-semibold mb-3">
                Security Question
              </p>
              <p className="text-indigo-200 font-medium">
                {question.question_text}
              </p>
            </div>

            <input
              type="text"
              placeholder="Your answer"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setError(""); }}
              className="w-full p-4 bg-[#0c0f14] border border-white/10 rounded-xl
                         focus:outline-none focus:border-indigo-500 transition mb-6"
            />
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full bg-indigo-600 hover:bg-indigo-500 transition px-6 py-3.5 rounded-xl
                         shadow-lg shadow-indigo-600/30 font-semibold disabled:opacity-50"
            >
              {verifying ? "Verifying..." : "Verify Identity"}
            </button>
          </div>
        )}

        {/* STEP 2: Passphrase Decryption */}
        {vaultData && !decryptedMessage && (
          <div>
            <p className="text-sm text-gray-400 mb-6 text-center">
              Identity verified. Enter the vault passphrase to decrypt.
            </p>
            <input
              type="password"
              placeholder="Enter vault passphrase"
              value={passphrase}
              onChange={(e) => { setPassphrase(e.target.value); setError(""); }}
              className="w-full p-4 bg-[#0c0f14] border border-white/10 rounded-xl
                         focus:outline-none focus:border-indigo-500 transition mb-6"
            />
            <button
              onClick={handleDecrypt}
              className="w-full bg-indigo-600 hover:bg-indigo-500 transition px-6 py-3.5 rounded-xl
                         shadow-lg shadow-indigo-600/30 font-semibold"
            >
              Decrypt Vault
            </button>
          </div>
        )}

        {/* STEP 3: Decrypted Content */}
        {decryptedMessage && (
          <div>
            <p className="text-xs uppercase tracking-widest text-green-400/70 font-semibold mb-3">
              Decrypted Content
            </p>
            <div className="bg-[#0c0f14] border border-green-500/20 p-6 rounded-xl text-green-400 whitespace-pre-wrap text-sm">
              {decryptedMessage}
            </div>
          </div>
        )}

        {/* No data and no question = error-only state */}
        {!question && !vaultData && !error && (
          <p className="text-gray-500 text-center">
            Unable to load vault data.
          </p>
        )}

      </div>

    </div>
  );
}

export default ReleaseViewer;