import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import UserRegisterPage from "../pages/auth/UserRegisterPage";
import InterviewerRegisterPage from "../pages/auth/InterviewerRegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import VerifyAccountPage from "../pages/auth/VerifyAccountPage";
import UnauthorizedPage from "../pages/auth/UnauthorizedPage";

import CandidateDashboardPage from "../pages/candidate/DashboardPage";
import SolvePage from "../pages/candidate/SolvePage";
import HistoryPage from "../pages/candidate/HistoryPage";
import ResultsPage from "../pages/candidate/ResultsPage";
import AssessmentPage from "../pages/candidate/AssessmentPage";
import SchedulePage from "../pages/candidate/SchedulePage";

import RecruiterDashboardPage from "../pages/recruiter/DashboardPage";
import CreateTestPage from "../pages/recruiter/CreateTestPage";
import TestDetailPage from "../pages/recruiter/TestDetailPage";
import CandidateReportPage from "../pages/recruiter/CandidateReportPage";
import SlotsPage from "../pages/recruiter/SlotsPage";

import AdminDashboardPage from "../pages/admin/DashboardPage";
import UsersPage from "../pages/admin/UsersPage";
import CompaniesPage from "../pages/admin/CompaniesPage";

import PrivateRoute from "./PrivateRoute";
import RoleRoute from "./RoleRoute";

// Home component that redirects based on auth status
function Home() {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard based on user role
  if (user.role === "user") {
    return <Navigate to="/candidate/dashboard" replace />;
  } else if (user.role === "interviewer") {
    return <Navigate to="/recruiter/dashboard" replace />;
  } else if (user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/user" element={<UserRegisterPage />} />
      <Route path="/register/interviewer" element={<InterviewerRegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify" element={<VerifyAccountPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        path="/candidate/dashboard"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["candidate", "user"]}>
              <CandidateDashboardPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/solve"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["candidate", "user"]}>
              <SolvePage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/history"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["candidate", "user"]}>
              <HistoryPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/results"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["candidate", "user"]}>
              <ResultsPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/assessment"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["candidate", "user"]}>
              <AssessmentPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/candidate/schedule"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["candidate", "user"]}>
              <SchedulePage />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      <Route
        path="/recruiter/dashboard"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["recruiter", "interviewer"]}>
              <RecruiterDashboardPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/create-test"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["recruiter", "interviewer"]}>
              <CreateTestPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/test-detail"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["recruiter", "interviewer"]}>
              <TestDetailPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/candidate-report"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["recruiter", "interviewer"]}>
              <CandidateReportPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter/slots"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["recruiter", "interviewer"]}>
              <SlotsPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <AdminDashboardPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <UsersPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/companies"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <CompaniesPage />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
