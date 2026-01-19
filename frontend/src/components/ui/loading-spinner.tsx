import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-gray-300 border-t-pink-500",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
}

// Full page loading spinner
export function PageLoadingSpinner({ text = "読み込み中..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Content area loading spinner (for use within MainLayout)
export function ContentLoadingSpinner({ text = "読み込み中..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Chart loading spinner
export function ChartLoadingSpinner() {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <LoadingSpinner size="md" text="グラフを読み込み中..." />
    </div>
  );
}
