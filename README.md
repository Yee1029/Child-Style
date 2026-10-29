# 85°X - store — Supabase 連線版

## 上傳檔案
- `index.html`
- `styles.css`
- `supabase-client.js`
- `app.js`

請保留你已經建立的 `supabase-config.js`，不要用這個 ZIP 內的檔案覆蓋它（本 ZIP 不包含設定檔）。

## Supabase 設定
`supabase-config.js` 應包含：

```js
window.SUPABASE_URL = "https://你的專案ID.supabase.co";
window.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_你的公開金鑰";
```

只使用 Project URL 與 Publishable key。不要放 `secret`、`service_role` key 或資料庫密碼。

## 商品資料讀取
網站會從 `public.products` 讀取 `status = 'published'` 的商品，並關聯 `categories`、`product_variants`、`product_images`。
商品圖片的 `image_url` 必須是可公開讀取的 URL；商品的賣貨便網址填在 `external_purchase_url`。

## 上傳方式
在 GitHub Repository 根目錄，點 `Add file` → `Upload files`，上傳 ZIP 解壓縮後的四個檔案，覆蓋同名檔案並 Commit changes。
不要把解壓縮後的整個資料夾再放進子資料夾。

## 注意
目前尚未有管理後台；商品必須先在 Supabase Table Editor 建立分類與商品資料，且將商品狀態設為 `published`，才會出現在公開網站。
