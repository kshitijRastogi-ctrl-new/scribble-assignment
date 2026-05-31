import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, error, isLoading } = useRoomState();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const playerName = localStorage.getItem("playerName") ?? "";
  const isHost = playerName === room?.host;

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    if (!room?.code) return;
    const id = setInterval(async () => {
      const updated = await roomStore.fetchRoom();
      if (updated?.status === "playing") {
        navigate(`/game/${updated.code}`);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [room?.code, roomStore, navigate]);

  async function handleRefresh() {
    try {
      setRefreshError(null);
      await roomStore.fetchRoom();
    } catch (caughtError) {
      setRefreshError(caughtError instanceof Error ? caughtError.message : "Unable to refresh room");
    }
  }

  async function handleStart() {
    try {
      await roomStore.startGame(playerName);
    } catch (err) {
      setRefreshError(
        err instanceof Error ? err.message : "Unable to start game"
      );
    }
  }

  if (!room) {
    return null;
  }

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Waiting for players"
          title="Lobby"
          description="Share the room code with friends so they can join your game."
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Card title="Participants">
          {room.participants.length === 0 ? (
            <p>No participants are connected to this room yet.</p>
          ) : (
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.name}</span>
                  {participant.isHost ? <span> (Host)</span> : null}
                  <span className="player-list__meta">joined</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          <p className="status-line" style={{ backgroundColor: isLoading ? '#fef3c7' : '#e0e7ff', color: isLoading ? '#b45309' : '#3730a3' }}>
            {isLoading ? "Refreshing players..." : "Ready to play"}
          </p>
          <p style={{ marginTop: '8px' }}>{error ?? refreshError ?? "Waiting for the host to start the game."}</p>
        </Card>
      </div>

      <div className="button-row button-row--spread">
        <button className="button button--secondary" disabled={isLoading} onClick={handleRefresh}>
          {isLoading ? "Refreshing..." : "Refresh Room"}
        </button>
        {isHost ? (
          <>
            <button
              className="button button--primary"
              disabled={room.participants.length < 2}
              onClick={handleStart}
            >
              Start Game
            </button>
            {room.participants.length < 2 && (
              <p>Need at least 2 players to start</p>
            )}
          </>
        ) : (
          <p>Waiting for host to start…</p>
        )}
      </div>
    </section>
  );
}
