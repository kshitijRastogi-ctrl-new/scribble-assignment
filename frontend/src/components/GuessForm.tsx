import { useState } from "react";

interface GuessFormProps {
  disabled?: boolean;
  onSubmit?: (guess: string) => Promise<void>;
}

export function GuessForm({ disabled = false, onSubmit }: GuessFormProps) {
  const [guessText, setGuessText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = guessText.trim();
    if (trimmed === "") {
      setError("Guess cannot be empty");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit?.(trimmed);
      setGuessText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__field">
        <input
          className="form__input"
          value={guessText}
          onChange={(event) => setGuessText(event.target.value)}
          placeholder="Type your guess here..."
          disabled={submitting || disabled}
        />
      </label>
      {error && <p className="form__error">{error}</p>}
      <div className="button-row button-row--compact">
        <button className="button button--primary" type="submit" disabled={submitting || disabled}>
          Submit Guess
        </button>
      </div>
    </form>
  );
}
