import React, { useState } from 'react';
import { GearItem, GearCategory, Baggage, StorageContainer } from '../types';
import { Search, Trash2, Package, Download, Edit, Database, List, LayoutGrid, Copy } from 'lucide-react';

interface GearListProps {
  gears: GearItem[];
  onRemoveGear: (id: string) => void;
  onRemoveGears?: (ids: string[]) => void;
  onUpdateGear: (gear: GearItem) => void;
  onCopyGear?: (id: string) => void;
  getStorageName: (parentId: string) => string;
  baggages: Baggage[];
  storages: StorageContainer[];
  editingId?: string | null;
  setEditingId?: (id: string | null) => void;
}

const CATEGORIES_LABELS: Record<GearCategory, { name: string; bg: string; text: string; dot: string }> = {
  Tent: { name: 'テント', bg: 'bg-cyan-50 border-cyan-100', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  Tarp: { name: 'タープ', bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  Chair: { name: 'チェア', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  Table: { name: 'テーブル', bg: 'bg-yellow-50 border-yellow-105', text: 'text-yellow-800', dot: 'bg-yellow-600' },
  Lantern: { name: 'ランタン', bg: 'bg-orange-50 border-orange-100', text: 'text-orange-850', dot: 'bg-orange-500' },
  Cooking: { name: '調理・焚き火', bg: 'bg-rose-50 border-rose-100', text: 'text-rose-800', dot: 'bg-rose-500' },
  Bedding: { name: 'コット・寝具', bg: 'bg-violet-50 border-violet-100', text: 'text-violet-800', dot: 'bg-violet-500' },
  Baggage: { name: 'バゲージ/コンテナ', bg: 'bg-[#FF5CC0]/10 border-[#FF5C00]/25', text: 'text-[#C03E00]', dot: 'bg-[#FF5400]' },
  Storage: { name: '収納バッグ/ケース', bg: 'bg-emerald-50 border-emerald-250', text: 'text-emerald-850', dot: 'bg-[#1DBA54]' },
  Other: { name: 'その他', bg: 'bg-slate-50 border-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' }
};

export default function GearList({ 
  gears, 
  onRemoveGear, 
  onRemoveGears,
  onUpdateGear, 
  onCopyGear,
  getStorageName, 
  baggages, 
  storages,
  editingId,
  setEditingId
}: GearListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);

  const startEditing = (g: GearItem) => {
    if (setEditingId) {
      setEditingId(g.id);
    }
  };

  const filteredGears = gears.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (g.brand && g.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentIds = filteredGears.map(g => g.id);
      setSelectedGearIds(prev => {
        const next = [...prev];
        currentIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    } else {
      const currentIds = filteredGears.map(g => g.id);
      setSelectedGearIds(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectGear = (gearId: string, checked: boolean) => {
    if (checked) {
      setSelectedGearIds(prev => [...prev, gearId]);
    } else {
      setSelectedGearIds(prev => prev.filter(id => id !== gearId));
    }
  };

  const handleBulkRemoveChange = () => {
    if (selectedGearIds.length === 0) return;
    
    if (!isConfirmingBulkDelete) {
      setIsConfirmingBulkDelete(true);
      // Automatically reset confirmation after 4 seconds of inactivity
      setTimeout(() => {
        setIsConfirmingBulkDelete(false);
      }, 4000);
      return;
    }

    if (onRemoveGears) {
      onRemoveGears(selectedGearIds);
    } else {
      selectedGearIds.forEach(id => onRemoveGear(id));
    }
    setSelectedGearIds([]);
    setIsConfirmingBulkDelete(false);
  };

  // Stats calculate
  const totalWeight = gears.reduce((sum, g) => sum + g.weight, 0);
  const packedCount = gears.filter(g => g.parentId !== 'unassigned').length;
  const packedWeight = gears.filter(g => g.parentId !== 'unassigned').reduce((sum, g) => sum + g.weight, 0);

  const handleExportCSV = () => {
    if (gears.length === 0) {
      alert("エクスポートするギアが登録されていません。");
      return;
    }
    const headers = [
      "カテゴリ", "ブランド名", "ギア名", 
      "収納幅(cm)", "収納奥行(cm)", "収納高さ(cm)", 
      "設営幅(cm)", "設営奥行(cm)", "設営高さ(cm)", 
      "重量(kg)", "説明"
    ];
    
    const rows = gears.map(g => [
      g.category,
      g.brand || '',
      g.name,
      g.packedWidth,
      g.packedDepth,
      g.packedHeight,
      g.expandedWidth,
      g.expandedDepth,
      g.expandedHeight,
      g.weight,
      g.description || ''
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(val => {
      const s = String(val).replace(/"/g, '""');
      return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
    }).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `camp_gear_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="gear-list-section" className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] text-slate-800">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4 mb-5">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5 text-black">
            📋 登録済みギア一覧・スペック管理
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            登録されたギアの検索、CSV出力、および個々のスペックや2D形状のカスタマイズが可能です。
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-black hover:bg-neutral-800 text-white font-extrabold text-[10px] px-3.5 py-2.5 rounded-none border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:scale-95 transition flex items-center gap-1.5 cursor-pointer max-w-fit"
          title="登録済みの全ギアをCSVエクスポート（Excel確認対応）"
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSVエクスポート</span>
        </button>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 text-[11px] grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="block text-slate-400 font-bold">総登録数 / 重量:</span>
          <span className="font-extrabold text-slate-800 text-xs">
            {gears.length}点 <span className="font-medium text-slate-500 font-mono">({totalWeight.toFixed(1)}kg)</span>
          </span>
        </div>
        <div>
          <span className="block text-[#FF5C00] font-bold">パッキング済み数:</span>
          <span className="font-extrabold text-[#FF5C00] text-xs">
            {packedCount}点 / {gears.length}点 <span className="font-medium text-slate-500 font-mono">({Math.round(gears.length > 0 ? (packedCount/gears.length)*100 : 0)}%)</span>
          </span>
        </div>
        <div>
          <span className="block text-indigo-700 font-bold">車載済み総重量:</span>
          <span className="font-extrabold text-indigo-700 text-xs font-mono">
            {packedWeight.toFixed(1)} kg
          </span>
        </div>
        <div>
          <span className="block text-slate-400 font-bold">パッキング進捗率:</span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#FF5C00] h-full rounded-full transition-all duration-500"
                style={{ width: `${gears.length > 0 ? (packedCount / gears.length) * 100 : 0}%` }}
              />
            </div>
            <span className="font-bold text-slate-900 leading-none">
              {gears.length > 0 ? Math.round((packedCount / gears.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            placeholder="商品名、ブランド、キーワードで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">すべてのカテゴリ</option>
            {Object.keys(CATEGORIES_LABELS).map(key => (
              <option key={key} value={key}>{CATEGORIES_LABELS[key as GearCategory].name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action and View Settings Bar */}
      {gears.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 text-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-black text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                checked={filteredGears.length > 0 && filteredGears.every(g => selectedGearIds.includes(g.id))}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span>ページ内全選択 ({filteredGears.length}点中)</span>
            </label>
            
            {selectedGearIds.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBulkRemoveChange}
                  className={`font-extrabold px-3 py-1.5 rounded-md border active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer text-[10px] ${
                    isConfirmingBulkDelete
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.4)] font-black'
                      : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {isConfirmingBulkDelete
                      ? `⚠️ 本当に削除？もう一度押して確定 (${selectedGearIds.length}点)`
                      : `選択した ${selectedGearIds.length} 点を一括削除`
                    }
                  </span>
                </button>
                {isConfirmingBulkDelete && (
                  <button
                    onClick={() => setIsConfirmingBulkDelete(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold px-2.5 py-1.5 rounded-md text-[10px] transition-all cursor-pointer"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">表示形式:</span>
            <div className="inline-flex rounded-lg bg-slate-150 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-900 shadow-xs font-black border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="グリッド(カード)表示"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[10px]">グリッド</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-white text-slate-900 shadow-xs font-black border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="スリム一列リスト表示"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[10px]">一列リスト</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gears list cards */}
      {filteredGears.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold">該当するギアが見つかりませんでした。</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {gears.length === 0 ? '上のフォームからギアを追加しましょう！' : '検索条件を変更してください。'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
          {filteredGears.map((g) => {
            const style = CATEGORIES_LABELS[g.category];
            const isPacked = g.parentId !== 'unassigned';
            const locationName = isPacked ? getStorageName(g.parentId) : '未パッキング';
            const isSelected = selectedGearIds.includes(g.id);

            return (
              <div 
                key={g.id} 
                className={`bg-white border rounded-xl p-4 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all flex flex-col justify-between ${
                  isSelected ? 'border-indigo-400 bg-indigo-50/10' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-1 cursor-pointer"
                        checked={isSelected}
                        onChange={(e) => handleSelectGear(g.id, e.target.checked)}
                      />
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                        {style.name}
                      </span>
                      {g.brand && (
                        <span className="text-xs text-slate-500 font-medium">
                          {g.brand}
                        </span>
                      )}
                      {g.shape && (g.category === 'Tent' || g.category === 'Tarp') && (
                        <span className="text-[10px] bg-slate-100 text-slate-705 px-1.5 py-0.5 rounded font-black border border-slate-150">
                          {g.shape === 'circle' ? '⚫ 円形' :
                           g.shape === 'hexagon' ? '⬢ 六角' :
                           g.shape === 'octagon' ? '⬣ 八角' :
                           g.shape === 'triangle' ? '▲ 三角' :
                           g.shape === 'diamond' ? '◆ ひし形' : 
                           g.shape === 'custom' ? '📐 カスタム' : '⬛ 四角'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Copy (Duplicate) Button */}
                      <button
                        onClick={() => onCopyGear?.(g.id)}
                        className="text-slate-400 hover:text-emerald-650 transition-colors p-1.5 rounded-md hover:bg-slate-50 cursor-pointer"
                        title="このギアを複製 (コピー)"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Button (Global modal trigger) */}
                      <button
                        onClick={() => startEditing(g)}
                        className="text-slate-400 hover:text-indigo-650 transition-colors p-1.5 rounded-md hover:bg-slate-50 cursor-pointer"
                        title="スペック・形状の統合編集"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onRemoveGear(g.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-md hover:bg-slate-50 cursor-pointer"
                        title="ギア削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs font-black text-slate-800 leading-snug">
                    {g.name}
                  </h4>

                  {g.description && (
                    <p className="text-[10.5px] text-slate-450 mt-1 line-clamp-2 leading-relaxed">
                      {g.description}
                    </p>
                  )}
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-4 text-[10px]">
                  <div className="space-y-0.5">
                    <span className="block text-slate-400 font-bold">収納 (Packed):</span>
                    <span className="font-mono text-slate-600 font-bold">
                      {g.packedWidth}x{g.packedDepth}x{g.packedHeight} cm
                    </span>
                  </div>

                  <div className="space-y-0.5 text-right">
                    <span className="block text-slate-400 font-bold">積載位置 / 重量:</span>
                    <span className="font-extrabold text-[#FF5C00] font-mono">
                      {locationName} <span className="text-slate-450 font-bold">({g.weight}kg)</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode View (Compact Row Style Table) */
        <div className="max-h-[500px] overflow-y-auto pr-1 border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
          <div className="min-w-full divide-y divide-slate-200 text-xs">
            {/* Table Header: visible only on larger screens */}
            <div className="hidden md:flex bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 items-center sticky top-0 z-10 border-b border-slate-200">
              <div className="w-8 flex justify-center">選択</div>
              <div className="w-24">カテゴリ</div>
              <div className="w-28 pl-4">ブランド</div>
              <div className="flex-1 min-w-[150px] pl-4">ギア名</div>
              <div className="w-36 text-center">収納サイズ</div>
              <div className="w-20 text-right pr-2">重量</div>
              <div className="w-28 text-center">積載位置</div>
              <div className="w-20 text-center">操作</div>
            </div>

            {/* List Rows */}
            <div className="divide-y divide-slate-100">
              {filteredGears.map((g) => {
                const style = CATEGORIES_LABELS[g.category];
                const isPacked = g.parentId !== 'unassigned';
                const locationName = isPacked ? getStorageName(g.parentId) : '未パッキング';
                const isSelected = selectedGearIds.includes(g.id);

                return (
                  <div 
                    key={g.id} 
                    className={`flex flex-col md:flex-row items-start md:items-center px-4 py-3.5 md:py-2.5 transition-colors hover:bg-slate-50/80 gap-2 md:gap-0 ${
                      isSelected ? 'bg-indigo-50/5' : ''
                    }`}
                  >
                    {/* Checkbox / Meta for mobile */}
                    <div className="w-full md:w-8 flex items-center justify-between md:justify-center border-b md:border-b-0 border-slate-100 pb-2 md:pb-0">
                      <label className="flex md:hidden text-[10px] text-slate-450 font-bold uppercase tracking-wider items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleSelectGear(g.id, e.target.checked)}
                        />
                        <span>選択する</span>
                      </label>
                      
                      <input
                        type="checkbox"
                        className="hidden md:block w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={isSelected}
                        onChange={(e) => handleSelectGear(g.id, e.target.checked)}
                      />
                      
                      {/* Category Badge for Mobile screen */}
                      <span className="md:hidden">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${style.bg} ${style.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                          {style.name}
                        </span>
                      </span>
                    </div>

                    {/* Category Column (Desktop Only) */}
                    <div className="hidden md:block w-24 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                        {style.name}
                      </span>
                    </div>

                    {/* Brand Column */}
                    <div className="w-full md:w-28 shrink-0 pl-0 md:pl-4 text-slate-700 font-medium text-xs">
                      <span className="md:hidden text-slate-400 font-bold text-[9px] mr-1.5">ブランド:</span>
                      {g.brand || <span className="text-slate-300 italic text-[10px]">-</span>}
                    </div>

                    {/* Name Column */}
                    <div className="w-full flex-1 pl-0 md:pl-4 flex items-center gap-1.5 flex-wrap">
                      <span className="md:hidden text-slate-400 font-bold text-[9px] mr-1.5">ギア名:</span>
                      <h4 className="font-bold text-slate-800 text-xs">
                        {g.name}
                      </h4>
                      {g.shape && (g.category === 'Tent' || g.category === 'Tarp') && (
                        <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-black border border-slate-200">
                          {g.shape === 'circle' ? '⚫ 円形' :
                           g.shape === 'hexagon' ? '⬢ 六角' :
                           g.shape === 'octagon' ? '⬣ 八角' :
                           g.shape === 'triangle' ? '▲ 三角' :
                           g.shape === 'diamond' ? '◆ ひし形' : 
                           g.shape === 'custom' ? '📐 カスタム' : '⬛ 四角'}
                        </span>
                      )}
                    </div>

                    {/* Size Column */}
                    <div className="w-full md:w-36 shrink-0 text-left md:text-center font-mono">
                      <span className="md:hidden text-slate-400 font-bold text-[9px] mr-1.5">収納サイズ:</span>
                      <span className="text-slate-600 font-semibold">{g.packedWidth} x {g.packedDepth} x {g.packedHeight} cm</span>
                    </div>

                    {/* Weight Column */}
                    <div className="w-full md:w-20 shrink-0 text-left md:text-right font-mono pr-0 md:pr-2">
                      <span className="md:hidden text-slate-450 font-bold text-[9px] mr-1.5">重量:</span>
                      <span className="font-bold text-slate-700">{g.weight.toFixed(1)} kg</span>
                    </div>

                    {/* Location Column */}
                    <div className="w-full md:w-28 shrink-0 text-left md:text-center text-xs">
                      <span className="md:hidden text-slate-450 font-bold text-[9px] mr-1.5">積載位置:</span>
                      <span className="font-extrabold text-[#FF5C00]">
                        {locationName}
                      </span>
                    </div>

                    {/* Action Column */}
                    <div className="w-full md:w-20 shrink-0 flex justify-end md:justify-center items-center gap-1 md:gap-1.5 border-t border-dashed md:border-t-0 border-slate-100 mt-2 md:mt-0 pt-2 md:pt-0">
                      <span className="md:hidden text-slate-450 font-bold text-[9px] mr-auto">操作:</span>
                      <button
                        onClick={() => onCopyGear?.(g.id)}
                        className="text-slate-450 hover:text-emerald-650 transition-colors p-1.5 rounded-md hover:bg-slate-105 cursor-pointer"
                        title="このギアを複製 (コピー)"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => startEditing(g)}
                        className="text-slate-450 hover:text-indigo-650 transition-colors p-1.5 rounded-md hover:bg-slate-105 cursor-pointer"
                        title="スペック・形状の統合編集"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onRemoveGear(g.id)}
                        className="text-slate-450 hover:text-rose-600 transition-colors p-1.5 rounded-md hover:bg-slate-105 cursor-pointer"
                        title="ギア削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
