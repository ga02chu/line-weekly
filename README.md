# Line 群組週報

自動把 LINE 群組對話（記錄在 Google Sheet）整理成每週摘要。

## 功能
- 重點摘要、重要決議、待辦事項、熱門話題排行
- 支援切換週次
- 手機友善介面

## Google Sheet 格式要求

| A欄（時間）         | B欄（發話者） | C欄（訊息內容）   |
|-------------------|------------|----------------|
| 2025/04/14 09:30  | 小明        | 大家好！         |
| 2025/04/14 10:00  | 小美        | 今天會議幾點？    |

日期格式支援：`YYYY/MM/DD HH:mm` 或 `YYYY-MM-DD HH:mm`

**重要**：Google Sheet 必須設定為「知道連結的人均可檢視」

## 部署步驟（Vercel）

### 1. 上傳程式碼到 GitHub
1. 前往 https://github.com/new 建立新 repo
2. 把這個資料夾上傳上去（可用 GitHub Desktop）

### 2. 部署到 Vercel
1. 前往 https://vercel.com，用 GitHub 帳號登入
2. 點「Add New Project」→ 選剛才的 repo → 點「Deploy」
3. 部署完成後，進到專案設定 → **Environment Variables**
4. 新增：`ANTHROPIC_API_KEY` = 你的 `sk-ant-...`
5. 重新部署（Deployments → 點最新一筆 → Redeploy）

完成！你會得到一個 `xxx.vercel.app` 的網址，分享給群組成員就能用。

## 本地測試

```bash
cp .env.example .env.local
# 在 .env.local 填入你的 ANTHROPIC_API_KEY

npm install
npm run dev
# 開啟 http://localhost:3000
```
