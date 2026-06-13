import React, { useState } from "react";
import { X, Mail, Lock, User, ArrowRight } from "lucide-react";

interface StoredUser {
  email: string;
  password: string;
  name: string;
}

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (isAdmin: boolean, userName?: string) => void;
  onSignUpSuccess: (userName: string) => void;
  users: Record<string, StoredUser>;
  onSaveUser: (email: string, user: StoredUser) => void;
}

export default function AuthModal({
  onClose,
  onLoginSuccess,
  onSignUpSuccess,
  users,
  onSaveUser,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === "Admin" && loginPassword === "789456") {
      onLoginSuccess(true);
      return;
    }
    const stored = users[loginEmail.toLowerCase()];
    if (stored && stored.password === loginPassword) {
      onLoginSuccess(false, stored.name || loginEmail);
    } else {
      alert("Identifiants incorrects.");
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    const email = signupEmail.trim();
    if (!email || !signupPassword || signupPassword !== signupConfirm) {
      alert(
        "Veuillez remplir tous les champs et vérifier la correspondance des mots de passe.",
      );
      return;
    }
    if (email.toLowerCase() === "admin") {
      alert("Ce nom d'utilisateur est réservé.");
      return;
    }
    if (users[email.toLowerCase()]) {
      alert("Un compte existe déjà avec cet email.");
      return;
    }
    const newUser: StoredUser = {
      email,
      password: signupPassword,
      name: email.split("@")[0],
    };
    onSaveUser(email.toLowerCase(), newUser);
    onSignUpSuccess(newUser.name);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-fade-up"
        style={{ border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-500"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-black text-gray-900 mb-4">
          {mode === "login" ? "Connexion" : "Inscription"}
        </h2>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Email
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                <Mail size={14} className="text-gray-400" />
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Mot de passe
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                <Lock size={14} className="text-gray-400" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "var(--color-accent)" }}
            >
              Se connecter <ArrowRight size={15} />
            </button>
            <p className="text-xs text-center text-gray-500">
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="font-semibold underline"
                style={{ color: "var(--color-accent)" }}
                onClick={() => setMode("signup")}
              >
                S'inscrire
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Email
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                <Mail size={14} className="text-gray-400" />
                <input
                  type="text"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Mot de passe
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                <Lock size={14} className="text-gray-400" />
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Confirmer
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                <Lock size={14} className="text-gray-400" />
                <input
                  type="password"
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "var(--color-accent)" }}
            >
              Créer un compte <User size={15} />
            </button>
            <p className="text-xs text-center text-gray-500">
              Déjà un compte ?{" "}
              <button
                type="button"
                className="font-semibold underline"
                style={{ color: "var(--color-accent)" }}
                onClick={() => setMode("login")}
              >
                Se connecter
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
