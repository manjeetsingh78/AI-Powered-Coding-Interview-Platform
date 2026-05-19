import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminLogin as adminLoginApi,
  clearTokens,
  login as loginApi,
  logout as logoutApi,
  me as meApi,
  register as registerApi,
} from "../api/auth.api";

const STORAGE_KEY = "auth_user";

export default function useAuth() {
  const readStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(() => {
    return readStoredUser();
  });

  const isAuthenticated = Boolean(user);

  const saveUser = useCallback((payloadUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadUser));
    setUser(payloadUser);
    window.dispatchEvent(new Event("auth-changed"));
  }, []);

  const registerUser = useCallback(async (payload) => {
    const result = await registerApi(payload);
    if (result.ok && result.data?.user) {
      saveUser(result.data.user);
    }
    return result;
  }, [saveUser]);

  const loginUser = useCallback(async (payload) => {
    const result = await loginApi(payload);
    if (result.ok && result.data?.user) {
      saveUser(result.data.user);
    }
    return result;
  }, [saveUser]);

  const loginAdmin = useCallback(async (payload) => {
    const result = await adminLoginApi(payload);
    if (result.ok && result.data?.user) {
      saveUser(result.data.user);
    }
    return result;
  }, [saveUser]);

  const logoutUser = useCallback(() => {
    clearTokens();
    setUser(null);
    window.dispatchEvent(new Event("auth-changed"));
  }, []);

  const logoutWithApi = useCallback(async () => {
    await logoutApi();
    logoutUser();
  }, [logoutUser]);

  useEffect(() => {
    const hydrateFromSession = async () => {
      const result = await meApi();
      if (result.ok && result.data?.user) {
        saveUser(result.data.user);
      } else {
        clearTokens();
        setUser(null);
      }
    };

    hydrateFromSession();


    const syncAuth = () => {
      setUser(readStoredUser());
    };

    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, [saveUser]);

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      register: registerUser,
      login: loginUser,
      loginAdmin,
      logout: logoutWithApi,
    }),
    [user, isAuthenticated, registerUser, loginUser, loginAdmin, logoutWithApi]
  );
}
