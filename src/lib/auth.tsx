import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithIdentifier: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, registrationNumber: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      console.error("loadProfile error", error);
    }
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setLoading(true);
        (async () => {
          await new Promise((r) => setTimeout(r, 400));
          await loadProfile(newSession.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    profile,
    loading,
    async signInWithIdentifier(identifier, password) {
      let email = identifier.trim();
      if (!isEmail(email)) {
        const { data: emailData, error: rpcError } = await supabase.rpc("get_email_by_registration", {
          reg_code: email,
        });
        if (rpcError) return { error: "Erro ao buscar matrícula." };
        if (!emailData) return { error: "Matrícula não encontrada." };
        email = emailData as string;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUp(email, password, fullName, registrationNumber) {
      const { data: registrationAvailable, error: registrationCheckError } = await supabase.rpc(
        "is_registration_available",
        { reg_code: registrationNumber.trim() }
      );
      if (registrationCheckError) {
        return { error: "Não foi possível validar a matrícula. Tente novamente." };
      }
      if (registrationAvailable === false) {
        return { error: "Esta matrícula já está cadastrada. Use o e-mail da conta existente ou informe outra matrícula." };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            registration_number: registrationNumber || null,
          },
        },
      });
      if (error) {
        if (error.message.includes("uq_profiles_registration_student") || error.message.toLowerCase().includes("duplicate key")) {
          return { error: "Esta matrícula já está cadastrada. Use o e-mail da conta existente ou informe outra matrícula." };
        }
        if (error.message.toLowerCase().includes("user already registered")) {
          return { error: "Este e-mail já está cadastrado. Faça login ou use outro e-mail." };
        }
        return { error: error.message };
      }
      if (data.user) {
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 300));
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", data.user.id)
            .maybeSingle();
          if (p) {
            setProfile(p as Profile);
            break;
          }
        }
      }
      return { error: null };
    },
    async signOut() {
      await supabase.auth.signOut();
      setProfile(null);
    },
    async refreshProfile() {
      if (session?.user) await loadProfile(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
