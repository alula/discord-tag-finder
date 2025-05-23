export const MAX_CHARS_IN_TAG = 4;

export function generateLigatureCombinations(
  word: string,
  ligatures: Array<[string, string]>
): string[] {
  const relevantLigs = ligatures.filter(([_, lat]) => word.includes(lat));

  if (relevantLigs.length === 0) return [word];

  const opts: Array<{ lig: string; lat: string; pos: number[] }> = [];

  for (const [lig, lat] of relevantLigs) {
    const pos: number[] = [];
    let start = 0;

    while (true) {
      const i = word.indexOf(lat, start);
      if (i === -1) break;
      pos.push(i);
      start = i + 1;
    }

    if (pos.length > 0) {
      opts.push({ lig, lat, pos });
    }
  }

  const results = new Set<string>();
  const stack: Array<{ state: string; optIdx: number; choices: number[] }> = [];

  stack.push({ state: word, optIdx: 0, choices: [] });

  while (stack.length > 0) {
    const cur = stack.pop()!;

    if (cur.optIdx >= opts.length) {
      results.add(cur.state);
      continue;
    }

    const opt = opts[cur.optIdx];

    stack.push({
      state: cur.state,
      optIdx: cur.optIdx + 1,
      choices: [...cur.choices, -1],
    });

    for (let i = 0; i < opt.pos.length; i++) {
      const pos = opt.pos[i];
      let conflict = false;

      for (let j = 0; j < cur.choices.length; j++) {
        const prevChoice = cur.choices[j];
        if (prevChoice === -1) continue;

        const prevOpt = opts[j];
        const prevPos = prevOpt.pos[prevChoice];
        const prevEnd = prevPos + prevOpt.lat.length;
        const curEnd = pos + opt.lat.length;

        if (!(prevEnd <= pos || curEnd <= prevPos)) {
          conflict = true;
          break;
        }
      }

      if (!conflict) {
        const newState = applyReplacements(word, opts, [...cur.choices, i]);
        stack.push({
          state: newState,
          optIdx: cur.optIdx + 1,
          choices: [...cur.choices, i],
        });
      }
    }
  }

  return Array.from(results);
}

export function generateLigatureCombinationsAllCases(
  word: string,
  ligatures: Array<[string, string]>
): Set<string> {
  const asis = generateLigatureCombinations(word, ligatures);
  const upper = generateLigatureCombinations(word.toUpperCase(), ligatures);
  const lower = generateLigatureCombinations(word.toLowerCase(), ligatures);

  const allWords = new Set<string>();
  asis.forEach((w) => allWords.add(w));
  upper.forEach((w) => allWords.add(w));
  lower.forEach((w) => allWords.add(w));

  return allWords;
}

function applyReplacements(
  word: string,
  opts: Array<{ lig: string; lat: string; pos: number[] }>,
  choices: number[]
): string {
  const repls: Array<{ start: number; end: number; repl: string }> = [];

  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    if (choice === -1) continue;

    const opt = opts[i];
    const pos = opt.pos[choice];

    repls.push({
      start: pos,
      end: pos + opt.lat.length,
      repl: opt.lig,
    });
  }

  repls.sort((a, b) => b.start - a.start);

  let result = word;
  for (const r of repls) {
    result = result.slice(0, r.start) + r.repl + result.slice(r.end);
  }

  return result;
}

function yieldExecution(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function countUnicodeChars(str: string): number {
  let count = 0;
  let i = 0;

  while (i < str.length) {
    const code = str.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        i += 2;
      } else {
        i++;
      }
    } else {
      i++;
    }

    count++;
  }

  return count;
}

export function countPreLigatureLength(
  str: string,
  ligatures: Array<[string, string]>
): number {
  let origLen = 0;
  let i = 0;

  while (i < str.length) {
    const code = str.charCodeAt(i);
    let foundLig = false;

    // Check if current position starts a ligature
    for (const [lig, word] of ligatures) {
      if (str.charCodeAt(i) === lig.charCodeAt(0) && str.startsWith(lig, i)) {
        origLen += word.length;
        i += lig.length;
        foundLig = true;
        break;
      }
    }

    // If no ligature found, handle as normal codepoint
    if (!foundLig) {
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          i += 2;
        } else {
          i++;
        }
      } else {
        i++;
      }
      origLen++;
    }
  }

  return origLen;
}

/**
 * Process a list of words and generate all possible ligature combinations.
 *
 * @param wordList - The list of words to process.
 * @param progressCallback - A callback function to report progress (in range 0-100)
 * @returns A promise that resolves to an array of all possible ligature combinations.
 */
export async function processWordList(
  wordList: string[],
  ligatures: Array<[string, string]>,
  allCases: boolean = true,
  signal?: AbortSignal,
  progressCallback?: (progress: number) => void
) {
  const results: string[] = [];

  const totalWords = wordList.length;
  let processedWords = 0;
  const chunkSize = 10000;

  for (let i = 0; i < totalWords; i++) {
    // Check for cancellation
    if (signal?.aborted) {
      throw new Error("Processing cancelled");
    }

    const word = wordList[i];

    let combinations: string[] = [];

    if (allCases) {
      combinations = Array.from(
        generateLigatureCombinationsAllCases(word, ligatures)
      );
      combinations.sort();
    } else {
      combinations = generateLigatureCombinations(word, ligatures);
    }

    combinations = combinations.filter(
      (combination) => countUnicodeChars(combination) <= MAX_CHARS_IN_TAG
    );
    results.push(...combinations);
    processedWords++;

    if (i % chunkSize === 0) {
      await yieldExecution();
      
      // Check for cancellation after yielding
      if (signal?.aborted) {
        throw new Error("Processing cancelled");
      }

      const progress = Math.round((i / totalWords) * 100);
      progressCallback?.(progress);
    }
  }

  // Final check for cancellation
  if (signal?.aborted) {
    throw new Error("Processing cancelled");
  }

  progressCallback?.(100);
  return results;
}
