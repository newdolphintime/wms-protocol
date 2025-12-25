
import { GoogleGenAI } from "@google/genai";
import { Fund, ProposalConfig } from "../types";
import { MOCK_FUNDS } from "./dataService";

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

export const generateProposalStrategy = async (config: ProposalConfig): Promise<string> => {
    const assetsDesc = config.assets.map(a => {
        const f = MOCK_FUNDS.find(fund => fund.id === a.fundId);
        return f ? `- ${f.name} (${f.type}): 配置金额 ${a.amount}万元, 风险等级 R${f.riskLevel}` : '';
    }).join('\n');

    const prompt = `
        你是一位专业的私人财富理财经理。正在为客户撰写一份《投资规划建议书》。
        
        客户信息：
        - 姓名：${config.clientName}
        - 风险偏好：${config.riskLevel}
        - 投资期限：${config.investmentHorizon}
        - 总规划金额：${config.totalAmount}万元
        
        拟配置资产组合：
        ${assetsDesc}
        
        请撰写一段“资产配置建议与市场观点”的文案（Markdown格式，约300字），语气需高端、专业、诚恳（类似私人银行风格）。
        内容包括：
        1. **配置思路**：结合客户风险偏好，解释为什么采用这种股债/行业搭配。
        2. **市场展望**：简要提及当前市场环境下该组合的优势（如攻守兼备、抗波动等）。
        3. **风险提示**：温馨提示投资风险。
        
        请直接输出正文，不要带标题。
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text || "正在生成投资策略建议...";
      } catch (error) {
        console.error("Proposal Gen Error:", error);
        return "生成失败，请手动撰写。";
      }
};