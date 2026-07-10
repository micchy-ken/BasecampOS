import React, { useState } from 'react';
import { GearItem, GearCategory, GearShape } from '../types';
import { 
  Sparkles, 
  Loader2, 
  Plus, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  Download, 
  Upload, 
  Database, 
  Check, 
  Eye, 
  HelpCircle 
} from 'lucide-react';

interface GearFormProps {
  onAddGear: (gear: Omit<GearItem, 'id' | 'parentId'>) => void;
  onAddMultipleGears?: (gears: Omit<GearItem, 'id' | 'parentId'>[]) => void;
  onSyncGears?: (gears: Omit<GearItem, 'id' | 'parentId'>[], mode: 'upsert' | 'overwrite' | 'append') => void;
  onGoToMyPage?: () => void;
}

const CATEGORIES: { value: GearCategory; label: string }[] = [
  { value: 'Tent', label: 'テント (Tent)' },
  { value: 'Tarp', label: 'タープ (Tarp)' },
  { value: 'Chair', label: 'チェア (Chair)' },
  { value: 'Table', label: 'テーブル (Table)' },
  { value: 'Lantern', label: 'ランタン・照明 (Lantern)' },
  { value: 'Cooking', label: '調理器具・焚き火台 (Cooking)' },
  { value: 'Bedding', label: '寝具・コット (Bedding)' },
  { value: 'Baggage', label: 'バゲージ/コンテナ (Baggage)' },
  { value: 'Storage', label: '収納ケース・バッグ (Storage)' },
  { value: 'Other', label: 'その他ギア (Other)' }
];

