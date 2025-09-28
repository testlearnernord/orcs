import type { FeedEntry } from '@sim/types';
import { Z_LAYERS } from '@ui/layers';
import { UIContainer } from '@ui/primitives';

export interface FeedLine {
  text: string;
  y: number;
}

function chunkWord(word: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let remaining = word;
  while (remaining.length > maxChars) {
    chunks.push(remaining.slice(0, maxChars));
    remaining = remaining.slice(maxChars);
  }
  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const segments =
      word.length > maxChars ? chunkWord(word, maxChars) : [word];
    for (const segment of segments) {
      if (current.length === 0) {
        current = segment;
        continue;
      }
      if ((current + ' ' + segment).length <= maxChars) {
        current = `${current} ${segment}`;
      } else {
        lines.push(current);
        current = segment;
      }
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
}

export class FeedView extends UIContainer {
  readonly width: number;
  readonly lineHeight: number;
  readonly lineSpacing: number;
  private layout: FeedLine[] = [];

  constructor(width = 420, lineHeight = 18, lineSpacing = 6) {
    super({ x: 0, y: 0 });
    this.width = width;
    this.lineHeight = lineHeight;
    this.lineSpacing = lineSpacing;
    this.setDepth(Z_LAYERS.FEED);
  }

  render(entries: FeedEntry[]): FeedLine[] {
    const lines: FeedLine[] = [];
    const maxChars = Math.max(10, Math.floor(this.width / 8));
    let y = 0;
    entries.forEach((entry) => {
      const wrapped = wrapText(entry.text, maxChars);
      wrapped.forEach((line, index) => {
        lines.push({ text: line, y });
        if (index < wrapped.length - 1) {
          y += this.lineHeight + this.lineSpacing;
        }
      });
      y += this.lineHeight + this.lineSpacing;
    });
    this.layout = lines;
    return lines;
  }

  getLines(): FeedLine[] {
    return this.layout;
  }
}
