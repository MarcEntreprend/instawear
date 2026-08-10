/**
 * AuthModal.tsx - Supabase Auth authentication (replaces the old localStorage system)
 * Modes: login, signup, resetPassword (3-step password reset flow)
 */
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { X, ArrowLeft, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (isAdmin: boolean, name?: string) => void;
  onSignUpSuccess: (name: string) => void;
}

type Mode = "login" | "signup" | "resetPassword";
type ResetStep = "email" | "sent" | "newPassword";

const RESEND_COOLDOWN_SEC = 30;

export default function AuthModal({
  onClose,
  onLoginSuccess,
  onSignUpSuccess,
  initialMode = "login",
}: AuthModalProps & { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password reset state
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer (pour le renvoi de l'email de reset)
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    setCanResend(false);
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // Écoute l'événement de récupération de mot de passe (lien envoyé par email)
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

    // Si on arrive depuis un lien de reset (?resetPassword=true), une session
    // de récupération peut déjà être établie → aller directement à l'étape finale.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset all fields when switching modes
  useEffect(() => {
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    setResetStep("email");
    setResetEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setTimer(0);
    setCanResend(false);
  }, [mode]);

  const startTimer = useCallback(() => {
    setTimer(RESEND_COOLDOWN_SEC);
    setCanResend(false);
  }, []);

  // Step 1: envoyer l'email de réinitialisation via Supabase Auth
  const handleSendResetEmail = async () => {
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
        err.message || "Unable to send the reset email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: définir le nouveau mot de passe (session de récupération Supabase)
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

      // Succès : retour au login avec un message
      setError("");
      setMode("login");
      setResetStep("email");
      alert("Password updated successfully! Sign in with your new password.");

      // Notification (uniquement si utilisateur connecté)
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser) {
        import("../api/supabaseApi").then(({ notificationApi }) => {
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
        });
      }
    } catch (err: any) {
      setError(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  // Main handler (login / signup)
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
          if (insertError)
            console.warn("Customer creation error:", insertError);
          else {
            // Create a "New customer" notification (uniquement si utilisateur connecté)
            const {
              data: { user: currentUser },
            } = await supabase.auth.getUser();
            if (currentUser) {
              import("../api/supabaseApi").then(({ notificationApi }) => {
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
                  .catch((e) =>
                    console.warn(
                      "Failed to create new customer notification",
                      e,
                    ),
                  );
              });
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

        // Update last_login_date in customers (silent update, no upsert)
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

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 outline-none transition-colors focus:border-(--color-accent) placeholder:text-gray-400";
  const labelClass =
    "block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5";

  // Login/signup form
  const renderAuthForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      )}
      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="pill-btn pill-btn-accent w-full justify-center disabled:opacity-50"
      >
        {loading ? "Loading..." : mode === "login" ? "Sign in" : "Sign up"}
      </button>
    </form>
  );

  // Reset password flow (3 steps)
  const renderResetPassword = () => {
    switch (resetStep) {
      case "email":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => setMode("login")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
              <h2 className="font-serif text-xl text-gray-900">
                Forgot password
              </h2>
            </div>
            <p className="text-sm text-gray-500">
              Enter your email to receive a password reset link.
            </p>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className={inputClass}
                placeholder="you@email.com"
                required
              />
            </div>
            <button
              onClick={handleSendResetEmail}
              disabled={loading}
              className="pill-btn pill-btn-accent w-full justify-center disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </div>
        );

      case "sent":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => setResetStep("email")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
              <h2 className="font-serif text-xl text-gray-900">
                Check your email
              </h2>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-(--color-accent-bg)">
              <CheckCircle2
                size={18}
                strokeWidth={2}
                className="text-(--color-accent) shrink-0 mt-0.5"
              />
              <p className="text-sm text-gray-600 leading-relaxed">
                A password reset link was sent to{" "}
                <strong className="text-gray-900">{resetEmail}</strong>. Click
                the link in the email to choose a new password.
              </p>
            </div>
            {timer > 0 && (
              <p className="text-xs text-gray-400 text-center">
                Resend link in {timer}s
              </p>
            )}
            <button
              onClick={() => {
                setError("");
                handleSendResetEmail();
              }}
              disabled={!canResend || loading}
              className="pill-btn pill-btn-outline w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Resend link
            </button>
            <button
              onClick={() => setMode("login")}
              className="w-full text-center text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        );

      case "newPassword":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => setResetStep("email")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
              <h2 className="font-serif text-xl text-gray-900">New password</h2>
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Re-enter your password"
                required
              />
            </div>
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="pill-btn pill-btn-accent w-full justify-center disabled:opacity-50"
            >
              {loading ? "Updating..." : "Reset password"}
            </button>
          </div>
        );
    }
  };

  // Main render
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-7 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={17} strokeWidth={2} />
        </button>

        {/* Title (hidden in reset mode) */}
        {mode !== "resetPassword" && (
          <h2 className="font-serif text-2xl text-gray-900 mb-6">
            {mode === "login" ? "Sign in" : "Sign up"}
          </h2>
        )}

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-100 rounded-2xl p-3.5">
            {error}
          </p>
        )}

        {/* Content per mode */}
        {mode === "resetPassword" ? renderResetPassword() : renderAuthForm()}

        {/* Bottom links (login/signup only) */}
        {mode !== "resetPassword" && (
          <div className="mt-5 flex justify-between text-sm">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
              }}
              className="text-(--color-accent) font-semibold hover:underline"
            >
              {mode === "login"
                ? "Create an account"
                : "Already have an account? Sign in"}
            </button>
            {mode === "login" && (
              <button
                onClick={() => {
                  setMode("resetPassword");
                  setResetEmail(email); // Pre-fill with email from login form
                }}
                className="text-gray-400 hover:text-(--color-accent) transition-colors"
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
