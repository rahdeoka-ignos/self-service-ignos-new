import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PinStatusResponse, VerifyPinResponse, ChangePinResponse } from "../types/security";

interface SecurityContextType {
  isAuthenticated: boolean;
  isDefaultPin: boolean;
  loading: boolean;
  pinModalOpen: boolean;
  targetAdminPath: string;
  openPinModal: (targetPath?: string) => void;
  closePinModal: () => void;
  verifyPin: (pin: string) => Promise<VerifyPinResponse>;
  changePin: (currentPin: string, newPin: string) => Promise<ChangePinResponse>;
  logout: () => void;
  refreshPinStatus: () => Promise<void>;
}

const API = "http://localhost:5000";
const AUTH_TOKEN_KEY = "ignos_admin_session_token";
const AUTH_TIME_KEY = "ignos_admin_session_timestamp";
const SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 60 minutes of session validity

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
      const time = sessionStorage.getItem(AUTH_TIME_KEY);
      if (token && time) {
        const elapsed = Date.now() - Number(time);
        if (elapsed < SESSION_MAX_AGE_MS) {
          return true;
        }
      }
    } catch {}
    return false;
  });

  const [isDefaultPin, setIsDefaultPin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [targetAdminPath, setTargetAdminPath] = useState("/admin");

  const refreshPinStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/security/pin-status`);
      if (res.ok) {
        const data: PinStatusResponse = await res.json();
        setIsDefaultPin(data.isDefaultPin);
      }
    } catch (err) {
      console.warn("Gagal mengambil status PIN keamanan:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPinStatus();
  }, [refreshPinStatus]);

  const verifyPin = async (pin: string): Promise<VerifyPinResponse> => {
    try {
      const res = await fetch(`${API}/api/security/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data: VerifyPinResponse = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        if (data.isDefaultPin !== undefined) {
          setIsDefaultPin(data.isDefaultPin);
        }
        try {
          if (data.token) {
            sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
          }
          sessionStorage.setItem(AUTH_TIME_KEY, String(Date.now()));
        } catch {}
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Gagal menghubungi server keamanan.",
      };
    }
  };

  const changePin = async (
    currentPin: string,
    newPin: string
  ): Promise<ChangePinResponse> => {
    try {
      const res = await fetch(`${API}/api/security/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data: ChangePinResponse = await res.json();
      if (res.ok && data.success) {
        setIsDefaultPin(false);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Gagal memperbarui PIN.",
      };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TIME_KEY);
    } catch {}
  };

  const openPinModal = (targetPath: string = "/admin") => {
    setTargetAdminPath(targetPath);
    setPinModalOpen(true);
  };

  const closePinModal = () => {
    setPinModalOpen(false);
  };

  return (
    <SecurityContext.Provider
      value={{
        isAuthenticated,
        isDefaultPin,
        loading,
        pinModalOpen,
        targetAdminPath,
        openPinModal,
        closePinModal,
        verifyPin,
        changePin,
        logout,
        refreshPinStatus,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within a SecurityProvider");
  }
  return context;
}
