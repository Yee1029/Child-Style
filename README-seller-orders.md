# Child Style 訂單匯入修正版
本版固定優先讀取賣貨便匯出檔的「非訂單匯入」工作表；只有該工作表不存在或沒有符合的欄位標題時，才嘗試其他工作表。保留空白列位置並使用原始 Excel 列號作為明細鍵。
首次使用需先在 Supabase 執行 seller-orders-schema.sql。
