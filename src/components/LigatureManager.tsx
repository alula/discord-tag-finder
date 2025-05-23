import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area-virtual";
import { ligatures } from "@/ligatures";
import { useEffect, useState } from "react";

interface LigatureManagerProps {
  onLigaturesChange: (enabledLigatures: Array<[string, string]>) => void;
}

export function LigatureManager({ onLigaturesChange }: LigatureManagerProps) {
  const [enabledLigatures, setEnabledLigatures] = useState<Set<string>>(
    new Set(ligatures.map(([lig]) => lig))
  );

  useEffect(() => {
    const filtered = ligatures.filter(([lig]) => enabledLigatures.has(lig));
    onLigaturesChange(filtered);
  }, [enabledLigatures, onLigaturesChange]);

  const toggleLigature = (lig: string) => {
    setEnabledLigatures((prev) => {
      const next = new Set(prev);
      if (next.has(lig)) {
        next.delete(lig);
      } else {
        next.add(lig);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setEnabledLigatures(new Set(checked ? ligatures.map(([lig]) => lig) : []));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="toggle-all"
          checked={enabledLigatures.size === ligatures.length}
          onCheckedChange={(checked) => toggleAll(checked as boolean)}
        />
        <label
          htmlFor="toggle-all"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Enable All Ligatures
        </label>
      </div>
      <ScrollArea className="h-[300px] rounded-md border p-4">
        <div className="space-y-4">
          {ligatures.map(([lig, lat]) => (
            <div key={lig} className="flex items-center space-x-2">
              <Checkbox
                id={lig}
                checked={enabledLigatures.has(lig)}
                onCheckedChange={() => toggleLigature(lig)}
              />
              <label
                htmlFor={lig}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {lig} ({lat})
              </label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
