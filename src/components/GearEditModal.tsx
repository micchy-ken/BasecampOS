import React, { useState, useEffect } from 'react';
import { GearItem, GearCategory, GearShape, Baggage, StorageContainer, GearCandidate } from '../types';
import { 
  Sparkles, 
  Loader2, 
  Upload, 
  AlertCircle,
  Check,
  X,
  Database,
  ShieldAlert
} from 'lucide-react';

interface GearEditModalProps {
  gear: GearItem | null;
  onClose: () => void;
  onUpdateGear: (updated: GearItem) => void;
  baggages: Baggage[];
  storages: StorageContainer[];
  getStorageName: (parentId: string) => string;
}

const CATEGORIES: { value: GearCategory; label: string }[] = [
  { value: 'Tent', label: 'テント (Tent)' },
  { value: 'Tarp', label: 'タープ (Tarp)' },
  { value: 'Chair', label: 'チェア (Chair)' },
  { value: 'Table', label: 'テーブル (Table)' },
  { value: 'Lantern', label: 'ランタン・照明 (Lantern)' },
  { value: 'Cooking', label: '調理・焚き火 (Cooking)' },
  { value: 'Bedding', label: 'コット・寝具 (Bedding)' },
  { value: 'Baggage', label: 'バゲージ/コンテナ (Baggage)' },
  { value: 'Storage', label: '収納ケース・バッグ (Storage)' },
  { value: 'Other', label: 'その他 (Other)' },
];

