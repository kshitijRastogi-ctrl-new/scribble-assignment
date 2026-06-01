import { useEffect, useRef, useState } from "react";

interface DrawingCanvasProps {
  role: string;
  canvasData: string;
  onStrokeEnd: (dataUrl: string) => void;
}

export function DrawingCanvas({ role, canvasData, onStrokeEnd }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  function getXY(e: React.MouseEvent<HTMLCanvasElement>) {
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvasData === "") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = canvasData;
  }, [canvasData]);

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (role !== "drawer") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getXY(e);
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (role !== "drawer" || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getXY(e);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000000";
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handleStrokeEnd() {
    if (role !== "drawer" || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(false);
    onStrokeEnd(canvas.toDataURL("image/png"));
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onStrokeEnd(canvas.toDataURL("image/png"));
  }

  return (
    <div className="drawing-canvas-wrapper" style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        style={{
          border: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          cursor: role === "drawer" ? "crosshair" : "default"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleStrokeEnd}
        onMouseLeave={handleStrokeEnd}
      />
      {role === "drawer" && (
        <div className="button-row button-row--compact">
          <button className="button button--secondary" onClick={handleClear}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
