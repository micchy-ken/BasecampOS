import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Endpoint for gear spec search / AI estimations
app.post("/api/gear-lookup", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "gear name is required" });
      return;
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        brand: { type: Type.STRING },
        category: { type: Type.STRING, description: "Category of the camping gear: 'Tent', 'Tarp', 'Chair', 'Table', 'Lantern', 'Cooking', 'Bedding', 'Other'" },
        packedWidth: { type: Type.NUMBER, description: "Packed width in cm (approx, 1-200. e.g. 60)" },
        packedDepth: { type: Type.NUMBER, description: "Packed depth in cm (approx, 1-200. e.g. 20)" },
        packedHeight: { type: Type.NUMBER, description: "Packed height in cm (approx, 1-200. e.g. 20)" },
        expandedWidth: { type: Type.NUMBER, description: "Expanded width in cm (approx, e.g. 270)" },
        expandedDepth: { type: Type.NUMBER, description: "Expanded depth in cm (approx, e.g. 270)" },
        expandedHeight: { type: Type.NUMBER, description: "Expanded height in cm (approx, e.g. 150)" },
        weight: { type: Type.NUMBER, description: "Weight in kg (approx, e.g. 8.0)" },
        description: { type: Type.STRING, description: "Short description in Japanese of products and features." }
      },
      required: [
        "name",
        "brand",
        "category",
        "packedWidth",
        "packedDepth",
        "packedHeight",
        "expandedWidth",
        "expandedDepth",
        "expandedHeight",
        "weight",
        "description"
      ]
    };

    const prompt = `Please search for the exact or close specifications of the following camping gear in Japanese databases or general knowledge: "${name}". Set category to one of ['Tent', 'Tarp', 'Chair', 'Table', 'Lantern', 'Cooking', 'Bedding', 'Other']. Provide its packed (storage) dimensions, expanded (setup) dimensions, weight, and short features description in Japanese. If detailed sizes are not available online, return highly plausible and realistic estimates for this item type.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{ googleSearch: {} }],
        // hybrid mode to search first and then output strictly schema-validated JSON
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI");
    }

    const parsedData = JSON.parse(text);
    res.json(parsedData);
  } catch (error: any) {
    const isQuotaExceeded = error?.status === "RESOURCE_EXHAUSTED" || 
                            error?.message?.includes("quota") || 
                            error?.message?.includes("429") ||
                            (error && typeof error === 'object' && JSON.stringify(error).includes("429"));
    if (isQuotaExceeded) {
      console.warn(`[Gemini API Info] FREE quota exceeded (429) for "${req.body.name}". Gracefully falling back to local heuristic estimate.`);
    } else {
      console.warn("API lookup failed. Fallback to server-side heuristic prediction model for: ", req.body.name);
      console.error("Original API error was: ", error);
    }
    
    // Heuristic Fallback spec guessing
    const name = req.body.name || "お持ちのギア";
    const lowercaseName = name.toLowerCase();
    
    let category = "Other";
    let brand = "General Brand";
    let packedWidth = 30;
    let packedDepth = 15;
    let packedHeight = 15;
    let expandedWidth = 40;
    let expandedDepth = 40;
    let expandedHeight = 30;
    let weight = 1.5;
    let description = "【お知らせ】AI制限中のため、商品のカテゴリ名からサイズを自動計算しました（手動で任意の正確なサイズに修正可能です）。";

    // Brand matching
    if (lowercaseName.includes("coleman") || lowercaseName.includes("コールマン")) {
      brand = "Coleman";
    } else if (lowercaseName.includes("snow peak") || lowercaseName.includes("スノーピーク") || lowercaseName.includes("snowpeak")) {
      brand = "Snow Peak";
    } else if (lowercaseName.includes("dod") || lowercaseName.includes("ディーオーディー")) {
      brand = "DOD";
    } else if (lowercaseName.includes("helinox") || lowercaseName.includes("ヘリノックス")) {
      brand = "Helinox";
    } else if (lowercaseName.includes("captain stag") || lowercaseName.includes("キャプテンスタッグ")) {
      brand = "Captain Stag";
    } else if (lowercaseName.includes("mont-bell") || lowercaseName.includes("モンベル") || lowercaseName.includes("montbell")) {
      brand = "Mont-bell";
    } else if (lowercaseName.includes("logos") || lowercaseName.includes("ロゴス")) {
      brand = "Logos";
    }

    // Spec sizing prediction
    if (lowercaseName.includes("tent") || lowercaseName.includes("テント") || lowercaseName.includes("ドーム") || lowercaseName.includes("ルーム") || lowercaseName.includes("シェルター")) {
      category = "Tent";
      packedWidth = 60;
      packedDepth = 25;
      packedHeight = 25;
      expandedWidth = 275;
      expandedDepth = 275;
      expandedHeight = 165;
      weight = 6.5;
    } else if (lowercaseName.includes("tarp") || lowercaseName.includes("タープ") || lowercaseName.includes("ヘキサ") || lowercaseName.includes("レクタ")) {
      category = "Tarp";
      packedWidth = 75;
      packedDepth = 15;
      packedHeight = 15;
      expandedWidth = 450;
      expandedDepth = 400;
      expandedHeight = 230;
      weight = 4.0;
    } else if (lowercaseName.includes("chair") || lowercaseName.includes("チェア") || lowercaseName.includes("いす") || lowercaseName.includes("椅子")) {
      category = "Chair";
      packedWidth = 35;
      packedDepth = 12;
      packedHeight = 12;
      expandedWidth = 55;
      expandedDepth = 55;
      expandedHeight = 65;
      weight = 1.1;
    } else if (lowercaseName.includes("table") || lowercaseName.includes("テーブル") || lowercaseName.includes("机")) {
      category = "Table";
      packedWidth = 75;
      packedDepth = 15;
      packedHeight = 10;
      expandedWidth = 90;
      expandedDepth = 60;
      expandedHeight = 40;
      weight = 4.2;
    } else if (lowercaseName.includes("lantern") || lowercaseName.includes("ランタン") || lowercaseName.includes("ライト") || lowercaseName.includes("照明") || lowercaseName.includes("led")) {
      category = "Lantern";
      packedWidth = 15;
      packedDepth = 10;
      packedHeight = 10;
      expandedWidth = 15;
      expandedDepth = 10;
      expandedHeight = 22;
      weight = 0.5;
    } else if (lowercaseName.includes("cooking") || lowercaseName.includes("クッカー") || lowercaseName.includes("火") || lowercaseName.includes("焚き火") || lowercaseName.includes("コンロ") || lowercaseName.includes("ストーブ") || lowercaseName.includes("グリル") || lowercaseName.includes("バーナー")) {
      category = "Cooking";
      packedWidth = 38;
      packedDepth = 38;
      packedHeight = 8;
      expandedWidth = 43;
      expandedDepth = 43;
      expandedHeight = 33;
      weight = 2.7;
    } else if (lowercaseName.includes("bedding") || lowercaseName.includes("寝具") || lowercaseName.includes("コット") || lowercaseName.includes("シュラフ") || lowercaseName.includes("寝袋") || lowercaseName.includes("マット") || lowercaseName.includes("コット")) {
      category = "Bedding";
      packedWidth = 45;
      packedDepth = 18;
      packedHeight = 18;
      expandedWidth = 190;
      expandedDepth = 68;
      expandedHeight = 16;
      weight = 2.2;
    }

    res.json({
      name,
      brand,
      category,
      packedWidth,
      packedDepth,
      packedHeight,
      expandedWidth,
      expandedDepth,
      expandedHeight,
      weight,
      description,
      isHeuristic: true
    });
  }
});

// Endpoint to fetch custom vector shape (polygon definition) from the Web for Tents and Tarps
app.post("/api/fetch-web-shape", async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "gear name is required" });
      return;
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        polygon: { type: Type.STRING, description: "A CSS clip-path polygon value, e.g., '20% 0%, 80% 0%, 100% 100%, 0% 100%'. No outer polygon(...) wrapper is required, just the interior coordinates like '20% 0%, 80% 0%, 100% 100%, 0% 100%'." },
        description: { type: Type.STRING, description: "Short explanation in Japanese of the polygon vector coordinates, e.g. 'ヘキサタープの2ポール張りを再現した六角形です。'" }
      },
      required: ["polygon", "description"]
    };

    const prompt = `Please search and estimate the exact or close floor plan / projection layout outline of the following outdoor camping gear in Japanese: "${name}" (Category: "${category}"). Convert its 2D top-down shape boundaries into a sequence of percentages for a CSS clip-path mask, returned strictly as a sequence of x% y% coordinate points like '20% 0%, 80% 0%, 100% 100%, 0% 100%' (do not include the outer 'polygon(...)', just the points themselves). For example, a trapezoidal tunnel tent might be '15% 0%, 85% 0%, 100% 100%, 0% 100%', a bell tent might be an octagon, a hexatarp is a 6-point shape. Make it accurate for this specific model!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI for shape fetch");
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Web shape fetch failed, falling back to heuristic:", error);
    // Generic fallback polygons (interior points style)
    let polygon = "10% 0%, 90% 0%, 100% 100%, 0% 100%";
    let description = "【簡易推定】Web shape検索制限のため、一般的なトンネル状/変形多角形の平面形状をご用意しました。";

    const lc = req.body.name?.toLowerCase() || "";
    if (lc.includes("hexa") || lc.includes("ヘキサ")) {
      polygon = "50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%";
      description = "【簡易推定】ヘキサタープを想定した一般的な六角形の形状です。";
    } else if (lc.includes("bell") || lc.includes("ベル") || lc.includes("one pole") || lc.includes("ワンポール")) {
      polygon = "30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%";
      description = "【簡易推定】ワンポール・ベルテントを想定した八角形の形状です。";
    }

    res.json({ polygon, description });
  }
});

