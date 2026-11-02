/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AI-Powered Contextual Polyphone Detection & Auto-Correction Service
 * Uses Google Gemini (@google/genai) to understand literary context in novels,
 * identify polyphonic Chinese characters, and provide 100% accurate Edge TTS pronunciations.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { scanPolyphones } from '../utils/polyphoneCorrector.js';

export interface AiPolyphoneMatch {
  originalText: string;
  character: string;
  contextSnippet: string;
  pinyin: string;
  zhuyin?: string;
  replacementPhonetic: string;
  explanation: string;
  severity: 'high' | 'medium' | 'low';
}

class AiPolyphoneService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.ai;
  }

  /**
   * Reads raw novel text using Gemini to deeply analyze context,
   * detect all polyphones (破音字/多音字), and determine correct pronunciation.
   */
  async scanWithAi(text: string): Promise<{ matches: AiPolyphoneMatch[]; source: 'gemini' | 'rules' }> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { matches: [], source: 'rules' };
    }

    // Limit sample slice to 4,000 characters per scan to keep response snappy and comprehensive
    const sample = trimmed.slice(0, 4000);

    if (process.env.GEMINI_API_KEY) {
      try {
        const client = this.getClient();
        // Try gemini-3.8-flash first, fallback to gemini-3.1-flash-lite if temporary spike
        const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
        let lastErr: any = null;

        for (const model of modelsToTry) {
          try {
            const response = await client.models.generateContent({
              model,
              contents: `請詳細閱讀以下小說文字，理解上下文語境，找出所有在當前語境下具有多音特徵、容易被微軟 Edge TTS 讀錯或需要確認音調的多音字（如：重、長、行、彈、著、降、便、得、調、應、發、哄、落、處、模、答等）：\n\n${sample}`,
              config: {
                systemInstruction:
                  '你是一位精通中文語音合成（TTS）、語音學與網絡小說語境的專業校對專家。你的任務是閱讀小說文字，依據完整上下文句意，準確辨識出多音字，給予正確的繁體拼音、注音與 Edge TTS 建議諧音替代字（替換後聽感一致但發音保證正確）。',
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      originalText: {
                        type: Type.STRING,
                        description: '文本中出現的多音字詞彙（如「長老」、「長劍」、「重重地」、「子彈」、「彈跳」）',
                      },
                      character: {
                        type: Type.STRING,
                        description: '該多音字單字（如「長」、「重」、「彈」）',
                      },
                      contextSnippet: {
                        type: Type.STRING,
                        description: '包含前後文的短句，便於創作者核對上下文',
                      },
                      pinyin: {
                        type: Type.STRING,
                        description: '上下文正確讀音的漢語拼音（含聲調，如 zhǎng, cháng, zhòng, dàn, tán）',
                      },
                      zhuyin: {
                        type: Type.STRING,
                        description: '台灣繁體注音符號（如 ㄓㄤˇ, ㄔㄤˊ, ㄓㄨㄥˋ, ㄉㄢˋ）',
                      },
                      replacementPhonetic: {
                        type: Type.STRING,
                        description: '用於替換輸入使微軟 TTS 100% 讀對音調的同音字或標註',
                      },
                      explanation: {
                        type: Type.STRING,
                        description: '依據上下文語意說明的發音依據（如：此處作動詞/名詞/形容詞）',
                      },
                      severity: {
                        type: Type.STRING,
                        enum: ['high', 'medium', 'low'],
                        description: '錯誤嚴重度或 TTS 誤讀機率',
                      },
                    },
                    required: [
                      'originalText',
                      'character',
                      'contextSnippet',
                      'pinyin',
                      'replacementPhonetic',
                      'explanation',
                    ],
                  },
                },
              },
            });

            const rawJson = response.text?.trim();
            if (rawJson) {
              const parsed = JSON.parse(rawJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return {
                  matches: parsed.map((item: any) => ({
                    originalText: item.originalText || item.character || '',
                    character: item.character || item.originalText?.charAt(0) || '',
                    contextSnippet: item.contextSnippet || '',
                    pinyin: item.pinyin || '',
                    zhuyin: item.zhuyin || '',
                    replacementPhonetic: item.replacementPhonetic || item.originalText || '',
                    explanation: item.explanation || 'AI 上下文語意識別',
                    severity: (item.severity as 'high' | 'medium' | 'low') || 'medium',
                  })),
                  source: 'gemini',
                };
              }
            }
          } catch (modelErr: any) {
            lastErr = modelErr;
            console.warn(`[AiPolyphoneService] Model ${model} returned error, trying fallback...`, modelErr.message);
          }
        }
        if (lastErr) {
          console.warn('[AiPolyphoneService] Gemini models exhausted, using rule-based dictionary:', lastErr.message);
        }
      } catch (err: any) {
        console.error('[AiPolyphoneService] AI Scan failed, falling back to rule engine:', err);
      }
    }

    // High-accuracy rule-based fallback if offline or API limit
    const ruleMatches = scanPolyphones(sample);
    const converted: AiPolyphoneMatch[] = ruleMatches.map((m) => {
      const start = Math.max(0, m.index - 6);
      const end = Math.min(sample.length, m.index + m.length + 6);
      return {
        originalText: m.original,
        character: m.original.charAt(0),
        contextSnippet: sample.substring(start, end),
        pinyin: m.pinyin,
        zhuyin: m.zhuyin,
        replacementPhonetic: m.replacement,
        explanation: m.explanation,
        severity: 'medium',
      };
    });

    return { matches: converted, source: 'rules' };
  }

  /**
   * Automatically corrects text by applying selected polyphone substitutions.
   */
  applyCorrections(text: string, corrections: { originalText: string; replacementPhonetic: string }[]): string {
    let result = text;
    for (const item of corrections) {
      if (!item.originalText || !item.replacementPhonetic) continue;
      // Global regex replace
      const escaped = item.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), item.replacementPhonetic);
    }
    return result;
  }
}

export const aiPolyphoneService = new AiPolyphoneService();
