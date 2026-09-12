import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../services/supabaseclient';

/**
 * AuthContext — nag-track lang ng Supabase SESSION state sa buong app
 * (may laman ba, o wala/expired na). HINDI ito ang gumagawa ng login/
 * signup/logout mismo — ang mga actions na 'yon ay nasa apiService
 * object na (APIservices.js), tinatawag direkta mula sa login.jsx.
 *
 * Ang tanging trabaho nito:
 *   1. Malaman kung may valid na session (para sa route guarding sa
 *      App.jsx — see ProtectedRoute doon)
 *   2. Mag-listen sa onAuthStateChange — kapag nag-expire/na-revoke ang
 *      session sa ibang paraan (hal. token expiry, logout sa ibang tab),
 *      awtomatikong ma-clear ang cached profile sa localStorage at
 *      ma-redirect papuntang /login sa susunod na render.
 *
 * Bakit hiwalay ito sa apiService: si apiService ang "aksyon" (mag-login,
 * mag-signup), si AuthContext naman ang "estado" (naka-login ba ako
 * ngayon). Karaniwang pattern ito para hindi kailangang mag-fetch nang
 * paulit-ulit ng session sa bawat page/component na kailangang malaman
 * kung authenticated ang user.
 */
const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Kunin ang kasalukuyang session sa unang load (kung naka-persist
    // na si Supabase mula sa nakaraang visit — awtomatiko nitong
    // ginagawa ito sa disk/localStorage, hindi na tayo mismo).
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setLoading(false);
    });

    // Nakikinig sa lahat ng auth events: SIGNED_IN, SIGNED_OUT,
    // TOKEN_REFRESHED, USER_UPDATED, atbp. Ito ang siguradong
    // magpapanatili ng tamang state kahit saan pa mangyari ang
    // pagbabago (ibang tab, token expiry sa background, atbp.).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      // Kapag na-sign out (o na-detect na expired/invalid na ang
      // session), i-clear ang cached profile data mula sa dating
      // cacheProfile() call sa APIservices.js — para hindi
      // makikita ng UI ang lumang shop_name/role ng dating naka-login
      // na account habang naka-display na ang Login page.
      if (!newSession) {
        localStorage.removeItem('user_email');
        localStorage.removeItem('shop_id');
        localStorage.removeItem('shop_name');
        localStorage.removeItem('shop_address');
        localStorage.removeItem('role');
        localStorage.removeItem('full_name');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook na gagamitin ng ibang components (partikular na si App.jsx's
 * ProtectedRoute) para malaman kung naka-login ang user. Nagtatapon ng
 * error kung ginamit sa labas ng <AuthProvider> — sinasadya ito para
 * agad mahuli kung may nakalimutang i-wrap na component.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}

export default AuthContext;