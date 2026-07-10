import React, { useState, useEffect, useRef } from 'react';
import { GearItem, Vehicle, Baggage, StorageContainer, LayoutItem, LayoutProfile, VehiclePackingState } from './types';
import GearForm from './components/GearForm';
import GearList from './components/GearList';
import GearEditModal from './components/GearEditModal';
import PackingVisualizer from './components/PackingVisualizer';
import CampsiteLayout from './components/CampsiteLayout';
import MyPage from './components/MyPage';
import { 
  Compass, 
  Layers, 
  MapPin, 
  PlusSquare, 
  FileCheck, 
  Sparkles, 
  CloudSun, 
  Info,
  ArrowRight,
  Database
} from 'lucide-react';

// Initial pre-loaded sample dataset
const INITIAL_GEARS: GearItem[] = [
  {
    id: 'gear-1',
    name: 'Coleman ツーリングドームLX',
    brand: 'Coleman',
    category: 'Tent',
    packedWidth: 50,
    packedDepth: 20,
    packedHeight: 20,
    expandedWidth: 210,
    expandedDepth: 180,
    expandedHeight: 110,
    weight: 5.6,
    description: '1〜2人用の大人気定番テント。前室が広くて使いやすい。',
    parentId: 'storage-1'
  },
  {
    id: 'gear-2',
    name: 'Snow Peak ヘキサタープ M',
    brand: 'Snow Peak',
    category: 'Tarp',
    packedWidth: 80,
    packedDepth: 17,
    packedHeight: 22,
    expandedWidth: 475,
    expandedDepth: 420,
    expandedHeight: 240,
    weight: 9.5,
    description: '美しいシルエットの定番ヘキサタープ。遮光性が抜群。',
    parentId: 'vehicle'
  },
  {
    id: 'gear-3',
    name: 'Helinox チェアワン',
    brand: 'Helinox',
    category: 'Chair',
    packedWidth: 35,
    packedDepth: 10,
    packedHeight: 12,
    expandedWidth: 52,
    expandedDepth: 50,
    expandedHeight: 66,
    weight: 0.9,
    description: '超軽量＆コンパクト。座り心地に定評がある折りたたみチェア。',
    parentId: 'storage-2'
  },
  {
    id: 'gear-4',
    name: '折りたたみ木製ロールテーブル 120',
    brand: 'Fieldoor',
    category: 'Table',
    packedWidth: 70,
    packedDepth: 15,
    packedHeight: 15,
    expandedWidth: 120,
    expandedDepth: 70,
    expandedHeight: 45,
    weight: 6.5,
    description: '天然木を使用した大人4人でゆったり使えるロールテーブル。',
    parentId: 'vehicle'
  },
  {
    id: 'gear-5',
    name: 'Goal Zero LEDランタン',
    brand: 'Goal Zero',
    category: 'Lantern',
    packedWidth: 9,
    packedDepth: 4,
    packedHeight: 4,
    expandedWidth: 9,
    expandedDepth: 4,
    expandedHeight: 4,
    weight: 0.1,
    description: '非常に人気なコンパクトLEDランタン。USB充電可能。',
    parentId: 'storage-3'
  },
  {
    id: 'gear-6',
    name: 'ユニフレーム ファイアグリル',
    brand: 'Uniflame',
    category: 'Cooking',
    packedWidth: 38,
    packedDepth: 38,
    packedHeight: 7,
    expandedWidth: 43,
    expandedDepth: 43,
    expandedHeight: 33,
    weight: 2.7,
    description: 'タフで使い勝手抜群のボディー。定番バーベキューコンロ・焚き火台。',
    parentId: 'baggage-1'
  },
  {
    id: 'gear-7',
    name: 'NANGA オーロラライト 450DX',
    brand: 'NANGA',
    category: 'Bedding',
    packedWidth: 28,
    packedDepth: 14,
    packedHeight: 14,
    expandedWidth: 210,
    expandedDepth: 80,
    expandedHeight: 5,
    weight: 0.9,
    description: 'メイドインジャパンの高品質羽毛寝袋。3シーズン対応。',
    parentId: 'baggage-2'
  }
];

const INITIAL_BAGGAGES: Baggage[] = [
  {
    id: 'baggage-1',
    name: 'トランクカーゴ 50L (グレー)',
    type: 'hard_container',
    width: 60,
    depth: 39,
    height: 37,
    color: '#343A40',
    parentId: 'vehicle'
  },
  {
    id: 'baggage-2',
    name: 'ソフトコンテナ Mサイズ',
    type: 'soft_container',
    width: 45,
    depth: 30,
    height: 32,
    color: '#8B5A2B',
    parentId: 'vehicle'
  }
];

