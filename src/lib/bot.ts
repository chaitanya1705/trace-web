"use client";
import { notify } from "./store";

/** TRACE Bot panel open/closed state. The bot itself is not built yet (needs the investigator), so there is no chat content here. */
export const botUi = { open: false };

export const openBot = () => {
  botUi.open = true;
  notify();
};
export const closeBot = () => {
  botUi.open = false;
  notify();
};
export const toggleBot = () => (botUi.open ? closeBot() : openBot());
