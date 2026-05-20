import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, onAuthStateChanged } from "../services/firebase";
import { db } from "../services/firebase";
import { ensureUserProfile } from "../services/firestore";

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

      try {
        await ensureUserProfile(firebaseUser);
        unsubscribeProfile = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snapshot) => {
            setState({
              user: firebaseUser,
              profile: snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
              loading: false,
              error: "",
            });
          },
          (error) => {
            setState({
              user: firebaseUser,
              profile: null,
              loading: false,
              error: error.message,
            });
          }
        );
      } catch (error) {
        setState({
          user: firebaseUser,
          profile: null,
          loading: false,
          error: error.message,
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  return state;
}
