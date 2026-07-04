"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, AJUSTES_ID } from "@/lib/db/db";

/** Hook reactivo a los ajustes del usuario. */
export function useAjustes() {
  return useLiveQuery(() => db.ajustes.get(AJUSTES_ID));
}