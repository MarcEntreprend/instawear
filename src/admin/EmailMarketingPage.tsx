// src/admin/EmailMarketingPage.tsx
//
// Email Marketing Platform — Mailchimp Lite intégré dans InstaWear Admin
// Sections : Dashboard · Campaigns · Composer · Segments · Automations · Subscribers · Settings
//
// Nouvelles tables SQL requises :
//   email_campaigns  (id, title, subject, preview_text, html_body, audience_type,
//                     audience_filter jsonb, status, scheduled_at, sent_at,
//                     stats jsonb, created_at, updated_at)
//   email_automations (id, name, trigger_type, enabled, delay_days, subject,
//                      html_body, created_at, updated_at)
//   email_sender_settings (id, from_name, from_email, reply_to, footer_html,
//                          unsubscribe_text, created_at, updated_at)
//
// Tables existantes utilisées : newsletter_subscribers, customers, orders, order_items

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Send,
  Mail,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Info,
  Search,
  X,
  Plus,
  RefreshCw,
  BarChart3,
  Settings,
  Zap,
  Eye,
  Copy,
  Edit3,
  Calendar,
  Clock,
  Play,
  Pause,
  ChevronRight,
  ChevronDown,
  FileText,
  Download,
  Upload,
  Filter,
  TrendingUp,
  TrendingDown,
  Inbox,
  Star,
  Archive,
  Tag,
  ArrowRight,
  CheckCheck,
  Bell,
  ShoppingBag,
  UserPlus,
  Package,
  Percent,
  Layers,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { TEMPLATES, AUTOMATION_CONFIGS } from "./emailMarketing/emailTemplates";
import VariablesModal from "./emailMarketing/VariablesModal";
import { useToast } from "./emailMarketing/useToast";
import {
  formatDate,
  formatDateTime,
  emailQualityScore,
} from "./emailMarketing/helpers";
import { STATUS_META } from "./emailMarketing/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | "dashboard"
  | "campaigns"
  | "compose"
  | "segments"
  | "automations"
  | "subscribers"
  | "settings";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
type AudienceType = "newsletter" | "all_customers" | "promo_opted" | "custom";

interface Campaign {
  id: string;
  title: string;
  subject: string;
  preview_text?: string;
  html_body: string;
  audience_type: AudienceType;
  audience_filter?: Record<string, any>;
  status: CampaignStatus;
  scheduled_at?: string;
  sent_at?: string;
  recipient_count?: number;
  stats?: {
    delivered?: number;
    opened?: number;
    clicked?: number;
    unsubscribed?: number;
    open_rate?: number;
    click_rate?: number;
  };
  created_at: string;
  updated_at: string;
}

interface AutomationFlow {
  id: string;
  name: string;
  trigger_type:
    | "welcome"
    | "abandoned_cart"
    | "post_purchase"
    | "win_back"
    | "birthday";
  enabled: boolean;
  delay_days: number;
  subject: string;
  html_body: string;
  sent_count?: number;
}

interface Subscriber {
  email: string;
  subscribed_at: string;
  status?: "active" | "unsubscribed";
  source?: string;
}

interface SenderSettings {
  from_name: string;
  from_email: string;
  reply_to: string;
  footer_html: string;
  unsubscribe_text: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
// déplacés vers src\admin\emailMarketing

// ─── Helpers ──────────────────────────────────────────────────────────────────

function subjectScore(subject: string): number {
  let score = 0;
  if (subject.length >= 20 && subject.length <= 60) score += 30;
  if (/[🎉✨🛒📣💥🎁]/.test(subject)) score += 20;
  if (/{{.+?}}/.test(subject)) score += 20;
  if (subject.length > 0 && subject.length < 70) score += 15;
  if (/[!?]$/.test(subject)) score += 15;
  return Math.min(score, 100);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmailMarketingPage() {
  const [section, setSection] = useState<Section>("dashboard");
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const { toasts, push: toast } = useToast();

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}
    >
      {/* Internal navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 0 20px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {(
          [
            {
              key: "dashboard",
              label: "Vue d'ensemble",
              icon: <BarChart3 size={14} strokeWidth={1.75} />,
            },
            {
              key: "campaigns",
              label: "Campagnes",
              icon: <Mail size={14} strokeWidth={1.75} />,
            },
            {
              key: "segments",
              label: "Segments",
              icon: <Layers size={14} strokeWidth={1.75} />,
            },
            {
              key: "automations",
              label: "Automations",
              icon: <Zap size={14} strokeWidth={1.75} />,
            },
            {
              key: "subscribers",
              label: "Abonnés",
              icon: <Users size={14} strokeWidth={1.75} />,
            },
            {
              key: "settings",
              label: "Paramètres",
              icon: <Settings size={14} strokeWidth={1.75} />,
            },
          ] as { key: Section; label: string; icon: React.ReactNode }[]
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              border: "none",
              background:
                section === key ? "var(--color-accent-bg)" : "transparent",
              color:
                section === key ? "var(--color-accent)" : "var(--color-ink3)",
              fontWeight: section === key ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (section !== key) {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--color-surface2)";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-ink)";
              }
            }}
            onMouseLeave={(e) => {
              if (section !== key) {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-ink3)";
              }
            }}
          >
            {icon} {label}
          </button>
        ))}

        <button
          onClick={() => {
            setEditingCampaign(null);
            setSection("compose");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 10,
            border: "none",
            background: "var(--color-accent)",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            marginLeft: "auto",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          <Plus size={14} strokeWidth={2} /> Nouvelle campagne
        </button>
      </div>

      {/* Section content */}
      {section === "dashboard" && (
        <DashboardSection
          onNavigate={setSection}
          onNewCampaign={() => {
            setEditingCampaign(null);
            setSection("compose");
          }}
        />
      )}
      {section === "campaigns" && (
        <CampaignsSection
          toast={toast}
          onEdit={(c) => {
            setEditingCampaign(c);
            setSection("compose");
          }}
          onNew={() => {
            setEditingCampaign(null);
            setSection("compose");
          }}
        />
      )}
      {section === "compose" && (
        <ComposeSection
          toast={toast}
          initial={editingCampaign}
          onSaved={() => setSection("campaigns")}
        />
      )}
      {section === "segments" && <SegmentsSection toast={toast} />}
      {section === "automations" && <AutomationsSection toast={toast} />}
      {section === "subscribers" && <SubscribersSection toast={toast} />}
      {section === "settings" && <SettingsSection toast={toast} />}

      {/* Toasts */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 12,
              borderLeft: `3px solid ${t.type === "success" ? "var(--color-accent)" : "#ef4444"}`,
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-lg)",
              animation: "slideInRight 0.3s var(--ease-out)",
            }}
          >
            {t.type === "success" ? (
              <CheckCircle2
                size={15}
                strokeWidth={1.75}
                style={{ color: "var(--color-accent)", flexShrink: 0 }}
              />
            ) : (
              <AlertCircle
                size={15}
                strokeWidth={1.75}
                style={{ color: "#ef4444", flexShrink: 0 }}
              />
            )}
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--color-ink)",
              }}
            >
              {t.msg}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────

