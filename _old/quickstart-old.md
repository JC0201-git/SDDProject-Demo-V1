# Quickstart: 熱泵遠端管理儀表板開發指南

**Date**: 2026-02-17  
**Phase**: 1 - Design & Contracts  
**Target Audience**: 開發人員

## Overview

本指南提供熱泵遠端管理儀表板的開發環境設置、程式碼範例、測試指令及最佳實踐。遵循本指南可快速上手並貢獻程式碼。

---

## Prerequisites

### 系統需求

| Component | Requirement |
|-----------|-------------|
| **OS** | macOS 12+, Ubuntu 20.04+, Windows 10+ (with WSL2) |
| **Python** | 3.11+ |
| **Node.js** | 18+ (for frontend) |
| **PostgreSQL** | 15+ |
| **Git** | 2.30+ |
| **Docker** (Optional) | 20+ (for containerized development) |

### 安裝必要工具

```bash
# macOS (Homebrew)
brew install python@3.11 node@18 postgresql@15

# Ubuntu
sudo apt update
sudo apt install python3.11 python3.11-venv nodejs npm postgresql-15

# Windows (via WSL2)
# Follow Ubuntu instructions above
```

---

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/Demo-v1.git
cd Demo-v1
git checkout 001-heat-pump-remote-dashboard
```

### 2. Backend Setup (FastAPI)

#### 2.1 創建虛擬環境

```bash
cd Demo-v1-api
python3.11 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows
```

#### 2.2 安裝相依套件

創建 `requirements.txt`:

```txt
# requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.6.0
pydantic-settings==2.1.0
sqlalchemy==2.0.25
asyncpg==0.29.0
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
websockets==12.0
redis==5.0.1
pytest==7.4.3
pytest-asyncio==0.23.3
httpx==0.26.0
pytest-cov==4.1.0
```

```bash
pip install -r requirements.txt
```

#### 2.3 資料庫設置

安裝 TimescaleDB:

```bash
# macOS
brew install timescaledb
timescaledb-tune

# Ubuntu
sudo add-apt-repository ppa:timescale/timescaledb-ppa
sudo apt update
sudo apt install timescaledb-2-postgresql-15
sudo timescaledb-tune
```

創建資料庫:

```bash
# 啟動 PostgreSQL
brew services start postgresql@15  # macOS
sudo systemctl start postgresql     # Ubuntu

# 創建資料庫
psql postgres
```

```sql
-- In psql
CREATE DATABASE heatpump_dashboard;
\c heatpump_dashboard
CREATE EXTENSION IF NOT EXISTS timescaledb;
\q
```

執行 schema migration:

```bash
# Copy schema from data-model.md
psql heatpump_dashboard < schema.sql
```

創建 `.env` 檔案:

```env
# .env
DATABASE_URL=postgresql://localhost:5432/heatpump_dashboard
SECRET_KEY=your-secret-key-change-in-production
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000
```

#### 2.4 啟動開發伺服器

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

驗證:
```bash
curl http://localhost:8000/docs
# 應看到 FastAPI 自動產生的 OpenAPI 文檔
```

---

### 3. Frontend Setup (React 16.13.1)

#### 3.1 安裝相依套件

```bash
cd Demo-v1-web
npm install
```

#### 3.2 配置 API Base URL

編輯 `src/config.js`:

```javascript
// src/config.js (add heat pump API endpoints)
export const config = {
  // ... existing config
  heatPumpAPI: {
    baseURL: window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/api',
    wsBaseURL: 'ws://' + window.location.hostname + ':8000'
  }
};
```

#### 3.3 啟動開發伺服器

```bash
npm start
```

瀏覽器自動開啟 `http://localhost:3000`。

---

## Development Workflow

### Backend Code Structure

