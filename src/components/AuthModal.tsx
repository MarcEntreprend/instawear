/**
 * AuthModal.tsx - Authentification via Supabase Auth (remplace l'ancien système localStorage)
 * Modes : login, signup, resetPassword (3 étapes de réinitialisation)
 */
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { X, ArrowLeft, Mail, Lock, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (isAdmin: boolean, name?: string) => void;
  onSignUpSuccess: (name: string) => void;
}

type Mode = "login" | "signup" | "resetPassword";
type ResetStep = "email" | "code" | "newPassword";

const CODE_EXPIRY_SEC = 60;
const MASTER_CODE = "000000"; // Code de test universel (phase de développement)

export default function AuthModal({
  onClose,
  onLoginSuccess,
  onSignUpSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── États pour la réinitialisation de mot de passe ──
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Timer décrémental
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    setCanResend(false);
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // ── Réinitialiser les champs lors du changement de mode ──
  useEffect(() => {
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    setResetStep("email");
    setResetEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setTimer(0);
    setCanResend(false);
  }, [mode]);

  const startTimer = useCallback(() => {
    setTimer(CODE_EXPIRY_SEC);
    setCanResend(false);
  }, []);

  // ── Étape 1 : envoyer le code ──
  const handleSendCode = async () => {
    setError("");
    if (!resetEmail.trim()) {
      setError("Veuillez entrer votre adresse email.");
      return;
    }
    setLoading(true);
    // En mode test, on simule l'envoi après un court délai
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    startTimer();
    setResetStep("code");
    // En prod, on appellerait supabase.auth.resetPasswordForEmail() ici
  };

  // ── Étape 2 : vérifier le code ──
  const handleVerifyCode = () => {
    setError("");
    if (!code.trim()) {
      setError("Veuillez entrer le code de vérification.");
      return;
    }
    if (code.trim() === MASTER_CODE) {
      setResetStep("newPassword");
    } else {
      setError("Code incorrect. Veuillez réessayer.");
    }
  };

  // ── Étape 3 : mettre à jour le mot de passe (appelle l'Edge Function sécurisée) ──
  const handleResetPassword = async () => {
    setError("");
    if (!newPassword) {
      setError("Veuillez entrer un nouveau mot de passe.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: resetEmail,
            code: code.trim(),
            newPassword,
          }),
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la réinitialisation.");
      }

      // Succès : retour au login avec un message
      setError("");
      setMode("login");
      setResetStep("email");
      // Message de succès temporaire (sera affiché via un state "success" plus tard)
      alert(
        "Mot de passe réinitialisé avec succès ! Connectez-vous avec votre nouveau mot de passe.",
      );

      // NOTIFICATION
      import("../api/supabaseApi").then(({ notificationApi }) => {
        notificationApi
          .create({
            title: "Mot de passe réinitialisé",
            description: `${resetEmail} a réinitialisé son mot de passe`,
            category: "customers",
            priority: "medium",
            metadata: {
              customerName: resetEmail,
              linkTo: "/admin/customers",
              source: "Client",
            },
            action_label: "Voir le client",
          })
          .catch(() => {});
      });
    } catch (err: any) {
      setError(err.message || "Erreur lors de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  // ── Handler principal (login / signup) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: insertError } = await supabase
            .from("customers")
            .upsert(
              {
                id: data.user.id,
                email,
                name,
                registration_date: new Date().toISOString(),
                last_login_date: new Date().toISOString(),
              },
              { onConflict: "id" },
            );
          if (insertError) console.warn("Erreur création client:", insertError);
          else {
            // Créer une notification "Nouveau client" (asynchrone, ne bloque pas l'inscription)
            import("../api/supabaseApi").then(({ notificationApi }) => {
              notificationApi
                .create({
                  title: "Nouveau client inscrit",
                  description: `${name || email} s'est inscrit sur la boutique`,
                  category: "customers",
                  priority: "low",
                  metadata: {
                    customerName: name || email,
                    linkTo: "/admin/customers",
                    source: "Client",
                  },
                  action_label: "Voir le profil",
                })
                .catch((e) =>
                  console.warn("Échec création notification nouveau client", e),
                );
            });
          }
        }

        onSignUpSuccess(name || email);
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw signInError;
        if (!data.user) throw new Error("Aucun utilisateur trouvé");

        const { data: adminData } = await supabase
          .from("admin_users")
          .select("role")
          .eq("email", email)
          .single();

        const isAdmin = !!adminData;

        // Mettre à jour last_login_date dans customers (update silencieux, sans upsert)
        supabase
          .from("customers")
          .update({ last_login_date: new Date().toISOString() })
          .eq("id", data.user.id)
          .then(({ error }) => {
            if (error)
              console.warn("Erreur mise à jour last_login_date:", error);
          });

        onLoginSuccess(isAdmin, name || email);
      }
    } catch (err: any) {
      let message =
        err?.message ||
        err?.error_description ||
        err?.msg ||
        (typeof err === "string" ? err : null) ||
        "Erreur d'authentification";
      // L'API renvoie parfois "{}" comme message, on le remplace
      if (!message || message === "{}") {
        message = "Erreur de connexion. Vérifiez vos identifiants.";
      }
      setError(message);
      console.error("Auth error details:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Rendu du formulaire de login/signup ──
  const renderAuthForm = () => (
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
  );

  // ── Rendu du flow de reset (3 étapes) ──
  const renderResetPassword = () => {
    switch (resetStep) {
      case "email":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setMode("login")}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold">Mot de passe oublié</h2>
            </div>
            <p className="text-sm text-gray-500">
              Entrez votre adresse email pour recevoir un code de vérification.
            </p>
            <div>
              <label className="block text-xs font-bold mb-1">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                placeholder="votre@email.com"
                required
              />
            </div>
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Envoyer un code"}
            </button>
          </div>
        );

      case "code":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setResetStep("email")}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold">Vérification</h2>
            </div>
            <p className="text-sm text-gray-500">
              Un code a été envoyé à <strong>{resetEmail}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold mb-1">
                Code de vérification
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm text-center tracking-widest"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
            {timer > 0 && (
              <p className="text-xs text-gray-400 text-center">
                Renvoyer le code dans {timer}s
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleVerifyCode}
                className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition"
              >
                Vérifier
              </button>
              <button
                onClick={() => {
                  setError("");
                  setCode("");
                  handleSendCode();
                }}
                disabled={!canResend}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Renvoyer
              </button>
            </div>
          </div>
        );

      case "newPassword":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setResetStep("code")}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold">Nouveau mot de passe</h2>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
            </button>
          </div>
        );
    }
  };

  // ── Rendu principal ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {/* Titre (non affiché en mode reset) */}
        {mode !== "resetPassword" && (
          <h2 className="text-xl font-bold mb-4">
            {mode === "login" ? "Connexion" : "Inscription"}
          </h2>
        )}

        {/* Message d'erreur */}
        {error && (
          <p className="text-red-500 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}

        {/* Contenu selon le mode */}
        {mode === "resetPassword" ? renderResetPassword() : renderAuthForm()}

        {/* Liens en bas (login/signup seulement) */}
        {mode !== "resetPassword" && (
          <div className="mt-3 flex justify-between text-sm">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
              }}
              className="text-orange-500 hover:underline"
            >
              {mode === "login"
                ? "Créer un compte"
                : "Déjà un compte ? Se connecter"}
            </button>
            {mode === "login" && (
              <button
                onClick={() => {
                  setMode("resetPassword");
                  setResetEmail(email); // Pré-remplit avec l'email du formulaire login
                }}
                className="text-gray-500 hover:text-orange-500 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