// Endpoint for gear spec visual extraction via Gemini Multimodal LLM
app.post("/api/gear-image-lookup", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: "imageBase64 and mimeType are required" });
      return;
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Detailed, human-friendly product name in Japanese, e.g. 2ポールシェルターテント, ドームテント 270" },
        brand: { type: Type.STRING, description: "Brand / manufacturer name if visible. If not detected, output 'General'" },
        category: { type: Type.STRING, description: "Category of the camping gear: 'Tent', 'Tarp', 'Chair', 'Table', 'Lantern', 'Cooking', 'Bedding', 'Other'" },
        shape: { type: Type.STRING, description: "Matching 2D setup footprint shape: 'rectangle', 'circle', 'hexagon', 'octagon', 'triangle', 'diamond', 'custom'" },
        customPolygon: { type: Type.STRING, description: "If shape is 'custom', return a CSS clip-path polygon sequence representing the outline. (Write only the interior coordinates, e.g., '10% 0%, 90% 0%, 100% 15%, 100% 85%, 90% 100%, 10% 100%, 0% 85%, 0% 15%'. Do not wrap in polygon()). If other standard shape, you can leave this empty." },
        packedWidth: { type: Type.NUMBER, description: "Estimated packed / storage width in cm. E.g. 60" },
        packedDepth: { type: Type.NUMBER, description: "Estimated packed / storage depth in cm. E.g. 25" },
        packedHeight: { type: Type.NUMBER, description: "Estimated packed / storage height in cm. E.g. 25" },
        expandedWidth: { type: Type.NUMBER, description: "Expanded / setup width (often horizontal width / depth at front of blueprint) in cm. (e.g. 270)" },
        expandedDepth: { type: Type.NUMBER, description: "Expanded / setup depth (total length or projection length in blueprint top view) in cm. (e.g. 480)" },
        expandedHeight: { type: Type.NUMBER, description: "Expanded / setup height (crest height of tent) in cm. (e.g. 188)" },
        weight: { type: Type.NUMBER, description: "Tent total weight in kg if readable, or highly plausible weight estimate. (e.g. 8.5)" },
        description: { type: Type.STRING, description: "Short explanation of sizes and shapes detected from the blueprint illustration in Japanese." }
      },
      required: [
        "name",
        "brand",
        "category",
        "shape",
        "packedWidth",
        "packedDepth",
        "packedHeight",
        "expandedWidth",
        "expandedDepth",
        "expandedHeight",
        "weight",
        "description"
      ]
    };

    const prompt = `Please carefully analyze the provided blueprint/schematic diagram or catalog specification image of a camping gear.
    Identify indicators of dimensions (width, depth, height, length) and layout/shapes in the illustration.
    
    Convert these findings into centimeters (cm) and kilograms (kg) for our campsite design simulator:
    - Determine 'expandedWidth' and 'expandedDepth' from the top-down or plan-view diagram. For instance, in a tent top-down view, look for total length (e.g., 480cm) and maximum width (e.g., 270cm or 245cm).
    - Determine 'expandedHeight' from the front or side elevation diagram (e.g., 188cm).
    - Map the floor setup shape to one of 'rectangle', 'circle', 'hexagon', 'octagon', 'triangle', 'diamond', or choose 'custom' if the plan represents a complex polygonal shape (like dynamic tunnel shapes, 2-pole shelter asymmetric shapes, or custom tarps).
    - If shape is 'custom', please output 'customPolygon' with the interior x y percentage coordinates (e.g. '20% 0%, 80% 0%, 100% 100%, 0% 100%').
    - If packed/storage dimensions or weight are not directly written, provide realistic standard estimates for this specific class of item.
    - Write a helpful Japanese explanation ('description') explaining how you read the dimensions and shapes from the illustration.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    };

    const textPart = {
      text: prompt,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, textPart],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini vision model");
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Gear image specs lookup failed:", error);
    res.status(500).json({ error: error.message || "Failed to analyze gear specification image." });
  }
});

// Heuristic Fallback generator for gear analysis & recommendations
const getHeuristicRecommendations = (gears: any[]) => {
  if (!gears || gears.length === 0) {
    return {
      analysis: "現在、登録されているギアがありません。「ギア・インベントリ」タブからお持ちのテント、タープ、チェアなどを追加していただくと、こちらでアドバイスや高性能な代替ギア・アップグレード品をお探しできます。",
      recommendations: []
    };
  }

  const analysis = `ご登録いただいた ${gears.length}件のギア一覧を分析しました。全体的に素晴らしいギアセレクトです。収納時のサイズ（パッキング体積）や、個々のギアの重量に注目すると、車の積載スペースを広げ、設営・撤収をよりスピーディーにできる「ウルトラライト（軽量コンパクト）」な代替案、または「快適性と耐久性を追求した」ハイエンドなアップグレード案が検討できます。以下に、お持ちのギアに合わせた最適な候補をご提案します。`;

  const recommendations = [];

  // Iterate over some gears to suggest personalized items
  for (const gear of gears) {
    const cat = gear.category;
    if (cat === "Tent" && recommendations.length < 3) {
      recommendations.push({
        originalGearName: gear.name,
        originalCategory: "Tent",
        recommendedName: "アメニティドームS (SDE-002RH)",
        brand: "Snow Peak (スノーピーク)",
        type: "upgrade",
        specifications: "収納サイズ: 58 × 18 × 23cm、重量: 5.0kg、展開サイズ: 230 x 355 x 120cm",
        approxPrice: "約 41,800円 (税込)",
        purchaseUrl: "https://ec.snowpeak.co.jp/snowpeak/ja/p/132101",
        reason: "定番かつ信頼の高品質エントリーテント。高い耐風性と雨に強いジュラルミンフレームを採用しており、お使いの「" + gear.name + "」と比べて悪天候時でも圧倒的な安心感、組み立てのしやすさを実感できます。前室スペースも広く使えます。"
      });
      recommendations.push({
        originalGearName: gear.name,
        originalCategory: "Tent",
        recommendedName: "ツーリングドームLX",
        brand: "Coleman (コールマン)",
        type: "alternative",
        specifications: "収納サイズ: 約 φ21 × 49cm、重量: 約 5.2kg、使用サイズ: 約 210 × 180 × 110cm",
        approxPrice: "約 19,800円 (税込)",
        purchaseUrl: "https://ec.coleman.co.jp/category/252/2185616.html",
        reason: "前室を高く広く立ち上げられる大人気ドームテント。収納時の長さがコンパクト（49cm）に収まるため、ラゲッジスペースやバッグでの携行性に優れ、積載しやすさがアップグレードされます。"
      });
    } else if (cat === "Chair" && recommendations.length < 3) {
      recommendations.push({
        originalGearName: gear.name,
        originalCategory: "Chair",
        recommendedName: "チェアワン (Chair One)",
        brand: "Helinox (ヘリノックス)",
        type: "alternative",
        specifications: "収納サイズ: 35 × 10 × 12cm、重量: 890g (総重量: 960g)、耐荷重: 145kg",
        approxPrice: "約 14,850円 (税込)",
        purchaseUrl: "https://www.montbell.jp/generaldisp.php?genre_id=1101&goods_code=1822221",
        reason: "世界中にウルトラライト・チェア革命をもたらした名機。お使いの「" + gear.name + "」より極めて軽量（約900g）で、片手やバックパックにすっぽり収まるサイズに収納可能です。積載スペースを劇的にセーブできます。"
      });
    } else if (cat === "Table" && recommendations.length < 3) {
      recommendations.push({
        originalGearName: gear.name,
        originalCategory: "Table",
        recommendedName: "エントリーＩＧＴ (CK-080)",
        brand: "Snow Peak (スノーピーク)",
        type: "upgrade",
        specifications: "収納サイズ: 84 × 50 × 5cm、重量: 6.5kg、使用サイズ: 86.5 × 44 × 40cm",
        approxPrice: "約 22,000円 (税込)",
        purchaseUrl: "https://ec.snowpeak.co.jp/snowpeak/ja/p/24376",
        reason: "アイアングリルテーブル（IGT）対応の美しいエントリーモデル。天板の一部を外し、SOTOやスノーピーク製のフラットバーナーを直接セットできるため調理作業と食事スペースがスッキリと一体化。キッチンテーブルを別途持っていく必要がなくなります。"
      });
    } else if (cat === "Lantern" && recommendations.length < 3) {
      recommendations.push({
        originalGearName: gear.name,
        originalCategory: "Lantern",
        recommendedName: "Lighthouse Micro Flash",
        brand: "Goal Zero (ゴールゼロ)",
        type: "alternative",
        specifications: "サイズ: 約 9.3 × φ3.8cm、重量: 68g、最大150ルーメン、最大170時間照射可能",
        approxPrice: "約 5,280円 (税込)",
        purchaseUrl: "https://www.ask-corp.jp/products/goal-zero/accessory/lighthouse-micro-flash.html",
        reason: "片手に収まる超軽量スマートな定番LEDランタン。圧倒的ロングバッテリーと、吊り下げランタン/懐中電灯（フラッシュ）の両用が可能。お持ちの大型ランタンに代わる極小のサブ光源・メイン光源として大活躍します。"
      });
    } else if (cat === "Cooking" && recommendations.length < 3) {
      recommendations.push({
        originalGearName: gear.name,
        originalCategory: "Cooking",
        recommendedName: "レギュレーターストーブ Range (ST-340)",
        brand: "SOTO (ソト)",
        type: "upgrade",
        specifications: "収納サイズ: 幅 14 × 奥行 7.0 × 高さ 11.0cm、重量: 360g、発熱量: 3.3kW",
        approxPrice: "約 9,900円 (税込)",
        purchaseUrl: "https://www.shinfuji.co.jp/soto/products/st-340/",
        reason: "低温時や調理を続けることで発生するガスボンベのドロップダウンによる火力低下を防ぐマイクロレギュレーター搭載。ゴトク幅が従来品より大きく進化し、ミドルサイズのクッカーを安定して加熱できます。"
      });
    } else if (cat === "Bedding" && recommendations.length < 3) {
      recommendations.push({
        originalGearName: gear.name,
        originalCategory: "Bedding",
        recommendedName: "コットワン コンバーチブル",
        brand: "Helinox (ヘリノックス)",
        type: "upgrade",
        specifications: "収納サイズ: 54 × 16 × 16cm、重量: 2.19kg、使用サイズ: 190 × 68 × 16cm",
        approxPrice: "約 48,400円 (税込)",
        purchaseUrl: "https://www.montbell.jp/generaldisp.php?genre_id=1101&goods_code=1822170",
        reason: "極めて頑丈で張り感に優れ、キャンプ場の起伏や地面からの底冷え、湿気を完全に遮断。セットアップもレバー式で少しの力でカチッとロック可能。熟睡したいキャンパーのための最強ハイエンドコットです。"
      });
    }
  }

  // Ensure minimum list content
  if (recommendations.length < 2) {
    const referenceG = gears[0] || { name: "その他ギア" };
    recommendations.push({
      originalGearName: referenceG.name,
      originalCategory: "Other",
      recommendedName: "フィールドホッパー (ST-630)",
      brand: "SOTO (ソト)",
      type: "alternative",
      specifications: "収納サイズ: 29.7 × 11 × 1.9cm（超薄型）、重量: 395g、展開サイズ: A4サイズ相当",
      approxPrice: "約 5,800円 (税込)",
      purchaseUrl: "https://www.shinfuji.co.jp/soto/products/st-630/",
      reason: "パッと開くだけで脚が同時に飛び出す独自ギミック。お使いのサブ用品やテント内の身の回り品をサッと載せるサイドテーブルとして抜群のコンパクト性を誇ります。"
    });
    recommendations.push({
      originalGearName: referenceG.name,
      originalCategory: "Other",
      recommendedName: "ミニマルクッカー角 (ST-3108)",
      brand: "SOTO (ソト)",
      type: "upgrade",
      specifications: "収納サイズ: 13 × 13 × 7.7cm、重量: 約 375g、容量: 1.0L、極厚アルミ(1.6mm)",
      approxPrice: "約 6,050円 (税込)",
      purchaseUrl: "https://www.shinfuji.co.jp/soto/products/st-3108/",
      reason: "1.6mmの極厚アルミを使用し、熱伝導率が抜群に高くお米も美味しくふっくら炊飯可能。四角い形状なのでラーメンの湯切りやパッキング時のデッドスペース削減に大活躍です。"
    });
  }

  return { analysis, recommendations };
};

// API Endpoint for Camping gear alternatives & search-grounded recommendations
app.post("/api/gear-analysis", async (req, res) => {
  try {
    const { gears } = req.body;
    if (!gears || !Array.isArray(gears) || gears.length === 0) {
      res.json(getHeuristicRecommendations([]));
      return;
    }

    const recommendationSchema = {
      type: Type.OBJECT,
      properties: {
        analysis: {
          type: Type.STRING,
          description: "An overall analysis of the user's camping gear context in Japanese, e.g., lightweight trends, packing volume optimization, potential gaps, or luxury item pointers."
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalGearName: { type: Type.STRING, description: "The original gear item name this refers to." },
              originalCategory: { type: Type.STRING, description: "Original category of this gear." },
              recommendedName: { type: Type.STRING, description: "Product name of the recommended gear." },
              brand: { type: Type.STRING, description: "Brand of the recommended gear." },
              type: { type: Type.STRING, description: "'alternative' for lightweight/size alternatives, or 'upgrade' for higher performance/luxury" },
              specifications: { type: Type.STRING, description: "Brief packed/expanded size and weight details of the new item in Japanese." },
              approxPrice: { type: Type.STRING, description: "Estimated price in JPY, e.g., '12,500円'" },
              purchaseUrl: { type: Type.STRING, description: "A realistic and valid store/manufacturer URL (e.g., brand site, Amazon or Rakuten search link, or general shop URL) for buying this product." },
              reason: { type: Type.STRING, description: "Compelling explanation in Japanese of why this product is a great fit, linking it to the specs of the user's current gear." }
            },
            required: ["originalGearName", "originalCategory", "recommendedName", "brand", "type", "specifications", "approxPrice", "purchaseUrl", "reason"]
          }
        }
      },
      required: ["analysis", "recommendations"]
    };

    const prompt = `あなたはプロのキャンプアドバイザーおよびパッキングのスペシャリストです。
