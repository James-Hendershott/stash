export enum ContainerType {
  UBOX = 'UBOX',
  TOTE_27GAL = 'TOTE_27GAL',
  BOX_SMALL = 'BOX_SMALL',
  BOX_MEDIUM = 'BOX_MEDIUM',
  BOX_LARGE = 'BOX_LARGE',
  BOX_CUSTOM = 'BOX_CUSTOM',
  CUSTOM = 'CUSTOM',
}

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