const INITIAL_STORAGES: StorageContainer[] = [
  {
    id: 'storage-1',
    name: 'ポール＆ペグハンマー用ロング帆布袋',
    type: 'bag',
    width: 55,
    depth: 15,
    height: 10,
    color: '#C2A676',
    parentId: 'vehicle'
  },
  {
    id: 'storage-2',
    name: 'ヘリノックスチェア純正収納ケース',
    type: 'bag',
    width: 36,
    depth: 12,
    height: 12,
    color: '#495057',
    parentId: 'baggage-1'
  },
  {
    id: 'storage-3',
    name: 'キャンプスパイス＆ランタンボックス',
    type: 'box',
    width: 25,
    depth: 18,
    height: 12,
    color: '#9013FE',
    parentId: 'baggage-1'
  }
];

const INITIAL_LAYOUTS: LayoutItem[] = [
  {
    id: 'layout-1',
    gearId: 'gear-1',
    x: 350,
    y: 400,
    rotation: 0
  },
  {
    id: 'layout-2',
    gearId: 'gear-2',
    x: 620,
    y: 520,
    rotation: 90
  },
  {
    id: 'layout-3',
    gearId: 'gear-3',
    x: 550,
    y: 680,
    rotation: 0
  },
  {
    id: 'layout-4',
    gearId: 'gear-4',
    x: 480,
    y: 620,
    rotation: 90
  }
];

const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: 'aqua',
    type: 'aqua',
    name: 'トヨタ アクア (Aqua Compact)',
    width: 95,
    depth: 70,
    height: 65,
    maxWeight: 120,
    rearSeatMode: 'standard'
  },
  {
    id: 'suv',
    type: 'suv',
    name: 'SUV・CX-5 クラス (Mid SUV)',
    width: 110,
    depth: 95,
    height: 80,
    maxWeight: 220,
    rearSeatMode: 'standard'
  },
  {
    id: 'minivan',
    type: 'minivan',
    name: 'ミニバン・ノア/セレナ (Minivan)',
    width: 135,
    depth: 115,
    height: 95,
    maxWeight: 380,
    rearSeatMode: 'standard'
  }
];

