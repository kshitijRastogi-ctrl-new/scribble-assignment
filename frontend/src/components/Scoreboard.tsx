import { Card } from "./Card";
import type { Participant } from "../services/api";

interface ScoreboardProps {
  participants?: Participant[];
}

export function Scoreboard({ participants }: ScoreboardProps) {
  return (
    <Card title="Scoreboard">
      <div className="placeholder-block" style={{ backgroundColor: '#f9fafb' }}>
        {participants?.length ? (
          participants.map((p) => (
            <div className="placeholder-row" key={p.id}>
              <span>{p.name}</span>
              <strong>{p.score}</strong>
            </div>
          ))
        ) : (
          <div className="placeholder-row">
            <span>Waiting for players...</span>
            <strong>0</strong>
          </div>
        )}
      </div>
    </Card>
  );
}
