import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { UserProfile } from "../types";

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoaded: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  saveProfile: (profile: Partial<UserProfile>) => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  profileLoaded: false,

  initialize: async () => {
    // Don't set loading:false from getSession() — on web the token may still be
    // refreshing. Wait for onAuthStateChange (fires INITIAL_SESSION) which gives
    // us the definitive verified session before the UI renders.
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, loading: false, profileLoaded: !session });
      if (session) await get().fetchProfile();
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error?.message ?? null;
  },

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  fetchProfile: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      set({ profileLoaded: true });
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userData.user.id)
      .single();
    if (error) console.error("[auth] fetchProfile failed:", error.message);
    else if (data) set({ profile: data as UserProfile });
    set({ profileLoaded: true });
  },

  saveProfile: async (updates) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    const payload = { ...updates, user_id: userData.user.id };
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) console.error("[auth] saveProfile failed:", error.message);
    else if (data) set({ profile: data as UserProfile });
  },
}));
