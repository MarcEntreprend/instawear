import React from "react";
import { X, User } from "lucide-react";

interface ProfileModalProps {
  isAdmin: boolean;
  userName?: string;
  onClose: () => void;
  onLogout: () => void;
}

export default function ProfileModal({
  isAdmin,
  userName,
  onClose,
  onLogout,
}: ProfileModalProps) {
  const displayName = isAdmin ? "Admin" : userName || "Utilisateur";
  const role = isAdmin ? "administrateur" : "utilisateur";

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
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-xl"
            style={{ background: "var(--color-accent)" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 mt-1">
              Connecté en tant que {role}
            </p>
          </div>
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
