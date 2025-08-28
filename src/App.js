import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; // Supabase 설정을 불러옵니다.
import DailyReportManager from "./components/DailyReportManager";
import AuthComponent from "./components/AuthComponent";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold">로딩중...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {user ? <DailyReportManager user={user} /> : <AuthComponent />}
    </div>
  );
}
