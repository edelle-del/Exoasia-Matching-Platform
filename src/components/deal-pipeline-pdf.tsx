"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type PdfDealCard = {
  id: string;
  title: string;
  stage: string;
  fit_score: number | null;
  confidence: string;
  impact_projection: string | null;
  next_action: string | null;
  next_action_due: string | null;
  blocker: string | null;
  last_updated_at: string;
  counterpart_name: string;
};

const STAGE_LABEL: Record<string, string> = {
  discover:    "Qualified",
  intro:       "Intro & Scoping",
  proposal:    "Proposal",
  negotiation: "Negotiation",
  won:         "Closed Won",
  lost:        "On Hold",
};

const STAGE_ACCENT: Record<string, string> = {
  discover:    "#8b8ba7",
  intro:       "#ff6b1f",
  proposal:    "#818cf8",
  negotiation: "#c9a040",
  won:         "#34d399",
  lost:        "#4a4a6a",
};

const BOARD_STAGES = ["discover", "intro", "proposal", "negotiation", "won", "lost"];

const s = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    color: "#1a1a2e",
  },
  // ── Cover strip ──────────────────────────────────────────────────────────────
  coverStrip: {
    backgroundColor: "#ff6b1f",
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  coverSub: {
    fontSize: 9,
    color: "rgba(255,255,255,0.75)",
    marginTop: 3,
  },
  coverDate: {
    fontSize: 9,
    color: "rgba(255,255,255,0.75)",
    textAlign: "right",
  },
  // ── Summary bar ──────────────────────────────────────────────────────────────
  summaryBar: {
    flexDirection: "row",
    marginBottom: 24,
    borderRadius: 6,
    border: "1 solid #e5e7eb",
    overflow: "hidden",
  },
  summaryCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRight: "1 solid #e5e7eb",
    alignItems: "center",
  },
  summaryCellLast: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  summaryCount: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  summaryLabel: {
    fontSize: 7.5,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
  // ── Stage section ─────────────────────────────────────────────────────────────
  stageSection: {
    marginBottom: 18,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  stageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },
  stageName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  stageCount: {
    fontSize: 9,
    color: "#9ca3af",
    marginLeft: 5,
  },
  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    border: "1 solid #e5e7eb",
    borderRadius: 7,
    padding: 12,
    marginBottom: 7,
    backgroundColor: "#fafafa",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
    flex: 1,
  },
  cardCounterpart: {
    fontSize: 8.5,
    color: "#6b7280",
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 7,
  },
  fitBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
    marginRight: 5,
  },
  confBadge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
    border: "1 solid #e5e7eb",
    color: "#374151",
  },
  detailRow: {
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#9ca3af",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 1.5,
  },
  detailText: {
    fontSize: 9,
    color: "#374151",
  },
  blockerBox: {
    backgroundColor: "#fff5f5",
    border: "1 solid #fca5a5",
    borderRadius: 5,
    padding: 7,
    marginTop: 4,
  },
  blockerLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ef4444",
    letterSpacing: 0.5,
    marginBottom: 1.5,
  },
  blockerText: {
    fontSize: 9,
    color: "#374151",
  },
  cardAge: {
    fontSize: 8,
    color: "#9ca3af",
  },
  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    borderTop: "1 solid #e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  pageNum: {
    fontSize: 8,
    color: "#9ca3af",
  },
  emptyStage: {
    fontSize: 9,
    color: "#d1d5db",
    fontStyle: "italic",
    paddingLeft: 14,
    paddingBottom: 4,
  },
});

function fitBadgeColors(score: number | null): { bg: string; color: string } {
  if (score == null) return { bg: "#f3f4f6", color: "#9ca3af" };
  if (score >= 80) return { bg: "#d1fae5", color: "#059669" };
  if (score >= 60) return { bg: "#dbeafe", color: "#2563eb" };
  if (score >= 40) return { bg: "#fef3c7", color: "#d97706" };
  return { bg: "#fee2e2", color: "#dc2626" };
}

