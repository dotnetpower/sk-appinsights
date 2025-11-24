/**
 * Request Flow Chart
 * 실시간 요청을 개별 애니메이션으로 표현 (Particle Attraction Animation)
 * - IN에서 Processing Pipeline으로 끌려가는 파티클 애니메이션
 * - 중앙 파이프에서 duration만큼 대기
 * - Pipeline에서 OUT으로 빠져나가는 파티클 애니메이션
 */
import React, { useEffect, useState, useRef } from "react";
import { Box, Typography, Paper } from "@mui/material";

// 요청 상태 타입
interface Request {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number; // ms
  timestamp: Date;
  x: number; // 실제 x 좌표 (픽셀)
  y: number; // 실제 y 좌표 (픽셀)
  vx: number; // x 속도
  vy: number; // y 속도
  phase: "incoming" | "processing" | "outgoing";
  startTime: number;
  targetX: number; // 목표 x 좌표
  targetY: number; // 목표 y 좌표
}

interface RequestEvent {
  method: string;
  path: string;
  status_code: number;
  duration: number;
  timestamp: string;
}

interface RequestFlowChartProps {
  latestRequest: RequestEvent | null;
}

const RequestFlowChart: React.FC<RequestFlowChartProps> = ({
  latestRequest,
}) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const requestCounterRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const MAX_PARTICLES = 30; // 최대 동시 표시 파티클 수
  const TARGET_FPS = 30; // 목표 프레임 레이트 (CPU 절약)
  const FRAME_INTERVAL = 1000 / TARGET_FPS; // 약 33ms

  // 컨테이너 크기
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 400,
  });

  // 컨테이너 크기 측정
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // props로 받은 새 요청 처리
  useEffect(() => {
    if (!latestRequest) return;

    const POSITIONS = {
      IN_X: 80,
      IN_Y: containerSize.height / 2,
      PIPE_X: containerSize.width * 0.5,
      PIPE_Y: containerSize.height / 2,
      OUT_X: containerSize.width - 80,
      OUT_Y: containerSize.height / 2,
    };

    console.log("🆕 [RequestFlowChart] New request from props:", latestRequest);

    // 최대 파티클 수 제한 체크
    setRequests((prev) => {
      if (prev.length >= MAX_PARTICLES) {
        console.log(
          "⚠️ [RequestFlowChart] Max particles reached, dropping oldest"
        );
        return prev.slice(1); // 가장 오래된 것 제거
      }
      return prev;
    });

    const newRequest: Request = {
      id: `req-${requestCounterRef.current++}`,
      method: latestRequest.method || "GET",
      path: latestRequest.path || "/api",
      statusCode: latestRequest.status_code || 200,
      duration: latestRequest.duration || 100,
      timestamp: new Date(latestRequest.timestamp || new Date()),
      x: POSITIONS.IN_X,
      y: POSITIONS.IN_Y + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
      phase: "incoming",
      startTime: Date.now(),
      targetX: POSITIONS.PIPE_X,
      targetY: POSITIONS.PIPE_Y,
    };

    console.log("✅ [RequestFlowChart] Created request:", newRequest);
    setRequests((prev) => [...prev, newRequest]);
  }, [latestRequest, containerSize.height, containerSize.width, MAX_PARTICLES]);

  // Particle Attraction 애니메이션 루프
  useEffect(() => {
    console.log("🎬 [RequestFlowChart] Animation loop started");

    const animate = (currentTime: number) => {
      // FPS 제한 (30fps = 약 33ms 간격)
      if (currentTime - lastFrameTimeRef.current < FRAME_INTERVAL) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = currentTime;

      const POSITIONS = {
        IN_X: 80,
        IN_Y: containerSize.height / 2,
        PIPE_X: containerSize.width * 0.5,
        PIPE_Y: containerSize.height / 2,
        OUT_X: containerSize.width - 80,
        OUT_Y: containerSize.height / 2,
      };

      setRequests((prev) => {
        // 파티클이 없으면 계산 스킵
        if (prev.length === 0) return prev;

        const now = Date.now();
        const updated = prev
          .map((req) => {
            const elapsed = now - req.startTime;
            let newReq = { ...req };

            // Particle Attraction Physics
            // 응답시간에 따른 속도 조절 (빠른 응답 = 빠른 이동)
            const durationScale = Math.max(
              0.3,
              Math.min(2.0, 300 / req.duration)
            ); // 10ms~1000ms 범위
            const ATTRACTION_STRENGTH = 0.0015 * durationScale;
            const DAMPING = 0.95;
            const MAX_SPEED = 8 * durationScale;

            // Phase 1: Incoming - IN에서 Pipeline으로 끌려감
            if (req.phase === "incoming") {
              // 목표 지점까지의 거리와 방향
              const dx = req.targetX - req.x;
              const dy = req.targetY - req.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 5) {
                // Pipeline 도달
                newReq.phase = "processing";
                newReq.startTime = now;
                newReq.x = req.targetX;
                newReq.y = req.targetY;
                newReq.vx = 0;
                newReq.vy = 0;
                newReq.targetX = POSITIONS.OUT_X;
                newReq.targetY = POSITIONS.OUT_Y;
              } else {
                // 인력 적용 (F = k * d)
                const force = distance * ATTRACTION_STRENGTH;
                const ax = (dx / distance) * force;
                const ay = (dy / distance) * force;

                // 속도 업데이트
                newReq.vx = (req.vx + ax) * DAMPING;
                newReq.vy = (req.vy + ay) * DAMPING;

                // 최대 속도 제한
                const speed = Math.sqrt(
                  newReq.vx * newReq.vx + newReq.vy * newReq.vy
                );
                if (speed > MAX_SPEED) {
                  newReq.vx = (newReq.vx / speed) * MAX_SPEED;
                  newReq.vy = (newReq.vy / speed) * MAX_SPEED;
                }

                // 위치 업데이트
                newReq.x = req.x + newReq.vx;
                newReq.y = req.y + newReq.vy;
              }
            }
            // Phase 2: Processing - Pipeline에서 실제 duration만큼 대기
            else if (req.phase === "processing") {
              // 실제 응답시간에 비례한 처리 시간 (duration ms 그대로 사용)
              if (elapsed >= req.duration) {
                newReq.phase = "outgoing";
                newReq.startTime = now;
              } else {
                // 처리 중 - 약간의 진동 효과 (duration에 따라 진동 속도도 조절)
                const vibrationSpeed = 0.02 / (req.duration / 100); // 짧은 duration = 빠른 진동
                const vibration = Math.sin(elapsed * vibrationSpeed) * 2;
                newReq.y = POSITIONS.PIPE_Y + vibration;
              }
            }
            // Phase 3: Outgoing - Pipeline에서 OUT으로 끌려감
            else if (req.phase === "outgoing") {
              // 목표 지점까지의 거리와 방향
              const dx = req.targetX - req.x;
              const dy = req.targetY - req.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 5 || req.x > containerSize.width) {
                // 화면 밖으로 나감 - 제거 대상
                return null;
              } else {
                // 인력 적용 (OUT으로)
                const force = distance * ATTRACTION_STRENGTH;
                const ax = (dx / distance) * force;
                const ay = (dy / distance) * force;

                // 속도 업데이트
                newReq.vx = (req.vx + ax) * DAMPING;
                newReq.vy = (req.vy + ay) * DAMPING;

                // 최대 속도 제한
                const speed = Math.sqrt(
                  newReq.vx * newReq.vx + newReq.vy * newReq.vy
                );
                if (speed > MAX_SPEED) {
                  newReq.vx = (newReq.vx / speed) * MAX_SPEED;
                  newReq.vy = (newReq.vy / speed) * MAX_SPEED;
                }

                // 위치 업데이트
                newReq.x = req.x + newReq.vx;
                newReq.y = req.y + newReq.vy;
              }
            }

            return newReq;
          })
          .filter((req) => req !== null) as Request[];

        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [containerSize, FRAME_INTERVAL]);

  // 상태 코드 및 응답시간에 따른 색상
  const getStatusColor = (statusCode: number, duration: number) => {
    // 에러 상태가 최우선
    if (statusCode >= 500) return "#f44336"; // 빨강 (서버 에러)
    if (statusCode >= 400) return "#ff9800"; // 주황 (클라이언트 에러)

    // 정상 응답은 응답시간에 따라 색상 변경
    if (duration < 100) return "#4caf50"; // 초록 (매우 빠름)
    if (duration < 200) return "#8bc34a"; // 연두 (빠름)
    if (duration < 500) return "#ffc107"; // 노랑 (보통)
    if (duration < 1000) return "#ff9800"; // 주황 (느림)
    return "#f44336"; // 빨강 (매우 느림)
  };

  const POSITIONS = {
    IN_X: 80,
    IN_Y: containerSize.height / 2,
    PIPE_X: containerSize.width * 0.5,
    PIPE_Y: containerSize.height / 2,
    OUT_X: containerSize.width - 80,
    OUT_Y: containerSize.height / 2,
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        실시간 요청 흐름
      </Typography>

      {/* 플로우 차트 영역 */}
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          height: 400,
          backgroundColor: "#1a1a2e",
          borderRadius: 2,
          overflow: "hidden",
          mt: 2,
        }}
      >
        {/* 파이프 라인 (중앙 처리 영역) */}
        <Box
          sx={{
            position: "absolute",
            left: "40%",
            top: "50%",
            width: "20%",
            height: 60,
            transform: "translateY(-50%)",
            backgroundColor: "#16213e",
            border: "2px solid #0f3460",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Processing Pipeline
          </Typography>
        </Box>

        {/* 시작 지점 */}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 80,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f3460",
            borderRadius: "0 30px 30px 0",
            zIndex: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            IN
          </Typography>
        </Box>

        {/* 종료 지점 */}
        <Box
          sx={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 80,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f3460",
            borderRadius: "30px 0 0 30px",
            zIndex: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            OUT
          </Typography>
        </Box>

        {/* 요청 애니메이션 - Particle Attraction */}
        {requests.map((req) => {
          const opacity =
            req.phase === "outgoing"
              ? Math.max(
                  0,
                  1 -
                    (req.x - POSITIONS.PIPE_X) /
                      (POSITIONS.OUT_X - POSITIONS.PIPE_X)
                )
              : 1;

          const particleColor = getStatusColor(req.statusCode, req.duration);

          return (
            <Box
              key={req.id}
              sx={{
                position: "absolute",
                left: req.x,
                top: req.y,
                transform: "translate(-50%, -50%)",
                width: req.phase === "processing" ? 40 : 30,
                height: req.phase === "processing" ? 40 : 30,
                borderRadius: "50%",
                backgroundColor: particleColor,
                boxShadow: `0 0 ${
                  req.phase === "processing" ? 20 : 10
                }px ${particleColor}`,
                transition: "width 0.3s, height 0.3s",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: opacity,
              }}
            >
              {req.phase === "processing" && (
                <Typography
                  variant="caption"
                  sx={{ fontSize: 9, color: "white", fontWeight: "bold" }}
                >
                  {Math.round(req.duration)}ms
                </Typography>
              )}
            </Box>
          );
        })}

        {/* 통계 정보 */}
        <Box
          sx={{
            position: "absolute",
            bottom: 10,
            left: 10,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            padding: 1,
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            활성 요청: {requests.length}
          </Typography>
        </Box>

        {/* 범례 */}
        <Box
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            padding: 1,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 0.5, display: "block", fontWeight: "bold" }}
          >
            응답시간
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#4caf50",
              }}
            />
            <Typography variant="caption" color="text.secondary">
              &lt;100ms
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#ffc107",
              }}
            />
            <Typography variant="caption" color="text.secondary">
              200-500ms
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#ff9800",
              }}
            />
            <Typography variant="caption" color="text.secondary">
              500ms-1s / 4xx
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#f44336",
              }}
            />
            <Typography variant="caption" color="text.secondary">
              &gt;1s / 5xx
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 설명 */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          💡 각 파티클은 실제 HTTP 요청을 나타내며, 이동 속도와 Processing
          시간은 실제 응답시간(duration)을 반영합니다. 파티클 색상은 응답시간과
          상태 코드에 따라 변경됩니다.
        </Typography>
      </Box>
    </Paper>
  );
};

export default RequestFlowChart;
