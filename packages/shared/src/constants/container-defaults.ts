import { ContainerType } from '../types/container';

export interface ContainerDefaults {
  label: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  maxWeightLbs: number;
}

export const CONTAINER_DEFAULTS: Record<string, ContainerDefaults> = {
  [ContainerType.UBOX]: {
    label: 'U-Box',
    lengthIn: 95,
    widthIn: 56,
    heightIn: 83,
    maxWeightLbs: 2000,
  },
  [ContainerType.TOTE_27GAL]: {
    label: '27-Gallon Tote',
    lengthIn: 24,
    widthIn: 16,
    heightIn: 14,
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
