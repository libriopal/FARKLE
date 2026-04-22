import { GoogleGenAI } from '@google/genai';

export class AiService {
  private api: GoogleGenAI;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY missing.');
    this.api = new GoogleGenAI({ apiKey: key });
  }

  async generateInitial(promptText: string): Promise<string> {
    const res = await this.api.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Generate raw TypeScript source matching this requirement. Output ONLY real code, no markdown wrappers.\n\n${promptText}`
    });
    return this.clean(res.text || '');
  }

  async diffPatch(code: string, logs: string): Promise<string> {
    const res = await this.api.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Diff constraints strictly. Repair the following code directly mapped by these test failures. Return raw TS code without markdown blocks.\n\nLOGS:\n${logs}\n\nBROKEN:\n${code}`,
      config: { temperature: 0.1 }
    });
    return this.clean(res.text || code);
  }

  async fullRewrite(code: string, logs: string): Promise<string> {
    const res = await this.api.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Zero-trust rewrite. Rebuild this module ensuring exact satisfaction of requirements failing here:\n\nLOGS:\n${logs}\n\nCODE:\n${code}`,
      config: { temperature: 0.1 }
    });
    return this.clean(res.text || code);
  }

  private clean(t: string) {
    let cln = t.replace(/^```[a-z]*\n/g, '').replace(/\n```$/g, '');
    return cln;
  }
}
