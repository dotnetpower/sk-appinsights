"""
Azure Cosmos DB 클라이언트
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.container import ContainerProxy
from azure.cosmos.database import DatabaseProxy
from azure.cosmos.exceptions import CosmosHttpResponseError
from azure.identity import DefaultAzureCredential
from opentelemetry import trace
from opentelemetry.trace import SpanKind

from ..config import get_settings

# OpenTelemetry tracer
tracer = trace.get_tracer(__name__)


class CosmosDBService:
    """Cosmos DB 서비스"""
    
    client: Optional[CosmosClient]
    database: Optional[DatabaseProxy]
    container: Optional[ContainerProxy]
    
    def __init__(self):
        settings = get_settings()
        self.enabled = bool(settings.cosmos_endpoint)
        
        if not self.enabled:
            print("Cosmos DB is not configured - running in read-only mode")
            self.client = None
            self.database = None
            self.container = None
            return
        
        # Azure AD 인증 또는 Key 인증 사용
        try:
            
            # Azure AD 인증
            credential = DefaultAzureCredential()
            
            # Connection policy로 timeout 및 retry 설정
            self.client = CosmosClient(
                settings.cosmos_endpoint, 
                credential,
                connection_timeout=10,  # 연결 timeout 10초
                request_timeout=30,     # 요청 timeout 30초
            )
            print("Using Cosmos DB with Azure AD authentication (timeout: 30s)")
                
            self.database_name = settings.cosmos_database_name
            self.container_name = settings.cosmos_container_name
            self.database = None
            self.container = None
            self._initialize_database()
        except Exception as e:
            print(f"Error creating Cosmos DB client: {e}")
            self.enabled = False
            self.client = None
            self.database = None
            self.container = None
    
    def _initialize_database(self):
        """데이터베이스 및 컨테이너 초기화"""
        if not self.enabled or not self.client:
            return
            
        try:
            self.database = self.client.create_database_if_not_exists(
                id=self.database_name
            )
            self.container = self.database.create_container_if_not_exists(
                id=self.container_name,
                partition_key=PartitionKey(path="/symbol"),
                offer_throughput=400
            )
        except Exception as e:
            print(f"Error initializing Cosmos DB: {e}")
            self.enabled = False
    
    def save_etf_data(self, symbol: str, data: Dict[str, Any]) -> bool:
        """ETF 데이터 저장"""
        if not self.enabled or not self.container:
            return False
            
        with tracer.start_as_current_span(
            "create_item",
            kind=trace.SpanKind.CLIENT,
            attributes={
                "db.system": "cosmosdb",
                "db.operation": "create_item",
                "db.name": self.database_name,
                "db.cosmosdb.container": self.container_name,
                "db.statement": "INSERT",
                "peer.service": "COSMOS",
                "component": "cosmosdb",
                "az.namespace": "Microsoft.DocumentDB",
                "symbol": symbol,
                "item_type": "etf"
            }
        ) as span:
            try:
                item = {
                    "id": f"etf_{symbol}_{datetime.now(timezone.utc).isoformat()}",
                    "symbol": symbol,
                    "type": "etf",
                    "data": data,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "_ts": int(datetime.now(timezone.utc).timestamp())
                }
                self.container.create_item(body=item)
                span.set_attribute("db.response.status", "success")
                return True
            except CosmosHttpResponseError as e:
                span.set_attribute("db.response.status", "error")
                span.set_attribute("error.type", type(e).__name__)
                span.record_exception(e)
                print(f"Error saving ETF data for {symbol}: {e}")
                return False
    
    def save_stock_data(self, symbol: str, data: Dict[str, Any]) -> bool:
        """주식 데이터 저장"""
        if not self.enabled or not self.container:
            return False
            
        with tracer.start_as_current_span(
            "create_item",
            kind=trace.SpanKind.CLIENT,
            attributes={
                "db.system": "cosmosdb",
                "db.operation": "create_item",
                "db.name": self.database_name,
                "db.cosmosdb.container": self.container_name,
                "db.statement": "INSERT",
                "peer.service": "COSMOS",
                "component": "cosmosdb",
                "az.namespace": "Microsoft.DocumentDB",
                "symbol": symbol,
                "item_type": "stock"
            }
        ) as span:
            try:
                item = {
                    "id": f"stock_{symbol}_{datetime.now(timezone.utc).isoformat()}",
                    "symbol": symbol,
                    "type": "stock",
                    "data": data,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "_ts": int(datetime.now(timezone.utc).timestamp())
                }
                self.container.create_item(body=item)
                span.set_attribute("db.response.status", "success")
                return True
            except CosmosHttpResponseError as e:
                span.set_attribute("db.response.status", "error")
                span.set_attribute("error.type", type(e).__name__)
                span.record_exception(e)
                print(f"Error saving stock data for {symbol}: {e}")
                return False
    
    def get_latest_data(self, symbol: str, data_type: str = "stock") -> Optional[Dict[str, Any]]:
        """최신 데이터 조회"""
        if not self.enabled or not self.container:
            return None
            
        query = f"""
            SELECT TOP 1 * FROM c 
            WHERE c.symbol = @symbol AND c.type = @type 
            ORDER BY c._ts DESC
        """
        
        with tracer.start_as_current_span(
            "query_items",
            kind=trace.SpanKind.CLIENT,
            attributes={
                "db.system": "cosmosdb",
                "db.operation": "query_items",
                "db.name": self.database_name,
                "db.cosmosdb.container": self.container_name,
                "db.statement": query,
                "peer.service": "COSMOS",
                "component": "cosmosdb",
                "az.namespace": "Microsoft.DocumentDB",
                "symbol": symbol,
                "data_type": data_type
            }
        ) as span:
            try:
                items = list(self.container.query_items(
                    query=query,
                    parameters=[
                        {"name": "@symbol", "value": symbol},
                        {"name": "@type", "value": data_type}
                    ],
                    enable_cross_partition_query=True
                ))
                span.set_attribute("db.response.count", len(items))
                span.set_attribute("db.response.status", "success")
                return items[0] if items else None
            except CosmosHttpResponseError as e:
                span.set_attribute("db.response.status", "error")
                span.set_attribute("db.response.status_code", str(e.status_code))
                span.set_attribute("error.type", type(e).__name__)
                span.record_exception(e)
                print(f"Cosmos DB HTTP error getting latest data for {symbol}: {e.status_code}")
                return None
            except Exception as e:
                span.set_attribute("db.response.status", "error")
                span.set_attribute("error.type", type(e).__name__)
                span.record_exception(e)
                print(f"Error getting latest data for {symbol}: {e}")
                return None
    
    def get_all_etfs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """모든 ETF 데이터 조회"""
        if not self.enabled or not self.container:
            return []
            
        # 각 심볼별 최신 데이터만 가져오기
        query = """
            SELECT c.symbol, c.data, c.timestamp
            FROM c 
            WHERE c.type = 'etf'
            ORDER BY c._ts DESC
        """
        
        with tracer.start_as_current_span(
            "query_items",
            kind=trace.SpanKind.CLIENT,
            attributes={
                "db.system": "cosmosdb",
                "db.operation": "query_items",
                "db.name": self.database_name,
                "db.cosmosdb.container": self.container_name,
                "db.statement": query,
                "peer.service": "COSMOS",
                "component": "cosmosdb",
                "az.namespace": "Microsoft.DocumentDB",
                "max_item_count": limit
            }
        ) as span:
            try:
                items = list(self.container.query_items(
                    query=query,
                    enable_cross_partition_query=True,
                    max_item_count=limit
                ))
                
                # 중복 제거 (심볼별 최신 데이터만)
                seen_symbols = set()
                unique_items = []
                for item in items:
                    if item['symbol'] not in seen_symbols:
                        seen_symbols.add(item['symbol'])
                        unique_items.append(item)
                
                span.set_attribute("db.response.count", len(items))
                span.set_attribute("db.response.unique_count", len(unique_items))
                span.set_attribute("db.response.status", "success")
                return unique_items
            except CosmosHttpResponseError as e:
                span.set_attribute("db.response.status", "error")
                span.set_attribute("db.response.status_code", str(e.status_code))
                span.set_attribute("error.type", type(e).__name__)
                span.record_exception(e)
                print(f"Cosmos DB HTTP error getting all ETFs: {e.status_code} - {e.message}")
                return []
            except Exception as e:
                span.set_attribute("db.response.status", "error")
                span.set_attribute("error.type", type(e).__name__)
                span.record_exception(e)
                print(f"Error getting all ETFs: {e}")
                return []
    
    def delete_etf_data(self, symbol: str) -> bool:
        """ETF 데이터 삭제 (해당 심볼의 모든 기록)"""
        if not self.enabled or not self.container:
            return False
            
        try:
            # 심볼의 모든 문서 조회
            query = """
                SELECT c.id FROM c 
                WHERE c.symbol = @symbol AND c.type = 'etf'
            """
            items = list(self.container.query_items(
                query=query,
                parameters=[{"name": "@symbol", "value": symbol}],
                enable_cross_partition_query=True
            ))
            
            if not items:
                return False
            
            # 모든 문서 삭제
            for item in items:
                self.container.delete_item(
                    item=item['id'],
                    partition_key=symbol
                )
            
            return True
        except CosmosHttpResponseError as e:
            print(f"Error deleting ETF data for {symbol}: {e}")
            return False
    
    def search_data(self, query_text: str, limit: int = 20) -> List[Dict[str, Any]]:
        """데이터 검색"""
        if not self.enabled or not self.container:
            return []
            
        query = f"""
            SELECT * FROM c 
            WHERE CONTAINS(c.symbol, @query) 
            OR CONTAINS(c.data.name, @query)
            ORDER BY c._ts DESC
        """
        
        with tracer.start_as_current_span(
            "query_items",
            kind=trace.SpanKind.CLIENT,
            attributes={
                "db.system": "cosmosdb",
                "db.operation": "query_items",
                "db.name": self.database_name,
                "db.cosmosdb.container": self.container_name,
                "db.statement": query,
                "peer.service": "COSMOS",
                "component": "cosmosdb",
                "az.namespace": "Microsoft.DocumentDB",
                "search_query": query_text,
                "max_item_count": limit
            }
        ) as span:
            try:
                items = list(self.container.query_items(
                    query=query,
                    parameters=[{"name": "@query", "value": query_text.upper()}],
                    enable_cross_partition_query=True,
                    max_item_count=limit
                ))
                span.set_attribute("db.response.count", len(items))
                span.set_attribute("db.response.status", "success")
                return items
            except Exception as e:
                span.set_attribute("db.response.status", "error")
                span.set_attribute("error.type", type(e).__name__)
                span.record_exception(e)
                print(f"Error searching data: {e}")
                return []


# 싱글톤 인스턴스
_cosmos_service: Optional[CosmosDBService] = None


def get_cosmos_service() -> CosmosDBService:
    """Cosmos DB 서비스 싱글톤"""
    global _cosmos_service
    if _cosmos_service is None:
        _cosmos_service = CosmosDBService()
    return _cosmos_service
