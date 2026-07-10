import React, { useState, useRef } from 'react';
import { GearItem, LayoutItem, LayoutProfile, GearCategory, GearShape } from '../types';
import { 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  RotateCw, 
  Plus, 
  Map, 
  Grid, 
  HelpCircle,
  Eye, 
  Trees, 
  Home, 
  Flame,
  Download,
  Upload as UploadIcon
} from 'lucide-react';

interface CampsiteLayoutProps {
  gears: GearItem[];
  layoutItems: LayoutItem[];
  onAddLayoutItem: (gearId: string, layoutParentId?: string, x?: number, y?: number) => void;
  onRemoveLayoutItem: (id: string) => void;
  onUpdateLayoutItemPosition: (id: string, x: number, y: number) => void;
  onUpdateLayoutItemRotation: (id: string, rotation: number) => void;
  onUpdateLayoutItemParent: (id: string, layoutParentId: string, x?: number, y?: number) => void;
  onResetLayout: () => void;
  siteWidth: number;
  siteHeight: number;
  onUpdateSiteWidth: (w: number) => void;
  onUpdateSiteHeight: (h: number) => void;
  activePresetSite: 'forest' | 'lake' | 'grass';
  setActivePresetSite: (preset: 'forest' | 'lake' | 'grass') => void;
  layoutProfiles: LayoutProfile[];
  onSaveLayoutProfile: (name: string) => void;
  onLoadLayoutProfile: (profileId: string) => void;
  onDeleteLayoutProfile: (profileId: string) => void;
  onImportLayoutItems: (items: LayoutItem[], width: number, height: number, preset: 'forest' | 'lake' | 'grass') => void;
  onEditGearInInventory: (id: string) => void;
}

