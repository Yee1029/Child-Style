# 85°X - store 管理後台

此 ZIP 新增 `admin.html`、`admin.css`、`admin.js`。請將三個檔案上傳到 GitHub repository 根目錄，並保留原本的 `supabase-config.js`、`supabase-client.js`、`app.js`、`index.html`、`styles.css`。

## 使用方式
1. 開啟 `https://yee1029.github.io/85X-store/admin.html`
2. 使用 Supabase Authentication → Users 中建立的管理員 email 與密碼登入。
3. 新增分類。
4. 新增商品，選擇分類、價格、商品狀態，選填描述和賣貨便網址。
5. 選擇商品圖片（JPG / PNG / WebP，最多 5MB），按「儲存商品」。
6. 商品狀態選「上架」才會在公開商店顯示。

## 前置條件
- Supabase URL 與 publishable key 已在 `supabase-config.js` 設定。
- `supabase-client.js` 建立 `window.supabaseClient`。
- Supabase `user_roles` 中，登入使用者的 `user_id` 必須有 `role = 'admin'`。
- Storage 有名為 `product-images` 的公開 bucket。
- 已建立前面設定的 RLS policies；管理員需要能管理 categories、products、product_images，並能上傳 Storage objects。

## 重要
- 不要把 Supabase `secret` 或 `service_role` key 放進前端檔案。
- 這是第一版管理後台：可登入、分類新增/啟用停用、商品新增/編輯、圖片上傳、狀態切換。尚未提供商品刪除、庫存 SKU / variants 編輯、訂單、付款。
- 網站首頁只顯示 `published` 商品。
