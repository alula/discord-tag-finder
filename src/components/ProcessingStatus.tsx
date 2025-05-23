import { Progress } from "@/components/ui/progress";

interface ProcessingStatusProps {
  progress: number;
}

export function ProcessingStatus({ progress }: ProcessingStatusProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground text-center">
        Processing word list... {progress}%
      </div>
      <Progress value={progress} className="w-full" />
    </div>
  );
}
