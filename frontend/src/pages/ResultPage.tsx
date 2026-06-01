import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function ResultPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room } = useRoomState();
  const roomCode = localStorage.getItem("roomCode");
  const playerName = localStorage.getItem("playerName");
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      navigate("/", { replace: true });
      return;
    }
    roomStore.fetchRoomByCode(roomCode, playerName ?? "")
      .catch(err => setRefreshError(err instanceof Error ? err.message : "Unable to load result"));
  }, [roomCode, playerName, roomStore, navigate]);

  useEffect(() => {
    if (!roomCode) return;
    const id = setInterval(async () => {
      try {
        const updated = await roomStore.fetchRoomByCode(roomCode, playerName ?? "");
        if (updated?.status === "lobby") navigate("/lobby");
      } catch (err) {
        setRefreshError(err instanceof Error ? err.message : "Unable to refresh");
      }
    }, 2000);
    return () => clearInterval(id);
  }, [roomCode, playerName, roomStore, navigate]);

  async function handleRestart() {
    setRestartError(null);
    setRestarting(true);
    try {
      await roomStore.restartRoom(playerName ?? "");
      navigate("/lobby");
    } catch (err) {
      setRestartError(err instanceof Error ? err.message : "Restart failed");
    } finally {
      setRestarting(false);
    }
  }

  if (!room) return null;

  const sortedParticipants = [...room.participants].sort((a, b) => b.score - a.score);

  return (
    <section className="panel result-page">
      <div className="result-page__header">
        <h1 className="result-page__title">Round Over!</h1>
      </div>

      <div className="result-page__layout">
        <div className="result-page__secret-word">
          <h2>Secret Word</h2>
          <p className="section-kicker">{room.secretWord}</p>
        </div>

        <div className="result-page__scores">
          <h2>Final Scores</h2>
          <ul className="player-list">
            {sortedParticipants.map(p => (
              <li key={p.id}>
                <span>{p.name}</span>
                <strong>{p.score}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="result-page__history">
          <h2>Guess History</h2>
          {room.guesses.length === 0 ? (
            <p>No guesses submitted.</p>
          ) : (
            <ul className="player-list">
              {room.guesses.map((g, i) => (
                <li key={i}>
                  <span>{g.playerName}</span>
                  <span>{g.text}</span>
                  <span>{g.isCorrect ? "✓" : "✗"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="button-row">
        {playerName === room.host ? (
          <button
            className="button button--primary"
            onClick={handleRestart}
            disabled={restarting}
          >
            {restarting ? "Restarting..." : "Play Again"}
          </button>
        ) : (
          <p>Waiting for host to restart…</p>
        )}
      </div>

      {refreshError && <p className="form__error">{refreshError}</p>}
      {restartError && <p className="form__error">{restartError}</p>}
    </section>
  );
}
