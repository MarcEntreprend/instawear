// src/components/ProfileModal.tsx — User profile modal (frontend)

import React, { useEffect, useState } from "react";
import { X, Package, Heart, LogOut } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { customerApi } from "../api/supabaseApi";

interface ProfileModalProps {
  isAdmin: boolean;
  userName?: string;
  onClose: () => void;
  onLogout: () => void;
  allCustomers: { id: string; email: string }[];
}

export default function ProfileModal({
  isAdmin,
  userName,
  onClose,
  onLogout,
  allCustomers,
}: ProfileModalProps) {
  const displayName = isAdmin ? "Admin" : userName || "User";
  const role = isAdmin ? "administrator" : "customer";

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [favoriteCount, setFavoriteCount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (isAdmin) return;

    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          const customer = allCustomers.find((c) => c.email === user.email);
          if (customer) {
            const [orders, favs] = await Promise.all([
              customerApi.getOrders(customer.id),
              customerApi.getFavourites(customer.id),
            ]);
            setOrderCount(orders.length);
            setFavoriteCount(favs.length);
          }
        }
      } catch (e) {
        console.warn("Error loading profile stats", e);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [isAdmin, allCustomers]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: "rgba(26,20,10,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="card-premium w-full max-w-sm p-6 relative animate-fade-up"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 28,
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full transition-colors hover:bg-(--color-surface2)"
          style={{ color: "var(--color-ink4)" }}
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div className="flex flex-col items-center text-center gap-5">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center text-white font-black text-2xl transition-transform duration-200 hover:scale-105"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* Identity */}
          <div>
            <p
              className="text-lg font-bold"
              style={{ color: "var(--color-ink)" }}
            >
              {displayName}
            </p>
            {userEmail && (
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--color-ink4)" }}
              >
                {userEmail}
              </p>
            )}
            <p
              className="text-xs mt-1 font-medium"
              style={{ color: "var(--color-ink3)" }}
            >
              Signed in as {role}
            </p>
          </div>

          {/* Stats (regular user only) */}
          {!isAdmin && (
            <div
              className="w-full flex justify-center gap-8 py-4"
              style={{
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              {loadingStats ? (
                <p className="text-sm" style={{ color: "var(--color-ink4)" }}>
                  Loading…
                </p>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <Package
                      size={20}
                      strokeWidth={1.75}
                      style={{ color: "var(--color-ink4)" }}
                    />
                    <span
                      className="text-lg font-black"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {orderCount}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-ink4)" }}
                    >
                      Orders
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Heart
                      size={20}
                      strokeWidth={1.75}
                      style={{ color: "#EF4444" }}
                    />
                    <span
                      className="text-lg font-black"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {favoriteCount}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-ink4)" }}
                    >
                      Wishlist
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sign out button */}
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="pill-btn w-full justify-center gap-2 font-bold transition-all duration-200"
            style={{
              background: "var(--color-accent)",
              color: "white",
              padding: "12px 20px",
              boxShadow: "var(--shadow-accent)",
              border: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 12px 40px rgba(255,92,53,.28)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "var(--shadow-accent)";
            }}
          >
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
