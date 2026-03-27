import { Fate } from '../types/item';

export const FATE_COLORS: Record<Fate, string> = {
  [Fate.KEEP]: '#16A34A',
  [Fate.SELL]: '#F97316',
  [Fate.DONATE]: '#7C3AED',
  [Fate.TRASH]: '#DC2626',
  [Fate.UNDECIDED]: '#6B7280',
};
