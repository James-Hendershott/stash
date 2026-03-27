const FATE_COLORS: Record<string, { bg: string; text: string }> = {
  KEEP: { bg: '#dcfce7', text: '#16a34a' },
  SELL: { bg: '#ffedd5', text: '#ea580c' },
  DONATE: { bg: '#ede9fe', text: '#7c3aed' },
  TRASH: { bg: '#fee2e2', text: '#dc2626' },
  UNDECIDED: { bg: '#f3f4f6', text: '#6b7280' },
};

export function FateBadge({ fate }: { fate: string }) {
  const colors = FATE_COLORS[fate] || FATE_COLORS.UNDECIDED;
  return (
    <span
      className="fate-badge"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {fate}
    </span>
  );
}
