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
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import FeedIcon from "@mui/icons-material/Feed";
import ChatIcon from "@mui/icons-material/Chat";
import GridOnIcon from "@mui/icons-material/GridOn";
import InsightsIcon from "@mui/icons-material/Insights";
import Dashboard from "./components/Dashboard";
import ETFList from "./components/ETFList";
import StockDetail from "./components/StockDetail";
import NewsFeed from "./components/NewsFeed";
import ChatInterface from "./components/ChatInterface";
import HeatmapAnalysis from "./components/HeatmapAnalysis";
import AppInsights from "./components/AppInsights";
import LiveTrafficChart from "./components/LiveTrafficChart";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // 빌드 정보
  const buildInfo = {
    version: process.env.REACT_APP_VERSION || "0.1.0",
    commit: process.env.REACT_APP_GIT_COMMIT || "dev",
    buildTime: process.env.REACT_APP_BUILD_TIME || "local",
  };

  // 페이지 이름 매핑
  const menuItems = [
    {
      id: "dashboard",
      name: "대시보드",
      icon: <DashboardIcon />,
      pageName: "Dashboard",
    },
    {
      id: "etf-list",
      name: "ETF 목록",
      icon: <ListAltIcon />,
      pageName: "ETF List",
    },
    {
      id: "stock-detail",
      name: "주식 상세",
      icon: <ShowChartIcon />,
      pageName: "Stock Detail",
    },
    {
      id: "news-feed",
      name: "뉴스 피드",
      icon: <FeedIcon />,
      pageName: "News Feed",
    },
    {
      id: "ai-chat",
      name: "AI 채팅",
      icon: <ChatIcon />,
      pageName: "AI Chat",
    },
    {
      id: "heatmap-analysis",
      name: "히트맵 분석",
      icon: <GridOnIcon />,
      pageName: "Heatmap Analysis",
    },
    {
      id: "app-insights",
      name: "App Insights",
      icon: <InsightsIcon />,
      pageName: "App Insights",
    },
    {
      id: "live-traffic",
      name: "실시간 트래픽",
      icon: <ShowChartIcon />,
      pageName: "Live Traffic",
    },
  ];
  const currentPage = menuItems[tabValue].pageName;

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

  // 공통 탭 변경 추적 함수
  const trackTabChange = (
    newIndex: number,
    eventName: string,
    additionalProperties?: Record<string, any>
  ) => {
    trackEvent({
      event_name: eventName,
      event_category: "navigation",
      user_id: userId,
      session_id: sessionId,
      properties: {
        from_tab: menuItems[tabValue].pageName,
        to_tab: menuItems[newIndex].pageName,
        from_index: tabValue,
        to_index: newIndex,
        ...additionalProperties,
      },
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    trackTabChange(newValue, "tab_changed");
    setTabValue(newValue);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleMenuItemClick = (index: number) => {
    trackTabChange(index, "menu_item_clicked", { interaction_type: "drawer" });
    setTabValue(index);
    setDrawerOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label={drawerOpen ? "메뉴 닫기" : "메뉴 열기"}
                aria-expanded={drawerOpen}
                aria-controls="mobile-menu-list"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                component="div"
              >
                {isMobile
                  ? "ETF Agent"
                  : "ETF Agent - 주식 & ETF 분석 대시보드"}
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
                  v{buildInfo.version}
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
          {!isMobile && (
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="standard"
              centered
            >
              {menuItems.map((item, index) => (
                <Tab
                  key={item.id}
                  label={item.name}
                  icon={item.icon}
                  iconPosition="start"
                  id={`tab-${index}`}
                  aria-controls={`tabpanel-${index}`}
                />
              ))}
            </Tabs>
          )}
        </AppBar>

        {/* Mobile Drawer Menu */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          aria-label="모바일 네비게이션 메뉴"
          id="mobile-menu-drawer"
          sx={{
            "& .MuiDrawer-paper": {
              width: 280,
              backgroundColor: theme.palette.background.paper,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" component="div" gutterBottom>
              ETF Agent
            </Typography>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.7,
                fontFamily: "monospace",
                display: "block",
              }}
            >
              v{buildInfo.version} | {buildInfo.commit.substring(0, 7)}
            </Typography>
          </Box>
          <Divider />
          <List id="mobile-menu-list">
            {menuItems.map((item, index) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  selected={tabValue === index}
                  onClick={() => handleMenuItemClick(index)}
                  sx={{
                    minHeight: 56,
                    "&.Mui-selected": {
                      backgroundColor: "primary.main",
                      color: "primary.contrastText",
                      "& .MuiListItemIcon-root": {
                        color: "primary.contrastText",
                      },
                      "&:hover": {
                        backgroundColor: "primary.dark",
                      },
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    primaryTypographyProps={{
                      fontWeight: tabValue === index ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

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
          <TabPanel value={tabValue} index={6}>
            <AppInsights />
          </TabPanel>
          <TabPanel value={tabValue} index={7}>
            <LiveTrafficChart />
          </TabPanel>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