export default function CampsiteLayout({
  gears,
  layoutItems,
  onAddLayoutItem,
  onRemoveLayoutItem,
  onUpdateLayoutItemPosition,
  onUpdateLayoutItemRotation,
  onUpdateLayoutItemParent,
  onResetLayout,
  siteWidth,
  siteHeight,
  onUpdateSiteWidth,
  onUpdateSiteHeight,
  activePresetSite,
  setActivePresetSite,
  layoutProfiles,
  onSaveLayoutProfile,
  onLoadLayoutProfile,
  onDeleteLayoutProfile,
  onImportLayoutItems,
  onEditGearInInventory,
}: CampsiteLayoutProps) {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [layoutContextId, setLayoutContextId] = useState<string>('campsite'); // 'campsite' or layoutItemId
  const [showGrid, setShowGrid] = useState(true);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const [activeGuides, setActiveGuides] = useState<{ type: 'x' | 'y'; value: number; label: string }[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  
  // Canvas container element reference for calculating boundary coordinates
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const currentContextLayoutItem = layoutItems.find(li => li.id === layoutContextId);
  const currentContextGear = currentContextLayoutItem ? gears.find(g => g.id === currentContextLayoutItem.gearId) : null;
  const currentWidth = currentContextGear ? (currentContextGear.expandedWidth || currentContextGear.packedWidth || 30) : siteWidth;
  const currentHeight = currentContextGear ? (currentContextGear.expandedDepth || currentContextGear.packedDepth || 30) : siteHeight;

  // Filter items that belong to the current layout context (canvas)
  const currentLevelItems = layoutItems.filter(li => (li.layoutParentId || 'campsite') === layoutContextId);

  // List of layout items that can act as containers (tents, tarps placed on campsite)
  const containerItems = layoutItems.filter(li => {
    const g = gears.find(gear => gear.id === li.gearId);
    return g && (g.category === 'Tent' || g.category === 'Tarp');
  });

  // Track continuous pointer dragging state
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Interactive coordinate controls increment
  const handleMove = (id: string, direction: 'up' | 'down' | 'left' | 'right', amount: number = 20) => {
    const item = layoutItems.find(li => li.id === id);
    if (!item) return;

    let newX = item.x;
    let newY = item.y;

    switch (direction) {
      case 'up': newY = Math.max(0, item.y - amount); break;
      case 'down': newY = Math.min(currentHeight, item.y + amount); break;
      case 'left': newX = Math.max(0, item.x - amount); break;
      case 'right': newX = Math.min(currentWidth, item.x + amount); break;
    }

    onUpdateLayoutItemPosition(id, newX, newY);
  };

  const handleRotate = (id: string) => {
    const item = layoutItems.find(li => li.id === id);
    if (!item) return;
    const nextRotation = (item.rotation + 90) % 360;
    onUpdateLayoutItemRotation(id, nextRotation);
  };

  const handleRotateStart = (e: React.PointerEvent<HTMLDivElement>, li: LayoutItem) => {
    e.stopPropagation();
    e.preventDefault();
    
    const element = document.getElementById(`layout-item-${li.id}`);
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI + 90;
      const rotation = (Math.round(angleDeg) + 360) % 360;
      onUpdateLayoutItemRotation(li.id, rotation);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Pointer event action handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, li: LayoutItem) => {
    e.stopPropagation();
    setSelectedLayoutId(li.id);

    const container = canvasRef.current;
    if (!container) return;

    // Capture pointers (touch and mouse) seamlessly
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = container.getBoundingClientRect();
    // Convert screen coordinates into 0-currentWidth/currentHeight space
    const clickXCm = ((e.clientX - rect.left) / rect.width) * currentWidth;
    const clickYCm = ((e.clientY - rect.top) / rect.height) * currentHeight;

    // Offset in cm to prevent snapping the element's actual center straight to the cursor tip
    setDragState({
      id: li.id,
      offsetX: clickXCm - li.x,
      offsetY: clickYCm - li.y
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, li: LayoutItem) => {
    if (!dragState || dragState.id !== li.id) return;
    e.stopPropagation();

    const container = canvasRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pointerXCm = ((e.clientX - rect.left) / rect.width) * currentWidth;
    const pointerYCm = ((e.clientY - rect.top) / rect.height) * currentHeight;

    let newX = Math.round(pointerXCm - dragState.offsetX);
    let newY = Math.round(pointerYCm - dragState.offsetY);

    const g = gears.find(item => item.id === li.gearId);
    if (g && isSnapEnabled) {
      const SNAP_THRESHOLD = 15; // Proximity threshold in cm for snappy alignment
      let snappedX = newX;
      let snappedY = newY;
      const guides: { type: 'x' | 'y'; value: number; label: string }[] = [];

      // Selected item physical dimensions
      const itemWidth = g.expandedWidth || g.packedWidth || 30;
      const itemDepth = g.expandedDepth || g.packedDepth || 30;
      const hw = itemWidth / 2;
      const hd = itemDepth / 2;

      // 1. Snap to Campsite Grid / Boundaries (Edges & Corners)
      // Left boundary (0cm)
      if (Math.abs(newX - hw) < SNAP_THRESHOLD) {
        snappedX = hw;
        guides.push({ type: 'x', value: 0, label: '左端エリア端' });
      }
      // Right boundary (currentWidth)
      else if (Math.abs((newX + hw) - currentWidth) < SNAP_THRESHOLD) {
        snappedX = currentWidth - hw;
        guides.push({ type: 'x', value: currentWidth, label: '右端エリア端' });
      }
      // Center vertical alignment line
      else if (Math.abs(newX - currentWidth / 2) < SNAP_THRESHOLD) {
        snappedX = currentWidth / 2;
        guides.push({ type: 'x', value: currentWidth / 2, label: '中央グリッド' });
      }

      // Top boundary (0cm)
      if (Math.abs(newY - hd) < SNAP_THRESHOLD) {
        snappedY = hd;
        guides.push({ type: 'y', value: 0, label: '上端エリア端' });
      }
      // Bottom boundary (currentHeight)
      else if (Math.abs((newY + hd) - currentHeight) < SNAP_THRESHOLD) {
        snappedY = currentHeight - hd;
        guides.push({ type: 'y', value: currentHeight, label: '下端エリア端' });
      }
      // Center horizontal alignment line
      else if (Math.abs(newY - currentHeight / 2) < SNAP_THRESHOLD) {
        snappedY = currentHeight / 2;
        guides.push({ type: 'y', value: currentHeight / 2, label: '中央グリッド' });
      }

      // 2. Snap to other layout gears
      for (const otherLi of currentLevelItems) {
        if (otherLi.id === li.id) continue;
        const otherG = gears.find(item => item.id === otherLi.gearId);
        if (!otherG) continue;

        const otherW = otherG.expandedWidth || otherG.packedWidth || 30;
        const otherD = otherG.expandedDepth || otherG.packedDepth || 30;
        const otherHw = otherW / 2;
        const otherHd = otherD / 2;

        const otherLeft = otherLi.x - otherHw;
        const otherRight = otherLi.x + otherHw;
        const otherTop = otherLi.y - otherHd;
        const otherBottom = otherLi.y + otherHd;

        // Snapping X coordinates
        if (Math.abs((newX - hw) - otherRight) < SNAP_THRESHOLD) {
          snappedX = otherRight + hw;
          guides.push({ type: 'x', value: otherRight, label: `${otherG.name} に密着` });
        }
        else if (Math.abs((newX + hw) - otherLeft) < SNAP_THRESHOLD) {
          snappedX = otherLeft - hw;
          guides.push({ type: 'x', value: otherLeft, label: `${otherG.name} に密着` });
        }
        else if (Math.abs((newX - hw) - otherLeft) < SNAP_THRESHOLD) {
          snappedX = otherLeft + hw;
          guides.push({ type: 'x', value: otherLeft, label: `${otherG.name} 左揃え` });
        }
        else if (Math.abs((newX + hw) - otherRight) < SNAP_THRESHOLD) {
          snappedX = otherRight - hw;
          guides.push({ type: 'x', value: otherRight, label: `${otherG.name} 右揃え` });
        }
        else if (Math.abs(newX - otherLi.x) < SNAP_THRESHOLD) {
          snappedX = otherLi.x;
          guides.push({ type: 'x', value: otherLi.x, label: `${otherG.name} 軸揃え` });
        }

        // Snapping Y coordinates
        if (Math.abs((newY - hd) - otherBottom) < SNAP_THRESHOLD) {
          snappedY = otherBottom + hd;
          guides.push({ type: 'y', value: otherBottom, label: `${otherG.name} に密着` });
        }
        else if (Math.abs((newY + hd) - otherTop) < SNAP_THRESHOLD) {
          snappedY = otherTop - hd;
          guides.push({ type: 'y', value: otherTop, label: `${otherG.name} に密着` });
        }
        else if (Math.abs((newY - hd) - otherTop) < SNAP_THRESHOLD) {
          snappedY = otherTop + hd;
          guides.push({ type: 'y', value: otherTop, label: `${otherG.name} 上揃え` });
        }
        else if (Math.abs((newY + hd) - otherBottom) < SNAP_THRESHOLD) {
          snappedY = otherBottom - hd;
          guides.push({ type: 'y', value: otherBottom, label: `${otherG.name} 下揃え` });
        }
        else if (Math.abs(newY - otherLi.y) < SNAP_THRESHOLD) {
          snappedY = otherLi.y;
          guides.push({ type: 'y', value: otherLi.y, label: `${otherG.name} 軸揃え` });
        }
      }

      // Safe bounds containment
      newX = Math.max(hw, Math.min(currentWidth - hw, snappedX));
      newY = Math.max(hd, Math.min(currentHeight - hd, snappedY));
      setActiveGuides(guides);
    } else {
      // Limit to layout boundaries when snapping is disabled or no gear
      newX = Math.max(0, Math.min(currentWidth, newX));
      newY = Math.max(0, Math.min(currentHeight, newY));
    }

    onUpdateLayoutItemPosition(li.id, newX, newY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, li: LayoutItem) => {
    if (dragState && dragState.id === li.id) {
      e.stopPropagation();
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragState(null);
      setActiveGuides([]);
    }
  };

  // Filter out gears that can be placed (tents, tarps, tables, chairs, lanterns, etc.)
  const placeableGears = gears;

  const handleExportCSV = () => {
    let csvStr = "ギア名,カテゴリー,配置X(cm),配置Y(cm),回転(度),区画幅(cm),区画奥行(cm),ロケーション\n";
    layoutItems.forEach(li => {
      const g = gears.find(item => item.id === li.gearId);
      const name = g ? g.name : "未知のギア";
      const cat = g ? g.category : "Other";
      csvStr += `"${name.replace(/"/g, '""')}",${cat},${li.x},${li.y},${li.rotation},${siteWidth},${siteHeight},${activePresetSite}\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'campsite_layout_plan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result;
        if (typeof text !== 'string') return;

        const lines = text.split('\n');
        if (lines.length < 2) {
          alert('有効なレイアウトCSVではありません。');
          return;
        }

        const newItems: LayoutItem[] = [];
        let importedWidth = siteWidth;
        let importedHeight = siteHeight;
        let importedBackground: 'forest' | 'lake' | 'grass' = activePresetSite;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (parts.length < 4) continue;

          const gName = parts[0].replace(/^"|"$/g, '').trim();
          const pCat = parts[1] || "Other";
          const px = parseInt(parts[2]) || 500;
          const py = parseInt(parts[3]) || 500;
          const protation = parseInt(parts[4]) || 0;
          if (parts[5]) importedWidth = parseInt(parts[5]) || siteWidth;
          if (parts[6]) importedHeight = parseInt(parts[6]) || siteHeight;
          if (parts[7]) {
            const bg = parts[7].trim() as any;
            if (['forest', 'lake', 'grass'].includes(bg)) {
              importedBackground = bg;
            }
          }

          let matchedGear = gears.find(g => g.name.toLowerCase() === gName.toLowerCase());
          if (!matchedGear) {
            matchedGear = gears.find(g => g.category.toLowerCase() === pCat.toLowerCase());
          }
          if (!matchedGear && gears.length > 0) {
            matchedGear = gears[0];
          }

          if (matchedGear) {
            newItems.push({
              id: `layout-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
              gearId: matchedGear.id,
              x: px,
              y: py,
              rotation: protation
            });
          }
        }

        if (newItems.length === 0) {
          alert("CSVに一致するギアまたはカテゴリーのアイテムがありません。先にギアを登録してください。");
          return;
        }

        onImportLayoutItems(newItems, importedWidth, importedHeight, importedBackground);
        alert(`CSVから ${newItems.length} 件の設営レイアウトを読み込みました！`);
      } catch (err: any) {
        alert("レイアウトCSVのインポート失敗: " + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = "";
  };

  const handleProfileSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onSaveLayoutProfile(newProfileName.trim());
    setNewProfileName('');
    alert(`レイアウト「${newProfileName}」を現在の設計状況で保存しました。`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="campsite-layout-container">
      
      {/* 1. LEFT SIDE: Campsite Canvas Section (8 Columns) */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-[10px] bg-[#FF5C00] text-white px-2 py-0.5 font-bold uppercase tracking-widest">
                🏕️ Interactive 2D Visualizer
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-1.5">
                キャンプサイト設営レイアウト
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                区画サイズ: <b>{siteWidth / 100}m × {siteHeight / 100}m</b>。実際のフットプリント比率で配置・回転できます。
              </p>
            </div>

            {/* Canvas Helpers */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`px-3 py-1.5 border border-black text-xs font-bold font-mono cursor-pointer flex items-center gap-1.5 ${
                  showGrid ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                {showGrid ? 'グリッドON' : 'グリッドOFF'}
              </button>

              <button
                type="button"
                onClick={() => setIsSnapEnabled(!isSnapEnabled)}
                className={`px-3 py-1.5 border border-black text-xs font-bold font-mono cursor-pointer flex items-center gap-1.5 transition-all ${
                  isSnapEnabled ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white text-black'
                }`}
                title="荷物をエリアの隅や他のギア、軸揃えラインに自動でスナップします"
              >
                <span className="text-xs">🧲</span>
                {isSnapEnabled ? 'スナップON' : 'スナップOFF'}
              </button>
              
              <button
                type="button"
                onClick={onResetLayout}
                className="px-3 py-1.5 border border-black text-xs font-bold font-mono bg-[#FFF8F6] hover:bg-stone-200 text-black cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                クリア
              </button>
            </div>
          </div>

          {/* SIZING CONFIG AND PROFILE LOAD / SAVE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-[#F0EFEC]/40 border-2 border-black text-xs">
            {/* Sizing Form */}
            <div className="space-y-2 border-r border-black/10 md:pr-4">
              <span className="font-extrabold text-slate-800 block uppercase tracking-wider text-[11px]">
                📐 区画サイズ変更（リアルフットプリントスケール）
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">区画幅 (横) (m)</label>
                  <input
                    type="number"
                    min="3"
                    max="50"
                    step="0.5"
                    className="w-full bg-white border border-black rounded px-2 py-1 text-center font-bold"
                    value={siteWidth / 100}
                    onChange={(e) => onUpdateSiteWidth(Math.max(300, Math.min(5000, Math.round((parseFloat(e.target.value) || 10) * 100))))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">区画奥行 (縦) (m)</label>
                  <input
                    type="number"
                    min="3"
                    max="50"
                    step="0.5"
                    className="w-full bg-white border border-black rounded px-2 py-1 text-center font-bold"
                    value={siteHeight / 100}
                    onChange={(e) => onUpdateSiteHeight(Math.max(300, Math.min(5000, Math.round((parseFloat(e.target.value) || 10) * 100))))}
                  />
                </div>
              </div>
            </div>

            {/* Profile switching */}
            <div className="space-y-2 flex flex-col justify-between">
              <span className="font-extrabold text-slate-800 block uppercase tracking-wider text-[11px]">
                💾 設営レイアウトの切り替え（保存・呼び出し）
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {layoutProfiles.map((p) => (
                  <div key={p.id} className="relative inline-flex items-center group">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`レイアウト 「${p.name}」 を読み込みます。現在の設計はリセットされます。`)) {
                          onLoadLayoutProfile(p.id);
                        }
                      }}
                      className="bg-white hover:bg-black hover:text-white border border-black px-2 py-1 text-[10px] font-bold rounded-sm transition cursor-pointer"
                    >
                      {p.name}
                    </button>
                    {p.id !== 'profile-initial' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`レイアウト 「${p.name}」 を削除します。`)) {
                            onDeleteLayoutProfile(p.id);
                          }
                        }}
                        className="bg-rose-500 hover:bg-red-700 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold ml-0.5 cursor-pointer border border-black"
                        title="削除"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Save layout form */}
              <form onSubmit={handleProfileSaveSubmit} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="現在のレイアウトに名前を付けて保存"
                  className="flex-1 bg-white border border-black rounded px-2 py-1 text-[11px] placeholder:text-slate-400"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                />
                <button type="submit" className="bg-black hover:bg-[#FF5C00] text-white font-bold px-3 py-1 text-[11px] rounded-sm transition shrink-0 cursor-pointer">
                  保存する
                </button>
              </form>
            </div>
          </div>

          {/* Campsite Environment Selection & CSV Operations row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-slate-50 p-2 border border-black/10">
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-xs font-bold text-slate-600 self-center px-1">ロケーション背景:</span>
              <button
                onClick={() => setActivePresetSite('forest')}
                className={`px-2.5 py-1 text-xs font-bold rounded-sm transition cursor-pointer ${
                  activePresetSite === 'forest' ? 'bg-[#588157] text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'
                }`}
              >
                🌳 林間サイト (Forest)
              </button>
              <button
                onClick={() => setActivePresetSite('lake')}
                className={`px-2.5 py-1 text-xs font-bold rounded-sm transition cursor-pointer ${
                  activePresetSite === 'lake' ? 'bg-[#0077b6] text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'
                }`}
              >
                🌊 湖畔・砂利サイト (Lake Gravel)
              </button>
              <button
                onClick={() => setActivePresetSite('grass')}
                className={`px-2.5 py-1 text-xs font-bold rounded-sm transition cursor-pointer ${
                  activePresetSite === 'grass' ? 'bg-[#a3b18a] text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'
                }`}
              >
                🌱 芝生サイト (Grass Field)
              </button>
            </div>

            {/* CSV Layout Export / Import actions */}
            <div className="flex items-center gap-2 text-xs shrink-0 self-end">
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-black hover:bg-[#FF5C00] text-white font-bold py-1 px-2.5 rounded-sm flex items-center gap-1 cursor-pointer"
                title="設営配置をCSVに保存"
              >
                <Download className="w-3.5 h-3.5" />
                CSVエクスポート
              </button>

              <label className="bg-white hover:bg-stone-100 border border-black font-bold py-1 px-2.5 rounded-sm flex items-center gap-1 cursor-pointer shrink-0">
                <UploadIcon className="w-3.5 h-3.5" />
                CSVインポート
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
              </label>
            </div>
          </div>

          {/* LAYOUT CONTEXT TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b-2 border-dashed border-black/20 hide-scrollbar">
            <button
              type="button"
              onClick={() => setLayoutContextId('campsite')}
              className={`whitespace-nowrap px-4 py-2 border-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                layoutContextId === 'campsite'
                  ? 'bg-black text-white border-black cursor-default'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-black cursor-pointer'
              }`}
            >
              <Map className="w-4 h-4" />
              Main Campsite
            </button>
            {containerItems.map(li => {
              const g = gears.find(gear => gear.id === li.gearId);
              if (!g) return null;
              return (
                <button
                  key={li.id}
                  type="button"
                  onClick={() => setLayoutContextId(li.id)}
                  className={`whitespace-nowrap px-4 py-2 border-2 text-xs font-black tracking-tight flex items-center gap-1.5 transition-colors ${
                    layoutContextId === li.id
                      ? 'bg-amber-950 text-white border-amber-950 cursor-default'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-900 cursor-pointer'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  {g.brand} {g.name}
                </button>
              );
            })}
          </div>

          {/* CANVAS STAGE (2D TOP DOWN SCALE MAP) */}
          <div 
            ref={canvasRef}
            style={{
              aspectRatio: `${currentWidth} / ${currentHeight}`
            }}
            className={`w-full max-w-[580px] mx-auto border-4 border-black relative overflow-visible transition-all shadow-[inset_0px_0px_30px_rgba(0,0,0,0.15)] ${
              layoutContextId !== 'campsite'
                ? 'bg-[#E5E0D8]/40 border-amber-900 bg-[size:10px_10px] [background-image:radial-gradient(#1A1A1A_1px,transparent_0)] overflow-hidden'
                : activePresetSite === 'forest' 
                  ? 'bg-[#344e41]/30 border-[#1b4332]' 
                  : activePresetSite === 'lake'
                  ? 'bg-[#e9ecef] border-slate-400'
                  : 'bg-[#dddf0d]/10'
            }`}
            onClick={() => setSelectedLayoutId(null)}
          >
            {/* Background element for Tent/Tarp context */}
            {layoutContextId !== 'campsite' && currentContextGear && (() => {
                const shape = currentContextGear.shape || 'rectangle';
                let clipPath: string | undefined = undefined;
                let borderRadiusStyle = 'rounded-sm';

                if (shape === 'circle') {
                  borderRadiusStyle = 'rounded-full';
                } else if (shape === 'hexagon') {
                  clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
                } else if (shape === 'octagon') {
                  clipPath = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
                } else if (shape === 'triangle') {
                  clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)';
                } else if (shape === 'diamond') {
                  clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
                } else if (shape === 'custom') {
                  const points = currentContextGear.customPolygon || '20% 0%, 80% 0%, 100% 100%, 0% 100%';
                  clipPath = points.trim().startsWith('polygon(') ? points.trim() : `polygon(${points.trim()})`;
                }

                return (
                  <div 
                    className={`absolute inset-0 pointer-events-none opacity-[0.15] ${borderRadiusStyle}`}
                    style={{
                      backgroundColor: currentContextGear.category === 'Tent' ? '#FF5C00' : currentContextGear.category === 'Tarp' ? '#059669' : '#475569',
                      clipPath: clipPath,
                      WebkitClipPath: clipPath,
                    }}
                  />
                );
            })()}

            {/* Decors on Map based on theme */}
            {layoutContextId === 'campsite' && activePresetSite === 'forest' && (
              <>
                <div className="absolute top-10 left-12 opacity-30 flex items-center text-[#2d6a4f] gap-1"><Trees className="w-10 h-10" /><span className="text-[10px] font-bold font-mono uppercase">WOODS SIDE</span></div>
                <div className="absolute bottom-16 right-16 opacity-30 flex items-center text-[#2d6a4f] gap-1"><Trees className="w-10 h-10" /></div>
                <div className="absolute top-4/5 left-1/10 opacity-20"><Trees className="w-8 h-8 text-black" /></div>
              </>
            )}

            {layoutContextId === 'campsite' && activePresetSite === 'lake' && (
              <div className="absolute top-0 right-0 w-32 h-full bg-[#90e0ef]/40 border-l border-sky-400 p-2 flex items-center justify-center opacity-70">
                <span className="text-[10px] font-black text-sky-800 rotate-90 uppercase tracking-widest">LAKE SIDE (水際)</span>
              </div>
            )}

            {/* Fixed Campsite Firepit Graphic Marker */}
            {layoutContextId === 'campsite' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-stone-300 border-2 border-stone-500 rounded-full flex flex-col items-center justify-center shadow-md">
                <Flame className="w-6 h-6 text-orange-650 animate-bounce" />
                <span className="text-[7px] font-black text-stone-700">FIRE PIT</span>
              </div>
            )}

            {/* Reference scale grid helper */}
            {showGrid && (
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none opacity-20">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} className="border border-black/40 text-[7px] font-mono text-slate-500">
                    {i === 0 ? '0m' : i === 9 ? `${Math.round((currentWidth/100)*10)/10}m` : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Snap guides dotted rendering */}
            {isSnapEnabled && activeGuides.map((guide, idx) => {
              if (guide.type === 'x') {
                const pct = (guide.value / currentWidth) * 100;
                return (
                  <div 
                    key={`snap-guide-x-${idx}`}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 bottom-0 w-0 border-l border-dashed border-[#FF5C00] z-[40] pointer-events-none"
                  >
                    <span className="absolute top-2 left-1 bg-indigo-600 text-white font-extrabold text-[7px] px-1 py-0.5 rounded leading-none whitespace-nowrap shadow-xs pointer-events-none">
                      📍 {guide.label} ({Math.round(guide.value)}cm)
                    </span>
                  </div>
                );
              } else {
                const pct = (guide.value / currentHeight) * 100;
                return (
                  <div 
                    key={`snap-guide-y-${idx}`}
                    style={{ top: `${pct}%` }}
                    className="absolute left-0 right-0 h-0 border-t border-dashed border-[#FF5C00] z-[40] pointer-events-none"
                  >
                    <span className="absolute left-2 top-1 bg-indigo-600 text-white font-extrabold text-[7px] px-1 py-0.5 rounded leading-none whitespace-nowrap shadow-xs pointer-events-none">
                      📍 {guide.label} ({Math.round(guide.value)}cm)
                    </span>
                  </div>
                );
              }
            })}

            {/* Layout items mapping */}
            {currentLevelItems.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/5 pointer-events-none">
                <Map className="w-12 h-12 text-slate-400 mb-2" />
                <p className="text-sm font-black text-slate-800 uppercase">設営レイアウトは未登録です</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  右側の「配置可能ギア」から設営したいものを選んで、キャンバス上に配置しましょう。
                </p>
              </div>
            ) : (
              currentLevelItems.map((li) => {
                const g = gears.find(item => item.id === li.gearId);
                if (!g) return null;

                const isSelected = selectedLayoutId === li.id;

                // Percentage Width and Height with fallbacks
                const itemWidth = g.expandedWidth || g.packedWidth || 30;
                const itemDepth = g.expandedDepth || g.packedDepth || 30;
                const widthPercent = (itemWidth / currentWidth) * 100;
                const heightPercent = (itemDepth / currentHeight) * 100;

                const leftPercent = (li.x / currentWidth) * 100;
                const topPercent = (li.y / currentHeight) * 100;

                // Determine CSS shape / clip-path
                const shape = g.shape || 'rectangle';
                let clipPath: string | undefined = undefined;
                let borderRadiusStyle = 'rounded-sm';

                if (shape === 'circle') {
                  borderRadiusStyle = 'rounded-full';
                } else if (shape === 'hexagon') {
                  clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
                } else if (shape === 'octagon') {
                  clipPath = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
                } else if (shape === 'triangle') {
                  clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)';
                } else if (shape === 'diamond') {
                  clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
                } else if (shape === 'custom') {
                  const points = g.customPolygon || '20% 0%, 80% 0%, 100% 100%, 0% 100%';
                  clipPath = points.trim().startsWith('polygon(') ? points.trim() : `polygon(${points.trim()})`;
                }

                // Custom colors according to category types without borders initially
                let bgStyle = 'bg-cyan-500/80 text-white';
                if (g.category === 'Tent') bgStyle = 'bg-[#FF5C00]/85 text-white';
                else if (g.category === 'Tarp') bgStyle = 'bg-emerald-600/85 text-white';
                else if (g.category === 'Table') bgStyle = 'bg-amber-800 text-amber-200';
                else if (g.category === 'Chair') bgStyle = 'bg-rose-600 text-white';
                else if (g.category === 'Lantern') bgStyle = 'bg-yellow-400 text-slate-900';

                // Add standard CSS border to non-clipped shapes
                if (!clipPath) bgStyle += ' border-[1.5px] border-black';

                return (
                  <div
                    key={li.id}
                    id={`layout-item-${li.id}`}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      transform: `translate(-50%, -50%) rotate(${li.rotation}deg)`,
                      touchAction: 'none', // Prevent touch-screen scrolling during drag
                      zIndex: isSelected ? 50 : 20
                    }}
                    className="absolute"
                  >
                    {/* Free degree rotation drag handle */}
                    {isSelected && (
                      <>
                        {/* Connecting line */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-[1.5px] h-4 bg-black pointer-events-none" />
                        {/* Handle button */}
                        <div
                          onPointerDown={(e) => handleRotateStart(e, li)}
                          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[22px] w-[22px] h-[22px] bg-white hover:bg-[#FF5C00] text-black hover:text-white rounded-full border border-black flex items-center justify-center cursor-alias shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:shadow-none transition z-55 select-none text-[11px] font-bold"
                          title="ドラッグでぐるぐる回転 (Drag to rotate)"
                          onClick={(e) => e.stopPropagation()}
                        >
                          🔄
                        </div>
                      </>
                    )}

                    {/* The physical clipped layout representation */}
                    <div 
                      className={`w-full h-full relative transition-all duration-150 ${
                        isSelected ? 'scale-[1.03] drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]' : 'hover:scale-[1.01] hover:brightness-105 drop-shadow-sm'
                      }`}
                    >
                      {/* SVG Stroke Overlay for clipped shapes */}
                      {clipPath && (() => {
                        const content = clipPath.match(/polygon\((.*?)\)/)?.[1];
                        if (!content) return null;
                        const svgPoints = content.split(',').map(pair => {
                          const [x, y] = pair.trim().split(/\s+/);
                          return `${parseFloat(x) || 0},${parseFloat(y) || 0}`;
                        }).join(' ');

                        return (
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10 transition-all duration-150">
                            <polygon 
                              points={svgPoints} 
                              fill="none" 
                              stroke="black" 
                              strokeWidth={isSelected ? "3" : "1.5"} 
                              vectorEffect="non-scaling-stroke" 
                              strokeLinejoin="round"
                            />
                          </svg>
                        );
                      })()}

                      <div
                        onPointerDown={(e) => handlePointerDown(e, li)}
                        onPointerMove={(e) => handlePointerMove(e, li)}
                        onPointerUp={(e) => handlePointerUp(e, li)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayoutId(li.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const g = gears.find(item => item.id === li.gearId);
                          if (g) onEditGearInInventory(g.id);
                        }}
                        style={{
                          clipPath: clipPath,
                        }}
                        className={`w-full h-full absolute inset-0 flex flex-col items-center justify-center p-1 text-center select-none cursor-grab active:cursor-grabbing transition-all duration-150 ${borderRadiusStyle} ${bgStyle} ${
                          isSelected ? (!clipPath && 'ring-[3px] ring-black ring-offset-1') : ''
                        }`}
                      >
                      <div className="scale-90 flex flex-col justify-between h-full w-full pointer-events-none overflow-hidden">
                        <span className="text-[9px] font-black line-clamp-1 leading-tight tracking-tighter block text-white/95">
                          {g.category === 'Tent' ? '⛺ ' : g.category === 'Tarp' ? '⛵ ' : ''}
                          {g.name}
                        </span>
                        
                        <span className="text-[7.5px] font-mono opacity-95 block tracking-tighter bg-black/25 py-0.5 rounded leading-none shrink-0 border border-white/10 text-white">
                          {g.expandedWidth || g.packedWidth || 30}x{g.expandedDepth || g.packedDepth || 30}cm
                        </span>
                      </div>

                      {/* Small rotation tag */}
                      {li.rotation > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-black text-rose-300 text-[6px] font-bold font-mono p-0.5 rounded leading-none pointer-events-none">
                          {li.rotation}°
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Floating direct control popover on the left or right of the projection */}
                    {isSelected && (
                      <div
                        style={{
                          transform: `translateY(-50%) rotate(${-li.rotation}deg)`,
                        }}
                        className={`absolute top-1/2 ${
                          leftPercent > 70 
                            ? 'right-full mr-2' 
                            : 'left-full ml-2'
                        } flex flex-col gap-1 bg-white border border-black p-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-sm z-[100] pointer-events-auto select-none`}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditGearInInventory(g.id);
                          }}
                          className="w-7 h-7 bg-white hover:bg-neutral-100 text-[#FF5C00] border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-[1px_1px_0px_#000] hover:shadow-none"
                          title="✏️ 手持ち設定スペックを編集"
                        >
                          ✏️
                        </button>
                        
                        {/* Quick 90 degree rotate button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextRot = (li.rotation + 90) % 360;
                            onUpdateLayoutItemRotation(li.id, nextRot);
                          }}
                          className="w-7 h-7 bg-white hover:bg-neutral-100 text-slate-800 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-[1px_1px_0px_#000] hover:shadow-none"
                          title="🔄 90度回転 (Click to rotate 90°)"
                        >
                          🔄
                        </button>

                        {/* Reset Rotation Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateLayoutItemRotation(li.id, 0);
                          }}
                          className="w-7 h-7 bg-white hover:bg-neutral-100 text-slate-800 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-[1px_1px_0px_#000] hover:shadow-none"
                          title="↩️ 角度をリセット / 0度にする (Reset rotation to 0°)"
                        >
                          ↩️
                        </button>

                        {/* Remove / Deploy-out Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveLayoutItem(li.id);
                            setSelectedLayoutId(null);
                          }}
                          className="w-7 h-7 bg-white hover:bg-rose-50 text-rose-600 border border-black rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-[1px_1px_0px_#000] hover:shadow-none"
                          title="🗑️ 設営地から撤去"
                        >
                          🗑️
                        </button>
                        {/* Context Mover */}
                        <select
                          className="w-16 bg-white border border-black text-[9px] p-0.5 rounded shadow-[1px_1px_0px_#000]"
                          value={li.layoutParentId || 'campsite'}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateLayoutItemParent(li.id, e.target.value);
                            setSelectedLayoutId(null);
                          }}
                        >
                          <option value="campsite">サイト設営</option>
                          {containerItems.filter(c => c.id !== li.id).map(c => {
                            const cGear = gears.find(g => g.id === c.gearId);
                            if (!cGear) return null;
                            return <option key={c.id} value={c.id}>{cGear.name}</option>;
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Reference Scale Legend line */}
          <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-1.5">
              <span>縮尺表示:</span>
              <div className="w-10 h-1.5 bg-black border border-white inline-block"></div>
              <span>80cm</span>
            </div>
            <span>※テントやタープなど、設営時の全体占有サイズでシミュレーションしています。</span>
          </div>
        </div>
      </div>

      {/* 2. RIGHT SIDE: Placement list & Coordinates Settings (4 Columns) */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        
        {/* Campsite Design & Layout Operation Guide */}
        <div className="bg-[#FFFDF9] border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-fade-in text-slate-900">
          <div className="flex items-center gap-1 text-xs font-black uppercase text-slate-800">
            <HelpCircle className="w-4 h-4 text-[#FF5C00] animate-bounce" />
            <span>レイアウト・操作ヘルプ</span>
          </div>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            キャンバス内の設営ギアを<b>ドラッグ＆ドロップ（またはタッチ操作）</b>して、直感的に好きな場所へ配置できます。
          </p>
          <div className="mt-3 bg-white border border-slate-200 p-2.5 rounded-sm space-y-1.5 text-[11px]">
            <p className="font-bold text-slate-800">☝️ タップしてクイック微調整</p>
            <p className="text-slate-500 text-[10px] leading-relaxed">
              ギアをクリック/タップすると、投影のすぐ横に<b>「撤去」「スペック編集」「回転角度(自由度スライダー)」</b>が表示されます。
            </p>
            <p className="font-bold text-slate-800 mt-2">✌️ ダブルクリックで詳細表示</p>
            <p className="text-slate-500 text-[10px] leading-relaxed">
              ギアをダブルクリック/ダブルタップすると、サイズ情報や図面設定を直接開き詳細な設定変更が可能です。
            </p>
          </div>
        </div>

        {/* 2. PLACEMENT MENU: ALL AVAILABLE REGISTERED GEARS */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5 mb-1.5">
            <Plus className="w-4 h-4 text-[#FF5C00]" />
            設営地に配置できるギア ({placeableGears.length}種類登録済)
          </h4>
          <p className="text-[10px] text-slate-500 mb-4">
            登録された手持ちギアをお好みの位置に落としてレイアウトします。複数回クリックするとさらに追加配置できます。
          </p>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {placeableGears.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">ギアが登録されていません。「ギアライブラリ」から先に手持ちギアを新規作成してください。</p>
            ) : (
              placeableGears.map((g) => {
                const placements = layoutItems.filter(li => li.gearId === g.id);
                return (
                  <div 
                    key={g.id} 
                    className="border border-black p-2.5 bg-white text-xs flex justify-between items-center hover:border-[#FF5C00]"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-2 h-2 rounded-full ${
                          g.category === 'Tent' ? 'bg-[#FF5C00]' : g.category === 'Tarp' ? 'bg-emerald-500' : 'bg-slate-450'
                        }`}></span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 leading-tight">{g.name}</span>
                          <button
                            onClick={() => onEditGearInInventory(g.id)}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer p-0.5 rounded transition text-xs shrink-0"
                            title="手持ち設定スペックを編集"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 block mb-1">設営: W{g.expandedWidth} x D{g.expandedDepth} x H{g.expandedHeight} cm</span>
                      
                      {placements.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {placements.map(li => {
                            const parentName = li.layoutParentId === 'campsite' || !li.layoutParentId
                              ? 'サイト設営'
                              : gears.find(parentGear => parentGear.id === layoutItems.find(pli => pli.id === li.layoutParentId)?.gearId)?.name || 'テント内';
                            return (
                              <span key={li.id} className="text-[8px] font-bold text-[#FF5C00] bg-[#FF5C00]/10 px-1 py-0.5 rounded border border-[#FF5C00]/30 whitespace-nowrap">
                                📍 {parentName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => onAddLayoutItem(g.id, layoutContextId, Math.round(currentWidth / 2), Math.round(currentHeight / 2))}
                        className="bg-black hover:bg-[#FF5C00] text-white font-bold text-[10px] items-center text-center uppercase px-2 py-1.5 transition cursor-pointer flex flex-col gap-0.5"
                      >
                        <span>+ 設営</span>
                        <span className="text-[7.5px] scale-90 opacity-80 whitespace-nowrap font-medium text-amber-200">
                          {layoutContextId === 'campsite' ? 'サイトに' : 'このテント内に'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

