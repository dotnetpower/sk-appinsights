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
} from "@mui/material";
import Dashboard from "./components/Dashboard";
import ETFList from "./components/ETFList";
import StockDetail from "./components/StockDetail";
import NewsFeed from "./components/NewsFeed";
import ChatInterface from "./components/ChatInterface";
import { usePageTracking, getUserId } from "./hooks/usePageTracking";
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [userId] = useState(() => getUserId());

  // 페이지 이름 매핑
  const pageNames = [
    "Dashboard",
    "ETF List",
    "Stock Detail",
    "News Feed",
    "AI Chat",
  ];
  const currentPage = pageNames[tabValue];

  // 현재 페이지 추적
  const { sessionId } = usePageTracking(currentPage, userId, {
    tab_index: tabValue,
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
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              ETF Agent - 주식 & ETF 분석 대시보드
            </Typography>
          </Toolbar>
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="대시보드" />
            <Tab label="ETF 목록" />
            <Tab label="주식 상세" />
            <Tab label="뉴스 피드" />
            <Tab label="AI 채팅" />
          </Tabs>
        </AppBar>

        <Container maxWidth="xl">
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
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
