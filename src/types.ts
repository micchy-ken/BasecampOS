export type GearCategory = 'Tent' | 'Tarp' | 'Chair' | 'Table' | 'Lantern' | 'Cooking' | 'Bedding' | 'Baggage' | 'Storage' | 'Other';
export type GearShape = 'rectangle' | 'circle' | 'hexagon' | 'octagon' | 'triangle' | 'diamond' | 'custom';

export interface GearItem {
  id: string;
  name: string;
  brand: string;
  category: GearCategory;
  packedWidth: number;  // cm
  packedDepth: number;  // cm
  packedHeight: number; // cm
  expandedWidth: number;  // cm
  expandedDepth: number;  // cm
  expandedHeight: number; // cm
  weight: number;      // kg
  description: string;
  parentId: string;    // 'unassigned' | 'vehicle' | baggageId | storageContainerId
  shape?: GearShape;
  customPolygon?: string; // Optional CSS clip-path polygon like "10% 0%, 90% 0%, 100% 100%, 0% 100%"
  notionPageId?: string;
  containerColor?: string; // HEX color for container (e.g. '#FF5C00')
  containerType?: string;  // type of container (soft_container, hard_container, bag, box, case, etc.)
}

export type VehicleType = 'aqua' | 'suv' | 'minivan' | 'custom';

export interface Vehicle {
  id: string;          // Unique ID
  type: VehicleType;
  name: string;
  width: number;       // cm
  depth: number;       // cm
  height: number;      // cm
  maxWeight: number;   // kg
  rearSeatMode: 'standard' | 'split' | 'flat'; // Normal vs folded seat configurations
  
  // Custom seating and cargo conversions sizes
  rearFoldedWidth?: number;
  rearFoldedDepth?: number;
  rearFoldedHeight?: number;
  
  subCompartmentsQuantity?: number; // Customizable divisions or compartments (def: 1)
}

export type BaggageType = 'soft_container' | 'hard_container' | 'totes' | 'box';

export interface Baggage {
  id: string;
  name: string;
  type: BaggageType;
  width: number;       // cm
  depth: number;       // cm
  height: number;      // cm
  color: string;       // HEX color
  parentId: 'unassigned' | 'vehicle' | 'rear_seat';
}

export type StorageType = 'bag' | 'box' | 'case';

export interface StorageContainer {
  id: string;
  name: string;
  type: StorageType;
  width: number;       // cm
  depth: number;       // cm
  height: number;      // cm
  color: string;       // HEX color
  parentId: 'unassigned' | 'vehicle' | string; // baggageId | 'vehicle' | 'unassigned'
}

export interface LayoutItem {
  id: string;
  gearId: string;
  x: number;          // cm inside custom sized plot
  y: number;          // cm
  rotation: number;   // degrees: 0, 90, 180, 270
  layoutParentId?: string; // 'campsite' or the layoutItemId of a Tent/Tarp
}

// Layout Profile model for saving and restoring layouts
export interface LayoutProfile {
  id: string;
  name: string;
  siteWidth: number;   // cm
  siteHeight: number;  // cm
  activePresetSite: 'forest' | 'lake' | 'grass';
  items: LayoutItem[];
}

// Backup model for maintaining independent packing per vehicle
export interface VehiclePackingState {
  vehicleId: string;
  rearSeatMode: 'standard' | 'split' | 'flat';
  baggages: Baggage[];
  storages: StorageContainer[];
  gearParentMap: { [gearId: string]: string }; // maps g.id -> parentId
  placedCoordinates: { [id: string]: { x: number; y: number; z?: number; rotated: boolean; rotationAxis?: 'none' | 'horizontal' | 'vertical_w_h' | 'vertical_d_h' | 'upside_down' } };
}