function confBadgeColors(conf: string): { bg: string; color: string; border: string } {
  if (conf === "high")   return { bg: "#d1fae5", color: "#059669", border: "#6ee7b7" };
  if (conf === "medium") return { bg: "#fef3c7", color: "#d97706", border: "#fcd34d" };
  return { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" };
}

type Props = {
  cards: PdfDealCard[];
  userName?: string;
  generatedAt: string;
};

export function DealPipelineReport({ cards, userName, generatedAt }: Props) {
  const grouped = BOARD_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABEL[stage] ?? stage,
    accent: STAGE_ACCENT[stage] ?? "#888",
    cards: cards.filter((c) => c.stage === stage),
  }));

  const wonCount = cards.filter((c) => c.stage === "won").length;
  const activeCount = cards.filter((c) => !["won", "lost"].includes(c.stage)).length;
  const staleCount = cards.filter((c) => {
    const age = Math.floor((Date.now() - new Date(c.last_updated_at).getTime()) / 86400000);
    return age >= 7;
  }).length;

  return (
    <Document title="Deal Pipeline Report" author="Exoasia">
      <Page size="A4" style={s.page}>
        {/* Cover strip */}
        <View style={s.coverStrip}>
          <View>
            <Text style={s.coverTitle}>Deal Pipeline Report</Text>
            <Text style={s.coverSub}>
              {userName ? `Prepared for ${userName}` : "Exoasia Matching Platform"}
            </Text>
          </View>
          <Text style={s.coverDate}>{generatedAt}</Text>
        </View>

        {/* Summary bar */}
        <View style={s.summaryBar}>
          {[
            { count: cards.length, label: "Total Deals" },
            { count: activeCount, label: "Active" },
            { count: wonCount, label: "Closed Won" },
            { count: staleCount, label: "Stale (7d+)" },
          ].map((item, i) => (
            <View key={i} style={i === 3 ? s.summaryCellLast : s.summaryCell}>
              <Text style={s.summaryCount}>{item.count}</Text>
              <Text style={s.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Stages */}
        {grouped.map(({ stage, label, accent, cards: stageCards }) => (
          <View key={stage} style={s.stageSection} wrap={false}>
            <View style={s.stageHeader}>
              <View style={[s.stageDot, { backgroundColor: accent }]} />
              <Text style={s.stageName}>{label}</Text>
              <Text style={s.stageCount}>({stageCards.length})</Text>
            </View>

            {stageCards.length === 0 ? (
              <Text style={s.emptyStage}>No deals in this stage</Text>
            ) : (
              stageCards.map((card) => {
                const ageDays = Math.floor(
                  (Date.now() - new Date(card.last_updated_at).getTime()) / 86400000,
                );
                const fitColors = fitBadgeColors(card.fit_score);
                const confColors = confBadgeColors(card.confidence);

                return (
                  <View key={card.id} style={s.card} wrap={false}>
                    <View style={s.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{card.title || card.counterpart_name}</Text>
                        {card.title && card.counterpart_name !== card.title && (
                          <Text style={s.cardCounterpart}>{card.counterpart_name}</Text>
                        )}
                      </View>
                      <Text style={s.cardAge}>{ageDays}d ago</Text>
                    </View>

                    <View style={s.badgeRow}>
                      <Text style={[s.fitBadge, { backgroundColor: fitColors.bg, color: fitColors.color }]}>
                        {card.fit_score != null ? `${card.fit_score}% fit` : "— fit"}
                      </Text>
                      <Text style={[s.confBadge, { backgroundColor: confColors.bg, color: confColors.color, borderColor: confColors.border }]}>
                        {card.confidence} confidence
                      </Text>
                    </View>

                    {card.next_action && (
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Next Action</Text>
                        <Text style={s.detailText}>
                          {card.next_action}
                          {card.next_action_due
                            ? `  ·  Due ${new Date(card.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : ""}
                        </Text>
                      </View>
                    )}

                    {card.impact_projection && (
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Impact Projection</Text>
                        <Text style={s.detailText}>{card.impact_projection}</Text>
                      </View>
                    )}

                    {card.blocker && (
                      <View style={s.blockerBox}>
                        <Text style={s.blockerLabel}>Blocker</Text>
                        <Text style={s.blockerText}>{card.blocker}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Exoasia · Deal Pipeline Report · {generatedAt}</Text>
          <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
