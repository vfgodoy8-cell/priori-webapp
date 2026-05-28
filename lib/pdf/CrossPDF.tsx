import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const ORANGE = "#E8621A";
const BLACK  = "#111111";
const GRAY   = "#6B6B6B";
const GREEN  = "#1D9E75";
const BLUE   = "#1E6FC5";
const RED    = "#E24B4A";

const Q_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const Q_SUB    = ["Ene-Mar", "Abr-Jun", "Jul-Sep", "Oct-Dic"];

export type PdfTeam = {
  id: string; name: string; personas: number; proy_per_persona: number;
  q1_pct: number; q2_pct: number; q3_pct: number; q4_pct: number;
};

export type PdfInitiative = {
  id: string; name: string; stakeholder: string | null;
  effort_sprints: number; duration_quarters: number; q_start: number | null;
  team_ids: string[]; quadrant: "p0" | "p1" | "p2" | "p3";
};

const QUAD_COLOR: Record<string, string> = { p1: GREEN, p2: BLUE, p3: GRAY, p0: RED };
const QUAD_LABEL: Record<string, string> = { p1: "P1", p2: "P2", p3: "P3", p0: "P0" };

type Props = { orgName: string; date: string; teams: PdfTeam[]; initiatives: PdfInitiative[] };

function teamCap(team: PdfTeam, q: number) {
  const pcts = [team.q1_pct, team.q2_pct, team.q3_pct, team.q4_pct];
  return Math.floor(team.personas * team.proy_per_persona * (pcts[q] / 100));
}

function teamUsed(initiatives: PdfInitiative[], teamId: string, q: number) {
  return initiatives.filter(
    i => i.q_start !== null && i.team_ids.includes(teamId) &&
         i.q_start <= q && i.q_start + i.duration_quarters - 1 >= q
  ).length;
}

function capColor(pct: number) {
  return pct >= 100 ? RED : pct >= 95 ? ORANGE : pct >= 90 ? "#EF9F27" : GREEN;
}

