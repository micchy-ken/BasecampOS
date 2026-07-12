import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { 
  Car, 
  Settings, 
  Database, 
  Trash2, 
  Plus, 
  Check, 
  ExternalLink, 
  HelpCircle,
  FileText,
  Sliders,
  Boxes
} from 'lucide-react';

interface MyPageProps {
  vehicles: Vehicle[];
  currentVehicle: Vehicle;
  setCurrentVehicle: (vehicle: Vehicle) => void;
  onUpdateVehicleSeatMode?: (mode: 'standard' | 'split' | 'flat') => void;
  onAddCustomVehicle: (newVehicle: Omit<Vehicle, 'id' | 'rearSeatMode'>) => void;
  onRemoveCustomVehicle: (id: string) => void;
  onRestoreDefaultVehicles?: () => void;
  setVehiclesList: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  currentData: {
    gears: any[];
    layoutItems: any[];
    layoutProfiles: any[];
    vehiclesList: any[];
    currentVehicle: any;
    placedCoordinates: any;
    vehiclePackingStates: any;
    siteWidth: number;
    siteHeight: number;
    activePresetSite: string;
  };
  onLoadWorkspace: (data: any) => void;
  onApiKeyStatusChange?: (status: 'not_configured' | 'valid' | 'invalid' | 'validating') => void;
}

