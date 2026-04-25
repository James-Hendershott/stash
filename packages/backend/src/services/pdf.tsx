import ReactPDF, { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// ── Shared Styles ────────────────────────────────────────

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  timestamp: { fontSize: 8, color: '#94a3b8' },

  // Table styles
  table: { width: '100%' },
  tableHeader: {
    flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#1e293b',
    paddingBottom: 4, marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
    paddingVertical: 4, minHeight: 20,
  },
  th: { fontWeight: 'bold', fontSize: 8, color: '#64748b', textTransform: 'uppercase' as any },
  td: { fontSize: 9 },

  // Fate badge
  fateBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 8, fontWeight: 'bold' },

  // QR label styles
  labelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  labelCard: {
    width: '47%', border: '1 solid #d1d5db', borderRadius: 6,
    padding: 10, alignItems: 'center' as any, marginBottom: 12,
  },
  labelName: { fontSize: 11, fontWeight: 'bold', marginTop: 6, textAlign: 'center' as any },
  labelMeta: { fontSize: 8, color: '#64748b', marginTop: 2, textAlign: 'center' as any },
  labelQR: { width: 100, height: 100 },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1, border: '1 solid #e2e8f0', borderRadius: 6, padding: 10,
  },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  summaryLabel: { fontSize: 8, color: '#64748b', marginTop: 2 },
});

const FATE_COLORS: Record<string, { bg: string; text: string }> = {
  KEEP: { bg: '#dcfce7', text: '#16a34a' },
  SELL: { bg: '#ffedd5', text: '#ea580c' },
  DONATE: { bg: '#ede9fe', text: '#7c3aed' },
  TRASH: { bg: '#fee2e2', text: '#dc2626' },
  UNDECIDED: { bg: '#f3f4f6', text: '#6b7280' },
};

// ── Container Manifest PDF ───────────────────────────────

