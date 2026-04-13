# LifeScope Monte Carlo Engine (AWS Lambda)

這份文件說明如何將蒙地卡羅壓測引擎部署到 AWS Lambda。我們刻意採取「Console 介面手動部署 + 內建 Layer」的策略，以避開 Windows 環境下編譯 `numpy` 的跨平台地雷組合。

## 部署步驟

### 0. 先決條件：IAM 開發帳號權限檢查
採取安全實務（Root 只開權限，使用獨立的 IAM 帳號開發），在你用該開發者帳號登入 AWS Console 前，**請確保 Root 帳號有賦予這個開發帳號以下權限**：
1. 一定能建 Lambda 的權限（例如 `AWSLambda_FullAccess`）。
2. 一定能建 API Gateway 的權限（例如 `AmazonAPIGatewayAdministrator`）。
3. **最容易漏掉的：建 IAM Role 的權限**（例如具備 `iam:CreateRole` 與 `iam:AttachRolePolicy`）。這是因為當你在網頁點擊「建立 Lambda」時，AWS 會自動幫這支程式創建一個專屬的「執行角色 (Execution Role)」，好讓它可以合法寫 Log 到 CloudWatch 裡面。

*(如果你圖方便，直接給了這支開發帳號 `AdministratorAccess` 或 `PowerUserAccess` 政策，這步就可以安心跳過。)*

### 1. 建立 Lambda 函數
1. 登入 AWS Console 並前往 **Lambda** 服務。
2. 點擊右上角橘色按鈕 **[Create function]** (建立函式)。
3. 選擇 **Author from scratch** (從頭開始建立)。
4. 輸入函式名稱：`lifescope-monte-carlo`
5. Runtime 選擇：**Python 3.12**
6. Architecture 選擇：**x86_64**
7. 點擊最下方 **[Create function]**。

### 2. 加入 Numpy Layer 🚀 (關鍵避雷步驟)
Numpy 是 C++ 底層寫的，不能直接把 Windows 下載的 Numpy 上傳到 AWS。所以我們直接拿 AWS 官方幫我們編譯好的 Layer 開外掛。

1. 在你的 Lambda 函數畫面底部，找到 **Layers** 區塊，點擊 **[Add a layer]**。
2. 選擇 **AWS layers**。
3. 在下拉選單中找到並選擇 **`AWSSDKPandas-Python312`**。
4. Version 選擇最新的版本 (通常是最下面那個數字)。
5. 點擊 **[Add]**。

### 3. 上傳程式碼
1. 回到 Lambda 的 **Code** 頁籤。
2. 開啟內建的 `lambda_function.py`。
3. 將本資料夾底下的 `lambda_function.py` 的**所有程式碼複製並貼上**，完全覆蓋掉原本的。
4. 點擊上方白色的 **[Deploy]** (部署) 按鈕。

### 4. 調整 Timeout 時間
蒙地卡羅算 1000 次通常需要 0.5 秒 ~ 1.5 秒，預設的 3 秒可能在冷啟動 (Cold Start) 時會逾時。
1. 前往 **Configuration** 面板 -> 點擊 **General configuration** -> **[Edit]**。
2. 將 **Timeout** (逾時) 從 3 秒改為 **10 秒**。
3. 點擊 **[Save]**。

### 5. 架設 API Gateway (讓前端可以呼叫)
1. 在 Lambda 函數首頁上方圖形區域，點選 **[+ Add trigger]**。
2. 選擇 **API Gateway**。
3. 選擇 **Create a new API**。
4. API type 選擇 **HTTP API** (最便宜、延遲最低)。
5. Security 選擇 **Open**。
6. 點擊 **[Add]**。

### 6. 設定 CORS (避免前端被瀏覽器擋下)
1. 點開剛建立好的 API Gateway 連結，進入 API Gateway 控制台。
2. 在左側選單點選 **CORS**。
3. 點擊 **[Configure]**：
   - Access-Control-Allow-Origin: 輸入 `*` 然後按 Add（正式上線後改為你的 Vercel 網域）
   - Access-Control-Allow-Headers: 輸入 `Content-Type` 然後按 Add
   - Access-Control-Allow-Methods: 輸入 `POST`, `OPTIONS` 然後按 Add
4. 點擊 **[Save]**。

### 7. 🔒 安全強化：設定 CORS 鎖定網域（部署到 Vercel 後必做）
當你拿到 Vercel 正式網域後（例如 `https://lifescope.vercel.app`），請回來做以下設定：
1. 進入 Lambda 函數 → **Configuration** → **Environment variables** → **[Edit]**。
2. 新增一組環境變數：
   - **Key**: `ALLOWED_ORIGIN`
   - **Value**: `https://你的網域.vercel.app`
3. 點擊 **[Save]**。
4. 程式碼會自動讀取此環境變數來控制 CORS，只允許來自你網站的請求。

### 8. 🔒 安全強化：設定 API Gateway 流量限速（防止帳單爆炸）
1. 進入 **API Gateway Console** → 選取你的 API。
2. 在左側選單點選 **Throttling** 或 **Usage Plans**。
3. 設定限速：
   - **Rate**: `5` requests/second（每秒最多處理 5 個請求）
   - **Burst**: `10` requests（允許短暫的 10 個併發突發）
4. 點擊 **[Save]**。
5. 超出限制的請求會自動回傳 `429 Too Many Requests`，不會產生 Lambda 費用。

## 🎯 完工！
回到你的 Lambda 介面或者 API Gateway 看，你會得到一串類似 `https://xxxxxxx.execute-api.ap-northeast-1.amazonaws.com/default/lifescope-monte-carlo` 的 API endpoint URL。
> 請把這串 URL 填回前端的 `.env.local` 環境變數裡（`NEXT_PUBLIC_MC_API_URL`）！這樣前端就可以正式開始呼叫引擎做壓力測試了。

