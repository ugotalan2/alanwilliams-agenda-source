import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ThemeContext, type ThemePreference } from "./ThemeContext";

const STORAGE_KEY = "aw-theme";

function getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function getInitialPreference(): ThemePreference {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === "system" || stored === "light" || stored === "dark") {
        return stored;
    }

    return "system";
}

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [preference, setPreference] =
        useState<ThemePreference>(getInitialPreference);

    const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
        getSystemTheme,
    );

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = () => {
            setSystemTheme(media.matches ? "dark" : "light");
        };

        media.addEventListener("change", handleChange);

        return () => {
            media.removeEventListener("change", handleChange);
        };
    }, []);

    const resolvedTheme = preference === "system" ? systemTheme : preference;

    useEffect(() => {
        document.documentElement.setAttribute("data-aw-theme", resolvedTheme);

        document.documentElement.setAttribute("data-bs-theme", resolvedTheme);

        localStorage.setItem(STORAGE_KEY, preference);
    }, [preference, resolvedTheme]);

    const value = useMemo(
        () => ({
            preference,
            resolvedTheme,
            setPreference,
        }),
        [preference, resolvedTheme],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}
