import { Card } from "./Card";
import type { Guess } from "../services/api";

interface ResultPanelProps {
  guesses?: Guess[];
}

export function ResultPanel({ guesses }: ResultPanelProps) {
  return (
    <Card title="Activity">
      <div className="placeholder-block" style={{ backgroundColor: '#f9fafb' }}>
        {guesses?.length ? (
          guesses.map((g, i) => (
            <div className="placeholder-row" key={i}>
              <span>{g.playerName}: {g.text}</span>
              <strong>{g.isCorrect ? "✓" : "✗"}</strong>
            </div>
          ))
        ) : (
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Game activity and guesses will appear here.</p>
        )}
      </div>
    </Card>
  );
}
