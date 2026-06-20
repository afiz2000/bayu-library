"use client";

import { useEffect, useState } from "react";
import type { LibrarianSession } from "@/lib/session";

export function useCurrentLibrarian(): LibrarianSession | null {
  const [user, setUser] = useState<LibrarianSession | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data.role === "LIBRARIAN") setUser(result.data);
      });
  }, []);

  return user;
}
