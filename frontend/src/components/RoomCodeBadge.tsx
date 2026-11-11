import { useEffect, useRef, useState } from "react";

interface RoomCodeBadgeProps {
  code: string;
}

export function RoomCodeBadge({ code }: RoomCodeBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const request = useRef(0);

  useEffect(() => {
    setCopied(false);
    setCopyError(false);
    return () => {
      request.current += 1;
      clearTimeout(timer.current);
    };
  }, [code]);

  async function handleCopy() {
    const currentRequest = ++request.current;
    clearTimeout(timer.current);
    setCopied(false);
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(code);
      if (currentRequest !== request.current) return;
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      if (currentRequest === request.current) setCopyError(true);
    }
  }

  return (
    <div className="room-code-badge">
      <span className="room-code-badge__label">Room Code</span>
      <div className="room-code-badge__row">
        <span className="room-code-badge__code">{code}</span>
        <button className="button button--secondary room-code-badge__copy" type="button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <span className="room-code-badge__hint">Share this code with friends to join</span>
      {copyError && <span className="room-code-badge__hint" role="alert">Could not copy. Please copy the code manually.</span>}
    </div>
  );
}