export default function GearForm({ onAddGear, onAddMultipleGears, onSyncGears, onGoToMyPage }: GearFormProps) {
  // Sub-tab selection state
  const [activeSubTab, setActiveSubTab] = useState<'single' | 'csv'>('single');

  // --- TAB 1: Single Item States & Handlers ---
  const [lookupQuery, setLookupQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);

  // AI Spec Image States
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<GearCategory>('Tent');
  const [shape, setShape] = useState<GearShape>('rectangle');
  const [containerColor, setContainerColor] = useState('#FF5C00');
  const [containerType, setContainerType] = useState('soft_container');
  const [customPolygon, setCustomPolygon] = useState('20% 0%, 80% 0%, 100% 100%, 0% 100%');
  const [isFetchingWebShape, setIsFetchingWebShape] = useState(false);
  const [webShapeError, setWebShapeError] = useState<string | null>(null);
  const [packedWidth, setPackedWidth] = useState<number>(50);
  const [packedDepth, setPackedDepth] = useState<number>(20);
  const [packedHeight, setPackedHeight] = useState<number>(20);
  const [expandedWidth, setExpandedWidth] = useState<number>(270);
  const [expandedDepth, setExpandedDepth] = useState<number>(270);
  const [expandedHeight, setExpandedHeight] = useState<number>(150);
  const [weight, setWeight] = useState<number>(5.5);
  const [description, setDescription] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // --- TAB 2: CSV Bulk Cargo States & Handlers ---
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Omit<GearItem, 'id' | 'parentId'>[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);

  // --- TAB 3: Firebase Cloud Integration ---
  // Managed globally through Firestore persistence

  // --- TAB 1: Single Item Functions ---
  const applyLocalHeuristicFallback = (query: string) => {
    const lowercaseName = query.toLowerCase();
    let guessedCategory: GearCategory = 'Other';
    let guessedBrand = 'General Brand';
    let pW = 30, pD = 15, pH = 15;
    let eW = 40, eD = 40, eH = 30;
    let w = 1.5;
    let desc = "【サイズ自動推定】AI検索制限のため、商品名からサイズを自動推定しました。手動で微調整してください。";

    if (lowercaseName.includes("coleman") || lowercaseName.includes("コールマン")) {
      guessedBrand = "Coleman";
    } else if (lowercaseName.includes("snow peak") || lowercaseName.includes("スノーピーク") || lowercaseName.includes("snowpeak")) {
      guessedBrand = "Snow Peak";
    } else if (lowercaseName.includes("dod") || lowercaseName.includes("ディーオーディー")) {
      guessedBrand = "DOD";
    } else if (lowercaseName.includes("helinox") || lowercaseName.includes("ヘリノックス")) {
      guessedBrand = "Helinox";
    } else if (lowercaseName.includes("captain stag") || lowercaseName.includes("キャプテンスタッグ")) {
      guessedBrand = "Captain Stag";
    } else if (lowercaseName.includes("mont-bell") || lowercaseName.includes("モンベル") || lowercaseName.includes("montbell")) {
      guessedBrand = "Mont-bell";
    } else if (lowercaseName.includes("logos") || lowercaseName.includes("ロゴス")) {
      guessedBrand = "Logos";
    }

    if (lowercaseName.includes("tent") || lowercaseName.includes("テント") || lowercaseName.includes("ドーム") || lowercaseName.includes("ルーム") || lowercaseName.includes("シェルター")) {
      guessedCategory = 'Tent';
      pW = 60; pD = 25; pH = 25;
      eW = 275; eD = 275; eH = 165;
      w = 6.5;
    } else if (lowercaseName.includes("tarp") || lowercaseName.includes("タープ") || lowercaseName.includes("ヘキサ") || lowercaseName.includes("レクタ")) {
      guessedCategory = 'Tarp';
      pW = 75; pD = 15; pH = 15;
      eW = 450; eD = 400; eH = 230;
      w = 4.0;
    } else if (lowercaseName.includes("chair") || lowercaseName.includes("チェア") || lowercaseName.includes("いす") || lowercaseName.includes("椅子")) {
      guessedCategory = 'Chair';
      pW = 35; pD = 12; pH = 12;
      eW = 45; eD = 45; eH = 65;
      w = 1.1;
    } else if (lowercaseName.includes("table") || lowercaseName.includes("テーブル") || lowercaseName.includes("机")) {
      guessedCategory = 'Table';
      pW = 75; pD = 15; pH = 10;
      eW = 90; eD = 60; eH = 40;
      w = 4.2;
    } else if (lowercaseName.includes("lantern") || lowercaseName.includes("ランタン") || lowercaseName.includes("ライト") || lowercaseName.includes("照明") || lowercaseName.includes("led")) {
      guessedCategory = 'Lantern';
      pW = 15; pD = 10; pH = 10;
      eW = 15; eD = 10; eH = 22;
      w = 0.5;
    } else if (lowercaseName.includes("cooking") || lowercaseName.includes("クッカー") || lowercaseName.includes("火") || lowercaseName.includes("焚き火") || lowercaseName.includes("コンロ") || lowercaseName.includes("ストーブ") || lowercaseName.includes("グリル") || lowercaseName.includes("バーナー")) {
      guessedCategory = 'Cooking';
      pW = 38; pD = 38; pH = 8;
      eW = 43; eD = 43; eH = 33;
      w = 2.7;
    } else if (lowercaseName.includes("bedding") || lowercaseName.includes("寝具") || lowercaseName.includes("コット") || lowercaseName.includes("シュラフ") || lowercaseName.includes("寝袋") || lowercaseName.includes("マット")) {
      guessedCategory = 'Bedding';
      pW = 45; pD = 18; pH = 18;
      eW = 190; eD = 68; eH = 16;
      w = 2.2;
    }

    setName(query);
    setBrand(guessedBrand);
    setCategory(guessedCategory);
    setPackedWidth(pW);
    setPackedDepth(pD);
    setPackedHeight(pH);
    setExpandedWidth(eW);
    setExpandedDepth(eD);
    setExpandedHeight(eH);
    setWeight(w);
    setDescription(desc);
    setFallbackActive(true);
  };

  const handleAILookup = async () => {
    if (!lookupQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setFallbackActive(false);
    setSubmitSuccess(false);

    try {
      const { lookupGearAI } = await import('../lib/ai');
      const data = await lookupGearAI(lookupQuery);
      
      setName(data.name || lookupQuery);
      setBrand(data.brand || '');
      if (data.category && CATEGORIES.some(c => c.value === data.category)) {
        setCategory(data.category as GearCategory);
      } else {
        setCategory('Other');
      }
      setPackedWidth(data.packedWidth || 40);
      setPackedDepth(data.packedDepth || 20);
      setPackedHeight(data.packedHeight || 20);
      setExpandedWidth(data.expandedWidth || 200);
      setExpandedDepth(data.expandedDepth || 200);
      setExpandedHeight(data.expandedHeight || 100);
      setWeight(data.weight || 2.0);
      setDescription(data.description || '');

      if (data.isHeuristic) {
        setFallbackActive(true);
      }
    } catch (err: any) {
      console.warn("API lookup failed. Triggering offline automatic heuristic estimation.", err);
      const detailMsg = err.message || String(err);
      setSearchError(`情報の取得に失敗しました。(${detailMsg}) 一時的な仮サイズを割り当てます。`);
      applyLocalHeuristicFallback(lookupQuery);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFetchWebShape = async () => {
    if (!name.trim()) {
      alert("上の「ギア名 / モデル名」に入力されている名前をキーにして、WEB/AI上の図面形状を検索します。ギア名を入力してください。");
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
        throw new Error('ベクター形状データが見つかりませんでした。');
      }
    } catch (err: any) {
      console.error("Fetch web shape error:", err);
      setWebShapeError(err.message || 'エラーが発生しました。');
    } finally {
      setIsFetchingWebShape(false);
    }
  };

  const handleImageAnalysis = async (file: File) => {
    if (!file) return;
    setIsAnalyzingImage(true);
    setImageError(null);
    setSearchError(null);
    setFallbackActive(false);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataUrl = evt.target?.result as string;
        if (!dataUrl) {
          throw new Error("画像の読み込みに失敗しました。");
        }
        setImagePreview(dataUrl);

        // Extract raw base64 data and mimeType
        const commaIdx = dataUrl.indexOf(',');
        const imageBase64 = dataUrl.substring(commaIdx + 1);
        const mimeType = file.type || "image/png";

        const { analyzeImageAI } = await import('../lib/ai');
        const data = await analyzeImageAI(imageBase64, mimeType);

        setName(data.name || '画像から読み込んだギア');
        setBrand(data.brand || 'General');
        if (data.category && CATEGORIES.some(c => c.value === data.category)) {
          setCategory(data.category as GearCategory);
        } else {
          setCategory('Tent');
        }
        if (data.shape) {
          setShape(data.shape as GearShape);
        }
        if (data.customPolygon) {
          setCustomPolygon(data.customPolygon);
          setShape('custom');
        }
        setPackedWidth(data.packedWidth || 60);
        setPackedDepth(data.packedDepth || 20);
        setPackedHeight(data.packedHeight || 20);
        setExpandedWidth(data.expandedWidth || 270);
        setExpandedDepth(data.expandedDepth || 270);
        setExpandedHeight(data.expandedHeight || 150);
        setWeight(data.weight || 5.5);
        setDescription(data.description || '');

      } catch (err: any) {
        console.error("Image analysis error:", err);
        setImageError(err.message || '画像解析エラーが発生しました。');
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddGear({
      name: name.trim(),
      brand: brand.trim(),
      category,
      packedWidth: Number(packedWidth) || 0,
      packedDepth: Number(packedDepth) || 0,
      packedHeight: Number(packedHeight) || 0,
      expandedWidth: Number(expandedWidth) || 0,
      expandedDepth: Number(expandedDepth) || 0,
      expandedHeight: Number(expandedHeight) || 0,
      weight: Number(weight) || 0,
      description: description.trim(),
      shape,
      customPolygon: shape === 'custom' ? customPolygon : undefined,
      containerColor: (category === 'Baggage' || category === 'Storage') ? containerColor : undefined,
      containerType: (category === 'Baggage' || category === 'Storage') ? containerType : undefined,
    });

    // Reset Form
    setName('');
    setBrand('');
    setCategory('Tent');
    setShape('rectangle');
    setContainerColor('#FF5C00');
    setContainerType('soft_container');
    setCustomPolygon('20% 0%, 80% 0%, 100% 100%, 0% 100%');
    setPackedWidth(50);
    setPackedDepth(20);
    setPackedHeight(20);
    setExpandedWidth(270);
    setExpandedDepth(270);
    setExpandedHeight(150);
    setWeight(5.5);
    setDescription('');
    setLookupQuery('');
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  // --- TAB 2: CSV Bulk Functions ---
  const parseCSVString = (text: string): Record<string, string>[] => {
    const lines: string[] = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // Skip escape quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(JSON.stringify(row));
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(JSON.stringify(row));
    }

    if (lines.length < 2) return [];

    const headerRow = JSON.parse(lines[0]) as string[];
    const results: Record<string, string>[] = [];
    
    for (let l = 1; l < lines.length; l++) {
      const values = JSON.parse(lines[l]) as string[];
      if (values.length < headerRow.length) continue;
      const entry: Record<string, string> = {};
      for (let h = 0; h < headerRow.length; h++) {
        entry[headerRow[h]] = values[h] || "";
      }
      results.push(entry);
    }
    return results;
  };

  const processCSVText = (text: string) => {
    try {
      const parsedRows = parseCSVString(text);
      if (parsedRows.length === 0) {
        throw new Error('CSVファイルの内容が空か、正しく解析できませんでした。見出し行があることを確認してください。');
      }

      const mapped = parsedRows.map((entry, idx) => {
        let gearName = "";
        let gearBrand = "";
        let gearCategoryStr = "";
        let pW = 0, pD = 0, pH = 0;
        let eW = 0, eD = 0, eH = 0;
        let gearWeight = 0;
        let gearDesc = "";

        for (const rawKey of Object.keys(entry)) {
          const key = rawKey.toLowerCase().replace(/[\s_-]/g, "");
          const val = entry[rawKey];
          if (val === null || val === undefined || val === '') continue;

          if (key.includes("name") || key.includes("title") || key.includes("名前") || key.includes("ギア名") || key.includes("商品名")) {
            gearName = val;
          } else if (key.includes("brand") || key.includes("ブランド") || key.includes("メーカー")) {
            gearBrand = val;
          } else if (key.includes("category") || key.includes("カテゴリ") || key.includes("分類")) {
            gearCategoryStr = val;
          } else if (key.includes("packedwidth") || key.includes("収納幅") || key.includes("収納w") || key.includes("仕舞幅") || key.includes("packedw")) {
            pW = Number(val) || 0;
          } else if (key.includes("packeddepth") || key.includes("収納奥行") || key.includes("収納d") || key.includes("仕舞奥行") || key.includes("packedd")) {
            pD = Number(val) || 0;
          } else if (key.includes("packedheight") || key.includes("収納高さ") || key.includes("収納h") || key.includes("仕舞高さ") || key.includes("packedh")) {
            pH = Number(val) || 0;
          } else if (key.includes("expandedwidth") || key.includes("展開幅") || key.includes("展開w") || key.includes("使用幅") || key.includes("expandedw") || key.includes("設営幅")) {
            eW = Number(val) || 0;
          } else if (key.includes("expandeddepth") || key.includes("展開奥行") || key.includes("展開d") || key.includes("使用奥行") || key.includes("expandedd") || key.includes("設営奥行")) {
            eD = Number(val) || 0;
          } else if (key.includes("expandedheight") || key.includes("展開高さ") || key.includes("展開h") || key.includes("使用高さ") || key.includes("expandedh") || key.includes("設営高さ")) {
            eH = Number(val) || 0;
          } else if (key.includes("weight") || key.includes("重量") || key.includes("重さ")) {
            gearWeight = Number(val) || 0;
          } else if (key.includes("description") || key.includes("説明") || key.includes("備考") || key.includes("詳細") || key.includes("desc") || key.includes("メモ")) {
            gearDesc = val;
          }
        }

        let finalCategory: GearCategory = "Other";
        const catLower = gearCategoryStr.toLowerCase();
        if (catLower.includes("tent") || catLower.includes("テント")) finalCategory = "Tent";
        else if (catLower.includes("tarp") || catLower.includes("タープ")) finalCategory = "Tarp";
        else if (catLower.includes("chair") || catLower.includes("チェア") || catLower.includes("いす") || catLower.includes("椅子")) finalCategory = "Chair";
        else if (catLower.includes("table") || catLower.includes("テーブル") || catLower.includes("机")) finalCategory = "Table";
        else if (catLower.includes("lantern") || catLower.includes("ランタン") || catLower.includes("ライト")) finalCategory = "Lantern";
        else if (catLower.includes("cooking") || catLower.includes("cook") || catLower.includes("バーナー") || catLower.includes("コンロ") || catLower.includes("グリル") || catLower.includes("フライパン") || catLower.includes("クッカー") || catLower.includes("焚き火")) finalCategory = "Cooking";
        else if (catLower.includes("bed") || catLower.includes("シュラフ") || catLower.includes("寝袋") || catLower.includes("寝具") || catLower.includes("コット") || catLower.includes("マット")) finalCategory = "Bedding";

        return {
          name: gearName.trim() || `CSV登録ギア #${idx + 1}`,
          brand: gearBrand.trim() || 'General Brand',
          category: finalCategory,
          packedWidth: pW || 30,
          packedDepth: pD || 20,
          packedHeight: pH || 20,
          expandedWidth: eW || pW || 30,
          expandedDepth: eD || pD || 20,
          expandedHeight: eH || pH || 20,
          weight: gearWeight || 1.0,
          description: gearDesc || 'CSVからインポート'
        } as Omit<GearItem, 'id' | 'parentId'>;
      }).filter(item => item.name !== "");

      if (mapped.length === 0) {
        throw new Error('取り込み可能な有効なギアが見つかりませんでした。ヘッダー（ギア名/商品名、収納幅、重量など）を確認してください。');
      }

      setCsvPreview(mapped);
    } catch (err: any) {
      setCsvError(err.message || 'CSV解析エラーが発生しました。');
      setCsvPreview([]);
    }
  };

  const handleCsvFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        processCSVText(text);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleCsvDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCsv(true);
  };

  const handleCsvDragLeave = () => {
    setIsDraggingCsv(false);
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCsv(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCsvError('CSVファイル（.csv）のみ対応しています。');
      return;
    }

    setCsvFile(file);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        processCSVText(text);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDownloadTemplate = () => {
    const sampleCSVContent = `ギア名,ブランド,カテゴリー,収納幅,収納奥行,収納高さ,展開幅,展開奥行,展開高さ,重量,説明
コールマン 封筒型シュラフ,Coleman,Bedding,40,25,25,190,80,10,1.8,丸洗い可能な快適寝袋
スノーピーク ローチェア30,Snow Peak,Chair,16,18,101,58,65,86,3.6,座り心地抜群のアウトドアチェア
DOD ワンポールテントS,DOD,Tent,55,20,20,250,220,170,3.2,初心者でも簡単に設営できるティピー型テント`;

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), sampleCSVContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'basecamp_gear_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCsvSubmit = () => {
    if (csvPreview.length === 0) return;
    if (onAddMultipleGears) {
      onAddMultipleGears(csvPreview);
    } else {
      csvPreview.forEach(g => onAddGear(g));
    }
    alert(`${csvPreview.length} 件のギアをCSVから一括インポートしました！`);
    setCsvPreview([]);
    setCsvFile(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-6" id="add-gear-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Plus className="w-5.5 h-5.5 text-[#FF5C00]" />
            キャンプギアの一括 & 新規登録
          </h3>
          <p className="text-xs text-slate-500">
            お持ちのアウトドアギアを登録。手動指定のほか、CSVファイルドロップやNotionのテーブルからの直接インポートに対応。
          </p>
        </div>
      </div>

      {/* Sub tabs configuration */}
      <div className="flex border-b-2 border-black mb-6 text-xs font-black uppercase tracking-wider overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveSubTab('single')}
          className={`px-4 py-3.5 transition-all text-left border-r-2 border-black flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'single' 
              ? 'bg-black text-[#FF5C00] font-black' 
              : 'text-slate-500 hover:text-black hover:bg-zinc-50'
          }`}
        >
          📝 1点ずつ登録 / AI連携
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('csv')}
          className={`px-4 py-3.5 transition-all text-left flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'csv' 
              ? 'bg-black text-[#FF5C00] font-black' 
              : 'text-slate-500 hover:text-black hover:bg-zinc-50'
          }`}
        >
          📄 CSVスプレッドシート一括読込
        </button>
      </div>

      {/* --- RENDER TAB 1: SINGLE RECORD WITH AI SEARCH --- */}
      {activeSubTab === 'single' && (
        <div className="space-y-5 animate-fade-in">
          {/* AI Search Panel */}
          <div className="bg-[#FF5C00]/5 p-4 rounded-xl border-2 border-dashed border-[#FF5C00]/30">
            <div className="flex items-center gap-2 border-b border-[#FF5C00]/20 pb-3 mb-3">
              <Sparkles className="w-5 h-5 text-[#FF5C00] animate-pulse" />
              <h4 className="text-sm font-black text-slate-800">
                🔮 AI寸法補完 (製品名・型番検索)
              </h4>
            </div>

            <div className="animate-fade-in">
              <p className="text-xs text-slate-600 mb-3 leading-relaxed font-semibold">
                メーカー名や商品名（例: 「アメニティドームM」「ツーリングドームLX」「ヘリノックス チェアワン」）を入力すると、収納サイズ・展開サイズ・重さを自動取得します。
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="ai-lookup-input"
                  className="flex-1 bg-white border-2 border-black rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#FF5C00] focus:border-[#FF5C00]"
                  placeholder="ブランド名や具体的な型番を入力..."
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAILookup()}
                />
                <button
                  type="button"
                  id="ai-lookup-button"
                  className="bg-black hover:bg-[#FF5C00] text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shrink-0 disabled:bg-slate-300"
                  disabled={isSearching || !lookupQuery.trim()}
                  onClick={handleAILookup}
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />}
                  寸法を取得する
                </button>
              </div>
            </div>

            {searchError && (
              <div className="mt-3 flex items-start gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{searchError}</span>
              </div>
            )}

            {fallbackActive && (
              <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>簡易サイズ推定機能オン:</strong> AIモデル制限中のため、商品のカテゴリ名からサイズを仮計算しました。サイズは手動で自由に変更できます。
                </span>
              </div>
            )}
          </div>

          {/* Form Details */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <select
                  id="gear-category-select"
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GearCategory)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ブランド名
                </label>
                <input
                  type="text"
                  id="gear-brand-input"
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none"
                  placeholder="例: Coleman, Snow Peak..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ギア名 / モデル名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="gear-name-input"
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none"
                  placeholder="例: アメニティドームM"
                  value={name}
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Container Settings for Baggage or Storage */}
            {(category === 'Baggage' || category === 'Storage') && (
              <div className="bg-indigo-50/40 border-2 border-black p-4 rounded-xl space-y-4">
                <div className="flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                  <span className="text-sm font-black text-indigo-900">📦 コンテナ/収納用の追加プロパティ設定</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      表示カラー（パッキング画像用）
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={containerColor}
                        onChange={(e) => setContainerColor(e.target.value)}
                        className="w-10 h-8 rounded border border-black cursor-pointer bg-white p-0.5"
                      />
                      <input
                        type="text"
                        value={containerColor}
                        onChange={(e) => setContainerColor(e.target.value)}
                        className="flex-1 bg-white border-2 border-black rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        placeholder="#HEXコード"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      コンテナの物理タイプ
                    </label>
                    {category === 'Baggage' ? (
                      <select
                        value={containerType}
                        onChange={(e) => setContainerType(e.target.value)}
                        className="w-full bg-white border-2 border-black rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      >
                        <option value="hard_container">🗃️ ハードシェルケース / トランクカーゴ</option>
                        <option value="soft_container">👜 ソフトコンテナ / セミハードケース</option>
                        <option value="totes">🛍️ 大型収納トートバッグ</option>
                        <option value="box">📦 段ボール・ボックス</option>
                      </select>
                    ) : (
                      <select
                        value={containerType}
                        onChange={(e) => setContainerType(e.target.value)}
                        className="w-full bg-white border-2 border-black rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      >
                        <option value="bag">🎒 ロールトップ・スタッフバッグ / ポーチ</option>
                        <option value="box">📁 折りたたみ仕切りケース / ボックス</option>
                        <option value="case">💼 ギア専用ケース</option>
                      </select>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  💡 このギアは、パッキング機能において<strong>収納ケース（他ギアを中に入れる）</strong>として自動認識され、車載トランクやバゲージの内部への入れ子としてのレイアウトパッキングが可能です。
                </p>
              </div>
            )}

            {/* Flat footprint Shape selection for Tents or Tarps */}
            {(category === 'Tent' || category === 'Tarp') && (
              <div className="bg-slate-50 border-2 border-black p-3.5 rounded-xl space-y-4">
                <div className="space-y-1">
                  <span className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                    📐 設営時の平面投影形状を設定
                  </span>
                  <p className="text-[10px] text-slate-500">
                    「設営テントレイアウト」キャンバス上のフットプリント形状。ベル/ワンポール/カスタム等に合わせて変更できます。
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                  {[
                    { value: 'rectangle', label: '四角形', icon: '⬛' },
                    { value: 'circle', label: '円形・ドーム', icon: '⚫' },
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
                      className={`border-2 p-2 rounded-lg text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                        shape === sh.value
                          ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-black font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'
                      }`}
                    >
                      <span className="text-base mb-0.5">{sh.icon}</span>
                      <span className="text-[10px] leading-tight font-bold">{sh.label}</span>
                    </button>
                  ))}
                </div>

                {shape === 'custom' && (
                  <div className="bg-slate-100 border-2 border-black rounded-xl p-3.5 space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-300 pb-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          📐 カスタム平面ベクター図形の編集 & 登録
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          パーセンテージ(%)区切りの座標列を時計回りに入力。WEB検索や blueprint カタログ図面画像からAI抽出できます。
                        </p>
                      </div>

                      {/* Web Shape Fetch Option - ONLY for Tent & Tarp */}
                      {(category === 'Tent' || category === 'Tarp') && (
                        <button
                          type="button"
                          onClick={handleFetchWebShape}
                          disabled={isFetchingWebShape}
                          className="bg-black hover:bg-[#FF5C00] disabled:bg-slate-300 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border-0 shrink-0"
                        >
                          {isFetchingWebShape ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
                          )}
                          <span>🌐 WEBから図形を取得 (AI推奨)</span>
                        </button>
                      )}
                    </div>

                    {webShapeError && (
                      <div className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                        <span>{webShapeError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Form Coordinates input */}
                      <div className="md:col-span-8 space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700">
                          相対ベクター頂点座標群 (x y percentage points)
                        </label>
                        <input
                          type="text"
                          className="w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-xs text-slate-800 font-mono tracking-tighter focus:outline-none"
                          placeholder="例: 20% 0%, 80% 0%, 100% 100%, 0% 100% (台形)"
                          value={customPolygon}
                          onChange={(e) => setCustomPolygon(e.target.value)}
                        />
                        <div className="text-[9.5px] text-slate-500 space-y-1 leading-normal">
                          <p>・時計回りのパーセント座標列を入力してください（例: 上部を縮めたトンネルドーム <code>15% 0%, 85% 0%, 100% 100%, 0% 100%</code> )。</p>
                          <p>・2ポールシェルターなら左右非対称な多角形も自由に表現可能です。</p>
                        </div>
                      </div>

                      {/* Direct shape contour previewer */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center bg-white border-2 border-black rounded-xl p-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                          REAL-TIME PREVIEW
                        </span>
                        <div className="relative w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center">
                          <div 
                            style={{
                              clipPath: customPolygon.trim().startsWith('polygon(') ? customPolygon.trim() : `polygon(${customPolygon.trim()})`
                            }}
                            className="absolute inset-1.5 bg-[#FF5C00]/80 border-2 border-black/20 flex items-center justify-center transition-all duration-300 shadow-inner"
                          />
                          <span className="text-[8px] font-bold text-slate-400 absolute bottom-1 right-1">PROJ</span>
                        </div>
                      </div>
                    </div>

                    {/* Blueprints / Image extraction module directly nested under custom shape shape list */}
                    <div className="border border-zinc-200 bg-white rounded-lg p-3 space-y-2">
                      <span className="block text-xs font-black text-slate-700">🖼️ カタログ図面・画像読み込み (AI自動ポリゴン変換)</span>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        製品の仕様画像・平面設営図ファイルをアップロードするだけで、Gemini Visionが画像内の枠線から自動的に平面ポリゴン頂点座標を検出して登録します。
                      </p>

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingImage(true);
                        }}
                        onDragLeave={() => setIsDraggingImage(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingImage(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            handleImageAnalysis(file);
                          }
                        }}
                        className={`border-2 border-dashed rounded-xl p-4 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isDraggingImage
                            ? 'border-[#FF5C00] bg-[#FF5C00]/5 scale-[0.99]'
                            : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                        }`}
                        onClick={() => document.getElementById('spec-image-upload')?.click()}
                      >
                        <input
                          type="file"
                          id="spec-image-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageAnalysis(file);
                          }}
                        />

                        {isAnalyzingImage ? (
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <Loader2 className="w-6 h-6 text-[#FF5C00] animate-spin" />
                            <span className="text-[10px] font-black text-slate-700 animate-pulse">
                              Gemini Visionが図面イメージからベクター化しています...
                            </span>
                          </div>
                        ) : imagePreview ? (
                          <div className="relative group max-w-[130px] rounded overflow-hidden border border-slate-200 mx-auto">
                            <img
                              src={imagePreview}
                              alt="Blueprint footprint"
                              className="w-full h-auto object-contain max-h-[80px]"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[9px] text-white font-bold">画像再定義</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-center">
                            <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                            <span className="text-[10px] font-black text-slate-700 block">
                              ここに図画・スペック表ファイルをドロップ
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              またはクリックしてライブラリから選択
                            </span>
                          </div>
                        )}
                      </div>

                      {imageError && (
                        <div className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                          <span>{imageError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sizing inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-150 pt-4">
              {/* Packing size */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-indigo-700 flex items-center gap-1">
                  📦 収納時サイズ (Packing Size)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">幅 (W) cm</label>
                    <input
                      type="number"
                      id="gear-packed-width"
                      className="w-full bg-slate-50 border border-black rounded-lg px-2 py-1.5 text-sm text-slate-800 text-center"
                      value={packedWidth}
                      onChange={(e) => setPackedWidth(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">奥行 (D) cm</label>
                    <input
                      type="number"
                      id="gear-packed-depth"
                      className="w-full bg-slate-50 border border-black rounded-lg px-2 py-1.5 text-sm text-slate-800 text-center"
                      value={packedDepth}
                      onChange={(e) => setPackedDepth(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">高さ (H) cm</label>
                    <input
                      type="number"
                      id="gear-packed-height"
                      className="w-full bg-slate-50 border border-black rounded-lg px-2 py-1.5 text-sm text-slate-800 text-center"
                      value={packedHeight}
                      onChange={(e) => setPackedHeight(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>
              </div>

              {/* Setup Sizing */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-emerald-700 flex items-center gap-1">
                  🏕️ 展開時 / 設営サイズ (Expanded Size)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">幅 (W) cm</label>
                    <input
                      type="number"
                      id="gear-expanded-width"
                      className="w-full bg-slate-50 border border-black rounded-lg px-2 py-1.5 text-sm text-slate-800 text-center"
                      value={expandedWidth}
                      onChange={(e) => setExpandedWidth(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">奥行 (D) cm</label>
                    <input
                      type="number"
                      id="gear-expanded-depth"
                      className="w-full bg-slate-50 border border-black rounded-lg px-2 py-1.5 text-sm text-slate-800 text-center"
                      value={expandedDepth}
                      onChange={(e) => setExpandedDepth(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">高さ (H) cm</label>
                    <input
                      type="number"
                      id="gear-expanded-height"
                      className="w-full bg-slate-50 border border-black rounded-lg px-2 py-1.5 text-sm text-slate-800 text-center"
                      value={expandedHeight}
                      onChange={(e) => setExpandedHeight(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Weights & Description */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-150 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  重量 (kg)
                </label>
                <input
                  type="number"
                  id="gear-weight-input"
                  step="0.1"
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none"
                  placeholder="例: 5.5"
                  value={weight}
                  onChange={(e) => setWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  説明・特記事項
                </label>
                <input
                  type="text"
                  id="gear-desc-input"
                  className="w-full bg-slate-50 border-2 border-black rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none"
                  placeholder="例: 撥水コーティング加工済み、2025年購入"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Buttons info */}
            <div className="flex items-center justify-between border-t border-black pt-4">
              <div>
                {submitSuccess && (
                  <span className="text-xs text-emerald-600 font-black animate-pulse flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" />
                    ✓ ギアの登録に成功しました！
                  </span>
                )}
              </div>
              <button
                type="submit"
                id="gear-submit-button"
                className="bg-black hover:bg-[#FF5C00] text-white font-black text-xs px-6 py-3 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                登録を確定する
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- RENDER TAB 2: CSV IMPORT PANEL --- */}
      {activeSubTab === 'csv' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 border border-stone-200 p-3 rounded-xl text-xs text-slate-600">
            <div>
              <p className="font-bold text-black flex items-center gap-1 mb-0.5">
                <FileText className="w-3.5 h-3.5 text-[#FF5C00]" />
                お手元の機材目録スプレッドシート（CSV）から全ギア登録
              </p>
              <p>エクセルやGoogleスプレッドシート、NotionのCSVエクスポートに対応。カラム名は日本語と英語の両方を自動解釈します。</p>
            </div>
            
            <button
              onClick={handleDownloadTemplate}
              className="bg-black hover:bg-[#FF5C00] text-white font-bold text-[10px] px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              テンプレートCSV
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div 
            onDragOver={handleCsvDragOver}
            onDragLeave={handleCsvDragLeave}
            onDrop={handleCsvDrop}
            className={`border-4 border-dashed border-black rounded-2xl p-8 text-center transition-colors cursor-pointer ${
              isDraggingCsv ? 'bg-indigo-50 border-[#FF5C00]' : 'bg-[#F0EFEC]/25 hover:bg-[#F0EFEC]/50'
            }`}
          >
            <input 
              type="file" 
              accept=".csv"
              onChange={handleCsvFileInput}
              className="hidden" 
              id="csv-file-element"
            />
            <label htmlFor="csv-file-element" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto text-[#FF5C00] mb-3 animate-bounce" style={{ animationDuration: '3s' }} />
              <p className="font-bold text-slate-800 text-sm mb-1">
                CSVファイルをここにドラッグ＆ドロップして読み込み
              </p>
              <p className="text-xs text-slate-400">
                または、ここをクリックしてパソコンからファイルを選択
              </p>
            </label>
          </div>

          {csvError && (
            <div className="flex items-start gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-250 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{csvError}</span>
            </div>
          )}

          {/* CSV Loading previews */}
          {csvPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-black text-[#FF5C00] px-4 py-2 rounded-lg text-xs font-bold">
                <span>取り込み可能なギア: {csvPreview.length} 件をプレビュー中</span>
                <button
                  type="button"
                  onClick={handleImportCsvSubmit}
                  className="bg-white hover:bg-slate-200 text-black px-3 py-1 rounded font-bold transition cursor-pointer"
                >
                  この {csvPreview.length} 点を取り込む！
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-black rounded-lg divide-y divide-slate-150">
                {csvPreview.map((item, index) => (
                  <div key={index} className="p-3 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900">{item.name}</span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{item.brand}</span>
                        <span className="bg-[#FF5C00]/10 text-[#FF5C00] px-1.5 py-0.5 rounded text-[10px] font-bold">{item.category}</span>
                      </div>
                      <p className="text-slate-500 mt-1">{item.description}</p>
                    </div>

                    <div className="flex gap-4 text-[10px] font-mono text-slate-700 shrink-0">
                      <div>
                        <span className="text-indigo-650 font-bold block">📦 収納サイズ</span>
                        <span>{item.packedWidth} x {item.packedDepth} x {item.packedHeight} cm</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-bold block">🏕️ 展開サイズ</span>
                        <span>{item.expandedWidth} x {item.expandedDepth} x {item.expandedHeight} cm</span>
                      </div>
                      <div>
                        <span className="text-black font-bold block">⚖️ 重量</span>
                        <span>{item.weight} kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
