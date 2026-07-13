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

type Mode = "login" | "signup" | "resetPassword";
type ResetStep = "email" | "code" | "newPassword";

const CODE_EXPIRY_SEC = 60;
const MASTER_CODE = "000000"; // Universal test code (development phase)

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

  // Password reset state
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    setCanResend(false);
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

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
    setTimer(CODE_EXPIRY_SEC);
    setCanResend(false);
  }, []);

  // Step 1: send verification code
  const handleSendCode = async () => {
    setError("");
    if (!resetEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    // Test mode: simulate sending after a short delay
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    startTimer();
    setResetStep("code");
    // In production, call supabase.auth.resetPasswordForEmail() here
  };

  // Step 2: verify the code
  const handleVerifyCode = () => {
    setError("");
    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    if (code.trim() === MASTER_CODE) {
      setResetStep("newPassword");
    } else {
      setError("Incorrect code. Please try again.");
    }
  };

  // Step 3: update password (calls the secure Edge Function)
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
        throw new Error(result.error || "Password reset failed.");
      }

      // Succès : retour au login avec un message
      setError("");
      setMode("login");
      setResetStep("email");
      alert("Password reset successfully! Sign in with your new password.");

      // Notification
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
            // Create a "New customer" notification (async, non-blocking)
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
                  console.warn("Failed to create new customer notification", e),
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
        if (!data.user) throw new Error("No user found");

        const { data: adminData } = await supabase
          .from("admin_users")
          .select("role")
          .eq("email", email)
          .single();

        const isAdmin = !!adminData;

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

  // Login/signup form
  const renderAuthForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="block text-xs font-bold mb-1">Name</label>
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
              Enter your email to receive a verification code.
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
              onClick={handleSendCode}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send a code"}
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
              <h2 className="text-lg font-bold">Verification</h2>
            </div>
            <p className="text-sm text-gray-500">
              A code was sent to <strong>{resetEmail}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold mb-1">
                Verification code
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
                Resend code in {timer}s
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleVerifyCode}
                className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition"
              >
                Verify
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
                Resend
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
        {mode === "resetPassword" ? renderResetPassword() : renderAuthForm()}

        {/* Bottom links (login/signup only) */}
        {mode !== "resetPassword" && (
          <div className="mt-3 flex justify-between text-sm">
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
        )}
      </div>
    </div>
  );
}
