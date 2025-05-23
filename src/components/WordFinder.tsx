import { LigatureManager } from "@/components/LigatureManager";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { ResultsTable } from "@/components/ResultsTable";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WordListUpload } from "@/components/WordListUpload";
import {
  countPreLigatureLength,
  countUnicodeChars,
  generateLigatureCombinations,
  generateLigatureCombinationsAllCases,
  MAX_CHARS_IN_TAG,
  processWordList,
} from "@/generator";
import { debounce } from "@/lib/debounce";
import { ligatures } from "@/ligatures";
import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "single" | "list";
type SortType = "alphabetical" | "length";

export function WordFinder() {
  const [mode, setMode] = useState<Mode>("single");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enabledLigatures, setEnabledLigatures] =
    useState<Array<[string, string]>>(ligatures);
  const [results, setResults] = useState<string[]>([]);
  const [customWordList, setCustomWordList] = useState<string[]>([]);
  const [checkAllCases, setCheckAllCases] = useState(true);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [sortType, setSortType] = useState<SortType>("alphabetical");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sort function that handles both alphabetical and length-based sorting
  const sortResults = useMemo(() => {
    return (words: string[]) => {
      const sorted = [...words];
      if (sortType === "alphabetical") {
        sorted.sort();
      } else {
        // Sort by pre-ligature length
        sorted.sort((a, b) => {
          const lengthA = countPreLigatureLength(a, ligatures);
          const lengthB = countPreLigatureLength(b, ligatures);
          return lengthB - lengthA;
        });
      }
      return sorted;
    };
  }, [sortType]);

  // Load words from file in list mode
  useEffect(() => {
    if (mode === "list" && !customWordList.length) {
      setIsLoading(true);
      fetch("/words.txt")
        .then((response) => response.text())
        .then((text) => {
          const wordList = text
            .split("\n")
            .filter((word) => word.trim().length > 0);
          setCustomWordList(wordList);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error loading words:", error);
          setIsLoading(false);
        });
    }
  }, [mode, customWordList.length]);

  // Process words when ligatures change
  useEffect(() => {
    if (mode === "list" && customWordList.length > 0) {
      // Cancel any existing processing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this processing task
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsLoading(true);
      setProgress(0);
      processWordList(
        customWordList,
        enabledLigatures,
        checkAllCases,
        signal,
        (progress) => {
          setProgress(progress);
        }
      )
        .then((processedWords) => {
          const sortedWords = sortResults(processedWords);
          setResults(sortedWords);
          setSearchResults(sortedWords);
        })
        .catch((error) => {
          // Only update state if the error wasn't from cancellation
          if (error.message !== "Processing cancelled") {
            console.error("Error processing words:", error);
          }
        })
        .finally(() => {
          setIsLoading(false);
          // Clear the AbortController reference if it's the current one
          if (abortControllerRef.current?.signal === signal) {
            abortControllerRef.current = null;
          }
        });
    }

    // Cleanup function to cancel any ongoing processing when component unmounts
    // or when dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [mode, enabledLigatures, customWordList, checkAllCases, sortResults]);

  // Handle single word mode search
  useEffect(() => {
    if (mode === "single" && search) {
      let combinations = checkAllCases
        ? Array.from(
            generateLigatureCombinationsAllCases(search, enabledLigatures)
          )
        : generateLigatureCombinations(search, enabledLigatures);

      combinations = combinations.filter(
        (combination) => countUnicodeChars(combination) <= MAX_CHARS_IN_TAG
      );
      setResults(sortResults(combinations));
    } else if (mode === "single") {
      setResults([]);
    }
  }, [mode, search, enabledLigatures, checkAllCases, sortResults]);

  // Debounced search function for list mode
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string, wordList: string[]) => {
        if (!query.trim()) {
          setSearchResults(sortResults(wordList));
          return;
        }

        const queryCombinations = checkAllCases
          ? generateLigatureCombinationsAllCases(query, enabledLigatures)
          : new Set(generateLigatureCombinations(query, enabledLigatures));

        const matches = wordList.filter((word) =>
          Array.from(queryCombinations).some((combination) =>
            word.includes(combination)
          )
        );

        setSearchResults(sortResults(matches));
      }, 500),
    [enabledLigatures, checkAllCases, sortResults]
  );

  // Update search results when search changes in list mode
  useEffect(() => {
    if (mode === "list" && !isLoading) {
      debouncedSearch(search, results);
    }
  }, [mode, search, results, isLoading, debouncedSearch]);

  const handleWordListLoad = (words: string[]) => {
    setCustomWordList(words);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Discord Guild Tag Finder
        </h1>
        <p className="text-lg text-muted-foreground">
          See if it's possible to fit a word in 4 unicode characters
        </p>
        <p className="text-sm text-muted-foreground">
          Search for interesting words to put in your Guild Tag
        </p>
        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          <a
            href="https://guildtags.alula.me"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Website
          </a>
          <a
            href="https://alula.me"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            alula.me
          </a>
          <a
            href="https://github.com/alula/discord-tag-finder"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="single">Single Word Mode</TabsTrigger>
            <TabsTrigger value="list">Word List Mode</TabsTrigger>
          </TabsList>
          {mode === "list" && (
            <WordListUpload onWordListLoad={handleWordListLoad} />
          )}
        </div>

        <div className="grid grid-cols-[300px_1fr] gap-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-4">Ligature Settings</h2>
              <LigatureManager onLigaturesChange={setEnabledLigatures} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="check-all-cases"
                  checked={checkAllCases}
                  onCheckedChange={(checked) =>
                    setCheckAllCases(checked as boolean)
                  }
                />
                <label
                  htmlFor="check-all-cases"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Check all cases
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <Select
                  value={sortType}
                  onValueChange={(value: SortType) => setSortType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    <SelectItem value="length">Length</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {mode === "single" ? (
              <Input
                placeholder="Enter a word..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            ) : isLoading ? (
              <ProcessingStatus progress={progress} />
            ) : (
              <Input
                placeholder="Search results..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}

            <ResultsTable results={mode === "list" ? searchResults : results} />
          </div>
        </div>
      </Tabs>
    </div>
  );
}
