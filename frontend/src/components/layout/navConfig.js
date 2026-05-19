import {
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileBadge,
  Gauge,
  History,
  LayoutDashboard,
  Rocket,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export const ROLE_NAV = {
  candidate: [
    { to: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/candidate/assessment", label: "Assessment", icon: ClipboardCheck },
    { to: "/candidate/solve", label: "Solve", icon: Rocket },
    { to: "/candidate/history", label: "History", icon: History },
    { to: "/candidate/results", label: "Results", icon: Gauge },
    { to: "/candidate/schedule", label: "Schedule", icon: CalendarCheck },
  ],
  recruiter: [
    { to: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/recruiter/create-test", label: "Create Test", icon: FileBadge },
    { to: "/recruiter/test-detail", label: "Test Detail", icon: ScrollText },
    { to: "/recruiter/candidate-report", label: "Reports", icon: Sparkles },
    { to: "/recruiter/slots", label: "Slots", icon: CalendarCheck },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: ShieldCheck },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/companies", label: "Companies", icon: Building2 },
  ],
};

export const ROLE_META = {
  candidate: {
    title: "Candidate Studio",
    subtitle: "Practice, assess, and track your coding growth",
    icon: Rocket,
  },
  recruiter: {
    title: "Recruiter Studio",
    subtitle: "Design assessments and evaluate talent confidently",
    icon: BriefcaseBusiness,
  },
  admin: {
    title: "Admin Command Center",
    subtitle: "Control platform users, companies, and problem inventory",
    icon: ShieldCheck,
  },
};

export function normalizeRole(role) {
  if (role === "user") return "candidate";
  if (role === "interviewer") return "recruiter";
  return role || "candidate";
}

export function getRouteTitle(pathname) {
  if (pathname.startsWith("/candidate/solve/")) {
    return "Problem Workspace";
  }

  const titleMap = {
    "/candidate/dashboard": "Candidate Dashboard",
    "/candidate/assessment": "Timed Assessment",
    "/candidate/solve": "Solve Workspace",
    "/candidate/history": "Submission History",
    "/candidate/results": "Results and Insights",
    "/candidate/schedule": "Interview Schedule",
    "/recruiter/dashboard": "Recruiter Dashboard",
    "/recruiter/create-test": "Create Hiring Test",
    "/recruiter/test-detail": "Test Detail",
    "/recruiter/candidate-report": "Candidate Reports",
    "/recruiter/slots": "Interview Slots",
    "/admin/dashboard": "Admin Dashboard",
    "/admin/users": "User Management",
    "/admin/companies": "Company Management",
  };

  return titleMap[pathname] || "Workspace";
}
