# WSL에서 Windows로 접속 문제 해결 가이드

## 현재 네트워크 정보
- **WSL IP**: 172.21.65.88
- **Windows 호스트 IP**: 10.255.255.254
- **서버 포트**: 8000

## 1. Windows에서 접속 방법

### 방법 1: WSL IP 사용 (권장)
```
http://172.21.65.88:8000
```

### 방법 2: localhost 사용 (포트 포워딩 필요)
```
http://localhost:8000
```

## 2. Windows에서 확인 사항

### 2.1 Windows PowerShell에서 WSL 포트 포워딩 확인
```powershell
# 관리자 권한 PowerShell에서 실행
netsh interface portproxy show all
```

### 2.2 Windows 방화벽 확인
```powershell
# 방화벽 규칙 확인
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*8000*"}

# 인바운드 규칙 추가 (필요시)
New-NetFirewallRule -DisplayName "WSL Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

### 2.3 WSL 네트워크 모드 확인
WSL2는 기본적으로 NAT 모드를 사용합니다.

## 3. 해결 방법들

### 방법 A: 포트 포워딩 설정 (관리자 권한 PowerShell)
```powershell
# WSL IP를 Windows localhost로 포워딩
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.21.65.88

# 포워딩 확인
netsh interface portproxy show all

# 포워딩 삭제 (필요시)
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0
```

### 방법 B: WSL의 .wslconfig 수정
`C:\Users\<사용자명>\.wslconfig` 파일 생성/수정:

```ini
[wsl2]
# 미러 모드 사용 (Windows 11 22H2 이상)
networkingMode=mirrored
localhostForwarding=true

# 또는 NAT 모드에서 localhost 포워딩 활성화
[wsl2]
localhostForwarding=true
```

수정 후 WSL 재시작:
```powershell
wsl --shutdown
```

### 방법 C: uvicorn을 모든 인터페이스에 바인딩 (이미 설정됨)
현재 설정:
```python
# src/main.py
uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```
✅ 이미 `0.0.0.0`으로 설정되어 있음

## 4. 현재 상태 진단

### WSL에서 확인
```bash
# 포트 리스닝 확인
ss -tuln | grep :8000

# WSL IP로 접속 테스트
curl http://172.21.65.88:8000/health

# localhost로 접속 테스트
curl http://localhost:8000/health
```

### Windows PowerShell에서 확인
```powershell
# WSL IP로 접속 테스트
Invoke-WebRequest -Uri http://172.21.65.88:8000/health

# localhost로 접속 테스트
Invoke-WebRequest -Uri http://localhost:8000/health

# 포트 리스닝 확인
Test-NetConnection -ComputerName localhost -Port 8000
```

## 5. 추천 해결 순서

1. **Windows에서 WSL IP로 직접 접속 시도**
   - `http://172.21.65.88:8000` 
   - 작동하면 포트 포워딩 문제

2. **WSL IP도 안 되면 방화벽 확인**
   - Windows Defender 방화벽 설정
   - WSL 방화벽 설정

3. **포트 포워딩 설정** (방법 A)
   - `localhost:8000`으로 접속하려면 필수

4. **.wslconfig 수정** (방법 B)
   - 근본적 해결책
   - WSL 재시작 필요

## 6. Frontend 설정 수정

### 프론트엔드가 WSL에서 실행되는 경우
`.env` 파일은 그대로 유지:
```
REACT_APP_API_URL=http://localhost:8000
```

### 프론트엔드가 Windows에서 실행되는 경우
`.env` 파일 수정:
```
REACT_APP_API_URL=http://172.21.65.88:8000
```

또는 환경변수로 설정:
```powershell
$env:REACT_APP_API_URL="http://172.21.65.88:8000"
npm start
```

## 7. 트러블슈팅

### localhost:8000이 안 되는 경우
- WSL2는 기본적으로 localhost 포워딩이 활성화되어 있어야 함
- Windows 11 빌드 확인: `winver`
- 최신 버전으로 업데이트 권장

### "연결할 수 없음" 오류
- WSL 서비스 재시작: `wsl --shutdown`
- 방화벽 임시 비활성화 테스트
- 포트 충돌 확인

### CORS 오류 (브라우저 콘솔)
- Backend CORS 설정 확인 (이미 설정됨)
- Frontend URL 확인

## 8. 빠른 테스트 스크립트

```bash
# WSL에서 실행
echo "=== WSL 네트워크 정보 ==="
echo "WSL IP: $(ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)"
echo "Windows IP: $(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')"
echo ""
echo "=== 포트 8000 리스닝 확인 ==="
ss -tuln | grep :8000
echo ""
echo "=== localhost 접속 테스트 ==="
curl -s http://localhost:8000/health
echo ""
echo "=== WSL IP 접속 테스트 ==="
curl -s http://172.21.65.88:8000/health
```

저장 후 실행:
```bash
chmod +x test_network.sh
./test_network.sh
```
