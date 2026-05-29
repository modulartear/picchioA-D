import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../firebase";

export function useAuth() {
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    if (!auth) {
      setState({ loading: false, user: null });
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setState({ loading: false, user });
    });
    return () => unsub();
  }, []);

  return state;
}

export function isAdminUser(user) {
  const adminUid = import.meta.env.VITE_ADMIN_UID;
  if (!adminUid) return false;
  return user?.uid === adminUid;
}