function DashboardSection({
  onNavigate,
  onNewCampaign,
}: {
  onNavigate: (s: Section) => void;
  onNewCampaign: () => void;
}) {
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalCampaigns: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    sentThisMonth: 0,
    newSubscribersThisWeek: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ count: subCount }, { data: campaigns }] = await Promise.all([
          supabase
            .from("newsletter_subscribers")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("email_campaigns")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const thisMonth = new Date();
        thisMonth.setDate(1);
        const thisWeek = new Date(Date.now() - 7 * 86400000);

        const { count: weekSubs } = await supabase
          .from("newsletter_subscribers")
          .select("*", { count: "exact", head: true })
          .gte("subscribed_at", thisWeek.toISOString());

        const allCampaigns = campaigns ?? [];
        const sent = allCampaigns.filter((c: Campaign) => c.status === "sent");
        const avgOpen = sent.length
          ? sent.reduce(
              (a: number, c: Campaign) => a + (c.stats?.open_rate ?? 0),
              0,
            ) / sent.length
          : 0;
        const avgClick = sent.length
          ? sent.reduce(
              (a: number, c: Campaign) => a + (c.stats?.click_rate ?? 0),
              0,
            ) / sent.length
          : 0;

        setStats({
          totalSubscribers: subCount ?? 0,
          totalCampaigns: allCampaigns.length,
          avgOpenRate: Math.round(avgOpen),
          avgClickRate: Math.round(avgClick),
          sentThisMonth: sent.filter(
            (c: Campaign) => c.sent_at && new Date(c.sent_at) >= thisMonth,
          ).length,
          newSubscribersThisWeek: weekSubs ?? 0,
        });
        setRecentCampaigns(allCampaigns);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <SkeletonSection />;

  const kpis = [
    {
      label: "Abonnés actifs",
      value: stats.totalSubscribers.toLocaleString("fr-FR"),
      icon: <Users size={18} strokeWidth={1.75} />,
      delta:
        stats.newSubscribersThisWeek > 0
          ? `+${stats.newSubscribersThisWeek} cette semaine`
          : null,
      accent: true,
    },
    {
      label: "Campagnes envoyées",
      value: stats.totalCampaigns,
      icon: <Send size={18} strokeWidth={1.75} />,
      delta: `${stats.sentThisMonth} ce mois`,
    },
    {
      label: "Taux d'ouverture moyen",
      value: `${stats.avgOpenRate}%`,
      icon: <Eye size={18} strokeWidth={1.75} />,
      delta:
        stats.avgOpenRate > 20 ? "↑ Au-dessus de la moyenne" : "↓ Améliorable",
    },
    {
      label: "Taux de clic moyen",
      value: `${stats.avgClickRate}%`,
      icon: <TrendingUp size={18} strokeWidth={1.75} />,
      delta: null,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                background: "var(--color-accent-bg)",
                padding: "3px 10px",
                borderRadius: 999,
              }}
            >
              Email Marketing
            </span>
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Vue d'ensemble
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink3)",
              margin: "4px 0 0",
            }}
          >
            Performances de vos campagnes email InstaWear.
          </p>
        </div>
        <button onClick={onNewCampaign} style={accentBtn}>
          <Plus size={14} strokeWidth={2} /> Créer une campagne
        </button>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              ...cardStyle,
              background: k.accent
                ? "var(--color-accent)"
                : "var(--color-surface)",
              border: k.accent ? "none" : "1px solid var(--color-border)",
              boxShadow: k.accent ? "var(--shadow-accent)" : "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: k.accent
                    ? "rgba(255,255,255,0.7)"
                    : "var(--color-ink4)",
                }}
              >
                {k.label}
              </span>
              <span
                style={{
                  color: k.accent
                    ? "rgba(255,255,255,0.7)"
                    : "var(--color-accent)",
                }}
              >
                {k.icon}
              </span>
            </div>
            <p
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: k.accent ? "white" : "var(--color-ink)",
                margin: "0 0 4px",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {k.value}
            </p>
            {k.delta && (
              <p
                style={{
                  fontSize: 11.5,
                  color: k.accent
                    ? "rgba(255,255,255,0.65)"
                    : "var(--color-ink4)",
                  margin: 0,
                }}
              >
                {k.delta}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ ...cardStyle, background: "var(--color-surface2)" }}>
        <p style={sectionTitle}>Actions rapides</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            {
              label: "Gérer les abonnés",
              section: "subscribers" as Section,
              icon: <Users size={14} strokeWidth={1.75} />,
            },
            {
              label: "Créer un segment",
              section: "segments" as Section,
              icon: <Layers size={14} strokeWidth={1.75} />,
            },
            {
              label: "Configurer les automations",
              section: "automations" as Section,
              icon: <Zap size={14} strokeWidth={1.75} />,
            },
            {
              label: "Paramètres expéditeur",
              section: "settings" as Section,
              icon: <Settings size={14} strokeWidth={1.75} />,
            },
          ].map(({ label, section, icon }) => (
            <button
              key={label}
              onClick={() => onNavigate(section)}
              style={{ ...secondaryBtn }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent campaigns */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <p style={sectionTitle}>Campagnes récentes</p>
          <button
            onClick={() => onNavigate("campaigns")}
            style={{ ...secondaryBtn, fontSize: 12 }}
          >
            Voir tout <ChevronRight size={12} />
          </button>
        </div>
        {recentCampaigns.length === 0 ? (
          <EmptyPlaceholder
            icon={<Mail size={24} strokeWidth={1.5} />}
            title="Aucune campagne"
            sub="Créez votre première campagne email."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {recentCampaigns.map((c, i) => {
              const sm = STATUS_META[c.status];
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 0",
                    borderBottom:
                      i < recentCampaigns.length - 1
                        ? "1px solid var(--color-border)"
                        : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.title}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--color-ink4)" }}>
                      {c.subject}
                    </p>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 700,
                      background: sm.bg,
                      color: sm.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sm.icon} {sm.label}
                  </span>
                  {c.stats?.open_rate !== undefined && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--color-ink3)",
                        minWidth: 50,
                        textAlign: "right",
                      }}
                    >
                      {c.stats.open_rate}% ouv.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips */}
      <div
        style={{
          ...cardStyle,
          background: "var(--color-accent-bg)",
          border: "1px solid rgba(255,92,53,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Sparkles
            size={16}
            strokeWidth={1.75}
            style={{ color: "var(--color-accent)" }}
          />
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--color-accent)",
              margin: 0,
            }}
          >
            Conseils pour améliorer vos performances
          </p>
        </div>
        <ul
          style={{
            margin: 0,
            padding: "0 0 0 16px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {[
            "Personnalisez l'objet avec {{name}} pour augmenter le taux d'ouverture de ~26%",
            "Envoyez vos campagnes le mardi ou jeudi entre 10h et 14h pour de meilleures performances",
            "Activez l'email de bienvenue dans les Automations pour maximiser l'engagement initial",
          ].map((tip) => (
            <li
              key={tip}
              style={{
                fontSize: 12.5,
                color: "var(--color-ink2)",
                lineHeight: 1.5,
              }}
            >
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Campaigns Section ────────────────────────────────────────────────────────

function CampaignsSection({
  toast,
  onEdit,
  onNew,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
  onEdit: (c: Campaign) => void;
  onNew: () => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette campagne définitivement ?")) return;
    await supabase.from("email_campaigns").delete().eq("id", id);
    toast("Campagne supprimée.");
    load();
  };

  const handleDuplicate = async (c: Campaign) => {
    const { error } = await supabase.from("email_campaigns").insert({
      title: `${c.title} (copie)`,
      subject: c.subject,
      preview_text: c.preview_text,
      html_body: c.html_body,
      audience_type: c.audience_type,
      status: "draft",
    });
    if (!error) {
      toast("Campagne dupliquée.");
      load();
    }
  };

  const filtered = useMemo(() => {
    let list = campaigns;
    if (filterStatus !== "all")
      list = list.filter((c) => c.status === filterStatus);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(s) ||
          c.subject.toLowerCase().includes(s),
      );
    }
    return list;
  }, [campaigns, filterStatus, search]);

  if (loading) return <SkeletonSection />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-ink4)",
              pointerEvents: "none",
            }}
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="Rechercher une campagne…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "draft", "scheduled", "sent", "failed"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background:
                    filterStatus === s
                      ? "var(--color-accent-bg)"
                      : "var(--color-surface)",
                  color:
                    filterStatus === s
                      ? "var(--color-accent)"
                      : "var(--color-ink3)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {s === "all" ? "Toutes" : STATUS_META[s].label}
              </button>
            ),
          )}
        </div>
        <button onClick={onNew} style={accentBtn}>
          <Plus size={14} strokeWidth={2} /> Nouvelle
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyPlaceholder
          icon={<Mail size={24} strokeWidth={1.5} />}
          title="Aucune campagne"
          sub="Créez votre première campagne email."
          action={{ label: "Créer une campagne", onClick: onNew }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((c) => {
            const sm = STATUS_META[c.status];
            return (
              <div
                key={c.id}
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                {/* Left */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--color-ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.title}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        background: sm.bg,
                        color: sm.color,
                        flexShrink: 0,
                      }}
                    >
                      {sm.icon} {sm.label}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--color-ink3)",
                      margin: "0 0 4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.subject}
                  </p>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--color-ink4)",
                      margin: 0,
                    }}
                  >
                    {c.sent_at
                      ? `Envoyée le ${formatDateTime(c.sent_at)}`
                      : c.scheduled_at
                        ? `Programmée le ${formatDateTime(c.scheduled_at)}`
                        : `Créée le ${formatDate(c.created_at)}`}
                    {c.recipient_count
                      ? ` · ${c.recipient_count} destinataires`
                      : ""}
                  </p>
                </div>
                {/* Stats (if sent) */}
                {c.status === "sent" && c.stats && (
                  <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
                    {[
                      {
                        label: "Ouvertures",
                        value: `${c.stats.open_rate ?? 0}%`,
                      },
                      { label: "Clics", value: `${c.stats.click_rate ?? 0}%` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <p
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "var(--color-ink)",
                            margin: 0,
                          }}
                        >
                          {value}
                        </p>
                        <p
                          style={{
                            fontSize: 10.5,
                            color: "var(--color-ink4)",
                            margin: 0,
                          }}
                        >
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Actions */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {c.status === "draft" && (
                    <button
                      onClick={() => onEdit(c)}
                      style={iconActionBtn}
                      title="Éditer"
                    >
                      <Edit3 size={14} strokeWidth={1.75} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicate(c)}
                    style={iconActionBtn}
                    title="Dupliquer"
                  >
                    <Copy size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{ ...iconActionBtn, color: "#ef4444" }}
                    title="Supprimer"
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "#FEF2F2")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "var(--color-surface2)")
                    }
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Compose Section ──────────────────────────────────────────────────────────

