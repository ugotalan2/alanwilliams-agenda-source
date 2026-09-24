import { createContext } from "react";

export type ThemePreference = "system" | "light" | "dark";

export interface ThemeContextValue {
    preference: ThemePreference;
    resolvedTheme: "light" | "dark";
    setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
    undefined,
);
