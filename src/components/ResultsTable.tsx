import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area-virtual";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Copy } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

interface ResultsTableProps {
  results: string[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 5,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!", {
      description: text,
      duration: 1500,
      action: {
        label: "Dismiss",
        onClick: () => toast.dismiss(),
      },
    });
  };

  return (
    <div className="border rounded-lg">
      <div className="border-b px-4 py-2 font-medium bg-muted/50">
        <div className="grid grid-cols-[1fr_100px] gap-4">
          <div>Word</div>
          <div>Actions</div>
        </div>
      </div>
      <ScrollArea ref={parentRef} className="h-[400px]">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const word = results[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                className={cn(
                  "grid grid-cols-[1fr_100px] gap-4 px-4 py-2",
                  "border-b last:border-b-0",
                  "hover:bg-muted/50",
                  "transition-colors"
                )}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="truncate">{word}</div>
                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(word)}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
