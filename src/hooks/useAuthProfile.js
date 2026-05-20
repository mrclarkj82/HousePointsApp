import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, onAuthStateChanged } from "../services/firebase";
import { db } from "../services/firebase";
import { ensureUserProfile, isBootstrapAdminEmail } from "../services/firestore";

function normalizeProfile(firebaseUser, snapshot) {
  const data = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  if (!isBootstrapAdminEmail(firebaseUser.email)) return data;

  return {
    id: data?.id || firebaseUser.uid,
    uid: firebaseUser.uid,
    email: data?.email || firebaseUser.email || "",
    emailLower: data?.emailLower || String(firebaseUser.email || "").toLowerCase(),
    displayName: data?.displayName || firebaseUser.displayName || firebaseUser.email || "Admin",
    photoURL: data?.photoURL || firebaseUser.photoURL || "",
    ...data,
    role: "admin",
    teacherId: data?.teacherId || String(firebaseUser.email || "").toLowerCase(),
    active: true,
  };
}

export function useAuthProfile() {
  const [state, setState] = useState({
    user: null,
    profile: null,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProfile();

      if (!firebaseUser) {
        setState({ user: null, profile: null, loading: false, error: "" });
        return;
      }

      setState((current) => ({ ...current, user: firebaseUser, loading: true, error: "" }));

      const subscribeProfile = (setupError = "") => {
        unsubscribeProfile = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snapshot) => {
            setState({
              user: firebaseUser,
              profile: normalizeProfile(firebaseUser, snapshot),
              loading: false,
              error: setupError,
            });
          },
          (error) => {
            if (isBootstrapAdminEmail(firebaseUser.email)) {
              setState({
                user: firebaseUser,
                profile: normalizeProfile(firebaseUser, { exists: () => false }),
                loading: false,
                error: setupError || error.message,
              });
              return;
            }

            setState({
              user: firebaseUser,
              profile: null,
              loading: false,
              error: error.message,
            });
          }
        );
      };

      try {
        await ensureUserProfile(firebaseUser);
        subscribeProfile();
      } catch (error) {
        subscribeProfile(error.message);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  return state;
}
