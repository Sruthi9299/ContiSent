"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type FontSize = "small" | "normal" | "large";
type FontFamily = "sans" | "serif" | "mono";

interface CustomizationContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  fontFamily: FontFamily;
  setFontFamily: (family: FontFamily) => void;
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

export function CustomizationProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
  const [mounted, setMounted] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedSize = localStorage.getItem("custom-font-size") as FontSize;
    const savedFamily = localStorage.getItem("custom-font-family") as FontFamily;
    if (savedSize) setFontSize(savedSize);
    if (savedFamily) setFontFamily(savedFamily);
  }, []);

  // Update classes and local storage when state changes
  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("custom-font-size", fontSize);
    localStorage.setItem("custom-font-family", fontFamily);

    const root = document.documentElement;

    // Remove existing customization classes
    root.classList.remove("text-sm", "text-base", "text-lg", "font-sans", "font-serif", "font-mono");

    // Add font family
    if (fontFamily === "sans") root.classList.add("font-sans");
    if (fontFamily === "serif") root.classList.add("font-serif");
    if (fontFamily === "mono") root.classList.add("font-mono");

    // Add font size (tailoring base html size)
    if (fontSize === "small") root.classList.add("text-sm");
    if (fontSize === "normal") root.classList.add("text-base");
    if (fontSize === "large") root.classList.add("text-lg");

  }, [fontSize, fontFamily, mounted]);

  return (
    <CustomizationContext.Provider value={{ fontSize, setFontSize, fontFamily, setFontFamily }}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const context = useContext(CustomizationContext);
  if (context === undefined) {
    throw new Error("useCustomization must be used within a CustomizationProvider");
  }
  return context;
}
