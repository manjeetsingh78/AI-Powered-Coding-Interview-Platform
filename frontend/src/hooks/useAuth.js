import { useCallback, useMemo, useState } from "react";
import { adminLogin, login, register } from "../api/auth.api";

const STORAGE_KEY = "auth_user";

export default function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  const saveUser = useCallback((payloadUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadUser));
    setUser(payloadUser);
  }, []);

  const registerUser = useCallback(async (payload) => {
    const result = await register(payload);
    if (result.ok && result.data?.user) {
      saveUser(result.data.user);
    }
    return result;
  }, [saveUser]);

  const loginUser = useCallback(async (payload) => {
    const result = await login(payload);
    if (result.ok && result.data?.user) {
      saveUser(result.data.user);
    }
    return result;
  }, [saveUser]);

  const loginAdmin = useCallback(async (payload) => {
    const result = await adminLogin(payload);
    if (result.ok && result.data?.user) {
      saveUser(result.data.user);
    }
    return result;
  }, [saveUser]);

  const logoutUser = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      register: registerUser,
      login: loginUser,
      loginAdmin,
      logout: logoutUser,
    }),
    [user, isAuthenticated, registerUser, loginUser, loginAdmin, logoutUser]
  );
}
