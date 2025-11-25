"""
Live Metrics API Router
실시간 트래픽 및 메트릭 스트리밍 (Container App Logs 기반)
"""
import asyncio
import json
import logging
import re
from collections import deque
from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from ..config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/live-metrics", tags=["live-metrics"])

settings = get_settings()


class MetricData(BaseModel):
    """메트릭 데이터"""
    timestamp: str
    request_count: int
    avg_duration: float
    error_count: int
    success_rate: float


class ConnectionManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.metrics_buffer = deque(maxlen=60)  # 최근 60초 데이터
        self.current_minute_requests: List[Dict[str, Any]] = []
        self.last_reset = datetime.utcnow()
        self._loop = None
        self.use_dummy_logs = True  # 기본값: 더미 로그 사용
    
    def set_event_loop(self, loop):
        """이벤트 루프 설정"""
        self._loop = loop
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket 연결됨. 총 연결 수: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket 연결 해제됨. 총 연결 수: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """모든 연결된 클라이언트에 메시지 전송"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"메시지 전송 실패: {e}")
                disconnected.append(connection)
        
        # 연결 해제된 클라이언트 제거
        for conn in disconnected:
            self.disconnect(conn)
    
    async def add_request_log_async(self, log_data: Dict[str, Any]):
        """요청 로그 추가 및 개별 요청 브로드캐스트 (비동기)"""
        self.current_minute_requests.append(log_data)
        
        # 개별 요청 이벤트 즉시 브로드캐스트
        if self.active_connections:
            logger.debug(f"📡 브로드캐스팅 new_request to {len(self.active_connections)} clients: {log_data['method']} {log_data['path']}")
            await self.broadcast({
                "type": "new_request",
                "data": log_data
            })
        else:
            logger.warning("⚠️ 활성 연결이 없어 브로드캐스트 건너뜀")
    
    def add_request_log(self, log_data: Dict[str, Any]):
        """요청 로그 추가 (동기 래퍼)"""
        self.current_minute_requests.append(log_data)
        
        # 비동기 브로드캐스트를 백그라운드 태스크로 실행
        if self.active_connections and self._loop:
            asyncio.run_coroutine_threadsafe(
                self.broadcast({
                    "type": "new_request",
                    "data": log_data
                }),
                self._loop
            )
    
    def calculate_metrics(self) -> MetricData:
        """현재 분의 메트릭 계산"""
        if not self.current_minute_requests:
            return MetricData(
                timestamp=datetime.utcnow().isoformat(),
                request_count=0,
                avg_duration=0,
                error_count=0,
                success_rate=100.0
            )
        
        total_requests = len(self.current_minute_requests)
        total_duration = sum(req.get('duration', 0) for req in self.current_minute_requests)
        error_count = sum(1 for req in self.current_minute_requests if req.get('status_code', 200) >= 400)
        success_count = total_requests - error_count
        
        return MetricData(
            timestamp=datetime.utcnow().isoformat(),
            request_count=total_requests,
            avg_duration=total_duration / total_requests if total_requests > 0 else 0,
            error_count=error_count,
            success_rate=(success_count / total_requests * 100) if total_requests > 0 else 100.0
        )
    
    def reset_minute_buffer(self):
        """분 단위 버퍼 리셋"""
        self.current_minute_requests.clear()
        self.last_reset = datetime.utcnow()


manager = ConnectionManager()


def parse_container_log(log_line: str) -> Dict[str, Any] | None:
    """
    Container App 로그 파싱
    FastAPI 로그 형식: INFO:     127.0.0.1:12345 - "GET /api/etf/list HTTP/1.1" 200 OK
    """
    try:
        # FastAPI/Uvicorn 로그 패턴
        # 예: INFO:     127.0.0.1:12345 - "GET /api/etf/list HTTP/1.1" 200 OK
        pattern = r'(?P<level>\w+):\s+(?P<client>[\d\.:]+)\s+-\s+"(?P<method>\w+)\s+(?P<path>[^\s]+)\s+HTTP/[\d\.]+"\s+(?P<status>\d+)'
        match = re.search(pattern, log_line)
        
        if match:
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'method': match.group('method'),
                'path': match.group('path'),
                'status_code': int(match.group('status')),
                'duration': 0,  # 로그에서 추출 불가, 기본값
            }
        
        # Application Insights 형식 로그 (duration 포함)
        # 예: {"timestamp": "...", "duration": 123, "resultCode": 200}
        if '{' in log_line and '}' in log_line:
            try:
                json_match = re.search(r'\{.*\}', log_line)
                if json_match:
                    data = json.loads(json_match.group())
                    if 'resultCode' in data or 'status' in data:
                        return {
                            'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
                            'method': data.get('method', 'GET'),
                            'path': data.get('url', '/'),
                            'status_code': data.get('resultCode', data.get('status', 200)),
                            'duration': data.get('duration', 0),
                        }
            except json.JSONDecodeError:
                pass
        
        return None
    except Exception as e:
        logger.debug(f"로그 파싱 오류: {e}")
        return None


async def stream_container_logs():
    """
    Container App 실시간 로그 스트리밍
    Production 환경에서는 미들웨어가 실제 트래픽을 전송하므로 더미 로그 불필요
    """
    import os
    import shutil

    # 토글 상태 확인: False면 더미 로그 생성 안 함
    if not manager.use_dummy_logs:
        logger.info("✅ 실제 트래픽 모드: 미들웨어에서 HTTP 요청을 Live Metrics에 전송합니다.")
        # 무한 대기 (더미 로그 생성 안 함)
        while True:
            await asyncio.sleep(60)
        return
    
    # 더미 로그 모드
    logger.warning(f"🎲 더미 로그 모드 활성화 (environment={settings.environment})")
    
    container_app_name = os.getenv("CONTAINER_APP_NAME", "ca-sk-appinsights")
    resource_group = os.getenv("RESOURCE_GROUP", "rg-sk-appinsights")
    
    # Azure CLI 설치 확인
    if not shutil.which("az"):
        logger.warning("Azure CLI가 설치되지 않았습니다. 더미 데이터 모드로 전환합니다.")
        await stream_dummy_logs()
        return
    
    try:
        # az containerapp logs show --name <name> --resource-group <rg> --follow --tail 0
        cmd = [
            "az", "containerapp", "logs", "show",
            "--name", container_app_name,
            "--resource-group", resource_group,
            "--follow",
            "--tail", "0"
        ]
        
        logger.info(f"Container App 로그 스트리밍 시작: {container_app_name}")
        
        # asyncio subprocess 사용
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # stdout가 None이 아닌지 확인
        if process.stdout is None:
            logger.error("프로세스 stdout이 None입니다.")
            await stream_dummy_logs()
            return
        
        # 로그 읽기 루프
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            
            # 로그 파싱
            log_line = line.decode('utf-8').strip()
            log_data = parse_container_log(log_line)
            if log_data:
                manager.add_request_log(log_data)
            
    except FileNotFoundError:
        logger.error("Azure CLI가 설치되지 않았습니다. 더미 데이터를 생성합니다.")
        # 더미 데이터 생성 모드
        await stream_dummy_logs()
    except Exception as e:
        logger.error(f"로그 스트리밍 오류: {e}", exc_info=True)
        await stream_dummy_logs()


async def stream_dummy_logs():
    """
    개발 모드: 더미 로그 생성
    """
    import random
    
    logger.info("🎲 더미 로그 생성 모드 시작!")
    
    while True:
        try:
            # 토글이 꺼지면 종료
            if not manager.use_dummy_logs:
                logger.info("🛑 더미 로그 생성 중단 (토글 비활성화)")
                break
            
            # 초당 1-3개의 더미 요청 생성 (CPU 절약)
            num_requests = random.randint(1, 3)
            logger.info(f"🔄 {num_requests}개 더미 요청 생성 중...")
            
            for _ in range(num_requests):
                log_data = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'method': random.choice(['GET', 'POST', 'PUT', 'DELETE']),
                    'path': random.choice(['/api/etf/list', '/api/stocks/AAPL', '/api/chat/', '/api/news/market']),
                    'status_code': random.choices([200, 201, 400, 404, 500], weights=[85, 5, 5, 3, 2])[0],
                    'duration': random.uniform(10, 300),
                }
                logger.debug(f"📤 더미 요청 생성: {log_data['method']} {log_data['path']} - {log_data['status_code']}")
                await manager.add_request_log_async(log_data)
            
            await asyncio.sleep(1.5)  # 1초 → 1.5초로 증가
        except Exception as e:
            logger.error(f"더미 로그 생성 오류: {e}", exc_info=True)
            await asyncio.sleep(1)


# 백그라운드 작업: 로그 스트리밍
log_streaming_task = None
log_streaming_started = False


async def start_log_streaming():
    """로그 스트리밍 시작"""
    global log_streaming_task, log_streaming_started
    
    if not log_streaming_started:
        log_streaming_started = True
        logger.info("🚀 로그 스트리밍 시작 중...")
        log_streaming_task = asyncio.create_task(stream_container_logs())
        logger.info("✅ 로그 스트리밍 태스크 생성 완료")


async def metrics_aggregation_loop():
    """
    1초마다 메트릭 계산 및 브로드캐스트
    """
    while True:
        try:
            # 메트릭 계산
            metrics = manager.calculate_metrics()
            
            # 클라이언트에 브로드캐스트
            await manager.broadcast({
                "type": "traffic_update",
                "data": metrics.model_dump()
            })
            
            # 1분마다 버퍼 리셋
            if (datetime.utcnow() - manager.last_reset).total_seconds() >= 60:
                manager.reset_minute_buffer()
            
            await asyncio.sleep(1)
            
        except Exception as e:
            logger.error(f"메트릭 집계 오류: {e}", exc_info=True)
            await asyncio.sleep(1)


@router.websocket("/ws/traffic")
async def websocket_traffic(websocket: WebSocket):
    """
    실시간 트래픽 데이터 스트리밍 WebSocket
    Container App 로그 기반 실시간 메트릭
    """
    logger.info("🔌 새로운 WebSocket 연결 요청")
    await manager.connect(websocket)
    
    # 이벤트 루프 설정
    manager.set_event_loop(asyncio.get_event_loop())
    logger.info("⚙️ 이벤트 루프 설정 완료")
    
    # 로그 스트리밍 시작
    logger.info("🚀 로그 스트리밍 시작 호출...")
    await start_log_streaming()
    logger.info("✅ 로그 스트리밍 시작 완료")
    
    # 메트릭 집계 태스크 시작
    aggregation_task = asyncio.create_task(metrics_aggregation_loop())
    logger.info("📊 메트릭 집계 태스크 시작")
    
    try:
        # 클라이언트로부터 메시지 대기 (연결 유지)
        while True:
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
            await asyncio.sleep(0.1)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("클라이언트 연결 해제")
    except Exception as e:
        logger.error(f"WebSocket 오류: {e}", exc_info=True)
        manager.disconnect(websocket)
    finally:
        # 집계 태스크 취소
        aggregation_task.cancel()
        logger.info("🛑 메트릭 집계 태스크 종료")


@router.get("/current")
async def get_current_metrics():
    """
    현재 메트릭 조회 (REST API)
    """
    metrics = manager.calculate_metrics()
    return metrics


@router.get("/history")
async def get_metrics_history(minutes: int = 60):
    """
    과거 메트릭 조회 (더미 데이터)
    
    - **minutes**: 조회할 시간 범위 (분)
    """
    import random

    # 더미 히스토리 데이터 생성
    history = []
    for i in range(min(minutes, 60)):
        timestamp = datetime.utcnow() - timedelta(minutes=minutes-i)
        history.append({
            "timestamp": timestamp.isoformat(),
            "request_count": random.randint(5, 50),
            "avg_duration": random.uniform(50, 200),
            "error_count": random.randint(0, 5),
            "success_rate": random.uniform(90, 100)
        })
    
    return {"history": history}


@router.post("/toggle-dummy-logs")
async def toggle_dummy_logs(enabled: bool):
    """
    더미 로그 생성 토글
    
    - **enabled**: True이면 더미 로그 사용, False면 실제 데이터 사용
    """
    manager.use_dummy_logs = enabled
    
    # 로그 스트리밍 재시작이 필요한 경우
    global log_streaming_task, log_streaming_started
    if log_streaming_task and not log_streaming_task.done():
        log_streaming_task.cancel()
        log_streaming_started = False
    
    # 활성화된 경우 새로운 스트리밍 시작
    if enabled:
        await start_log_streaming()
    
    return {
        "success": True,
        "use_dummy_logs": manager.use_dummy_logs,
        "environment": settings.environment,
        "message": f"더미 로그 모드: {'활성화' if enabled else '비활성화'}"
    }


@router.get("/dummy-logs-status")
async def get_dummy_logs_status():
    """
    더미 로그 생성 상태 조회
    """
    return {
        "use_dummy_logs": manager.use_dummy_logs,
        "environment": settings.environment,
        "is_production": settings.environment.lower() == "production"
    }


@router.on_event("startup")
async def startup_event():
    """앱 시작 시 로그 스트리밍 시작"""
    logger.info("🎯 Live Metrics 서비스 시작")
    # 환경에 따라 초기 토글 상태 설정
    # production에서는 실제 트래픽만 사용 (더미 로그 비활성화)
    manager.use_dummy_logs = settings.environment.lower() != "production"
    logger.info(f"초기 더미 로그 상태: {manager.use_dummy_logs} (environment: {settings.environment})")
    logger.info("✅ Production: 실제 HTTP 트래픽이 미들웨어를 통해 Live Metrics에 전송됩니다.")
    # WebSocket 연결 시 시작되도록 변경 (startup에서는 시작하지 않음)