type TabType = 'packing' | 'layout' | 'inventory' | 'mypage';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('packing');
  const [editingGearId, setEditingGearId] = useState<string | null>(null);

  const handleEditGearInInventory = (id: string) => {
    setEditingGearId(id);
  };

  // Application states with LocalStorage persistence wrapper
  const [gears, setGears] = useState<GearItem[]>(() => {
    const saved = localStorage.getItem('basecamp_os_gears');
    let loadedGears: GearItem[] = saved ? JSON.parse(saved) : [];

    // Migrate or initialize
    if (!saved || loadedGears.length === 0) {
      const initGears = [...INITIAL_GEARS];
      const translatedBags: GearItem[] = INITIAL_BAGGAGES.map(b => ({
        id: b.id,
        name: b.name,
        brand: 'コンテナ',
        category: 'Baggage',
        packedWidth: b.width,
        packedDepth: b.depth,
        packedHeight: b.height,
        expandedWidth: b.width,
        expandedDepth: b.depth,
        expandedHeight: b.height,
        weight: 1.5,
        description: 'パッキング用バゲージ',
        parentId: b.parentId,
        containerColor: b.color,
        containerType: b.type
      }));

      const translatedStorages: GearItem[] = INITIAL_STORAGES.map(s => ({
        id: s.id,
        name: s.name,
        brand: '収納袋',
        category: 'Storage',
        packedWidth: s.width,
        packedDepth: s.depth,
        packedHeight: s.height,
        expandedWidth: s.width,
        expandedDepth: s.depth,
        expandedHeight: s.height,
        weight: 0.3,
        description: '仕分け用のケース・袋',
        parentId: s.parentId,
        containerColor: s.color,
        containerType: s.type
      }));

      return [...initGears, ...translatedBags, ...translatedStorages];
    }

    // Secondary load: If already initialized, make sure separate legacy storage baggages/storages are migrated if they exist
    const hasContainers = loadedGears.some(g => g.category === 'Baggage' || g.category === 'Storage');
    if (!hasContainers) {
      const savedBags = localStorage.getItem('basecamp_os_baggages');
      const bags: Baggage[] = savedBags ? JSON.parse(savedBags) : INITIAL_BAGGAGES;
      
      const savedStos = localStorage.getItem('basecamp_os_storages');
      const stos: StorageContainer[] = savedStos ? JSON.parse(savedStos) : INITIAL_STORAGES;

      const translatedBags: GearItem[] = bags.map(b => ({
        id: b.id.startsWith('baggage-') ? b.id : `baggage-${b.id}`,
        name: b.name,
        brand: 'コンテナ',
        category: 'Baggage',
        packedWidth: b.width,
        packedDepth: b.depth,
        packedHeight: b.height,
        expandedWidth: b.width,
        expandedDepth: b.depth,
        expandedHeight: b.height,
        weight: 1.5,
        description: 'パッキング用バゲージ',
        parentId: b.parentId,
        containerColor: b.color,
        containerType: b.type
      }));

      const translatedStorages: GearItem[] = stos.map(s => ({
        id: s.id.startsWith('storage-') ? s.id : `storage-${s.id}`,
        name: s.name,
        brand: '収納袋',
        category: 'Storage',
        packedWidth: s.width,
        packedDepth: s.depth,
        packedHeight: s.height,
        expandedWidth: s.width,
        expandedDepth: s.depth,
        expandedHeight: s.height,
        weight: 0.3,
        description: '仕分け用のケース・袋',
        parentId: s.parentId,
        containerColor: s.color,
        containerType: s.type
      }));

      loadedGears = [...loadedGears, ...translatedBags, ...translatedStorages];
    }

    const seen = new Set<string>();
    return loadedGears.filter(g => {
      if (!g || !g.id) return false;
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });
  });

  // Derived Baggage and Storage constants from unified Gears state
  const baggages: Baggage[] = React.useMemo(() => gears
    .filter(g => g.category === 'Baggage')
    .map(g => ({
      id: g.id,
      name: g.name,
      type: (g.containerType as any) || 'hard_container',
      width: g.packedWidth,
      depth: g.packedDepth,
      height: g.packedHeight,
      color: g.containerColor || '#343A40',
      parentId: g.parentId as any
    })), [gears]);

  const storages: StorageContainer[] = React.useMemo(() => gears
    .filter(g => g.category === 'Storage')
    .map(g => ({
      id: g.id,
      name: g.name,
      type: (g.containerType as any) || 'bag',
      width: g.packedWidth,
      depth: g.packedDepth,
      height: g.packedHeight,
      color: g.containerColor || '#C2A676',
      parentId: g.parentId
    })), [gears]);

  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>(() => {
    const saved = localStorage.getItem('basecamp_os_layouts');
    const items: LayoutItem[] = saved ? JSON.parse(saved) : INITIAL_LAYOUTS;
    const seen = new Set<string>();
    return items.filter(item => {
      if (!item || !item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  });

  // Custom vehicles database state
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('basecamp_os_vehicles_list');
    return saved ? JSON.parse(saved) : DEFAULT_VEHICLES;
  });

  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>(() => {
    const saved = localStorage.getItem('basecamp_os_vehicle');
    if (saved) return JSON.parse(saved);
    return DEFAULT_VEHICLES[0];
  });

  // Coordinates of bags inside the car visualizer
  const [placedCoordinates, setPlacedCoordinates] = useState<{ [id: string]: { x: number; y: number; rotated: boolean; rotationAxis?: 'none' | 'horizontal' | 'vertical_w_h' | 'vertical_d_h' | 'upside_down' } }>(() => {
    const saved = localStorage.getItem('basecamp_os_placed_coordinates');
    return saved ? JSON.parse(saved) : {
      'baggage-1': { x: 15, y: 20, rotated: false },
      'baggage-2': { x: 55, y: 15, rotated: false }
    };
  });

  // Map containing independent baggage/storage layouts per vehicle
  const [vehiclePackingStates, setVehiclePackingStates] = useState<{ [vehicleId: string]: VehiclePackingState }>(() => {
    const saved = localStorage.getItem('basecamp_os_vehicle_packing_states');
    return saved ? JSON.parse(saved) : {};
  });

  // Site Sizing controls (defaults to 10m x 10m)
  const [siteWidth, setSiteWidth] = useState<number>(() => {
    const saved = localStorage.getItem('basecamp_os_site_width');
    return saved ? Number(saved) : 1000; // 1000cm
  });

  const [siteHeight, setSiteHeight] = useState<number>(() => {
    const saved = localStorage.getItem('basecamp_os_site_height');
    return saved ? Number(saved) : 1000;
  });

  const [activePresetSite, setActivePresetSite] = useState<'forest' | 'lake' | 'grass'>(() => {
    const saved = localStorage.getItem('basecamp_os_active_preset_site');
    return (saved as any) || 'forest';
  });

  // Campsite layout saved profiles list
  const [layoutProfiles, setLayoutProfiles] = useState<LayoutProfile[]>(() => {
    const saved = localStorage.getItem('basecamp_os_layout_profiles');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'profile-initial',
        name: '初期ファミリーキャンプ構成',
        siteWidth: 1000,
        siteHeight: 1000,
        activePresetSite: 'forest',
        items: INITIAL_LAYOUTS
      }
    ];
  });

  const lastActiveVehicleIdRef = useRef<string>(currentVehicle.id || currentVehicle.type);

  // Sync states to localstorage
  useEffect(() => {
    localStorage.setItem('basecamp_os_gears', JSON.stringify(gears));
  }, [gears]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_baggages', JSON.stringify(baggages));
  }, [baggages]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_storages', JSON.stringify(storages));
  }, [storages]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_layouts', JSON.stringify(layoutItems));
  }, [layoutItems]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_vehicles_list', JSON.stringify(vehiclesList));
  }, [vehiclesList]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_vehicle', JSON.stringify(currentVehicle));
  }, [currentVehicle]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_placed_coordinates', JSON.stringify(placedCoordinates));
  }, [placedCoordinates]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_vehicle_packing_states', JSON.stringify(vehiclePackingStates));
  }, [vehiclePackingStates]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_site_width', String(siteWidth));
  }, [siteWidth]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_site_height', String(siteHeight));
  }, [siteHeight]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_active_preset_site', activePresetSite);
  }, [activePresetSite]);

  useEffect(() => {
    localStorage.setItem('basecamp_os_layout_profiles', JSON.stringify(layoutProfiles));
  }, [layoutProfiles]);

  // Auto-backup configuration for the active vehicle on alterations
  useEffect(() => {
    const activeId = currentVehicle.id || currentVehicle.type;
    if (lastActiveVehicleIdRef.current !== activeId) {
      return;
    }

    const currentState: VehiclePackingState = {
      vehicleId: activeId,
      rearSeatMode: currentVehicle.rearSeatMode || 'standard',
      baggages,
      storages,
      gearParentMap: gears.reduce((acc, g) => {
        acc[g.id] = g.parentId;
        return acc;
      }, {} as { [key: string]: string }),
      placedCoordinates
    };

    // Guard against infinite state updates: verify if something has actually altered
    const previousState = vehiclePackingStates[activeId];
    if (previousState) {
      const parentMapChanged = JSON.stringify(currentState.gearParentMap) !== JSON.stringify(previousState.gearParentMap);
      const coordsChanged = JSON.stringify(currentState.placedCoordinates) !== JSON.stringify(previousState.placedCoordinates);
      const seatModeChanged = currentState.rearSeatMode !== previousState.rearSeatMode;
      const baggagesChanged = JSON.stringify(currentState.baggages) !== JSON.stringify(previousState.baggages);
      const storagesChanged = JSON.stringify(currentState.storages) !== JSON.stringify(previousState.storages);

      if (!parentMapChanged && !coordsChanged && !seatModeChanged && !baggagesChanged && !storagesChanged) {
        return;
      }
    }

    setVehiclePackingStates(prev => ({
      ...prev,
      [activeId]: currentState
    }));
  }, [baggages, storages, gears, currentVehicle.rearSeatMode, placedCoordinates, vehiclePackingStates]);

  // Switch selected vehicle with full state save & load sequence
  const handleSwitchVehicle = (newVehicle: Vehicle) => {
    const oldId = currentVehicle.id || currentVehicle.type;
    const newId = newVehicle.id || newVehicle.type;
    
    // Save current state of the old vehicle
    const oldState: VehiclePackingState = {
      vehicleId: oldId,
      rearSeatMode: currentVehicle.rearSeatMode || 'standard',
      baggages,
      storages,
      gearParentMap: gears.reduce((acc, g) => {
        acc[g.id] = g.parentId;
        return acc;
      }, {} as { [key: string]: string }),
      placedCoordinates
    };

    const nextPackingStates = {
      ...vehiclePackingStates,
      [oldId]: oldState
    };
    setVehiclePackingStates(nextPackingStates);
    localStorage.setItem('basecamp_os_vehicle_packing_states', JSON.stringify(nextPackingStates));

    // Update ref before switching to prevent the auto-backup effect from triggering and overwriting the wrong vehicle's state
    lastActiveVehicleIdRef.current = newId;

    // Load state of the target vehicle
    const newState = nextPackingStates[newId];
    if (newState) {
      setPlacedCoordinates(newState.placedCoordinates || {});
      setGears(prev => prev.map(g => {
        const pId = newState.gearParentMap?.[g.id];
        return { ...g, parentId: pId !== undefined ? pId : 'unassigned' };
      }));
    } else {
      // If no state exists, clear positions of all items
      setPlacedCoordinates({});
      setGears(prev => prev.map(g => ({ ...g, parentId: 'unassigned' })));
    }

    // Set current vehicle state
    setCurrentVehicle(newVehicle);
  };

  const handleUpdateVehicleSeatMode = (mode: 'standard' | 'split' | 'flat') => {
    const updatedVehicle = { ...currentVehicle, rearSeatMode: mode };
    setCurrentVehicle(updatedVehicle);
    setVehiclesList(prev => prev.map(v => (v.id === currentVehicle.id || v.type === currentVehicle.type) ? { ...v, rearSeatMode: mode } : v));
  };

  const handleAddCustomVehicle = (newVehicle: Omit<Vehicle, 'id' | 'rearSeatMode'>) => {
    const fresh: Vehicle = {
      ...newVehicle,
      id: `vehicle-custom-${Date.now()}`,
      rearSeatMode: 'standard'
    };
    setVehiclesList(prev => [...prev, fresh]);
    handleSwitchVehicle(fresh); // switch automatically to register on screen
  };

  const handleRemoveCustomVehicle = (vId: string) => {
    if (vehiclesList.length <= 1) {
      alert("最後の1台は削除できません。");
      return;
    }
    const remaining = vehiclesList.filter(v => (v.id !== vId && v.type !== vId));
    setVehiclesList(remaining);
    
    const activeId = currentVehicle.id || currentVehicle.type;
    if (activeId === vId) {
      handleSwitchVehicle(remaining[0]);
    }
  };

  // Campsite Layout Saved Profiles Management Handlers
  const handleSaveLayoutProfile = (name: string) => {
    const newProfile: LayoutProfile = {
      id: `profile-${Date.now()}`,
      name,
      siteWidth,
      siteHeight,
      activePresetSite,
      items: JSON.parse(JSON.stringify(layoutItems)) // Deep copy
    };
    setLayoutProfiles(prev => {
      // Remove any with same name to overwrite, then add new
      const filtered = prev.filter(p => p.name !== name);
      return [...filtered, newProfile];
    });
  };

  const handleLoadLayoutProfile = (profileId: string) => {
    const profile = layoutProfiles.find(p => p.id === profileId);
    if (profile) {
      setSiteWidth(profile.siteWidth || 1000);
      setSiteHeight(profile.siteHeight || 1000);
      setActivePresetSite(profile.activePresetSite || 'forest');
      setLayoutItems(profile.items || []);
    }
  };

  const handleDeleteLayoutProfile = (profileId: string) => {
    setLayoutProfiles(prev => prev.filter(p => p.id !== profileId));
  };

  const handleImportLayoutItems = (items: LayoutItem[], width: number, height: number, preset: 'forest' | 'lake' | 'grass') => {
    setLayoutItems(items);
    setSiteWidth(width);
    setSiteHeight(height);
    setActivePresetSite(preset);
  };

  // Gear handlers
  const handleAddGear = (newGear: Omit<GearItem, 'id' | 'parentId'>) => {
    const fresh: GearItem = {
      ...newGear,
      id: `gear-${Date.now()}`,
      parentId: 'unassigned'
    };
    setGears(prev => [fresh, ...prev]);
  };

  const handleAddMultipleGears = (newGearsList: Omit<GearItem, 'id' | 'parentId'>[]) => {
    const freshItems: GearItem[] = newGearsList.map((g, i) => ({
      ...g,
      id: `gear-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      parentId: 'unassigned'
    }));
    setGears(prev => [...freshItems, ...prev]);
  };

  const handleSyncGears = (newGearsList: Omit<GearItem, 'id' | 'parentId'>[], mode: 'upsert' | 'overwrite' | 'append') => {
    if (mode === 'overwrite') {
      const freshItems: GearItem[] = newGearsList.map((g, i) => ({
        ...g,
        id: `gear-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        parentId: 'unassigned'
      }));
      setGears(freshItems);
      setLayoutItems([]);
    } else if (mode === 'upsert') {
      setGears(prev => {
        const updated = [...prev];
        const added: GearItem[] = [];

        newGearsList.forEach((incoming, i) => {
          const incomingNameClean = incoming.name.trim().toLowerCase();
          const incomingBrandClean = incoming.brand.trim().toLowerCase();

          const matchIndex = updated.findIndex(g => 
            g.name.trim().toLowerCase() === incomingNameClean && 
            g.brand.trim().toLowerCase() === incomingBrandClean
          );

          if (matchIndex > -1) {
            updated[matchIndex] = {
              ...updated[matchIndex],
              category: incoming.category,
              packedWidth: incoming.packedWidth,
              packedDepth: incoming.packedDepth,
              packedHeight: incoming.packedHeight,
              expandedWidth: incoming.expandedWidth,
              expandedDepth: incoming.expandedDepth,
              expandedHeight: incoming.expandedHeight,
              weight: incoming.weight,
              description: incoming.description
            };
          } else {
            added.push({
              ...incoming,
              id: `gear-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              parentId: 'unassigned'
            });
          }
        });

        return [...added, ...updated];
      });
    } else {
      handleAddMultipleGears(newGearsList);
    }
  };

  const handleRemoveGear = (id: string) => {
    setGears(prev => prev.filter(g => g.id !== id));
    // Also remove from layouts
    setLayoutItems(prev => prev.filter(li => li.gearId !== id));
  };

  const handleRemoveGears = (ids: string[]) => {
    setGears(prev => prev.filter(g => !ids.includes(g.id)));
    // Also remove from layouts
    setLayoutItems(prev => prev.filter(li => !ids.includes(li.gearId)));
  };

  const handleUpdateGear = (updatedGear: GearItem) => {
    setGears(prev => prev.map(g => g.id === updatedGear.id ? updatedGear : g));
  };

  const handleCopyGear = (id: string) => {
    const original = gears.find(g => g.id === id);
    if (!original) return;
    const fresh: GearItem = {
      ...original,
      id: `gear-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${original.name} (コピー)`,
      parentId: 'unassigned'
    };
    setGears(prev => [fresh, ...prev]);
  };

  const handleUpdateGearParent = (id: string, parentId: string) => {
    setGears(prev => prev.map(g => g.id === id ? { ...g, parentId } : g));
  };

  // Baggage handlers
  const handleAddBaggage = (newBaggage: Omit<Baggage, 'id'>) => {
    const id = `baggage-${Date.now()}`;
    const fresh: GearItem = {
      id,
      name: newBaggage.name,
      brand: 'コンテナ',
      category: 'Baggage',
      packedWidth: newBaggage.width,
      packedDepth: newBaggage.depth,
      packedHeight: newBaggage.height,
      expandedWidth: newBaggage.width,
      expandedDepth: newBaggage.depth,
      expandedHeight: newBaggage.height,
      weight: 1.5,
      description: 'パッキング用バゲージ',
      parentId: newBaggage.parentId,
      containerColor: newBaggage.color,
      containerType: newBaggage.type
    };
    setGears(prev => [...prev, fresh]);
  };

  const handleRemoveBaggage = (id: string) => {
    setGears(prev => prev
      .filter(g => g.id !== id)
      .map(g => g.parentId === id ? { ...g, parentId: 'vehicle' } : g)
    );
  };

  const handleUpdateBaggageParent = (id: string, parentId: 'unassigned' | 'vehicle' | 'rear_seat') => {
    setGears(prev => prev.map(g => g.id === id ? { ...g, parentId } : g));
  };

  const handleUpdateBaggage = (updated: Baggage) => {
    setGears(prev => prev.map(g => g.id === updated.id ? {
      ...g,
      name: updated.name,
      packedWidth: updated.width,
      packedDepth: updated.depth,
      packedHeight: updated.height,
      containerColor: updated.color,
      containerType: updated.type,
      parentId: updated.parentId
    } : g));
  };

  // Storage handlers
  const handleAddStorage = (newStorage: Omit<StorageContainer, 'id'>) => {
    const id = `storage-${Date.now()}`;
    const fresh: GearItem = {
      id,
      name: newStorage.name,
      brand: '収納袋',
      category: 'Storage',
      packedWidth: newStorage.width,
      packedDepth: newStorage.depth,
      packedHeight: newStorage.height,
      expandedWidth: newStorage.width,
      expandedDepth: newStorage.depth,
      expandedHeight: newStorage.height,
      weight: 0.3,
      description: '仕分け用のケース・袋',
      parentId: newStorage.parentId,
      containerColor: newStorage.color,
      containerType: newStorage.type
    };
    setGears(prev => [...prev, fresh]);
  };

  const handleRemoveStorage = (id: string) => {
    setGears(prev => prev
      .filter(g => g.id !== id)
      .map(g => g.parentId === id ? { ...g, parentId: 'unassigned' } : g)
    );
  };

  const handleUpdateStorageParent = (id: string, parentId: 'unassigned' | 'vehicle' | string) => {
    setGears(prev => prev.map(g => g.id === id ? { ...g, parentId } : g));
  };

  // Layout handlers
  const handleAddLayoutItem = (gearId: string, layoutParentId: string = 'campsite', x: number = 500, y: number = 500) => {
    const fresh: LayoutItem = {
      id: `layout-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      gearId,
      x,
      y,
      rotation: 0,
      layoutParentId
    };
    setLayoutItems(prev => [...prev, fresh]);
  };

  const handleUpdateLayoutItemParent = (id: string, layoutParentId: string, x: number = 200, y: number = 200) => {
    setLayoutItems(prev => prev.map(li => li.id === id ? { ...li, layoutParentId, x, y } : li));
  };

  const handleRemoveLayoutItem = (id: string) => {
    setLayoutItems(prev => prev.filter(li => li.id !== id));
  };

  const handleUpdateLayoutItemPosition = (id: string, x: number, y: number) => {
    setLayoutItems(prev => prev.map(li => li.id === id ? { ...li, x, y } : li));
  };

  const handleUpdateLayoutItemRotation = (id: string, rotation: number) => {
    setLayoutItems(prev => prev.map(li => li.id === id ? { ...li, rotation } : li));
  };

  const handleResetLayout = () => {
    if (confirm('キャンプ設営地のレイアウト配置を初期化します。よろしいですか？')) {
      setLayoutItems([]);
    }
  };

  // Find storage representation name
  const getStorageName = (parentId: string): string => {
    if (parentId === 'vehicle') return '🚗 車両直積み';
    if (parentId === 'rear_seat') return '💺 後部座席積み';
    if (parentId.startsWith('baggage-')) {
      const bag = baggages.find(b => b.id === parentId);
      return bag ? `👜 [${bag.name}]` : 'バゲージ内';
    }
    if (parentId.startsWith('storage-')) {
      const sto = storages.find(s => s.id === parentId);
      return sto ? `📁 [${sto.name}]` : '収納ケース内';
    }
    return '未登録';
  };

  const handleLoadWorkspace = (workspaceData: any) => {
    if (!workspaceData) return;
    if (workspaceData.gears) setGears(workspaceData.gears);
    if (workspaceData.layoutItems) setLayoutItems(workspaceData.layoutItems);
    if (workspaceData.layoutProfiles) setLayoutProfiles(workspaceData.layoutProfiles);
    if (workspaceData.vehiclesList) setVehiclesList(workspaceData.vehiclesList);
    if (workspaceData.currentVehicle) setCurrentVehicle(workspaceData.currentVehicle);
    if (workspaceData.placedCoordinates) setPlacedCoordinates(workspaceData.placedCoordinates);
    if (workspaceData.vehiclePackingStates) setVehiclePackingStates(workspaceData.vehiclePackingStates);
    if (workspaceData.siteWidth) setSiteWidth(workspaceData.siteWidth);
    if (workspaceData.siteHeight) setSiteHeight(workspaceData.siteHeight);
    if (workspaceData.activePresetSite) setActivePresetSite(workspaceData.activePresetSite);
  };

  const currentData = {
    gears,
    layoutItems,
    layoutProfiles,
    vehiclesList,
    currentVehicle,
    placedCoordinates,
    vehiclePackingStates,
    siteWidth,
    siteHeight,
    activePresetSite
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F0EFEC] text-[#1A1A1A] font-sans antialiased selection:bg-[#FF5C00] selection:text-white" id="basecamp-os-root">
      
      {/* HEADER SECTION IN ARTISTIC FLAIR MOOD */}
      <header className="h-24 sm:h-20 border-b-2 border-black flex flex-col sm:flex-row items-center justify-between px-6 sm:px-10 bg-white gap-2 py-2 sm:py-0 shrink-0">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">
            Basecamp<span className="text-[#FF5C00] animate-pulse">.</span>OS
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF5C00]/80">
            Camp Packing & Layout Simulator
          </p>
        </div>

        {/* Tab Selection */}
        <nav className="flex gap-4 sm:gap-6 font-bold text-xs sm:text-sm uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('packing')}
            className={`border-b-2 pb-1 transition-colors cursor-pointer ${
              activeTab === 'packing' 
                ? 'border-[#FF5C00] text-[#FF5C00] font-black' 
                : 'border-transparent opacity-60 hover:opacity-100 hover:text-black'
            }`}
          >
            📦 パッキング積載
          </button>
          
          <button
            onClick={() => setActiveTab('layout')}
            className={`border-b-2 pb-1 transition-colors cursor-pointer ${
              activeTab === 'layout' 
                ? 'border-[#FF5C00] text-[#FF5C00] font-black' 
                : 'border-transparent opacity-60 hover:opacity-100 hover:text-black'
            }`}
          >
            🏕️ 設営テントレイアウト
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`border-b-2 pb-1 transition-colors cursor-pointer ${
              activeTab === 'inventory' 
                ? 'border-[#FF5C00] text-[#FF5C00] font-black' 
                : 'border-transparent opacity-60 hover:opacity-100 hover:text-black'
            }`}
          >
            🎒 ギア登録管理
          </button>

          <button
            onClick={() => setActiveTab('mypage')}
            className={`border-b-2 pb-1 transition-colors cursor-pointer ${
              activeTab === 'mypage' 
                ? 'border-[#FF5C00] text-[#FF5C00] font-black' 
                : 'border-transparent opacity-60 hover:opacity-100 hover:text-black'
            }`}
          >
            👤 マイページ
          </button>
        </nav>

        {/* Active Car indicators info */}
        <div className="hidden md:flex items-center gap-2 text-right">
          <div className="leading-none">
            <p className="text-[9px] uppercase font-black opacity-50 tracking-wider">Active Loading Box</p>
            <p className="text-xs font-black text-rose-650 italic shrink-0 truncate max-w-[170px] uppercase">
              {currentVehicle.name.split(' (')[0]}
            </p>
          </div>
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white shrink-0">
            <Compass className="w-4 h-4 text-[#FF5C00] animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        
        {/* TOP INTRO BANNER AREA */}
        <div className="mb-6 bg-white border-2 border-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[#FF5C00_3px_3px_0px_0px]">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#FF5C00] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              Basecamp Preparation Workspace Active
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              {activeTab === 'packing' && '車両バゲージ・イレコパッキングシミュレーション'}
              {activeTab === 'layout' && '10x10m 設営地グラフィカル配置エディター'}
              {activeTab === 'inventory' && '手持ちキャンプギア情報登録 & ネットAI自動サイズ補完'}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500 font-medium">現在の総ギア数: <span className="font-bold text-slate-950 font-mono">{gears.length}点</span></span>
            <span className="text-slate-200">|</span>
            {activeTab !== 'inventory' && (
              <button
                onClick={() => setActiveTab('inventory')}
                className="bg-[#FF5C00] hover:bg-black text-white text-[10px] font-bold uppercase py-1.5 px-3 rounded-sm transition cursor-pointer flex items-center gap-1"
              >
                + ギアを新規追加
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* TAB TARGET RENDERERS */}
        {activeTab === 'packing' && (
          <PackingVisualizer
            gears={gears}
            vehicles={vehiclesList}
            currentVehicle={currentVehicle}
            setCurrentVehicle={handleSwitchVehicle}
            onUpdateVehicleSeatMode={handleUpdateVehicleSeatMode}
            onAddCustomVehicle={handleAddCustomVehicle}
            onRemoveCustomVehicle={handleRemoveCustomVehicle}
            baggages={baggages}
            onAddBaggage={handleAddBaggage}
            onRemoveBaggage={handleRemoveBaggage}
            onUpdateBaggageParent={handleUpdateBaggageParent}
            onUpdateBaggage={handleUpdateBaggage}
            storages={storages}
            onAddStorage={handleAddStorage}
            onRemoveStorage={handleRemoveStorage}
            onUpdateStorageParent={handleUpdateStorageParent}
            onUpdateGearParent={handleUpdateGearParent}
            onUpdateGear={handleUpdateGear}
            placedCoordinates={placedCoordinates}
            setPlacedCoordinates={setPlacedCoordinates}
          />
        )}

        {activeTab === 'layout' && (
          <CampsiteLayout
            gears={gears}
            layoutItems={layoutItems}
            onAddLayoutItem={handleAddLayoutItem}
            onRemoveLayoutItem={handleRemoveLayoutItem}
            onUpdateLayoutItemPosition={handleUpdateLayoutItemPosition}
            onUpdateLayoutItemRotation={handleUpdateLayoutItemRotation}
            onUpdateLayoutItemParent={handleUpdateLayoutItemParent}
            onResetLayout={handleResetLayout}
            siteWidth={siteWidth}
            siteHeight={siteHeight}
            onUpdateSiteWidth={setSiteWidth}
            onUpdateSiteHeight={setSiteHeight}
            activePresetSite={activePresetSite}
            setActivePresetSite={setActivePresetSite}
            layoutProfiles={layoutProfiles}
            onSaveLayoutProfile={handleSaveLayoutProfile}
            onLoadLayoutProfile={handleLoadLayoutProfile}
            onDeleteLayoutProfile={handleDeleteLayoutProfile}
            onImportLayoutItems={handleImportLayoutItems}
            onEditGearInInventory={handleEditGearInInventory}
          />
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Gear Forms component */}
            <GearForm 
              onAddGear={handleAddGear} 
              onAddMultipleGears={handleAddMultipleGears} 
              onSyncGears={handleSyncGears} 
              onGoToMyPage={() => setActiveTab('mypage')}
            />
            
            {/* List with persistence metadata */}
            <GearList 
              gears={gears} 
              onRemoveGear={handleRemoveGear} 
              onRemoveGears={handleRemoveGears}
              onUpdateGear={handleUpdateGear}
              onCopyGear={handleCopyGear}
              getStorageName={getStorageName} 
              baggages={baggages}
              storages={storages}
              editingId={editingGearId}
              setEditingId={setEditingGearId}
            />
          </div>
        )}

        {activeTab === 'mypage' && (
          <MyPage
            vehicles={vehiclesList}
            currentVehicle={currentVehicle}
            setCurrentVehicle={handleSwitchVehicle}
            onAddCustomVehicle={handleAddCustomVehicle}
            onRemoveCustomVehicle={handleRemoveCustomVehicle}
            setVehiclesList={setVehiclesList}
            currentData={currentData}
            onLoadWorkspace={handleLoadWorkspace}
          />
        )}

      </main>

      {/* Global integrated gear specifications edit modal */}
      {editingGearId && (
        <GearEditModal
          gear={gears.find(g => g.id === editingGearId) || null}
          onClose={() => setEditingGearId(null)}
          onUpdateGear={handleUpdateGear}
          baggages={baggages}
          storages={storages}
          getStorageName={getStorageName}
        />
      )}

      {/* FOOTER SECTION */}
      <footer className="h-16 border-t-2 border-black bg-white flex flex-col sm:flex-row items-center justify-between px-6 sm:px-10 py-3 sm:py-0 shrink-0 gap-2 text-center text-slate-800">
        <div className="flex gap-4 sm:gap-6 text-[10px] font-black uppercase tracking-wider text-slate-600">
          <span className="flex items-center gap-1 text-emerald-600 font-extrabold">
            <Database className="w-3.5 h-3.5" />
            LocalStorage Active (自動保存オン)
          </span>
          <span>手持ちギア: {gears.length}点</span>
          <span>バゲージ: {baggages.length}個</span>
          <span>収納ケース: {storages.length}個</span>
        </div>

        <div className="flex gap-4 items-center">
          <span className="text-[10px] font-bold uppercase opacity-40">EXPORT DATA PRESET:</span>
          <button 
            onClick={() => {
              alert(JSON.stringify({ gears, baggages, storages, layoutItems, currentVehicle }, null, 2));
            }}
            className="text-[10px] font-extrabold uppercase bg-black text-rose-300 px-2 py-1 hover:bg-[#FF5C00]"
          >
            JSON 出力 (Copy config)
          </button>
        </div>
      </footer>

    </div>
  );
}
