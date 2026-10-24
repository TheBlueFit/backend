"use client";

import { createContext, useContext } from "react";
import type { UserSession } from "@/services/api";

interface AppCtx {
  session: UserSession | null;
  unread: number;
  setUnread: (n: number) => void;
  /** Re-checks unread messages right away (used after reading/sending). */
  refreshUnread: () => void;
}

export const AppContext = createContext<AppCtx>({ session: null, unread: 0, setUnread: () => {}, refreshUnread: () => {} });
export const useApp = () => useContext(AppContext);
