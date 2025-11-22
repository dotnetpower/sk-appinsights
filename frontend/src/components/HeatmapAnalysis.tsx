import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { trackEvent } from "../services/analytics";

interface HeatmapData {
  questions: string[];
  products: string[];
  values: number[][];
  questionAverages: number[];
  productAverages: number[];
}

// 색상 계산 함수 (0.0 ~ 10.0 범위)
const getColor = (value: number): string => {
  if (value >= 8.0) return "#4caf50"; // 녹색 (10.0)
  if (value >= 6.0) return "#8bc34a"; // 연두색 (8.0)
  if (value >= 4.0) return "#ffc107"; // 노란색 (5.0)
  if (value >= 2.0) return "#03a9f4"; // 파란색 (3.0)
  return "#2196f3"; // 진한 파란색 (0.0)
};

// 텍스트 색상 (명암 대비)
const getTextColor = (value: number): string => {
  return value >= 6.0 ? "#000000" : "#ffffff";
};

const HeatmapAnalysis: React.FC = () => {
  const [selectedDataset, setSelectedDataset] = useState<string>("business");
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // 샘플 데이터 생성
  useEffect(() => {
    const generateSampleData = (): HeatmapData => {
      if (selectedDataset === "business") {
        return {
          questions: [
            "Question 1",
            "Question 2",
            "Question 3",
            "Question 4",
            "Question 5",
            "Question 6",
          ],
          products: [
            "Product 1",
            "Product 2",
            "Product 3",
            "Product 4",
            "Product 5",
            "Product 6",
            "Product 7",
            "Product 8",
            "Product 9",
            "Product 10",
          ],
          values: [
            [10.0, 8.76, 4.33, 6.0, 7.4, 4.0, 7.0, 4.0, 7.2, 9.2],
            [8.5, 4.0, 7.0, 7.5, 6.5, 3.5, 3.0, 5.5, 7.8, 7.8],
            [5.0, 10.0, 3.67, 0.0, 4.5, 6.3, 1.8, 2.2, 8.4, 0.0],
            [6.0, 7.0, 9.0, 4.67, 4.0, 3.67, 1.0, 6.5, 1.5, 4.0],
            [3.0, 4.0, 8.5, 6.9, 3.0, 8.8, 6.0, 7.9, 3.6, 6.6],
            [3.8, 4.2, 5.2, 6.0, 4.2, 2.8, 3.8, 4.2, 9.2, 8.6],
          ],
          questionAverages: [6.47, 6.16, 9.95, 4.08, 4.43, 4.01],
          productAverages: [
            6.69, 6.2, 4.19, 4.93, 5.73, 4.4, 4.6, 1.25, 6.45, 5.37,
          ],
        };
      } else {
        // 주식/ETF 성과 히트맵 예시
        return {
          questions: [
            "YTD Return",
            "1 Year Return",
            "3 Year Return",
            "5 Year Return",
            "Dividend Yield",
            "Expense Ratio",
          ],
          products: [
            "SPY",
            "QQQ",
            "DIA",
            "IWM",
            "VTI",
            "VOO",
            "VEA",
            "VWO",
            "AGG",
            "BND",
          ],
          values: [
            [8.5, 9.2, 7.8, 6.5, 8.8, 8.9, 6.2, 5.5, 3.2, 3.5],
            [7.8, 8.9, 7.2, 6.0, 8.5, 8.6, 5.8, 5.2, 3.5, 3.8],
            [6.5, 7.5, 6.0, 5.2, 7.0, 7.2, 4.8, 4.5, 4.0, 4.2],
            [7.0, 8.0, 6.5, 5.5, 7.5, 7.8, 5.0, 4.8, 4.5, 4.8],
            [2.5, 1.8, 3.2, 3.5, 2.2, 2.0, 4.5, 4.8, 5.5, 5.2],
            [0.5, 0.8, 1.2, 1.5, 0.3, 0.3, 2.0, 2.5, 1.8, 2.0],
          ],
          questionAverages: [6.81, 6.73, 5.69, 6.14, 3.52, 1.29],
          productAverages: [
            5.47, 6.03, 5.32, 4.87, 5.72, 5.8, 4.72, 4.58, 3.92, 4.08,
          ],
        };
      }
    };

    const data = generateSampleData();
    setHeatmapData(data);

    // 이벤트 추적
    trackEvent({
      event_name: "heatmap_view",
      event_category: "analytics",
      properties: {
        dataset: selectedDataset,
        timestamp: new Date().toISOString(),
      },
    });
  }, [selectedDataset]);

  const handleDatasetChange = (event: SelectChangeEvent) => {
    setSelectedDataset(event.target.value);
  };

  if (!heatmapData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom>
              📊 Business Heatmap Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              제품 및 질문별 성과 분석 히트맵
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>데이터셋 선택</InputLabel>
              <Select
                value={selectedDataset}
                onChange={handleDatasetChange}
                label="데이터셋 선택"
              >
                <MenuItem value="business">비즈니스 분석</MenuItem>
                <MenuItem value="etf">ETF 성과 분석</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* 범례 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Rankings
        </Typography>
        <Grid container spacing={1} alignItems="center">
          <Grid item>
            <Chip
              label="10.0"
              sx={{
                bgcolor: getColor(10.0),
                color: getTextColor(10.0),
                fontWeight: "bold",
              }}
            />
          </Grid>
          <Grid item>
            <Chip
              label="8.0"
              sx={{
                bgcolor: getColor(8.0),
                color: getTextColor(8.0),
                fontWeight: "bold",
              }}
            />
          </Grid>
          <Grid item>
            <Chip
              label="5.0"
              sx={{
                bgcolor: getColor(5.0),
                color: getTextColor(5.0),
                fontWeight: "bold",
              }}
            />
          </Grid>
          <Grid item>
            <Chip
              label="3.0"
              sx={{
                bgcolor: getColor(3.0),
                color: getTextColor(3.0),
                fontWeight: "bold",
              }}
            />
          </Grid>
          <Grid item>
            <Chip
              label="0.0"
              sx={{
                bgcolor: getColor(0.0),
                color: getTextColor(0.0),
                fontWeight: "bold",
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 히트맵 테이블 */}
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: { xs: 600, md: 1200 } }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  bgcolor: "background.default",
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  fontSize: { xs: "0.75rem", md: "0.875rem" },
                  padding: { xs: "8px 4px", md: "16px" },
                }}
              >
                Questions
              </TableCell>
              {heatmapData.products.map((product, idx) => (
                <TableCell
                  key={idx}
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "background.default",
                    minWidth: { xs: 60, md: 100 },
                    fontSize: { xs: "0.7rem", md: "0.875rem" },
                    padding: { xs: "8px 4px", md: "16px" },
                  }}
                >
                  {product}
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  position: "sticky",
                  right: 0,
                  zIndex: 2,
                  fontSize: { xs: "0.7rem", md: "0.875rem" },
                  padding: { xs: "8px 4px", md: "16px" },
                }}
              >
                Total Average
                <br />
                Per Product
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {heatmapData.questions.map((question, qIdx) => (
              <TableRow key={qIdx}>
                <TableCell
                  component="th"
                  scope="row"
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "background.default",
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    fontSize: { xs: "0.7rem", md: "0.875rem" },
                    padding: { xs: "8px 4px", md: "16px" },
                  }}
                >
                  {question}
                </TableCell>
                {heatmapData.values[qIdx].map((value, pIdx) => (
                  <TableCell
                    key={pIdx}
                    align="center"
                    sx={{
                      bgcolor: getColor(value),
                      color: getTextColor(value),
                      fontWeight: "bold",
                      fontSize: { xs: "0.8rem", md: "1.1rem" },
                      padding: { xs: "8px 4px", md: "16px" },
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "scale(1.05)",
                        boxShadow: 3,
                        zIndex: 1,
                      },
                    }}
                  >
                    {value.toFixed(2)}
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.8rem", md: "1.1rem" },
                    padding: { xs: "8px 4px", md: "16px" },
                    bgcolor: getColor(heatmapData.questionAverages[qIdx]),
                    color: getTextColor(heatmapData.questionAverages[qIdx]),
                    position: "sticky",
                    right: 0,
                    zIndex: 1,
                  }}
                >
                  {heatmapData.questionAverages[qIdx].toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {/* 평균 행 */}
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  fontSize: { xs: "0.7rem", md: "0.875rem" },
                  padding: { xs: "8px 4px", md: "16px" },
                }}
              >
                Total Average
                <br />
                Per Question
              </TableCell>
              {heatmapData.productAverages.map((avg, idx) => (
                <TableCell
                  key={idx}
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    fontSize: { xs: "0.8rem", md: "1.1rem" },
                    padding: { xs: "8px 4px", md: "16px" },
                    bgcolor: getColor(avg),
                    color: getTextColor(avg),
                  }}
                >
                  {avg.toFixed(2)}
                </TableCell>
              ))}
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  fontSize: { xs: "0.9rem", md: "1.2rem" },
                  padding: { xs: "8px 4px", md: "16px" },
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  position: "sticky",
                  right: 0,
                  zIndex: 2,
                }}
              >
                {(
                  heatmapData.productAverages.reduce((a, b) => a + b, 0) /
                  heatmapData.productAverages.length
                ).toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* 인사이트 카드 */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary" fontSize={{ xs: "1rem", md: "1.25rem" }}>
                🏆 최고 성과 제품
              </Typography>
              {heatmapData.productAverages
                .map((avg, idx) => ({
                  avg,
                  product: heatmapData.products[idx],
                }))
                .sort((a, b) => b.avg - a.avg)
                .slice(0, 3)
                .map((item, idx) => (
                  <Box key={idx} sx={{ mb: 1 }}>
                    <Typography variant="body2" fontSize={{ xs: "0.8rem", md: "0.875rem" }}>
                      {idx + 1}. {item.product}:{" "}
                      <strong style={{ color: getColor(item.avg) }}>
                        {item.avg.toFixed(2)}
                      </strong>
                    </Typography>
                  </Box>
                ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="warning.main" fontSize={{ xs: "1rem", md: "1.25rem" }}>
                📉 개선 필요 제품
              </Typography>
              {heatmapData.productAverages
                .map((avg, idx) => ({
                  avg,
                  product: heatmapData.products[idx],
                }))
                .sort((a, b) => a.avg - b.avg)
                .slice(0, 3)
                .map((item, idx) => (
                  <Box key={idx} sx={{ mb: 1 }}>
                    <Typography variant="body2" fontSize={{ xs: "0.8rem", md: "0.875rem" }}>
                      {idx + 1}. {item.product}:{" "}
                      <strong style={{ color: getColor(item.avg) }}>
                        {item.avg.toFixed(2)}
                      </strong>
                    </Typography>
                  </Box>
                ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="success.main" fontSize={{ xs: "1rem", md: "1.25rem" }}>
                ✨ 핵심 인사이트
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }} fontSize={{ xs: "0.8rem", md: "0.875rem" }}>
                • 전체 평균:{" "}
                <strong>
                  {(
                    heatmapData.productAverages.reduce((a, b) => a + b, 0) /
                    heatmapData.productAverages.length
                  ).toFixed(2)}
                </strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }} fontSize={{ xs: "0.8rem", md: "0.875rem" }}>
                • 최고 질문:{" "}
                <strong>
                  {
                    heatmapData.questions[
                      heatmapData.questionAverages.indexOf(
                        Math.max(...heatmapData.questionAverages)
                      )
                    ]
                  }
                </strong>
              </Typography>
              <Typography variant="body2" fontSize={{ xs: "0.8rem", md: "0.875rem" }}>
                • 최저 질문:{" "}
                <strong>
                  {
                    heatmapData.questions[
                      heatmapData.questionAverages.indexOf(
                        Math.min(...heatmapData.questionAverages)
                      )
                    ]
                  }
                </strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 푸터 */}
      <Paper sx={{ p: 2, mt: 3, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          This slide is 100% editable. Adapt it to your needs and capture your
          audience's attention.
        </Typography>
      </Paper>
    </Box>
  );
};

export default HeatmapAnalysis;
