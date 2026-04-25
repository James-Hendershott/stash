export enum ContainerType {
  UBOX = 'UBOX',
  TOTE_35GAL = 'TOTE_35GAL',
  TOTE_27GAL = 'TOTE_27GAL',
  TOTE_14GAL = 'TOTE_14GAL',
  BOX_SMALL = 'BOX_SMALL',
  BOX_MEDIUM = 'BOX_MEDIUM',
  BOX_LARGE = 'BOX_LARGE',
  BOX_CUSTOM = 'BOX_CUSTOM',
  CUSTOM = 'CUSTOM',
}

// Auto-generated container code prefix per type. Format: {PREFIX}-{NNNN}
// Codes are unique across the whole DB (Container.label has a UNIQUE
// constraint). Adjust prefix here and the codes use it on next create.
export const CONTAINER_CODE_PREFIX: Record<ContainerType, string> = {
  [ContainerType.UBOX]: 'UBX',
  [ContainerType.TOTE_35GAL]: 'T35',
  [ContainerType.TOTE_27GAL]: 'T27',
  [ContainerType.TOTE_14GAL]: 'T14',
  [ContainerType.BOX_SMALL]: 'BXS',
  [ContainerType.BOX_MEDIUM]: 'BXM',
  [ContainerType.BOX_LARGE]: 'BXL',
  [ContainerType.BOX_CUSTOM]: 'BXC',
  [ContainerType.CUSTOM]: 'CST',
};

export interface Container {
  id: string;
  itemId: string;
  containerType: ContainerType;
  label: string;
  internalLengthIn: number;
  internalWidthIn: number;
  internalHeightIn: number;
  maxWeightLbs: number | null;
  qrCodePath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemPlacement {
  id: string;
  itemId: string;
  containerId: string;
  placedById: string;
  placedAt: Date;
  removedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