```
Demo-v1-api/
├── app/
│   ├── main.py                # FastAPI app 入口
│   ├── config.py              # 環境變數配置
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── device.py
│   │   ├── user.py
│   │   ├── realtime_data.py
│   │   └── control_command.py
│   ├── schemas/               # Pydantic schemas (API contracts)
│   │   ├── device.py
│   │   ├── user.py
│   │   └── control.py
│   ├── services/              # Business logic
│   │   ├── device_service.py
│   │   ├── realtime_service.py
│   │   ├── control_service.py
│   │   └── auth_service.py
│   ├── api/
│   │   ├── routes/            # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── devices.py
│   │   │   ├── control.py
│   │   │   ├── realtime.py    # WebSocket endpoints
│   │   │   └── historical.py
│   │   └── middleware/
│   │       ├── auth.py        # JWT verification
│   │       └── permission.py  # Role-based access control
│   ├── db/
│   │   ├── database.py        # Database connection
│   │   └── session.py         # Session management
│   └── workers/
│       ├── data_retention.py  # 30-day cleanup job
│       └── command_timeout.py # Command timeout monitor
└── tests/
    ├── unit/
    ├── integration/
    └── contract/
```

### Frontend Code Structure

```
Demo-v1-web/
├── src/
│   ├── components/
│   │   └── DemoV1/
│   │       └── HeatPump/              # NEW
│   │           ├── DeviceStatusCard.js
│   │           ├── DynamicFlowDiagram.js
│   │           ├── ControlPanel.js
│   │           └── TrendChart.js
│   ├── pages/
│   │   └── DemoV1/
│   │       └── HeatPump/              # NEW
│   │           ├── Dashboard.js
│   │           ├── DeviceDetail.js
│   │           └── RemoteControl.js
│   ├── services/
│   │   └── HeatPumpService.js         # NEW: API client
│   ├── context/
│   │   └── HeatPumpContext.js         # NEW: Global state
│   └── hooks/
│       ├── useDeviceRealtime.js       # NEW: WebSocket hook
│       └── useDeviceControl.js        # NEW: Control command hook
└── tests/
```

---

## Code Examples

### Backend: FastAPI Endpoint

```python
# app/api/routes/devices.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.models.user import User
from app.schemas.device import Device, DeviceCreate, DeviceSummary
from app.services.device_service import DeviceService
from app.api.middleware.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/", response_model=list[Device])
async def list_devices(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得所有設備清單 (FR-003, FR-004)"""
    service = DeviceService(db)
    devices = await service.get_all_devices(status_filter=status)
    return devices

@router.get("/summary", response_model=DeviceSummary)
async def get_devices_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得設備總覽統計 (FR-003)"""
    service = DeviceService(db)
    summary = await service.get_summary()
    return summary

@router.get("/{device_id}", response_model=Device)
async def get_device(
    device_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得單一設備詳細資訊 (FR-005)"""
    service = DeviceService(db)
    device = await service.get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device
```

### Backend: WebSocket Real-time Data

```python
# app/api/routes/realtime.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from datetime import datetime
import asyncio
import json

router = APIRouter()

# In-memory connection manager (production 使用 Redis Pub/Sub)
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, device_id: str, websocket: WebSocket):
        await websocket.accept()
        if device_id not in self.active_connections:
            self.active_connections[device_id] = []
        self.active_connections[device_id].append(websocket)
    
    def disconnect(self, device_id: str, websocket: WebSocket):
        if device_id in self.active_connections:
            self.active_connections[device_id].remove(websocket)
    
    async def broadcast(self, device_id: str, message: dict):
        if device_id in self.active_connections:
            for connection in self.active_connections[device_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/devices/{device_id}")
async def websocket_device_data(
    websocket: WebSocket,
    device_id: str,
    token: str = Query(...)
):
    # 1. Validate token
    user = await validate_session_token(token)
    if not user:
        await websocket.close(code=1008, reason="Unauthorized")
        return
    
    # 2. Accept connection
    await manager.connect(device_id, websocket)
    
    try:
        # 3. Heartbeat task
        async def heartbeat():
            while True:
                await asyncio.sleep(30)
                await websocket.send_json({
                    "type": "ping",
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                })
        
        heartbeat_task = asyncio.create_task(heartbeat())
        
        # 4. Listen for client messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "pong":
                # Received pong, connection alive
                pass
            elif data.get("type") == "subscription_update":
                # Client requesting specific parameters
                # TODO: Update subscription preferences
                pass
    
    except WebSocketDisconnect:
        manager.disconnect(device_id, websocket)
        heartbeat_task.cancel()

# Device data ingestion endpoint (called by IoT devices)
@router.post("/ingest/{device_code}")
async def ingest_device_data(
    device_code: str,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """接收設備推送的資料 (FR-001)"""
    # 1. Validate device
    device = await get_device_by_code(device_code, db)
    if not device:
        raise HTTPException(404, "Device not found")
    
    # 2. Store in database
    await store_realtime_data(device.id, data, db)
    
    # 3. Update device snapshot
    await update_device_current_values(device.id, data, db)
    
    # 4. Check thresholds (anomaly detection)
    anomalies = await check_thresholds(device.id, data, db)
    
    # 5. Broadcast to WebSocket clients
    message = {
        "type": "realtime_data",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "deviceId": str(device.id),
        "data": data
    }
    await manager.broadcast(str(device.id), message)
    
    # 6. Broadcast anomaly alerts
    for anomaly in anomalies:
        alert_message = {
            "type": "anomaly_alert",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "deviceId": str(device.id),
            "alert": anomaly
        }
        await manager.broadcast(str(device.id), alert_message)
    
    return {"status": "ok"}
```

