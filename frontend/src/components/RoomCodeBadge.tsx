import { useEffect, useRef, useState } from "react";

interface RoomCodeBadgeProps {
  code: string;
}

export function RoomCodeBadge({ code }: RoomCodeBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);

  useEffect(() => {
    setCopied(false);
    setCopyError(false);
    return () => {
      attempt.current += 1;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [code]);

  async function handleCopy() {
    const currentAttempt = ++attempt.current;
    if (timer.current !== null) clearTimeout(timer.current);
    setCopied(false);
    setCopyError(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
      if (attempt.current !== currentAttempt) return;
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      if (attempt.current === currentAttempt) setCopyError(true);
    }
  }

  return (
    <div className="room-code-badge">
      <span className="room-code-badge__label">Room Code</span>
      <div className="room-code-badge__row">
        <span className="room-code-badge__code">{code}</span>
        <button type="button" className="button button--secondary" onClick={handleCopy}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <span className="room-code-badge__hint">Share this code with friends to join</span>
      {copyError && <span className="room-code-badge__error" role="alert">Unable to copy code. Please copy it manually.</span>}
    </div>
  );
}
