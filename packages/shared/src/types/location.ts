export enum LocationType {
  ORIGIN = 'ORIGIN',
  DESTINATION = 'DESTINATION',
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  house: string;
  floor: string;
  color: string;
  floorPlanX: number | null;
  floorPlanY: number | null;
  floorPlanWidth: number | null;
  floorPlanHeight: number | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
