// Supabase client for the 85°X - store static site.
// supabase-config.js must define SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
(() => {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || !window.supabase?.createClient) {
    console.error("Supabase 尚未設定。請檢查 supabase-config.js 與 CDN 載入順序。");
    window.supabaseClient = null;
    return;
  }

  window.supabaseClient = window.supabase.createClient(url, key);
})();
