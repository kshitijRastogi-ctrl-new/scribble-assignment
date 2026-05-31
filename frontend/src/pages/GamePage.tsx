import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const playerName = localStorage.getItem("playerName");
  const roomStore = useRoomStore();
  const { room } = useRoomState();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerName) navigate("/", { replace: true });
  }, [playerName, navigate]);

  useEffect(() => {
    if (!code || !playerName) return;
    roomStore.fetchRoomByCode(code, playerName)
      .catch(err =>
        setRefreshError(err instanceof Error ? err.message : "Unable to load game"));
  }, [code, playerName, roomStore]);

  useEffect(() => {
    if (!code || !playerName) return;
    const id = setInterval(async () => {
      try {
        const updated = await roomStore.fetchRoomByCode(code, playerName);
        if (updated?.status === "result") navigate("/result");
      } catch (err) {
        setRefreshError(err instanceof Error ? err.message : "Unable to refresh game");
      }
    }, 2000);
    return () => clearInterval(id);
  }, [code, playerName, roomStore, navigate]);

  const myRole = room?.participants.find(p => p.name === playerName)?.role ?? "";
  const drawerName = room?.participants.find(p => p.role === "drawer")?.name ?? "";

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={code ?? ""} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard />
          <ResultPanel />
        </aside>

        <div className="game-page__main">
          <Card title="Canvas">
            <div className="canvas-placeholder" style={{ minHeight: '500px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
              Waiting for drawer...
            </div>
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Player Info">
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{playerName ?? "Unknown player"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{myRole === "drawer" ? "You are drawing!" : myRole === "guesser" ? "You are guessing!" : "Waiting..."}</dd>
              </div>
              {myRole === "guesser" && (
                <div>
                  <dt>Drawer</dt>
                  <dd>{drawerName} is drawing</dd>
                </div>
              )}
            </dl>
          </Card>

          {myRole === "drawer" && (
            <Card title="Secret Word">
              <p className="section-kicker">{room?.secretWord ?? "…"}</p>
            </Card>
          )}

          {myRole === "guesser" && (
            <Card title="Your Guess">
              <GuessForm />
            </Card>
          )}
        </aside>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
        {refreshError && <p className="form__error">{refreshError}</p>}
      </div>
    </section>
  );
}
