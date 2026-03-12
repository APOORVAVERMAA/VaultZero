import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, requireTerms, requireOnboarding }) {
  const token = localStorage.getItem("token");

  // Validate token exists and has JWT format (three dot-separated base64 segments)
  const isValidJWT = token && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);

  if (!isValidJWT) {
    localStorage.removeItem("token");
    return <Navigate to="/" replace />;
  }

  const termsAccepted = localStorage.getItem("termsAccepted");
  const onboardingCompleted = localStorage.getItem("onboardingCompleted");
  const isTermsAccepted = termsAccepted === "true" || termsAccepted === "1";
  const isOnboardingCompleted = onboardingCompleted === "true" || onboardingCompleted === "1";

  // Enforce terms acceptance before education / secure-init
  if (requireTerms && !isTermsAccepted) {
    return <Navigate to="/policy" replace />;
  }

  // Enforce full onboarding completion before dashboard / terminal / mode-selector
  if (requireOnboarding) {
    if (!isTermsAccepted) {
      return <Navigate to="/policy" replace />;
    }
    if (!isOnboardingCompleted) {
      return <Navigate to="/vault-education" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
