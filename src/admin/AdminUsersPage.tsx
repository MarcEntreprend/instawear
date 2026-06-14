// src/admin/AdminUsersPage.tsx

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Shield,
  Save,
  UserPlus,
  Calendar,
  User,
} from "lucide-react";
import { useAdminUsers } from "./adminHooks";
import { AdminUser, AdminRole } from "./adminTypes";

// ─── Badge de rôle ──────────────────────────────────────────────────────────
const ROLE_BADGE: Record<
  AdminRole,
  { label: string; color: string; bg: string }
> = {
  super_admin: { label: "Super Admin", color: "#991b1b", bg: "#fee2e2" },
  editor: { label: "Éditeur", color: "#1e40af", bg: "#dbeafe" },
};

function RoleBadge({ role }: { role: AdminRole }) {
  const style = ROLE_BADGE[role] ?? {
    label: role,
    color: "#555",
    bg: "#f3f4f6",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: style.color,
        background: style.bg,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
}

// ─── Petit bouton d'action ──────────────────────────────────────────────────
const iconBtn: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: 6,
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "flex",
  alignItems: "center",
};

export default function AdminUsersPage() {
  const {
    users: allUsers,
    loading,
    error,
    saving,
    createUser,
    updateUser,
    deleteUser,
  } = useAdminUsers();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Formulaire
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<AdminRole>("editor");

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    if (!search.trim()) return allUsers;
    const s = search.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s),
    );
  }, [allUsers, search]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingUser(null);
    setFormEmail("");
    setFormPassword("");
    setFormRole("editor");
    setShowModal(true);
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormPassword(""); // On ne pré-remplit pas le mot de passe
    setFormRole(user.role);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Supprimer définitivement cet administrateur ?")) {
      await deleteUser(id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) return;

    if (editingUser) {
      // Mise à jour (email, rôle, et éventuellement mot de passe)
      await updateUser(editingUser.id, {
        email: formEmail.trim(),
        role: formRole,
        // Le mot de passe n'est pas géré dans la simulation
      });
    } else {
      // Création
      if (!formPassword.trim()) return; // Mot de passe obligatoire à la création
      await createUser({
        email: formEmail.trim(),
        role: formRole,
        // passwordHash serait généré côté serveur
      });
    }
    setShowModal(false);
  };

  // ── Affichage ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}
      >
        <div
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ textAlign: "center", padding: 40, color: "var(--color-ink3)" }}
      >
        <Shield size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
        <p>Impossible de charger les administrateurs.</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--color-ink)",
              marginBottom: 2,
            }}
          >
            Administrateurs
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            {filteredUsers.length} utilisateur
            {filteredUsers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: "var(--color-accent)",
            color: "white",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          <UserPlus size={15} strokeWidth={2.5} />
          Nouvel administrateur
        </button>
      </div>

      {/* Barre de recherche */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          padding: "14px 16px",
          borderRadius: 16,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 10,
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            flex: "1 1 200px",
          }}
        >
          <Search
            size={14}
            strokeWidth={2}
            style={{ color: "var(--color-ink4)", flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="Rechercher par email ou rôle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              flex: 1,
              fontSize: 13,
              color: "var(--color-ink)",
              fontFamily: "var(--font-body)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink4)",
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead
            style={{
              background: "var(--color-surface2)",
              fontWeight: 700,
              color: "var(--color-ink2)",
            }}
          >
            <tr>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Email</th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Rôle
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Créé le
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Dernière connexion
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: 32,
                    color: "var(--color-ink4)",
                  }}
                >
                  <User
                    size={28}
                    style={{ margin: "0 auto 10px", opacity: 0.5 }}
                  />
                  Aucun administrateur trouvé.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <td
                    style={{
                      padding: "10px 14px",
                      fontWeight: 600,
                      color: "var(--color-ink)",
                    }}
                  >
                    {user.email}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <RoleBadge role={user.role} />
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--color-ink2)",
                    }}
                  >
                    {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--color-ink2)",
                    }}
                  >
                    {user.lastLoginDate
                      ? new Date(user.lastLoginDate).toLocaleDateString(
                          "fr-FR",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "Jamais"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        title="Modifier"
                        style={iconBtn}
                        onClick={() => handleEdit(user)}
                      >
                        <Edit3 size={14} strokeWidth={2} />
                      </button>
                      <button
                        title="Supprimer"
                        style={{ ...iconBtn, color: "#ef4444" }}
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Modal Ajout/Modification ──────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(26,20,10,0.5)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setShowModal(false)}
          />
          <div
            style={{
              position: "relative",
              zIndex: 201,
              background: "var(--color-surface)",
              borderRadius: 20,
              maxWidth: 480,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--color-ink)",
                }}
              >
                {editingUser
                  ? "Modifier l'administrateur"
                  : "Nouvel administrateur"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: "var(--color-ink2)",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={handleSave}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="admin@instawear.shop"
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Mot de passe{" "}
                  {editingUser ? "(laisser vide pour ne pas changer)" : ""}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="••••••••"
                  required={!editingUser}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Rôle
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as AdminRole)}
                  className="input-base"
                  style={{ width: "100%", cursor: "pointer" }}
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="editor">Éditeur</option>
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 12,
                    border: "1.5px solid var(--color-border2)",
                    background: "var(--color-surface)",
                    color: "var(--color-ink2)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 22px",
                    borderRadius: 12,
                    border: "none",
                    background: "var(--color-accent)",
                    color: "white",
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <Save size={15} strokeWidth={2} />
                  {editingUser ? "Mettre à jour" : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