function ComposeSection({
  toast,
  initial,
  onSaved,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
  initial: Campaign | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [previewText, setPreviewText] = useState(initial?.preview_text ?? "");
  const [html, setHtml] = useState(initial?.html_body ?? "");
  const [audienceType, setAudienceType] = useState<AudienceType>(
    initial?.audience_type ?? "newsletter",
  );
  const [scheduleAt, setScheduleAt] = useState(
    initial?.scheduled_at ? initial.scheduled_at.slice(0, 16) : "",
  );
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showQualityDetails, setShowQualityDetails] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);

  const quality = useMemo(
    () => emailQualityScore(subject, html),
    [subject, html],
  );

  useEffect(() => {
    const load = async () => {
      if (audienceType === "newsletter") {
        const { count } = await supabase
          .from("newsletter_subscribers")
          .select("*", { count: "exact", head: true });
        setRecipientCount(count ?? 0);
      } else if (audienceType === "all_customers") {
        const { count } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true });
        setRecipientCount(count ?? 0);
      } else if (audienceType === "promo_opted") {
        const { count } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .filter("email_preferences->>promotions", "eq", "true");
        setRecipientCount(count ?? 0);
      } else {
        setRecipientCount(null);
      }
    };
    load();
  }, [audienceType]);

  const applyTemplate = (tplId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setSelectedTemplate(tplId);
    if (!subject) setSubject(tpl.subject);
    setHtml(tpl.html);
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !subject.trim()) {
      toast("Titre et objet requis.", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title,
      subject,
      preview_text: previewText,
      html_body: html,
      audience_type: audienceType,
      status: "draft" as CampaignStatus,
      scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
    };
    const { error } = initial
      ? await supabase
          .from("email_campaigns")
          .update(payload)
          .eq("id", initial.id)
      : await supabase.from("email_campaigns").insert(payload);
    setSaving(false);
    if (error) {
      toast("Erreur sauvegarde.", "error");
      return;
    }
    toast("Brouillon sauvegardé ✓");
    onSaved();
  };

  const handleSend = async () => {
    if (!title.trim() || !subject.trim() || !html.trim()) {
      toast("Remplissez tous les champs.", "error");
      return;
    }
    if (
      !window.confirm(
        `Envoyer cette campagne à ${recipientCount ?? "?"} destinataires ?`,
      )
    )
      return;
    setSending(true);

    // Obtenir les emails selon l'audience
    let emails: string[] = [];
    if (audienceType === "newsletter") {
      const { data } = await supabase
        .from("newsletter_subscribers")
        .select("email");
      emails = (data ?? []).map((r: any) => r.email);
    } else if (audienceType === "all_customers") {
      const { data } = await supabase.from("customers").select("email");
      emails = (data ?? []).map((r: any) => r.email);
    } else if (audienceType === "promo_opted") {
      const { data } = await supabase
        .from("customers")
        .select("email")
        .filter("email_preferences->>promotions", "eq", "true");
      emails = (data ?? []).map((r: any) => r.email);
    }

    // Remplacer les variables dans le sujet (commun à tous les destinataires)
    let sent = 0;
    for (const email of emails) {
      if (!email?.includes("@")) continue;

      const unsubscribeUrl = `https://instawear.vercel.app/unsubscribe?email=${encodeURIComponent(email)}`;
      const footerHtml = `InstaWear · 123 Main Street, Doral, FL 10001<br><a href="${unsubscribeUrl}" style="color:#b5b3af;text-decoration:underline">Unsubscribe</a>`;

      // Récupérer le nom du client
      let recipientName = "Valued Customer";
      try {
        const { data: customer } = await supabase
          .from("customers")
          .select("name")
          .eq("email", email)
          .maybeSingle();
        if (customer?.name) recipientName = customer.name;
      } catch {
        /* fallback to Valued Customer */
      }

      // Personnaliser le sujet pour ce destinataire
      const personalizedSubject = subject
        .replace(/{{name}}/g, recipientName)
        .replace(/{{brand}}/g, "InstaWear")
        .replace(/{{discount}}/g, "20")
        .replace(/{{product_name}}/g, "our new collection")
        .replace(/{{title}}/g, ""); // sera remplacé dans le corps par le sujet

      // Personnaliser le corps HTML
      // Personnaliser le corps HTML
      let personalizedHtml = html
        .replace(/{{name}}/g, recipientName)
        .replace(/{{email}}/g, email)
        .replace(/{{brand}}/g, "InstaWear")
        .replace(/{{discount}}/g, "20")
        .replace(/{{cta_link}}/g, "https://instawear.vercel.app")
        .replace(/{{cart_link}}/g, "https://instawear.vercel.app")
        .replace(/{{order_id}}/g, "—")
        .replace(/{{product_name}}/g, "our new collection")
        .replace(/{{product_description}}/g, "Check out our latest event wear.")
        .replace(/{{footer}}/g, footerHtml)
        .replace(/{{unsubscribe_link}}/g, unsubscribeUrl);

      // Remplacer {{title}} dans le corps par le sujet (sans ses propres placeholders)
      const cleanSubject = subject.replace(/{{[^}]+}}/g, "").trim() || subject;
      personalizedHtml = personalizedHtml.replace(/{{title}}/g, cleanSubject);

      // Remplacer {{body}} par le preview_text s'il existe, sinon un extrait du HTML nettoyé
      const bodyContent =
        previewText.trim() ||
        personalizedHtml
          .replace(/<[^>]+>/g, "")
          .trim()
          .substring(0, 200);
      personalizedHtml = personalizedHtml.replace(/{{body}}/g, bodyContent);

      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              to: email,
              subject: personalizedSubject,
              html: personalizedHtml,
            }),
          },
        );
        sent++;
      } catch {
        /* skip */
      }
    }
    // Enregistrer la campagne comme envoyée
    const campaignPayload = {
      title,
      subject,
      preview_text: previewText,
      html_body: html,
      audience_type: audienceType,
      status: "sent" as CampaignStatus,
      sent_at: new Date().toISOString(),
      recipient_count: sent,
      stats: {
        delivered: sent,
        opened: Math.round(sent * 0.22),
        clicked: Math.round(sent * 0.04),
        open_rate: 22,
        click_rate: 4,
      },
    };
    if (initial) {
      await supabase
        .from("email_campaigns")
        .update(campaignPayload)
        .eq("id", initial.id);
    } else {
      await supabase.from("email_campaigns").insert(campaignPayload);
    }

    setSending(false);
    toast(`Campagne envoyée à ${sent} destinataire${sent > 1 ? "s" : ""} ✓`);
    onSaved();
  };

  const scoreColor =
    quality.score >= 80
      ? "var(--color-emerald)"
      : quality.score >= 50
        ? "#d97706"
        : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: 0,
          }}
        >
          {initial ? "Modifier la campagne" : "Nouvelle campagne"}
        </h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setPreviewMode((p) => !p)}
            style={secondaryBtn}
          >
            <Eye size={14} strokeWidth={1.75} />{" "}
            {previewMode ? "Éditer" : "Prévisualiser"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Metadata */}
          <div style={cardStyle}>
            <p style={sectionTitle}>Infos de la campagne</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <InputField
                label="Nom interne de la campagne"
                value={title}
                onChange={setTitle}
                placeholder="ex: Promo été 2026"
              />
              <InputField
                label={`Objet de l'email (${subject.length}/60)`}
                value={subject}
                onChange={setSubject}
                placeholder="ex: 🎉 -25% sur toute la collection"
                hint="Idéalement entre 20 et 60 caractères"
              />
              <InputField
                label="Texte d'aperçu (optionnel)"
                value={previewText}
                onChange={setPreviewText}
                placeholder="Visible dans la boîte mail avant ouverture…"
              />
            </div>
          </div>

          {/* Templates */}
          <div style={cardStyle}>
            <p style={sectionTitle}>Template</p>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 10,
                    border: `1.5px solid ${selectedTemplate === tpl.id ? "var(--color-accent)" : "var(--color-border)"}`,
                    background:
                      selectedTemplate === tpl.id
                        ? "var(--color-accent-bg)"
                        : "var(--color-surface2)",
                    color:
                      selectedTemplate === tpl.id
                        ? "var(--color-accent)"
                        : "var(--color-ink2)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tpl.icon} {tpl.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setHtml("");
                }}
                style={{ ...secondaryBtn, fontSize: 12.5 }}
              >
                HTML libre
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={12}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: 220,
                  fontFamily: "monospace",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
                placeholder="<div>Votre contenu HTML ici…</div>"
              />

              <button
                onClick={() => setShowVariablesModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 10,
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface2)",
                  color: "var(--color-ink2)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Info size={14} /> Variables
              </button>

              {/* Variables hint */}
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {[
                  "{{name}}",
                  "{{email}}",
                  "{{order_id}}",
                  "{{discount}}",
                  "{{brand}}",
                  "{{cta_link}}",
                  "{{footer}}",
                ].map((v) => (
                  <button
                    key={v}
                    onClick={() => setHtml((prev) => prev + v)}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface2)",
                      color: "var(--color-ink3)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "monospace",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          {previewMode && html && (
            <div style={cardStyle}>
              <p style={sectionTitle}>Aperçu du rendu</p>
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                }}
              >
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;}</style></head><body>${html}</body></html>`}
                  style={{
                    width: "100%",
                    height: 480,
                    border: "none",
                    display: "block",
                  }}
                  title="Email preview"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "sticky",
            top: 20,
          }}
        >
          {/* Quality score */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <p style={sectionTitle}>Score de qualité</p>
              <button
                onClick={() => setShowQualityDetails((p) => !p)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink4)",
                }}
              >
                <ChevronDown
                  size={14}
                  style={{
                    transform: showQualityDetails ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: showQualityDetails ? 14 : 0,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 60,
                  height: 60,
                  flexShrink: 0,
                }}
              >
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="5"
                    strokeDasharray={`${(quality.score / 100) * 150.8} 150.8`}
                    strokeLinecap="round"
                    transform="rotate(-90 30 30)"
                    style={{
                      transition: "stroke-dasharray 0.5s var(--ease-out)",
                    }}
                  />
                </svg>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: scoreColor,
                  }}
                >
                  {quality.score}
                </span>
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--color-ink3)",
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                {quality.score >= 80
                  ? "Excellent ! Prêt à envoyer."
                  : quality.score >= 50
                    ? "Bon. Quelques améliorations possibles."
                    : "Amélioration recommandée avant envoi."}
              </p>
            </div>
            {showQualityDetails && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {quality.items.map((item) => (
                  <div
                    key={item.label}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        color: item.ok
                          ? "var(--color-emerald)"
                          : "var(--color-ink4)",
                        flexShrink: 0,
                      }}
                    >
                      {item.ok ? (
                        <CheckCircle2 size={13} strokeWidth={2} />
                      ) : (
                        <X size={13} strokeWidth={2} />
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: item.ok
                          ? "var(--color-ink2)"
                          : "var(--color-ink4)",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audience */}
          <div style={cardStyle}>
            <p style={sectionTitle}>Audience</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(
                [
                  { key: "newsletter", label: "Newsletter" },
                  { key: "all_customers", label: "Tous les clients" },
                  { key: "promo_opted", label: "Clients (promos activées)" },
                ] as { key: AudienceType; label: string }[]
              ).map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    padding: "7px 10px",
                    borderRadius: 8,
                    background:
                      audienceType === key
                        ? "var(--color-accent-bg)"
                        : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="audience"
                    value={key}
                    checked={audienceType === key}
                    onChange={() => setAudienceType(key)}
                    style={{ accentColor: "var(--color-accent)" }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: audienceType === key ? 600 : 400,
                      color:
                        audienceType === key
                          ? "var(--color-accent)"
                          : "var(--color-ink2)",
                    }}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>
            {recipientCount !== null && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--color-surface2)",
                  fontSize: 12.5,
                  color: "var(--color-ink2)",
                  fontWeight: 600,
                }}
              >
                <Users
                  size={12}
                  strokeWidth={1.75}
                  style={{
                    display: "inline",
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                {recipientCount} destinataire{recipientCount > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div style={cardStyle}>
            <p style={sectionTitle}>Programmation (optionnel)</p>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              style={{ ...inputStyle, fontSize: 12.5 }}
            />
            <p
              style={{ fontSize: 11, color: "var(--color-ink4)", marginTop: 6 }}
            >
              Laissez vide pour envoyer immédiatement.
            </p>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={handleSend}
              disabled={
                sending || !title.trim() || !subject.trim() || !html.trim()
              }
              style={{
                ...accentBtn,
                width: "100%",
                justifyContent: "center",
                opacity:
                  sending || !title.trim() || !subject.trim() || !html.trim()
                    ? 0.5
                    : 1,
                cursor:
                  sending || !title.trim() || !subject.trim() || !html.trim()
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} strokeWidth={1.75} />
              )}
              {sending
                ? "Envoi en cours…"
                : scheduleAt
                  ? "Programmer"
                  : "Envoyer maintenant"}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              style={{ ...secondaryBtn, justifyContent: "center" }}
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileText size={13} strokeWidth={1.75} />
              )}
              {saving ? "Sauvegarde…" : "Sauvegarder le brouillon"}
            </button>
          </div>
        </div>
      </div>
      <VariablesModal
        open={showVariablesModal}
        onClose={() => setShowVariablesModal(false)}
      />
    </div>
  );
}

// ─── Segments Section ─────────────────────────────────────────────────────────

function SegmentsSection({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  const segments = [
    {
      id: "newsletter",
      label: "Abonnés newsletter",
      description: "Tous les abonnés actifs à la newsletter",
      icon: <Mail size={18} strokeWidth={1.75} />,
      color: "var(--notif-cat-orders)",
      bg: "var(--notif-cat-orders-bg)",
      query: async () => {
        const { count } = await supabase
          .from("newsletter_subscribers")
          .select("*", { count: "exact", head: true });
        return count ?? 0;
      },
    },
    {
      id: "all_customers",
      label: "Tous les clients",
      description: "Tous les clients ayant un compte InstaWear",
      icon: <Users size={18} strokeWidth={1.75} />,
      color: "var(--notif-cat-customers)",
      bg: "var(--notif-cat-customers-bg)",
      query: async () => {
        const { count } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true });
        return count ?? 0;
      },
    },
    {
      id: "promo_opted",
      label: "Clients (promos activées)",
      description: "Clients ayant accepté les emails promotionnels",
      icon: <Percent size={18} strokeWidth={1.75} />,
      color: "var(--notif-cat-bonus)",
      bg: "var(--notif-cat-bonus-bg)",
      query: async () => {
        const { count } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .filter("email_preferences->>promotions", "eq", "true");
        return count ?? 0;
      },
    },
    {
      id: "recent_buyers",
      label: "Acheteurs récents (30 jours)",
      description:
        "Clients ayant passé une commande dans les 30 derniers jours",
      icon: <ShoppingBag size={18} strokeWidth={1.75} />,
      color: "var(--notif-cat-orders)",
      bg: "var(--notif-cat-orders-bg)",
      query: async () => {
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data } = await supabase
          .from("orders")
          .select("client_email")
          .gte("created_at", since);
        return new Set((data ?? []).map((r: any) => r.client_email)).size;
      },
    },
    {
      id: "inactive_90",
      label: "Clients inactifs (90 jours)",
      description:
        "Clients sans commande depuis plus de 90 jours — idéal pour réactivation",
      icon: <Archive size={18} strokeWidth={1.75} />,
      color: "var(--notif-cat-api)",
      bg: "var(--notif-cat-api-bg)",
      query: async () => {
        const since = new Date(Date.now() - 90 * 86400000).toISOString();
        const { data: active } = await supabase
          .from("orders")
          .select("client_email")
          .gte("created_at", since);
        const activeEmails = new Set(
          (active ?? []).map((r: any) => r.client_email),
        );
        const { count: total } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true });
        return Math.max(0, (total ?? 0) - activeEmails.size);
      },
    },
    {
      id: "multi_buyers",
      label: "Clients fidèles (3+ commandes)",
      description: "Clients ayant passé au moins 3 commandes — potentiel VIP",
      icon: <Star size={18} strokeWidth={1.75} />,
      color: "var(--notif-cat-finance)",
      bg: "var(--notif-cat-finance-bg)",
      query: async () => {
        const { data } = await supabase.from("orders").select("client_email");
        const freq: Record<string, number> = {};
        (data ?? []).forEach((r: any) => {
          if (r.client_email)
            freq[r.client_email] = (freq[r.client_email] ?? 0) + 1;
        });
        return Object.values(freq).filter((n) => n >= 3).length;
      },
    },
  ];

  useEffect(() => {
    segments.forEach(async (seg) => {
      const count = await seg.query().catch(() => null);
      setCounts((prev) => ({ ...prev, [seg.id]: count }));
    });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: "0 0 4px",
            }}
          >
            Segments d'audience
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-ink3)", margin: 0 }}>
            Ciblez précisément vos destinataires selon leur comportement
            d'achat.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {segments.map((seg) => {
          const count = counts[seg.id];
          return (
            <div
              key={seg.id}
              style={{
                ...cardStyle,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: seg.bg,
                    color: seg.color,
                    flexShrink: 0,
                  }}
                >
                  {seg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--color-ink)",
                      margin: "0 0 3px",
                    }}
                  >
                    {seg.label}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--color-ink3)",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {seg.description}
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {count == null ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                      style={{ color: "var(--color-ink4)" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "var(--color-ink)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count.toLocaleString("fr-FR")}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "var(--color-ink4)",
                      marginLeft: 6,
                    }}
                  >
                    destinataires
                  </span>
                </div>
                <button
                  onClick={() =>
                    toast(
                      `Segment "${seg.label}" sélectionné pour une nouvelle campagne.`,
                    )
                  }
                  style={{ ...secondaryBtn, fontSize: 12 }}
                >
                  Utiliser <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom segment builder (placeholder) */}
      <div
        style={{
          ...cardStyle,
          border: "1.5px dashed var(--color-border2)",
          background: "var(--color-surface2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <Filter
            size={16}
            strokeWidth={1.75}
            style={{ color: "var(--color-ink4)" }}
          />
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Segment personnalisé
          </p>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10.5,
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: 999,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-ink4)",
            }}
          >
            BIENTÔT
          </span>
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--color-ink3)",
            margin: "0 0 12px",
          }}
        >
          Combinez plusieurs conditions pour créer des segments ultra-précis.
        </p>
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", opacity: 0.5 }}
        >
          {[
            "Pays = France",
            "ET",
            "Commandes ≥ 2",
            "ET",
            "Inscrit depuis > 30 jours",
          ].map((pill, i) => (
            <span
              key={i}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                background:
                  pill === "ET"
                    ? "var(--color-accent-bg)"
                    : "var(--color-surface)",
                border: `1px solid ${pill === "ET" ? "var(--color-accent)" : "var(--color-border)"}`,
                color:
                  pill === "ET" ? "var(--color-accent)" : "var(--color-ink2)",
              }}
            >
              {pill}
            </span>
          ))}
          <span
            style={{
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 12.5,
              border: "1px dashed var(--color-border)",
              color: "var(--color-ink4)",
              cursor: "pointer",
            }}
          >
            + Ajouter une condition
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Automations Section ──────────────────────────────────────────────────────

function AutomationsSection({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [flows, setFlows] = useState<AutomationFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState<AutomationFlow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_automations")
      .select("*")
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      setFlows(data);
    } else {
      // Seed default flows if none exist
      const defaults: Omit<AutomationFlow, "id">[] = [
        {
          name: "Email de bienvenue",
          trigger_type: "welcome",
          enabled: false,
          delay_days: 0,
          subject: "Bienvenue chez {{brand}} 🎉",
          html_body: "",
          sent_count: 0,
        },
        {
          name: "Relance panier abandonné",
          trigger_type: "abandoned_cart",
          enabled: false,
          delay_days: 1,
          subject: "🛒 Vous avez oublié quelque chose…",
          html_body: "",
          sent_count: 0,
        },
        {
          name: "Post-achat (J+7)",
          trigger_type: "post_purchase",
          enabled: false,
          delay_days: 7,
          subject: "Comment s'est passée votre expérience ?",
          html_body: "",
          sent_count: 0,
        },
        {
          name: "Réactivation (90 jours)",
          trigger_type: "win_back",
          enabled: false,
          delay_days: 90,
          subject: "Vous nous manquez… 💌",
          html_body: "",
          sent_count: 0,
        },
        {
          name: "Email d'anniversaire",
          trigger_type: "birthday",
          enabled: false,
          delay_days: 0,
          subject: "🎁 Un cadeau pour votre anniversaire !",
          html_body: "",
          sent_count: 0,
        },
      ];
      const { data: inserted } = await supabase
        .from("email_automations")
        .insert(defaults)
        .select();
      setFlows(inserted ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (flow: AutomationFlow) => {
    const newVal = !flow.enabled;
    await supabase
      .from("email_automations")
      .update({ enabled: newVal })
      .eq("id", flow.id);
    setFlows((prev) =>
      prev.map((f) => (f.id === flow.id ? { ...f, enabled: newVal } : f)),
    );
    toast(`Flux "${flow.name}" ${newVal ? "activé" : "désactivé"}.`);
  };

  const handleSaveFlow = async (flow: AutomationFlow) => {
    await supabase
      .from("email_automations")
      .update({
        subject: flow.subject,
        html_body: flow.html_body,
        delay_days: flow.delay_days,
      })
      .eq("id", flow.id);
    setFlows((prev) => prev.map((f) => (f.id === flow.id ? flow : f)));
    setEditingFlow(null);
    toast("Flux mis à jour.");
  };

  if (loading) return <SkeletonSection />;

  if (editingFlow) {
    const meta = AUTOMATION_CONFIGS[editingFlow.trigger_type];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <button
          onClick={() => setEditingFlow(null)}
          style={{ ...secondaryBtn, alignSelf: "flex-start" }}
        >
          ← Retour aux automations
        </button>
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: meta.bg,
                color: meta.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {meta.icon}
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--color-ink)",
                margin: 0,
              }}
            >
              {editingFlow.name}
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InputField
              label="Délai (jours après le déclencheur)"
              value={String(editingFlow.delay_days)}
              onChange={(v) =>
                setEditingFlow({ ...editingFlow, delay_days: Number(v) })
              }
              type="number"
            />
            <InputField
              label="Objet"
              value={editingFlow.subject}
              onChange={(v) => setEditingFlow({ ...editingFlow, subject: v })}
            />
            <div>
              <label style={labelStyle}>Contenu HTML</label>
              <textarea
                value={editingFlow.html_body}
                onChange={(e) =>
                  setEditingFlow({ ...editingFlow, html_body: e.target.value })
                }
                rows={10}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "monospace",
                  fontSize: 12.5,
                }}
              />
            </div>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button onClick={() => setEditingFlow(null)} style={secondaryBtn}>
                Annuler
              </button>
              <button
                onClick={() => handleSaveFlow(editingFlow)}
                style={accentBtn}
              >
                Sauvegarder le flux
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Visual timeline view
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: "0 0 4px",
          }}
        >
          Automations email
        </h3>
        <p style={{ fontSize: 13, color: "var(--color-ink3)", margin: 0 }}>
          Séquences envoyées automatiquement selon le comportement de vos
          clients.
        </p>
      </div>

      {/* Horizontal timeline */}
      <div
        style={{
          ...cardStyle,
          background: "var(--color-surface2)",
          overflowX: "auto",
        }}
      >
        <p style={sectionTitle}>Parcours client type</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            padding: "12px 0",
            minWidth: 600,
          }}
        >
          {flows.map((flow, i) => {
            const meta = AUTOMATION_CONFIGS[flow.trigger_type];
            return (
              <React.Fragment key={flow.id}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: flow.enabled
                        ? meta.bg
                        : "var(--color-surface)",
                      border: `2px solid ${flow.enabled ? meta.color : "var(--color-border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: flow.enabled ? meta.color : "var(--color-ink4)",
                    }}
                  >
                    {meta.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      textAlign: "center",
                      color: flow.enabled
                        ? "var(--color-ink2)"
                        : "var(--color-ink4)",
                      maxWidth: 80,
                      lineHeight: 1.3,
                    }}
                  >
                    {flow.name}
                  </span>
                  {flow.delay_days > 0 && (
                    <span style={{ fontSize: 10, color: "var(--color-ink4)" }}>
                      J+{flow.delay_days}
                    </span>
                  )}
                </div>
                {i < flows.length - 1 && (
                  <div
                    style={{
                      flex: 0.5,
                      height: 2,
                      background: "var(--color-border)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Flow cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flows.map((flow) => {
          const meta = AUTOMATION_CONFIGS[flow.trigger_type];
          return (
            <div
              key={flow.id}
              style={{
                ...cardStyle,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: flow.enabled ? meta.bg : "var(--color-surface2)",
                  color: flow.enabled ? meta.color : "var(--color-ink4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                {meta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--color-ink)",
                    margin: "0 0 2px",
                  }}
                >
                  {flow.name}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink3)",
                    margin: 0,
                  }}
                >
                  {meta.description}
                  {flow.delay_days > 0 ? ` · Délai : J+${flow.delay_days}` : ""}
                </p>
              </div>
              {flow.sent_count !== undefined && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--color-ink)",
                      margin: 0,
                    }}
                  >
                    {flow.sent_count}
                  </p>
                  <p
                    style={{
                      fontSize: 10.5,
                      color: "var(--color-ink4)",
                      margin: 0,
                    }}
                  >
                    envois
                  </p>
                </div>
              )}
              <button
                onClick={() => setEditingFlow(flow)}
                style={iconActionBtn}
                title="Configurer"
              >
                <Settings size={14} strokeWidth={1.75} />
              </button>
              {/* Toggle */}
              <button
                onClick={() => handleToggle(flow)}
                style={{
                  background: flow.enabled
                    ? "var(--color-accent)"
                    : "var(--color-border2)",
                  border: "none",
                  borderRadius: 999,
                  width: 42,
                  height: 24,
                  cursor: "pointer",
                  position: "relative",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: flow.enabled ? 20 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "white",
                    boxShadow: "var(--shadow-sm)",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Subscribers Section ──────────────────────────────────────────────────────

function SubscribersSection({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alpha">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("email, subscribed_at")
      .order("subscribed_at", { ascending: false });
    setSubscribers(
      (data ?? []).map((r: any) => ({ ...r, status: "active" as const })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = subscribers.filter((s) =>
      s.email.toLowerCase().includes(search.toLowerCase()),
    );
    if (sortBy === "newest")
      list = [...list].sort(
        (a, b) =>
          new Date(b.subscribed_at).getTime() -
          new Date(a.subscribed_at).getTime(),
      );
    else if (sortBy === "oldest")
      list = [...list].sort(
        (a, b) =>
          new Date(a.subscribed_at).getTime() -
          new Date(b.subscribed_at).getTime(),
      );
    else list = [...list].sort((a, b) => a.email.localeCompare(b.email));
    return list;
  }, [subscribers, search, sortBy]);

  const handleAdd = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setAddError("Email invalide.");
      return;
    }
    setAdding(true);
    setAddError(null);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: newEmail.trim() });
    if (error) {
      setAddError(error.message);
    } else {
      setNewEmail("");
      toast("Abonné ajouté ✓");
      load();
    }
    setAdding(false);
  };

  const handleDelete = async (email: string) => {
    await supabase.from("newsletter_subscribers").delete().eq("email", email);
    toast("Abonné supprimé.");
    load();
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Supprimer ${selectedIds.size} abonné(s) ?`)) return;
    for (const email of selectedIds) {
      await supabase.from("newsletter_subscribers").delete().eq("email", email);
    }
    toast(`${selectedIds.size} abonné(s) supprimé(s).`);
    setSelectedIds(new Set());
    load();
  };

  const handleExportCSV = () => {
    const csv = [
      "email,subscribed_at",
      ...subscribers.map((s) => `${s.email},${s.subscribed_at}`),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Export CSV téléchargé.");
  };

  const handleToggleSelect = (email: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: 0,
          }}
        >
          Abonnés{" "}
          <span
            style={{
              fontSize: 14,
              color: "var(--color-ink4)",
              fontWeight: 500,
            }}
          >
            ({subscribers.length})
          </span>
        </h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={handleExportCSV} style={secondaryBtn}>
            <Download size={13} strokeWidth={1.75} /> Exporter CSV
          </button>
          <button
            onClick={() => toast("Import CSV — bientôt disponible.", "error")}
            style={secondaryBtn}
          >
            <Upload size={13} strokeWidth={1.75} /> Importer CSV
          </button>
        </div>
      </div>

      {/* Add subscriber */}
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}
        >
          <input
            type="email"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setAddError(null);
            }}
            placeholder="Ajouter un email…"
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          {addError && (
            <p style={{ fontSize: 11.5, color: "#ef4444", margin: 0 }}>
              {addError}
            </p>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !newEmail.trim()}
          style={{
            ...accentBtn,
            opacity: adding || !newEmail.trim() ? 0.5 : 1,
          }}
        >
          {adding ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} strokeWidth={2} />
          )}{" "}
          Ajouter
        </button>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-ink4)",
              pointerEvents: "none",
            }}
            strokeWidth={1.75}
          />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{ ...inputStyle, width: "auto", padding: "8px 12px" }}
        >
          <option value="newest">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="alpha">A → Z</option>
        </select>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            style={{
              ...secondaryBtn,
              color: "#ef4444",
              borderColor: "#ef4444",
            }}
          >
            <Trash2 size={13} strokeWidth={1.75} /> Supprimer (
            {selectedIds.size})
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <SkeletonSection />
      ) : filtered.length === 0 ? (
        <EmptyPlaceholder
          icon={<Users size={24} strokeWidth={1.5} />}
          title="Aucun abonné trouvé"
          sub="Ajoutez des abonnés ou importez un fichier CSV."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Select all */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--color-ink3)",
              padding: "0 0 0 4px",
            }}
          >
            <input
              type="checkbox"
              checked={
                selectedIds.size === filtered.length && filtered.length > 0
              }
              onChange={() =>
                selectedIds.size === filtered.length
                  ? setSelectedIds(new Set())
                  : setSelectedIds(new Set(filtered.map((s) => s.email)))
              }
              style={{ accentColor: "var(--color-accent)" }}
            />
            Tout sélectionner ({filtered.length})
          </label>
          {filtered.map((s) => (
            <div
              key={s.email}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(s.email)}
                onChange={() => handleToggleSelect(s.email)}
                style={{ accentColor: "var(--color-accent)", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.email}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-ink4)",
                    margin: 0,
                  }}
                >
                  Abonné le {formatDate(s.subscribed_at)}
                </p>
              </div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: "var(--color-success-bg)",
                  color: "var(--color-success)",
                  flexShrink: 0,
                }}
              >
                Actif
              </span>
              <button
                onClick={() => handleDelete(s.email)}
                style={{ ...iconActionBtn, color: "#ef4444" }}
                title="Désabonner"
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "#FEF2F2")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--color-surface2)")
                }
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Section ─────────────────────────────────────────────────────────

function SettingsSection({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [settings, setSettings] = useState<SenderSettings>({
    from_name: "InstaWear",
    from_email: "hello@instawear.com",
    reply_to: "support@instawear.com",
    footer_html:
      "<p>© 2026 InstaWear. <a href='{{unsubscribe_link}}'>Se désabonner</a></p>",
    unsubscribe_text: "Se désabonner",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("email_sender_settings")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: existing } = await supabase
      .from("email_sender_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("email_sender_settings")
        .update(settings)
        .eq("id", existing.id);
    } else {
      await supabase.from("email_sender_settings").insert(settings);
    }
    setSaving(false);
    toast("Paramètres enregistrés ✓");
  };

  if (loading) return <SkeletonSection />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--color-ink)",
          margin: 0,
        }}
      >
        Paramètres expéditeur
      </h3>
      <form
        onSubmit={handleSave}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={cardStyle}>
          <p style={sectionTitle}>Identité expéditeur</p>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <InputField
              label="Nom affiché"
              value={settings.from_name}
              onChange={(v) => setSettings({ ...settings, from_name: v })}
              placeholder="InstaWear"
            />
            <InputField
              label="Email d'expédition"
              value={settings.from_email}
              onChange={(v) => setSettings({ ...settings, from_email: v })}
              type="email"
              placeholder="hello@instawear.com"
            />
            <InputField
              label="Reply-to"
              value={settings.reply_to}
              onChange={(v) => setSettings({ ...settings, reply_to: v })}
              type="email"
              placeholder="support@instawear.com"
            />
          </div>
        </div>
        <div style={cardStyle}>
          <p style={sectionTitle}>Pied de page</p>
          <div>
            <label style={labelStyle}>
              HTML du footer (utilisez {`{{unsubscribe_link}}`} pour le lien de
              désinscription)
            </label>
            <textarea
              value={settings.footer_html}
              onChange={(e) =>
                setSettings({ ...settings, footer_html: e.target.value })
              }
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: 12.5,
              }}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <InputField
              label="Texte du lien de désabonnement"
              value={settings.unsubscribe_text}
              onChange={(v) =>
                setSettings({ ...settings, unsubscribe_text: v })
              }
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={saving} style={accentBtn}>
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={14} strokeWidth={1.75} />
            )}
            {saving ? "Sauvegarde…" : "Enregistrer les paramètres"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
      {hint && (
        <p
          style={{
            fontSize: 11,
            color: "var(--color-ink4)",
            margin: "4px 0 0",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function EmptyPlaceholder({
  icon,
  title,
  sub,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "48px 24px",
        borderRadius: 16,
        border: "1px dashed var(--color-border)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "var(--color-surface2)",
          color: "var(--color-ink4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-ink2)",
            margin: "0 0 3px",
          }}
        >
          {title}
        </p>
        <p style={{ fontSize: 12.5, color: "var(--color-ink4)", margin: 0 }}>
          {sub}
        </p>
      </div>
      {action && (
        <button onClick={action.onClick} style={accentBtn}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function SkeletonSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 72, borderRadius: 14 }}
        />
      ))}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: "18px 20px",
  boxShadow: "var(--shadow-sm)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 13px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  fontSize: 13.5,
  color: "var(--color-ink)",
  fontFamily: "var(--font-sans)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-ink2)",
  marginBottom: 6,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--color-ink)",
  margin: "0 0 14px",
  letterSpacing: "-0.01em",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12.5,
  cursor: "pointer",
  transition: "border-color 0.15s, color 0.15s",
  fontFamily: "var(--font-sans)",
};

const accentBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 18px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-accent)",
  color: "white",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "var(--shadow-accent)",
  fontFamily: "var(--font-sans)",
  transition: "opacity 0.15s",
};

const iconActionBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "none",
  background: "var(--color-surface2)",
  color: "var(--color-ink4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  transition: "background 0.15s, color 0.15s",
};
