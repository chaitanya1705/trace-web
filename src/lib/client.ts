"use client";
import { useEffect, useState } from "react";

/** True after the first client render. Use for values that differ between server and browser (dates, greetings). */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
