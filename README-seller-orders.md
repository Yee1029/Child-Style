# Child Style Admin — Seller Orders

## 訂單匯入功能
- 後台新增「賣貨便訂單統計」區塊。
- 支援賣貨便匯出的 `.xlsx` / `.xls`，讀取「非訂單匯入」工作表（若不存在則讀取第一張工作表）。
- 從第 3 列標題自動尋找欄位，支援同一訂單多商品明細（後續明細列沿用前一個訂單編號）。
- 以 `訂單編號 + 明細序號` 作為唯一鍵重複匯入更新，不會因同一檔案重複匯入而累加兩次。
- 預設統計排除狀態文字含「取消、退貨、退款、作廢、未成立」的訂單；可切換全部狀態。
- 商品規格解析支援商品名稱中的 `尺寸-L`、`尺寸-兒童 150` 等格式；顏色若出現在商品名稱逗號前的尾綴或 `顏色-` 規格欄可解析。

## 首次設定（必要）
1. Supabase Dashboard → SQL Editor。
2. 執行 `seller-orders-schema.sql`。
3. 將 ZIP 內的檔案上傳至 GitHub Repository 根目錄。
4. 等待 GitHub Pages 部署完成。
5. 後台登入後選擇賣貨便 Excel，按「匯入訂單」。

## 注意
- 訂單原始資料儲存在 Supabase `seller_order_lines`，不是只存在目前瀏覽器。
- 本版只建立訂單明細統計，不會自動更新商品庫存，也不會自動向賣貨便回寫。
- Excel 由瀏覽器端解析；需可連線載入 SheetJS CDN。
- 請保留 `supabase-config.js`、`supabase-client.js` 原有設定。
