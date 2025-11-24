import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from "@mui/material";
import RequestFlowChartThree from "./RequestFlowChartThree";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SpeedIcon from "@mui/icons-material/Speed";
import ErrorIcon from "@mui/icons-material/Error";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface MetricData {
  timestamp: string;
  request_count: number;
  avg_duration: number;
  error_count: number;
  success_rate: number;
}

interface ChartDataPoint {
  time: string;
  requests: number;
  duration: number;
  errors: number;
}

interface RequestEvent {
  method: string;
  path: string;
  status_code: number;
  duration: number;
  timestamp: string;
}

const LiveTrafficChart: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<MetricData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [latestRequest, setLatestRequest] = useState<RequestEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const maxDataPoints = 60; // 최근 60초 데이터만 유지

  useEffect(() => {
    // WebSocket 연결
    const connectWebSocket = () => {
      const wsUrl =
        process.env.NODE_ENV === "production"
          ? `wss://${window.location.host}/api/live-metrics/ws/traffic`
          : "ws://localhost:8000/api/live-metrics/ws/traffic";

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket 연결됨");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // 개별 요청 이벤트
          if (message.type === "new_request") {
            setLatestRequest(message.data);
          }
          // 집계 메트릭
          else if (message.type === "traffic_update") {
            const metrics: MetricData = message.data;
            setCurrentMetrics(metrics);

            // 차트 데이터 업데이트
            const timestamp = new Date(metrics.timestamp);
            const timeString = timestamp.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            setChartData((prevData) => {
              const newData = [
                ...prevData,
                {
                  time: timeString,
                  requests: metrics.request_count,
                  duration: Math.round(metrics.avg_duration),
                  errors: metrics.error_count,
                },
              ];

              // 최근 60개 데이터만 유지
              return newData.slice(-maxDataPoints);
            });
          }
        } catch (error) {
          console.error("WebSocket 메시지 파싱 오류:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket 오류:", error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket 연결 해제");
        setIsConnected(false);

        // 5초 후 재연결 시도
        setTimeout(() => {
          console.log("🔄 WebSocket 재연결 시도...");
          connectWebSocket();
        }, 5000);
      };
    };

    connectWebSocket();

    // 컴포넌트 언마운트 시 WebSocket 연결 해제
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // 초기 히스토리 데이터 로드
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const API_BASE_URL =
          process.env.REACT_APP_API_URL !== undefined
            ? process.env.REACT_APP_API_URL
            : process.env.NODE_ENV === "production"
            ? ""
            : "http://localhost:8000";

        const response = await fetch(
          `${API_BASE_URL}/api/live-metrics/history?minutes=5`
        );
        const data = await response.json();

        if (data.history && data.history.length > 0) {
          const formattedData = data.history.map((item: MetricData) => {
            const timestamp = new Date(item.timestamp);
            return {
              time: timestamp.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              requests: item.request_count,
              duration: Math.round(item.avg_duration),
              errors: item.error_count,
            };
          });
          setChartData(formattedData.slice(-maxDataPoints));
        }
      } catch (error) {
        console.error("히스토리 데이터 로드 실패:", error);
      }
    };

    fetchHistory();
  }, []);

  const getStatusColor = (rate: number) => {
    if (rate >= 99) return "success";
    if (rate >= 95) return "warning";
    return "error";
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          실시간 트래픽 모니터링
        </Typography>
        <Chip
          label={isConnected ? "실시간 연결됨" : "연결 중..."}
          color={isConnected ? "success" : "default"}
          icon={
            isConnected ? undefined : (
              <CircularProgress size={16} sx={{ ml: 1 }} />
            )
          }
        />
      </Box>

      {/* 실시간 요청 흐름 */}
      <RequestFlowChartThree latestRequest={latestRequest} />

      {/* 현재 메트릭 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">요청 수</Typography>
              </Box>
              <Typography variant="h3">
                {currentMetrics?.request_count || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                최근 1분
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <SpeedIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">평균 응답시간</Typography>
              </Box>
              <Typography variant="h3">
                {currentMetrics?.avg_duration
                  ? Math.round(currentMetrics.avg_duration)
                  : 0}
                ms
              </Typography>
              <Typography variant="caption" color="text.secondary">
                최근 1분
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">에러 수</Typography>
              </Box>
              <Typography variant="h3">
                {currentMetrics?.error_count || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                최근 1분
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CheckCircleIcon
                  color={
                    currentMetrics
                      ? getStatusColor(currentMetrics.success_rate)
                      : "success"
                  }
                  sx={{ mr: 1 }}
                />
                <Typography variant="h6">성공률</Typography>
              </Box>
              <Typography variant="h3">
                {currentMetrics?.success_rate
                  ? currentMetrics.success_rate.toFixed(1)
                  : 100}
                %
              </Typography>
              <Typography variant="caption" color="text.secondary">
                최근 1분
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 실시간 트래픽 그래프 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          실시간 요청 트래픽 (최근 60초)
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#1976d2" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="time"
              stroke="#888"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis stroke="#888" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a2332",
                border: "1px solid #333",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="#1976d2"
              fillOpacity={1}
              fill="url(#colorRequests)"
              name="요청 수"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      {/* 응답 시간 그래프 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          평균 응답 시간 (ms)
        </Typography>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="time"
              stroke="#888"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis stroke="#888" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a2332",
                border: "1px solid #333",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="duration"
              stroke="#00bcd4"
              strokeWidth={2}
              dot={false}
              name="응답 시간 (ms)"
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* 에러 발생 그래프 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          에러 발생 추이
        </Typography>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="time"
              stroke="#888"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis stroke="#888" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a2332",
                border: "1px solid #333",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="errors"
              stroke="#f44336"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="에러 수"
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default LiveTrafficChart;
