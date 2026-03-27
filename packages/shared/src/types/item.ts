export enum Condition {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export enum Fate {
  KEEP = 'KEEP',
  SELL = 'SELL',
  DONATE = 'DONATE',
  TRASH = 'TRASH',
  UNDECIDED = 'UNDECIDED',
}

export enum ShapeType {
  BOX = 'BOX',
  CYLINDER = 'CYLINDER',
  SPHERE = 'SPHERE',
  L_SHAPE = 'L_SHAPE',
  PANEL = 'PANEL',
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  condition: Condition;
  quantity: number;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  weightLbs: number | null;
  shapeType: ShapeType;
  fate: Fate;
  originLocationId: string;
  destinationLocationId: string | null;
  photoPath: string | null;
  qrCodePath: string | null;
  isContainer: boolean;
  estimatedSaleValue: number | null;
  llmPriceSuggestion: number | null;
  llmPriceRationale: string | null;
  llmPricePlatforms: string[] | null;
  llmPriceGeneratedAt: Date | null;
  notes: string | null;
  addedById: string;
  lastModifiedById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
