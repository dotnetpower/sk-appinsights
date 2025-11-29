import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import InsightsIcon from "@mui/icons-material/Insights";
import { trackEvent } from "../services/analytics";

interface QueryResult {
  columns: string[];
  rows: any[][];
}

interface InsightData {
  title: string;
  description: string;
  query: string;
  category: string;
}

const PRESET_INSIGHTS: InsightData[] = [
  {
    title: "최근 1시간 요청 수",
    description: "지난 1시간 동안의 총 요청 수를 확인합니다",
    category: "성능",
    query: `AppRequests
| where TimeGenerated > ago(1h)
| summarize count()`,
  },
  {
    title: "가장 느린 API 엔드포인트",
    description: "평균 응답 시간이 가장 긴 상위 10개 API 엔드포인트",
    category: "성능",
    query: `AppRequests
| where TimeGenerated > ago(24h)
| summarize avg_duration=avg(DurationMs), count=count() by Name
| order by avg_duration desc
| take 10`,
  },
  {
    title: "에러율 분석",
    description: "지난 24시간 동안의 HTTP 상태 코드별 요청 분포",
    category: "오류",
    query: `AppRequests
| where TimeGenerated > ago(24h)
| summarize count() by ResultCode
| order by count_ desc`,
  },
  {
    title: "사용자 활동 분석",
    description: "페이지별 방문 횟수 (지난 24시간)",
    category: "사용자",
    query: `AppEvents
| where TimeGenerated > ago(24h)
| where Name == "page_view"
| extend page_name = tostring(Properties.page_name)
| summarize visit_count=count() by page_name
| order by visit_count desc`,
  },
  {
    title: "AI 채팅 사용량",
    description: "지난 7일간 AI 채팅 메시지 수 및 평균 응답 시간",
    category: "사용자",
    query: `AppEvents
| where TimeGenerated > ago(7d)
| where Name == "chat_message_sent"
| summarize message_count=count(), avg_response_time=avg(todouble(Properties.response_time)) by bin(TimeGenerated, 1d)
| order by TimeGenerated desc`,
  },
  {
    title: "마우스 클릭 히트맵",
    description: "페이지별 사용자 클릭 위치 분석",
    category: "사용자",
    query: `AppEvents
| where TimeGenerated > ago(24h)
| where Name == "mouse_click"
| extend page_name = tostring(Properties.page_name)
| extend x = toint(Properties.x)
| extend y = toint(Properties.y)
| summarize click_count=count() by page_name, x, y
| order by click_count desc
| take 100`,
  },
  {
    title: "종속성 실패",
    description: "외부 서비스 호출 실패 분석",
    category: "오류",
    query: `AppDependencies
| where TimeGenerated > ago(24h)
| where Success == false
| summarize failure_count=count() by Name, ResultCode
| order by failure_count desc`,
  },
  {
    title: "성능 추이",
    description: "시간대별 평균 응답 시간 (지난 24시간)",
    category: "성능",
    query: `AppRequests
| where TimeGenerated > ago(24h)
| summarize avg_duration=avg(DurationMs), request_count=count() by bin(TimeGenerated, 1h)
| order by TimeGenerated asc`,
  },
  {
    title: "가장 인기있는 ETF",
    description: "가장 많이 조회된 ETF 티커",
    category: "비즈니스",
    query: `AppEvents
| where TimeGenerated > ago(7d)
| where Name == "etf_viewed"
| extend ticker = tostring(Properties.ticker)
| summarize view_count=count() by ticker
| order by view_count desc
| take 10`,
  },
  {
    title: "세션 지속 시간",
    description: "사용자 평균 세션 시간 분석",
    category: "사용자",
    query: `AppEvents
| where TimeGenerated > ago(7d)
| where Name in ("page_view", "page_hidden")
| extend session_id = tostring(Properties.session_id)
| summarize session_start=min(TimeGenerated), session_end=max(TimeGenerated) by session_id
| extend session_duration = datetime_diff('minute', session_end, session_start)
| summarize avg_duration=avg(session_duration), total_sessions=count()`,
  },
];

