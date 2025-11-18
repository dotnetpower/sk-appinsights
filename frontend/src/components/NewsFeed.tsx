import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  Link,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardMedia,
} from "@mui/material";
import { Public, TrendingUp } from "@mui/icons-material";
import { newsApi } from "../services/api";

interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  category: string;
  image?: string;
}

const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsType, setNewsType] = useState<"market" | "global">("global");
  const [category, setCategory] = useState("general");
  const [sources, setSources] = useState("all");

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        let response;
        if (newsType === "market") {
          response = await newsApi.getMarket(category, 50);
        } else {
          response = await newsApi.getGlobal(sources, 50);
        }
        setNews(response.data || []);
      } catch (error) {
        console.error("뉴스 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [newsType, category, sources]);

  const handleNewsTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: "market" | "global" | null
  ) => {
    if (newType !== null) {
      setNewsType(newType);
    }
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value);
  };

  const handleSourceChange = (event: SelectChangeEvent) => {
    setSources(event.target.value);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">뉴스 피드</Typography>
        <Box display="flex" gap={2}>
          <ToggleButtonGroup
            value={newsType}
            exclusive
            onChange={handleNewsTypeChange}
            aria-label="뉴스 타입"
          >
            <ToggleButton value="global" aria-label="글로벌 뉴스">
              <Public sx={{ mr: 1 }} />
              글로벌
            </ToggleButton>
            <ToggleButton value="market" aria-label="시장 뉴스">
              <TrendingUp sx={{ mr: 1 }} />
              시장
            </ToggleButton>
          </ToggleButtonGroup>

          {newsType === "market" ? (
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={category}
                onChange={handleCategoryChange}
                label="카테고리"
              >
                <MenuItem value="general">일반</MenuItem>
                <MenuItem value="forex">외환</MenuItem>
                <MenuItem value="crypto">암호화폐</MenuItem>
                <MenuItem value="merger">인수합병</MenuItem>
              </Select>
            </FormControl>
          ) : (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>소스</InputLabel>
              <Select
                value={sources}
                onChange={handleSourceChange}
                label="소스"
              >
                <MenuItem value="all">모든 소스</MenuItem>
                <MenuItem value="yahoo_finance">Yahoo Finance</MenuItem>
                <MenuItem value="marketwatch">MarketWatch</MenuItem>
                <MenuItem value="reuters_business">Reuters Business</MenuItem>
                <MenuItem value="cnbc">CNBC</MenuItem>
                <MenuItem value="investing">Investing.com</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      {news.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="textSecondary">뉴스가 없습니다.</Typography>
        </Paper>
      ) : (
        <List>
          {news.map((item, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start" sx={{ py: 2, px: 0 }}>
                {item.image && (
                  <Card sx={{ width: 200, mr: 2, flexShrink: 0 }}>
                    <CardMedia
                      component="img"
                      height="120"
                      image={item.image}
                      alt={item.headline}
                      sx={{ objectFit: "cover" }}
                    />
                  </Card>
                )}
                <Box sx={{ flex: 1 }}>
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      display: "block",
                      mb: 1,
                    }}
                  >
                    {item.headline}
                  </Link>
                  {item.summary && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      paragraph
                      sx={{ mb: 1 }}
                    >
                      {item.summary}
                    </Typography>
                  )}
                  <Box
                    display="flex"
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Chip
                      label={item.source}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {new Date(item.datetime * 1000).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
              {index < news.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default NewsFeed;
