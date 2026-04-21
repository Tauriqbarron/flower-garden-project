"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface RegionContextType {
  region: string;
  setRegion: (r: string) => void;
}

const RegionContext = createContext<RegionContextType>({
  region: "auckland",
  setRegion: () => {},
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState("auckland");

  useEffect(() => {
    const saved = localStorage.getItem("garden-region");
    if (saved === "auckland" || saved === "christchurch") {
      setRegionState(saved);
    }
  }, []);

  const setRegion = (r: string) => {
    setRegionState(r);
    localStorage.setItem("garden-region", r);
  };

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
