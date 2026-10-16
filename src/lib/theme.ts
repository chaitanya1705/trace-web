"use client";
import { S } from "./state";

/** Is the page currently showing the dark palette? (explicit choice, else the system setting) */
export const themeIsDark = () => {
  const r = document.documentElement;
  return r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

/** Apply the Preferences theme + density. */
export const applyTheme = () => {
  const r = document.documentElement;
  const p = S.pref;
  let t = p.theme;
  if (t === "system") {
    try {
      const saved = localStorage.getItem("trace_theme");
      if (saved === "light" || saved === "dark") t = saved;
    } catch {}
  }
  if (t === "system") delete r.dataset.theme;
  else r.dataset.theme = t;
  document.body.classList.toggle("compact", p.density === "compact");
};

/** Toolbar toggle. Returns whether the page is now dark. */
export const toggleTheme = () => {
  const r = document.documentElement;
  const next = themeIsDark() ? "light" : "dark";
  r.dataset.theme = next;
  try {
    localStorage.setItem("trace_theme", next);
  } catch {}
  return next === "dark";
};
