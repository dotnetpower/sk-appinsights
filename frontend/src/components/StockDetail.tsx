import React, { useState } from 'react';
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
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { stocksApi } from '../services/api';

const StockDetail: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!symbol) return;

    setLoading(true);
    try {
      // 주식 상세 정보 조회
      const detailResponse = await stocksApi.getDetail(symbol.toUpperCase());
      setStockData(detailResponse.data);

      // 차트 데이터 조회 (최근 30일)
      const candlesResponse = await stocksApi.getCandles(symbol.toUpperCase(), 'D', 30);
      const candles = candlesResponse.data.data;

      if (candles && candles.c) {
        const chartData = candles.t.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toLocaleDateString('ko-KR'),
          close: candles.c[index],
          high: candles.h[index],
          low: candles.l[index],
          open: candles.o[index],
        }));
        setChartData(chartData);
      }
    } catch (error) {
      console.error('주식 데이터 조회 실패:', error);
      alert('주식 데이터를 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        주식 상세 조회
      </Typography>

      <Box display="flex" gap={2} mb={4}>
        <TextField
          fullWidth
          label="주식 심볼 (예: AAPL, MSFT, SPY)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button
          variant="contained"
          startIcon={<Search />}
          onClick={handleSearch}
          disabled={loading || !symbol}
        >
          조회
        </Button>
      </Box>

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
                  <Typography variant="h6" gutterBottom>
                    기업 정보
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" paragraph>
                    <strong>회사명:</strong> {stockData.profile?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>국가:</strong> {stockData.profile?.country || 'N/A'}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>산업:</strong> {stockData.profile?.finnhubIndustry || 'N/A'}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>거래소:</strong> {stockData.profile?.exchange || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>시가총액:</strong> ${stockData.profile?.marketCapitalization || 'N/A'}M
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
                    color={(stockData.quote?.d || 0) >= 0 ? 'success.main' : 'error.main'}
                    gutterBottom
                  >
                    {(stockData.quote?.d || 0) >= 0 ? '+' : ''}
                    {(stockData.quote?.d || 0).toFixed(2)} ({(stockData.quote?.dp || 0).toFixed(2)}%)
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    고가: ${(stockData.quote?.h || 0).toFixed(2)} | 저가: ${(stockData.quote?.l || 0).toFixed(2)}
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
              <Typography variant="h6" gutterBottom>
                가격 차트 (최근 30일)
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="close" stroke="#8884d8" name="종가" />
                  <Line type="monotone" dataKey="high" stroke="#82ca9d" name="고가" />
                  <Line type="monotone" dataKey="low" stroke="#ff7300" name="저가" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StockDetail;
