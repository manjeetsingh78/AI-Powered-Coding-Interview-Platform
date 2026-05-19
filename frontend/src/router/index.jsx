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
import CandidateProblemPage from "../pages/candidate/CandidateProblemPage";
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
import AddProblemPage from "../pages/admin/AddProblemPage";
import UsersPage from "../pages/admin/UsersPage";
import CompaniesPage from "../pages/admin/CompaniesPage";

import CandidateLayout from "../components/layout/CandidateLayout";
import RecruiterLayout from "../components/layout/RecruiterLayout";
import AdminLayout from "../components/layout/AdminLayout";

import PrivateRoute from "./PrivateRoute";
import RoleRoute from "./RoleRoute";

// Home component that redirects based on auth status
function Home() {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard based on user role
  if (user.role === "user" || user.role === "candidate") {
    return <Navigate to="/candidate/dashboard" replace />;
  } else if (user.role === "interviewer" || user.role === "recruiter") {
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
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["candidate", "user"]}>
              <CandidateLayout />
            </RoleRoute>
          </PrivateRoute>
        }
      >
        <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
        <Route path="/candidate/solve" element={<SolvePage />} />
        <Route path="/candidate/solve/:slug" element={<CandidateProblemPage />} />
        <Route path="/candidate/history" element={<HistoryPage />} />
        <Route path="/candidate/results" element={<ResultsPage />} />
        <Route path="/candidate/assessment" element={<AssessmentPage />} />
        <Route path="/candidate/schedule" element={<SchedulePage />} />
      </Route>

      <Route
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["recruiter", "interviewer"]}>
              <RecruiterLayout />
            </RoleRoute>
          </PrivateRoute>
        }
      >
        <Route path="/recruiter/dashboard" element={<RecruiterDashboardPage />} />
        <Route path="/recruiter/create-test" element={<CreateTestPage />} />
        <Route path="/recruiter/test-detail" element={<TestDetailPage />} />
        <Route path="/recruiter/candidate-report" element={<CandidateReportPage />} />
        <Route path="/recruiter/slots" element={<SlotsPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </RoleRoute>
          </PrivateRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/problems/new" element={<AddProblemPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/companies" element={<CompaniesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