export default function GearEditModal({ 
  gear, 
  onClose, 
  onUpdateGear,
  baggages,
  storages,
  getStorageName
}: GearEditModalProps) {
  if (!gear) return null;

  // Controlled states for Gear fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<GearCategory>('Tent');
  const [weight, setWeight] = useState(0);
  const [shape, setShape] = useState<GearShape>('rectangle');
  const [customPolygon, setCustomPolygon] = useState('20% 0%, 80% 0%, 100% 100%, 0% 100%');
  const [parentId, setParentId] = useState('unassigned');
  const [containerColor, setContainerColor] = useState('#FF5C00');
  const [containerType, setContainerType] = useState('soft_container');

  const [packedWidth, setPackedWidth] = useState(0);
  const [packedDepth, setPackedDepth] = useState(0);
  const [packedHeight, setPackedHeight] = useState(0);
  const [expandedWidth, setExpandedWidth] = useState(0);
  const [expandedDepth, setExpandedDepth] = useState(0);
  const [expandedHeight, setExpandedHeight] = useState(0);
  const [description, setDescription] = useState('');

  const [isAILookingUp, setIsAILookingUp] = useState(false);
  const [candidates, setCandidates] = useState<GearCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [isFetchingWebShape, setIsFetchingWebShape] = useState(false);
  const [webShapeError, setWebShapeError] = useState<string | null>(null);
  const [editorMsg, setEditorMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Initialize fields
  useEffect(() => {
    if (gear) {
      setName(gear.name || '');
      setBrand(gear.brand || '');
      setCategory(gear.category || 'Tent');
      setWeight(gear.weight || 0);
      setShape(gear.shape || 'rectangle');
      setCustomPolygon(gear.customPolygon || '20% 0%, 80% 0%, 100% 100%, 0% 100%');
      setParentId(gear.parentId || 'unassigned');
      setContainerColor(gear.containerColor || '#FF5C00');
      setContainerType(gear.containerType || 'soft_container');

      setPackedWidth(gear.packedWidth || 0);
      setPackedDepth(gear.packedDepth || 0);
      setPackedHeight(gear.packedHeight || 0);
      setExpandedWidth(gear.expandedWidth || 0);
      setExpandedDepth(gear.expandedDepth || 0);
      setExpandedHeight(gear.expandedHeight || 0);
      setDescription(gear.description || '');

      setWebShapeError(null);
      setEditorMsg(null);
    }
  }, [gear]);

  const applyCandidate = (data: GearCandidate) => {
    setName(data.name || name);
    setBrand(data.brand || brand);
    if (data.category && CATEGORIES.some(c => c.value === data.category)) {
      setCategory(data.category as GearCategory);
    }
    setPackedWidth(data.packedWidth || 40);
    setPackedDepth(data.packedDepth || 20);
    setPackedHeight(data.packedHeight || 20);
    setExpandedWidth(data.expandedWidth || 200);
    setExpandedDepth(data.expandedDepth || 200);
    setExpandedHeight(data.expandedHeight || 100);
    setWeight(data.weight || 2.0);
    setDescription(data.description || '');
  };

  // Text-based AI details lookup
  const handleAILookup = async () => {
    if (!name.trim()) {
      setEditorMsg({ type: 'error', text: 'AI自動スペック取得にはギア名が必要です。' });
      return;
    }
    setIsAILookingUp(true);
    setEditorMsg(null);
    setCandidates([]);
    setShowCandidates(false);

    try {
      const queryName = brand ? `${brand} ${name}` : name;
      const { lookupGearAI } = await import('../lib/ai');
      const data = await lookupGearAI(queryName);
      
      if (data && data.length > 0) {
        if (data.length === 1) {
          applyCandidate(data[0]);
          setEditorMsg({ type: 'success', text: 'AIによるスペックの自動補完に成功しました！' });
        } else {
          setCandidates(data);
          setShowCandidates(true);
          setEditorMsg({ type: 'success', text: `複数の候補が見つかりました（${data.length}件）。最適なスペックを選択してください。` });
        }
      } else {
        throw new Error('スペックデータが見つかりませんでした。');
      }
    } catch (err: any) {
      setEditorMsg({ type: 'error', text: err.message || '自動取得に失敗しました。オフライン制限中、または型番が見つかりません。' });
    } finally {
      setIsAILookingUp(false);
    }
  };

  // WEB shape fetching (vector polygon footprint)
  const handleFetchWebShape = async () => {
    if (!name.trim()) {
      alert("ギア名の情報を取得するため、ギア名/モデル名を入力してください。");
      return;
    }
    setIsFetchingWebShape(true);
    setWebShapeError(null);
    try {
      const { fetchWebShapeAI } = await import('../lib/ai');
      const data = await fetchWebShapeAI(name, category);
      if (data.polygon) {
        setCustomPolygon(data.polygon);
        setShape('custom');
        if (data.description) {
          setDescription(prev => prev ? `${prev}\n\n【平面形状の由来】: ${data.description}` : `【平面形状の由来】: ${data.description}`);
        }
      } else {
        throw new Error('形状データが見つかりませんでした。');
      }
    } catch (err: any) {
      console.error(err);
      setWebShapeError(err.message || 'エラーが発生しました。');
    } finally {
      setIsFetchingWebShape(false);
    }
  };

  // Submit edits
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: GearItem = {
      ...gear,
      name: name.trim(),
      brand: brand.trim(),
      category: category,
      shape: shape,
      customPolygon: shape === 'custom' ? customPolygon : undefined,
      packedWidth: Number(packedWidth) || 0,
      packedDepth: Number(packedDepth) || 0,
      packedHeight: Number(packedHeight) || 0,
      expandedWidth: Number(expandedWidth) || 0,
      expandedDepth: Number(expandedDepth) || 0,
      expandedHeight: Number(expandedHeight) || 0,
      weight: Number(weight) || 0,
      description: description.trim(),
      parentId: parentId,
      containerColor: (category === 'Baggage' || category === 'Storage') ? containerColor : undefined,
      containerType: (category === 'Baggage' || category === 'Storage') ? containerType : undefined
    };
    onUpdateGear(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in text-slate-800">
      <div className="bg-white border-4 border-black w-full max-w-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative text-slate-900 font-sans max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
          <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-1.5 text-black">
            ⛺ ギア登録管理スペック修正 (Edit Gear)
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-black hover:bg-slate-100 p-1.5 rounded-lg border border-black/10 cursor-pointer transition"
          >
            <X className="w-4 h-4 cursor-pointer" />
          </button>
        </div>

        {/* Message Banner */}
        {editorMsg && (
          <div className={`p-2.5 rounded-lg border-2 border-black mb-4 text-xs font-bold leading-relaxed flex items-center gap-2 ${
            editorMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}>
            {editorMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{editorMsg.text}</span>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Brand & Name Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-505 mb-1">ブランド名</label>
              <input
                type="text"
                className="w-full bg-white border border-slate-350 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs font-bold"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="例: Tent-Mark Design"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-505 mb-1 flex items-center justify-between">
                <span>ギア名 / 型番 / モデル名</span>
                <button
                  type="button"
                  onClick={handleAILookup}
                  disabled={isAILookingUp || !name}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[9px] py-1 px-2.5 rounded-md cursor-pointer flex items-center gap-1 transition-colors border-0 shrink-0"
                  title="この型番からスペックを自動取得します"
                >
                  {isAILookingUp ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  )}
                  <span>AI自動スペック取得</span>
                </button>
              </label>
              <input
                type="text"
                required
                className="w-full bg-white border border-slate-350 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {showCandidates && candidates.length > 0 && (
            <div className="bg-indigo-50/50 p-3 rounded-xl border-2 border-indigo-200 space-y-3 animate-fade-in my-2">
              <div className="text-[10px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                AIが検出したスペック候補（選択すると適用されます）：
              </div>
              <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {candidates.map((c, idx) => (
                  <div 
                    key={idx} 
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all flex flex-col justify-between gap-2 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1">
                          {c.brand && (
                            <span className="text-[8px] font-black text-white uppercase bg-indigo-600 px-1 py-0.5 rounded">
                              {c.brand}
                            </span>
                          )}
                          <h5 className="font-extrabold text-[11px] text-slate-900">
                            {c.name}
                          </h5>
                        </div>
                        <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-bold border border-slate-200 shrink-0">
                          {c.category}
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-[9px] text-slate-500 mt-1 leading-relaxed bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                          {c.description}
                        </p>
                      )}
                      <div className="mt-2 grid grid-cols-3 gap-1 bg-indigo-50/20 border border-slate-100 p-1.5 rounded-md font-mono text-[9px] text-slate-600">
                        <div>
                          <span className="font-sans block text-[7px] text-slate-400 uppercase font-black">収納サイズ</span>
                          <span className="font-bold text-slate-700">{c.packedWidth}x{c.packedDepth}x{c.packedHeight} cm</span>
                        </div>
                        <div>
                          <span className="font-sans block text-[7px] text-slate-400 uppercase font-black">展開サイズ</span>
                          <span className="font-bold text-slate-700">{c.expandedWidth}x{c.expandedDepth}x{c.expandedHeight} cm</span>
                        </div>
                        <div>
                          <span className="font-sans block text-[7px] text-slate-400 uppercase font-black">重量</span>
                          <span className="font-bold text-slate-700">{c.weight} kg</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        applyCandidate(c);
                        setEditorMsg({ type: 'success', text: `「${c.brand ? c.brand + ' ' : ''}${c.name}」のスペックを適用しました！` });
                        setShowCandidates(false);
                      }}
                      className="w-full py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded transition-all cursor-pointer text-center"
                    >
                      この候補のスペックを適用する
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div>
              <label className="block text-[10px] font-black text-slate-505 mb-1">カテゴリ</label>
              <select
                className="w-full bg-white border border-slate-350 p-2.5 rounded-lg focus:outline-none font-bold text-xs h-[38px]"
                value={category}
                onChange={(e) => setCategory(e.target.value as GearCategory)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Weight */}
            <div>
              <label className="block text-[10px] font-black text-slate-505 mb-1">全体重量 (kg)</label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-white border border-slate-350 p-2.5 rounded-lg focus:outline-none font-mono font-bold text-xs h-[38px]"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Packing Selector */}
            <div>
              <label className="block text-[10px] font-black text-[#FF5C00] mb-1">🎁 積載・保管場所</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-white border border-slate-350 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF5C00] font-bold text-xs h-[38px]"
              >
                <option value="unassigned">未パッキング（未積載）</option>
                <option value="vehicle">🚗 車両に直積み（トランク）</option>
                {baggages.map(b => (
                  <option key={b.id} value={b.id}>👜 {b.name}</option>
                ))}
                {storages.map(s => (
                  <option key={s.id} value={s.id}>📁 {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Container Settings for Baggage or Storage */}
          {(category === 'Baggage' || category === 'Storage') && (
            <div className="p-3 bg-indigo-50/50 border border-black/10 rounded-xl space-y-3">
              <span className="block text-[10px] font-black text-indigo-900">📦 コンテナ規格の追加設定</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">表示カラー (Color Picker)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={containerColor}
                      onChange={(e) => setContainerColor(e.target.value)}
                      className="w-8 h-8 rounded border border-black cursor-pointer bg-white p-0.5"
                    />
                    <input
                      type="text"
                      value={containerColor}
                      onChange={(e) => setContainerColor(e.target.value)}
                      className="flex-1 bg-white border-2 border-black rounded-lg px-2 py-1 text-[11px] font-mono"
                      placeholder="#HEX"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">コンテナの物理タイプ</label>
                  {category === 'Baggage' ? (
                    <select
                      value={containerType}
                      onChange={(e) => setContainerType(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1.5 text-[11px]"
                    >
                      <option value="hard_container">🗃️ ハードシェル / トランクカーゴ</option>
                      <option value="soft_container">👜 ソフトコンテナ / ボックス</option>
                      <option value="totes">🛍️ 大型収納トートバッグ</option>
                      <option value="box">📦 段ボール・ボックス</option>
                    </select>
                  ) : (
                    <select
                      value={containerType}
                      onChange={(e) => setContainerType(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1.5 text-[11px]"
                    >
                      <option value="bag">🎒 ロールトップ・スタッフバッグ</option>
                      <option value="box">📁 折りたたみ仕切りケース</option>
                      <option value="case">💼 ギア専用セミハードケース</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footprint Shapes only for Tents / Tarps */}
          {(category === 'Tent' || category === 'Tarp') && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3">
              <span className="block text-[10px] font-black text-slate-705">📐 設営時の平面形状設定 (Shapes Footprint)</span>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {[
                  { value: 'rectangle', label: '四角形', icon: '⬛' },
                  { value: 'circle', label: '円形・丸型', icon: '⚫' },
                  { value: 'hexagon', label: '六角形', icon: '⬢' },
                  { value: 'octagon', label: '八角形', icon: '⬣' },
                  { value: 'triangle', label: '三角形', icon: '▲' },
                  { value: 'diamond', label: 'ひし形', icon: '◆' },
                  { value: 'custom', label: 'カスタム', icon: '📐' }
                ].map(sh => (
                  <button
                    key={sh.value}
                    type="button"
                    onClick={() => setShape(sh.value as GearShape)}
                    className={`border px-1.5 py-1.5 text-[10px] rounded-lg text-center flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      shape === sh.value
                        ? 'border-[#FF5600] bg-[#FF5600]/5 text-[#FF5600] font-black'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="text-xs shrink-0">{sh.icon}</span>
                    <span className="truncate">{sh.label}</span>
                  </button>
                ))}
              </div>

              {shape === 'custom' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 animate-fade-in text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-250 pb-2">
                    <div>
                      <h5 className="text-[11px] font-black text-slate-800">📐 カスタム平面ベクター形状の編集</h5>
                      <p className="text-[9px] text-slate-500">時計回りのパーセント座標列を入力</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleFetchWebShape}
                      disabled={isFetchingWebShape}
                      className="bg-black hover:bg-[#FF5C00] disabled:bg-slate-300 text-white text-[10px] font-black py-1 px-2.5 rounded-md flex items-center gap-1 transition-colors border-0 cursor-pointer"
                    >
                      {isFetchingWebShape ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-[#FF5C00]" />
                      )}
                      <span>WEBから図形を取得</span>
                    </button>
                  </div>

                  {webShapeError && (
                    <div className="text-[9px] text-rose-600 bg-rose-50 p-1.5 border border-rose-100 rounded-lg">
                      <span>{webShapeError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-8 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600">頂点座標列 (% Coordinates)</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                        value={customPolygon}
                        onChange={(e) => setCustomPolygon(e.target.value)}
                      />
                      <span className="text-[8.5px] text-slate-400 block font-medium leading-normal">
                        例: <code>20% 0%, 80% 0%, 100% 100%, 0% 100%</code> (台形)
                      </span>
                    </div>

                    <div className="md:col-span-4 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg p-2.5">
                      <span className="text-[8px] font-black text-slate-400 block mb-1">PREVIEW</span>
                      <div className="relative w-14 h-14 bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center">
                        <div 
                          style={{
                            clipPath: customPolygon.trim().startsWith('polygon(') ? customPolygon.trim() : `polygon(${customPolygon.trim()})`
                          }}
                          className="absolute inset-1 bg-[#FF5C00]/80 transition-all duration-300 rounded-[1px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sizing Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <span className="block text-[10px] font-black text-indigo-700">📦 収納時サイズ (cm)</span>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold">幅 (W)</span>
                  <input 
                    type="number" 
                    value={packedWidth} 
                    onChange={(e) => setPackedWidth(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-white p-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold">奥行 (D)</span>
                  <input 
                    type="number" 
                    value={packedDepth} 
                    onChange={(e) => setPackedDepth(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-white p-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold">高さ (H)</span>
                  <input 
                    type="number" 
                    value={packedHeight} 
                    onChange={(e) => setPackedHeight(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-white p-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-[10px] font-black text-emerald-700">🏕️ 展開設営時サイズ (cm)</span>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold">幅 (W)</span>
                  <input 
                    type="number" 
                    value={expandedWidth} 
                    onChange={(e) => setExpandedWidth(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-white p-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold">奥行 (D)</span>
                  <input 
                    type="number" 
                    value={expandedDepth} 
                    onChange={(e) => setExpandedDepth(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-white p-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-bold">高さ (H)</span>
                  <input 
                    type="number" 
                    value={expandedHeight} 
                    onChange={(e) => setExpandedHeight(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-white p-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description Box */}
          <div>
            <label className="block text-[10px] font-black text-slate-505 mb-1">説明 / 特徴メモ</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs bg-white border border-slate-350 rounded-lg p-2.5 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-600"
              placeholder="サイズ感や特徴を記入します..."
            />
          </div>

          {/* Control actions */}
          <div className="flex justify-end gap-2 pt-3 border-t bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <button 
              type="button" 
              onClick={onClose}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-black hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 cursor-pointer"
            >
              キャンセル
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-xs font-black bg-[#FF5C00] text-black hover:bg-[#ff7224] rounded-lg flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] border-2 border-black cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-black animate-pulse" />
              変更を反映して保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
