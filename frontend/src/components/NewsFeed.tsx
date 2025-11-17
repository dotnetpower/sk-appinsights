import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Link,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { newsApi } from '../services/api';

interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  category: string;
}

const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('general');

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const response = await newsApi.getMarket(category, 50);
        setNews(response.data || []);
      } catch (error) {
        console.error('뉴스 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [category]);

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value);
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
        <Typography variant="h4">시장 뉴스</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>카테고리</InputLabel>
          <Select value={category} onChange={handleCategoryChange} label="카테고리">
            <MenuItem value="general">일반</MenuItem>
            <MenuItem value="forex">외환</MenuItem>
            <MenuItem value="crypto">암호화폐</MenuItem>
            <MenuItem value="merger">인수합병</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {news.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">뉴스가 없습니다.</Typography>
        </Paper>
      ) : (
        <List>
          {news.map((item, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                <ListItemText
                  primary={
                    <Link
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                    >
                      {item.headline}
                    </Link>
                  }
                  secondary={
                    <Box mt={1}>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {item.summary}
                      </Typography>
                      <Box display="flex" gap={1} alignItems="center">
                        <Chip label={item.source} size="small" variant="outlined" />
                        <Typography variant="caption" color="textSecondary">
                          {new Date(item.datetime * 1000).toLocaleString('ko-KR')}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
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
