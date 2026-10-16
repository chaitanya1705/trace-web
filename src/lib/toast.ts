"use client";
import { notify } from "./store";

/** Transient message shown by <Toaster/>. Mirrors the prototype's `toast()`. */
export const toastState = { msg: "", on: false, seq: 0 };
let t: ReturnType<typeof setTimeout> | undefined;

export const toast = (msg: string) => {
  toastState.msg = msg;
  toastState.on = true;
  toastState.seq++;
  notify();
  clearTimeout(t);
  t = setTimeout(() => {
    toastState.on = false;
    notify();
  }, 2600);
};
