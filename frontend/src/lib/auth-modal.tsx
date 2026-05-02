"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import AuthModal from "@/components/AuthModal";

type AuthMode = "signin" | "signup";

interface AuthModalContextValue {
  openAuthModal: (mode: AuthMode) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");

  const openAuthModal = (m: AuthMode) => {
    setMode(m);
    setOpen(true);
  };

  const closeAuthModal = () => setOpen(false);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      {open && <AuthModal defaultMode={mode} onClose={closeAuthModal} />}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within <AuthModalProvider>");
  return ctx;
}
