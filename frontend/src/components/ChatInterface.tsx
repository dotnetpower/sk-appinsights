import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  CircularProgress,
  Avatar,
  IconButton,
} from '@mui/material';
import { Send, Refresh } from '@mui/icons-material';
import { chatApi } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatApi.send(input);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('채팅 오류:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await chatApi.reset();
      setMessages([]);
    } catch (error) {
      console.error('대화 리셋 오류:', error);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">AI 에이전트 채팅</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleReset}
          disabled={loading}
        >
          대화 리셋
        </Button>
      </Box>

      <Paper sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {messages.length === 0 ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height="100%"
            >
              <Typography color="textSecondary">
                주식과 ETF에 대해 무엇이든 물어보세요!
              </Typography>
            </Box>
          ) : (
            <List>
              {messages.map((message, index) => (
                <ListItem
                  key={index}
                  sx={{
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box
                    display="flex"
                    gap={1}
                    flexDirection={message.role === 'user' ? 'row-reverse' : 'row'}
                    maxWidth="70%"
                  >
                    <Avatar
                      sx={{
                        bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                      }}
                    >
                      {message.role === 'user' ? 'U' : 'AI'}
                    </Avatar>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: message.role === 'user' ? 'primary.dark' : 'background.paper',
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                        {message.timestamp.toLocaleTimeString('ko-KR')}
                      </Typography>
                    </Paper>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
          {loading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={30} />
            </Box>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              multiline
              maxRows={3}
              disabled={loading}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              sx={{ alignSelf: 'flex-end' }}
            >
              <Send />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          <strong>예시 질문:</strong>
        </Typography>
        <Typography variant="body2" color="textSecondary">
          • AAPL 주식의 현재 가격은?
          <br />
          • SPY ETF에 대해 알려줘
          <br />
          • 마이크로소프트 회사 정보를 보여줘
          <br />
          • 테슬라를 검색해줘
        </Typography>
      </Paper>
    </Box>
  );
};

export default ChatInterface;
