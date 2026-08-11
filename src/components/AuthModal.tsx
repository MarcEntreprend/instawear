// src/components/AuthModal.tsx
// Fusion : style visuel (ui/Button, TextInput) + logique Supabase intégrée

import React, { useState, useEffect, useCallback } from "react";
import { X, ArrowLeft, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/Button";
import { supabase } from "../lib/supabaseClient";

type Mode = "login" | "signup" | "resetPassword";
type ResetStep = "email" | "sent" | "newPassword";

const RESEND_COOLDOWN_SEC = 30;

interface AuthModalProps {
  initialMode?: Mode;
  onClose: () => void;
  onLoginSuccess: (isAdmin: boolean, name?: string) => void;
  onSignUpSuccess: (name: string) => void;
}

function TextInput({
  label,
  icon: Icon,
  error,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[11px] font-black uppercase tracking-wider"
        style={{ color: "var(--color-ink3)" }}
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-ink4)" }}
          >
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
        <input
          {...rest}
          className={`w-full ${Icon ? "pl-11" : "pl-4"} pr-4 py-3.5 rounded-2xl text-sm outline-none transition-colors`}
          style={{
            background: "var(--color-surface2)",
            color: "var(--color-ink)",
            border: `1.5px solid ${error ? "var(--color-negative)" : "var(--color-border2)"}`,
          }}
        />
      </div>
      {error && (
        <p
          className="text-[11px] font-bold"
          style={{ color: "var(--color-negative)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function AuthModal({
  initialMode = "login",
  onClose,
  onLoginSuccess,
  onSignUpSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // ── Compte à rebours pour le renvoi du mail ──
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    setCanResend(false);
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // ── Détection du lien de réinitialisation (PASSWORD_RECOVERY) ──
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setMode("resetPassword");
          setResetStep("newPassword");
          if (session?.user?.email) setResetEmail(session.user.email);
        }
      },
    );

    const params = new URLSearchParams(window.location.search);
    if (params.get("resetPassword") === "true") {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          setMode("resetPassword");
          setResetStep("newPassword");
          setResetEmail(data.session.user.email || resetEmail);
        }
      });
    }

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // ── Reset des champs lors du changement de mode ──
  useEffect(() => {
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    if (mode !== "resetPassword") {
      setResetStep("email");
      setResetEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setTimer(0);
      setCanResend(false);
    }
  }, [mode]);

  const startTimer = useCallback(() => {
    setTimer(RESEND_COOLDOWN_SEC);
    setCanResend(false);
  }, []);

  // ── Envoi de l'email de réinitialisation ──
  const handleSendReset = async () => {
    setError("");
    if (!resetEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        { redirectTo: `${window.location.origin}/?resetPassword=true` },
      );
      if (sendError) throw sendError;
      startTimer();
      setResetStep("sent");
    } catch (err: any) {
      setError(
        err?.message || "Unable to send the reset email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Réinitialisation du mot de passe (étape newPassword) ──
  const handleResetPassword = async () => {
    setError("");
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      // Succès : retour au login
      setMode("login");
      setResetStep("email");
      // Notification facultative (uniquement si user connecté)
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser) {
        import("../api/supabaseApi")
          .then(({ notificationApi }) => {
            notificationApi
              .create({
                title: "Password reset",
                description: `${resetEmail} reset their password`,
                category: "customers",
                priority: "medium",
                metadata: {
                  customerName: resetEmail,
                  linkTo: "/admin/customers",
                  source: "Client",
                },
                action_label: "View customer",
              })
              .catch(() => {});
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Soumission du formulaire (login / signup) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
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
          if (insertError)
            console.warn("Customer creation error:", insertError);
          else {
            // Notification "New customer"
            const {
              data: { user: currentUser },
            } = await supabase.auth.getUser();
            if (currentUser) {
              import("../api/supabaseApi")
                .then(({ notificationApi }) => {
                  notificationApi
                    .create({
                      title: "New customer registered",
                      description: `${name || email} signed up on the store`,
                      category: "customers",
                      priority: "low",
                      metadata: {
                        customerId: data.user?.id ?? undefined,
                        customerName: name || email,
                        linkTo: "/admin/customers",
                        source: "Client",
                      },
                      action_label: "View profile",
                    })
                    .catch(() => {});
                })
                .catch(() => {});
            }
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
        if (!data.user) throw new Error("No user found");

        const { data: isAdminUser } = await supabase.rpc("is_admin");
        const isAdmin = !!isAdminUser;

        // Mise à jour de last_login_date
        supabase
          .from("customers")
          .update({ last_login_date: new Date().toISOString() })
          .eq("id", data.user.id)
          .then(({ error }) => {
            if (error) console.warn("Error updating last_login_date:", error);
          });

        onLoginSuccess(isAdmin, name || email);
      }
    } catch (err: any) {
      let message =
        err?.message ||
        err?.error_description ||
        err?.msg ||
        (typeof err === "string" ? err : null) ||
        "Authentication error";
      if (!message || message === "{}") {
        message = "Sign-in error. Please check your credentials.";
      }
      setError(message);
      console.error("Auth error details:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Rendu du formulaire de login/signup ──
  const renderAuthForm = () => (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === "signup" && (
        <TextInput
          label="Name"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      )}
      <TextInput
        label="Email"
        icon={Mail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <TextInput
        label="Password"
        icon={Lock}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button
        type="submit"
        variant="cta"
        size="lg"
        loading={loading}
        className="w-full mt-1"
      >
        {mode === "login" ? "Sign In" : "Create Account"}
      </Button>
    </form>
  );

  // ── Rendu de la récupération de mot de passe (3 étapes) ──
  const renderResetPassword = () => {
    switch (resetStep) {
      case "email":
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => setMode("login")}
                style={{ color: "var(--color-ink4)" }}
              >
                <ArrowLeft size={18} />
              </button>
              <h2
                className="font-display font-black text-lg"
                style={{ color: "var(--color-ink)" }}
              >
                Forgot Password
              </h2>
            </div>
            <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
              Enter your email to receive a password reset link.
            </p>
            <TextInput
              label="Email"
              icon={Mail}
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
            <Button
              onClick={handleSendReset}
              variant="cta"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Send Reset Link
            </Button>
          </div>
        );
      case "sent":
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => setResetStep("email")}
                style={{ color: "var(--color-ink4)" }}
              >
                <ArrowLeft size={18} />
              </button>
              <h2
                className="font-display font-black text-lg"
                style={{ color: "var(--color-ink)" }}
              >
                Check Your Email
              </h2>
            </div>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "var(--color-success-bg)" }}
              >
                <CheckCircle2
                  size={26}
                  style={{ color: "var(--color-success)" }}
                />
              </div>
              <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
                A password reset link was sent to{" "}
                <strong style={{ color: "var(--color-ink)" }}>
                  {resetEmail}
                </strong>
                .
              </p>
            </div>
            {timer > 0 && (
              <p
                className="text-xs text-center"
                style={{ color: "var(--color-ink4)" }}
              >
                Resend link in {timer}s
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setError("");
                handleSendReset();
              }}
              disabled={!canResend || loading}
              className="w-full"
            >
              Resend Link
            </Button>
            <button
              onClick={() => setMode("login")}
              className="text-center text-xs font-bold"
              style={{ color: "var(--color-ink4)" }}
            >
              Back to sign in
            </button>
          </div>
        );
      case "newPassword":
        return (
          <div className="flex flex-col gap-4">
            <h2
              className="font-display font-black text-lg mb-1"
              style={{ color: "var(--color-ink)" }}
            >
              New Password
            </h2>
            <TextInput
              label="New Password"
              icon={Lock}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <TextInput
              label="Confirm Password"
              icon={Lock}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button
              onClick={handleResetPassword}
              variant="cta"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Reset Password
            </Button>
          </div>
        );
    }
  };

  // ── Render principal ──
  return (
    <div
      className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{
        background: "rgba(11,11,10,.55)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full sm:max-w-md rounded-t-4xl sm:rounded-4xl p-7 sm:p-8 animate-fade-up"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ color: "var(--color-ink3)" }}
        >
          <X size={18} />
        </button>

        {mode !== "resetPassword" && (
          <div className="mb-6">
            <span
              className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-3"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent), var(--color-indigo))",
              }}
            >
              InstaWear
            </span>
            <h2
              className="font-display font-black text-2xl"
              style={{ color: "var(--color-ink)" }}
            >
              {mode === "login" ? "Welcome Back" : "Create Your Account"}
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-ink3)" }}>
              {mode === "login"
                ? "Sign in to track orders and save favorites."
                : "Join to unlock faster checkout and order tracking."}
            </p>
          </div>
        )}

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{
              background: "var(--color-negative-bg)",
              color: "var(--color-negative)",
            }}
          >
            {error}
          </div>
        )}

        {mode === "resetPassword" ? renderResetPassword() : renderAuthForm()}

        {mode !== "resetPassword" && (
          <div className="mt-5 flex items-center justify-between text-sm">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-bold"
              style={{ color: "var(--color-accent)" }}
            >
              {mode === "login"
                ? "Create an account"
                : "Already have an account?"}
            </button>
            {mode === "login" && (
              <button
                onClick={() => {
                  setMode("resetPassword");
                  setResetEmail(email);
                }}
                className="text-xs font-semibold"
                style={{ color: "var(--color-ink4)" }}
              >
                Forgot password?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