export default function MyPage({
  vehicles,
  currentVehicle,
  setCurrentVehicle,
  onUpdateVehicleSeatMode,
  onAddCustomVehicle,
  onRemoveCustomVehicle,
  onRestoreDefaultVehicles,
  setVehiclesList,
  currentData,
  onLoadWorkspace,
  onApiKeyStatusChange
}: MyPageProps) {

  // Vehicle customisation fields
  const [vehName, setVehName] = useState(currentVehicle.name);
  const [vehWidth, setVehWidth] = useState(currentVehicle.width);
  const [vehDepth, setVehDepth] = useState(currentVehicle.depth);
  const [vehHeight, setVehHeight] = useState(currentVehicle.height);
  const [vehMaxWeight, setVehMaxWeight] = useState(currentVehicle.maxWeight);

  // Expanded Cargo Sizing configurations
  const [rearW, setRearW] = useState(currentVehicle.rearFoldedWidth || currentVehicle.width);
  const [rearD, setRearD] = useState(currentVehicle.rearFoldedDepth || (currentVehicle.depth + 75));
  const [rearH, setRearH] = useState(currentVehicle.rearFoldedHeight || currentVehicle.height);

  const [rearSeatMode, setRearSeatMode] = useState<'standard' | 'split' | 'flat'>(
    currentVehicle.rearSeatMode || 'standard'
  );
  
  const [compartments, setCompartments] = useState(currentVehicle.subCompartmentsQuantity || 1);

  // New Custom Vehicle Builder form
  const [showAdder, setShowAdder] = useState(false);
  const [newVehName, setNewVehName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // API Key settings
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('basecamp_os_gemini_api_key') || '';
  });
  const [apiSaveMsg, setApiSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidatingApi, setIsValidatingApi] = useState(false);

  const handleSaveApiKey = async () => {
    const trimmedKey = geminiApiKey.trim();
    if (!trimmedKey) {
      localStorage.removeItem('basecamp_os_gemini_api_key');
      setApiSaveMsg({ type: 'success', text: 'APIキーを消去しました。' });
      if (onApiKeyStatusChange) onApiKeyStatusChange('not_configured');
      setTimeout(() => setApiSaveMsg(null), 4000);
      return;
    }

    // 改行、スペース、タブなどのすべての空白文字を削除
    const cleanKey = trimmedKey.replace(/[\s\r\n]+/g, '');

    setIsValidatingApi(true);
    setApiSaveMsg(null);
    if (onApiKeyStatusChange) onApiKeyStatusChange('validating');
    try {
      const { validateApiKeyAI } = await import('../lib/ai');
      await validateApiKeyAI(cleanKey);
      
      // Verification succeeded, save the cleaned key to localStorage and local state
      localStorage.setItem('basecamp_os_gemini_api_key', cleanKey);
      setGeminiApiKey(cleanKey);
      setApiSaveMsg({ type: 'success', text: 'Gemini APIキーの疎通確認に成功しました！APIキーを保存しました。AI自動寸法補完などの機能がご利用いただけます。' });
      if (onApiKeyStatusChange) onApiKeyStatusChange('valid');
    } catch (err: any) {
      setApiSaveMsg({ 
        type: 'error', 
        text: `APIキーの検証に失敗しました。キーが間違っているか、Google AI Studioの利用可能枠を超えている可能性があります。エラー詳細: ${err.message || err}` 
      });
      if (onApiKeyStatusChange) onApiKeyStatusChange('invalid');
    } finally {
      setIsValidatingApi(false);
    }
  };

  // Firebase configuration handled via FirebaseSync component

  // Sync state values on vehicle change
  useEffect(() => {
    setVehName(currentVehicle.name);
    setVehWidth(currentVehicle.width);
    setVehDepth(currentVehicle.depth);
    setVehHeight(currentVehicle.height);
    setVehMaxWeight(currentVehicle.maxWeight);
    
    setRearW(currentVehicle.rearFoldedWidth || currentVehicle.width);
    setRearD(currentVehicle.rearFoldedDepth || (currentVehicle.depth + 75));
    setRearH(currentVehicle.rearFoldedHeight || currentVehicle.height);

    setRearSeatMode(currentVehicle.rearSeatMode || 'standard');
    setCompartments(currentVehicle.subCompartmentsQuantity || 1);
  }, [currentVehicle]);

  // Update chosen vehicle layout details
  const handleUpdateVehicleSpec = () => {
    const updatedVehicle: Vehicle = {
      ...currentVehicle,
      name: vehName,
      width: Number(vehWidth) || 100,
      depth: Number(vehDepth) || 80,
      height: Number(vehHeight) || 80,
      maxWeight: Number(vehMaxWeight) || 200,
      rearSeatMode: rearSeatMode,
      rearFoldedWidth: Number(vehWidth),
      rearFoldedDepth: Number(rearD) || (Number(vehDepth) + 75),
      rearFoldedHeight: Number(vehHeight),
      subCompartmentsQuantity: Number(compartments) || 1
    };

    setVehiclesList(prev => prev.map(v => (v.id === currentVehicle.id || v.type === currentVehicle.type) ? updatedVehicle : v));
    setCurrentVehicle(updatedVehicle);
    
    setFeedback('愛車の荷室サイズ・カスタムアレンジ設定を保存しました！');
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleAddNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehName.trim()) return;

    const fresh: Vehicle = {
      id: `vehicle-custom-${Date.now()}`,
      type: 'custom',
      name: newVehName.trim(),
      width: 110,
      depth: 90,
      height: 80,
      maxWeight: 250,
      rearSeatMode: 'standard',
      rearFoldedWidth: 110,
      rearFoldedDepth: 165,
      rearFoldedHeight: 80,
      subCompartmentsQuantity: 1
    };

    setVehiclesList(prev => [...prev, fresh]);
    setCurrentVehicle(fresh);
    setNewVehName('');
    setShowAdder(false);
    setFeedback(`新車両「${fresh.name}」を追加しました！スペックを下記で編集してください。`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6" id="mypage-dashboard">
      
      {/* AI API KEY CONFIGURATOR */}
      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          AI 設定 (Gemini API Key)
        </h3>
        <p className="text-xs text-slate-600 mb-4 font-bold leading-relaxed">
          手持ちギアの「AI自動スペック取得機能」を使用するために、ご自身のGemini APIキーを入力してください。<br/>
          ※キーはお使いのブラウザ内（ローカルストレージ）にのみ保存され、外部サーバーには一切送信されません。
        </p>

        {apiSaveMsg && (
          <div className={`mb-4 border-2 px-3 py-2.5 text-xs font-bold leading-relaxed rounded-md animate-fade-in ${
            apiSaveMsg.type === 'success' 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}>
            {apiSaveMsg.type === 'success' ? '👍 ' : '⚠️ '}
            {apiSaveMsg.text}
          </div>
        )}

        <div className="flex gap-2">
          <input 
            type="password"
            placeholder="AIzaSy... (Gemini API Key)"
            className="flex-1 bg-slate-50 border border-slate-400 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            disabled={isValidatingApi}
          />
          <button 
            type="button" 
            onClick={handleSaveApiKey}
            disabled={isValidatingApi}
            className={`font-extrabold px-6 py-2 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors cursor-pointer text-sm flex items-center justify-center gap-2 ${
              isValidatingApi 
                ? 'bg-slate-400 text-white cursor-not-allowed shadow-none' 
                : 'bg-black hover:bg-indigo-600 text-white'
            }`}
          >
            {isValidatingApi ? '接続テスト中...' : '検証して保存'}
          </button>
        </div>
      </div>

      {/* VEHICLE PROFILE CONFIGURATOR */}
      <div className="w-full flex flex-col gap-6">
        
        {/* Vehicles list & Active Selection card */}
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Car className="w-5 h-5 text-[#FF5C00]" />
              登録済みの車両プロファイル ({vehicles.length}台)
            </h3>
            <button
              onClick={() => setShowAdder(!showAdder)}
              className="px-2.5 py-1 text-xs font-bold border-2 border-black bg-stone-55 hover:bg-black hover:text-white transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>

          {feedback && (
            <div className="mb-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-800 px-3 py-2.5 text-xs font-bold leading-relaxed rounded-md animate-fade-in">
              👍 {feedback}
            </div>
          )}

          {/* Quick Vehicle Creator Overlay */}
          {showAdder && (
            <form onSubmit={handleAddNewVehicle} className="mb-4 p-4 bg-slate-50 border-2 border-black space-y-3 animate-fade-in text-xs">
              <span className="text-[10px] uppercase font-black text-slate-400">Add New Vehicle Preset</span>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  required
                  placeholder="例: スズキ ジムニー / ランドクルーザー"
                  className="flex-1 bg-white border border-slate-350 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  value={newVehName}
                  onChange={(e) => setNewVehName(e.target.value)}
                />
                <button type="submit" className="bg-black hover:bg-[#FF5C00] text-white font-extrabold px-4 py-1.5 cursor-pointer">追加</button>
              </div>
            </form>
          )}

          {/* Vehicle Buttons presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {vehicles.map(v => {
              const isActive = v.id === currentVehicle.id || v.type === currentVehicle.type;
              return (
                <div 
                  key={v.id || v.type}
                  className={`border-2 border-black p-3.5 relative flex flex-col justify-between cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-black text-white shadow-none translate-x-[1px] translate-y-[1px]' 
                      : 'bg-stone-50 hover:bg-white text-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                  onClick={() => setCurrentVehicle(v)}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-extrabold text-xs tracking-tight truncate max-w-[80%]">
                      {v.name}
                    </span>
                    {vehicles.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const isCustom = v.id && v.id.startsWith('vehicle-custom-');
                          const confirmMsg = isCustom
                            ? `カスタム車両 「${v.name}」 を削除しますか？`
                            : `プリセット車両 「${v.name}」 をリストから非表示（削除）にしますか？\n（マイページの「🔄 プリセット復元」ボタンからいつでも元に戻せます）`;
                          if (confirm(confirmMsg)) {
                            onRemoveCustomVehicle(v.id || v.type);
                          }
                        }}
                        className={`hover:text-red-500 font-bold text-xs p-1 transition-colors ${isActive ? 'text-rose-400 hover:text-rose-200' : 'text-slate-400'}`}
                        title="車両削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                   <span className="text-[10px] font-mono mt-2 opacity-85 block">
                    トランク: {v.width}×{v.depth}×{v.height}cm
                  </span>
                  <span className="text-[9px] font-mono opacity-85 block">
                    フルフラット時の奥行: {v.rearFoldedDepth || (v.depth + 75)} cm
                  </span>
                  <span className="text-[9px] font-mono opacity-85 block font-bold text-indigo-200">
                    後部座席奥行: {Math.max(0, (v.rearFoldedDepth || (v.depth + 75)) - v.depth - 10)} cm
                  </span>
                </div>
              );
            })}
          </div>

          {(() => {
            const isDefaultMissing = !vehicles.some(veh => veh.id === 'aqua' || veh.type === 'aqua') ||
                                     !vehicles.some(veh => veh.id === 'suv' || veh.type === 'suv') ||
                                     !vehicles.some(veh => veh.id === 'minivan' || veh.type === 'minivan');
            return isDefaultMissing && onRestoreDefaultVehicles && (
              <div className="mt-4 flex justify-end animate-fade-in">
                <button
                  type="button"
                  onClick={onRestoreDefaultVehicles}
                  className="px-3 py-1.5 border-2 border-dashed border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(79,70,229,0.2)] active:scale-95"
                  title="削除された初期のプリセット車両をリストにすべて復元します"
                >
                  🔄 削除したプリセット車両をすべて復元
                </button>
              </div>
            );
          })()}
        </div>

        {/* Detailed Spec Customiser Card */}
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h4 className="text-sm font-black uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-slate-700" />
            「{currentVehicle.name}」 積載荷室サイズ・カスタム拡張設定
          </h4>

          <div className="space-y-4 text-xs">
            {/* Basik Customisations name and compartments */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 mb-1">愛車・設定名</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-white border border-slate-350 rounded-lg px-2.5 py-2 font-bold focus:outline-none"
                  value={vehName}
                  onChange={(e) => setVehName(e.target.value)}
                />
              </div>

              {/* Number of compartments / divisions */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">📦 個数・サブ仕切り数</label>
                <input 
                  type="number"
                  min="1"
                  max="12"
                  className="w-full bg-white border border-slate-350 rounded-lg px-2.5 py-2 font-bold text-center font-mono"
                  value={compartments}
                  onChange={(e) => setCompartments(parseInt(e.target.value) || 1)}
                  title="荷室を複数の小部屋や収納スペース（イレコ、カゴなど）に想定分割して積載を想定管理します"
                />
              </div>
            </div>

            {/* Standard Trunk cargo Dimensions and Limit */}
            <div className="p-3.5 bg-slate-50 border border-black rounded-lg space-y-2.5">
              <span className="block text-[10px] font-black text-slate-800 uppercase">📦 トランクのサイズ & 積載耐荷重</span>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="block text-[9px] text-slate-400">幅 (Width) cm</span>
                  <input type="number" className="w-full bg-white border rounded p-1.5 text-center font-mono font-bold" value={vehWidth} onChange={(e) => setVehWidth(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400">奥行 (Trunk Depth) cm</span>
                  <input type="number" className="w-full bg-white border rounded p-1.5 text-center font-mono font-bold" value={vehDepth} onChange={(e) => setVehDepth(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400">高さ (Height) cm</span>
                  <input type="number" className="w-full bg-white border rounded p-1.5 text-center font-mono font-bold" value={vehHeight} onChange={(e) => setVehHeight(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400">耐荷重(kg)</span>
                  <input type="number" className="w-full bg-white border rounded p-1.5 text-center font-mono font-bold" value={vehMaxWeight} onChange={(e) => setVehMaxWeight(parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            {/* Rear folded seat dimensions */}
            <div className="p-3.5 bg-indigo-50/40 border border-indigo-200 rounded-lg space-y-2.5">
              <span className="block text-[10px] font-black text-indigo-900 uppercase">🛌 フルフラット時の奥行設定 & 後部座席の自動サイズ算出</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-[9px] text-slate-450 font-bold">フルフラット時の最大奥行 (Total Depth) cm</span>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-indigo-250 rounded p-1.5 font-mono font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-500 text-center" 
                    value={rearD} 
                    onChange={(e) => setRearD(parseInt(e.target.value) || 0)} 
                    placeholder="例: 163"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    ※トランクから前席後ろまでの合計奥行を入力
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded border border-indigo-100 flex flex-col justify-center">
                  <span className="block text-[10px] font-bold text-indigo-900">💺 後部座席の算出サイズ:</span>
                  <div className="text-[11px] text-slate-700 font-mono mt-1">
                    <div>フルフラット ({rearD}cm)</div>
                    <div>− トランク ({vehDepth}cm) − 10cm</div>
                    <div className="font-extrabold text-indigo-600 mt-0.5 border-t pt-0.5">
                      ＝ {Math.max(0, Number(rearD) - Number(vehDepth) - 10)} cm
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle active Simulation cargo depth space */}
            <div className="bg-amber-50/40 p-3.5 flex flex-col sm:flex-row items-center justify-between border-2 border-dashed border-amber-300 rounded-lg gap-3">
              <div>
                <span className="block font-black text-[#FF5C00] text-[10px] uppercase">積載モード設定 (Seat Folding Arrangement)</span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  愛車後部座席のアレンジ設定をシミュレーターに反映します。
                </p>
              </div>

              <div className="flex gap-1 bg-white p-1 border rounded shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setRearSeatMode('standard');
                    if (onUpdateVehicleSeatMode) {
                      onUpdateVehicleSeatMode('standard');
                    }
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded ${rearSeatMode === 'standard' ? 'bg-[#FF5C00] text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                >
                  荷室のみ (Trunk)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRearSeatMode('split');
                    if (onUpdateVehicleSeatMode) {
                      onUpdateVehicleSeatMode('split');
                    }
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded ${rearSeatMode === 'split' ? 'bg-[#FF5C00] text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                >
                  荷室＋後席別々 (Separate)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRearSeatMode('flat');
                    if (onUpdateVehicleSeatMode) {
                      onUpdateVehicleSeatMode('flat');
                    }
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded ${rearSeatMode === 'flat' ? 'bg-[#FF5C00] text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                >
                  フルフラット (Flat)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpdateVehicleSpec}
              className="w-full bg-black hover:bg-[#FF5C00] text-white font-black py-3 border-0 cursor-pointer shadow-[3px_3px_0px_0px_#FF5C00_inset]"
            >
              📊 車両の荷室カスタムスペックを保存して適応
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
