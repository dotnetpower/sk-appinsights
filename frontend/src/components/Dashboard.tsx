import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, CircularProgress } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { stocksApi, newsApi } from '../services/api';

interface MarketStat {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [recentNews, setRecentNews] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 주요 지수 조회 (SPY, QQQ, DIA)
      const symbols = ['SPY', 'QQQ', 'DIA'];
      const quotes = await Promise.all(
        symbols.map(symbol => stocksApi.getQuote(symbol).catch(() => null))
      );

      const stats: MarketStat[] = quotes
        .filter(response => response && response.data)
        .map((response, index) => {
          const quote = response!.data.quote;
          const change = quote.d || 0;
          const percentChange = quote.dp || 0;
          return {
            label: symbols[index],
            value: `$${(quote.c || 0).toFixed(2)}`,
            change: `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${percentChange.toFixed(2)}%)`,
            isPositive: change >= 0,
          };
        });

      setMarketStats(stats);

      // 시장 뉴스 조회
      const newsResponse = await newsApi.getMarket('general', 5);
      setRecentNews(newsResponse.data || []);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        시장 개요
      </Typography>

      <Grid container spacing={3}>
        {marketStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {stat.label}
                    </Typography>
                    <Typography variant="h5">
                      {stat.value}
                    </Typography>
                    <Typography
                      variant="body2"
                      color={stat.isPositive ? 'success.main' : 'error.main'}
                    >
                      {stat.change}
                    </Typography>
                  </Box>
                  <Box>
                    {stat.isPositive ? (
                      <TrendingUp fontSize="large" color="success" />
                    ) : (
                      <TrendingDown fontSize="large" color="error" />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          최근 뉴스
        </Typography>
        <Grid container spacing={2}>
          {recentNews.map((news, index) => (
            <Grid item xs={12} key={index}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {news.headline}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {news.summary}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  출처: {news.source} | {new Date(news.datetime * 1000).toLocaleString('ko-KR')}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;