### Backend: Control Command

```python
# app/api/routes/control.py
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.control import ControlCommandCreate, ControlCommand, CommandStatus
from app.services.control_service import ControlService
from app.api.middleware.auth import get_current_user
from app.api.middleware.permission import require_role

router = APIRouter(prefix="/control", tags=["Control"])

@router.post("/commands", status_code=202, response_model=ControlCommand)
@require_role("operator")
async def send_control_command(
    command: ControlCommandCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """送出遠端控制指令 (FR-012, FR-013, FR-014)"""
    service = ControlService(db)
    
    # 1. Validate device status
    device = await service.get_device(command.device_id)
    if device.status == "offline":
        raise HTTPException(404, detail="DEVICE_OFFLINE")
    
    # 2. Validate command for device state
    if command.command_type == "set_target_temp" and device.mode == "auto":
        raise HTTPException(422, detail="DEVICE_IN_AUTO_MODE")
    
    # 3. Create command record
    cmd = await service.create_command(
        device_id=command.device_id,
        user_id=current_user.id,
        command_type=command.command_type,
        command_payload=command.command_payload
    )
    
    # 4. Queue command to device (async)
    await service.queue_command(cmd)
    
    # 5. Return immediately (202 Accepted)
    return cmd

@router.get("/commands/{command_id}", response_model=ControlCommand)
async def get_command_status(
    command_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """查詢指令執行狀態 (FR-014)"""
    service = ControlService(db)
    cmd = await service.get_command(command_id)
    if not cmd:
        raise HTTPException(404, "Command not found")
    return cmd
```

### Frontend: React Hook for WebSocket

```javascript
// src/hooks/useDeviceRealtime.js
import { useState, useEffect, useRef, useContext } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/Context';
import { config } from '../config';

export function useDeviceRealtime(deviceId) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | connected | disconnected
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const { token } = useContext(AuthContext);
  
  useEffect(() => {
    if (!deviceId || !token) return;
    
    let reconnectInterval = 1000; // Start with 1s
    
    const connect = () => {
      const ws = new WebSocket(
        `${config.heatPumpAPI.wsBaseURL}/ws/devices/${deviceId}?token=${token}`
      );
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected:', deviceId);
        setStatus('connected');
        reconnectInterval = 1000; // Reset reconnect interval
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'realtime_data':
            // Update real-time data (FR-002: <1s latency)
            setData(message.data);
            break;
          
          case 'anomaly_alert':
            // Show anomaly alert (FR-009)
            toast.error(
              `${message.alert.message}: ${message.alert.parameterName} = ${message.alert.currentValue}`,
              { autoClose: 5000 }
            );
            break;
          
          case 'device_status_change':
            // Device status changed (FR-018)
            if (message.status.current === 'offline') {
              toast.warning('設備已離線', { autoClose: 3000 });
              setStatus('disconnected');
            }
            break;
          
          case 'ping':
            // Respond to heartbeat ping
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('disconnected');
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setStatus('disconnected');
        
        // Auto-reconnect with exponential backoff (FR-018)
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Reconnecting WebSocket...');
          connect();
        }, reconnectInterval);
        
        reconnectInterval = Math.min(reconnectInterval * 2, 60000); // Max 60s
      };
    };
    
    connect();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [deviceId, token]);
  
  return { data, status };
}
```

