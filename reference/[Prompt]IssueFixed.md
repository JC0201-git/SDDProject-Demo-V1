# IssueFixed — 細部修正調整提示詞參考

基於本專案結構（React + Atomic Design 前端、Express + Prisma 後端），可直接複製使用的提示詞模板。

---

## 前端畫面調整

### 樣式 / 排版修正

```
調整 `frontend/src/components/[層級]/[元件名].tsx` 中的 [目標元素]：
- 目前問題：[描述現在的外觀或行為]
- 期望結果：[描述你要的樣子]
- 只修改此元件的 CSS 和 TSX，不動其他檔案。
```

範例：
```
調整 `frontend/src/components/molecules/DeviceCard.tsx` 的卡片底部按鈕區塊：
- 目前問題：按鈕靠左對齊，視覺上不平衡
- 期望結果：按鈕靠右對齊，並與卡片右邊距保持 12px 間距
- 只修改 DeviceCard.tsx 和 DeviceCard.css，不動其他檔案。
```

---

### 元件行為 / 邏輯修正

```
修改 `frontend/src/components/[路徑]/[元件].tsx`：
- 問題描述：[什麼情況下出現問題]
- 期望行為：[應該發生什麼]
- 相關資料來源：[store / API / props]
- 不要新增新元件，只修改此檔案內的邏輯。
```

---

### 頁面級調整

```
修改 `frontend/src/pages/[頁面]/[頁面].tsx`：
在 [位置描述，如：裝置列表上方 / 頁首右側] 調整 [功能]：
- 現況：[目前的狀態]
- 目標：[要達到的效果]
- 可引用的既有元件：[如 Button、Badge 等 atoms/molecules]
- 盡量使用現有元件，不要新建元件。
```

---

### 全域樣式 / CSS 變數

```
修改 `frontend/src/styles/variables.css`（或 global.css）：
調整 [顏色/字體/間距] 相關的 CSS 變數：
- 目標變數：[--variable-name]
- 修改原因：[為什麼要改]
- 確認不影響其他使用此變數的元件。
```

---

## 後端功能調整

### API 端點修正

```
修改 `backend/src/api/routes/[模組].ts`：
針對 [HTTP方法] [路由路徑] 端點：
- 問題：[目前回傳了什麼 / 行為錯誤]
- 期望：[應該回傳什麼 / 行為應為何]
- 如涉及資料庫，相關 service 在 `backend/src/services/[模組].ts`。
- 不要改動其他路由，只修改此端點。
```

範例：
```
修改 `backend/src/api/routes/devices.ts`：
針對 GET /devices/:id 端點：
- 問題：目前找不到裝置時回傳 500，應該回傳 404
- 期望：找不到裝置時回傳 { error: 'Device not found' }，狀態碼 404
- 修改範圍限定在此路由 handler，不動 device service。
```

---

### Service 邏輯修正

```
修改 `backend/src/services/[服務名].ts` 中的 [函式名] 函式：
- 目前邏輯：[描述現在在做什麼]
- 問題點：[哪裡不對]
- 期望行為：[應該怎麼做]
- 相關 Prisma Model：[model 名稱，參考 prisma/schema.prisma]
- 不修改呼叫此函式的路由或其他 service。
```

---

### Middleware 調整

```
修改 `backend/src/api/middlewares/[middleware].ts`：
- 目前行為：[描述]
- 需要調整：[什麼條件下要有不同行為]
- 影響範圍：確認只影響 [指定路由群組]，不動全域設定。
```

---

## 通用精準調整模板（最常用）

```
【目標檔案】frontend/src/... 或 backend/src/...
【問題描述】[一句話描述問題]
【位置定位】在 [函式名/元件名/區塊] 的第 [N] 行附近
【修改範圍】只修改此檔案，不新增檔案，不改動其他模組
【驗證方式】[改完後如何確認正確，如：DeviceCard 應顯示 XX / API 應回傳 YY]
```

---

## 使用技巧

1. **定位越精確越好** — 說明是哪個元件的哪個區塊，而非「頁面哪裡」
2. **說明不要動什麼** — 明確限制修改範圍，避免連帶改動
3. **描述預期驗收標準** — 告知改完後如何判斷正確
4. **參考現有命名** — 直接使用專案中的元件名（`DeviceCard`、`GlobalSummary`）或路由（`/devices/:id`）

---

## 本專案元件 / 檔案速查

### 前端

| 層級 | 元件 | 路徑 |
|------|------|------|
| Atom | Button | `frontend/src/components/atoms/Button.tsx` |
| Atom | Input | `frontend/src/components/atoms/Input.tsx` |
| Atom | Badge | `frontend/src/components/atoms/Badge.tsx` |
| Atom | Spinner | `frontend/src/components/atoms/Spinner.tsx` |
| Molecule | DeviceCard | `frontend/src/components/molecules/DeviceCard.tsx` |
| Molecule | StatusIndicator | `frontend/src/components/molecules/StatusIndicator.tsx` |
| Molecule | NotificationItem | `frontend/src/components/molecules/NotificationItem.tsx` |
| Organism | DeviceList | `frontend/src/components/organisms/DeviceList.tsx` |
| Organism | NotificationCenter | `frontend/src/components/organisms/NotificationCenter.tsx` |
| Organism | GlobalSummary | `frontend/src/components/organisms/GlobalSummary.tsx` |
| Template | DashboardLayout | `frontend/src/components/templates/DashboardLayout.tsx` |
| Page | LoginPage | `frontend/src/pages/LoginPage/LoginPage.tsx` |
| Page | DashboardPage | `frontend/src/pages/DashboardPage/DashboardPage.tsx` |
| Page | DeviceDetailPage | `frontend/src/pages/DeviceDetailPage/DeviceDetailPage.tsx` |
| Store | authStore | `frontend/src/store/authStore.ts` |
| Store | uiStore | `frontend/src/store/uiStore.ts` |
| Service | API client | `frontend/src/services/api/client.ts` |
| Service | WebSocket | `frontend/src/services/websocket/client.ts` |

### 後端

| 類別 | 模組 | 路徑 |
|------|------|------|
| Route | auth | `backend/src/api/routes/auth.ts` |
| Route | devices | `backend/src/api/routes/devices.ts` |
| Route | notifications | `backend/src/api/routes/notifications.ts` |
| Service | auth | `backend/src/services/auth.ts` |
| Service | device | `backend/src/services/device.ts` |
| Service | telemetry | `backend/src/services/telemetry.ts` |
| Service | notification | `backend/src/services/notification.ts` |
| Service | threshold | `backend/src/services/threshold.ts` |
| Service | mqtt | `backend/src/services/mqtt.ts` |
| Middleware | auth | `backend/src/api/middlewares/auth.ts` |
| Middleware | error-handler | `backend/src/api/middlewares/error-handler.ts` |
| Middleware | rate-limiter | `backend/src/api/middlewares/rate-limiter.ts` |
| Model | user | `backend/src/models/user.ts` |
| Model | device | `backend/src/models/device.ts` |
| Model | notification | `backend/src/models/notification.ts` |
| Model | threshold | `backend/src/models/threshold.ts` |
