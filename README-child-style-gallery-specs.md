# Child Style 商品詳情與規格管理修正版

## 本版變更
1. 商品主圖改為完整顯示 `object-fit: contain`，不再裁切。
2. 點擊主圖可開啟全螢幕燈箱放大；支援上一張、下一張、鍵盤左右鍵及點背景關閉。
3. 商品照片與尺寸表合併為同一個多圖相簿。舊資料中 image_type=size_chart 的尺寸表也會出現在相簿，不再另設尺寸表區塊。
4. 管理後台只保留一個「商品照片與尺寸表」多檔上傳欄位。
5. 管理後台的尺寸/顏色規格編輯區加強顯示，並繼續儲存到 product_variants。
6. SKU 改為包含 product id 的唯一字串，降低不同商品間撞號機率。

## GitHub
覆蓋 index.html、styles.css、app.js、admin.html、admin.css、admin.js。
保留 supabase-config.js 和 supabase-client.js。
不需要新增 SQL。

## 規格設定
每列填一組尺寸/顏色，例如 110 / 黑色。若只填尺寸或只填顏色也會儲存。空白列會忽略。公開商店將規格以標籤顯示，不提供網站內結帳。
