# Frontend 技術規格文件

## 二、Demo-v1-web（React 使用者介面）

### 2.1 技術棧總覽

| 分類 | 技術 | 版本 |
|------|------|------|
| **UI 框架** | React | 16.13.1 |
| **路由** | React Router DOM | 5.2.0 |
| **狀態管理** | Context API | 內建 |
| **CSS 框架** | Bootstrap 4 + Rsuite | 4.5.3 / 5.16.3 |
| **CSS-in-JS** | styled-components | 6.0.5 |
| **SCSS** | Sass (Dart) | 1.79.4 |
| **主要圖表** | ECharts (echarts-for-react) | 5.2.2 |
| **次要圖表** | Chart.js (react-chartjs-2) | 3.9.1 |
| **地圖** | Leaflet / Mapbox GL / AMap | 多版本 |
| **表單** | react-hook-form | 4.10.2 |
| **國際化** | i18next + react-i18next | 19.6.3 / 11.7.0 |
| **圖示** | FontAwesome 5 | 5.15.1 |
| **通知** | react-toastify | 5.5.0 |
| **建置工具** | Create React App (react-scripts) | 5.0.1 |
| **任務自動化** | Gulp | 5.0.0 |
| **程式碼格式** | Prettier | 1.17.1 |
| **Lint** | ESLint (CRA 內建 + prettier 外掛) | — |
| **生產環境伺服器** | Nginx | latest |
| **容器化** | Docker (多階段建置) | — |

### 2.2 狀態管理

**使用 React Context API（無 Redux）**，定義於 `src/context/Context.js`：

| Context | 用途 |
|---------|------|
| `AppContext` | 主要全域狀態：主題、佈局、語言、貨幣 |
| `ProductContext` | 電商功能 |
| `EmailContext` | Email 功能 |
| `ChatContext` | 聊天功能 |
| `KanbanContext` | 看板功能 |
| `AuthWizardContext` | 認證精靈流程 |
| `FeedContext` | 動態訊息 |

**AppContext 提供的狀態：**

```javascript
// src/Main.js 提供以下狀態 + setter
{
  isFluid,            // 流式佈局 (預設 true)
  isRTL,              // 右至左排版 (預設 false)
  isDark,             // 深色模式 (預設 false)
  isTopNav,           // 頂部導航 (預設 false)
  isVertical,         // 垂直側邊欄 (預設 true)
  isNavbarVerticalCollapsed,  // 側邊欄摺疊
  currency,           // 貨幣符號 (預設 '¥')
  showBurgerMenu,     // 手機漢堡選單
  navbarStyle,        // 導航列風格 (預設 'transparent')
  language,           // 語言 (預設 'zh_TW')
}
```

### 2.3 樣式與主題系統

**SCSS 建置管線 (gulpfile.js)**：

```
src/assets/scss/*.scss
  │
  ├── gulp scss → public/css/theme.css          (標準主題)
  ├── gulp scss:dark → public/css/theme-dark.css (深色主題)
  └── gulp scss:rtl → public/css/theme-rtl.css   (RTL 主題)
```

Gulp 任務包含：autoprefixer、clean-css 壓縮、sourcemaps、RTL 轉換。

**SCSS 結構** (`src/assets/scss/theme/`)：
- `_variables.scss` — 主題變數
- `_navbar.scss` / `_navbar-vertical.scss` — 導航列樣式
- `_buttons.scss` / `_forms.scss` / `_cards.scss` — 元件樣式
- `_animations.scss` — 動畫
- `dark/` — 深色模式覆寫
- 22 個外掛 SCSS 檔（FullCalendar、React DateTime、Bootstrap Table 等）

**動態樣式表切換** (`helpers/toggleStylesheet.js`)：
- 根據 `isDark` / `isRTL` Context 狀態動態載入對應 CSS 檔。

**主題色彩** (`helpers/utils.js`)：
```javascript
themeColors = {
  primary:   '#2c7be5',
  secondary: '#748194',
  success:   '#00d27a',
  info:      '#27bcfd',
  warning:   '#f5803e',
  danger:    '#e63757',
  light:     '#f9fafd',
  dark:      '#0b1727'
}
```

### 2.4 國際化 (i18n)

**配置檔**：`src/i18n.js`
**框架**：i18next + react-i18next

