import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Controlled input for note title with validation
 * Max 120 characters
 */
export function TitleInput({ value, onChange, error, disabled = false }: TitleInputProps) {
  const charCount = value.length;
  const maxChars = 120;
  const isOverLimit = charCount > maxChars;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="note-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <span
          className={`text-sm ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}
          aria-live="polite"
        >
          {charCount}/{maxChars}
        </span>
      </div>
      <Input
        id="note-title"
        type="text"
        placeholder="Enter note title"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error || isOverLimit}
        aria-describedby={error ? "title-error" : undefined}
        maxLength={150} // Allow some overflow for better UX, but show warning
      />
      {error && (
        <p id="title-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}


