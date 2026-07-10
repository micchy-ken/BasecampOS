import { GoogleGenAI, Type } from "@google/genai";

// 堅牢かつ超高速なモデルフォールバック機構を備えた共通呼び出し関数
async function generateWithFallbackAndRetry(
  ai: any,
  requestParams: { contents: any; config?: any },
  preferredModel: string = "gemini-3.5-flash"
) {
  // 安定性が高く高速な 3.5-flash を最優先し、次に 2.5-flash, 1.5-flash へ順次フォールバック
  const models = [preferredModel, "gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
  const uniqueModels = Array.from(new Set(models));

  let lastError: any = null;

  for (const model of uniqueModels) {
    // 各モデルに対して毎回オリジナルの設定のディープコピーを用意
    let currentConfig = requestParams.config ? JSON.parse(JSON.stringify(requestParams.config)) : undefined;
    
    try {
      console.log(`Calling Gemini API using model: ${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: requestParams.contents,
        config: currentConfig,
      });
      if (response && response.text) {
        return response;
      }
      throw new Error("Received empty response from Gemini API");
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || String(err);
      console.warn(`Model ${model} failed:`, errMsg);

      // Searchツールやレスポンススキーマに関わるエラー、またはツール自体が存在するなら、
      // ツールやスキーマをその場で即座に剥がして、同モデルで1回だけ即時再試行
      const isToolOrSchemaError = 
        errMsg.includes("tool") || 
        errMsg.includes("search") || 
        errMsg.includes("schema") || 
        errMsg.includes("INVALID_ARGUMENT") ||
        errMsg.includes("400") ||
        errMsg.includes("not supported") ||
        (currentConfig && currentConfig.tools);

      if (isToolOrSchemaError && currentConfig && (currentConfig.tools || currentConfig.responseSchema)) {
        console.warn(`Attempting immediate fallback for ${model} by stripping tools or responseSchema...`);
        if (currentConfig.tools) {
          delete currentConfig.tools;
        } else if (currentConfig.responseSchema) {
          delete currentConfig.responseSchema;
          if (currentConfig.responseMimeType === "application/json") {
            delete currentConfig.responseMimeType;
          }
        }
        
        try {
          const retryResponse = await ai.models.generateContent({
            model: model,
            contents: requestParams.contents,
            config: currentConfig,
          });
          if (retryResponse && retryResponse.text) {
            return retryResponse;
          }
        } catch (retryErr: any) {
          lastError = retryErr;
          console.warn(`Immediate retry without tools/schema for ${model} failed too:`, retryErr.message || String(retryErr));
        }
      }

      // 高負荷（503 UNAVAILABLE / 429 RESOURCE_EXHAUSTED）やその他のエラーの場合、
      // 自モデルでのSleep再試行は一切行わず、すぐに次のモデルの評価に移る（これが究極の高速化と安定化に繋がります）
    }
  }

  throw lastError || new Error("Gemini API call failed on all fallback models.");
}

export async function lookupGearAI(queryName: string) {
  const apiKey = localStorage.getItem('basecamp_os_gemini_api_key');
  if (!apiKey) {
    throw new Error('GeminiのAPIキーが設定されていません。設定(MyPage)からAPIキーを登録してください。');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

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

  const prompt = `Please search for the exact or close specifications of the following camping gear in Japanese databases or general knowledge: "${queryName}". Set category to one of ['Tent', 'Tarp', 'Chair', 'Table', 'Lantern', 'Cooking', 'Bedding', 'Other']. Provide its packed (storage) dimensions, expanded (setup) dimensions, weight, and short features description in Japanese. If detailed sizes are not available online, return highly plausible and realistic estimates for this item type.`;

  try {
    // 1st Attempt: with Google Search grounding
    const response = await generateWithFallbackAndRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{ googleSearch: {} }]
      }
    }, "gemini-3.5-flash");

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (searchError: any) {
    console.warn("AI lookup with Google Search failed, retrying without Search...", searchError);
  }

  // 2nd Attempt: fallback to pure generative lookup without googleSearch
  try {
    const responseFallback = await generateWithFallbackAndRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    }, "gemini-3.5-flash");

    const textFallback = responseFallback.text;
    if (!textFallback) {
      throw new Error('AIから応答がありませんでした');
    }
    return JSON.parse(textFallback);
  } catch (err: any) {
    console.error("AI lookup failed completely:", err);
    throw new Error(`AIスペック取得エラー: ${err.message || err}`);
  }
}

export async function fetchWebShapeAI(name: string, category: string) {
  const apiKey = localStorage.getItem('basecamp_os_gemini_api_key');
  if (!apiKey) {
    throw new Error('GeminiのAPIキーが設定されていません。');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      polygon: { type: Type.STRING, description: "A CSS clip-path polygon value, e.g., '20% 0%, 80% 0%, 100% 100%, 0% 100%'. No outer polygon(...) wrapper is required, just the interior coordinates like '20% 0%, 80% 0%, 100% 100%, 0% 100%'" },
      description: { type: Type.STRING, description: "Short explanation in Japanese of the polygon vector coordinates, e.g. 'ヘキサタープ of 2ポール張りを再現した六角形です。'" }
    },
    required: ["polygon", "description"]
  };

  const prompt = `Please search and estimate the exact or close floor plan / projection layout outline of the following outdoor camping gear in Japanese: "${name}" (Category: "${category}"). Convert its 2D top-down shape boundaries into a sequence of percentages for a CSS clip-path mask, returned strictly as a sequence of x% y% coordinate points like '20% 0%, 80% 0%, 100% 100%, 0% 100%' (do not include the outer 'polygon(...)', just the points themselves). For example, a trapezoidal tunnel tent might be '15% 0%, 85% 0%, 100% 100%, 0% 100%', a bell tent might be an octagon, a hexatarp is a 6-point shape. Make it accurate for this specific model!`;

  try {
    // 1st Attempt: with googleSearch
    const response = await generateWithFallbackAndRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{ googleSearch: {} }]
      }
    }, "gemini-3.5-flash");

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (err: any) {
    console.warn("Shape fetch with Google Search failed, retrying without Search...", err);
  }

  // 2nd Attempt: without googleSearch
  try {
    const responseFallback = await generateWithFallbackAndRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    }, "gemini-3.5-flash");

    const textFallback = responseFallback.text;
    if (!textFallback) {
      throw new Error("Empty response from AI for shape fetch");
    }
    return JSON.parse(textFallback);
  } catch (err: any) {
    console.error("fetchWebShapeAI failed completely:", err);
    throw new Error(`平面形状取得エラー: ${err.message || err}`);
  }
}

export async function analyzeImageAI(imageBase64: string, mimeType: string) {
  const apiKey = localStorage.getItem('basecamp_os_gemini_api_key');
  if (!apiKey) {
    throw new Error('GeminiのAPIキーが設定されていません。');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

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

  try {
    const response = await generateWithFallbackAndRetry(ai, {
      contents: [
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    }, "gemini-3.5-flash");

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI for image analysis");
    }

    return JSON.parse(text);
  } catch (err: any) {
    console.error("analyzeImageAI failed:", err);
    throw new Error(`画像解析エラー: ${err.message || err}`);
  }
}

export async function validateApiKeyAI(apiKey: string) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('APIキーが入力されていません。');
  }

  // APIキーから改行やスペースを完全に除去
  const cleanKey = apiKey.trim().replace(/[\s\r\n]+/g, '');

  const ai = new GoogleGenAI({ apiKey: cleanKey });
  
  // 疎通テスト
  const response = await generateWithFallbackAndRetry(ai, {
    contents: "APIキーテスト。疎通確認が成功した場合は「OK」とのみ返答してください。"
  }, "gemini-3.5-flash");

  const text = response.text;
  if (!text) {
    throw new Error('AIから空の応答が返されました。APIキーが無効、または利用枠制限に達している可能性があります。');
  }

  return true;
}
