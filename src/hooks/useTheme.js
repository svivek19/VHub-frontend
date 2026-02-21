import { useEffect, useState } from "react";

export const useTheme = () => {
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const getInitialTheme = () => {
    return localStorage.getItem("theme") || "system";
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;

    let appliedTheme = theme;

    if (theme === "system") {
      appliedTheme = getSystemTheme();
    }

    root.classList.remove("light", "dark");
    root.classList.add(appliedTheme);

    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
};
