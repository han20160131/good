/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chapter, Paragraph } from '../types';

export interface SplitOptions {
  projectId: string;
  chapterRegexStr?: string;
  maxChunkChars?: number; // Optimal for high-speed Edge TTS: 450 chars
  minChunkChars?: number;
}

const DEFAULT_CHAPTER_REGEX = /(?:^|\n)\s*(第[0-9一二三四五六七八九十百千萬]+[章回節卷部篇][^\n]*)/g;

/**
 * Splits raw novel text into structured chapters and TTS-ready paragraphs without chopping sentences.
 */
export function splitNovelText(rawText: string, options: SplitOptions): Chapter[] {
  const {
    projectId,
    chapterRegexStr,
    maxChunkChars = 450,
  } = options;

  if (!rawText || !rawText.trim()) {
    return [];
  }

  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let regex: RegExp;
  try {
    regex = chapterRegexStr ? new RegExp(chapterRegexStr, 'g') : DEFAULT_CHAPTER_REGEX;
  } catch {
    regex = DEFAULT_CHAPTER_REGEX;
  }

  // Find all chapter headings and their positions
  const matches: { title: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanText)) !== null) {
    const title = match[1] ? match[1].trim() : match[0].trim();
    matches.push({ title, index: match.index });
  }

  const chapters: Chapter[] = [];

  if (matches.length === 0) {
    // If no chapter title matches, treat entire text as "第一章"
    const paragraphs = splitChapterIntoParagraphs(cleanText, projectId, 1, maxChunkChars);
    const totalWords = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);
    chapters.push({
      id: `${projectId}_ch1`,
      title: '第一章 序幕與正文',
      order: 1,
      paragraphs,
      totalWords,
    });
    return chapters;
  }

  // If there is preamble before the first chapter title
  if (matches[0].index > 0) {
    const preambleText = cleanText.substring(0, matches[0].index).trim();
    if (preambleText.length > 0) {
      const paragraphs = splitChapterIntoParagraphs(preambleText, projectId, 0, maxChunkChars);
      const totalWords = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);
      chapters.push({
        id: `${projectId}_ch0`,
        title: '序章 / 前言',
        order: 0,
        paragraphs,
        totalWords,
      });
    }
  }

  // Process matched chapters
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : cleanText.length;

    const chapterRaw = cleanText.substring(startIndex, endIndex).trim();
    // Exclude title from body if possible
    const firstNewline = chapterRaw.indexOf('\n');
    let chapterBody = '';
    let chapterTitle = current.title;

    if (firstNewline !== -1) {
      chapterBody = chapterRaw.substring(firstNewline + 1).trim();
    } else {
      chapterBody = chapterRaw;
    }

    const chapterOrder = chapters.length + 1;
    // Combine chapter title with body so chapter title is also voiced and no words are discarded!
    const fullChapterText = chapterBody.length > 0 ? `${chapterTitle}\n${chapterBody}` : chapterTitle;
    const paragraphs = splitChapterIntoParagraphs(fullChapterText, projectId, chapterOrder, maxChunkChars);
    const totalWords = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);

    chapters.push({
      id: `${projectId}_ch${chapterOrder}`,
      title: chapterTitle,
      order: chapterOrder,
      paragraphs,
      totalWords,
    });
  }

  return chapters;
}

/**
 * Splits chapter text into paragraphs that:
 * 1. Respect natural line breaks.
 * 2. Break along full sentence terminals (。！？!?…\n).
 * 3. Never break in the middle of a sentence unless a single sentence exceeds maxChunkChars.
 */
