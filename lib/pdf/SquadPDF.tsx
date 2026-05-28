import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const ORANGE = "#E8621A";
const BLACK  = "#111111";
const GRAY   = "#6B6B6B";
const GREEN  = "#1D9E75";
const BLUE   = "#1E6FC5";
const RED    = "#E24B4A";

const QUADRANT_META: Record<string, { label: string; priority: string; color: string; bg: string }> = {
  p1: { label: "Quick Win",        priority: "P1", color: GREEN,  bg: "#F0FBF6" },
  p2: { label: "Gran Proyecto",    priority: "P2", color: BLUE,   bg: "#EAF1FB" },
  p3: { label: "Iniciativa Menor", priority: "P3", color: GRAY,   bg: "#F5F5F5" },
  p0: { label: "Descartada",       priority: "P0", color: RED,    bg: "#FEF3F3" },
};

export type PdfProject = {
  id: string; name: string; stakeholder: string | null;
  impact_value: number; impact_metric: "revenue" | "customers";
  effort_sprints: number; sprints_completed: number;
  squad_status: "backlog" | "curso";
  quadrant: "p0" | "p1" | "p2" | "p3";
  parent_id: string | null; slice_label: string | null;
};

type Props = {
  orgName: string; date: string;
  projects: PdfProject[]; devN: number; devP: number;
};

const s = StyleSheet.create({
  page:        { backgroundColor: "#ffffff", paddingBottom: 32 },
  headerBar:   { backgroundColor: ORANGE, paddingHorizontal: 24, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  headerDate:  { color: "#fff", fontSize: 9 },
  logoRow:     { flexDirection: "row", alignItems: "center", gap: 6 },
  bar1:        { width: 20, height: 4, borderRadius: 2, backgroundColor: "#fff" },
  bar2:        { width: 13, height: 4, borderRadius: 2, backgroundColor: "#fff", opacity: 0.65 },
  bar3:        { width: 8,  height: 4, borderRadius: 2, backgroundColor: "#fff", opacity: 0.30 },
  wordmark:    { color: "#fff", fontSize: 13, fontWeight: "bold" },
  body:        { paddingHorizontal: 24, paddingTop: 16 },
  statsRow:    { flexDirection: "row", gap: 10, marginBottom: 18 },
  statBox:     { flex: 1, borderRadius: 8, border: "1 solid #E5E7EB", padding: 10, alignItems: "center" },
  statVal:     { fontSize: 18, fontWeight: "bold", color: BLACK, marginBottom: 2 },
  statLabel:   { fontSize: 8, color: GRAY, textTransform: "uppercase", letterSpacing: 0.5 },
  section:     { marginBottom: 14 },
  sectionHead: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  sectionPrio: { fontSize: 10, fontWeight: "bold", color: "#fff" },
  sectionLbl:  { fontSize: 10, fontWeight: "bold", color: "#fff" },
  sectionCount:{ fontSize: 8, color: "#fff", opacity: 0.8, marginLeft: "auto" },
  row:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderBottom: "1 solid #F3F4F6", gap: 6 },
  rowName:     { flex: 1, fontSize: 9, color: BLACK, fontWeight: "bold" },
  rowMeta:     { fontSize: 8, color: GRAY },
  rowBadge:    { fontSize: 8, fontWeight: "bold", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  progressBg:  { width: 60, height: 5, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" },
  progressFg:  { height: 5, borderRadius: 3 },
  footer:      { position: "absolute", bottom: 12, left: 24, right: 24, flexDirection: "row", justifyContent: "space-between" },
  footerTxt:   { fontSize: 7, color: GRAY },
});

export function SquadPDF({ orgName, date, projects, devN, devP }: Props) {
  const active   = projects.filter(p => !p.parent_id);
  const inCourse = active.filter(p => p.squad_status === "curso").length;
  const capacity = devN * devP;
  const occ      = Math.round((inCourse / Math.max(capacity, 1)) * 100);

  return (
    <Document title={`priori - Modo Squad - ${orgName}`} author="priori">
      <Page size="A4" style={s.page}>
        <View style={s.headerBar}>
          <View style={s.logoRow}>
            <View style={{ gap: 2 }}>
              <View style={s.bar1} /><View style={s.bar2} /><View style={s.bar3} />
            </View>
            <Text style={s.wordmark}>priori</Text>
          </View>
          <Text style={s.headerTitle}>Modo Squad - {orgName}</Text>
          <Text style={s.headerDate}>{date}</Text>
        </View>

        <View style={s.body}>
          <View style={s.statsRow}>
            {[
              { val: String(active.length), label: "Proyectos activos" },
              { val: String(inCourse),      label: "En curso" },
              { val: String(capacity),      label: `Cap. (${devN} devs x ${devP})` },
              { val: `${occ}%`,             label: "Ocupacion" },
            ].map(({ val, label }) => (
              <View key={label} style={s.statBox}>
                <Text style={s.statVal}>{val}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {(["p1", "p2", "p3", "p0"] as const).map(q => {
            const meta  = QUADRANT_META[q];
            const items = projects.filter(p => p.quadrant === q);
            if (items.length === 0) return null;
            return (
              <View key={q} style={s.section}>
                <View style={[s.sectionHead, { backgroundColor: meta.color }]}>
                  <Text style={s.sectionPrio}>{meta.priority}</Text>
                  <Text style={s.sectionLbl}>{meta.label}</Text>
                  <Text style={s.sectionCount}>{items.length} proyecto{items.length !== 1 ? "s" : ""}</Text>
                </View>
                {items.map(p => {
                  const pct = p.effort_sprints > 0
                    ? Math.min(100, Math.round((p.sprints_completed / p.effort_sprints) * 100))
                    : 0;
                  return (
                    <View key={p.id} style={s.row}>
                      {p.slice_label && <Text style={[s.rowMeta, { color: BLUE, flexShrink: 0 }]}>{p.slice_label}</Text>}
                      <Text style={s.rowName}>{p.name}</Text>
                      {p.stakeholder && <Text style={s.rowMeta}>{p.stakeholder}</Text>}
                      <Text style={s.rowMeta}>{p.effort_sprints}sp</Text>
                      <View style={s.progressBg}>
                        <View style={[s.progressFg, { width: `${pct}%`, backgroundColor: meta.color }]} />
                      </View>
                      <Text style={[s.rowBadge, { backgroundColor: meta.bg, color: meta.color }]}>
                        {p.squad_status === "curso" ? "En curso" : "Backlog"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>priori - La claridad de priorizar bien.</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