### Frontend: Control Panel Component

```javascript
// src/components/DemoV1/HeatPump/ControlPanel.js
import React, { useState } from 'react';
import { Button, Modal, Form, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from 'react-query';
import HeatPumpService from '../../../services/HeatPumpService';

const ControlPanel = ({ deviceId, currentMode, currentTargetTemp }) => {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingCommand, setPendingCommand] = useState(null);
  const [targetTemp, setTargetTemp] = useState(currentTargetTemp || 50);
  
  // Send control command mutation
  const sendCommandMutation = useMutation(
    (command) => HeatPumpService.sendControlCommand(command),
    {
      onSuccess: async (response) => {
        // Poll for command status (FR-014: max 3s)
        const maxAttempts = 6; // 6 * 500ms = 3s
        let attempt = 0;
        
        while (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const status = await HeatPumpService.getCommandStatus(response.id);
          
          if (status.status === 'confirmed') {
            toast.success(t('control.command_confirmed'));
            return;
          } else if (status.status === 'timeout') {
            toast.error(t('control.command_timeout'));
            return;
          } else if (status.status === 'failed') {
            toast.error(status.errorMessage || t('control.command_failed'));
            return;
          }
          
          attempt++;
        }
        
        toast.warning(t('control.command_pending'));
      },
      onError: (error) => {
        if (error.response?.status === 404) {
          // FR-017: Device offline error
          toast.error(t('control.device_offline'));
        } else if (error.response?.status === 403) {
          toast.error(t('control.permission_denied'));
        } else if (error.response?.status === 422) {
          toast.error(error.response.data.message);
        } else {
          toast.error(t('control.network_error'));
        }
      }
    }
  );
  
  const handleSwitchMode = (mode) => {
    // FR-015: Confirmation dialog
    setPendingCommand({
      type: 'switch_mode',
      payload: { mode }
    });
    setShowConfirm(true);
  };
  
  const handleSetTargetTemp = () => {
    if (currentMode === 'auto') {
      toast.warning(t('control.cannot_set_temp_in_auto_mode'));
      return;
    }
    
    setPendingCommand({
      type: 'set_target_temp',
      payload: { targetTemp }
    });
    setShowConfirm(true);
  };
  
  const confirmCommand = () => {
    sendCommandMutation.mutate({
      deviceId,
      commandType: pendingCommand.type,
      commandPayload: pendingCommand.payload
    });
    setShowConfirm(false);
  };
  
  return (
    <div className="control-panel card">
      <div className="card-header">
        <h5>{t('control.panel_title')}</h5>
      </div>
      <div className="card-body">
        {/* Mode Switch */}
        <div className="mb-3">
          <label className="form-label">{t('control.mode')}</label>
          <div className="btn-group w-100">
            <Button
              variant={currentMode === 'auto' ? 'primary' : 'outline-primary'}
              onClick={() => handleSwitchMode('auto')}
              disabled={sendCommandMutation.isLoading}
            >
              {t('control.auto_mode')}
            </Button>
            <Button
              variant={currentMode === 'manual' ? 'primary' : 'outline-primary'}
              onClick={() => handleSwitchMode('manual')}
              disabled={sendCommandMutation.isLoading}
            >
              {t('control.manual_mode')}
            </Button>
          </div>
        </div>
        
        {/* Target Temperature (Manual Mode Only) */}
        <div className="mb-3">
          <label className="form-label">{t('control.target_temp')}</label>
          <InputGroup>
            <Form.Control
              type="number"
              min="30"
              max="80"
              step="0.5"
              value={targetTemp}
              onChange={(e) => setTargetTemp(parseFloat(e.target.value))}
              disabled={currentMode === 'auto' || sendCommandMutation.isLoading}
            />
            <InputGroup.Text>°C</InputGroup.Text>
          </InputGroup>
          <Form.Text className="text-muted">
            {t('control.temp_range_hint')}
          </Form.Text>
        </div>
        
        <Button
          variant="success"
          className="w-100"
          onClick={handleSetTargetTemp}
          disabled={currentMode === 'auto' || sendCommandMutation.isLoading}
        >
          {sendCommandMutation.isLoading ? (
            <>{t('control.sending')}...</>
          ) : (
            t('control.apply_settings')
          )}
        </Button>
      </div>
      
      {/* Confirmation Modal (FR-015) */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t('control.confirm_title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pendingCommand?.type === 'switch_mode' && (
            <p>
              {t('control.confirm_switch_mode', {
                mode: pendingCommand.payload.mode === 'auto'
                  ? t('control.auto_mode')
                  : t('control.manual_mode')
              })}
            </p>
          )}
          {pendingCommand?.type === 'set_target_temp' && (
            <p>
              {t('control.confirm_set_temp', {
                temp: pendingCommand.payload.targetTemp
              })}
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            {t('control.cancel')}
          </Button>
          <Button variant="primary" onClick={confirmCommand}>
            {t('control.confirm')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ControlPanel;
```

