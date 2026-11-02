/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomCharacter, MultiVoiceBlock } from '../types';
import { CHARACTER_COLORS } from './characterConstants';

/**
 * Intelligently parse raw pasted novel/dialogue script into discrete blocks
 * Examples supported:
 * 1. 甲說：「你投進了一個三分球。」乙說：「牛逼啊！」甲又說：「Easy peasy」
 * 2. 甲：「1+1=?」\n乙：「2」
 * 3. 甲: 你投進了一個三分球。\n乙: 牛逼啊！
 * 4. 旁白與引號穿插之網絡小說文本
 */
export function parseScriptToBlocks(
  rawText: string,
  existingCharacters: CustomCharacter[] = []
): MultiVoiceBlock[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const charColorMap = new Map<string, string>();
  for (const c of existingCharacters) {
    charColorMap.set(c.name, c.color);
  }

  // Color generator for newly discovered characters
  let nextColorIdx = 0;
  const getColorForSpeaker = (name: string): string => {
    if (charColorMap.has(name)) return charColorMap.get(name)!;
    const color = CHARACTER_COLORS[nextColorIdx % CHARACTER_COLORS.length];
    nextColorIdx++;
    charColorMap.set(name, color);
    return color;
  };

  const blocks: MultiVoiceBlock[] = [];
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Helper to push a block
  const addBlock = (speaker: string, text: string) => {
    const cleanSpeaker = speaker.trim() || '旁白';
    const cleanText = text.trim();
    if (!cleanText) return;

    blocks.push({
      id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      characterName: cleanSpeaker,
      color: getColorForSpeaker(cleanSpeaker),
      text: cleanText,
    });
  };

  // Regular expression patterns for dialogue with speaker markers
  // e.g., 甲說：「...」 / 甲道: "..." / 甲：... / 甲: ...
  const colonDialogueRegex = /^([^\s：:「“]{1,12})[：:]\s*(.*)$/;
  const verbDialogueRegex = /([^\s，。！？「“]{1,10})(?:說|道|喊|問|回|答|笑|冷笑|怒道|嘆道|心想|又說|接著說)[：:]?\s*[「“『]([^」”』]+)[」”』]/g;

  for (const line of lines) {
    // 1. Check if line is simple "角色: 對話" or "角色：對話"
    const colonMatch = line.match(colonDialogueRegex);
    if (colonMatch && !colonMatch[2].startsWith('http')) {
      const speaker = colonMatch[1].trim();
      let content = colonMatch[2].trim();
      // Remove enclosing quotation marks if any
      if (
        (content.startsWith('「') && content.endsWith('」')) ||
        (content.startsWith('“') && content.endsWith('”')) ||
        (content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith('『') && content.endsWith('』'))
      ) {
        content = content.slice(1, -1).trim();
      }
      addBlock(speaker, content);
      continue;
    }

    // 2. Check if line contains one or multiple "XX說：「...」" patterns
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let hasVerbMatches = false;

    // Reset regex
    verbDialogueRegex.lastIndex = 0;

    while ((match = verbDialogueRegex.exec(line)) !== null) {
      hasVerbMatches = true;
      const matchStart = match.index;
      // Preceding narration before this dialogue
      const narration = line.substring(lastIndex, matchStart).trim();
      if (narration && /[\p{L}\p{N}]/u.test(narration)) {
        addBlock('旁白', narration);
      }

      const speaker = match[1].trim();
      const dialogueText = match[2].trim();
      addBlock(speaker, dialogueText);

      lastIndex = verbDialogueRegex.lastIndex;
    }

    // Trailing narration after last match
    if (hasVerbMatches) {
      const trailing = line.substring(lastIndex).trim();
      if (trailing && /[\p{L}\p{N}]/u.test(trailing)) {
        addBlock('旁白', trailing);
      }
      continue;
    }

    // 3. Check for standalone quotes with known characters
    const quoteRegex = /[「“『]([^」”』]+)[」”』]/g;
    let quoteMatch: RegExpExecArray | null;
    let prevIndex = 0;
    let foundQuote = false;

    while ((quoteMatch = quoteRegex.exec(line)) !== null) {
      foundQuote = true;
      const leading = line.substring(prevIndex, quoteMatch.index).trim();
      if (leading && /[\p{L}\p{N}]/u.test(leading)) {
        addBlock('旁白', leading);
      }

      // Try to determine speaker from leading text, or fallback to first non-narrator character or 角色
      let speaker = '甲';
      if (existingCharacters.length > 0) {
        // Find if any existing character name is mentioned in leading text
        const matched = existingCharacters.find((c) => leading.includes(c.name));
        if (matched) speaker = matched.name;
      }
      addBlock(speaker, quoteMatch[1].trim());
      prevIndex = quoteRegex.lastIndex;
    }

    if (foundQuote) {
      const tail = line.substring(prevIndex).trim();
      if (tail && /[\p{L}\p{N}]/u.test(tail)) {
        addBlock('旁白', tail);
      }
      continue;
    }

    // 4. Fallback: Entire line as a single narration or dialogue block
    // If it mentions a known character at start, assign it, else 旁白
    const foundChar = existingCharacters.find((c) => line.startsWith(c.name));
    if (foundChar) {
      addBlock(foundChar.name, line.slice(foundChar.name.length).replace(/^[：:\s]+/, ''));
    } else {
      addBlock('旁白', line);
    }
  }

  return blocks;
}
