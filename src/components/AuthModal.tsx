/**
 * AuthModal.tsx - Supabase Auth authentication (replaces the old localStorage system)
 * Modes: login, signup, resetPassword (3-step password reset flow)
 */
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { X, ArrowLeft, Mail, Lock, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (isAdmin: boolean, name?: string) => void;
  onSignUpSuccess: (name: string) => void;
}

type Mode = "login" | "signup" | "resetPassword" | "otp" | "verifyOtp";
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
  const [dob, setDob] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password reset state
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [code, setCode] = useState("");
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
    setCode("");
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
                date_of_birth: dob || null,
                email_preferences: { order_confirmation: true, shipping_update: true, promotions: newsletter },
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

  const handleSendOtp = async () => {
    if (!otpEmail.trim()) { setError("Enter your email"); return; }
    setLoading(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: otpEmail.trim() });
      if (error) throw error;
      setMode("verifyOtp");
    } catch (err: any) { setError(err.message || "Failed to send OTP"); }
    finally { setLoading(false); }
  };
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: otpEmail.trim(), token: otpCode.trim(), type: "email" });
      if (error) throw error;
      if (data.user) {
        const { data: isAdminUser } = await supabase.rpc("is_admin");
        onLoginSuccess(!!isAdminUser, data.user.email || otpEmail);
        onClose();
      }
    } catch (err: any) { setError(err.message || "Invalid code"); }
    finally { setLoading(false); }
  };

  // Login/signup form
  const renderAuthForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <>
          <div>
            <label className="block text-xs font-bold mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Date of birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <label className="flex items-center gap-2 text-xs mt-6">
              <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} /> Newsletter
            </label>
          </div>
        </>
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
        <label className="block text-xs font-bold mb-1">Password</label>
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
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setMode("login")}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold">Forgot password</h2>
            </div>
            <p className="text-sm text-gray-500">
              Enter your email to receive a password reset link.
            </p>
            <div>
              <label className="block text-xs font-bold mb-1">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                placeholder="you@email.com"
                required
              />
            </div>
            <button
              onClick={handleSendResetEmail}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </div>
        );

      case "sent":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setResetStep("email")}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold">Check your email</h2>
            </div>
            <p className="text-sm text-gray-500">
              A password reset link was sent to <strong>{resetEmail}</strong>.
              Click the link in the email to choose a new password.
            </p>
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
              className="w-full border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Resend link
            </button>
            <button
              onClick={() => setMode("login")}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
            >
              Back to sign in
            </button>
          </div>
        );

      case "newPassword":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setResetStep("email")}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold">New password</h2>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                New password
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
                Confirm password
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
              {loading ? "Updating..." : "Reset password"}
            </button>
          </div>
        );
    }
  };

  // Main render
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {/* Title (hidden in reset mode) */}
        {mode !== "resetPassword" && (
          <h2 className="text-xl font-bold mb-4">
            {mode === "login" ? "Sign in" : "Sign up"}
          </h2>
        )}

        {/* Error message */}
        {error && (
          <p className="text-red-500 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}

        {/* Content per mode */}
        {mode === "resetPassword" ? renderResetPassword() : mode === "otp" ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Sign in with OTP</h2>
            <input type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} placeholder="you@email.com" className="w-full p-2 border rounded-lg text-sm" />
            <button onClick={handleSendOtp} disabled={loading} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold">Send code</button>
            <button onClick={() => setMode("login")} className="text-xs text-gray-500 hover:underline">Back to password</button>
          </div>
        ) : mode === "verifyOtp" ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Enter code</h2>
            <p className="text-sm text-gray-500">Code sent to {otpEmail}</p>
            <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="123456" maxLength={6} className="w-full p-2 border rounded-lg text-sm tracking-widest text-center" />
            <button onClick={handleVerifyOtp} disabled={loading} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold">Verify</button>
          </div>
        ) : renderAuthForm()}

        {/* Bottom links (login/signup only) */}
        {mode !== "resetPassword" && mode !== "otp" && mode !== "verifyOtp" && (
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                }}
                className="text-orange-500 hover:underline"
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
                  className="text-gray-500 hover:text-orange-500 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            {mode === "login" && (
              <button onClick={() => { setMode("otp"); setOtpEmail(email); }} className="text-xs text-orange-500 hover:underline text-center">
                Sign in with OTP code
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
