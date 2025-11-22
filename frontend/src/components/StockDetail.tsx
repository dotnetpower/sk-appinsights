import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Search, AccountBalance, History } from "@mui/icons-material";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { stocksApi } from "../services/api";

type TimeRange = "1D" | "1W" | "1M" | "1Y";

const StockDetail: React.FC = () => {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // localStorage에서 최근 검색 기록 로드
  useEffect(() => {
    const saved = localStorage.getItem("recentStockSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent searches:", e);
      }
    }
  }, []);

  // 최근 검색 기록 저장
  const addToRecentSearches = (sym: string) => {
    const upperSym = sym.toUpperCase();
    setRecentSearches((prev) => {
      // 중복 제거 및 최신순 정렬
      const filtered = prev.filter((s) => s !== upperSym);
      const updated = [upperSym, ...filtered].slice(0, 20);
      localStorage.setItem("recentStockSearches", JSON.stringify(updated));
      return updated;
    });
  };

  const fetchChartData = async (sym: string, range: TimeRange) => {
    const rangeMap: {
      [key in TimeRange]: { resolution: string; days: number };
    } = {
      "1D": { resolution: "30", days: 1 },
      "1W": { resolution: "60", days: 7 },
      "1M": { resolution: "D", days: 30 },
      "1Y": { resolution: "D", days: 365 },
    };

    const { resolution, days } = rangeMap[range];

    const candlesResponse = await stocksApi.getCandles(
      sym.toUpperCase(),
      resolution,
      days
    );
    const candles = candlesResponse.data.data;

    if (candles && candles.c) {
      const data = candles.t.map((timestamp: number, index: number) => {
        const date = new Date(timestamp * 1000);
        let dateLabel = "";

        if (range === "1D") {
          dateLabel = date.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } else if (range === "1W") {
          dateLabel = date.toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
          });
        } else {
          dateLabel = date.toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
          });
        }

        return {
          date: dateLabel,
          timestamp: timestamp,
          open: candles.o[index],
          high: candles.h[index],
          low: candles.l[index],
          close: candles.c[index],
          volume: candles.v[index],
        };
      });
      setChartData(data);
    }
  };

  const handleSearch = async (searchSymbol?: string) => {
    const sym = searchSymbol || symbol;
    if (!sym) return;

    setLoading(true);
    try {
      // 주식 상세 정보 조회
      const detailResponse = await stocksApi.getDetail(sym.toUpperCase());
      setStockData(detailResponse.data);

      // 차트 데이터 조회
      await fetchChartData(sym, timeRange);

      // 최근 검색 기록에 추가
      addToRecentSearches(sym);

      // 검색 필드 업데이트
      if (searchSymbol) {
        setSymbol(sym.toUpperCase());
      }
    } catch (error) {
      console.error("주식 데이터 조회 실패:", error);
      alert("주식 데이터를 찾을 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = async (
    _event: React.MouseEvent<HTMLElement>,
    newRange: TimeRange | null
  ) => {
    if (newRange && symbol && stockData) {
      setTimeRange(newRange);
      setLoading(true);
      try {
        await fetchChartData(symbol, newRange);
      } catch (error) {
        console.error("차트 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box>
      <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
        주식 상세 조회
      </Typography>

      <Box display="flex" gap={2} mb={2} flexDirection={{ xs: "column", sm: "row" }}>
        <TextField
          fullWidth
          label="주식/ETF 심볼 (예: AAPL, MSFT, SPY, QQQ)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          size={isMobile ? "small" : "medium"}
        />
        <Button
          variant="contained"
          startIcon={<Search />}
          onClick={() => handleSearch()}
          disabled={loading || !symbol}
          sx={{ minWidth: { xs: "100%", sm: 100 }, whiteSpace: "nowrap" }}
          size={isMobile ? "small" : "medium"}
        >
          조회
        </Button>
      </Box>

      {recentSearches.length > 0 && (
        <Box mb={4}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <History fontSize="small" color="action" />
            <Typography variant="body2" color="textSecondary">
              최근 검색
            </Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            {recentSearches.map((sym) => (
              <Chip
                key={sym}
                label={sym}
                size="small"
                onClick={() => handleSearch(sym)}
                clickable
                variant={symbol === sym ? "filled" : "outlined"}
                color={symbol === sym ? "primary" : "default"}
              />
            ))}
          </Box>
        </Box>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={5}>
          <CircularProgress />
        </Box>
      )}

      {stockData && !loading && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="h6">
                      {stockData.is_etf ? "ETF 정보" : "기업 정보"}
                    </Typography>
                    {stockData.is_etf && (
                      <Chip
                        icon={<AccountBalance />}
                        label="ETF"
                        color="primary"
                        size="small"
                      />
                    )}
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" paragraph>
                    <strong>회사명:</strong> {stockData.profile?.name || "N/A"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>국가:</strong> {stockData.profile?.country || "N/A"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>산업:</strong>{" "}
                    {stockData.profile?.finnhubIndustry || "N/A"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>거래소:</strong>{" "}
                    {stockData.profile?.exchange || "N/A"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>시가총액:</strong>{" "}
                    {stockData.profile?.marketCap
                      ? stockData.profile.marketCap >= 1e12
                        ? `$${(stockData.profile.marketCap / 1e12).toFixed(2)}T`
                        : stockData.profile.marketCap >= 1e9
                        ? `$${(stockData.profile.marketCap / 1e9).toFixed(2)}B`
                        : stockData.profile.marketCap >= 1e6
                        ? `$${(stockData.profile.marketCap / 1e6).toFixed(2)}M`
                        : `$${stockData.profile.marketCap.toFixed(0)}`
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>배당율:</strong>{" "}
                    {stockData.profile?.dividendYield
                      ? `${stockData.profile.dividendYield.toFixed(2)}%`
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>YTD 수익률:</strong>{" "}
                    {stockData.profile?.ytdReturn !== null &&
                    stockData.profile?.ytdReturn !== undefined
                      ? `${(stockData.profile.ytdReturn * 100).toFixed(2)}%`
                      : "N/A"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    현재 시세
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="h4" gutterBottom>
                    ${(stockData.quote?.c || 0).toFixed(2)}
                  </Typography>
                  <Typography
                    variant="h6"
                    color={
                      (stockData.quote?.d || 0) >= 0
                        ? "success.main"
                        : "error.main"
                    }
                    gutterBottom
                  >
                    {(stockData.quote?.d || 0) >= 0 ? "+" : ""}
                    {(stockData.quote?.d || 0).toFixed(2)} (
                    {(stockData.quote?.dp || 0).toFixed(2)}%)
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    고가: ${(stockData.quote?.h || 0).toFixed(2)} | 저가: $
                    {(stockData.quote?.l || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    전일 종가: ${(stockData.quote?.pc || 0).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {chartData.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
                flexDirection={{ xs: "column", sm: "row" }}
                gap={{ xs: 2, sm: 0 }}
              >
                <Typography variant="h6">가격 차트</Typography>
                <ToggleButtonGroup
                  value={timeRange}
                  exclusive
                  onChange={handleTimeRangeChange}
                  size="small"
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  <ToggleButton value="1D" sx={{ flex: { xs: 1, sm: "initial" } }}>1일</ToggleButton>
                  <ToggleButton value="1W" sx={{ flex: { xs: 1, sm: "initial" } }}>1주</ToggleButton>
                  <ToggleButton value="1M" sx={{ flex: { xs: 1, sm: "initial" } }}>1개월</ToggleButton>
                  <ToggleButton value="1Y" sx={{ flex: { xs: 1, sm: "initial" } }}>1년</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#26a69a" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#26a69a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef5350" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef5350" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    stroke="#999"
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                    height={isMobile ? 60 : 30}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    stroke="#999"
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                    width={isMobile ? 40 : 60}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const change = data.close - data.open;
                        const changePercent = (
                          (change / data.open) *
                          100
                        ).toFixed(2);
                        const isPositive = change >= 0;

                        return (
                          <Paper
                            sx={{
                              p: 1.5,
                              minWidth: 180,
                              border: "1px solid #ddd",
                            }}
                          >
                            <Typography
                              variant="caption"
                              display="block"
                              fontWeight="bold"
                              mb={0.5}
                            >
                              {data.date}
                            </Typography>
                            <Box sx={{ display: "grid", gap: 0.3 }}>
                              <Typography variant="body2" fontSize={12}>
                                시가: <strong>${data.open?.toFixed(2)}</strong>
                              </Typography>
                              <Typography variant="body2" fontSize={12}>
                                고가: <strong>${data.high?.toFixed(2)}</strong>
                              </Typography>
                              <Typography variant="body2" fontSize={12}>
                                저가: <strong>${data.low?.toFixed(2)}</strong>
                              </Typography>
                              <Typography
                                variant="body2"
                                fontSize={12}
                                color={
                                  isPositive ? "success.main" : "error.main"
                                }
                              >
                                종가: <strong>${data.close?.toFixed(2)}</strong>
                              </Typography>
                              <Typography
                                variant="body2"
                                fontSize={11}
                                color={
                                  isPositive ? "success.main" : "error.main"
                                }
                              >
                                {isPositive ? "+" : ""}
                                {change.toFixed(2)} ({isPositive ? "+" : ""}
                                {changePercent}%)
                              </Typography>
                            </Box>
                          </Paper>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />

                  {/* 고가-저가 범위 (심지) */}
                  <Bar
                    dataKey={(entry) => [entry.low, entry.high]}
                    fill="transparent"
                    name="가격 범위"
                  >
                    {chartData.map((entry, index) => {
                      const isGrowing = entry.close > entry.open;
                      const color = isGrowing ? "#26a69a" : "#ef5350";
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={color}
                          stroke={color}
                          strokeWidth={2}
                        />
                      );
                    })}
                  </Bar>

                  {/* 시가-종가 캔들 몸통 */}
                  <Bar
                    dataKey={(entry) => [
                      Math.min(entry.open, entry.close),
                      Math.max(entry.open, entry.close),
                    ]}
                    name="캔들"
                  >
                    {chartData.map((entry, index) => {
                      const isGrowing = entry.close > entry.open;
                      const color = isGrowing ? "#26a69a" : "#ef5350";
                      const fillColor = isGrowing ? color : "white";
                      return (
                        <Cell
                          key={`candle-${index}`}
                          fill={fillColor}
                          stroke={color}
                          strokeWidth={1.5}
                        />
                      );
                    })}
                  </Bar>

                  {/* 추세선 */}
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#1976d2"
                    dot={false}
                    strokeWidth={1.5}
                    name="추세선"
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StockDetail;
