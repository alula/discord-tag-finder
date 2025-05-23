import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useCallback } from "react";

interface WordListUploadProps {
  onWordListLoad: (words: string[]) => void;
}

export function WordListUpload({ onWordListLoad }: WordListUploadProps) {
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const words = text.split("\n").filter((word) => word.trim().length > 0);
        onWordListLoad(words);
      };
      reader.readAsText(file);
    },
    [onWordListLoad]
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="relative"
        onClick={() => document.getElementById("word-list-upload")?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload Word List
      </Button>
      <input
        id="word-list-upload"
        type="file"
        accept=".txt"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