---

## Testing

### Backend Tests (pytest)

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/integration/test_device_api.py
```

#### Example Test

```python
# tests/integration/test_device_api.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_list_devices_requires_auth():
    """FR-023: API endpoints require authentication"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/devices")
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_list_devices_with_auth(authenticated_client):
    """FR-003: List all devices"""
    response = await authenticated_client.get("/api/devices")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_send_control_command_operator_role(authenticated_operator_client):
    """FR-012, FR-024: Operator can send control commands"""
    response = await authenticated_operator_client.post(
        "/api/control/commands",
        json={
            "deviceId": "550e8400-e29b-41d4-a716-446655440000",
            "commandType": "switch_mode",
            "commandPayload": {"mode": "manual"}
        }
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "pending"
```

### Frontend Tests (Jest + React Testing Library)

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- ControlPanel.test.js
```

#### Example Test

```javascript
// src/components/DemoV1/HeatPump/ControlPanel.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ControlPanel from './ControlPanel';
import HeatPumpService from '../../../services/HeatPumpService';

jest.mock('../../../services/HeatPumpService');

describe('ControlPanel', () => {
  test('renders mode switch buttons', () => {
    render(
      <ControlPanel
        deviceId="test-device-1"
        currentMode="auto"
        currentTargetTemp={50}
      />
    );
    
    expect(screen.getByText('自動模式')).toBeInTheDocument();
    expect(screen.getByText('手動模式')).toBeInTheDocument();
  });
  
  test('shows confirmation dialog when switching mode (FR-015)', async () => {
    render(
      <ControlPanel
        deviceId="test-device-1"
        currentMode="auto"
        currentTargetTemp={50}
      />
    );
    
    // Click manual mode button
    fireEvent.click(screen.getByText('手動模式'));
    
    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText('確認切換模式')).toBeInTheDocument();
    });
  });
  
  test('sends command and shows success toast (FR-014)', async () => {
    HeatPumpService.sendControlCommand.mockResolvedValue({
      id: 'cmd-123',
      status: 'pending'
    });
    HeatPumpService.getCommandStatus.mockResolvedValue({
      id: 'cmd-123',
      status: 'confirmed'
    });
    
    render(
      <ControlPanel
        deviceId="test-device-1"
        currentMode="auto"
        currentTargetTemp={50}
      />
    );
    
    // Click manual mode and confirm
    fireEvent.click(screen.getByText('手動模式'));
    await waitFor(() => screen.getByText('確認'));
    fireEvent.click(screen.getByText('確認'));
    
    // Wait for command confirmation
    await waitFor(() => {
      expect(HeatPumpService.sendControlCommand).toHaveBeenCalledWith({
        deviceId: 'test-device-1',
        commandType: 'switch_mode',
        commandPayload: { mode: 'manual' }
      });
    });
  });
});
```

---

## Git Workflow

### Branch Strategy

```bash
# Work on feature branch
git checkout 001-heat-pump-remote-dashboard

# Create sub-branch for specific task
git checkout -b 001-heat-pump-remote-dashboard-backend-api

# Commit changes
git add .
git commit -m "feat(api): implement device list endpoint (FR-003)"

# Push to remote
git push origin 001-heat-pump-remote-dashboard-backend-api

# Create Pull Request on GitHub
```

### Commit Message Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example**:
```
feat(api): implement device list endpoint (FR-003)

- Add GET /api/devices with status filter
- Add DeviceService.get_all_devices()
- Add integration tests for device listing
- Update OpenAPI documentation

Closes #42
```

---

## Debugging

### Backend Debug (VS Code)

創建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI Debug",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8000"
      ],
      "jinja": true,
      "justMyCode": false,
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/heatpump_dashboard"
      }
    }
  ]
}
```

### Frontend Debug (Chrome DevTools)

1. 在 Chrome 開啟 Developer Tools (F12)
2. Sources → Filesystem → Add folder → 選擇 `Demo-v1-web/src`
3. 設定中斷點並重新載入頁面

### WebSocket Debug

使用 Chrome 擴充套件 [WebSocket King Client](https://chrome.google.com/webstore/detail/websocket-king-client/cbcbkhdmedgianpaifchdaddpnmgnknn):

1. 安裝擴充套件
2. 連線至 `ws://localhost:8000/ws/devices/{deviceId}?token={yourToken}`
3. 觀察即時訊息流

---

## Performance Optimization

### Backend

1. **Database Query Optimization**:
   - 使用 TimescaleDB continuous aggregates 減少查詢負擔
   - 為常用查詢條件建立索引
   - 使用 `EXPLAIN ANALYZE` 分析慢查詢

2. **WebSocket Scaling**:
   - 生產環境使用 Redis Pub/Sub 替代記憶體廣播
   - 多 worker 部署 + Load Balancer

3. **Caching**:
   - Device summary 快取 (1 秒過期)
   - Default thresholds 快取 (永久，手動清除)

### Frontend

1. **React Query Caching**:
   - Device list 快取 5 秒
   - Device detail 快取 1 秒
   - Historical data 快取依時間範圍

2. **Code Splitting**:
   - 使用 `React.lazy()` 分割路由

3. **Chart Performance**:
   - 使用 ECharts `downsampling` 減少資料點
   - 限制最大顯示點數 (e.g., 1000 點)

---

## Deployment

### Production Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Enable PostgreSQL SSL connection
- [ ] Enable HTTPS (WSS for WebSocket)
- [ ] Set up Redis for session + WebSocket pub/sub
- [ ] Configure CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure log aggregation (ELK Stack)
- [ ] Set up automated backups (PostgreSQL daily)
- [ ] Enable TimescaleDB compression (for data >7 days)

### Docker Deployment

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

---

## Troubleshooting

### 常見問題

**Q: WebSocket 連線失敗 "Unauthorized"**  
A: 檢查 token 是否正確，或 session 是否過期（FR-026: 30 分鐘）。

**Q: 資料庫連線錯誤 "password authentication failed"**  
A: 檢查 `.env` 中 `DATABASE_URL` 的密碼是否正確。

**Q: 前端無法連線至後端 API**  
A: 確認後端伺服器已啟動 (`uvicorn` 執行中），且 CORS 設定允許前端 origin。

**Q: TimescaleDB 擴充未啟用**  
A: 執行 `CREATE EXTENSION IF NOT EXISTS timescaledb;` 並重新連線資料庫。

---

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [TimescaleDB Guides](https://docs.timescale.com/)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Query Documentation](https://tanstack.com/query/latest)
- [pytest Documentation](https://docs.pytest.org/)

---

## Next Steps

1. ✅ Development environment set up
2. 📝 **Next**: Read `data-model.md` and implement database models
3. 📝 **Next**: Read `contracts/*.yaml` and implement API endpoints
4. 📝 **Next**: Implement frontend components per `plan.md` structure
5. 📝 **Next**: Write tests (target: 80% coverage per Constitution)
6. 📝 **Next**: Run `/speckit.tasks` to break down implementation tasks

---

**Questions?** Contact the team on Slack #heat-pump-dashboard channel.
