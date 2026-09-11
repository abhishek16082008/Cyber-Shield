/* ==========================================================================
   ScanContext — carries the pending .eml upload from the Analyse screen to
   the Investigation screen (a File can't live in the URL). Reports loads the
   finished scan by id from the API instead, so report links are shareable.
   ========================================================================== */

import { createContext, useContext, useState, type ReactNode } from "react";

interface ScanContextValue {
  pendingFile: File | null;
  setPendingFile: (file: File | null) => void;
}

const ScanContext = createContext<ScanContextValue | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  return (
    <ScanContext.Provider value={{ pendingFile, setPendingFile }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan(): ScanContextValue {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan must be used within <ScanProvider>");
  return ctx;
}
