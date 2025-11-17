import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { etfApi } from '../services/api';

interface ETFData {
  symbol: string;
  data: any;
  timestamp: string;
}

const ETFList: React.FC = () => {
  const [etfs, setEtfs] = useState<ETFData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadETFs();
  }, []);

  const loadETFs = async () => {
    setLoading(true);
    try {
      const response = await etfApi.list(20);
      setEtfs(response.data || []);
    } catch (error) {
      console.error('ETF 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (symbol: string) => {
    try {
      await etfApi.refresh(symbol);
      loadETFs();
    } catch (error) {
      console.error(`ETF ${symbol} 새로고침 실패:`, error);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">ETF 목록</Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={loadETFs}>
          새로고침
        </Button>
      </Box>

      {etfs.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            저장된 ETF 데이터가 없습니다. 주식 상세 탭에서 ETF 심볼을 조회하면 데이터가 저장됩니다.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>심볼</TableCell>
                <TableCell>현재가</TableCell>
                <TableCell>변동</TableCell>
                <TableCell>변동률</TableCell>
                <TableCell>업데이트 시간</TableCell>
                <TableCell align="center">액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {etfs.map((etf) => {
                const quote = etf.data?.quote || {};
                const change = quote.d || 0;
                const percentChange = quote.dp || 0;
                const isPositive = change >= 0;

                return (
                  <TableRow key={etf.symbol}>
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {etf.symbol}
                      </Typography>
                    </TableCell>
                    <TableCell>${(quote.c || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Typography color={isPositive ? 'success.main' : 'error.main'}>
                        {isPositive ? '+' : ''}
                        {change.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${isPositive ? '+' : ''}${percentChange.toFixed(2)}%`}
                        color={isPositive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(etf.timestamp).toLocaleString('ko-KR')}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        onClick={() => handleRefresh(etf.symbol)}
                      >
                        새로고침
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ETFList;
