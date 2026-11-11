import { useEffect, useState } from "react";

interface RoomCodeBadgeProps {
  code: string;
}

export function RoomCodeBadge({ code }: RoomCodeBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [copyCount, setCopyCount] = useState(0);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied, copyCount]);

  async function handleCopy() {
    setCopied(false);
    setCopyError(false);
    setCopying(true);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyCount((count) => count + 1);
    } catch {
      setCopyError(true);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="room-code-badge">
      <span className="room-code-badge__label">Room Code</span>
      <div className="room-code-badge__row">
        <span className="room-code-badge__code">{code}</span>
        <button className="button button--secondary room-code-badge__copy" type="button" onClick={handleCopy} disabled={copying}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <span className="room-code-badge__hint">Share this code with friends to join</span>
      {copyError && <span className="room-code-badge__hint" role="alert">Unable to copy. Please copy the code manually.</span>}
    </div>
  );
}
