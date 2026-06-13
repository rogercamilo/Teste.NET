import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

export const s = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 68,
    paddingHorizontal: 52,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  orgName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    textAlign: "center",
  },
  divider: {
    width: "100%",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e3a5f",
    marginTop: 8,
    marginBottom: 8,
  },
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  docSubtitle: {
    fontSize: 9,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  fieldLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#6b7280",
    width: 148,
    flexShrink: 0,
  },
  fieldValue: {
    flex: 1,
    fontSize: 10,
    color: "#111827",
    lineHeight: 1.4,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.75,
    textAlign: "justify",
    marginBottom: 8,
  },
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 36,
    flexWrap: "wrap",
  },
  sigItem: {
    alignItems: "center",
    width: 155,
    marginTop: 8,
  },
  sigLine: {
    width: "100%",
    borderTopWidth: 0.5,
    borderTopColor: "#374151",
    marginBottom: 4,
  },
  sigLabel: {
    fontSize: 8,
    color: "#374151",
    textAlign: "center",
  },
  sigDate: {
    marginTop: 20,
    fontSize: 9,
    color: "#374151",
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 5,
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
  noteBox: {
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    borderRadius: 3,
    padding: 8,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: "#f9fafb",
  },
  noteText: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.5,
  },
});

export function Header({
  orgNome,
  titulo,
  subtitulo,
}: {
  orgNome: string;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <View style={s.header}>
      <Text style={s.orgName}>{orgNome.toUpperCase()}</Text>
      <View style={s.divider} />
      <Text style={s.docTitle}>{titulo.toUpperCase()}</Text>
      {subtitulo ? <Text style={s.docSubtitle}>{subtitulo}</Text> : null}
    </View>
  );
}

export function Secao({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children.toUpperCase()}</Text>;
}

export function Campo({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <View style={s.row}>
      <Text style={s.fieldLabel}>{label}:</Text>
      <Text style={s.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

export function Paragrafo({ children }: { children: string }) {
  return <Text style={s.paragraph}>{children}</Text>;
}

export function Assinaturas({ items }: { items: string[] }) {
  return (
    <View style={s.sigRow}>
      {items.map((item) => (
        <View key={item} style={s.sigItem}>
          <View style={s.sigLine} />
          <Text style={s.sigLabel}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function DataLocal({ geradoEm }: { geradoEm: string }) {
  return (
    <Text style={s.sigDate}>
      {"Local e data: _________________________________,  _____ / _____ / _______"}
    </Text>
  );
}

export function Footer({
  orgNome,
  geradoEm,
}: {
  orgNome: string;
  geradoEm: string;
}) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{orgNome}</Text>
      <Text style={s.footerText}>Gerado em {geradoEm}</Text>
    </View>
  );
}

/** Converte valor desconhecido para string não-vazia ou undefined */
export function val(v: unknown): string | undefined {
  const str = v !== undefined && v !== null ? String(v).trim() : "";
  return str || undefined;
}
