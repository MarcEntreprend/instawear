// src/admin/AdminUsersPage.tsx

import React, { useState, useEffect, useMemo } from "react";
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
import { AdminUser, AdminRole, AdminAuditEntry } from "./adminTypes";
import { iconBtn } from "./adminStyles";
import {
  tableWrapperStyle,
  theadStyle,
  thStyle,
  tdStyle,
} from "./adminStyles";
import AdminBadge from "./ui/AdminBadge";
import AdminEmpty from "./ui/AdminEmpty";
import { formatDateFR, formatDateTimeFR } from "../utils/dates";
import { canDeleteAdmin, canChangeRole, emailExists } from "./adminGuards";

// ─── Badge de rôle ──────────────────────────────────────────────────────────
const ROLE_BADGE: Record<
  AdminRole,
  { label: string; color: string; bg: string }
> = {
  super_admin: { label: "Super Admin", color: "#991b1b", bg: "#fee2e2" },
  editor: { label: "Éditeur", color: "#1e40af", bg: "#dbeafe" },
};

// Libellés FR des actions du journal (clés = action stockée en DB).
const AUDIT_ACTION_LABELS: Record<string, string> = {
  "admin.invite": "a invité",
  "admin.update": "a modifié",
  "admin.delete": "a supprimé",
};

function RoleBadge({ role }: { role: AdminRole }) {
  const style = ROLE_BADGE[role] ?? {
    label: role,
    color: "#555",
    bg: "#f3f4f6",
  };
  // Géométrie via AdminBadge (Vague C2 : pastille unique).
  return (
    <AdminBadge color={style.color} bg={style.bg} uppercase>
      {style.label}
    </AdminBadge>
  );
}