const AppInsights: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [kqlQuery, setKqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async (query: string) => {
    setLoading(true);
    setError(null);
    setQueryResult(null);

    try {
      trackEvent({
        event_name: "kql_query_executed",
        event_category: "insights",
        properties: {
          query_length: query.length,
          query_type: "custom",
        },
      });

      const API_BASE_URL =
        process.env.REACT_APP_API_URL !== undefined
          ? process.env.REACT_APP_API_URL
          : process.env.NODE_ENV === "production"
          ? ""
          : "http://localhost:8000";

      const response = await fetch(`${API_BASE_URL}/api/v1/insights/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "쿼리 실행 실패");
      }

      const data = await response.json();
      setQueryResult(data);

      trackEvent({
        event_name: "kql_query_success",
        event_category: "insights",
        properties: {
          row_count: data.rows?.length || 0,
          column_count: data.columns?.length || 0,
        },
      });
    } catch (err: any) {
      setError(err.message || "쿼리 실행 중 오류가 발생했습니다");
      trackEvent({
        event_name: "kql_query_error",
        event_category: "insights",
        properties: {
          error_message: err.message,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuerySubmit = () => {
    if (kqlQuery.trim()) {
      executeQuery(kqlQuery);
    }
  };

  const handlePresetClick = (insight: InsightData) => {
    setKqlQuery(insight.query);
    executeQuery(insight.query);
    trackEvent({
      event_name: "preset_insight_clicked",
      event_category: "insights",
      properties: {
        insight_title: insight.title,
        insight_category: insight.category,
      },
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderQueryResult = () => {
    if (!queryResult) return null;

    return (
      <Paper sx={{ p: 2, mt: 2, overflowX: "auto" }}>
        <Typography variant="h6" gutterBottom>
          쿼리 결과
        </Typography>
        {queryResult.rows.length === 0 ? (
          <Typography color="text.secondary">결과가 없습니다</Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {queryResult.columns.map((col, idx) => (
                    <th
                      key={idx}
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        borderBottom: "2px solid #333",
                        fontWeight: 600,
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryResult.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        style={{
                          padding: "8px",
                          borderBottom: "1px solid #444",
                        }}
                      >
                        {typeof cell === "object"
                          ? JSON.stringify(cell)
                          : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
        <Typography variant="caption" sx={{ mt: 2, display: "block" }}>
          총 {queryResult.rows.length}개의 행
        </Typography>
      </Paper>
    );
  };

  const categories = Array.from(
    new Set(PRESET_INSIGHTS.map((i) => i.category))
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Application Insights
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        KQL 쿼리를 사용하여 애플리케이션 원격 분석 데이터를 분석합니다
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab
            icon={<QueryStatsIcon />}
            label="KQL 쿼리"
            iconPosition="start"
          />
          <Tab
            icon={<InsightsIcon />}
            label="사전 정의 인사이트"
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            KQL 쿼리 실행
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            placeholder="KQL 쿼리를 입력하세요... 예: requests | where timestamp > ago(1h) | summarize count()"
            value={kqlQuery}
            onChange={(e) => setKqlQuery(e.target.value)}
            sx={{ mb: 2, fontFamily: "monospace" }}
          />
          <Button
            variant="contained"
            onClick={handleQuerySubmit}
            disabled={loading || !kqlQuery.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? "실행 중..." : "쿼리 실행"}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {renderQueryResult()}
        </Paper>
      )}

      {tabValue === 1 && (
        <Grid container spacing={2}>
          {categories.map((category) => (
            <Grid item xs={12} key={category}>
              <Typography variant="h6" gutterBottom>
                {category}
              </Typography>
              <Grid container spacing={2}>
                {PRESET_INSIGHTS.filter((i) => i.category === category).map(
                  (insight, idx) => (
                    <Grid item xs={12} md={6} lg={4} key={idx}>
                      <Card
                        sx={{
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: 4,
                          },
                        }}
                        onClick={() => handlePresetClick(insight)}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              mb: 1,
                            }}
                          >
                            <Typography variant="h6" component="div">
                              {insight.title}
                            </Typography>
                            <Chip
                              label={insight.category}
                              size="small"
                              color="primary"
                            />
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            paragraph
                          >
                            {insight.description}
                          </Typography>
                          <Accordion sx={{ mt: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="caption">
                                쿼리 보기
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Typography
                                variant="caption"
                                component="pre"
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.75rem",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {insight.query}
                              </Typography>
                            </AccordionDetails>
                          </Accordion>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                )}
              </Grid>
            </Grid>
          ))}

          {loading && (
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            </Grid>
          )}

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          {queryResult && (
            <Grid item xs={12}>
              {renderQueryResult()}
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default AppInsights;
