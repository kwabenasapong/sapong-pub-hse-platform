"use client";
import { useEffect, useState } from "react";

export type RefAuthor = { id: string; name: string };

export function useReferenceAuthors() {
  const [authors, setAuthors] = useState<RefAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/refauthors")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAuthors(data);
        // Fallback to defaults if fetch fails or returns empty
        if (!Array.isArray(data) || data.length === 0) {
          setAuthors([
            { id: "1", name: "Oyedepo" },
            { id: "2", name: "Adeyemi" },
            { id: "3", name: "Munroe" },
            { id: "4", name: "Ashimolowo" },
          ]);
        }
      })
      .catch(() => {
        setAuthors([
          { id: "1", name: "Oyedepo" },
          { id: "2", name: "Adeyemi" },
          { id: "3", name: "Munroe" },
          { id: "4", name: "Ashimolowo" },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { authors, loading };
}