**支援語言 (14 種)**：
| 代碼 | 語言 |
|------|------|
| `zh_TW` | 繁體中文（預設） |
| `zh_CN` | 簡體中文 |
| `en` | English |
| `de` | Deutsch |
| `fr` | Français |
| `es` | Español |
| `ru` | Русский |
| `ar` | العربية (RTL) |
| `vi` | Tiếng Việt |
| `th` | ไทย |
| `tr` | Türkçe |
| `ms` | Bahasa Melayu |
| `id` | Bahasa Indonesia |
| `pt` | Português |

**使用方式**：
- 元件中使用 `withTranslation` HOC 或 `useTranslation` Hook
- 語言選擇持久化至 `localStorage['myems_web_ui_language']`
- `Main.js` 中同步 `i18n.changeLanguage(language)` 與 Context

### 2.5 圖表與視覺化

**主要圖表庫：ECharts**
- 套件：`echarts@5.2.2` + `echarts-for-react@3.0.2`
- 元件路徑：`src/components/MyEMS/common/`
- 圖表類型：

| 元件 | 說明 |
|------|------|
| MultipleLineChart | 多時間序列折線圖，支援勾選切換 |
| MultiTrendChart | 趨勢對比圖 |
| BarChart | 柱狀圖 |
| LineChart | 單一折線圖 |
| MixedLineChart | 混合圖表 |
| SharePie | 圓餅圖 |
| ChartSpacesStackBar | 堆疊柱狀圖 |
| SectionLineChart | 區段分析圖 |

**次要圖表庫：Chart.js**
- 套件：`chart.js@3.9.1` + `react-chartjs-2@4.3.1`
- 外掛：`chartjs-plugin-annotation`、`chartjs-plugin-datalabels`

**ECharts 色彩配置**：
```javascript
['#2c7be5', '#00d27a', '#27bcfd', '#f5803e', '#e63757']
```

### 2.6 認證與 Session 管理

**登入流程**：

```
LoginForm.js
  1. 使用者輸入帳號、密碼、驗證碼 (react-captcha-code-custom)
  2. 驗證碼驗證（前端）
  3. fetch PUT {APIBaseURL}/users/login
     Body: { data: { account, password } }
  4. 回應成功 → 將以下資訊存入 Cookie：
     - user_name, user_display_name, user_uuid, token, is_logged_in
     - Cookie 過期時間：1 小時（config.js 中 cookieExpireTime: 3,600,000 ms）
  5. 導向 Dashboard
```

**Session 保持**：
- 監聽 `mousemove` / `mousedown` 事件，每次互動刷新 Cookie 過期時間
- Session 逾時 → `handleAPIError()` 檢查 `"API.USER_SESSION_TIMEOUT"` → 導向登入頁

**登出**：清除所有 Cookie，導向 `/authentication/basic/login`。

### 2.10 API 呼叫方式

- **使用原生 Fetch API**（未使用 axios）
- **API Base URL**（`src/config.js`）：

```javascript
// 動態偵測當前瀏覽器的 protocol + hostname + port
APIBaseURL = window.location.protocol + '//' +
             window.location.hostname + ':' +
             window.location.port + '/api'
// 開發環境備用：http://127.0.0.1:8000/api
```

- 所有 API 請求透過 Nginx `/api` 反向代理至後端 Port 8000

### 2.7 工具函式與 Hooks

**`src/helpers/utils.js`**：

| 分類 | 函式 |
|------|------|
| 陣列/類型 | `isIterableArray()`, `checkEmpty()`, `floatFormatter()` |
| LocalStorage | `getItemFromStore()`, `setItemToStore()`, `getStoreSpace()` |
| Cookie | `getCookieValue()`, `createCookie()`, `handleAPIError()` |
| 日期 | `getDuration()` (Moment.js) |
| 數值格式化 | `numberFormatter()` (K/M/B 表示) |
| 色彩 | `hexToRgb()`, `rgbColor()`, `rgbaColor()` |
| 分頁 | `getPaginationArray()` |
| 剪貼簿 | `copyToClipBoard()` |

**自定義 Hooks (`src/hooks/`)**：

| Hook | 用途 |
|------|------|
| `useBulkSelect` | 多選功能 |
| `useInterval` | 定時器管理（含 cleanup） |
| `usePagination` | 分頁狀態管理 |
| `useQuery` | URL query 參數解析 |

### 2.8 程式碼品質工具

**.eslintrc.json**：
```json
{
  "extends": ["react-app", "prettier", "plugin:react/recommended"],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "warn",
    "react/no-unescaped-entities": "off",
    "react/prop-types": "off"
  }
}
```

### 2.9 相依套件完整清單

#### 核心框架
| 套件 | 版本 |
|------|------|
| react | ^16.13.1 |
| react-dom | ^16.13.1 |
| react-router-dom | ^5.2.0 |
| react-scripts | ^5.0.1 |

