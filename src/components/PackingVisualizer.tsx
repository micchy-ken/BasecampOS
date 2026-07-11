import React, { useState, useRef, useEffect } from 'react';
import { GearItem, Vehicle, Baggage, StorageContainer, GearCategory, GearShape } from '../types';
import GearEditModal from './GearEditModal';
import { 
  Truck, 
  Layers, 
  Archive, 
  Package, 
  Plus, 
  ChevronRight, 
  HelpCircle, 
  Sparkles, 
  Trash2, 
  AlertTriangle,
  RotateCw,
  Info
} from 'lucide-react';

interface PackingVisualizerProps {
  gears: GearItem[];
  vehicles: Vehicle[];
  currentVehicle: Vehicle;
  setCurrentVehicle: (vehicle: Vehicle) => void;
  onUpdateVehicleSeatMode: (mode: 'standard' | 'split' | 'flat') => void;
  onAddCustomVehicle: (newVehicle: Omit<Vehicle, 'id' | 'rearSeatMode'>) => void;
  onRemoveCustomVehicle: (id: string) => void;
  onRestoreDefaultVehicles?: () => void;
  baggages: Baggage[];
  onAddBaggage: (baggage: Omit<Baggage, 'id'>) => void;
  onRemoveBaggage: (id: string) => void;
  onUpdateBaggageParent: (id: string, parentId: 'unassigned' | 'vehicle' | 'rear_seat') => void;
  onUpdateBaggage?: (bag: Baggage) => void;
  storages: StorageContainer[];
  onAddStorage: (storage: Omit<StorageContainer, 'id'>) => void;
  onRemoveStorage: (id: string) => void;
  onUpdateStorageParent: (id: string, parentId: 'unassigned' | 'vehicle' | string) => void;
  onUpdateGearParent: (id: string, parentId: string) => void;
  onUpdateGear: (gear: GearItem) => void;
  placedCoordinates: PlacedCoordinates;
  setPlacedCoordinates: React.Dispatch<React.SetStateAction<PlacedCoordinates>>;
}

// Custom coordinate locations for placed bags in trunk (top-down view simulation)
interface PlacedCoordinates {
  [id: string]: { 
    x: number; 
    y: number; 
    z?: number;
    rotated: boolean; 
    rotationAxis?: 'none' | 'horizontal' | 'vertical_w_h' | 'vertical_d_h' | 'upside_down';
  };
}

// Map physical 3D block face to the original physical face of the cargo item
const getOriginalFaceType = (
  physFace: 'bottom' | 'top' | 'front' | 'back' | 'left' | 'right',
  rotAxis: 'none' | 'horizontal' | 'vertical_w_h' | 'vertical_d_h' | 'upside_down'
): 'TOP' | 'BOTTOM' | 'SIDE' => {
  if (rotAxis === 'upside_down') {
    if (physFace === 'top') return 'BOTTOM';
    if (physFace === 'bottom') return 'TOP';
    return 'SIDE';
  }
  if (rotAxis === 'vertical_w_h') {
    // Width is swapped with Height (tipped over around Y axis)
    if (physFace === 'top' || physFace === 'bottom') return 'SIDE';
    if (physFace === 'left') return 'TOP';
    if (physFace === 'right') return 'BOTTOM';
    return 'SIDE';
  }
  if (rotAxis === 'vertical_d_h') {
    // Depth is swapped with Height (tipped over around X axis)
    if (physFace === 'top' || physFace === 'bottom') return 'SIDE';
    if (physFace === 'back') return 'TOP';
    if (physFace === 'front') return 'BOTTOM';
    return 'SIDE';
  }
  // none or horizontal
  if (physFace === 'top') return 'TOP';
  if (physFace === 'bottom') return 'BOTTOM';
  return 'SIDE';
};

// Color shading tool for 3D box drawing
const shadeColor = (color: string, factor: number) => {
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(4, 6), 16) * factor)));
  
  const rs = r.toString(16).padStart(2, '0');
  const gs = g.toString(16).padStart(2, '0');
  const bs = b.toString(16).padStart(2, '0');
  return `#${rs}${gs}${bs}`;
};

