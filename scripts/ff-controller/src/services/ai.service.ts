import { GoogleGenAI } from '@google/genai';

export interface PatchPayload {
  filename: string;
  content: string;
}

/**
 * Handles LLM deterministic interventions explicitly tied to the Gemini 2.5 SDK.
 */
export class AiService {
  private api: GoogleGenAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('FATAL: Missing GEMINI_API_KEY environment binding for Self-Healing Loop.');
    }
    this.api = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Phase 1 Initial Patch Request (Target Temp: 0.2)
   */
  async generateInitialPatch(prompt: string): Promise<PatchPayload[]> {
    console.log(`[AI Engine] Evaluating Instruction Matrix...`);
    
    const response = await this.api.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `You are a strict controller system. Convert the prompt into target source code. Return ONLY valid JSON in format: [{"filename": "src/target.ts", "content": "export const a = 1;"}].\n\nPROMPT:\n${prompt}`,
      config: {
        temperature: 0.2, // Baseline generative temp
        responseMimeType: "application/json"
      }
    });
    
    try {
      return JSON.parse(response.text || '[]') as PatchPayload[];
    } catch (e) {
      console.error('[AI Engine] Failed to parse initial LLM JSON format.');
      return [];
    }
  }

  /**
   * Phase 2 Differentiated Diff Recovery (Target Temp: 0.1)
   */
  async generateDiffPatch(fileState: string, failureLogs: string): Promise<string> {
    console.log(`[AI Engine] Executing highly localized Diff Patch targeting failure signatures...`);
    const response = await this.api.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Strictly fix the provided code based on the vitest validation failure logs. Apply differential fixes representing a surgical patch. DO NOT add chat output. DO NOT add markdown formatting around code.\n\nLOGS:\n${failureLogs}\n\nBROKEN STATE:\n${fileState}`,
      config: {
        temperature: 0.1 // High determinism
      }
    });

    let raw = response.text || fileState;
    if(raw.startsWith('```')) raw = raw.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    return raw;
  }

  /**
   * Phase 2 Ultimate Rewrite Heuristic (Target Temp: 0.1)
   */
  async generateRewrite(fileState: string, failureLogs: string): Promise<string> {
    console.log(`[AI Engine] Invoking Ultimate Module Rewrite fallback...`);
    const response = await this.api.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Previous auto-recoveries failed. Execute a complete zero-trust rewrite of this module, achieving its explicit intent while conforming mathematically to the provided error logs. Do NOT output markdown code blocks.\n\nLOGS:\n${failureLogs}\n\nBROKEN STATE:\n${fileState}`,
      config: {
        temperature: 0.1
      }
    });
    
    let raw = response.text || fileState;
    if(raw.startsWith('```')) raw = raw.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    return raw;
  }
}
