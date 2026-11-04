# Child Style 多照片與尺寸表功能更新

## 本次上傳檔案
請將 ZIP 解壓縮後，將以下 6 個網站檔案上傳到 GitHub Repository 根目錄並覆蓋同名檔案：
- index.html
- styles.css
- app.js
- admin.html
- admin.css
- admin.js

另外請先在 Supabase SQL Editor 執行 `supabase-migration-multi-images.sql`。此 SQL 會在 `product_images` 增加 `image_type`，區分一般商品照片與尺寸表，不會刪除既有圖片。

## 管理後台使用方式
1. 進入管理後台，編輯或新增商品。
2. 在「商品照片」欄位可一次選取多張照片；每張最多 5MB，JPG/PNG/WebP。第一張新上傳照片會作為主圖（若商品已有主圖，舊主圖保留）。編輯既有商品時，新照片會接續加入，不會覆蓋原照片。
3. 在「尺寸表圖片」選擇一張尺寸表；再次上傳尺寸表會取代舊尺寸表。
4. 儲存商品。

## 顧客端顯示
商品詳情會顯示主圖及縮圖切換、多角度照片、尺寸與顏色文字規格，以及尺寸表圖片。購買仍導向賣貨便完成規格選擇與下單。

保留原有 `supabase-config.js`、`supabase-client.js`，不要上傳或覆蓋密鑰設定檔。
