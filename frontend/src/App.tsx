import React, { useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  CssBaseline,
  Container,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Tab,
  Tabs,
  useMediaQuery,
} from "@mui/material";
import Dashboard from "./components/Dashboard";
import ETFList from "./components/ETFList";
import StockDetail from "./components/StockDetail";
import NewsFeed from "./components/NewsFeed";
import ChatInterface from "./components/ChatInterface";
import HeatmapAnalysis from "./components/HeatmapAnalysis";
import { usePageTracking, getUserId } from "./hooks/usePageTracking";
import { usePageVisibility, usePageFocus } from "./hooks/usePageVisibility";
import { useMouseTracking, useScrollTracking } from "./hooks/useMouseTracking";
import { trackEvent } from "./services/analytics";
import "./App.css";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#0a1929",
      paper: "#1a2332",
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>{children}</Box>
      )}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [userId] = useState(() => getUserId());
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // 빌드 정보
  const buildInfo = {
    version: process.env.REACT_APP_VERSION || "0.1.0",
    commit: process.env.REACT_APP_GIT_COMMIT || "dev",
    buildTime: process.env.REACT_APP_BUILD_TIME || "local",
  };

  // 페이지 이름 매핑
  const pageNames = [
    "Dashboard",
    "ETF List",
    "Stock Detail",
    "News Feed",
    "AI Chat",
    "Heatmap Analysis",
  ];
  const currentPage = pageNames[tabValue];

  // 현재 페이지 추적
  const { sessionId } = usePageTracking(currentPage, userId, {
    tab_index: tabValue,
  });

  // 페이지 가시성 추적 (탭이 활성화되어 있는지)
  usePageVisibility({
    userId,
    sessionId,
    pageName: currentPage,
  });

  // 페이지 포커스 추적 (브라우저 창이 포커스를 받았는지)
  usePageFocus({
    userId,
    sessionId,
    pageName: currentPage,
  });

  // 마우스 위치 추적 (사용자가 선호하는 화면 영역 분석)
  useMouseTracking({
    userId,
    sessionId,
    pageName: currentPage,
    samplingInterval: 1000, // 1초마다 샘플링
    trackClicks: true, // 클릭 추적
    trackHover: true, // 호버 추적
    hoverThreshold: 2000, // 2초 이상 머물면 호버로 간주
  });

  // 스크롤 위치 추적
  useScrollTracking({
    userId,
    sessionId,
    pageName: currentPage,
    samplingInterval: 2000, // 2초마다 샘플링
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // 탭 변경 이벤트 추적
    trackEvent({
      event_name: "tab_changed",
      event_category: "navigation",
      user_id: userId,
      session_id: sessionId,
      properties: {
        from_tab: pageNames[tabValue],
        to_tab: pageNames[newValue],
        from_index: tabValue,
        to_index: newValue,
      },
    });

    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                component="div"
              >
                {isMobile ? "ETF Agent" : "ETF Agent - 주식 & ETF 분석 대시보드"}
              </Typography>
              {isMobile && (
                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.6,
                    fontFamily: "monospace",
                    fontSize: "0.65rem",
                    display: "block",
                    lineHeight: 1.2,
                  }}
                >
                  v{buildInfo.version} | {buildInfo.commit.substring(0, 7)}
                </Typography>
              )}
            </Box>
            {!isMobile && (
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.7,
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                }}
              >
                v{buildInfo.version} | {buildInfo.commit} |{" "}
                {new Date(buildInfo.buildTime).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}
              </Typography>
            )}
          </Toolbar>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
            allowScrollButtonsMobile
            centered={!isMobile}
          >
            <Tab label="대시보드" />
            <Tab label="ETF 목록" />
            <Tab label="주식 상세" />
            <Tab label="뉴스 피드" />
            <Tab label="AI 채팅" />
            <Tab label="히트맵 분석" />
          </Tabs>
        </AppBar>

        <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <TabPanel value={tabValue} index={0}>
            <Dashboard />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ETFList />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <StockDetail />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <NewsFeed />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <ChatInterface />
          </TabPanel>
          <TabPanel value={tabValue} index={5}>
            <HeatmapAnalysis />
          </TabPanel>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
