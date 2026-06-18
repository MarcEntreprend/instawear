// src\components\ProfileModal.tsx

import React, { useEffect, useState } from "react";
import { X, User, Package, Heart, ShoppingBag } from "lucide-react";
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
  const displayName = isAdmin ? "Admin" : userName || "Utilisateur";
  const role = isAdmin ? "administrateur" : "utilisateur";

  // Stats pour utilisateur standard
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [favoriteCount, setFavoriteCount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (isAdmin) return; // on ne charge pas les stats pour l'admin

    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          // Recherche locale pour éviter l'erreur 406
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
        console.warn("Erreur chargement stats profil", e);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [isAdmin]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative animate-fade-up"
        style={{ border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-500"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-xl"
            style={{ background: "var(--color-accent)" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* Identité */}
          <div>
            <p className="font-bold text-gray-900">{displayName}</p>
            {userEmail && (
              <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Connecté en tant que {role}
            </p>
          </div>

          {/* Statistiques (utilisateur standard uniquement) */}
          {!isAdmin && (
            <div
              className="w-full flex justify-center gap-6 py-3 border-y border-gray-100"
              style={{
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              {loadingStats ? (
                <p className="text-xs text-gray-400">Chargement…</p>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <Package size={18} style={{ color: "var(--color-ink4)" }} />
                    <span className="text-sm font-bold text-gray-900">
                      {orderCount}
                    </span>
                    <span className="text-[10px] text-gray-500">Commandes</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Heart size={18} style={{ color: "#EF4444" }} />
                    <span className="text-sm font-bold text-gray-900">
                      {favoriteCount}
                    </span>
                    <span className="text-[10px] text-gray-500">Favoris</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Déconnexion */}
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
            style={{
              background: "transparent",
              color: "var(--color-accent)",
              border: "1.5px solid var(--color-accent)",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-accent)";
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