const s = StyleSheet.create({
  page:          { backgroundColor: "#ffffff", paddingBottom: 32 },
  headerBar:     { backgroundColor: ORANGE, paddingHorizontal: 24, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle:   { color: "#fff", fontSize: 11, fontWeight: "bold" },
  headerDate:    { color: "#fff", fontSize: 9 },
  logoRow:       { flexDirection: "row", alignItems: "center", gap: 6 },
  bar1:          { width: 20, height: 4, borderRadius: 2, backgroundColor: "#fff" },
  bar2:          { width: 13, height: 4, borderRadius: 2, backgroundColor: "#fff", opacity: 0.65 },
  bar3:          { width: 8,  height: 4, borderRadius: 2, backgroundColor: "#fff", opacity: 0.30 },
  wordmark:      { color: "#fff", fontSize: 13, fontWeight: "bold" },
  body:          { paddingHorizontal: 24, paddingTop: 16 },
  sectionTitle:  { fontSize: 9, fontWeight: "bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  timelineHead:  { flexDirection: "row", marginBottom: 2 },
  qCol:          { flex: 1, alignItems: "center", paddingVertical: 5, backgroundColor: "#F9FAFB", border: "1 solid #E5E7EB" },
  qLabel:        { fontSize: 9, fontWeight: "bold", color: BLACK },
  qSub:          { fontSize: 7, color: GRAY },
  iniRow:        { flexDirection: "row", minHeight: 28, marginBottom: 3 },
  iniCard:       { borderRadius: 4, padding: 4, justifyContent: "center" },
  iniName:       { fontSize: 8, fontWeight: "bold", color: BLACK },
  iniMeta:       { fontSize: 7, color: GRAY },
  capTable:      { marginTop: 16 },
  capHeadRow:    { flexDirection: "row", backgroundColor: "#F9FAFB", borderTop: "1 solid #E5E7EB", borderLeft: "1 solid #E5E7EB" },
  capRow:        { flexDirection: "row", borderLeft: "1 solid #E5E7EB" },
  capTeamCell:   { width: 110, padding: 5, borderRight: "1 solid #E5E7EB", borderBottom: "1 solid #E5E7EB" },
  capQCell:      { flex: 1, padding: 5, alignItems: "center", borderRight: "1 solid #E5E7EB", borderBottom: "1 solid #E5E7EB" },
  capTxt:        { fontSize: 8, color: BLACK },
  capHeadTxt:    { fontSize: 8, fontWeight: "bold", color: GRAY },
  progressBg:    { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, overflow: "hidden", marginBottom: 2 },
  progressFg:    { height: 4, borderRadius: 2 },
  backlogSection:{ marginTop: 16 },
  backlogRow:    { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  backlogChip:   { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  backlogTxt:    { fontSize: 8, fontWeight: "bold" },
  footer:        { position: "absolute", bottom: 12, left: 24, right: 24, flexDirection: "row", justifyContent: "space-between" },
  footerTxt:     { fontSize: 7, color: GRAY },
});

export function CrossPDF({ orgName, date, teams, initiatives }: Props) {
  const placed  = initiatives.filter(i => i.q_start !== null);
  const backlog = initiatives.filter(i => i.q_start === null);

  return (
    <Document title={`priori - Modo Cross - ${orgName}`} author="priori™">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.headerBar}>
          <View style={s.logoRow}>
            <View style={{ gap: 2 }}>
              <View style={s.bar1} /><View style={s.bar2} /><View style={s.bar3} />
            </View>
            <Text style={s.wordmark}>priori</Text>
          </View>
          <Text style={s.headerTitle}>Planificacion del Programa - {orgName}</Text>
          <Text style={s.headerDate}>{date}</Text>
        </View>

        <View style={s.body}>
          <Text style={s.sectionTitle}>Timeline Q1-Q4</Text>

          <View style={s.timelineHead}>
            <View style={{ width: 120 }} />
            {Q_LABELS.map((q, i) => (
              <View key={q} style={s.qCol}>
                <Text style={s.qLabel}>{q}</Text>
                <Text style={s.qSub}>{Q_SUB[i]}</Text>
              </View>
            ))}
          </View>

          {placed.map(ini => {
            const color  = QUAD_COLOR[ini.quadrant] ?? GRAY;
            const label  = QUAD_LABEL[ini.quadrant] ?? "";
            const qStart = ini.q_start!;
            const span   = Math.min(ini.duration_quarters, 4 - qStart);
            const cells: React.ReactNode[] = [];
            for (let q = 0; q < 4; q++) {
              if (q < qStart || q >= qStart + span) {
                cells.push(<View key={q} style={{ flex: 1 }} />);
              } else if (q === qStart) {
                cells.push(
                  <View key={q} style={[s.iniCard, { flex: span, backgroundColor: `${color}18`, border: `1.5 solid ${color}55` }]}>
                    <Text style={s.iniName}>{label} {ini.name}</Text>
                    <Text style={s.iniMeta}>{ini.stakeholder ? `${ini.stakeholder} · ` : ""}{ini.effort_sprints}sp</Text>
                  </View>
                );
              }
            }
            return (
              <View key={ini.id} style={s.iniRow}>
                <View style={{ width: 120, justifyContent: "center", paddingLeft: 4 }}>
                  <Text style={{ fontSize: 7, color: GRAY }}>
                    {Q_LABELS[qStart]}-{Q_LABELS[Math.min(3, qStart + span - 1)]}
                  </Text>
                </View>
                {cells}
              </View>
            );
          })}

          {teams.length > 0 && (
            <View style={s.capTable}>
              <Text style={s.sectionTitle}>Capacidad por equipo</Text>
              <View style={s.capHeadRow}>
                <View style={s.capTeamCell}><Text style={s.capHeadTxt}>Equipo</Text></View>
                {Q_LABELS.map(q => (
                  <View key={q} style={s.capQCell}><Text style={s.capHeadTxt}>{q}</Text></View>
                ))}
              </View>
              {teams.map(team => (
                <View key={team.id} style={s.capRow}>
                  <View style={s.capTeamCell}>
                    <Text style={[s.capTxt, { fontWeight: "bold" }]}>{team.name}</Text>
                  </View>
                  {[0, 1, 2, 3].map(q => {
                    const cap  = teamCap(team, q);
                    const used = teamUsed(initiatives, team.id, q);
                    const pct  = cap === 0 ? 0 : Math.min(100, Math.round((used / cap) * 100));
                    const col  = capColor(pct);
                    return (
                      <View key={q} style={s.capQCell}>
                        <View style={s.progressBg}>
                          <View style={[s.progressFg, { width: `${pct}%`, backgroundColor: col }]} />
                        </View>
                        <Text style={[s.capTxt, { color: col, fontWeight: "bold" }]}>{used}/{cap} ({pct}%)</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {backlog.length > 0 && (
            <View style={s.backlogSection}>
              <Text style={s.sectionTitle}>Backlog ({backlog.length} sin asignar)</Text>
              <View style={s.backlogRow}>
                {backlog.map(ini => {
                  const color = QUAD_COLOR[ini.quadrant] ?? GRAY;
                  const label = QUAD_LABEL[ini.quadrant] ?? "";
                  return (
                    <View key={ini.id} style={[s.backlogChip, { backgroundColor: `${color}18`, border: `1 solid ${color}55` }]}>
                      <Text style={[s.backlogTxt, { color }]}>{label} {ini.name} - {ini.duration_quarters}Q</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>priori™ — La claridad de priorizar bien.</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
