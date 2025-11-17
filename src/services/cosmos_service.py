"""
Azure Cosmos DB 클라이언트
"""
from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos.exceptions import CosmosHttpResponseError
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
from ..config import get_settings


class CosmosDBService:
    """Cosmos DB 서비스"""
    
    def __init__(self):
        settings = get_settings()
        self.client = CosmosClient(settings.cosmos_endpoint, settings.cosmos_key)
        self.database_name = settings.cosmos_database_name
        self.container_name = settings.cosmos_container_name
        self.database = None
        self.container = None
        self._initialize_database()
    
    def _initialize_database(self):
        """데이터베이스 및 컨테이너 초기화"""
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
    
    def save_etf_data(self, symbol: str, data: Dict[str, Any]) -> bool:
        """ETF 데이터 저장"""
        try:
            item = {
                "id": f"etf_{symbol}_{datetime.utcnow().isoformat()}",
                "symbol": symbol,
                "type": "etf",
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "_ts": int(datetime.utcnow().timestamp())
            }
            self.container.create_item(body=item)
            return True
        except CosmosHttpResponseError as e:
            print(f"Error saving ETF data for {symbol}: {e}")
            return False
    
    def save_stock_data(self, symbol: str, data: Dict[str, Any]) -> bool:
        """주식 데이터 저장"""
        try:
            item = {
                "id": f"stock_{symbol}_{datetime.utcnow().isoformat()}",
                "symbol": symbol,
                "type": "stock",
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "_ts": int(datetime.utcnow().timestamp())
            }
            self.container.create_item(body=item)
            return True
        except CosmosHttpResponseError as e:
            print(f"Error saving stock data for {symbol}: {e}")
            return False
    
    def get_latest_data(self, symbol: str, data_type: str = "stock") -> Optional[Dict[str, Any]]:
        """최신 데이터 조회"""
        try:
            query = f"""
                SELECT TOP 1 * FROM c 
                WHERE c.symbol = @symbol AND c.type = @type 
                ORDER BY c._ts DESC
            """
            items = list(self.container.query_items(
                query=query,
                parameters=[
                    {"name": "@symbol", "value": symbol},
                    {"name": "@type", "value": data_type}
                ],
                enable_cross_partition_query=True
            ))
            return items[0] if items else None
        except Exception as e:
            print(f"Error getting latest data for {symbol}: {e}")
            return None
    
    def get_all_etfs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """모든 ETF 데이터 조회"""
        try:
            # 각 심볼별 최신 데이터만 가져오기
            query = """
                SELECT c.symbol, c.data, c.timestamp
                FROM c 
                WHERE c.type = 'etf'
                ORDER BY c._ts DESC
            """
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
            
            return unique_items
        except Exception as e:
            print(f"Error getting all ETFs: {e}")
            return []
    
    def search_data(self, query_text: str, limit: int = 20) -> List[Dict[str, Any]]:
        """데이터 검색"""
        try:
            query = f"""
                SELECT * FROM c 
                WHERE CONTAINS(c.symbol, @query) 
                OR CONTAINS(c.data.name, @query)
                ORDER BY c._ts DESC
            """
            items = list(self.container.query_items(
                query=query,
                parameters=[{"name": "@query", "value": query_text.upper()}],
                enable_cross_partition_query=True,
                max_item_count=limit
            ))
            return items
        except Exception as e:
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
