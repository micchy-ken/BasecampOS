import { GoogleGenAI, Type } from "@google/genai";

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

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('AIから応答がありませんでした');
  }

  return JSON.parse(text);
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
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from AI for shape fetch");
  }

  return JSON.parse(text);
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

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
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
      responseSchema: responseSchema,
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from AI for image analysis");
  }

  return JSON.parse(text);
}

export async function validateApiKeyAI(apiKey: string) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('APIキーが入力されていません。');
  }

  // APIキーから改行やスペースを完全に除去
  const cleanKey = apiKey.trim().replace(/[\s\r\n]+/g, '');

  const ai = new GoogleGenAI({ apiKey: cleanKey });
  
  // 軽量高速で確実に利用可能な gemini-3.5-flash を使用して疎通テスト
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "APIキーテスト。疎通確認が成功した場合は「OK」とのみ返答してください。",
  });

  const text = response.text;
  if (!text) {
    throw new Error('AIから空の応答が返されました。APIキーが無効、または利用枠制限に達している可能性があります。');
  }

  return true;
}
