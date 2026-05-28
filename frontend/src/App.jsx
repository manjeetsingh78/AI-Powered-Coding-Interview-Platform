import React from "react";
import useAuth from "./hooks/useAuth";
import AppRouter from "./router";
import { useLocation } from "react-router-dom";

export default function App() {
  const { loading } = useAuth();
  const { pathname } = useLocation();
  const isAuthRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/unauthorized");

  return (
    <main className={`page ${isAuthRoute ? "page-auth" : "page-workspace"}`}>
      <AppRouter />
    </main>
  );
}