export default function PackingVisualizer({
  gears,
  vehicles,
  currentVehicle,
  setCurrentVehicle,
  onUpdateVehicleSeatMode,
  onAddCustomVehicle,
  onRemoveCustomVehicle,
  onRestoreDefaultVehicles,
  baggages,
  onAddBaggage,
  onRemoveBaggage,
  onUpdateBaggageParent,
  onUpdateBaggage,
  storages,
  onAddStorage,
  onRemoveStorage,
  onUpdateStorageParent,
  onUpdateGearParent,
  onUpdateGear,
  placedCoordinates,
  setPlacedCoordinates,
}: PackingVisualizerProps) {
  // States for adding custom vehicle
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehName, setNewVehName] = useState('');
  const [newVehW, setNewVehW] = useState(120);
  const [newVehD, setNewVehD] = useState(100);
  const [newVehH, setNewVehH] = useState(85);
  const [newVehMaxWeight, setNewVehMaxWeight] = useState(250);

  // States for adding baggage
  const [showAddBaggage, setShowAddBaggage] = useState(false);
  const [newBagName, setNewBagName] = useState('');
  const [newBagType, setNewBagType] = useState<Baggage['type']>('hard_container');
  const [newBagW, setNewBagW] = useState(50);
  const [newBagD, setNewBagD] = useState(38);
  const [newBagH, setNewBagH] = useState(33);
  const [newBagColor, setNewBagColor] = useState('#FF5C00');

  // States for adding storage
  const [showAddStorage, setShowAddStorage] = useState(false);
  const [newStorageName, setNewStorageName] = useState('');
  const [newStorageType, setNewStorageType] = useState<StorageContainer['type']>('bag');
  const [newStorageW, setNewStorageW] = useState(30);
  const [newStorageD, setNewStorageD] = useState(20);
  const [newStorageH, setNewStorageH] = useState(15);
  const [newStorageColor, setNewStorageColor] = useState('#22C55E');
  const [newStorageParent, setNewStorageParent] = useState<string>('vehicle'); // 'vehicle' or baggageId

  // Active baggage or container selected for inspecting nested gears
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [editingGear, setEditingGear] = useState<GearItem | null>(null);
  const [editingBaggage, setEditingBaggage] = useState<Baggage | null>(null);

  const getStorageName = (pId: string): string => {
    if (pId === 'unassigned') return '未パッキング';
    if (pId === 'vehicle') return '車両トランク直積み';
    const baggage = baggages.find(b => b.id === pId);
    if (baggage) return baggage.name;
    const storageItem = storages.find(s => s.id === pId);
    if (storageItem) return storageItem.name;
    return 'その他';
  };

  // 3D visualizer mode & camera orbiting states
  const [visualizerMode, setVisualizerMode] = useState<'2d' | '3d'>('2d');
  const [yaw, setYaw] = useState<number>(-35);
  const [pitch, setPitch] = useState<number>(25);
  const [zoom, setZoom] = useState<number>(1.15);

  // Tetris style Dropping packing system states
  const [droppingItemId, setDroppingItemId] = useState<string | null>(null);
  const [droppingX, setDroppingX] = useState<number>(40); // 40% centered initially
  const [droppingY, setDroppingY] = useState<number>(40);
  const [droppingRotation, setDroppingRotation] = useState<'none' | 'horizontal' | 'vertical_w_h' | 'vertical_d_h' | 'upside_down'>('none');
  
  // 2D view directions state ('top' | 'back')
  const [viewDirection2D, setViewDirection2D] = useState<'top' | 'back'>('top');

  // Calculate exact stacking coordinate Z-height (in cm) when dropped like Tetris blocks
  const computeStackingZValue = (itemId: string, xPercent: number, yPercent: number, rotationAxis: 'none' | 'horizontal' | 'vertical_w_h' | 'vertical_d_h' | 'upside_down') => {
    const isBaggage = itemId.startsWith('baggage-');
    let itemW = 30;
    let itemD = 30;
    let itemH = 30;

    if (isBaggage) {
      const b = baggages.find(x => x.id === itemId);
      if (b) {
        itemW = b.width; itemD = b.depth; itemH = b.height;
      }
    } else {
      const g = gears.find(x => x.id === itemId);
      if (g) {
        itemW = g.packedWidth || 30;
        itemD = g.packedDepth || 30;
        itemH = g.packedHeight || 30;
      }
    }

    let w = itemW;
    let d = itemD;
    let h = itemH;

    if (rotationAxis === 'horizontal') {
      w = itemD; d = itemW;
    } else if (rotationAxis === 'vertical_w_h') {
      w = itemH; d = itemD; h = itemW;
    } else if (rotationAxis === 'vertical_d_h') {
      w = itemW; d = itemH; h = itemD;
    }

    const xa1 = (xPercent / 100.0) * activeWidth;
    const xa2 = xa1 + w;
    const ya1 = (yPercent / 100.0) * activeDepth;
    const ya2 = ya1 + d;

    let maxZ_cm = 0;

    const otherPlacedItems = cargoItems.filter(other => other.id !== itemId && placedCoordinates[other.id]);

    otherPlacedItems.forEach(other => {
      const otherPos = placedCoordinates[other.id];
      if (!otherPos) return;

      const xb1 = (otherPos.x / 100.0) * activeWidth;
      const xb2 = xb1 + other.width;
      const yb1 = (otherPos.y / 100.0) * activeDepth;
      const yb2 = yb1 + other.depth;
      
      const zb1 = ((otherPos.z || 0) / 100.0) * Math.max(0, activeHeight - other.height);
      const zb2 = zb1 + other.height;

      const overlapX = Math.max(0, Math.min(xa2, xb2) - Math.max(xa1, xb1));
      const overlapY = Math.max(0, Math.min(ya2, yb2) - Math.max(ya1, yb1));

      if (overlapX > 1.0 && overlapY > 1.0) {
        if (zb2 > maxZ_cm) {
          maxZ_cm = zb2;
        }
      }
    });

    const limitExceeded = (maxZ_cm + h) > activeHeight;
    return { zValue: maxZ_cm, limitExceeded, finalHeight: h, finalWidth: w, finalDepth: d };
  };

  const handleConfirmDrop = (itemId: string) => {
    const { zValue, finalHeight } = computeStackingZValue(itemId, droppingX, droppingY, droppingRotation);
    const denominator = Math.max(1, activeHeight - finalHeight);
    const zPercent = Math.min(100, Math.max(0, Math.round((zValue / denominator) * 100)));

    setPlacedCoordinates(prev => ({
      ...prev,
      [itemId]: {
        x: Math.round(droppingX),
        y: Math.round(droppingY),
        z: zPercent,
        rotationAxis: droppingRotation,
        rotated: droppingRotation === 'horizontal'
      }
    }));

    const isBaggage = itemId.startsWith('baggage-');
    if (isBaggage) {
      const b = baggages.find(x => x.id === itemId);
      if (b && b.parentId === 'unassigned') {
        onUpdateBaggageParent(itemId, 'vehicle');
      }
    } else {
      const g = gears.find(x => x.id === itemId);
      if (g && g.parentId === 'unassigned') {
        onUpdateGearParent(itemId, 'vehicle');
      }
    }

    setDroppingItemId(null);
    setSelectedContainerId(itemId);
  };

  const handleUpdateBaggageParentWrap = (id: string, parentId: 'unassigned' | 'vehicle' | 'rear_seat') => {
    if (parentId === 'unassigned') {
      setPlacedCoordinates(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (droppingItemId === id) setDroppingItemId(null);
    } else {
      if (!placedCoordinates[id]) {
        setDroppingItemId(id);
        setDroppingX(40);
        setDroppingY(40);
        setDroppingRotation('none');
      }
    }
    onUpdateBaggageParent(id, parentId);
  };

  const handleUpdateGearParentWrap = (id: string, parentId: string) => {
    if (parentId === 'unassigned') {
      setPlacedCoordinates(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (droppingItemId === id) setDroppingItemId(null);
    } else {
      if (!placedCoordinates[id]) {
        setDroppingItemId(id);
        setDroppingX(40);
        setDroppingY(40);
        setDroppingRotation('none');
      }
    }
    onUpdateGearParent(id, parentId);
  };

  const get2DDimensions = () => {
    return computeSpace2DDimensions(activeWidth, viewDirection2D === 'top' ? activeDepth : activeHeight, viewDirection2D);
  };

  const computeSpace2DDimensions = (wCm: number, hCm: number, view: 'top' | 'back') => {
    const maxW = 500;
    const maxH = 340;
    const ratio = hCm / wCm;
    
    let wPx = maxW;
    let hPx = maxW * ratio;
    if (hPx > maxH) {
      hPx = maxH;
      wPx = maxH / ratio;
    }
    
    if (view === 'top') {
      return { widthPx: wPx, heightPx: hPx, xLabel: '車幅 (X方向)', yLabel: '奥行 (Y方向)', maxWcm: wCm, maxHcm: hCm };
    } else {
      return { widthPx: wPx, heightPx: hPx, xLabel: '車幅 (X方向)', yLabel: '高さ (Z方向)', maxWcm: wCm, maxHcm: hCm };
    }
  };

  // Quick preset sizes templates
  const applyBaggagePreset = (preset: 'thor' | 'soft' | 'tote' | 'box') => {
    if (preset === 'thor') {
      setNewBagName('Trust THOR 75L');
      setNewBagType('hard_container');
      setNewBagW(71);
      setNewBagD(43);
      setNewBagH(38);
      setNewBagColor('#2F3E46');
    } else if (preset === 'soft') {
      setNewBagName('ソフトコンテナ M');
      setNewBagType('soft_container');
      setNewBagW(40);
      setNewBagD(30);
      setNewBagH(28);
      setNewBagColor('#B56B45');
    } else if (preset === 'tote') {
      setNewBagName('スノーピーク トートM');
      setNewBagType('totes');
      setNewBagW(48);
      setNewBagD(25);
      setNewBagH(35);
      setNewBagColor('#A0522D');
    } else if (preset === 'box') {
      setNewBagName('折りたたみキャリーbox');
      setNewBagType('box');
      setNewBagW(50);
      setNewBagD(35);
      setNewBagH(30);
      setNewBagColor('#4A5568');
    }
  };

  const applyStoragePreset = (preset: 'peg' | 'mess' | 'pouch') => {
    if (preset === 'peg') {
      setNewStorageName('ペグ・ツールケース');
      setNewStorageType('case');
      setNewStorageW(35);
      setNewStorageD(15);
      setNewStorageH(14);
      setNewStorageColor('#1E293B');
    } else if (preset === 'mess') {
      setNewStorageName('クッカー収納袋');
      setNewStorageType('bag');
      setNewStorageW(22);
      setNewStorageD(22);
      setNewStorageH(20);
      setNewStorageColor('#D97706');
    } else if (preset === 'pouch') {
      setNewStorageName('調味料ボックス');
      setNewStorageType('box');
      setNewStorageW(25);
      setNewStorageD(18);
      setNewStorageH(18);
      setNewStorageColor('#A21CAF');
    }
  };

  // Calculations and Helper lists
  const baggageItemsInVehicle = () => baggages.filter(b => b.parentId === 'vehicle');
  const baggageItemsInRearSeat = () => baggages.filter(b => b.parentId === 'rear_seat');

  const storageItemsInVehicle = () => storages.filter(s => {
    if (s.parentId === 'vehicle') return true;
    if (s.parentId.startsWith('baggage-')) {
      const bag = baggages.find(b => b.id === s.parentId);
      return bag && bag.parentId === 'vehicle';
    }
    return false;
  });

  const storageItemsInRearSeat = () => storages.filter(s => {
    if (s.parentId === 'rear_seat') return true;
    if (s.parentId.startsWith('baggage-')) {
      const bag = baggages.find(b => b.id === s.parentId);
      return bag && bag.parentId === 'rear_seat';
    }
    return false;
  });

  const packedBaggages = [...baggageItemsInVehicle(), ...baggageItemsInRearSeat()];
  const packedStorages = [...storageItemsInVehicle(), ...storageItemsInRearSeat()];
  const directGearsInVehicle = gears.filter(g => g.parentId === 'vehicle' && g.category !== 'Baggage' && g.category !== 'Storage');
  const directGearsInRearSeat = gears.filter(g => g.parentId === 'rear_seat' && g.category !== 'Baggage' && g.category !== 'Storage');

  // Compute total weights of everything in the vehicle (both trunk and rear seat)
  const totalWeightInVehicle = gears.reduce((sum, g) => {
    let isPackedInVehicle = false;
    if (g.parentId === 'vehicle' || g.parentId === 'rear_seat') {
      isPackedInVehicle = true;
    } else if (g.parentId.startsWith('storage-')) {
      const parentStorage = storages.find(s => s.id === g.parentId);
      if (parentStorage) {
        if (parentStorage.parentId === 'vehicle' || parentStorage.parentId === 'rear_seat') {
          isPackedInVehicle = true;
        } else if (parentStorage.parentId.startsWith('baggage-')) {
          const grandBaggage = baggages.find(b => b.id === parentStorage.parentId);
          if (grandBaggage && (grandBaggage.parentId === 'vehicle' || grandBaggage.parentId === 'rear_seat')) {
            isPackedInVehicle = true;
          }
        }
      }
    } else if (g.parentId.startsWith('baggage-')) {
      const parentBaggage = baggages.find(b => b.id === g.parentId);
      if (parentBaggage && (parentBaggage.parentId === 'vehicle' || parentBaggage.parentId === 'rear_seat')) {
        isPackedInVehicle = true;
      }
    }
    return isPackedInVehicle ? sum + g.weight : sum;
  }, 0);

  // Active dimensions based on seat mode
  const getActiveWidth = (v: Vehicle) => {
    const seatMode = v.rearSeatMode || 'standard';
    if (seatMode === 'split' || seatMode === 'flat') {
      return v.rearFoldedWidth || v.width;
    }
    return v.width;
  };

  const getActiveDepth = (v: Vehicle) => {
    const seatMode = v.rearSeatMode || 'standard';
    if (seatMode === 'split' || seatMode === 'flat') {
      const folded = v.rearFoldedDepth || (v.depth + 75);
      if (v.rearFoldedDepth !== undefined && v.rearFoldedDepth <= v.depth && v.rearFoldedDepth > 0) {
        // user likely inputted only the extra depth of the rear seat, not the total length
        return v.depth + v.rearFoldedDepth;
      }
      return folded;
    }
    return v.depth;
  };

  const getActiveHeight = (v: Vehicle) => {
    const seatMode = v.rearSeatMode || 'standard';
    if (seatMode === 'split' || seatMode === 'flat') {
      return v.rearFoldedHeight || v.height;
    }
    return v.height;
  };

  const activeWidth = getActiveWidth(currentVehicle);
  const activeDepth = getActiveDepth(currentVehicle);
  const activeHeight = getActiveHeight(currentVehicle);

  const handleCreateCustomVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehName.trim()) return;
    onAddCustomVehicle({
      type: 'custom',
      name: newVehName.trim(),
      width: Number(newVehW) || 110,
      depth: Number(newVehD) || 90,
      height: Number(newVehH) || 80,
      maxWeight: Number(newVehMaxWeight) || 250
    });
    setNewVehName('');
    setShowAddVehicle(false);
  };

  // Calculate volume percentages
  const vehicleVolume = activeWidth * activeDepth * activeHeight;
  
  const totalBaggagesVolume = packedBaggages.reduce((sum, b) => sum + (b.width * b.depth * b.height), 0);
  const directStoragesVolume = storages.filter(s => s.parentId === 'vehicle' || s.parentId === 'rear_seat').reduce((sum, s) => sum + (s.width * s.depth * s.height), 0);
  const directGearsVolume = [...directGearsInVehicle, ...directGearsInRearSeat].reduce((sum, g) => sum + (g.packedWidth * g.packedDepth * g.packedHeight), 0);
  const packedVolumeSum = totalBaggagesVolume + directStoragesVolume + directGearsVolume;
  
  const volumePercentage = Math.min(100, Math.round((packedVolumeSum / vehicleVolume) * 100));

  // Consolidated top-level placed items for 3D render and physics simulations
  const cargoItems = [
    ...packedBaggages.map(b => {
      const pos = placedCoordinates[b.id] || { x: 15, y: 15, rotated: false };
      const rotationMode = pos.rotationAxis || (pos.rotated ? 'horizontal' : 'none');
      
      let iw = b.width;
      let id = b.depth;
      let ih = b.height;
      if (rotationMode === 'horizontal') {
        iw = b.depth; id = b.width;
      } else if (rotationMode === 'vertical_w_h') {
        iw = b.height; id = b.depth; ih = b.width;
      } else if (rotationMode === 'vertical_d_h') {
        iw = b.width; id = b.height; ih = b.depth;
      }

      // Sum own contents weights + container structural weight roughly
      const gearsInBag = gears.filter(g => {
        if (g.parentId === b.id) return true;
        if (g.parentId.startsWith('storage-')) {
          const s = storages.find(st => st.id === g.parentId);
          return s && s.parentId === b.id;
        }
        return false;
      });
      const totalBagWeight = gearsInBag.reduce((sum, g) => sum + g.weight, 0) + 1.8; // empty container weight
      
      return {
        id: b.id,
        parentId: b.parentId,
        name: b.name,
        width: iw,
        depth: id,
        height: ih,
        weight: totalBagWeight,
        color: b.color,
        xPercent: pos.x,
        yPercent: pos.y,
        zPercent: pos.z || 0,
        type: 'baggage' as const
      };
    }),
    ...[...directGearsInVehicle, ...directGearsInRearSeat].map(g => {
      const pos = placedCoordinates[g.id] || { x: 30, y: 30, rotated: false };
      const rotationMode = pos.rotationAxis || (pos.rotated ? 'horizontal' : 'none');
      
      let iw = g.packedWidth || 30;
      let id = g.packedDepth || 30;
      let ih = g.packedHeight || 30;
      if (rotationMode === 'horizontal') {
        iw = g.packedDepth || 30; id = g.packedWidth || 30;
      } else if (rotationMode === 'vertical_w_h') {
        iw = g.packedHeight || 30; id = g.packedDepth || 30; ih = g.packedWidth || 30;
      } else if (rotationMode === 'vertical_d_h') {
        iw = g.packedWidth || 30; id = g.packedHeight || 30; ih = g.packedDepth || 30;
      }

      const categoryColors: { [key: string]: string } = {
        Tent: '#1F2937', Tarp: '#064E3B', Chair: '#5F370E', Table: '#1E3A8A',
        Lantern: '#D97706', Cooking: '#991B1B', Bedding: '#312E81', Other: '#374151'
      };
      const color = categoryColors[g.category] || '#78350F';

      return {
        id: g.id,
        parentId: g.parentId,
        name: g.name,
        width: iw,
        depth: id,
        height: ih,
        weight: g.weight,
        color,
        xPercent: pos.x,
        yPercent: pos.y,
        zPercent: pos.z || 0,
        type: 'gear' as const
      };
    })
  ];

  // Mathematical center of gravity (重心バランス) calculation using mass vectors
  const topLevelTotalWeight = cargoItems.reduce((sum, item) => sum + item.weight, 0);

  let cgX_cm = activeWidth / 2;
  let cgY_cm = activeDepth / 2;
  let cgZ_cm = activeHeight / 2;
  
  let leftSideWeightCalculated = 0;
  let rightSideWeightCalculated = 0;
  let frontSideWeightCalculated = 0;
  let backSideWeightCalculated = 0;
  let upperSideWeightCalculated = 0;
  let lowerSideWeightCalculated = 0;

  if (topLevelTotalWeight > 0) {
    let weightedX = 0;
    let weightedY = 0;
    let weightedZ = 0;

    cargoItems.forEach(item => {
      const itemX_cm = (item.xPercent / 100.0) * activeWidth + item.width / 2;
      let itemY_cm = (item.yPercent / 100.0) * activeDepth + item.depth / 2;
      
      if (currentVehicle.rearSeatMode === 'split') {
        const trunkDepth = currentVehicle.depth;
        const rearSeatDepth = Math.max(0, activeDepth - trunkDepth - 10);
        if (item.parentId === 'rear_seat') {
          itemY_cm = (item.yPercent / 100.0) * rearSeatDepth + item.depth / 2;
        } else {
          itemY_cm = (rearSeatDepth + 10) + (item.yPercent / 100.0) * trunkDepth + item.depth / 2;
        }
      }

      const itemZ_cm = (item.zPercent / 100.0) * (activeHeight - item.height) + item.height / 2;

      weightedX += item.weight * itemX_cm;
      weightedY += item.weight * itemY_cm;
      weightedZ += item.weight * itemZ_cm;

      if (itemX_cm < activeWidth / 2) {
        leftSideWeightCalculated += item.weight;
      } else {
        rightSideWeightCalculated += item.weight;
      }

      if (itemY_cm < activeDepth / 2) {
        frontSideWeightCalculated += item.weight;
      } else {
        backSideWeightCalculated += item.weight;
      }

      if (itemZ_cm > activeHeight / 2) {
        upperSideWeightCalculated += item.weight;
      } else {
        lowerSideWeightCalculated += item.weight;
      }
    });

    cgX_cm = weightedX / topLevelTotalWeight;
    cgY_cm = weightedY / topLevelTotalWeight;
    cgZ_cm = weightedZ / topLevelTotalWeight;
  }

  const leftWeightPercent = (leftSideWeightCalculated + rightSideWeightCalculated) > 0
    ? Math.round((leftSideWeightCalculated / (leftSideWeightCalculated + rightSideWeightCalculated)) * 100)
    : 50;
  const rightWeightPercent = 100 - leftWeightPercent;

  const frontWeightPercent = (frontSideWeightCalculated + backSideWeightCalculated) > 0
    ? Math.round((frontSideWeightCalculated / (frontSideWeightCalculated + backSideWeightCalculated)) * 100)
    : 50;
  const backWeightPercent = 100 - frontWeightPercent;

  const upperWeightPercent = (upperSideWeightCalculated + lowerSideWeightCalculated) > 0
    ? Math.round((upperSideWeightCalculated / (upperSideWeightCalculated + lowerSideWeightCalculated)) * 100)
    : 10;

  // 3D helper projection algorithm
  const project_3d = (x3d: number, y3d: number, z3d: number, w: number, h: number) => {
    // Rotation Angles in Radians
    const radYaw = (yaw * Math.PI) / 180;
    const radPitch = ((90 - pitch) * Math.PI) / 180;

    // Z-axial rotation (Yaw)
    const rx1 = x3d * Math.cos(radYaw) - y3d * Math.sin(radYaw);
    const ry1 = x3d * Math.sin(radYaw) + y3d * Math.cos(radYaw);
    const rz1 = z3d;

    // X-axial rotation (Pitch)
    const rx2 = rx1;
    const ry2 = ry1 * Math.cos(radPitch) - rz1 * Math.sin(radPitch);
    const rz2 = ry1 * Math.sin(radPitch) + rz1 * Math.cos(radPitch);

    // Sizing projection bounding scaling
    const maxBound = Math.max(activeWidth, activeDepth, activeHeight, 100);
    const scale = (Math.min(w, h) * 0.62 / maxBound) * zoom;

    // Translate origin to centered viewport
    const screenX = w / 2 + rx2 * scale;
    const screenY = h / 2.0 - rz2 * scale;

    return { x: screenX, y: screenY, depth: -ry2 };
  };

  // 3D Canvas tap/click selection handler
  const handleCanvasClick = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((clientY - rect.top) / rect.height) * canvas.height;

    const hw = activeWidth / 2;
    const hd = activeDepth / 2;
    const hh = activeHeight / 2;

    let closestItem: typeof cargoItems[0] | null = null;
    let minDistance = 60; // Max select radius in pixels

    cargoItems.forEach(item => {
      const leftX = (item.xPercent / 100.0) * activeWidth;
      const topY = (item.yPercent / 100.0) * activeDepth;
      const floorZ = (item.zPercent / 100.0) * Math.max(0, activeHeight - item.height);

      const cx = -hw + leftX + item.width / 2;
      const cy = -hd + topY + item.depth / 2;
      const cz = -hh + floorZ + item.height / 2;

      const p = project_3d(cx, cy, cz, canvas.width, canvas.height);
      const dx = clickX - p.x;
      const dy = clickY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        minDistance = dist;
        closestItem = item;
      }
    });

    if (closestItem) {
      setSelectedContainerId((closestItem as any).id);
    } else {
      setSelectedContainerId(null);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleCanvasClick(e.clientX, e.clientY);
  };

  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartPos.x;
      const dy = touch.clientY - touchStartPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        handleCanvasClick(touch.clientX, touch.clientY);
      }
    }
  };

  // Interactive HTML5 3D projection engine
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Refresh backdrop
    ctx.clearRect(0, 0, width, height);

    // Deep modern slate sky background
    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, width, height);

    // Grid backdrop for spatial cues
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.08)';
    ctx.lineWidth = 1.0;
    const gap = 24;
    for (let x = 0; x < width; x += gap) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gap) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Canvas coordinate projecting helper
    const project = (x3d: number, y3d: number, z3d: number) => {
      return project_3d(x3d, y3d, z3d, width, height);
    };

    // Render operations queue (Painter's depth-sort backdrop)
    interface RenderUnit {
      depth: number;
      draw: () => void;
    }
    const renderQueue: RenderUnit[] = [];

    const hw = activeWidth / 2;
    const hd = activeDepth / 2;
    const hh = activeHeight / 2;

    // Luggage Boundary Corners
    const floor0 = { x: -hw, y: -hd, z: -hh };
    const floor1 = { x: hw, y: -hd, z: -hh };
    const floor2 = { x: hw, y: hd, z: -hh };
    const floor3 = { x: -hw, y: hd, z: -hh };

    const roof0 = { x: -hw, y: -hd, z: hh };
    const roof1 = { x: hw, y: -hd, z: hh };
    const roof2 = { x: hw, y: hd, z: hh };
    const roof3 = { x: -hw, y: hd, z: hh };

    // A. Drawing vehicle interior carpet bottom grid floor
    const steps = 6;
    for (let c = 0; c <= steps; c++) {
      const stepW = -hw + (activeWidth / steps) * c;
      const stepD = -hd + (activeDepth / steps) * c;

      // Horizontal lines
      renderQueue.push({
        depth: 90000,
        draw: () => {
          const pS = project(stepW, -hd, -hh);
          const pE = project(stepW, hd, -hh);
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.28)'; // Translucent indigo
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pS.x, pS.y); ctx.lineTo(pE.x, pE.y); ctx.stroke();
        }
      });

      // Vertical lines
      renderQueue.push({
        depth: 90000,
        draw: () => {
          const pS = project(-hw, stepD, -hh);
          const pE = project(hw, stepD, -hh);
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.28)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pS.x, pS.y); ctx.lineTo(pE.x, pE.y); ctx.stroke();
        }
      });
    }

    // B. Rear backseat barrier wall
    const backsFaceDepth = (floor0.y + floor1.y + roof0.y + roof1.y) / 4;
    renderQueue.push({
      depth: project(0, -hd, 0).depth + 100, // backseat is always drawn towards seat side
      draw: () => {
        // Linear colored back seat gradient representation
        const p0 = project(floor0.x, floor0.y, floor0.z);
        const p1 = project(floor1.x, floor1.y, floor1.z);
        const p2 = project(roof1.x, roof1.y, roof1.z);
        const p3 = project(roof0.x, roof0.y, roof0.z);

        ctx.fillStyle = 'rgba(165, 180, 252, 0.12)';
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.75)';
        ctx.lineWidth = 2.0;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#6366F1';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const labelText = (currentVehicle.rearSeatMode === 'standard')
          ? '💺 後部座席 (Rear Seat Barrier)'
          : '💺 運転席・助手席 (Front Driver/Passenger Seats)';
        
        ctx.fillText(labelText, (p0.x + p1.x)/2, (p0.y + p3.y)/2);
      }
    });

    // B2. Intermediate partition wall representing backrest of rear seats under 'split' mode
    const rearSeatDepthForBackrest = Math.max(0, activeDepth - currentVehicle.depth - 10);
    if (currentVehicle.rearSeatMode === 'split' && activeDepth > currentVehicle.depth) {
      const midY = -hd + rearSeatDepthForBackrest + 5; // Center of the 10cm backrest zone
      
      renderQueue.push({
        depth: project(0, midY, 0).depth + 50, // depth-sorting coordinate
        draw: () => {
          const p0 = project(-hw, midY, -hh);
          const p1 = project(hw, midY, -hh);
          const p2 = project(hw, midY, hh);
          const p3 = project(-hw, midY, hh);

          // Draw the partition wall in a distinct style (translucent indigo screen representing 10cm thickness)
          ctx.fillStyle = 'rgba(79, 70, 229, 0.22)';
          ctx.strokeStyle = '#4F46E5';
          ctx.lineWidth = 4.0; // thicker for 10cm feel

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Label center of partition
          ctx.fillStyle = '#4F46E5';
          ctx.font = 'bold 9.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3.0;
          ctx.strokeText('💺 後部座席背もたれ (厚み10cm)', (p0.x + p1.x)/2, (p0.y + p3.y)/2);
          ctx.fillText('💺 後部座席背もたれ (厚み10cm)', (p0.x + p1.x)/2, (p0.y + p3.y)/2);
        }
      });
    }

    // C. Structural box boundaries
    const wireframes = [
      [floor1, floor2], [floor2, floor3], [floor3, floor0],
      [roof1, roof2], [roof2, roof3], [roof3, roof0],
      [floor0, roof0], [floor1, roof1], [floor2, roof2], [floor3, roof3]
    ];
    wireframes.forEach(([ptA, ptB]) => {
      const segmentDepth = (project(ptA.x, ptA.y, ptA.z).depth + project(ptB.x, ptB.y, ptB.z).depth) / 2;
      renderQueue.push({
        depth: segmentDepth + 10,
        draw: () => {
          const pA = project(ptA.x, ptA.y, ptA.z);
          const pB = project(ptB.x, ptB.y, ptB.z);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.05;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    });

    // D. Cargo Items Rendering
    cargoItems.forEach(item => {
      const isSelected = selectedContainerId === item.id;
      const pos = placedCoordinates[item.id] || { x: 15, y: 15, z: 0, rotated: false, rotationAxis: 'none' };
      const rotationMode = pos.rotationAxis || (pos.rotated ? 'horizontal' : 'none');
      
      const leftX = (item.xPercent / 100.0) * activeWidth;
      const topY = (item.yPercent / 100.0) * activeDepth;
      const floorZ = (item.zPercent / 100.0) * Math.max(0, activeHeight - item.height);

      const cx = -hw + leftX + item.width / 2;
      const cy = -hd + topY + item.depth / 2;
      const cz = -hh + floorZ + item.height / 2;

      // 8 vertex points for solid blocks
      const v = [
        { x: cx - item.width/2, y: cy - item.depth/2, z: cz - item.height/2 },
        { x: cx + item.width/2, y: cy - item.depth/2, z: cz - item.height/2 },
        { x: cx + item.width/2, y: cy + item.depth/2, z: cz - item.height/2 },
        { x: cx - item.width/2, y: cy + item.depth/2, z: cz - item.height/2 },
        { x: cx - item.width/2, y: cy - item.depth/2, z: cz + item.height/2 },
        { x: cx + item.width/2, y: cy - item.depth/2, z: cz + item.height/2 },
        { x: cx + item.width/2, y: cy + item.depth/2, z: cz + item.height/2 },
        { x: cx - item.width/2, y: cy + item.depth/2, z: cz + item.height/2 }
      ];

      // Front facing shading definitions
      const faces = [
        { indices: [0, 1, 2, 3], scale: 0.50, label: 'bottom' },
        { indices: [4, 5, 6, 7], scale: 1.05, label: 'top' },
        { indices: [0, 1, 5, 4], scale: 0.88, label: 'front' },
        { indices: [2, 3, 7, 6], scale: 0.72, label: 'back' },
        { indices: [0, 3, 7, 4], scale: 0.62, label: 'left' },
        { indices: [1, 2, 6, 5], scale: 0.55, label: 'right' }
      ];

      faces.forEach(f => {
        const pCorners = f.indices.map(i => v[i]);
        const pProj = pCorners.map(pt => project(pt.x, pt.y, pt.z));
        const avgDepth = pProj.reduce((sum, p) => sum + p.depth, 0) / 4;

        renderQueue.push({
          depth: avgDepth,
          draw: () => {
            const originalFace = getOriginalFaceType(f.label as any, rotationMode);
            
            // Adjust brightness based on the original face type
            let faceScale = f.scale;
            if (originalFace === 'TOP') {
              faceScale = f.scale * 1.15; // Make the top slightly brighter!
            } else if (originalFace === 'BOTTOM') {
              faceScale = f.scale * 0.82; // Make the bottom slightly darker/matted
            }

            let faceColor = shadeColor(item.color, faceScale);
            const isUpsideDown = (f.label === 'top' && originalFace === 'BOTTOM');

            // If the item is upside down (its physical top face is the original bottom),
            // paint it with high contrast warning colors (reddish gradient/solid warning)
            if (isUpsideDown) {
              faceColor = '#EF4444'; // Solid warning red
            }

            ctx.fillStyle = faceColor;
            ctx.strokeStyle = isSelected ? '#FF5C00' : 'rgba(0, 0, 0, 0.85)';
            ctx.lineWidth = isSelected ? 3.0 : 1.25;

            ctx.beginPath();
            ctx.moveTo(pProj[0].x, pProj[0].y);
            ctx.lineTo(pProj[1].x, pProj[1].y);
            ctx.lineTo(pProj[2].x, pProj[2].y);
            ctx.lineTo(pProj[3].x, pProj[3].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Label text over Top Face only to look polished
            if (f.label === 'top') {
              const tx = pProj.reduce((sum, p) => sum + p.x, 0) / 4;
              const ty = pProj.reduce((sum, p) => sum + p.y, 0) / 4;

              // Top face indicator labels
              let orientationLabel = '天 面';
              let labelColor = '#6EE7B7'; // Bright mint green for correct upright
              
              if (originalFace === 'SIDE') {
                orientationLabel = '側 面';
                labelColor = '#FDE047'; // Soft warning yellow for sideways
              } else if (originalFace === 'BOTTOM') {
                orientationLabel = '⚠️底面 (逆さま)';
                labelColor = '#FF8A8A'; // High-contrast red/pink alert text
              }

              // Draw orientation indicator tag
              ctx.font = 'bold 7.5px sans-serif';
              ctx.fillStyle = labelColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 2.0;
              ctx.strokeText(orientationLabel, tx, ty - 11);
              ctx.fillText(orientationLabel, tx, ty - 11);

              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 8.5px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 2.5;
              ctx.strokeText(item.name.slice(0, 14), tx, ty);
              ctx.fillText(item.name.slice(0, 14), tx, ty);

              ctx.font = 'bold 7px font-mono';
              ctx.fillStyle = '#CCCCCC';
              ctx.strokeText(`${item.width}×${item.depth}×${item.height}cm`, tx, ty + 10);
              ctx.fillText(`${item.width}×${item.depth}×${item.height}cm`, tx, ty + 10);
            }
          }
        });
      });
    });

    // Tetris-like Dropping Guide wireframe/ghost render stage
    if (droppingItemId) {
      const { zValue, finalHeight, finalWidth, finalDepth } = (() => {
        const isBaggage = droppingItemId.startsWith('baggage-');
        let itemW = 30; let itemD = 30; let itemH = 30;
        if (isBaggage) {
          const b = baggages.find(x => x.id === droppingItemId);
          if (b) { itemW = b.width; itemD = b.depth; itemH = b.height; }
        } else {
          const g = gears.find(x => x.id === droppingItemId);
          if (g) { itemW = g.packedWidth || 30; itemD = g.packedDepth || 30; itemH = g.packedHeight || 30; }
        }

        let w = itemW; let d = itemD; let h = itemH;
        if (droppingRotation === 'horizontal') { w = itemD; d = itemW; }
        else if (droppingRotation === 'vertical_w_h') { w = itemH; d = itemD; h = itemW; }
        else if (droppingRotation === 'vertical_d_h') { w = itemW; d = itemH; h = itemD; }

        const { zValue } = computeStackingZValue(droppingItemId, droppingX, droppingY, droppingRotation);
        return { zValue, finalHeight: h, finalWidth: w, finalDepth: d };
      })();

      const leftX = (droppingX / 100.0) * activeWidth;
      const topY = (droppingY / 100.0) * activeDepth;
      const denom = Math.max(1, activeHeight - finalHeight);
      const computedZPercent = Math.min(100, Math.max(0, (zValue / denom) * 100));
      const floorZ = (computedZPercent / 100.0) * Math.max(0, activeHeight - finalHeight);

      const cx = -hw + leftX + finalWidth / 2;
      const cy = -hd + topY + finalDepth / 2;
      const cz = -hh + floorZ + finalHeight / 2;

      // 8 vertex points for the ghost container
      const v = [
        { x: cx - finalWidth/2, y: cy - finalDepth/2, z: cz - finalHeight/2 },
        { x: cx + finalWidth/2, y: cy - finalDepth/2, z: cz - finalHeight/2 },
        { x: cx + finalWidth/2, y: cy + finalDepth/2, z: cz - finalHeight/2 },
        { x: cx - finalWidth/2, y: cy + finalDepth/2, z: cz - finalHeight/2 },
        { x: cx - finalWidth/2, y: cy - finalDepth/2, z: cz + finalHeight/2 },
        { x: cx + finalWidth/2, y: cy - finalDepth/2, z: cz + finalHeight/2 },
        { x: cx + finalWidth/2, y: cy + finalDepth/2, z: cz + finalHeight/2 },
        { x: cx - finalWidth/2, y: cy + finalDepth/2, z: cz + finalHeight/2 }
      ];

      const faces = [
        { indices: [0, 1, 2, 3], scale: 0.50, label: 'bottom' },
        { indices: [4, 5, 6, 7], scale: 1.05, label: 'top' },
        { indices: [0, 1, 5, 4], scale: 0.88, label: 'front' },
        { indices: [2, 3, 7, 6], scale: 0.72, label: 'back' },
        { indices: [0, 3, 7, 4], scale: 0.62, label: 'left' },
        { indices: [1, 2, 6, 5], scale: 0.55, label: 'right' }
      ];

      faces.forEach(f => {
        const pCorners = f.indices.map(i => v[i]);
        const pProj = pCorners.map(pt => project(pt.x, pt.y, pt.z));
        const avgDepth = pProj.reduce((sum, p) => sum + p.depth, 0) / 4;

        renderQueue.push({
          depth: avgDepth - 200, // draw on top of static elements in preview
          draw: () => {
            ctx.fillStyle = 'rgba(255, 92, 0, 0.18)'; 
            ctx.strokeStyle = 'rgba(255, 92, 0, 0.85)';
            ctx.lineWidth = 1.75;
            ctx.setLineDash([4, 4]);

            ctx.beginPath();
            ctx.moveTo(pProj[0].x, pProj[0].y);
            ctx.lineTo(pProj[1].x, pProj[1].y);
            ctx.lineTo(pProj[2].x, pProj[2].y);
            ctx.lineTo(pProj[3].x, pProj[3].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            if (f.label === 'top') {
              const tx = pProj.reduce((sum, p) => sum + p.x, 0) / 4;
              const ty = pProj.reduce((sum, p) => sum + p.y, 0) / 4;

              const originalFace = getOriginalFaceType(f.label as any, droppingRotation);

              ctx.fillStyle = '#FF5C00';
              ctx.font = 'bold 10px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 3.0;

              // Top face indicator labels
              let orientationLabel = '天面が上';
              if (originalFace === 'SIDE') {
                orientationLabel = '側面が上';
              } else if (originalFace === 'BOTTOM') {
                orientationLabel = '⚠️底面が上（逆さま）';
              }

              const guideName = (baggages.find(b => b.id === droppingItemId)?.name || gears.find(g => g.id === droppingItemId)?.name || '').slice(0, 15);
              ctx.strokeText(`🪂 落下予定 (${orientationLabel}): ${guideName}`, tx, ty - 5);
              ctx.fillText(`🪂 落下予定 (${orientationLabel}): ${guideName}`, tx, ty - 5);

              ctx.font = 'bold 8.5px font-mono';
              ctx.fillStyle = '#FFA16C';
              ctx.strokeText(`着地 Z: ${Math.round(zValue)}cm`, tx, ty + 7);
              ctx.fillText(`着地 Z: ${Math.round(zValue)}cm`, tx, ty + 7);
            }
          }
        });
      });
    }

    // E. 3D Floating pulsing center of gravity dot
    if (topLevelTotalWeight > 0) {
      const cgAbsX = -hw + cgX_cm;
      const cgAbsY = -hd + cgY_cm;
      const cgAbsZ = -hh + cgZ_cm;

      const cgProj = project(cgAbsX, cgAbsY, cgAbsZ);

      renderQueue.push({
        depth: cgProj.depth - 500, // draw on top of everything
        draw: () => {
          // Line leader to floor
          const floorProj = project(cgAbsX, cgAbsY, -hh);
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(cgProj.x, cgProj.y); ctx.lineTo(floorProj.x, floorProj.y); ctx.stroke();
          ctx.setLineDash([]);

          // Floor anchor disk
          ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
          ctx.beginPath(); ctx.arc(floorProj.x, floorProj.y, 6, 0, 2*Math.PI); ctx.fill();
          ctx.strokeStyle = '#10B981'; ctx.stroke();

          // Outer pulse glow
          ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
          ctx.beginPath(); ctx.arc(cgProj.x, cgProj.y, 10 + Math.sin(Date.now() / 150) * 3, 0, 2*Math.PI); ctx.fill();

          // Green Core dot
          ctx.fillStyle = '#10B981';
          ctx.beginPath(); ctx.arc(cgProj.x, cgProj.y, 5, 0, 2*Math.PI); ctx.fill();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cgProj.x - 12, cgProj.y); ctx.lineTo(cgProj.x + 12, cgProj.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cgProj.x, cgProj.y - 12); ctx.lineTo(cgProj.x, cgProj.y + 12); ctx.stroke();

          // Label text
          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 9.5px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.strokeText('🟢 重心 (3D COG Balance Center)', cgProj.x + 14, cgProj.y);
          ctx.fillText('🟢 重心 (3D COG Balance Center)', cgProj.x + 14, cgProj.y);
        }
      });
    }

    // F. Flush Painter queue
    renderQueue.sort((a, b) => b.depth - a.depth);
    renderQueue.forEach(u => u.draw());

  }, [yaw, pitch, zoom, activeWidth, activeDepth, activeHeight, placedCoordinates, selectedContainerId, cargoItems, droppingItemId, droppingX, droppingY, droppingRotation]);

  // Render bento graphics from 2D coordinates
  const renderBaggageItem = (bag: Baggage, spaceDims: any, isCovered?: boolean) => {
    const pos = placedCoordinates[bag.id] || { x: 15, y: 15, z: 0, rotated: false };
    const rotationMode = pos.rotationAxis || (pos.rotated ? 'horizontal' : 'none');
    const upFace = getOriginalFaceType('top', rotationMode);
    const facingFace = getOriginalFaceType(viewDirection2D === 'top' ? 'top' : 'back', rotationMode);

    // Rotate 3D dimensions
    let bWidth = bag.width;
    let bDepth = bag.depth;
    let bHeight = bag.height;

    if (rotationMode === 'horizontal') {
      bWidth = bag.depth; bDepth = bag.width;
    } else if (rotationMode === 'vertical_w_h') {
      bWidth = bag.height; bDepth = bag.depth; bHeight = bag.width;
    } else if (rotationMode === 'vertical_d_h') {
      bWidth = bag.width; bDepth = bag.height; bHeight = bag.depth;
    }

    let widthPct = 0;
    let heightPct = 0;

    if (viewDirection2D === 'top') {
      widthPct = (bWidth / spaceDims.maxWcm) * 100;
      heightPct = (bDepth / spaceDims.maxHcm) * 100;
    } else {
      // back view
      widthPct = (bWidth / spaceDims.maxWcm) * 100;
      heightPct = (bHeight / spaceDims.maxHcm) * 100;
    }

    const isSelected = selectedContainerId === bag.id;

    const styleObj: React.CSSProperties = {
      position: 'absolute',
      width: `max(20px, ${widthPct}%)`,
      height: `max(20px, ${heightPct}%)`,
      backgroundColor: bag.color,
      borderColor: upFace === 'BOTTOM' ? '#EF4444' : '#000055',
      borderStyle: upFace === 'BOTTOM' ? 'dashed' : 'solid',
      opacity: isCovered ? 0.35 : 1,
    };

    if (viewDirection2D === 'top') {
      styleObj.left = `${pos.x}%`;
      styleObj.top = `${pos.y}%`;
    } else {
      styleObj.left = `${pos.x}%`;
      styleObj.bottom = `${pos.z || 0}%`;
    }

    return (
      <div
        key={bag.id}
        style={styleObj}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedContainerId(isSelected ? null : bag.id);
        }}
        onMouseDown={(e) => handleDragMouseDown(e, bag.id)}
        onTouchStart={(e) => handleDragTouchStart(e, bag.id)}
        className={`absolute border-2 p-2 flex flex-col justify-between shadow-[2px_2px_0px_0px_#000] cursor-grab active:cursor-grabbing hover:shadow-[3px_3px_0px_0px_#000] text-white transition-all select-none group ${
          isSelected ? 'ring-4 ring-[#FF5C00] scale-102 font-sans z-[60] !opacity-100' : 'hover:scale-101 hover:z-[50] z-20'
        }`}
        title="ドラッグして配置。クリックで選択コントロール表示"
      >
        <div className="overflow-hidden pointer-events-none w-full h-full flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[7.5px] font-black tracking-tighter uppercase leading-none bg-black/65 px-1 py-0.5 rounded shrink-0">
              {bag.type === 'hard_container' ? '📦 ハード' : '👜 ソフト'}
            </span>
            {facingFace === 'TOP' && (
              <span className="text-[7px] font-black bg-emerald-600/90 text-white px-1 py-0.2 rounded leading-none shrink-0 border border-emerald-400/30">
                天面
              </span>
            )}
            {facingFace === 'SIDE' && (
              <span className="text-[7px] font-black bg-amber-600/95 text-white px-1 py-0.2 rounded leading-none shrink-0 border border-amber-400/30">
                側面
              </span>
            )}
            {facingFace === 'BOTTOM' && (
              <span className="text-[7px] font-black bg-red-600/95 text-white px-1 py-0.2 rounded leading-none shrink-0 border border-red-400/30 animate-pulse">
                ⚠️底面
              </span>
            )}
          </div>
          
          <p className="text-[10px] font-black truncate tracking-wide mt-1 leading-tight text-white drop-shadow">
            {bag.name}
          </p>
          
          <div className="text-[7.5px] opacity-95 font-mono mt-0.5 leading-none bg-black/15 p-0.5 rounded flex flex-col">
            <span className="font-bold truncate">寸: {bWidth}×{bDepth}×{bHeight}cm</span>
            <span className="opacity-85 truncate">位置: X={pos.x}%, Y={pos.y}%, Z={pos.z || 0}%</span>
          </div>
        </div>

        {/* Floating Controls to the right of Selected Luggage */}
        {isSelected && (
          <div 
            className="absolute left-full top-0 ml-1.5 flex flex-col gap-1.5 bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000] rounded z-[100] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Horizontal rotation */}
            <button
              type="button"
              onClick={() => {
                const nextRot = rotationMode === 'horizontal' ? 'none' : 'horizontal';
                handleAxisChange(bag.id, nextRot);
              }}
              className={`w-7 h-7 rounded border border-black flex items-center justify-center text-xs transition-all cursor-pointer ${
                rotationMode === 'horizontal' ? 'bg-[#FF5C00] text-white' : 'bg-white text-slate-800 hover:bg-slate-100'
              }`}
              title="🔄 横回転する (90度)"
            >
              🔄
            </button>
            
            {/* Vertical rotation */}
            <button
              type="button"
              onClick={() => {
                const isVert = rotationMode === 'vertical_w_h' || rotationMode === 'vertical_d_h';
                const nextRot = isVert ? 'none' : 'vertical_w_h';
                handleAxisChange(bag.id, nextRot);
              }}
              className={`w-7 h-7 rounded border border-black flex items-center justify-center text-xs transition-all cursor-pointer ${
                rotationMode === 'vertical_w_h' || rotationMode === 'vertical_d_h' ? 'bg-[#1E3A8A] text-white' : 'bg-white text-slate-800 hover:bg-slate-100'
              }`}
              title="↕️ 縦回転する"
            >
              ↕️
            </button>
            
            {/* Edit Spec */}
            <button
              type="button"
              onClick={() => {
                setEditingBaggage(bag);
              }}
              className="w-7 h-7 bg-white hover:bg-indigo-150 text-indigo-750 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              title="✏️ ペイント・寸法編集"
            >
              ✏️
            </button>
            
            {/* Split Seat Quick Move Button */}
            {currentVehicle.rearSeatMode === 'split' && (
              bag.parentId === 'rear_seat' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateBaggageParentWrap(bag.id, 'vehicle');
                  }}
                  className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer animate-pulse"
                  title="📦 トランク（荷室）へ簡単に移動"
                >
                  📦
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateBaggageParentWrap(bag.id, 'rear_seat');
                  }}
                  className="w-7 h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer animate-pulse"
                  title="🛋️ 後部座席へ簡単に移動"
                >
                  🛋️
                </button>
              )
            )}

            {/* Unload/Remove from vehicle */}
            <button
              type="button"
              onClick={() => {
                handleUpdateBaggageParentWrap(bag.id, 'unassigned');
                setSelectedContainerId(null);
              }}
              className="w-7 h-7 bg-white hover:bg-red-150 text-red-650 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              title="🗑️ 車から降ろす"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDirectGearItem = (gear: GearItem, spaceDims: any, isCovered?: boolean) => {
    const pos = placedCoordinates[gear.id] || { x: 30, y: 30, z: 0, rotated: false };
    const rotationMode = pos.rotationAxis || (pos.rotated ? 'horizontal' : 'none');
    const upFace = getOriginalFaceType('top', rotationMode);
    const facingFace = getOriginalFaceType(viewDirection2D === 'top' ? 'top' : 'back', rotationMode);

    // Rotate 3D dimensions
    let gWidth = gear.packedWidth || 30;
    let gDepth = gear.packedDepth || 30;
    let gHeight = gear.packedHeight || 30;

    if (rotationMode === 'horizontal') {
      gWidth = gear.packedDepth || 30;
      gDepth = gear.packedWidth || 30;
    } else if (rotationMode === 'vertical_w_h') {
      gWidth = gear.packedHeight || 30;
      gDepth = gear.packedDepth || 30;
      gHeight = gear.packedWidth || 30;
    } else if (rotationMode === 'vertical_d_h') {
      gWidth = gear.packedWidth || 30;
      gDepth = gear.packedHeight || 30;
      gHeight = gear.packedDepth || 30;
    }

    let widthPct = 0;
    let heightPct = 0;

    if (viewDirection2D === 'top') {
      widthPct = (gWidth / spaceDims.maxWcm) * 100;
      heightPct = (gDepth / spaceDims.maxHcm) * 100;
    } else {
      // back view
      widthPct = (gWidth / spaceDims.maxWcm) * 100;
      heightPct = (gHeight / spaceDims.maxHcm) * 100;
    }

    const isSelected = selectedContainerId === gear.id;

    const categoryColors: { [key: string]: string } = {
      Tent: '#1F2937', Chair: '#5F370E', Table: '#1E3A8A', Lantern: '#D97706', Cooking: '#991B1B', Bedding: '#312E81', Other: '#374151'
    };
    const color = categoryColors[gear.category] || '#78350F';

    const styleObj: React.CSSProperties = {
      position: 'absolute',
      width: `max(20px, ${widthPct}%)`,
      height: `max(20px, ${heightPct}%)`,
      backgroundColor: color,
      borderColor: upFace === 'BOTTOM' ? '#EF4444' : '#1E293B',
      borderStyle: upFace === 'BOTTOM' ? 'dashed' : 'solid',
      opacity: isCovered ? 0.35 : 1,
    };

    if (viewDirection2D === 'top') {
      styleObj.left = `${pos.x}%`;
      styleObj.top = `${pos.y}%`;
    } else {
      styleObj.left = `${pos.x}%`;
      styleObj.bottom = `${pos.z || 0}%`;
    }

    return (
      <div
        key={gear.id}
        style={styleObj}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedContainerId(isSelected ? null : gear.id);
        }}
        onMouseDown={(e) => handleDragMouseDown(e, gear.id)}
        onTouchStart={(e) => handleDragTouchStart(e, gear.id)}
        className={`absolute border-2 border-slate-900 p-2 flex flex-col justify-between shadow-[2px_2px_0px_0px_#000] cursor-grab active:cursor-grabbing hover:shadow-[3px_3px_0px_0px_#000] text-white transition-all select-none group ${
          isSelected ? 'ring-4 ring-[#FF5C00] scale-102 font-sans z-[60] !opacity-100' : 'hover:scale-101 hover:z-[50] z-20'
        }`}
        title="ドラッグして配置。クリックで選択コントロール表示"
      >
        <div className="overflow-hidden pointer-events-none w-full h-full flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[7.5px] font-black tracking-tighter uppercase leading-none bg-black/60 px-1 py-0.5 rounded shrink-0">
              直積み
            </span>
            {facingFace === 'TOP' && (
              <span className="text-[7px] font-black bg-emerald-600/90 text-white px-1 py-0.2 rounded leading-none shrink-0 border border-emerald-400/30">
                天面
              </span>
            )}
            {facingFace === 'SIDE' && (
              <span className="text-[7px] font-black bg-amber-600/95 text-white px-1 py-0.2 rounded leading-none shrink-0 border border-amber-400/30">
                側面
              </span>
            )}
            {facingFace === 'BOTTOM' && (
              <span className="text-[7px] font-black bg-red-600/95 text-white px-1 py-0.2 rounded leading-none shrink-0 border border-red-400/30 animate-pulse">
                ⚠️底面
              </span>
            )}
          </div>

          <p className="text-[10px] font-black truncate tracking-wide mt-1 leading-tight text-white drop-shadow">
            {gear.name}
          </p>

          <div className="text-[7.5px] opacity-95 font-mono mt-0.5 leading-none bg-black/15 p-0.5 rounded flex flex-col">
            <span className="font-bold truncate">寸: {gWidth}×{gDepth}×{gHeight}cm</span>
            <span className="opacity-80 shrink-0 truncate">{gear.brand} ({gear.category})</span>
          </div>
        </div>

        {/* Floating Controls to the right of Selected Gear */}
        {isSelected && (
          <div 
            className="absolute left-full top-0 ml-1.5 flex flex-col gap-1.5 bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000] rounded z-[100] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Horizontal rotation */}
            <button
              type="button"
              onClick={() => {
                const nextRot = rotationMode === 'horizontal' ? 'none' : 'horizontal';
                handleAxisChange(gear.id, nextRot);
              }}
              className={`w-7 h-7 rounded border border-black flex items-center justify-center text-xs transition-all cursor-pointer ${
                rotationMode === 'horizontal' ? 'bg-[#FF5C00] text-white' : 'bg-white text-slate-800 hover:bg-slate-100'
              }`}
              title="🔄 横回転する (90度)"
            >
              🔄
            </button>
            
            {/* Vertical rotation */}
            <button
              type="button"
              onClick={() => {
                const isVert = rotationMode === 'vertical_w_h' || rotationMode === 'vertical_d_h';
                const nextRot = isVert ? 'none' : 'vertical_w_h';
                handleAxisChange(gear.id, nextRot);
              }}
              className={`w-7 h-7 rounded border border-black flex items-center justify-center text-xs transition-all cursor-pointer ${
                rotationMode === 'vertical_w_h' || rotationMode === 'vertical_d_h' ? 'bg-[#1E3A8A] text-white' : 'bg-white text-slate-800 hover:bg-slate-100'
              }`}
              title="↕️ 縦回転する"
            >
              ↕️
            </button>
            
            {/* Edit Spec */}
            <button
              type="button"
              onClick={() => {
                setEditingGear(gear);
              }}
              className="w-7 h-7 bg-white hover:bg-indigo-150 text-indigo-750 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              title="✏️ スペック編集"
            >
              ✏️
            </button>
            
            {/* Split Seat Quick Move Button */}
            {currentVehicle.rearSeatMode === 'split' && (
              gear.parentId === 'rear_seat' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateGearParentWrap(gear.id, 'vehicle');
                  }}
                  className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer animate-pulse"
                  title="📦 トランク（荷室）へ簡単に移動"
                >
                  📦
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateGearParentWrap(gear.id, 'rear_seat');
                  }}
                  className="w-7 h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer animate-pulse"
                  title="🛋️ 後部座席へ簡単に移動"
                >
                  🛋️
                </button>
              )
            )}

            {/* Unload/Remove from vehicle */}
            <button
              type="button"
              onClick={() => {
                handleUpdateGearParentWrap(gear.id, 'unassigned');
                setSelectedContainerId(null);
              }}
              className="w-7 h-7 bg-white hover:bg-red-150 text-red-650 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              title="🗑️ 車から降ろす"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    );
  };

  // Handle baggage creations
  const handleCreateBaggage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBagName.trim()) return;
    onAddBaggage({
      name: newBagName,
      type: newBagType,
      width: Number(newBagW) || 30,
      depth: Number(newBagD) || 30,
      height: Number(newBagH) || 30,
      color: newBagColor,
      parentId: 'vehicle'
    });
    setNewBagName('');
    setShowAddBaggage(false);
  };

  // Handle storage container creations
  const handleCreateStorage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStorageName.trim()) return;
    onAddStorage({
      name: newStorageName,
      type: newStorageType,
      width: Number(newStorageW) || 20,
      depth: Number(newStorageD) || 20,
      height: Number(newStorageH) || 20,
      color: newStorageColor,
      parentId: newStorageParent as any
    });
    setNewStorageName('');
    setShowAddStorage(false);
  };

  // Edit Placed Coordinate position
  const updatePosition = (id: string, dx: number, dy: number) => {
    setPlacedCoordinates(prev => {
      const current = prev[id] || { x: 20, y: 20, z: 0, rotated: false };
      return {
        ...prev,
        [id]: {
          ...current,
          x: Math.max(0, Math.min(95, current.x + dx)),
          y: Math.max(0, Math.min(95, current.y + dy))
        }
      };
    });
  };

  const updateXPercent = (id: string, xVal: number) => {
    setPlacedCoordinates(prev => {
      const current = prev[id] || { x: 20, y: 20, z: 0, rotated: false };
      return {
        ...prev,
        [id]: {
          ...current,
          x: Math.max(0, Math.min(100, xVal))
        }
      };
    });
  };

  const updateYPercent = (id: string, yVal: number) => {
    setPlacedCoordinates(prev => {
      const current = prev[id] || { x: 20, y: 20, z: 0, rotated: false };
      return {
        ...prev,
        [id]: {
          ...current,
          y: Math.max(0, Math.min(100, yVal))
        }
      };
    });
  };

  const updateZPosition = (id: string, zVal: number) => {
    setPlacedCoordinates(prev => {
      const current = prev[id] || { x: 20, y: 20, z: 0, rotated: false };
      return {
        ...prev,
        [id]: {
          ...current,
          z: Math.max(0, Math.min(100, zVal))
        }
      };
    });
  };

  const handleAxisChange = (id: string, axis: 'none' | 'horizontal' | 'vertical_w_h' | 'vertical_d_h' | 'upside_down') => {
    setPlacedCoordinates(prev => {
      const current = prev[id] || { x: 20, y: 20, z: 0, rotated: false };
      return {
        ...prev,
        [id]: {
          ...current,
          rotationAxis: axis,
          rotated: axis === 'horizontal'
        }
      };
    });
  };

  const adjustParentOnMove = (itemId: string, finalYPercent: number) => {
    // Disabled: items are now separated visually into two different 2D planes
    return;
  };

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>, bagId: string) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    e.preventDefault();
    const element = e.currentTarget;
    const container = element.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const eleRect = element.getBoundingClientRect();
    const elWidthPct = (eleRect.width / rect.width) * 100;
    const elHeightPct = (eleRect.height / rect.height) * 100;

    const snapLinesX: number[] = [0, 100];
    const snapLinesYTopBased: number[] = [0, 100];

    const siblings = (Array.from(container.children) as HTMLElement[]).filter(c => c !== element && c.classList.contains('absolute') && c.classList.contains('cursor-grab'));
    siblings.forEach(sib => {
      const sRect = sib.getBoundingClientRect();
      const leftPct = ((sRect.left - rect.left) / rect.width) * 100;
      const rightPct = ((sRect.right - rect.left) / rect.width) * 100;
      const topPct = ((sRect.top - rect.top) / rect.height) * 100;
      const bottomPct = ((sRect.bottom - rect.top) / rect.height) * 100;
      
      snapLinesX.push(leftPct, rightPct);
      snapLinesYTopBased.push(topPct, bottomPct);
    });

    const snapLinesYBottomBased = snapLinesYTopBased.map(y => 100 - y);

    const snap = (value: number, itemSize: number, snapPoints: number[]) => {
      let bestTarget = value;
      let minDiff = 4; // 4% threshold for snapping
      for (const pt of snapPoints) {
        if (Math.abs(value - pt) < minDiff) {
          bestTarget = pt;
          minDiff = Math.abs(value - pt);
        }
        if (Math.abs((value + itemSize) - pt) < minDiff) {
          bestTarget = pt - itemSize;
          minDiff = Math.abs((value + itemSize) - pt);
        }
      }
      return bestTarget;
    };

    const startX = e.clientX;
    const startY = e.clientY;
    
    const startCoord = placedCoordinates[bagId] || { x: 15, y: 15, z: 0, rotated: false, rotationAxis: 'none' };
    const startPercentX = startCoord.x;
    const startPercentY = startCoord.y;
    const startPercentZ = startCoord.z || 0;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const percentDeltaX = (deltaX / rect.width) * 100;
      const percentDeltaY = (deltaY / rect.height) * 100;
      
      const rawX = startPercentX + percentDeltaX;
      let finalX = Math.round(snap(rawX, elWidthPct, snapLinesX));
      finalX = Math.max(0, Math.min(100, finalX));
      
      if (viewDirection2D === 'top') {
        const rawY = startPercentY + percentDeltaY;
        let finalY = Math.round(snap(rawY, elHeightPct, snapLinesYTopBased));
        finalY = Math.max(0, Math.min(100, finalY));

        adjustParentOnMove(bagId, finalY);

        setPlacedCoordinates(prev => {
          const cur = prev[bagId] || { x: 15, y: 15, z: 0, rotated: false, rotationAxis: 'none' };
          return {
            ...prev,
            [bagId]: { ...cur, x: finalX, y: finalY }
          };
        });
      } else {
        const rawZ = startPercentZ - percentDeltaY;
        let finalZ = Math.round(snap(rawZ, elHeightPct, snapLinesYBottomBased));
        finalZ = Math.max(0, Math.min(100, finalZ));

        setPlacedCoordinates(prev => {
          const cur = prev[bagId] || { x: 15, y: 15, z: 0, rotated: false, rotationAxis: 'none' };
          return {
            ...prev,
            [bagId]: { ...cur, x: finalX, z: finalZ }
          };
        });
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDragTouchStart = (e: React.TouchEvent<HTMLDivElement>, bagId: string) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    const element = e.currentTarget;
    const container = element.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const eleRect = element.getBoundingClientRect();
    const elWidthPct = (eleRect.width / rect.width) * 100;
    const elHeightPct = (eleRect.height / rect.height) * 100;

    const snapLinesX: number[] = [0, 100];
    const snapLinesYTopBased: number[] = [0, 100];

    const siblings = (Array.from(container.children) as HTMLElement[]).filter(c => c !== element && c.classList.contains('absolute') && c.classList.contains('cursor-grab'));
    siblings.forEach(sib => {
      const sRect = sib.getBoundingClientRect();
      const leftPct = ((sRect.left - rect.left) / rect.width) * 100;
      const rightPct = ((sRect.right - rect.left) / rect.width) * 100;
      const topPct = ((sRect.top - rect.top) / rect.height) * 100;
      const bottomPct = ((sRect.bottom - rect.top) / rect.height) * 100;
      
      snapLinesX.push(leftPct, rightPct);
      snapLinesYTopBased.push(topPct, bottomPct);
    });

    const snapLinesYBottomBased = snapLinesYTopBased.map(y => 100 - y);

    const snap = (value: number, itemSize: number, snapPoints: number[]) => {
      let bestTarget = value;
      let minDiff = 4; // 4% threshold for snapping
      for (const pt of snapPoints) {
        if (Math.abs(value - pt) < minDiff) {
          bestTarget = pt;
          minDiff = Math.abs(value - pt);
        }
        if (Math.abs((value + itemSize) - pt) < minDiff) {
          bestTarget = pt - itemSize;
          minDiff = Math.abs((value + itemSize) - pt);
        }
      }
      return bestTarget;
    };

    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    const startCoord = placedCoordinates[bagId] || { x: 15, y: 15, z: 0, rotated: false, rotationAxis: 'none' };
    const startPercentX = startCoord.x;
    const startPercentY = startCoord.y;
    const startPercentZ = startCoord.z || 0;
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 0) return;
      moveEvent.preventDefault();
      const touchMove = moveEvent.touches[0];
      const deltaX = touchMove.clientX - startX;
      const deltaY = touchMove.clientY - startY;
      
      const percentDeltaX = (deltaX / rect.width) * 100;
      const percentDeltaY = (deltaY / rect.height) * 100;
      
      const rawX = startPercentX + percentDeltaX;
      let finalX = Math.round(snap(rawX, elWidthPct, snapLinesX));
      finalX = Math.max(0, Math.min(100, finalX));
      
      if (viewDirection2D === 'top') {
        const rawY = startPercentY + percentDeltaY;
        let finalY = Math.round(snap(rawY, elHeightPct, snapLinesYTopBased));
        finalY = Math.max(0, Math.min(100, finalY));

        adjustParentOnMove(bagId, finalY);

        setPlacedCoordinates(prev => {
          const cur = prev[bagId] || { x: 15, y: 15, z: 0, rotated: false, rotationAxis: 'none' };
          return {
            ...prev,
            [bagId]: { ...cur, x: finalX, y: finalY }
          };
        });
      } else {
        const rawZ = startPercentZ - percentDeltaY;
        let finalZ = Math.round(snap(rawZ, elHeightPct, snapLinesYBottomBased));
        finalZ = Math.max(0, Math.min(100, finalZ));

        setPlacedCoordinates(prev => {
          const cur = prev[bagId] || { x: 15, y: 15, z: 0, rotated: false, rotationAxis: 'none' };
          return {
            ...prev,
            [bagId]: { ...cur, x: finalX, z: finalZ }
          };
        });
      }
    };
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const toggleRotate = (id: string) => {
    setPlacedCoordinates(prev => {
      const current = prev[id] || { x: 20, y: 20, z: 0, rotated: false };
      const currentAxis = current.rotationAxis || (current.rotated ? 'horizontal' : 'none');
      let nextAxis: 'none' | 'horizontal' | 'vertical_w_h' | 'vertical_d_h' | 'upside_down' = 'none';
      if (currentAxis === 'none') nextAxis = 'horizontal';
      else if (currentAxis === 'horizontal') nextAxis = 'vertical_w_h';
      else if (currentAxis === 'vertical_w_h') nextAxis = 'vertical_d_h';
      else if (currentAxis === 'vertical_d_h') nextAxis = 'upside_down';
      else nextAxis = 'none';

      return {
        ...prev,
        [id]: { 
          ...current, 
          rotationAxis: nextAxis,
          rotated: nextAxis === 'horizontal' 
        }
      };
    });
  };

  // Center of gravity estimate
  const leftPercent = leftWeightPercent;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="packing-manager-container">
      
      {/* LEFT COLUMN (8 cols): Interactive cargo simulation and visuals */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Vehicle Select Row with Custom creation and Seat arrange */}
        <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-1.5 text-slate-900">
                  積載車両モデルの選択・切替
                </h3>
                <p className="text-xs font-mono text-[#FF5C00] uppercase font-bold tracking-widest">
                  Vehicle Load Simulation Size
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {vehicles.map((v) => {
                const isActive = (v.id === currentVehicle.id || v.type === currentVehicle.type);
                const isCustom = v.id && v.id.startsWith('vehicle-custom-');
                return (
                  <div key={v.id || v.type} className="relative inline-flex items-center">
                    <button
                      type="button"
                      className={`px-3 py-1.5 border-2 border-black font-black text-xs uppercase tracking-tight transition-all cursor-pointer ${
                        isActive
                          ? 'bg-black text-white shadow-none translate-x-[2px] translate-y-[2px]'
                          : 'bg-white text-black hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      }`}
                      onClick={() => setCurrentVehicle(v)}
                    >
                      {v.name.split(' (')[0]}
                    </button>
                  </div>
                );
              })}
              
              <button
                type="button"
                onClick={() => setShowAddVehicle(!showAddVehicle)}
                className={`px-3 py-1.5 border-2 border-dashed border-black font-bold text-xs uppercase tracking-tight transition-all cursor-pointer hover:bg-slate-50 ${
                  showAddVehicle ? 'bg-amber-100' : 'bg-white'
                }`}
              >
                {showAddVehicle ? '閉じる' : '+ カスタム車両'}
              </button>

              {(() => {
                const isDefaultMissing = !vehicles.some(veh => veh.id === 'aqua' || veh.type === 'aqua') ||
                                         !vehicles.some(veh => veh.id === 'suv' || veh.type === 'suv') ||
                                         !vehicles.some(veh => veh.id === 'minivan' || veh.type === 'minivan');
                return isDefaultMissing && onRestoreDefaultVehicles && (
                  <button
                    type="button"
                    onClick={onRestoreDefaultVehicles}
                    className="px-3 py-1.5 border-2 border-dashed border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(79,70,229,0.2)]"
                    title="削除された初期のプリセット車両をリストにすべて復元します"
                  >
                    🔄 プリセット復元
                  </button>
                );
              })()}
            </div>
          </div>

          {/* New Custom Vehicle Registration Form */}
          {showAddVehicle && (
            <form onSubmit={handleCreateCustomVehicle} className="mt-4 p-4 bg-amber-50/40 border-2 border-black rounded-sm text-xs space-y-3 animate-fade-in">
              <h4 className="font-extrabold text-sm border-b border-black/10 pb-1 flex items-center gap-1">
                ⚙️ マイカスタム車両の新規登録
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">車両名・愛車名 (Name)</label>
                  <input
                    type="text"
                    required
                    placeholder="例: Jeep ラングラー / キャンプ用車"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1"
                    value={newVehName}
                    onChange={(e) => setNewVehName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">荷室最大幅 (cm)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono"
                    value={newVehW}
                    onChange={(e) => setNewVehW(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ラゲッジ通常奥行 (cm)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono"
                    value={newVehD}
                    onChange={(e) => setNewVehD(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">最大耐荷重 (kg)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono"
                    value={newVehMaxWeight}
                    onChange={(e) => setNewVehMaxWeight(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">荷室高さ (cm)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono"
                    value={newVehH}
                    onChange={(e) => setNewVehH(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <button type="submit" className="w-full bg-black text-white font-bold py-1.5 hover:bg-[#FF5C00] transition cursor-pointer">
                    カスタム車両を登録して有効化する
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Rear seats configuration arrangement */}
          <div className="mt-4 pt-3.5 border-t border-dashed border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1 text-slate-700">
              <span className="font-extrabold uppercase bg-indigo-100 text-indigo-850 px-1.5 py-0.5 text-[9px] rounded-xs shrink-0 mr-1.5">
                Seat Fold Arrangement
              </span>
              <span>積載用【後部座席アレンジ】:</span>
            </div>

            <div className="grid grid-cols-3 gap-2 shrink-0 border border-slate-200 p-0.5 rounded-sm">
              <button
                type="button"
                className={`px-2.5 py-1 font-bold border rounded-sm transition text-[11px] cursor-pointer ${
                  (currentVehicle.rearSeatMode || 'standard') === 'standard'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                onClick={() => onUpdateVehicleSeatMode('standard')}
              >
                🚗 荷室のみ
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 font-bold border rounded-sm transition text-[11px] cursor-pointer ${
                  currentVehicle.rearSeatMode === 'split'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                onClick={() => onUpdateVehicleSeatMode('split')}
              >
                💺 荷室と後席別々
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 font-bold border rounded-sm transition text-[11px] cursor-pointer ${
                  currentVehicle.rearSeatMode === 'flat'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                onClick={() => onUpdateVehicleSeatMode('flat')}
              >
                🛌 フルフラット
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 bg-[#F0EFEC] p-4 border-2 border-black">
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">最大荷室幅 (Width)</span>
              <span className="text-base font-black font-mono">{currentVehicle.width} cm</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">
                {currentVehicle.rearSeatMode === 'standard' ? 'トランク奥行 (Trunk Depth)' : 'フルフラット時の奥行 (Full Flat Depth)'}
              </span>
              <span className="text-base font-black font-mono text-indigo-700">
                {activeDepth} cm {currentVehicle.rearSeatMode !== 'standard' && <span className="text-indigo-600 font-extrabold text-[10px] block sm:inline sm:ml-1">(トランク: {currentVehicle.depth}cm)</span>}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">荷室高さ (Height)</span>
              <span className="text-base font-black font-mono">{currentVehicle.height} cm</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">最大積載可能重量</span>
              <span className="text-base font-black font-mono text-red-600">{currentVehicle.maxWeight} kg</span>
            </div>
          </div>
        </div>

        {/* CARGO WIREFRAME & 🪐 IMMERSIVE 3D SIMULATION CONTAINER */}
        <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] relative">
          
          {/* Header Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black pb-4 mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase font-extrabold tracking-widest text-[#FF5C00] block mb-0.5">
                Packing Workspace Simulation
              </span>
              <h3 className="text-lg font-black font-sans leading-none">
                {visualizerMode === '3d' ? '🪐 Immersive 3D 積載シミュレーター' : '📊 2D平面積載レイアウト'}
              </h3>
            </div>

            {/* Selector Toggles */}
            <div className="flex gap-2 bg-slate-100 p-1 border-2 border-black">
              <button
                type="button"
                onClick={() => setVisualizerMode('2d')}
                className={`px-3 py-1 text-xs font-black uppercase transition-all tracking-wide cursor-pointer ${
                  visualizerMode === '2d'
                    ? 'bg-black text-white'
                    : 'text-slate-700 hover:text-black font-bold'
                }`}
              >
                📋 2D平面図
              </button>
              <button
                type="button"
                onClick={() => setVisualizerMode('3d')}
                className={`px-3 py-1 text-xs font-black uppercase transition-all tracking-wide cursor-pointer ${
                  visualizerMode === '3d'
                    ? 'bg-[#FF5C00] text-white'
                    : 'text-slate-700 hover:text-black font-bold'
                }`}
              >
                🪐 3D空間ビュー
              </button>
            </div>
          </div>

          {visualizerMode === '3d' ? (
            <div className="flex flex-col gap-4">
              
              {/* Interactive canvas wrapper */}
              <div className="flex flex-col lg:flex-row gap-5">
                
                {/* 3D Model Display Stage */}
                <div className="flex-1 flex flex-col">
                  {/* Canvas itself */}
                  <div className="relative group overflow-hidden border-2 border-black bg-[#0B0F19] rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    <canvas
                      ref={canvasRef}
                      width={720}
                      height={440}
                      onMouseDown={handleCanvasMouseDown}
                      onTouchStart={handleCanvasTouchStart}
                      onTouchEnd={handleCanvasTouchEnd}
                      className="w-full h-auto cursor-pointer block"
                    />

                    {/* Camera manual rotation help hint overlay */}
                    <div className="absolute top-2.5 left-2.5 bg-[#FF5C00] text-[#0B0F19] text-[10px] font-bold px-2 py-1 leading-none rounded-none font-sans select-none border border-[#FF5C00] flex items-center gap-1 group-hover:opacity-95 transition-opacity">
                      <span>💡 タップで対象ギアを選択、ドラッグで回転</span>
                    </div>

                    {/* Locked camera angle badge overlay */}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/85 text-[9px] font-bold text-zinc-350 p-1.5 rounded-none border border-white/10 select-none flex items-center gap-1">
                      <span>🎥 視点: 右斜め後方 (固定軸)</span>
                    </div>

                    {/* Direct Zoom factors sliders screen overlay */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded border border-white/15 text-[8.5px] font-mono text-white">
                      <span>🔍 ズーム:</span>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-16 accent-[#FF5C00]"
                      />
                      <span className="w-6 text-center">{Math.round(zoom * 100)}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTIVE ITEM ACTIONS & RE-STACK TETRIS CONTROLLER */}
              {selectedContainerId && cargoItems.find(item => item.id === selectedContainerId) ? (() => {
                const item = cargoItems.find(item => item.id === selectedContainerId)!;
                const pos = placedCoordinates[item.id] || { x: 15, y: 15, z: 0, rotated: false, rotationAxis: 'none' };
                
                return (
                  <div className="bg-[#111827] text-white p-4 border-2 border-[#FF5C00] rounded-none animate-fade-in shadow-xl relative z-20 mt-2">
                    <div className="absolute top-2.5 right-3 flex items-center gap-2">
                      <span className="text-[9.5px] font-mono font-black uppercase text-[#FF5C00] bg-[#FF5C00]/10 px-1.5 py-0.5 rounded border border-[#FF5C00]/25">
                        Placed Cargo Action Tool
                      </span>
                      <button 
                        type="button"
                        onClick={() => setSelectedContainerId(null)}
                        className="text-zinc-400 hover:text-white font-mono text-[10px] bg-zinc-850 hover:bg-zinc-800 px-1.5 py-0.5 cursor-pointer rounded border border-zinc-700 text-white"
                      >
                        ✕ 閉じる
                      </button>
                    </div>

                    <h4 className="text-xs font-black text-slate-300 font-mono tracking-wider flex flex-wrap items-center gap-1.5 pr-24">
                      <span>📦 配置中:</span>
                      <span className="text-[#FF5C00] font-sans text-sm font-black">{item.name}</span>
                      <span className="text-[10px] opacity-75 font-normal">
                        寸法: {item.width}×{item.depth}×{item.height} cm | 位置: X={pos.x}%, Y={pos.y}%, Z={pos.z}%
                      </span>
                    </h4>

                    {/* Dynamic Upright Direction Review Banner */}
                    {(() => {
                      const rotationMode = pos.rotationAxis || (pos.rotated ? 'horizontal' : 'none');
                      const upFace = getOriginalFaceType('top', rotationMode);
                      return (
                        <div className={`mt-2.5 p-2 rounded text-xs border flex items-center gap-2 ${
                          upFace === 'TOP'
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                            : upFace === 'SIDE'
                            ? 'bg-amber-950/20 border-amber-500/30 text-amber-400'
                            : 'bg-red-950/20 border-red-500/35 text-red-400 animate-pulse'
                        }`}>
                          {upFace === 'TOP' && (
                            <>
                              <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[10px] font-bold shrink-0">🟢 天面が上 (良好)</span>
                              <span className="text-[10px]">蓋や取り出し口が上にあります。液漏れを防止でき、最も安定する理想的な積載状態です。</span>
                            </>
                          )}
                          {upFace === 'SIDE' && (
                            <>
                              <span className="bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px] font-bold shrink-0">🟡 側面が上 (横倒し)</span>
                              <span className="text-[10px]">設置面積を狭める配置です。液漏れしにくい固形物の容器や、型崩れに強いギアなどで選択されます。</span>
                            </>
                          )}
                          {upFace === 'BOTTOM' && (
                            <>
                              <span className="bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30 text-[10px] font-bold shrink-0">🚨 底面が上 (逆さま注意)</span>
                              <span className="text-[10px]">蓋が下になるため深刻な液漏れや、型崩れ、破損を誘発する可能性が高い積載状態です。</span>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* Quick Interactive Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-4 border-t border-white/10 pt-3.5">
                      
                      {/* Re-stack Stacking Tetris Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDroppingItemId(item.id);
                          setDroppingX(pos.x);
                          setDroppingY(pos.y);
                          setDroppingRotation(pos.rotationAxis || 'none');
                          setSelectedContainerId(null);
                        }}
                        className="flex-1 bg-gradient-to-r from-[#FF5C00] to-orange-500 hover:from-orange-500 hover:to-orange-400 text-black font-extrabold text-xs py-2 px-3 rounded-none flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-black shadow-[2px_2px_0px_#000]"
                      >
                        🪂 この荷物を上空から積み直す (Tetris)
                      </button>

                      {/* Quick Compartment Move under Split Mode */}
                      {currentVehicle.rearSeatMode === 'split' && (
                        item.parentId === 'rear_seat' ? (
                          <button
                            type="button"
                            onClick={() => {
                              const isBaggage = item.id.startsWith('baggage-');
                              if (isBaggage) {
                                handleUpdateBaggageParentWrap(item.id, 'vehicle');
                              } else {
                                handleUpdateGearParentWrap(item.id, 'vehicle');
                              }
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-3 rounded-none flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-black shadow-[2px_2px_0px_#000]"
                          >
                            📦 トランク荷室へ移動
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const isBaggage = item.id.startsWith('baggage-');
                              if (isBaggage) {
                                handleUpdateBaggageParentWrap(item.id, 'rear_seat');
                              } else {
                                handleUpdateGearParentWrap(item.id, 'rear_seat');
                              }
                            }}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-2 px-3 rounded-none flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-black shadow-[2px_2px_0px_#000]"
                          >
                            🛋️ 後部座席エリアへ移動
                          </button>
                        )
                      )}

                      {/* Direction Axis Adjustment */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-zinc-900 border border-zinc-700 px-2">
                        <span className="text-zinc-400 text-[10.5px]">向き:</span>
                        <select
                          className="bg-zinc-900 text-white rounded border-none text-[10.5px] font-bold py-1 cursor-pointer outline-none focus:ring-0"
                          value={pos.rotationAxis || 'none'}
                          onChange={(e) => handleAxisChange(item.id, e.target.value as any)}
                        >
                          <option value="none">🔎 標準 (W×D×H)</option>
                          <option value="horizontal">🔄 横回転 (D×W×H)</option>
                          <option value="vertical_w_h">🔀 縦倒し (H×D×W)</option>
                          <option value="vertical_d_h">↕️ 横倒し (W×H×D)</option>
                          <option value="upside_down">🚨 逆さま (W×D×H 底面上向き)</option>
                        </select>
                      </div>

                      {/* Remove item from cargo */}
                      <button
                        type="button"
                        onClick={() => {
                          const isBaggage = item.id.startsWith('baggage-');
                          if (isBaggage) {
                            handleUpdateBaggageParentWrap(item.id, 'unassigned');
                          } else {
                            handleUpdateGearParentWrap(item.id, 'unassigned');
                          }
                          setSelectedContainerId(null);
                        }}
                        className="bg-zinc-800 hover:bg-red-900 text-zinc-300 hover:text-white text-xs px-3 py-2 cursor-pointer font-bold border border-zinc-700 transition"
                      >
                        🗑️ 車から降ろす
                      </button>

                    </div>
                  </div>
                );
              })() : (
                <div className="text-center p-3 bg-slate-50 border border-dashed border-slate-300 text-slate-500 font-bold select-none text-[10.5px] mt-2">
                  💡 置いた荷物をタップすると、降ろしたり、上から落として積み直す(Tetris)ことができます。
                </div>
              )}

            </div>
          ) : (
            /* MULTI-ANGLE DETAILED 2D VIEWPORT WORKSPACE */
            (() => {
              // Internal layout helper calculations based on chosen direction
              const get2DDimensions = () => {
                const maxW = 550;
                const maxH = 340;
                
                if (viewDirection2D === 'top') {
                  const ratio = activeDepth / activeWidth;
                  let wPx = maxW;
                  let hPx = maxW * ratio;
                  if (hPx > maxH) {
                    hPx = maxH;
                    wPx = maxH / ratio;
                  }
                  return { widthPx: wPx, heightPx: hPx, xLabel: '車幅 (X方向)', yLabel: '奥行 (Y方向)', maxWcm: activeWidth, maxHcm: activeDepth };
                } else {
                  // back view
                  const ratio = activeHeight / activeWidth;
                  let wPx = maxW;
                  let hPx = maxW * ratio;
                  if (hPx > maxH) {
                    hPx = maxH;
                    wPx = maxH / ratio;
                  }
                  return { widthPx: wPx, heightPx: hPx, xLabel: '車幅 (X方向)', yLabel: '高さ (Z方向)', maxWcm: activeWidth, maxHcm: activeHeight };
                }
              };

              const dims = get2DDimensions();

              const sortedAndOverlayProcessedItems = (() => {
                const list = [
                  ...packedBaggages.map(b => {
                    const pos = placedCoordinates[b.id] || { x: 15, y: 15, z: 0, rotated: false };
                    const rotationMode = pos.rotationAxis || (pos.rotated ? 'horizontal' : 'none');
                    let w = b.width;
                    let d = b.depth;
                    let h = b.height;
                    if (rotationMode === 'horizontal') {
                      w = b.depth; d = b.width;
                    } else if (rotationMode === 'vertical_w_h') {
                      w = b.height; d = b.depth; h = b.width;
                    } else if (rotationMode === 'vertical_d_h') {
                      w = b.width; d = b.height; h = b.depth;
                    }
                    return {
                      id: b.id,
                      type: 'baggage' as const,
                      item: b,
                      pos,
                      rotationMode,
                      wCm: w,
                      dCm: d,
                      hCm: h,
                      wPercent: (w / activeWidth) * 100,
                      dPercent: (d / activeDepth) * 100,
                      hPercent: (h / activeHeight) * 100,
                    };
                  }),
                  ...[...directGearsInVehicle, ...directGearsInRearSeat].map(g => {
                    const pos = placedCoordinates[g.id] || { x: 30, y: 30, z: 0, rotated: false };
                    const rotationMode = pos.rotationAxis || (pos.rotated ? 'horizontal' : 'none');
                    let w = g.packedWidth || 30;
                    let d = g.packedDepth || 30;
                    let h = g.packedHeight || 30;
                    if (rotationMode === 'horizontal') {
                      w = g.packedDepth || 30; d = g.packedWidth || 30;
                    } else if (rotationMode === 'vertical_w_h') {
                      w = g.packedHeight || 30; d = g.packedDepth || 30; h = g.packedWidth || 30;
                    } else if (rotationMode === 'vertical_d_h') {
                      w = g.packedWidth || 30; d = g.packedHeight || 30; h = g.packedDepth || 30;
                    }
                    return {
                      id: g.id,
                      type: 'gear' as const,
                      item: g,
                      pos,
                      rotationMode,
                      wCm: w,
                      dCm: d,
                      hCm: h,
                      wPercent: (w / activeWidth) * 100,
                      dPercent: (d / activeDepth) * 100,
                      hPercent: (h / activeHeight) * 100,
                    };
                  })
                ];

                const itemsWithBounds = list.map(item => {
                  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
                  let cameraDepth = 0;

                  if (viewDirection2D === 'top') {
                    x1 = item.pos.x;
                    x2 = item.pos.x + item.wPercent;
                    y1 = item.pos.y;
                    y2 = item.pos.y + item.dPercent;
                    cameraDepth = item.pos.z || 0;
                  } else {
                    x1 = item.pos.x;
                    x2 = item.pos.x + item.wPercent;
                    y1 = item.pos.z || 0;
                    y2 = (item.pos.z || 0) + item.hPercent;
                    cameraDepth = item.pos.y;
                  }

                  return {
                    ...item,
                    x1, x2, y1, y2,
                    cameraDepth
                  };
                });

                const overlapTolerance = 1.0;
                const finalItems = itemsWithBounds.map(curr => {
                  let isCovered = false;

                  for (const other of itemsWithBounds) {
                    if (other.id === curr.id) continue;
                    if (other.cameraDepth > curr.cameraDepth) {
                      const overlaps = (
                        curr.x1 + overlapTolerance < other.x2 &&
                        curr.x2 - overlapTolerance > other.x1 &&
                        curr.y1 + overlapTolerance < other.y2 &&
                        curr.y2 - overlapTolerance > other.y1
                      );
                      if (overlaps) {
                        isCovered = true;
                        break;
                      }
                    }
                  }

                  return {
                    ...curr,
                    isCovered
                  };
                });

                finalItems.sort((a, b) => a.cameraDepth - b.cameraDepth);

                return finalItems;
              })();

              return (
                <div className="flex flex-col items-center w-full">
                  
                  {/* View direction selection buttons */}
                  <div className="flex justify-center gap-1.5 mb-4 bg-slate-100 p-1 border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setViewDirection2D('top')}
                      className={`px-3 py-1 text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        viewDirection2D === 'top'
                          ? 'bg-black text-white'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      🗺️ 真上から見た図 (Top)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewDirection2D('back')}
                      className={`px-3 py-1 text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        viewDirection2D === 'back'
                          ? 'bg-black text-white'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      📦 後ろ(開口部)から見た図 (Back)
                    </button>
                  </div>

                  {/* Blueprint Stage */}
                  <div className="bg-[#F3F2EE] border-4 border-double border-black p-5 pt-8 flex flex-col items-center justify-start min-h-[440px] w-full relative overflow-x-hidden overflow-y-auto z-10">
                    
                    {/* Perspective guide labels */}
                    <div className="text-[10px] font-black text-slate-400 bg-white/80 border border-slate-200 px-3 py-1 rounded mb-3 flex gap-4 uppercase select-none font-mono">
                      <span>👁️ 現在の視点: {viewDirection2D === 'top' ? '真上から見た透視図' : 'バックドア開口部から見た断面図'}</span>
                      {currentVehicle.rearSeatMode !== 'split' && (
                        <span>スケール: 1px ≒ 0.25cm ({Math.round((get2DDimensions() as any).maxWcm)}cm × {Math.round((get2DDimensions() as any).maxHcm)}cm)</span>
                      )}
                    </div>

                    {(function() {
                      const render2DSpace = (
                        items: any[],
                        dims: any,
                        containerId: string,
                        bgClass: string,
                        labelText: string,
                        emptyText: string
                      ) => {
                        return (
                          <div className="relative bg-white border-2 border-black p-3 md:p-5 shadow-md flex items-center justify-center transition-all duration-300 shrink-0 w-full">
                            <div className="absolute inset-x-3 md:inset-x-5 inset-y-3 md:inset-y-5 grid grid-cols-10 grid-rows-10 pointer-events-none opacity-[0.06] border border-black">
                              {Array.from({ length: 100 }).map((_, i) => <div key={i} className="border-[0.5px] border-black" />)}
                            </div>
                            <div 
                              id={containerId}
                              style={{ width: '100%', aspectRatio: `${dims.maxWcm} / ${dims.maxHcm}` }}
                              className={`relative border-4 flex items-center justify-center overflow-visible ${bgClass}`}
                            >
                              <div className="absolute inset-0 p-2 flex items-end justify-end pointer-events-none z-[5]">
                                <span className={`text-[9px] font-extrabold bg-white/95 border px-1.5 py-0.5 rounded shadow-sm select-none ${bgClass.includes('emerald') ? 'text-emerald-700 border-emerald-200' : bgClass.includes('indigo') ? 'text-indigo-700 border-indigo-200' : 'text-slate-700 border-slate-200'}`}>
                                  {labelText}
                                </span>
                              </div>
                              {items.length === 0 ? (
                                <div className="text-center p-6 text-slate-400 select-none pointer-events-none absolute inset-0 flex flex-col justify-center items-center">
                                  <Package className="w-8 h-8 text-slate-350 mx-auto mb-1 animate-pulse" />
                                  <p className="text-[9px] mt-0.5">{emptyText}</p>
                                </div>
                              ) : (
                                <div className="absolute inset-0 overflow-visible">
                                  {items.map(meta => meta.type === 'baggage' 
                                    ? renderBaggageItem(meta.item, dims, meta.isCovered) 
                                    : renderDirectGearItem(meta.item, dims, meta.isCovered))}
                                </div>
                              )}
                            </div>
                            <span className="absolute bottom-1 right-2 text-[9px] font-black font-mono text-zinc-400 select-none pointer-events-none tracking-widest hidden md:inline">
                              WIDTH: {Math.round(dims.maxWcm)}cm
                            </span>
                            <span className="absolute left-1 top-2 text-[9px] font-black font-mono text-zinc-400 whitespace-nowrap select-none pointer-events-none tracking-widest hidden md:inline">
                              DEPTH/HEIGHT: {Math.round(dims.maxHcm)}cm
                            </span>
                          </div>
                        );
                      };

                      if (currentVehicle.rearSeatMode === 'split') {
                        const trunkDepth = currentVehicle.depth;
                        const rearSeatDepth = Math.max(0, activeDepth - trunkDepth - 10);
                        
                        const rearW_cm = currentVehicle.rearFoldedWidth || activeWidth;
                        const rearH_cm = viewDirection2D === 'top' ? rearSeatDepth : activeHeight;
                        
                        const trunkW_cm = currentVehicle.width;
                        const trunkH_cm = viewDirection2D === 'top' ? trunkDepth : activeHeight;

                        return (
                          <div className="flex flex-col items-center justify-center gap-6 w-full py-4 max-w-2xl mx-auto">
                            <div className="flex flex-col items-center gap-2 w-full">
                              {render2DSpace(
                                sortedAndOverlayProcessedItems.filter(m => m.item.parentId === 'rear_seat'),
                                computeSpace2DDimensions(rearW_cm, rearH_cm, viewDirection2D),
                                'rear-visual-boundary',
                                'border-indigo-600/85 bg-indigo-50/40',
                                viewDirection2D === 'top' ? '🛋️ 後部座席エリア (Rear Seat Top View)' : '🛋️ 後部座席断面 (Rear Seat Back View)',
                                '後部座席は空です'
                              )}
                            </div>
                            
                            <div className="flex h-0 w-full max-w-[200px] border-t-4 border-dashed border-slate-300 relative my-2 justify-center items-center">
                              <span className="absolute bg-[#F3F2EE] px-3 py-0.5 text-[10px] font-black text-slate-400 rounded-full border-2 border-dashed border-slate-300 whitespace-nowrap">
                                空間分離 (Spaces Separated)
                              </span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2 w-full">
                              {render2DSpace(
                                sortedAndOverlayProcessedItems.filter(m => m.item.parentId !== 'rear_seat'),
                                computeSpace2DDimensions(trunkW_cm, trunkH_cm, viewDirection2D),
                                'trunk-visual-boundary',
                                'border-emerald-600/85 bg-emerald-50/40',
                                viewDirection2D === 'top' ? '📦 トランク荷室 (Trunk Area Top View)' : '📦 トランク断面 (Trunk Area Back View)',
                                'トランクは空です'
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="py-4 w-full flex justify-center max-w-2xl mx-auto">
                            {render2DSpace(
                              sortedAndOverlayProcessedItems,
                              get2DDimensions(),
                              'unified-visual-boundary',
                              'border-black/85 bg-slate-50/40',
                              currentVehicle.rearSeatMode === 'standard' ? '🚗 トランク荷室のみ (Trunk Cargo Only)' : '🛌 フルフラット連結モード (Full Flat)',
                              '2D平面図は空です'
                            )}
                          </div>
                        );
                      }
                    })()}

                  </div>
                </div>
              );
            })()
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono justify-between text-slate-650">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 bg-[#FF5C00] inline-block border border-black shadow-[1px_1px_0px_#000]"></span>
                バゲージコンテナ (方向調整・移動可能)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 bg-[#374151] inline-block border border-black shadow-[1px_1px_0px_#000]"></span>
                直積みギア (各製品色: タップで選択・方向/スペック編集可能)
              </span>
            </div>
            <span className="text-slate-400">
              ※ アイテムを選択し、アクションパネルの 📦 (トランクへ) 🛋️ (後席へ) ボタンをタップするだけで2室間を簡単に移動できます。
            </span>
          </div>
        </div>

        {/* Selected Container Contents Details Inspect Drawer */}
        {selectedContainerId && (
          <div className="bg-[#FFFDF9] border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="bg-[#FF5C00] text-white text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                  BAGGAGE OVERVIEW
                </span>
                <h4 className="text-lg font-black mt-1">
                  選択中: {baggages.find(b => b.id === selectedContainerId)?.name} の内訳
                </h4>
              </div>
              <button
                onClick={() => setSelectedContainerId(null)}
                className="text-xs font-mono border border-black px-2 py-1 bg-white hover:bg-slate-100"
              >
                閉じる (Close)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Inside Storages Bags */}
              <div className="border border-black p-3 bg-white">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2 font-bold">
                  📁 内包する収納袋/ボックス ({storages.filter(s => s.parentId === selectedContainerId).length}点)
                </span>
                {storages.filter(s => s.parentId === selectedContainerId).length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-3">このコンテナに属する収納袋はありません。</p>
                ) : (
                  <div className="space-y-2">
                    {storages.filter(s => s.parentId === selectedContainerId).map(st => {
                      const nestedGears = gears.filter(g => g.parentId === st.id);
                      return (
                        <div key={st.id} className="border-l-4 border-black pl-3 py-1.5 bg-slate-50 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between items-center w-full">
                            <div>
                              <span className="font-bold text-slate-950">{st.name}</span>
                              <span className="text-[10px] text-slate-500 block">サイズ: {st.width}x{st.depth}x{st.height}cm</span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: st.color }}>
                              {st.type === 'bag' ? '袋' : '箱'}
                            </span>
                          </div>

                          {nestedGears.length > 0 && (
                            <div className="mt-1 pl-2 border-l border-dashed border-slate-300 space-y-1">
                              {nestedGears.map(ng => (
                                <div key={ng.id} className="flex justify-between items-center text-[10px] text-slate-700 py-0.5">
                                  <span>↳ {ng.name}</span>
                                  <div className="flex items-center gap-1.5 font-mono text-slate-500">
                                    <span>{ng.weight}kg</span>
                                    <button
                                      onClick={() => setEditingGear(ng)}
                                      className="p-0.5 text-indigo-650 hover:text-black hover:bg-slate-200 rounded text-[9px]"
                                      title="ギアスペックを編集"
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inside Gears Directly */}
              <div className="border border-black p-3 bg-white">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2 font-bold">
                  キャンプギア直接パッキング品 ({gears.filter(g => g.parentId === selectedContainerId).length}点)
                </span>
                {gears.filter(g => g.parentId === selectedContainerId).length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-3">コンテナ内に直接置かれたギアはありません。</p>
                ) : (
                  <div className="space-y-1.5">
                    {gears.filter(g => g.parentId === selectedContainerId).map(g => (
                      <div key={g.id} className="flex justify-between items-center text-xs border-b border-dashed border-slate-200 py-1">
                        <div>
                          <span className="font-semibold">{g.name}</span>
                          <span className="text-[9px] text-slate-500 ml-2">({g.brand})</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-slate-500">
                          <span>{g.weight} kg</span>
                          <button
                            onClick={() => setEditingGear(g)}
                            className="p-1 text-[#FF5C00] hover:text-white hover:bg-[#FF5C00] rounded"
                            title="ギアスペックを編集"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN (4 cols): Adding Baggages, Storages, and Config Nested Relationships */}
      <div className="lg:col-span-4 flex flex-col gap-6 text-slate-900">
        
        {/* Payload Weight Card */}
        <div className="bg-black text-white p-6 rounded-none shadow-[4px_4px_0px_0px_#FF5C00]">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF5C00]">
            Total Load Weight (総積載質量)
          </p>
          <p className="text-4xl sm:text-5xl font-black italic tracking-tighter mt-1">
            {totalWeightInVehicle.toFixed(1)} <span className="text-xl">KG</span>
          </p>
          
          <div className="h-4 bg-white/20 w-full mt-4 border border-white">
            <div 
              style={{ width: `${Math.min(100, (totalWeightInVehicle / currentVehicle.maxWeight) * 100)}%` }}
              className="h-full bg-[#FF5C00] transition-all"
            ></div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono mt-1 text-slate-400 uppercase font-black">
            <span>Limit: {currentVehicle.maxWeight} kg max</span>
            <span>{Math.round((totalWeightInVehicle / currentVehicle.maxWeight) * 100)}% Used</span>
          </div>

          {totalWeightInVehicle > currentVehicle.maxWeight && (
            <div className="bg-rose-950 border border-red-500 text-rose-200 p-2.5 mt-3 text-xs rounded-sm flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>注意: 積載重量が最大容量({currentVehicle.maxWeight}kg)を超過しています！積載物を見直すか車両を切り替えてください。</span>
            </div>
          )}
        </div>

        {/* Packing density */}
        <div className="bg-white border-2 border-black p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">荷室の容積占有率(目安)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black underline decoration-indigo-500 decoration-3">{volumePercentage}%</span>
            <span className="text-[10px] font-mono text-slate-500">およそ {(packedVolumeSum / 1000).toFixed(1)}L / {(vehicleVolume / 1000).toFixed(0)}L</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            ※ 縦×横×高さの単純積算による目安の値です。実際の隙間や収まりは考慮していません。
          </p>
        </div>

        {/* Balance Warning */}
        <div className="border-2 border-black p-4 bg-[#FF5C00]/5 flex flex-col gap-1 text-xs">
          <span className="font-bold text-[#FF5C00] flex items-center gap-1 uppercase tracking-wider text-[10px]">
            <Info className="w-3.5 h-3.5" /> Weight Balance Advisory
          </span>
          <p className="text-slate-700 leading-snug">
            {leftPercent > 60 ? (
              <span>重心バランスが左寄りに偏っています (左側: {leftPercent}%)。右側にコンテナまたは重いテント類を入れ替えて安定させてください。</span>
            ) : leftPercent < 40 ? (
              <span>重心バランスが右寄りに偏っています (右側: {100 - leftPercent}%)。重い調理ギアを左に配置することをおすすめします。</span>
            ) : (
              <span>重心バランス良好です。(左: {leftPercent}%, 右: {100 - leftPercent}%)。コーナリング安定性が保たれています。</span>
            )}
          </p>
        </div>

        {/* 1. MANAGE CONTAINER / BAGGAGE CREATION & SELECTION */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#FF5C00]" />
              バゲージ・大型容器
            </h4>
            <button
              onClick={() => {
                setShowAddBaggage(!showAddBaggage);
                setShowAddStorage(false);
              }}
              className="text-[10px] font-black uppercase bg-black text-white px-2 py-1 rounded-sm hover:bg-[#FF5C00] transition"
            >
              {showAddBaggage ? '閉じる' : '+ 新規作成'}
            </button>
          </div>

          {/* Quick Creator */}
          {showAddBaggage && (
            <form onSubmit={handleCreateBaggage} className="p-3 bg-slate-50 border border-black text-xs space-y-3 mb-3 animate-fade-in">
              <h5 className="font-black border-b border-black/10 pb-1">新バゲージ・コンテナ追加</h5>
              <div className="flex gap-1">
                <button type="button" onClick={() => applyBaggagePreset('thor')} className="bg-white border hover:bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold">THOR耐衝撃</button>
                <button type="button" onClick={() => applyBaggagePreset('soft')} className="bg-white border hover:bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold">ソフトM</button>
                <button type="button" onClick={() => applyBaggagePreset('box')} className="bg-white border hover:bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold">キャリー箱</button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">コンテナ名</label>
                <input
                  type="text"
                  required
                  placeholder="例: トランクカーゴ 50L"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  value={newBagName}
                  onChange={(e) => setNewBagName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <label className="block text-[9px] text-slate-400">幅cm</label>
                  <input type="number" className="w-full border bg-white rounded p-0.5 text-center" value={newBagW} onChange={(e) => setNewBagW(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400">奥行cm</label>
                  <input type="number" className="w-full border bg-white rounded p-0.5 text-center" value={newBagD} onChange={(e) => setNewBagD(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400">高さcm</label>
                  <input type="number" className="w-full border bg-white rounded p-0.5 text-center" value={newBagH} onChange={(e) => setNewBagH(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400">カラー</label>
                  <input type="color" className="w-full border bg-white rounded p-0.5 h-7 cursor-pointer" value={newBagColor} onChange={(e) => setNewBagColor(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">タイプ</label>
                <select className="w-full border bg-white rounded p-1" value={newBagType} onChange={(e) => setNewBagType(e.target.value as any)}>
                  <option value="hard_container">ハードコンテナ (丈夫/重ね置き可能)</option>
                  <option value="soft_container">ソフトコンテナ (柔軟/押し込み可能)</option>
                  <option value="totes">トートバッグ (持ち歩き用)</option>
                  <option value="box">大型折りたたみボックス</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-[#FF5C00] text-white font-black py-1 hover:bg-black transition cursor-pointer">
                コンテナを登録
              </button>
            </form>
          )}

          {/* List of registered Baggages */}
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {baggages.length === 0 ? (
              <p className="text-xs text-slate-400 italic">バゲージがありません。</p>
            ) : (
              baggages.map((bag) => {
                const nestedS = storages.filter(s => s.parentId === bag.id);
                const nestedG = gears.filter(g => g.parentId === bag.id);
                const isInVehicle = bag.parentId === 'vehicle';

                return (
                  <div key={bag.id} className="border border-black p-2.5 bg-white text-xs flex flex-col gap-1 hover:border-indigo-600">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 border border-black shrink-0" style={{ backgroundColor: bag.color }}></span>
                        <span className="font-bold text-slate-900 truncate max-w-[130px]">{bag.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Remove button */}
                        <button
                          onClick={() => onRemoveBaggage(bag.id)}
                          className="text-slate-400 hover:text-red-650 p-0.5 rounded"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono flex gap-2">
                      <span>W{bag.width}×D{bag.depth}×H{bag.height}</span>
                      <span className="text-indigo-600">({bag.type === 'hard_container' ? 'ハード' : 'ソフト'})</span>
                    </div>

                    <div className="flex flex-col border-t border-dashed border-slate-200 pt-1.5 mt-1 text-[10px] text-slate-650 gap-1.5">
                      <div className="flex items-center justify-between">
                        <span>内包: 袋{nestedS.length}点, ギア{nestedG.length}点</span>
                      </div>
                      
                      {currentVehicle.rearSeatMode === 'flat' ? (
                        <button
                          onClick={() => onUpdateBaggageParent(bag.id, (isInVehicle || bag.parentId === 'rear_seat') ? 'unassigned' : 'vehicle')}
                          className={`w-full text-center py-0.5 rounded-sm font-bold transition text-[9px] ${
                            (isInVehicle || bag.parentId === 'rear_seat')
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-yellow-100 hover:text-yellow-800 border border-emerald-300' 
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-850 border border-transparent'
                          }`}
                        >
                          {(isInVehicle || bag.parentId === 'rear_seat') ? '✓ 荷室に積載中' : '+ 荷室に積む'}
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onUpdateBaggageParent(bag.id, isInVehicle ? 'unassigned' : 'vehicle')}
                            className={`flex-1 text-center py-0.5 rounded-sm font-bold text-[8.5px] transition border ${
                              isInVehicle 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold' 
                                : 'bg-slate-100 text-slate-655 hover:bg-emerald-50 border-transparent'
                            }`}
                          >
                            {isInVehicle ? '✓ 🚗トランク' : '+ 🚗トランク'}
                          </button>
                          
                          <button
                            onClick={() => onUpdateBaggageParent(bag.id, bag.parentId === 'rear_seat' ? 'unassigned' : 'rear_seat')}
                            className={`flex-1 text-center py-0.5 rounded-sm font-bold text-[8.5px] transition border ${
                              bag.parentId === 'rear_seat' 
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-extrabold' 
                                : 'bg-slate-100 text-slate-655 hover:bg-indigo-50 border-transparent'
                            }`}
                          >
                            {bag.parentId === 'rear_seat' ? '✓ 💺後席' : '+ 💺後席'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. MANAGE INNER STORAGE / BAGS/ BOX RELATIONSHIP */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-[#FF5C00]" />
              袋・小分け収納ケース
            </h4>
            <button
              onClick={() => {
                setShowAddStorage(!showAddStorage);
                setShowAddBaggage(false);
              }}
              className="text-[10px] font-black uppercase bg-black text-white px-2 py-1 rounded-sm hover:bg-[#FF5C00] transition"
            >
              {showAddStorage ? '閉じる' : '+ 新規作成'}
            </button>
          </div>
          {showAddStorage && (
            <form onSubmit={handleCreateStorage} className="p-3 bg-slate-50 border border-black text-xs space-y-3 mb-3 animate-fade-in">
              <h5 className="font-black border-b border-black/10 pb-1">新袋ケース追加</h5>
              <div className="flex gap-1">
                <button type="button" onClick={() => applyStoragePreset('peg')} className="bg-white border hover:bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold">ペグ袋</button>
                <button type="button" onClick={() => applyStoragePreset('mess')} className="bg-white border hover:bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold">クッカー袋</button>
                <button type="button" onClick={() => applyStoragePreset('pouch')} className="bg-white border hover:bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold">スパイス箱</button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">収納袋/ケース名</label>
                <input
                  type="text"
                  required
                  placeholder="例: スノーピーク ペグハンマーケース"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  value={newStorageName}
                  onChange={(e) => setNewStorageName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <label className="block text-[9px] text-slate-400">幅cm</label>
                  <input type="number" className="w-full border bg-white rounded p-0.5 text-center" value={newStorageW} onChange={(e) => setNewStorageW(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400">奥行cm</label>
                  <input type="number" className="w-full border bg-white rounded p-0.5 text-center" value={newStorageD} onChange={(e) => setNewStorageD(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400">高さcm</label>
                  <input type="number" className="w-full border bg-white rounded p-0.5 text-center" value={newStorageH} onChange={(e) => setNewStorageH(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400">カラー</label>
                  <input type="color" className="w-full border bg-white rounded p-0.5 h-7 cursor-pointer" value={newStorageColor} onChange={(e) => setNewStorageColor(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-505 mb-0.5 font-mono">どこに入れるか (Parent Link)</label>
                <select className="w-full border bg-white rounded p-1" value={newStorageParent} onChange={(e) => setNewStorageParent(e.target.value)}>
                  <option value="vehicle">🚗 車両トランク荷室に直積み</option>
                  {currentVehicle.rearSeatMode !== 'flat' && (
                    <option value="rear_seat">💺 車両後部座席スペースに直積み</option>
                  )}
                  <option value="unassigned font-bold text-rose-600">未割当 / 車外 (Unassigned)</option>
                  {baggages.map(b => (
                    <option key={b.id} value={b.id}>バゲージ: {b.name} の中</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-[#FF5C00] text-white font-black py-1 hover:bg-black transition cursor-pointer">
                袋ケースを登録
              </button>
            </form>
          )}

          {/* List of Storages */}
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {storages.length === 0 ? (
              <p className="text-xs text-slate-400 italic">収納袋がありません。</p>
            ) : (
              storages.map((st) => {
                const assignedGearsCount = gears.filter(g => g.parentId === st.id).length;
                let whereName = '未登録/自宅';
                if (st.parentId === 'vehicle') whereName = '🚗 車両直';
                else if (st.parentId.startsWith('baggage-')) {
                  const parentBag = baggages.find(b => b.id === st.parentId);
                  whereName = parentBag ? `👜 [${parentBag.name.slice(0, 10)}]` : 'バゲージ';
                }

                return (
                  <div key={st.id} className="border border-black p-2 bg-white text-xs flex flex-col gap-0.5 hover:border-[#FF5C00]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.color }}></span>
                        <span className="font-bold text-slate-900 truncate">{st.name}</span>
                      </div>
                      <button
                        onClick={() => onRemoveStorage(st.id)}
                        className="text-slate-450 hover:text-red-650"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono flex justify-between mt-1">
                      <span>{st.width}×{st.depth}×{st.height}cm</span>
                      <span className="font-black text-indigo-700 bg-slate-100 px-1">{whereName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-550">内包ギア: <span className="text-[#FF5C00] font-black">{assignedGearsCount} 点</span></span>
                      
                      {/* Storage parent reassignment quick selector */}
                      <select 
                        className="text-[9px] border bg-slate-50 py-0.5 rounded flex-1 text-slate-700"
                        value={st.parentId}
                        onChange={(e) => onUpdateStorageParent(st.id, e.target.value)}
                      >
                        <option value="unassigned">未パッキング</option>
                        <option value="vehicle">🚗 トランクに直積み</option>
                        {currentVehicle.rearSeatMode !== 'flat' && (
                          <option value="rear_seat">💺 後部座席に直積み</option>
                        )}
                        {baggages.map(b => (
                          <option key={b.id} value={b.id}>👜 {b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. SET NESTED ASSIGNMENT FOR SHIFTING GEARS */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5 mb-2">
            <Package className="w-4 h-4 text-[#FF5C00]" />
            ギアを詰めるパッキング設定
          </h4>
          <p className="text-[10px] text-slate-500 mb-3">
            各ギアを「直接ラゲッジに入れる」「特定の収納ケース袋」「特定のバッグ」にパッキング配置できます。
          </p>

          <div className="space-y-3.5 overflow-y-auto max-h-[290px] pr-1">
            {gears.filter(g => g.category !== 'Baggage' && g.category !== 'Storage').map((g) => (
              <div key={g.id} className="text-xs border border-slate-200 p-2.5 bg-slate-50 rounded-sm">
                <div className="flex justify-between items-start gap-1">
                  <div className="flex items-center gap-1.5 shrink-0 truncate max-w-[150px]">
                    <span className="font-bold text-slate-900 truncate">{g.name}</span>
                    <button 
                      onClick={() => setEditingGear(g)}
                      className="text-slate-455 hover:text-indigo-650 cursor-pointer p-0.5 rounded transition text-xs border border-transparent hover:border-slate-300"
                      title="スペック・形状などの詳細情報を編集"
                    >
                      ✏️
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold bg-white px-1 border shrink-0">{g.weight}kg</span>
                </div>
                
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 shrink-0">収納先:</span>
                  <select
                    className="flex-1 bg-white border border-slate-300 rounded p-1 text-[11px] text-slate-800 focus:outline-none focus:border-indigo-505"
                    value={g.parentId}
                    onChange={(e) => onUpdateGearParent(g.id, e.target.value)}
                  >
                    <option value="unassigned">自宅/車外（未パッキング）</option>
                    <option value="vehicle">🚗 車両トランク荷室に直積み</option>
                    {currentVehicle.rearSeatMode !== 'flat' && (
                      <option value="rear_seat">💺 車両後部座席スペースに直積み</option>
                    )}
                    
                    {/* List Baggages */}
                    {baggages.map(b => (
                      <option key={b.id} value={b.id}>👜 {b.name}</option>
                    ))}
                    
                    {/* List Storage Containers */}
                    {storages.map(s => {
                      const pb = s.parentId.startsWith('baggage-') 
                        ? baggages.find(x => x.id === s.parentId)?.name 
                        : '車両直';
                      return (
                        <option key={s.id} value={s.id}>
                          📁 収納袋: {s.name} ({pb ? pb.slice(0, 10) : '未割'}内)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ギア詳細スペック編集モーダル (Unified Gear Edit Modal with Gemini AI Image upload support) */}
      <GearEditModal 
        gear={editingGear} 
        onClose={() => setEditingGear(null)} 
        onUpdateGear={onUpdateGear} 
        baggages={baggages}
        storages={storages}
        getStorageName={getStorageName}
      />

      {/* バゲージ詳細スペック編集モーダル */}
      {editingBaggage && (() => {
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_#000] w-full max-w-md relative select-none">
              <button
                type="button"
                onClick={() => setEditingBaggage(null)}
                className="absolute top-3 right-3 text-slate-500 hover:text-black font-extrabold text-lg select-none"
              >
                ✕
              </button>
              
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b-2 border-black flex items-center gap-2">
                <span>👜 バゲージのスペック編集</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">バゲージ名</label>
                  <input
                    type="text"
                    className="w-full border-2 border-black bg-white rounded p-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5C00]"
                    value={editingBaggage.name}
                    onChange={(e) => setEditingBaggage({ ...editingBaggage, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">幅 (W) cm</label>
                    <input
                      type="number"
                      className="w-full border-2 border-black bg-white rounded p-1.5 text-center text-sm font-mono focus:outline-none"
                      value={editingBaggage.width}
                      onChange={(e) => setEditingBaggage({ ...editingBaggage, width: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">奥行 (D) cm</label>
                    <input
                      type="number"
                      className="w-full border-2 border-black bg-white rounded p-1.5 text-center text-sm font-mono focus:outline-none"
                      value={editingBaggage.depth}
                      onChange={(e) => setEditingBaggage({ ...editingBaggage, depth: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">高さ (H) cm</label>
                    <input
                      type="number"
                      className="w-full border-2 border-black bg-white rounded p-1.5 text-center text-sm font-mono focus:outline-none"
                      value={editingBaggage.height}
                      onChange={(e) => setEditingBaggage({ ...editingBaggage, height: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">カラーコード</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        className="w-10 h-9 border-2 border-black rounded cursor-pointer p-0.5 shrink-0"
                        value={editingBaggage.color}
                        onChange={(e) => setEditingBaggage({ ...editingBaggage, color: e.target.value })}
                      />
                      <input
                        type="text"
                        className="flex-1 w-full border-2 border-black bg-white rounded p-1 text-xs font-mono uppercase text-center"
                        value={editingBaggage.color}
                        onChange={(e) => setEditingBaggage({ ...editingBaggage, color: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">タイプ</label>
                    <select
                      className="w-full border-2 border-black bg-white rounded p-1.5 text-xs font-bold focus:outline-none h-9"
                      value={editingBaggage.type}
                      onChange={(e) => setEditingBaggage({ ...editingBaggage, type: e.target.value as any })}
                    >
                      <option value="hard_container">📦 ハードコンテナ</option>
                      <option value="soft_container">👜 ソフトコンテナ</option>
                      <option value="totes">👜 トートバッグ</option>
                      <option value="box">📦 折りたたみボックス</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBaggage(null)}
                    className="flex-1 border-2 border-black bg-white hover:bg-slate-50 font-bold py-2 text-sm transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateBaggage) {
                        onUpdateBaggage(editingBaggage);
                      }
                      setEditingBaggage(null);
                    }}
                    className="flex-1 bg-[#FF5C00] text-white border-2 border-black hover:bg-black font-extrabold py-2 text-sm transition shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
