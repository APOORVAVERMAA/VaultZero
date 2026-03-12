import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Vaults from "./pages/Vaults";
import Activity from "./pages/Activity";
import Terminal from "./pages/Terminal";
import Settings from "./pages/Settings";
import ReleaseViewer from "./pages/ReleaseViewer";
import Policy from "./pages/policy";
import VaultEducation from "./pages/vaultEducation";
import VaultReview from "./pages/VaultReview";
import SecureInit from "./pages/SecureInit";
import ModeSelector from "./pages/ModeSelector";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/dashboardLayout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/policy" element={<ProtectedRoute><Policy /></ProtectedRoute>} />
        <Route path="/vault-education" element={<ProtectedRoute requireTerms><VaultEducation /></ProtectedRoute>} />
        <Route path="/secure-init" element={<ProtectedRoute requireTerms><SecureInit /></ProtectedRoute>} />
        <Route path="/mode-selector" element={<ProtectedRoute requireTerms requireOnboarding><ModeSelector /></ProtectedRoute>} />
        <Route element={<ProtectedRoute requireTerms requireOnboarding><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vaults" element={<Vaults />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/terminal" element={<Terminal />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/vault-review" element={<VaultReview />} />
        </Route>
        <Route path="/release/:token" element={<ReleaseViewer />} />
      </Routes>
    </Router>
  );
}

export default App;