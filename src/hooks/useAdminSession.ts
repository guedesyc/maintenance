import { useEffect, useState } from "react";
import { getAdminSession } from "@/services/adminApiService";
import type { AdminSessionResponse } from "@shared/types";

export function useAdminSession() {
  const [state, setState] = useState<{
    loading: boolean;
    session: AdminSessionResponse;
  }>({
    loading: true,
    session: { authenticated: false },
  });

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((session) => {
        if (active) {
          setState({ loading: false, session });
        }
      })
      .catch(() => {
        if (active) {
          setState({ loading: false, session: { authenticated: false } });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
