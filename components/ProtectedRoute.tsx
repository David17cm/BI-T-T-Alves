import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export const ProtectedRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      // Aqui a blindagem acontece de verdade: pedimos a sessão do servidor (Supabase),
      // e não apenas a chave "supabase.auth.token" do localStorage.
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (mounted) {
        if (error || !session) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      }
    }

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setIsAuthenticated(!!session);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-[#E31E24] rounded-full animate-spin" />
      </div>
    );
  }

  // Se não validou com o token oficial do Supabase, expulsa para o Login.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