export default function AdminUsersPage() {
  const {
    users: allUsers,
    loading,
    error,
    saving,
    updateUser,
    deleteUser,
    refetch,
  } = useAdminUsers();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Formulaire (AUCUN mot de passe : l'invité le choisit via l'email
  // d'invitation — aucun secret ne transite ici, jamais).
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<AdminRole>("editor");
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // Mon identité (fail-closed : null => lecture seule).
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const canManage = myRole === "super_admin";

  // Journal d'audit (qui a fait quoi).
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAudit = () => {
    setAuditLoading(true);
    import("../api/supabaseApi").then(({ adminAuditApi }) => {
      adminAuditApi
        .list(50)
        .then(setAudit)
        .catch(() => setAudit([]))
        .finally(() => setAuditLoading(false));
    });
  };

  useEffect(() => {
    import("../api/supabaseApi").then(({ adminUserApi }) => {
      adminUserApi
        .getMyRole()
        .then((me) => {
          setMyEmail(me?.email ?? null);
          setMyRole(me && typeof me.role === "string" ? me.role : null);
        })
        .catch(() => {
          setMyEmail(null);
          setMyRole(null);
        });
    });
    loadAudit();
  }, []);

  /** Écriture journal best-effort : n'échoue jamais l'action métier. */
  const logAudit = (entry: {
    action: string;
    targetId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }) => {
    import("../api/supabaseApi").then(({ adminAuditApi }) => {
      adminAuditApi
        .create({
          actorEmail: myEmail ?? "?",
          action: entry.action,
          targetType: "admin_user",
          targetId: entry.targetId ?? "",
          before: entry.before ?? {},
          after: entry.after ?? {},
        })
        .catch(() => {});
    });
  };

  const notifyAdminChange = (title: string, description: string) => {
    import("../api/supabaseApi").then(({ notificationApi }) => {
      notificationApi
        .create({
          title,
          description,
          category: "security",
          priority: "high",
          metadata: { source: "Système", linkTo: "/admin/admin-users" },
          action_label: "Voir les admins",
        })
        .catch(() => {});
    });
  };

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
    setFormRole("editor");
    setFormError(null);
    setInviteStatus(null);
    setShowModal(true);
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormError(null);
    setInviteStatus(null);
    setShowModal(true);
  };

  const handleDelete = async (user: AdminUser) => {
    const g = canDeleteAdmin(allUsers, myEmail, user);
    if (!g.ok) {
      window.alert(g.reason);
      return;
    }
    if (window.confirm(`Supprimer définitivement ${user.email} ?`)) {
      const before = { email: user.email, role: user.role };
      await deleteUser(user.id);
      logAudit({ action: "admin.delete", targetId: user.id, before });
      notifyAdminChange("Administrateur supprimé", `${user.email} a été retiré`);
      loadAudit();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) return;
    setFormError(null);
    setInviteStatus(null);

    if (editingUser) {
      // Mise à jour (email, rôle) — gardes anti-lockout d'abord.
      const g = canChangeRole(allUsers, myEmail, editingUser, formRole);
      if (!g.ok) {
        setFormError(g.reason ?? "Action refusée.");
        return;
      }
      const before = { email: editingUser.email, role: editingUser.role };
      const after = { email: formEmail.trim(), role: formRole };
      await updateUser(editingUser.id, {
        email: formEmail.trim(),
        role: formRole,
      });
      logAudit({
        action: "admin.update",
        targetId: editingUser.id,
        before,
        after,
      });
      notifyAdminChange(
        "Administrateur modifié",
        `${formEmail.trim()} — Rôle : ${formRole}`,
      );
    } else {
      // Création = invitation (l'invité choisit son mot de passe via email).
      if (emailExists(allUsers, formEmail)) {
        setFormError("Cet email est déjà administrateur.");
        return;
      }
      const { adminUserApi } = await import("../api/supabaseApi");
      try {
        const res = await adminUserApi.invite(formEmail.trim(), formRole);
        setInviteStatus(
          res.invited
            ? `Invitation envoyée à ${formEmail.trim()} (rôle : ${formRole}).`
            : (res.warning ??
                "Ligne créée, mais l'email d'invitation n'est pas parti — rouvrez pour renvoyer."),
        );
        logAudit({
          action: "admin.invite",
          targetId: res.adminId,
          after: {
            email: formEmail.trim(),
            role: formRole,
            invited: res.invited,
          },
        });
        notifyAdminChange(
          "Nouvel administrateur invité",
          `${formEmail.trim()} — Rôle : ${formRole}`,
        );
        refetch();
        loadAudit();
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Invitation impossible.",
        );
        return;
      }
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
        {canManage ? (
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
        ) : (
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink3)",
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: "8px 12px",
              margin: 0,
            }}
          >
            Lecture seule — la gestion des administrateurs est réservée aux
            super-administrateurs.
          </p>
        )}
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

      {/* Tableau — objets canoniques adminStyles (Vague C2 : fini le
          3e padding maison ; 12px/14px th, 10px/14px td). */}
      <div style={tableWrapperStyle}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead style={theadStyle}>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Email</th>
              <th style={{ ...thStyle, textAlign: "center" }}>
                Rôle
              </th>
              <th style={{ ...thStyle, textAlign: "center" }}>
                Créé le
              </th>
              <th style={{ ...thStyle, textAlign: "center" }}>
                Dernière connexion
              </th>
              <th style={{ ...thStyle, textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 16 }}>
                  <AdminEmpty
                    icon={<User size={28} />}
                    title="Aucun administrateur trouvé."
                  />
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
                      ...tdStyle,
                      fontWeight: 600,
                      color: "var(--color-ink)",
                    }}
                  >
                    {user.email}
                      {myEmail &&
                        user.email.trim().toLowerCase() ===
                          myEmail.trim().toLowerCase() && (
                          <AdminBadge
                            size="sm"
                            bordered
                            color="var(--color-ink2)"
                            bg="var(--color-surface2)"
                            style={{ marginLeft: 8 }}
                          >
                            Vous
                          </AdminBadge>
                        )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <RoleBadge role={user.role} />
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--color-ink2)",
                    }}
                  >
                    {formatDateFR(user.createdAt)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--color-ink2)",
                    }}
                  >
                    {user.lastLoginDate
                      ? formatDateTimeFR(user.lastLoginDate)
                      : "Jamais"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {canManage ? (
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
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{ fontSize: 12, color: "var(--color-ink4)" }}
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Journal d'audit : qui a fait quoi ─────────────────────────────── */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          padding: "16px 18px",
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "var(--color-ink)",
            margin: "0 0 4px",
          }}
        >
          Journal des actions admin
        </h3>
        <p style={{ fontSize: 12, color: "var(--color-ink3)", margin: "0 0 12px" }}>
          Invitations, modifications et suppressions de comptes (50 dernières).
        </p>
        {auditLoading ? (
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Chargement…
          </p>
        ) : audit.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-ink4)" }}>
            Aucune action enregistrée pour l'instant.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <tbody>
                {audit.map((entry) => (
                  <tr
                    key={entry.id}
                    style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                    <td style={{ ...tdStyle, color: "var(--color-ink)" }}>
                      <strong>{entry.actorEmail}</strong>{" "}
                      <span style={{ color: "var(--color-ink3)" }}>
                        {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                      </span>{" "}
                      {entry.after &&
                      typeof entry.after === "object" &&
                      "email" in (entry.after as Record<string, unknown>) ? (
                        <strong>
                          {String(
                            (entry.after as Record<string, unknown>).email,
                          )}
                        </strong>
                      ) : null}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        color: "var(--color-ink4)",
                      }}
                    >
                      {formatDateTimeFR(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              {!editingUser && (
                <p style={{ fontSize: 12, color: "var(--color-ink3)", margin: 0 }}>
                  Un email d'invitation sera envoyé — le nouvel administrateur
                  choisira lui-même son mot de passe. Aucun mot de passe ne
                  transite ici.
                </p>
              )}
              {formError && (
                <p style={{ fontSize: 13, color: "#991b1b", margin: 0 }}>
                  {formError}
                </p>
              )}
              {inviteStatus && (
                <p style={{ fontSize: 13, color: "var(--color-ink2)", margin: 0 }}>
                  {inviteStatus}
                </p>
              )}
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
                  {editingUser ? "Mettre à jour" : "Envoyer l'invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