ユーザーが所有している以下のキャンプギアリストを詳しく分析し、改善点や軽量化、高品質化（より高性能）に向けたスマートなアドバイス（日本語）を記述してください。
さらに、1点以上のギアについて、サイズや重量、ブランド、特長を考慮した、類似するスペックを持つ代替品（より軽量/コンパクトな alternative）、または、より高性能なアップグレードギア（信頼性、高級感、快適性に富む upgrade）の候補をインターネットで検索して1件〜4件提案してください。
【必ずGoogle Searchグラウンディング機能を利用して、実在する製品の型番、現在の仕様、おおよその最新実売価格、およびブランド公式サイトやAmazon、楽天市場、Yahooショッピング等の正しい、実在する購入可能なオンラインストアへのリンク（URL）を見つけて出力してください。絶対に中身が空の偽リンクを出力しないでください。】

【ユーザーの所有ギアリスト】:
${JSON.stringify(gears.map((g: any) => ({ name: g.name, brand: g.brand, category: g.category, packedSize: `${g.packedWidth}x${g.packedDepth}x${g.packedHeight}cm`, weight: `${g.weight}kg`, desc: g.description })), null, 2)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini recommendation API");
    }

    const payload = JSON.parse(text);
    res.json(payload);
  } catch (error: any) {
    console.warn("[Gear Analysis API Alert] API error triggered. Falling back safely to high-quality local heuristic recommendation engine.");
    console.error("Original error:", error);
    const fallbackPayload = getHeuristicRecommendations(req.body.gears || []);
    res.json(fallbackPayload);
  }
});

async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Startup failed:", err);
});
