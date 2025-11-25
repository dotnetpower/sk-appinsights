import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Application, Graphics } from "pixi.js";
import type { ScatterDataPoint } from "./LiveTrafficChart";

interface AxisTick {
  label: string;
  position: number; // absolute pixel position inside the container
}

interface HoverState {
  point: ScatterDataPoint;
  pointerX: number;
  pointerY: number;
}

interface ResponseTimeWebGLCanvasProps {
  data: ScatterDataPoint[];
  height?: number;
  rangeMs?: number;
}

const getPadding = (containerWidth: number) => {
  if (containerWidth < 400) {
    return { top: 12, right: 8, bottom: 28, left: 48 };
  }
  return { top: 16, right: 16, bottom: 32, left: 68 };
};

const colorFromStatusCode = (statusCode: number): number => {
  if (statusCode >= 500) return 0xff3535; // red
  if (statusCode >= 400) return 0xff9800; // orange
  if (statusCode >= 200 && statusCode < 300) return 0x4caf50; // green
  return 0x7c4dff; // purple fallback
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const formatTimestamp = (timestamp: number, compact = false) =>
  new Date(timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: compact ? undefined : "2-digit",
  });

const ResponseTimeWebGLCanvas: React.FC<ResponseTimeWebGLCanvasProps> = ({
  data,
  height = 260,
  rangeMs = 120000,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const dotsLayerRef = useRef<Graphics | null>(null);
  const axesLayerRef = useRef<Graphics | null>(null);
  const gridLayerRef = useRef<Graphics | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const projectedPointsRef = useRef<
    Array<{ x: number; y: number; point: ScatterDataPoint }>
  >([]);
  const dataRef = useRef<ScatterDataPoint[]>([]);
  const [axisTicks, setAxisTicks] = useState<{ x: AxisTick[]; y: AxisTick[] }>({
    x: [],
    y: [],
  });
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("sm"));

  const updateScene = useCallback(
    (points: ScatterDataPoint[]) => {
      if (
        !containerRef.current ||
        !dotsLayerRef.current ||
        !axesLayerRef.current ||
        !gridLayerRef.current
      ) {
        return;
      }

      const container = containerRef.current;
      const width = container.clientWidth;
      const isMobileView = width < 400;
      const padding = getPadding(width);
      const plotWidth = Math.max(1, width - padding.left - padding.right);
      const plotHeight = Math.max(1, height - padding.top - padding.bottom);
      const now = Date.now();
      const domainMax = Math.max(now, ...points.map((pt) => pt.time), now);
      const domainMin = domainMax - rangeMs;
      const domainRange = Math.max(1, domainMax - domainMin);
      const passivePoints = points.filter((pt) => pt.time >= domainMin);
      const maxDuration = Math.max(
        100,
        Math.max(...passivePoints.map((pt) => pt.duration), 0) * 1.1
      );

      const gridLayer = gridLayerRef.current;
      gridLayer.clear();
      const horizontalSteps = isMobileView ? 3 : 4;
      for (let i = 1; i <= horizontalSteps; i += 1) {
        const ratio = i / horizontalSteps;
        const y = padding.top + plotHeight * (1 - ratio);
        gridLayer.moveTo(padding.left, y);
        gridLayer.lineTo(width - padding.right, y);
      }
      gridLayer.stroke({ width: 1, color: 0x1f2533, alpha: 0.55 });

      const axesLayer = axesLayerRef.current;
      axesLayer.clear();
      axesLayer.moveTo(padding.left, height - padding.bottom);
      axesLayer.lineTo(width - padding.right, height - padding.bottom);
      axesLayer.moveTo(padding.left, padding.top);
      axesLayer.lineTo(padding.left, height - padding.bottom);
      axesLayer.stroke({ width: 1, color: 0x2f3b52, alpha: 0.95 });

      const dotsLayer = dotsLayerRef.current;
      dotsLayer.clear();

      const projected: Array<{
        x: number;
        y: number;
        point: ScatterDataPoint;
      }> = [];
      passivePoints.forEach((point) => {
        const ratioX = clamp((point.time - domainMin) / domainRange, 0, 1);
        const ratioY = clamp(point.duration / maxDuration, 0, 1);
        const x = padding.left + plotWidth * ratioX;
        const y = padding.top + plotHeight * (1 - ratioY);
        const color = colorFromStatusCode(point.statusCode);
        const size = clamp(4 + (point.duration / maxDuration) * 12, 4, 12);

        dotsLayer.circle(x, y, size / 2).fill({ color, alpha: 0.9 });

        projected.push({ x, y, point });
      });

      projectedPointsRef.current = projected;

      const tickCount = isMobileView ? 3 : 4;
      const nextXTicks: AxisTick[] = Array.from({ length: tickCount }, (_, index) => {
        const ratio = index / (tickCount - 1);
        const ts = domainMin + ratio * domainRange;
        return {
          label: formatTimestamp(ts, isMobileView),
          position: padding.left + plotWidth * ratio,
        };
      });

      const yTickCount = isMobileView ? 4 : 5;
      const nextYTicks: AxisTick[] = Array.from({ length: yTickCount }, (_, index) => {
        const ratio = index / (yTickCount - 1);
        const durationValue = Math.round(maxDuration * (1 - ratio));
        return {
          label: `${durationValue}ms`,
          position: padding.top + plotHeight * ratio,
        };
      });

      setAxisTicks({ x: nextXTicks, y: nextYTicks });
    },
    [height, rangeMs]
  );

  useEffect(() => {
    let disposed = false;
    const app = new Application();

    const init = async () => {
      if (!containerRef.current) {
        return;
      }
      const targetWidth = containerRef.current.clientWidth || 640;
      await app.init({
        width: targetWidth,
        height,
        antialias: true,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
      });

      if (!containerRef.current || disposed) {
        app.destroy(true);
        return;
      }

      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(app.canvas);
      canvasRef.current = app.canvas;
      appRef.current = app;

      // Enable pointer events on canvas
      app.canvas.style.cursor = "crosshair";
      app.canvas.style.touchAction = "none";
      console.log("🎨 Canvas initialized:", app.canvas);

      // Setup event listeners immediately after canvas is created
      const handlePointerMove = (event: PointerEvent) => {
        if (!containerRef.current) return;
        const bounds = containerRef.current.getBoundingClientRect();
        const pointerX = event.clientX - bounds.left;
        const pointerY = event.clientY - bounds.top;

        console.log(
          "🖱️ Pointer at:",
          pointerX,
          pointerY,
          "Points:",
          projectedPointsRef.current.length
        );

        let closest: {
          point: ScatterDataPoint;
          pointerX: number;
          pointerY: number;
        } | null = null;
        let minDistance = 50;

        projectedPointsRef.current.forEach((projected) => {
          const dx = projected.x - pointerX;
          const dy = projected.y - pointerY;
          const distance = Math.hypot(dx, dy);
          if (distance < minDistance) {
            minDistance = distance;
            closest = {
              point: projected.point,
              pointerX: projected.x,
              pointerY: projected.y,
            };
          }
        });

        if (closest !== null) {
          console.log("✅ Found point at distance:", minDistance);
          const { point, pointerX: hoverX, pointerY: hoverY } = closest;
          setHoverState({ point, pointerX: hoverX, pointerY: hoverY });
        } else {
          setHoverState(null);
        }
      };

      const handlePointerLeave = () => setHoverState(null);

      app.canvas.addEventListener("pointermove", handlePointerMove);
      app.canvas.addEventListener("mousemove", handlePointerMove as any);
      app.canvas.addEventListener("pointerleave", handlePointerLeave);
      app.canvas.addEventListener("mouseleave", handlePointerLeave);

      console.log("✅ Event listeners attached to canvas");

      const gridLayer = new Graphics();
      const axesLayer = new Graphics();
      const dotsLayer = new Graphics();
      app.stage.addChild(gridLayer);
      app.stage.addChild(axesLayer);
      app.stage.addChild(dotsLayer);
      gridLayerRef.current = gridLayer;
      axesLayerRef.current = axesLayer;
      dotsLayerRef.current = dotsLayer;

      const observer = new ResizeObserver(() => {
        if (!containerRef.current) {
          return;
        }
        const newWidth = containerRef.current.clientWidth;
        app.renderer.resize(newWidth, height);
        updateScene(dataRef.current);
      });
      observer.observe(containerRef.current);
      resizeObserverRef.current = observer;

      updateScene(dataRef.current);
    };

    init();

    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      gridLayerRef.current?.destroy();
      gridLayerRef.current = null;
      axesLayerRef.current?.destroy();
      axesLayerRef.current = null;
      dotsLayerRef.current?.destroy();
      dotsLayerRef.current = null;
      appRef.current?.destroy(true);
      appRef.current = null;
      canvasRef.current = null;
    };
  }, [height, updateScene]);

  useEffect(() => {
    dataRef.current = data;
    updateScene(data);
  }, [data, updateScene]);

  return (
    <Box sx={{ position: "relative", width: "100%", height }}>
      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: 1,
          overflow: "visible",
          background: "linear-gradient(180deg, #0f1728 0%, #0b101b 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />

      {axisTicks.x.map((tick) => (
        <Typography
          key={`x-${tick.label}-${tick.position}`}
          variant="caption"
          sx={{
            position: "absolute",
            bottom: 2,
            left: tick.position,
            transform: "translateX(-50%)",
            color: "#90a4c3",
            pointerEvents: "none",
            fontSize: isMobileView ? "0.6rem" : "0.75rem",
            whiteSpace: "nowrap",
          }}
        >
          {tick.label}
        </Typography>
      ))}

      {axisTicks.y.map((tick) => (
        <Typography
          key={`y-${tick.label}-${tick.position}`}
          variant="caption"
          sx={{
            position: "absolute",
            left: 4,
            top: tick.position - 6,
            color: "#90a4c3",
            pointerEvents: "none",
            fontSize: isMobileView ? "0.55rem" : "0.75rem",
          }}
        >
          {tick.label}
        </Typography>
      ))}

      {hoverState && (
        <Box
          sx={{
            position: "absolute",
            left: isMobileView ? "50%" : hoverState.pointerX,
            top: Math.max(10, hoverState.pointerY - 20),
            transform: "translate(-50%, -100%)",
            backgroundColor: "rgba(20, 30, 48, 0.98)",
            border: "1px solid rgba(100, 149, 237, 0.4)",
            borderRadius: isMobileView ? 1 : 2,
            p: isMobileView ? 1 : 1.5,
            minWidth: isMobileView ? 160 : 200,
            maxWidth: isMobileView ? "90%" : "none",
            pointerEvents: "none",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
            zIndex: 9999,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "#b0c4de",
              fontWeight: 600,
              display: "block",
              mb: 0.5,
              fontSize: isMobileView ? "0.65rem" : "0.75rem",
            }}
          >
            🕐 {hoverState.point.timeStr}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "#4fc3f7",
              display: "block",
              fontWeight: 600,
              mb: 0.5,
              fontSize: isMobileView ? "0.65rem" : "0.75rem",
            }}
          >
            ⚡ {Math.round(hoverState.point.duration)}ms
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "#81c784",
              display: "block",
              mb: 0.5,
              wordBreak: "break-all",
              fontSize: isMobileView ? "0.6rem" : "0.75rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: isMobileView ? "nowrap" : "normal",
              maxWidth: isMobileView ? "140px" : "none",
            }}
          >
            🔗 {hoverState.point.url}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: hoverState.point.statusCode >= 400 ? "#ff6b6b" : "#66bb6a",
              display: "block",
              fontWeight: 600,
              fontSize: isMobileView ? "0.65rem" : "0.75rem",
            }}
          >
            📊 {hoverState.point.statusCode}
          </Typography>
        </Box>
      )}

      {data.length === 0 && (
        <Typography
          variant="body2"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#90a4c3",
            fontSize: isMobileView ? "0.8rem" : "0.875rem",
            textAlign: "center",
            px: 2,
          }}
        >
          실시간 데이터를 수집하는 중입니다...
        </Typography>
      )}
    </Box>
  );
};

export default ResponseTimeWebGLCanvas;