#### UI 元件庫
| 套件 | 版本 | 用途 |
|------|------|------|
| reactstrap | ^8.6.0 | React Bootstrap 4 元件 |
| bootstrap | ^4.5.3 | CSS 框架 |
| rsuite | ^5.16.3 | 進階 UI 元件庫 |
| styled-components | ^6.0.5 | CSS-in-JS |
| classnames | ^2.2.6 | 條件 class 名稱 |

#### 表單與輸入
| 套件 | 版本 | 用途 |
|------|------|------|
| react-hook-form | ^4.10.2 | 表單管理 |
| react-select | ^3.1.0 | 下拉選單 |
| rc-cascader | ^1.3.0 | 級聯選擇 |
| react-flatpickr | ^3.10.6 | 日期選擇器 |
| react-datetime | ^3.0.0 | 日期時間輸入 |
| react-quill | ^2.0.0 | 富文字編輯器 |
| react-dropzone | ^10.2.2 | 檔案上傳 |
| react-captcha-code-custom | ^1.0.0 | 驗證碼 |
| react-code-input | ^3.10.1 | OTP 輸入 |

#### 表格
| 套件 | 版本 | 用途 |
|------|------|------|
| react-bootstrap-table-next | ^4.0.3 | 進階表格 |
| react-bootstrap-table2-editor | ^1.4.0 | 行內編輯 |
| react-bootstrap-table2-paginator | ^2.1.2 | 分頁 |

#### 圖表
| 套件 | 版本 |
|------|------|
| echarts | ^5.2.2 |
| echarts-for-react | ^3.0.2 |
| chart.js | ^3.9.1 |
| react-chartjs-2 | ^4.3.1 |
| chartjs-plugin-annotation | ^2.0.0 |
| chartjs-plugin-datalabels | ^2.1.0 |

#### 地圖
| 套件 | 版本 |
|------|------|
| mapbox-gl | ^2.15.0 |
| leaflet | ^1.7.1 |
| react-leaflet | ^2.7.0 |
| leaflet.markercluster | ^1.4.1 |
| @amap/amap-jsapi-loader | ^1.0.1 |

#### 圖示與字型
| 套件 | 版本 |
|------|------|
| @fortawesome/fontawesome-svg-core | ^1.2.30 |
| @fortawesome/free-solid-svg-icons | ^5.15.1 |
| @fortawesome/free-regular-svg-icons | ^5.14.0 |
| @fortawesome/free-brands-svg-icons | ^5.14.0 |
| @fortawesome/react-fontawesome | ^0.1.11 |
| react-icons | ^4.8.0 |

#### 工具庫
| 套件 | 版本 | 用途 |
|------|------|------|
| moment | ^2.28.0 | 日期處理 |
| lodash | ^4.17.20 | 工具函式 |
| uuid | ^9.0.0 | UUID 產生 |
| fuse.js | ^6.4.3 | 模糊搜尋 |
| is_js | ^0.9.0 | 類型檢查 |
| ajv | ^8.0.0 | JSON Schema 驗證 |
| prop-types | ^15.7.2 | Prop 類型檢查 |

#### 動畫與互動
| 套件 | 版本 | 用途 |
|------|------|------|
| react-lottie | ^1.2.9 | Lottie 動畫 |
| react-beautiful-dnd | ^13.0.0 | 拖放排序 |
| react-slick | ^0.25.2 | 輪播 |
| react-countup | ^6.1.0 | 數字計數動畫 |
| react-toastify | ^5.5.0 | Toast 通知 |
| react-image-lightbox | ^5.1.1 | 圖片燈箱 |
| react-scroll | ^1.8.1 | 平滑捲動 |
| react-typed | ^1.2.0 | 打字動畫 |

#### 開發相依
| 套件 | 版本 | 用途 |
|------|------|------|
| gulp | ^5.0.0 | 任務自動化 |
| gulp-sass | ^5.0.0 | SCSS 編譯 |
| gulp-autoprefixer | ^9.0.0 | CSS 前綴 |
| gulp-clean-css | ^4.3.0 | CSS 壓縮 |
| gulp-rtlcss | ^2.0.0 | RTL CSS 產生 |
| browser-sync | ^3.0.2 | Live reload |
| eslint-config-prettier | ^8.3.0 | Prettier ESLint |
| prettier | 1.17.1 | 程式碼格式化 |
| postcss | ^8.4.31 | CSS 轉換 |
| webpack-dev-server | ^5.2.1 | 開發伺服器 |
