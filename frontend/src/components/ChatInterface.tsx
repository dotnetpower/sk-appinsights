import React, { useState, useRef, useEffect } from "react";
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
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Send, Refresh } from "@mui/icons-material";
import { chatApi } from "../services/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      if (useStreaming) {
        // 스트리밍 모드
        const assistantMessage: Message = {
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        await chatApi.stream(input, (chunk: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage.role === "assistant") {
              lastMessage.content += chunk;
            }
            return updated;
          });
        });
      } else {
        // 일반 모드
        const response = await chatApi.send(input);
        const assistantMessage: Message = {
          role: "assistant",
          content: response.data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("채팅 오류:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.",
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
      console.error("대화 리셋 오류:", error);
    }
  };

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* 헤더 */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        sx={{ flexShrink: 0 }}
      >
        <Typography variant="h4">AI 에이전트 채팅</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={useStreaming}
                onChange={(e) => setUseStreaming(e.target.checked)}
                disabled={loading}
              />
            }
            label={useStreaming ? "스트리밍 모드" : "일반 모드"}
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
            disabled={loading}
          >
            대화 리셋
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexGrow: 1, overflow: "hidden" }}>
        {/* 메인 채팅 영역 */}
        <Paper
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 메시지 영역 */}
          <Box
            sx={{
              flexGrow: 1,
              overflow: "auto",
              p: 3,
              pb: 10, // 하단 입력창 공간 확보
            }}
          >
            {messages.length === 0 ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
              >
                <Typography color="textSecondary" variant="h6">
                  주식과 ETF에 대해 무엇이든 물어보세요! 👉
                </Typography>
              </Box>
            ) : (
              <List>
                {messages.map((message, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      justifyContent:
                        message.role === "user" ? "flex-end" : "flex-start",
                      mb: 2,
                    }}
                  >
                    <Box
                      display="flex"
                      gap={1}
                      flexDirection={
                        message.role === "user" ? "row-reverse" : "row"
                      }
                      maxWidth="80%"
                    >
                      <Avatar
                        sx={{
                          bgcolor:
                            message.role === "user"
                              ? "primary.main"
                              : "secondary.main",
                          flexShrink: 0,
                        }}
                      >
                        {message.role === "user" ? "U" : "AI"}
                      </Avatar>
                      <Paper
                        sx={{
                          p: 2,
                          bgcolor:
                            message.role === "user"
                              ? "primary.dark"
                              : "background.paper",
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {message.content}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ mt: 1, display: "block" }}
                        >
                          {message.timestamp.toLocaleTimeString("ko-KR")}
                        </Typography>
                      </Paper>
                    </Box>
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>
            )}
            {loading && (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                py={2}
              >
                <CircularProgress size={30} />
                <Typography variant="body2" color="textSecondary" ml={2}>
                  {useStreaming ? "응답 생성 중..." : "응답 대기 중..."}
                </Typography>
              </Box>
            )}
          </Box>

          {/* 플로팅 입력창 */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              bgcolor: "background.paper",
              borderTop: 1,
              borderColor: "divider",
              boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
            }}
          >
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                placeholder="메시지를 입력하세요..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSend()
                }
                multiline
                maxRows={4}
                disabled={loading}
                variant="outlined"
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                sx={{
                  alignSelf: "flex-end",
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                  "&:disabled": {
                    bgcolor: "action.disabledBackground",
                  },
                }}
              >
                <Send />
              </IconButton>
            </Box>
          </Box>
        </Paper>

        {/* 사이드바 - 예시 질문 */}
        <Paper
          sx={{
            width: "300px",
            p: 2,
            flexShrink: 0,
            overflow: "auto",
          }}
        >
          <Typography variant="h6" gutterBottom>
            💡 예시 질문
          </Typography>
          <List dense>
            {[
              "AAPL 주식의 현재 가격은?",
              "SPY ETF에 대해 알려줘",
              "TSLA 주식 정보를 보여줘",
              "마이크로소프트 회사 정보",
              "QQQ ETF는 어떤 종목들로 구성되어 있어?",
              "애플 주식 최근 뉴스는?",
              "NVDA 주가 추세를 분석해줘",
              "테슬라를 검색해줘",
            ].map((question, index) => (
              <ListItem
                key={index}
                button
                onClick={() => {
                  setInput(question);
                }}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Typography variant="body2">{question}</Typography>
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" gutterBottom>
              ℹ️ 사용 가능한 기능
            </Typography>
            <Typography variant="caption" color="textSecondary" component="div">
              • 주식 가격 조회
              <br />
              • ETF 정보 검색
              <br />
              • 회사 프로필 확인
              <br />
              • 최신 뉴스 조회
              <br />• 주가 추세 분석
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ChatInterface;
