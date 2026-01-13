import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NoteTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Auto-expanding textarea for note body
 * Min 10, max 1500 characters
 */
export function NoteTextArea({ value, onChange, error, disabled = false }: NoteTextAreaProps) {
  const charCount = value.length;
  const minChars = 10;
  const maxChars = 1500;
  const isOverLimit = charCount > maxChars;
  const isUnderLimit = charCount > 0 && charCount < minChars;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="note-text">
          Note <span className="text-destructive">*</span>
        </Label>
        <span
          className={`text-sm ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}
          aria-live="polite"
        >
          {charCount}/{maxChars}
        </span>
      </div>
      <Textarea
        id="note-text"
        placeholder="Describe your trip idea, route, or riding plan..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error || isOverLimit || isUnderLimit}
        aria-describedby={error ? "note-text-error" : isUnderLimit ? "note-text-hint" : undefined}
        className="min-h-[200px] resize-none"
        rows={8}
      />
      {error && (
        <p id="note-text-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {isUnderLimit && !error && (
        <p id="note-text-hint" className="text-sm text-muted-foreground">
          Minimum {minChars} characters required
        </p>
      )}
    </div>
  );
}



