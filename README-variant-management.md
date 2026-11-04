# Child Style 商品規格管理更新

這版新增管理後台的「販售規格 SIZE / COLOR」區塊，可逐列新增尺寸與顏色組合，例如：
- 110 / 黑色
- 120 / 黑色
- 130 / 米白

儲存商品時會更新 `product_variants`，公開商品詳情會讀取這些規格並以標籤展示。規格不會在 Child Style 網站進行結帳選取，顧客仍透過賣貨便下單。

## GitHub 上傳
將 `admin.html`、`admin.css`、`admin.js`、`app.js`、`index.html`、`styles.css` 上傳到 Repository 根目錄並覆蓋同名檔案。這包以目前多張尺寸表版本為基礎，避免退回舊功能。
保留 `supabase-config.js` 和 `supabase-client.js`。

## 資料庫
沿用既有 `product_variants` 資料表，不需要新增 SQL。
