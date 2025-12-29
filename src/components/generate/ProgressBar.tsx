interface ProgressBarProps {
  progress: number;
}

/**
 * ProgressBar - visual progress indicator
 * Displays progress percentage with ARIA attributes
 */
export function ProgressBar({ progress }: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="w-full">
      <div
        className="h-2 w-full bg-secondary rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Generation progress"
      >
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}


