import { ContainerType } from '../types/container';

export interface ContainerDefaults {
  label: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  maxWeightLbs: number;
}

// Internal dimensions (inches) — what fits INSIDE the container.
// HDX tote dims are from Home Depot product specs; measure your own
// totes and adjust if they differ. U-Haul U-Box dims from U-Haul spec.
export const CONTAINER_DEFAULTS: Record<string, ContainerDefaults> = {
  [ContainerType.UBOX]: {
    label: 'U-Haul U-Box',
    lengthIn: 95,
    widthIn: 56,
    heightIn: 83,
    maxWeightLbs: 2000,
  },
  [ContainerType.TOTE_35GAL]: {
    label: 'HDX 35-Gal Tote',
    lengthIn: 28,
    widthIn: 15,
    heightIn: 16,
    maxWeightLbs: 85,
  },
  [ContainerType.TOTE_27GAL]: {
    label: 'HDX 27-Gal Tote',
    lengthIn: 28.3,
    widthIn: 18.5,
    heightIn: 13.6,
    maxWeightLbs: 75,
  },
  [ContainerType.TOTE_14GAL]: {
    label: 'HDX 14-Gal Tote',
    lengthIn: 21,
    widthIn: 14,
    heightIn: 11.5,
    maxWeightLbs: 50,
  },
  [ContainerType.BOX_SMALL]: {
    label: 'Small Box',
    lengthIn: 16,
    widthIn: 12,
    heightIn: 12,
    maxWeightLbs: 40,
  },
  [ContainerType.BOX_MEDIUM]: {
    label: 'Medium Box',
    lengthIn: 18,
    widthIn: 18,
    heightIn: 16,
    maxWeightLbs: 50,
  },
  [ContainerType.BOX_LARGE]: {
    label: 'Large Box',
    lengthIn: 24,
    widthIn: 18,
    heightIn: 18,
    maxWeightLbs: 65,
  },
};
