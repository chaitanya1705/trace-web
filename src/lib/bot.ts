"use client";
import { notify } from "./store";

/** Open/closed flag of the TRACE Bot side panel so any screen can open it ("Ask about this"). */
export const botUi = { open: false, focusTick: 0 };

export const openBot = () => {
  botUi.open = true;
  botUi.focusTick++;
  notify();
};
export const closeBot = () => {
  botUi.open = false;
  notify();
};
export const toggleBot = () => (botUi.open ? closeBot() : openBot());
