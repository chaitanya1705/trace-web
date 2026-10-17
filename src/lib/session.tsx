"use client";
import { createContext, useContext } from "react";

export type SessionUser = { name: string; sub: string };
const Ctx = createContext<SessionUser>({ name: "Chaitanya N.", sub: "On-call · Platform" });
export const SessionProvider = Ctx.Provider;
export const useSession = () => useContext(Ctx);
