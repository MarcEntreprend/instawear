/**
 * AuthModal.tsx - Supabase Auth authentication (replaces the old localStorage system)
 * Modes: login, signup, resetPassword (3-step password reset flow)
 * Visual style ported from InstaWear-design-from-zero (premium var(--color-*) system)
 * Logic / rules / handlers kept 100% intact from instawear_gem version
 */
import React, { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  X,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Calendar,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (isAdmin: boolean, name?: string) => void;
  onSignUpSuccess: (name: string) => void;
  onOpenLegal?: (slug: string) => void;
}

type Mode = "login" | "signup" | "resetPassword" | "otp" | "verifyOtp";
type ResetStep = "email" | "sent" | "newPassword";

const RESEND_COOLDOWN_SEC = 30;

export default function AuthModal({
  onClose,
  onLoginSuccess,
  onSignUpSuccess,
  onOpenLegal,
  initialMode = "login",
}: AuthModalProps & { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // Visual-only: show/hide password (style from design-from-zero, no logic change)
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password reset state
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  // Message conservé à travers un changement de mode (le reset de mode vide `info`)
  const pendingInfo = useRef("");

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
    setInfo(pendingInfo.current);
    pendingInfo.current = "";
    setEmail("");
    setPassword("");
    setName("");
    setNewsletter(true);
    setAcceptsTerms(false);
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
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        if (!acceptsTerms) {
          setError("Please accept the Terms and Conditions to create an account.");
          setLoading(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // Email confirmation ON → no session yet: don't fake a login.
        if (data.user && !data.session) {
          pendingInfo.current =
            "Account created! Check your email to confirm, then sign in.";
          setMode("login");
          return;
        }

        if (data.user) {
          const { error: insertError } = await supabase
            .from("customers")
            .upsert(
              {
                id: data.user.id,
                email,
                name,
                date_of_birth: dob || null,
                email_preferences: { order_confirmation: true, shipping_update: true, promotions: newsletter },
                terms_accepted_at: new Date().toISOString(),
                registration_date: new Date().toISOString(),
                last_login_date: new Date().toISOString(),
              } as any,
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

        // Read the real display name from customers (the form field is cleared on mode change)
        let displayName =
          (data.user.user_metadata as any)?.full_name || email;
        try {
          const { data: customer } = await supabase
            .from("customers")
            .select("name")
            .eq("id", data.user.id)
            .maybeSingle();
          if (customer?.name) displayName = customer.name;
        } catch {
          // keep fallback
        }

        // Update last_login_date in customers (silent update, no upsert)
        supabase
          .from("customers")
          .update({ last_login_date: new Date().toISOString() })
          .eq("id", data.user.id)
          .then(({ error }) => {
            if (error) console.warn("Error updating last_login_date:", error);
          });

        onLoginSuccess(isAdmin, displayName);
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

  const handleSendOtp = async () => {
    if (!otpEmail.trim()) { setError("Enter your email address."); return; }
    setLoading(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: otpEmail.trim() });
      if (error) throw error;
      setMode("verifyOtp");
    } catch (err: any) {
      setError(
        err.message ||
          "Could not send the code. Check the email address and try again.",
      );
    }
    finally { setLoading(false); }
  };
  const handleVerifyOtp = async () => {
    if (otpCode.trim().length < 6) { setError("Enter the 6-digit code sent to your email."); return; }
    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: otpEmail.trim(), token: otpCode.trim(), type: "email" });
      if (error) throw error;
      if (data.user) {
        const { data: isAdminUser } = await supabase.rpc("is_admin");
        onLoginSuccess(!!isAdminUser, data.user.email || otpEmail);
        onClose();
      } else {
        setError("Invalid or expired code. Request a new code and try again.");
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Invalid or expired code. Request a new code and try again.",
      );
    }
    finally { setLoading(false); }
  };

  // Header helpers (visual only, no logic change)
  const handleHeaderBack = () => {
    setError("");
    if (mode === "resetPassword") {
      if (resetStep === "sent" || resetStep === "newPassword") setResetStep("email");
      else setMode("login");
    } else if (mode === "otp") {
      setMode("login");
    } else if (mode === "verifyOtp") {
      setMode("otp");
    } else {
      setMode("login");
    }
  };

  const headerTitle =
    mode === "login" ? "Sign in" :
    mode === "signup" ? "Create account" :
    mode === "otp" ? "Sign in with code" :
    mode === "verifyOtp" ? "Enter code" :
    resetStep === "email" ? "Forgot password" :
    resetStep === "sent" ? "Check your email" :
    "New password";

  // Login/signup form — styled with IconField (design-from-zero)
  const renderAuthForm = () => (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-up">
      {mode === "signup" && (
        <>
          <IconField
            icon={UserIcon}
            type="text"
            placeholder="Full name"
            value={name}
            onChange={setName}
            required
            autoFocus
          />
          <IconField
            icon={Mail}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={setEmail}
            required
          />
          <IconField
            icon={Lock}
            type={showSignupPassword ? "text" : "password"}
            placeholder="Password (6 characters min.)"
            value={password}
            onChange={setPassword}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowSignupPassword((v) => !v)}
                aria-label={showSignupPassword ? "Hide password" : "Show password"}
                className="shrink-0"
                style={{ color: "var(--color-ink3)" }}
              >
                {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <IconField
            icon={Calendar}
            type="date"
            placeholder="Date of birth (optional)"
            value={dob}
            onChange={setDob}
          />
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-(--color-accent)"
            />
            <span className="text-xs" style={{ color: "var(--color-ink2)" }}>
              Send me news and exclusive InstaWear offers by email.
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptsTerms}
              onChange={(e) => setAcceptsTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-(--color-accent)"
            />
            <span className="text-xs" style={{ color: "var(--color-ink2)" }}>
              I accept the{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenLegal?.("cgv");
                }}
                className="underline font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                Terms and Conditions
              </button>
              .
            </span>
          </label>
        </>
      )}
      {mode === "login" && (
        <>
          <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
            Welcome back. Sign in to track your orders.
          </p>
          <IconField
            icon={Mail}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={setEmail}
            required
            autoFocus
          />
          <IconField
            icon={Lock}
            type={showLoginPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={setPassword}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowLoginPassword((v) => !v)}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
                className="shrink-0"
                style={{ color: "var(--color-ink3)" }}
              >
                {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <button
            type="button"
            onClick={() => {
              setMode("resetPassword");
              setResetEmail(email);
            }}
            className="text-xs font-semibold text-left w-fit"
            style={{ color: "var(--color-accent)" }}
          >
            Forgot password?
          </button>
        </>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn btn-accent w-full disabled:opacity-50"
      >
        {loading ? "Loading..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );

  // Reset password flow (3 steps) — styled like design-from-zero
  const renderResetPassword = () => {
    switch (resetStep) {
      case "email":
        return (
          <div className="flex flex-col gap-4 animate-fade-up">
            <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
              Enter your email to receive a password reset link.
            </p>
            <IconField
              icon={Mail}
              type="email"
              placeholder="you@email.com"
              value={resetEmail}
              onChange={setResetEmail}
              required
              autoFocus
            />
            <button
              onClick={handleSendResetEmail}
              disabled={loading}
              className="btn btn-accent w-full disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </div>
        );

      case "sent":
        return (
          <div className="flex flex-col gap-4 animate-fade-up">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}
              >
                <Mail size={20} />
              </span>
              <p className="text-sm" style={{ color: "var(--color-ink2)" }}>
                A password reset link was sent to <strong style={{ color: "var(--color-ink)" }}>{resetEmail}</strong>.
                Click the link in the email to choose a new password.
              </p>
              {timer > 0 && (
                <p className="text-xs" style={{ color: "var(--color-ink4)" }}>
                  Resend link in {timer}s
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setError("");
                handleSendResetEmail();
              }}
              disabled={!canResend || loading}
              className="w-full rounded-xl h-12 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-ink2)" }}
            >
              Resend link
            </button>
            <button
              onClick={() => setMode("login")}
              className="w-full text-center text-xs font-semibold"
              style={{ color: "var(--color-ink3)" }}
            >
              Back to sign in
            </button>
          </div>
        );

      case "newPassword":
        return (
          <div className="flex flex-col gap-4 animate-fade-up">
            <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
              Choose a new password for {resetEmail || "your account"}.
            </p>
            <IconField
              icon={Lock}
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={setNewPassword}
              required
              autoFocus
              trailing={
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  className="shrink-0"
                  style={{ color: "var(--color-ink3)" }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <IconField
              icon={Lock}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="shrink-0"
                  style={{ color: "var(--color-ink3)" }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="btn btn-accent w-full disabled:opacity-50"
            >
              {loading ? "Updating..." : "Reset password"}
            </button>
          </div>
        );
    }
  };

  // Main render — premium shell from design-from-zero
  return (
    <div className="fixed inset-0 z-60">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: "rgba(15,13,10,.6)" }}
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:max-w-md w-full max-h-[92vh] overflow-y-auto rounded-t-4xl sm:rounded-4xl animate-fade-up"
        style={{ background: "var(--color-bg)", boxShadow: "var(--shadow-xl)" }}
      >
        <div
          className="flex items-center justify-between px-6 h-16 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          {mode !== "login" && mode !== "signup" ? (
            <button
              onClick={handleHeaderBack}
              aria-label="Back"
              className="btn-icon w-9 h-9"
            >
              <ArrowLeft size={17} />
            </button>
          ) : (
            <span className="w-9 h-9" />
          )}
          <span className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
            {headerTitle}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn-icon w-9 h-9"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-6">
          {error && <ErrorText message={error} />}
          {info && !error && <InfoText message={info} />}

          {mode === "resetPassword" ? (
            renderResetPassword()
          ) : mode === "otp" ? (
            <div className="flex flex-col gap-4 animate-fade-up">
              <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
                Enter your email to receive a one-time code.
              </p>
              <IconField
                icon={Mail}
                type="email"
                placeholder="you@email.com"
                value={otpEmail}
                onChange={setOtpEmail}
                required
                autoFocus
              />
              <button onClick={handleSendOtp} disabled={loading} className="btn btn-accent w-full disabled:opacity-50">
                {loading ? "Sending..." : "Send code"}
              </button>
              <button onClick={() => setMode("login")} className="text-xs font-semibold text-center" style={{ color: "var(--color-ink3)" }}>
                Back to password
              </button>
            </div>
          ) : mode === "verifyOtp" ? (
            <div className="flex flex-col gap-4 animate-fade-up">
              <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
                Code sent to <strong style={{ color: "var(--color-ink)" }}>{otpEmail}</strong>
              </p>
              <div
                className="flex items-center gap-2.5 rounded-xl px-3.5 h-12"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <ShieldCheck size={16} style={{ color: "var(--color-ink3)" }} />
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="flex-1 bg-transparent outline-none text-sm tracking-[0.3em] text-center font-mono-num"
                  style={{ color: "var(--color-ink)" }}
                />
              </div>
              <button onClick={handleVerifyOtp} disabled={loading} className="btn btn-accent w-full disabled:opacity-50">
                {loading ? "Verifying..." : "Verify"}
              </button>
              <button onClick={() => setMode("otp")} className="text-xs font-semibold text-center" style={{ color: "var(--color-ink3)" }}>
                Back
              </button>
            </div>
          ) : (
            renderAuthForm()
          )}

          {/* Bottom links (login/signup only) — single OTP entry */}
          {mode !== "resetPassword" && mode !== "otp" && mode !== "verifyOtp" && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex justify-between items-center gap-2 text-sm">
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="font-semibold hover:underline"
                  style={{ color: "var(--color-accent)" }}
                >
                  {mode === "login"
                    ? "Create an account"
                    : "Already have an account? Sign in"}
                </button>
                {mode === "login" && (
                  <button
                    onClick={() => {
                      setOtpEmail(email);
                      setMode("otp");
                    }}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "var(--color-ink3)" }}
                  >
                    Sign in with code
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Visual primitives — exact copy from design-from-zero ────────────────
interface IconFieldProps {
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  trailing?: ReactNode;
}

function IconField({
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  autoFocus,
  trailing,
}: IconFieldProps) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3.5 h-12"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <Icon size={16} style={{ color: "var(--color-ink3)" }} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent outline-none text-sm min-w-0"
        style={{ color: "var(--color-ink)" }}
      />
      {trailing}
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-xl text-xs font-semibold mb-2"
      style={{
        background: "var(--notif-negative-bg, #fef2f2)",
        color: "var(--notif-negative, #dc2626)",
        border: "1px solid var(--notif-negative, #fecaca)",
      }}
    >
      <span className="shrink-0 mt-0.5">!</span>
      <span>{message}</span>
    </div>
  );
}

function InfoText({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-xl text-xs font-semibold mb-2"
      style={{
        background: "var(--color-success-bg, #edfaf3)",
        color: "var(--color-success, #1f7a4c)",
        border: "1px solid var(--color-success, #1f7a4c)",
      }}
    >
      <span className="shrink-0 mt-0.5">✓</span>
      <span>{message}</span>
    </div>
  );
}
