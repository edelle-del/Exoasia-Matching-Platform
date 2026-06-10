"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PortfolioCompany } from "@/app/api/ecosystem/portfolio/route";

type Stats = {
  total_companies: number;
  total_projects: number;
  total_matches: number;
  active_matches: number;
  pending: number;
  stale_count: number;
};

const s = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    color: "#1a1a2e",
  },
  coverStrip: {
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverTitle: {
    fontSize: 20,
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
    paddingHorizontal: 10,
    borderRight: "1 solid #e5e7eb",
    alignItems: "center",
  },
  summaryCellLast: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  summaryCount: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
  },
  summaryLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    borderBottom: "1 solid #f3f4f6",
    paddingBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottom: "1 solid #f3f4f6",
    alignItems: "center",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottom: "1 solid #f3f4f6",
    backgroundColor: "#fafafa",
    alignItems: "center",
  },
  colName: { flex: 3 },
  colSector: { flex: 2 },
  colProjects: { flex: 1 },
  colActive: { flex: 1 },
  colPending: { flex: 1 },
  colFit: { flex: 1 },
  cellText: { fontSize: 9, color: "#374151" },
  cellTextBold: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a2e" },
  cellMuted: { fontSize: 8, color: "#9ca3af" },
  fitGood: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#059669" },
  fitMid:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#d97706" },
  fitNone: { fontSize: 9, color: "#d1d5db" },
  staleChip: {
    backgroundColor: "#fee2e2",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 4,
  },
  staleText: { fontSize: 7, color: "#ef4444", fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    borderTop: "1 solid #e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#9ca3af" },
});

type Props = {
  stats: Stats;
  companies: PortfolioCompany[];
  partnerName?: string;
  generatedAt: string;
};

export function EcosystemAnalyticsPdf({ stats, companies, partnerName, generatedAt }: Props) {
  const activeCompanies = companies.filter((c) => c.status !== "pending").length;

  return (
    <Document title="Cohort Analytics Report" author="Exoasia">
      <Page size="A4" style={s.page}>
        {/* Cover strip */}
        <View style={s.coverStrip}>
          <View>
            <Text style={s.coverTitle}>Cohort Analytics Report</Text>
            <Text style={s.coverSub}>
              {partnerName ? `Prepared for ${partnerName}` : "Exoasia Ecosystem Partner"}
            </Text>
          </View>
          <Text style={s.coverDate}>{generatedAt}</Text>
        </View>

        {/* Summary bar */}
        <View style={s.summaryBar}>
          {[
            { count: stats.total_companies, label: "Portfolio Co." },
            { count: activeCompanies,       label: "Active" },
            { count: stats.total_projects,  label: "Projects" },
            { count: stats.active_matches,  label: "Active Matches" },
            { count: stats.pending,         label: "Pending" },
            { count: stats.stale_count,     label: "Stale Alerts" },
          ].map((item, i) => (
            <View key={i} style={i === 5 ? s.summaryCellLast : s.summaryCell}>
              <Text style={s.summaryCount}>{item.count}</Text>
              <Text style={s.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Company table */}
        <Text style={s.sectionHeader}>Portfolio Companies</Text>

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.colName]}>Company</Text>
          <Text style={[s.tableHeaderCell, s.colSector]}>Sector</Text>
          <Text style={[s.tableHeaderCell, s.colProjects]}>Projects</Text>
          <Text style={[s.tableHeaderCell, s.colActive]}>Active</Text>
          <Text style={[s.tableHeaderCell, s.colPending]}>Pending</Text>
          <Text style={[s.tableHeaderCell, s.colFit]}>Eco Fit</Text>
        </View>

        {companies.map((c, i) => {
          const name = c.business_name || c.full_name || "Startup";
          const activeMatches = c.matches.filter((m) => ["accepted", "introduced"].includes(m.status)).length;
          const pendingMatches = c.matches.filter((m) => ["pending", "approved"].includes(m.status)).length;
          const isStale = c.matches.some((m) => m.is_stale);
          const fit = c.best_eco_fit_score;

          return (
            <View key={c.startup_id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
              <View style={[s.colName, { flexDirection: "row", alignItems: "center" }]}>
                <Text style={s.cellTextBold}>{name}</Text>
                {isStale && (
                  <View style={s.staleChip}>
                    <Text style={s.staleText}>Stale</Text>
                  </View>
                )}
                {c.status === "pending" && (
                  <Text style={[s.cellMuted, { marginLeft: 4 }]}>(pending)</Text>
                )}
              </View>
              <Text style={[s.cellText, s.colSector]}>{c.sector ?? "—"}</Text>
              <Text style={[s.cellText, s.colProjects]}>{c.projects.length}</Text>
              <Text style={[s.cellText, s.colActive]}>{activeMatches}</Text>
              <Text style={[s.cellText, s.colPending]}>{pendingMatches}</Text>
              <Text style={[
                s.colFit,
                fit !== null ? (fit >= 75 ? s.fitGood : s.fitMid) : s.fitNone,
              ]}>
                {fit !== null ? `${fit}%` : "—"}
              </Text>
            </View>
          );
        })}

        {companies.length === 0 && (
          <Text style={[s.cellMuted, { paddingVertical: 12, paddingHorizontal: 10 }]}>
            No portfolio companies yet.
          </Text>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Exoasia · Cohort Analytics Report · {generatedAt}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
