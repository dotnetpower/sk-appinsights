import React, { useState, useEffect } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Refresh, Delete } from "@mui/icons-material";
import { etfApi } from "../services/api";

interface ETFData {
  symbol: string;
  data: any;
  timestamp: string;
}

const ETFList: React.FC = () => {
  const [etfs, setEtfs] = useState<ETFData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingSymbol, setRefreshingSymbol] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [symbolToDelete, setSymbolToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    loadETFs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadETFs = async (retryCount = 0) => {
    setLoading(true);
    try {
      // timeout 8초로 설정
      const response = await Promise.race([
        etfApi.list(20),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 8000)
        ),
      ]);
      setEtfs((response as any).data || []);
    } catch (error: any) {
      console.error("ETF 목록 로드 실패:", error);

      // timeout 오류이고 재시도 횟수가 2번 미만이면 재시도
      if (error.message === "Timeout" && retryCount < 2) {
        console.log(`Retrying ETF list load (${retryCount + 1}/2)...`);
        setTimeout(() => loadETFs(retryCount + 1), 1000);
      } else {
        setEtfs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (symbol: string) => {
    setRefreshingSymbol(symbol);
    try {
      const response = await etfApi.refresh(symbol);

      // 새로고침된 데이터로 목록 업데이트
      if (response.data && response.data.data) {
        setEtfs((prevEtfs) =>
          prevEtfs.map((etf) =>
            etf.symbol === symbol
              ? {
                  symbol: symbol,
                  data: response.data.data,
                  timestamp:
                    response.data.data.updated_at || new Date().toISOString(),
                }
              : etf
          )
        );
      } else {
        // 실패시 전체 목록 다시 로드
        await loadETFs();
      }
    } catch (error) {
      console.error(`ETF ${symbol} 새로고침 실패:`, error);
      // 에러 발생시에도 전체 목록 다시 로드
      await loadETFs();
    } finally {
      setRefreshingSymbol(null);
    }
  };

  const handleDeleteClick = (symbol: string) => {
    setSymbolToDelete(symbol);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!symbolToDelete) return;

    setDeleting(true);
    try {
      await etfApi.delete(symbolToDelete);
      // 삭제 성공시 목록에서 제거
      setEtfs((prevEtfs) =>
        prevEtfs.filter((etf) => etf.symbol !== symbolToDelete)
      );
    } catch (error) {
      console.error(`ETF ${symbolToDelete} 삭제 실패:`, error);
      alert(`ETF 삭제에 실패했습니다: ${symbolToDelete}`);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSymbolToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSymbolToDelete(null);
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
        flexDirection={{ xs: "column", sm: "row" }}
        gap={{ xs: 2, sm: 0 }}
      >
        <Typography variant={isMobile ? "h5" : "h4"}>ETF 목록</Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={() => loadETFs()}
          fullWidth={isMobile}
        >
          새로고침
        </Button>
      </Box>

      {etfs.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="textSecondary">
            저장된 ETF 데이터가 없습니다. 주식 상세 탭에서 ETF 심볼을 조회하면
            데이터가 저장됩니다.
          </Typography>
        </Paper>
      ) : isMobile ? (
        // 모바일 카드 레이아웃
        <Grid container spacing={2}>
          {etfs.map((etf) => {
            const quote = etf.data?.quote || {};
            const profile = etf.data?.profile || {};
            const change = quote.d || 0;
            const percentChange = quote.dp || 0;
            const isPositive = change >= 0;

            const formatMarketCap = (value: number) => {
              if (!value) return "N/A";
              if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
              if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
              if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
              return `$${value.toFixed(0)}`;
            };

            const formatDividendYield = (value: number) => {
              if (!value) return "N/A";
              return `${value.toFixed(2)}%`;
            };

            const formatYTDReturn = (value: number) => {
              if (value === null || value === undefined) return "N/A";
              return `${(value * 100).toFixed(2)}%`;
            };

            return (
              <Grid item xs={12} key={etf.symbol}>
                <Card>
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={2}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {etf.symbol}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {profile.name || "-"}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="h6" fontWeight="medium">
                          ${(quote.c || 0).toFixed(2)}
                        </Typography>
                        <Chip
                          label={`${isPositive ? "+" : ""}${percentChange.toFixed(
                            2
                          )}%`}
                          color={isPositive ? "success" : "error"}
                          size="small"
                        />
                      </Box>
                    </Box>

                    <Grid container spacing={1} mb={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          변동
                        </Typography>
                        <Typography
                          variant="body2"
                          color={isPositive ? "success.main" : "error.main"}
                        >
                          {isPositive ? "+" : ""}
                          {change.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          YTD 수익률
                        </Typography>
                        <Typography
                          variant="body2"
                          color={
                            profile.ytdReturn && profile.ytdReturn > 0
                              ? "success.main"
                              : profile.ytdReturn && profile.ytdReturn < 0
                              ? "error.main"
                              : "textSecondary"
                          }
                        >
                          {formatYTDReturn(profile.ytdReturn)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          시가총액
                        </Typography>
                        <Typography variant="body2">
                          {formatMarketCap(profile.marketCap)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          배당율
                        </Typography>
                        <Typography variant="body2" color="primary">
                          {formatDividendYield(
                            profile.dividendYield ||
                              profile.trailingAnnualDividendYield
                          )}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Typography
                      variant="caption"
                      color="textSecondary"
                      display="block"
                      mb={1}
                    >
                      업데이트:{" "}
                      {new Date(etf.timestamp).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>

                    <Box display="flex" gap={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRefresh(etf.symbol)}
                        disabled={refreshingSymbol === etf.symbol}
                        fullWidth
                      >
                        {refreshingSymbol === etf.symbol
                          ? "갱신중..."
                          : "새로고침"}
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(etf.symbol)}
                        title="삭제"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        // 데스크톱 테이블 레이아웃
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>심볼</TableCell>
                <TableCell>이름</TableCell>
                <TableCell align="right">현재가</TableCell>
                <TableCell align="right">변동</TableCell>
                <TableCell align="right">변동률</TableCell>
                <TableCell align="right">YTD 수익률</TableCell>
                <TableCell align="right">시가총액</TableCell>
                <TableCell align="right">배당율</TableCell>
                <TableCell>업데이트 시간</TableCell>
                <TableCell align="center">액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {etfs.map((etf) => {
                const quote = etf.data?.quote || {};
                const profile = etf.data?.profile || {};
                const change = quote.d || 0;
                const percentChange = quote.dp || 0;
                const isPositive = change >= 0;

                // 시가총액 포맷팅
                const formatMarketCap = (value: number) => {
                  if (!value) return "N/A";
                  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
                  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
                  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
                  return `$${value.toFixed(0)}`;
                };

                // 배당율 포맷팅 (이미 퍼센트 형식으로 제공됨: 1.5 = 1.5%)
                const formatDividendYield = (value: number) => {
                  if (!value) return "N/A";
                  return `${value.toFixed(2)}%`;
                };

                // YTD return 포맷팅 (비율 형식: 0.4975 = 49.75%)
                const formatYTDReturn = (value: number) => {
                  if (value === null || value === undefined) return "N/A";
                  return `${(value * 100).toFixed(2)}%`;
                };

                return (
                  <TableRow key={etf.symbol} hover>
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {etf.symbol}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {profile.name || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="medium">
                        ${(quote.c || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        color={isPositive ? "success.main" : "error.main"}
                      >
                        {isPositive ? "+" : ""}
                        {change.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${isPositive ? "+" : ""}${percentChange.toFixed(
                          2
                        )}%`}
                        color={isPositive ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={
                          profile.ytdReturn && profile.ytdReturn > 0
                            ? "success.main"
                            : profile.ytdReturn && profile.ytdReturn < 0
                            ? "error.main"
                            : "textSecondary"
                        }
                        fontWeight="medium"
                      >
                        {formatYTDReturn(profile.ytdReturn)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatMarketCap(profile.marketCap)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="primary">
                        {formatDividendYield(
                          profile.dividendYield ||
                            profile.trailingAnnualDividendYield
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(etf.timestamp).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleRefresh(etf.symbol)}
                          disabled={refreshingSymbol === etf.symbol}
                        >
                          {refreshingSymbol === etf.symbol
                            ? "갱신중..."
                            : "새로고침"}
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(etf.symbol)}
                          title="삭제"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">ETF 데이터 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 <strong>{symbolToDelete}</strong> ETF 데이터를
            삭제하시겠습니까?
            <br />이 작업은 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            취소
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            autoFocus
          >
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ETFList;