export async function generateManifestPdf(containerId: string): Promise<Buffer> {
  const container = await prisma.container.findUnique({
    where: { id: containerId },
    include: {
      item: { include: { originLocation: true, destinationLocation: true } },
      placements: {
        where: { removedAt: null },
        include: {
          item: {
            select: {
              name: true, fate: true, condition: true, quantity: true,
              lengthIn: true, widthIn: true, heightIn: true, weightLbs: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!container) throw new Error('Container not found');

  const totalWeight = container.placements.reduce((sum: number, p: any) => sum + (p.item.weightLbs || 0), 0);

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{container.label} — Manifest</Text>
          <Text style={styles.subtitle}>
            {container.item.name} · {container.containerType.replace(/_/g, ' ')} · {container.internalLengthIn}"L × {container.internalWidthIn}"W × {container.internalHeightIn}"H
          </Text>
          <Text style={styles.subtitle}>
            {container.item.originLocation?.name} → {container.item.destinationLocation?.name || 'Unassigned'}
          </Text>
          <Text style={styles.timestamp}>Generated {new Date().toLocaleString()}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{container.placements.length}</Text>
            <Text style={styles.summaryLabel}>Items</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{Math.round(totalWeight)} lbs</Text>
            <Text style={styles.summaryLabel}>Total Weight{container.maxWeightLbs ? ` / ${container.maxWeightLbs} max` : ''}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: '35%' }]}>Item</Text>
            <Text style={[styles.th, { width: '15%' }]}>Category</Text>
            <Text style={[styles.th, { width: '12%' }]}>Fate</Text>
            <Text style={[styles.th, { width: '12%' }]}>Condition</Text>
            <Text style={[styles.th, { width: '8%' }]}>Qty</Text>
            <Text style={[styles.th, { width: '18%' }]}>Dimensions</Text>
          </View>
          {container.placements.map((p: any) => {
            const fc = FATE_COLORS[p.item.fate] || FATE_COLORS.UNDECIDED;
            return (
              <View key={p.id} style={styles.tableRow}>
                <Text style={[styles.td, { width: '35%' }]}>{p.item.name}</Text>
                <Text style={[styles.td, { width: '15%' }]}>{p.item.category.name}</Text>
                <Text style={[styles.fateBadge, { width: '12%', backgroundColor: fc.bg, color: fc.text }]}>{p.item.fate}</Text>
                <Text style={[styles.td, { width: '12%' }]}>{p.item.condition}</Text>
                <Text style={[styles.td, { width: '8%' }]}>{p.item.quantity}</Text>
                <Text style={[styles.td, { width: '18%' }]}>
                  {p.item.lengthIn ? `${p.item.lengthIn}×${p.item.widthIn}×${p.item.heightIn}"` : '—'}
                </Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );

  return ReactPDF.renderToBuffer(doc);
}

// ── QR Label Sheet PDF ───────────────────────────────────

export async function generateQRLabelsPdf(containerIds?: string[]): Promise<Buffer> {
  const where = containerIds?.length ? { id: { in: containerIds } } : {};
  const containers = await prisma.container.findMany({
    where,
    include: {
      item: { include: { originLocation: true, destinationLocation: true } },
    },
    orderBy: { label: 'asc' },
  });

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>QR Code Labels</Text>
          <Text style={styles.subtitle}>{containers.length} containers · Print and cut along borders</Text>
          <Text style={styles.timestamp}>Generated {new Date().toLocaleString()}</Text>
        </View>

        <View style={styles.labelGrid}>
          {containers.map((c: any) => {
            const qrPath = c.qrCodePath ? path.join(config.dataPath, c.qrCodePath) : null;
            const hasQR = qrPath && fs.existsSync(qrPath);
            return (
              <View key={c.id} style={styles.labelCard}>
                {hasQR && <Image src={qrPath} style={styles.labelQR} />}
                <Text style={styles.labelName}>{c.label}</Text>
                <Text style={styles.labelMeta}>{c.item.name}</Text>
                <Text style={styles.labelMeta}>
                  {c.item.originLocation?.name} → {c.item.destinationLocation?.name || '?'}
                </Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );

  return ReactPDF.renderToBuffer(doc);
}

// ── Sell List PDF ────────────────────────────────────────

export async function generateSellListPdf(): Promise<Buffer> {
  const items = await prisma.item.findMany({
    where: { fate: 'SELL', deletedAt: null },
    include: {
      category: { select: { name: true } },
      originLocation: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const totalEstimated = items.reduce((sum: number, i: any) => sum + (i.estimatedSaleValue || 0), 0);
  const totalLLM = items.reduce((sum: number, i: any) => sum + (i.llmPriceSuggestion || 0), 0);

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Items to Sell</Text>
          <Text style={styles.subtitle}>{items.length} items · Est. total: ${totalEstimated.toLocaleString()} (AI total: ${totalLLM.toLocaleString()})</Text>
          <Text style={styles.timestamp}>Generated {new Date().toLocaleString()}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: '30%' }]}>Item</Text>
            <Text style={[styles.th, { width: '15%' }]}>Category</Text>
            <Text style={[styles.th, { width: '15%' }]}>Room</Text>
            <Text style={[styles.th, { width: '10%' }]}>Condition</Text>
            <Text style={[styles.th, { width: '15%' }]}>Your Est.</Text>
            <Text style={[styles.th, { width: '15%' }]}>AI Est.</Text>
          </View>
          {items.map((item: any) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, { width: '30%' }]}>{item.name}</Text>
              <Text style={[styles.td, { width: '15%' }]}>{item.category.name}</Text>
              <Text style={[styles.td, { width: '15%' }]}>{item.originLocation.name}</Text>
              <Text style={[styles.td, { width: '10%' }]}>{item.condition}</Text>
              <Text style={[styles.td, { width: '15%' }]}>{item.estimatedSaleValue ? `$${item.estimatedSaleValue}` : '—'}</Text>
              <Text style={[styles.td, { width: '15%' }]}>{item.llmPriceSuggestion ? `$${item.llmPriceSuggestion}` : '—'}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  return ReactPDF.renderToBuffer(doc);
}

// ── Donate List PDF ──────────────────────────────────────

export async function generateDonateListPdf(): Promise<Buffer> {
  const items = await prisma.item.findMany({
    where: { fate: 'DONATE', deletedAt: null },
    include: {
      category: { select: { name: true } },
      originLocation: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Items to Donate</Text>
          <Text style={styles.subtitle}>{items.length} items</Text>
          <Text style={styles.timestamp}>Generated {new Date().toLocaleString()}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: '35%' }]}>Item</Text>
            <Text style={[styles.th, { width: '20%' }]}>Category</Text>
            <Text style={[styles.th, { width: '20%' }]}>Room</Text>
            <Text style={[styles.th, { width: '12%' }]}>Condition</Text>
            <Text style={[styles.th, { width: '13%' }]}>Qty</Text>
          </View>
          {items.map((item: any) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, { width: '35%' }]}>{item.name}</Text>
              <Text style={[styles.td, { width: '20%' }]}>{item.category.name}</Text>
              <Text style={[styles.td, { width: '20%' }]}>{item.originLocation.name}</Text>
              <Text style={[styles.td, { width: '12%' }]}>{item.condition}</Text>
              <Text style={[styles.td, { width: '13%' }]}>{item.quantity}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  return ReactPDF.renderToBuffer(doc);
}
