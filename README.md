# LifeScope 動態理財與退休模擬平台 🎲

**LifeScope** 是一個結合了現代前端技術與強大雲端量化運算引擎的「人生財務沙盤推演器」。
有別於市面上傳統的固定複利計算機，本專案首創導入 **蒙地卡羅演算法 (Monte Carlo Simulation)**，能在毫秒之間跑完 1,000 次平行宇宙的股市波動與黑天鵝歷史災難壓力測試，幫助使用者看清「真實世界中破產的機率」。

> 💡 **Project Showcase / 火力展示專案**  
> 本專案為開發者於業餘時間獨立思考、設計與建置的全端系統，旨在作為 **Next.js 前端框架** 與 **AWS Serverless 雲端運算架構** 的深度實作練習。
> 本系統為 100% 免費、無營利、無商業化意圖之開源公益專案。

---

## 🚀 核心功能 (Features)

1. **基礎複利試算 (Basic Projection)**
   - 高流暢度的動態滑桿參數調整。
   - 採用 Recharts 實作極具現代感的資產增長 Area Chart。
2. **買房 vs 租屋決策引擎 (Housing vs Renting)**
   - 房貸本息攤還精密計算。
   - 交叉對比「頭期款與每月結餘投入股市」與「繳房貸並持有房產」的 30 年淨資產黃金交叉點。
3. **蒙地卡羅壓力測試 (Monte Carlo Stress Test)**
   - **雲端高效運算**：後端搭載 Python `NumPy` 向量運算，單次點擊即時結算 1,000 種未來經濟環境隨機路徑。
   - **Fan Chart (扇形信心區間圖)**：視覺化呈現 P10 到 P90 的財富區間。
   - **歷史災難覆蓋 (Scenario Overlay)**：獨家支援內建百年間的真實災難劇本（1929 經濟大蕭條、達康泡沫、2008 金融海嘯），可由使用者自由拖拉「劇本爆發時機」，徹底測試退休現金流的脆弱極限。

---

## 🛠️ 技術棧 (Tech Stack)

### Frontend (User Interface)
* **Framework**: React 18 + Next.js 14 (App Router)
* **Styling**: Tailwind CSS + 原生 CSS Variables (Design Tokens)
* **Visualization**: Recharts 
* **State Management**: React Hooks (useState, useMemo, useCallback) + Client-side LocalStorage Persistence
* **Hosting**: Vercel

### Backend (Quantitative Compute Engine)
* **Architecture**: Serverless Microservice
* **Cloud Provider**: Amazon Web Services (AWS)
* **Core Engine**: AWS Lambda (Python 3.12)
* **API Gateway**: AWS API Gateway (REST HTTP API)
* **Data Science**: `numpy` v2 (Matrix vectorization for extreme low-latency computations)

---

## 🏗️ 系統架構圖 (System Architecture)

```mermaid
graph TB
    subgraph "Frontend (Vercel Edge Network)"
        UI[Next.js Client Components]
        State[React State & Hooks]
        Chart[Recharts Data Viz]
    end

    subgraph "AWS Serverless Compute Engine"
        API[Amazon API Gateway]
        Lambda[AWS Lambda Function\nPython 3.12]
        NumPy[NumPy Vectorized C-Engine]
    end

    UI -- HTTP POST JSON Payload --> API
    API -- Trigger --> Lambda
    Lambda -- 1. Parse Parameters --> NumPy
    NumPy -- 2. Generate 1,000 GBM Paths & Overlays --> NumPy
    NumPy -- 3. Calculate Percentiles (P10-P90) --> Lambda
    Lambda -- 4. Return Statistical JSON --> API
    API -- Response (~30ms) --> UI
    UI -- Render FanChart --> Chart
```

---

## 🧑‍💻 開發者聲明 & 聯絡方式

本工具由開發者於下班時間基於技術熱忱獨立建置。

**合規宣告**：
* 本軟體與網站絕不收取任何形式之費用、打賞、廣告贊助或訂閱費。
* 網站本身僅為觀念驗證 (PoC) 與全端工程之技術展示名片。

如果您對本系統的雲端架構設計、前端渲染優化有任何指教，或發現了系統 Bug，非常歡迎透過 [GitHub Issue](https://github.com/a0955329835-code/lifescope/issues) 與我交流。

> **免責聲明**：本工具僅提供客觀數據運算與情境模擬，不代表未來實際投資績效。本站不提供任何特定金融商品之買賣建議，亦不構成投資顧問服務。投資有風險，使用者應自行判斷並承擔所有投資決策之結果。