function splitChapterIntoParagraphs(
  text: string,
  projectId: string,
  chapterOrder: number,
  maxChunkChars: number = 450
): Paragraph[] {
  if (!text || !text.trim()) {
    return [];
  }

  // Extract raw lines/paragraphs
  const rawBlocks = text.split(/\n+/).map(b => b.trim()).filter(b => b.length > 0);
  const chunks: string[] = [];

  let currentChunk = '';

  for (const block of rawBlocks) {
    if (block.length > maxChunkChars) {
      // Flush any accumulated text first
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Split large block into individual sentences
      const sentences = splitIntoSentences(block);
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= maxChunkChars) {
          currentChunk += (currentChunk.length > 0 ? '\n' : '') + sentence;
        } else {
          if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }

          if (sentence.length > maxChunkChars) {
            const subClauses = splitLongSentence(sentence, maxChunkChars);
            for (const sub of subClauses) {
              if (sub.trim().length > 0) {
                chunks.push(sub.trim());
              }
            }
          } else {
            currentChunk = sentence;
          }
        }
      }
    } else {
      // Block fits within maxChunkChars
      const candidate = currentChunk.length > 0 ? `${currentChunk}\n${block}` : block;
      if (candidate.length <= maxChunkChars) {
        currentChunk = candidate;
      } else {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = block;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Merge any chunks that have no speakable characters (e.g. isolated dashes '——' or '……') into adjacent text
  const mergedChunks: string[] = [];
  for (const c of chunks) {
    const trimmed = c.trim();
    if (!trimmed) continue;
    if (!/[\p{L}\p{N}]/u.test(trimmed)) {
      if (mergedChunks.length > 0) {
        mergedChunks[mergedChunks.length - 1] += '\n' + trimmed;
      } else {
        mergedChunks.push(trimmed);
      }
    } else {
      mergedChunks.push(trimmed);
    }
  }

  return mergedChunks.map((chunkText, idx) => {
    const padChapter = String(chapterOrder).padStart(3, '0');
    const padPara = String(idx + 1).padStart(4, '0');
    return {
      id: `${projectId}_c${padChapter}_p${padPara}`,
      chapterIndex: chapterOrder,
      paragraphIndex: idx + 1,
      text: chunkText,
      wordCount: countCharacters(chunkText),
      status: 'pending',
      retryCount: 0,
    };
  });
}

/**
 * Breaks a text block into complete sentences using Chinese and Western sentence terminals.
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  const regex = /([^。！？!?…\n]+[。！？!?…]+["'」』）)]*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    sentences.push(match[1]);
    lastIndex = regex.lastIndex;
  }

  // Any remaining trailing text without punctuation
  if (lastIndex < text.length) {
    const remainder = text.substring(lastIndex);
    if (remainder.trim()) {
      sentences.push(remainder);
    }
  }

  return sentences.length > 0 ? sentences : [text];
}

/**
 * Sub-splits a very long sentence by commas or semicolons to prevent TTS API payload limits.
 */
function splitLongSentence(sentence: string, maxLimit: number): string[] {
  const parts = sentence.split(/([，；;,\s]+)/);
  const result: string[] = [];
  let buffer = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (buffer.length + part.length <= maxLimit) {
      buffer += part;
    } else {
      if (buffer.length > 0) {
        result.push(buffer);
        buffer = '';
      }
      if (part.length > maxLimit) {
        // Last resort: hard slice if clause is giant
        for (let j = 0; j < part.length; j += maxLimit) {
          result.push(part.substring(j, j + maxLimit));
        }
      } else {
        buffer = part;
      }
    }
  }

  if (buffer.length > 0) {
    result.push(buffer);
  }

  return result;
}

/**
 * Counts characters in Chinese/Mixed text ignoring non-essential whitespaces.
 */
export function countCharacters(text: string): number {
  return text.replace(/\s+/g, '').length;
}

/**
 * Estimates audio duration based on traditional TTS reading rate (~4 to 5 Chinese chars per second).
 */
export function estimateAudioDuration(charCount: number): string {
  const seconds = Math.round(charCount / 4.2);
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (minutes > 60) {
    const hours = (minutes / 60).toFixed(1);
    return `約 ${hours} 小時`;
  }
  return minutes > 0 ? `${minutes} 分 ${remainingSecs} 秒` : `${seconds} 秒`;
}
