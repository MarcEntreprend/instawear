/**
 * AuthModal.tsx - Authentification via Supabase Auth (remplace l'ancien système localStorage)
 */
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { X } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (isAdmin: boolean, name?: string) => void;
  onSignUpSuccess: (name: string) => void;
}

export default function AuthModal({
  onClose,
  onLoginSuccess,
  onSignUpSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // Inscription via Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // Optionnel : créer une entrée dans la table "customers"
        if (data.user) {
          const { error: insertError } = await supabase
            .from("customers")
            .insert({ email, name });
          if (insertError) console.warn("Erreur création client:", insertError);
        }

        onSignUpSuccess(name || email);
      } else {
        // Connexion via Supabase Auth
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw signInError;
        if (!data.user) throw new Error("Aucun utilisateur trouvé");

        // Vérifier si l'utilisateur est un administrateur
        const { data: adminData } = await supabase
          .from("admin_users")
          .select("role")
          .eq("email", email)
          .single();

        const isAdmin = !!adminData;
        onLoginSuccess(isAdmin, name || email);
      }
    } catch (err: any) {
      setError(err.message || "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-4">
          {mode === "login" ? "Connexion" : "Inscription"}
        </h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold mb-1">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading
              ? "Chargement..."
              : mode === "login"
                ? "Se connecter"
                : "S'inscrire"}
          </button>
        </form>
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
          }}
          className="mt-3 text-sm text-orange-500 hover:underline"
        >
          {mode === "login"
            ? "Créer un compte"
            : "Déjà un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
