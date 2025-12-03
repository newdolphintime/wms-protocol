import { GoogleGenAI } from "@google/genai";
import { Fund } from "../types";

// Initialize the client
// NOTE: API Key is safely assumed to be in process.env.API_KEY per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFunds = async (funds: Fund[]): Promise<string> => {
  if (funds.length === 0) return "请选择需要分析的基金。";

  const fundDescriptions = funds.map(f => 
    `- ${f.name} (${f.type}): 今年以来收益率 ${f.ytdReturn}%, 风险等级 ${f.riskLevel}/5. 描述: ${f.description}`
  ).join('\n');

  const prompt = `
    你是一位资深的中国A股市场基金投资分析师。
    请根据以下选中的ETF基金概况进行专业的对比分析：
    
    ${fundDescriptions}
    
    请提供一份简明扼要的分析报告（Markdown格式，不超过300字），内容需包含：
    1. **业绩与风险评估**：对比各基金的近期表现及风险特征。
    2. **投资建议**：说明每只基金适合哪类投资者（如激进型、稳健型等）。
    3. **总结**：给出简短的配置建议。
    
    语气请保持专业、客观且易于理解。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "暂时无法生成分析报告，请稍后再试。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "生成分析报告失败，请检查网络连接或稍后再试。";
  }
};