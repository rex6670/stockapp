# stockapp

## API key 設定
請準備 Alpha Vantage API key，並設定 `VITE_ALPHA_VANTAGE_KEY` 環境變數，前端會自動讀取。

## 本地啟動
此專案是以 Vite 為前端啟動方式，請在專案根目錄執行：

1. `npm install`
2. `npm run dev`

### PowerShell 範例
```powershell
npm install
npm run dev
```

## GitHub 同步建議
如果你要提交或推送變更，建議先同步遠端，避免衝突：

```bash
git pull
```

## WSL / Ubuntu 注意事項
- 請在 WSL / Ubuntu 內安裝 Node.js 並使用該環境的 `npm` 執行指令。
- 如果出現 `ENOENT` 找不到 `package.json`，請確認目前路徑為專案根目錄。
