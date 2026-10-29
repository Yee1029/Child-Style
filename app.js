// Child Style storefront. Product content is loaded from Supabase.
// Only published products are visible to public visitors because RLS is enabled.
let products = [];
let activeCategory = "全部";
const $ = (id) => document.getElementById(id);
const money = n => `NT$ ${Number(n || 0).toLocaleString("en-US")}`;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}
function shapeFor(category) {
  if (category === "下身") return "pants";
  if (category === "配件") return "accessory";
  return "tee";
}
function placeholder(product) {
  const color = product.placeholderColor || "#202020";
  return `<div class="product-placeholder ${shapeFor(product.category)}" style="--garment:${escapeHtml(color)}"><span class="placeholder-label">CHILD STYLE / LITTLE CLOSET</span></div>`;
}
function productImage(product, className = "") {
  const image = product.imageUrl;
  if (!image) return placeholder(product);
  return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'image-fallback'}))">`;
}
function card(product) {
  const tag = product.tag ? `<span class="product-tag">${escapeHtml(product.tag)}</span>` : "";
  return `<article class="product-card" tabindex="0" role="button" aria-label="查看 ${escapeHtml(product.name)}" data-product-id="${escapeHtml(product.id)}">
    <div class="product-visual">${tag}${productImage(product)}</div>
    <div class="product-info"><div><p class="product-name">${escapeHtml(product.name)}</p><span class="product-category">${escapeHtml(product.category || "Child Style")} · ${escapeHtml(product.subtitle || "")}</span></div><span class="product-price">${money(product.price)}</span></div>
  </article>`;
}
function renderNew() {
  const newest = products.filter(p => p.isNew || p.tag === "NEW").slice(0,4);
  $("newProducts").innerHTML = newest.map(card).join("");
}
function renderAll() {
  const term = $("searchInput").value.trim().toLowerCase();
  let shown = products.filter(p =>
    (activeCategory === "全部" || p.category === activeCategory) &&
    `${p.name} ${p.subtitle || ""} ${p.category || ""}`.toLowerCase().includes(term)
  );
  const sort = $("sortSelect").value;
  if (sort === "price-low") shown.sort((a,b) => a.price-b.price);
  if (sort === "price-high") shown.sort((a,b) => b.price-a.price);
  if (sort === "newest") shown.sort((a,b) => new Date(b.createdAt || 0)-new Date(a.createdAt || 0));
  else if (sort === "featured") shown.sort((a,b) => a.sortOrder-b.sortOrder);
  $("allProducts").innerHTML = shown.map(card).join("");
  $("emptyState").hidden = shown.length > 0;
}
function openProduct(id) {
  const p = products.find(item => String(item.id) === String(id));
  if (!p) return;
  $("dialogImage").innerHTML = productImage(p);
  $("dialogCategory").textContent = `${p.category || "Child Style"} / CHILD STYLE COLLECTION`;
  $("dialogName").textContent = p.name;
  $("dialogPrice").textContent = money(p.price);
  $("dialogDescription").textContent = p.description || p.subtitle || "為日常穿搭打造的 Child Style 童裝選品。";
  const sizes = [...new Set((p.variants || []).map(v => v.size).filter(Boolean))];
  const colors = [...new Set((p.variants || []).map(v => v.color).filter(Boolean))];
  $("sizeSelect").innerHTML = (sizes.length ? sizes : ["請至賣貨便確認"]).map(s => `<option>${escapeHtml(s)}</option>`).join("");
  $("colorSelect").innerHTML = (colors.length ? colors : ["請至賣貨便確認"]).map(c => `<option>${escapeHtml(c)}</option>`).join("");
  $("stockNote").textContent = "尺寸、顏色及庫存請以賣貨便商品頁的最新資訊為準。";
  const link = $("purchaseLink");
  if (p.purchaseUrl) {
    link.href = p.purchaseUrl;
    link.textContent = "前往賣貨便購買 ↗";
    link.onclick = null;
    link.setAttribute("aria-disabled", "false");
  } else {
    link.href = "#";
    link.textContent = "尚未設定賣貨便連結";
    link.onclick = event => {
      event.preventDefault();
      alert("此商品尚未設定賣貨便網址，請由管理員在商品資料中填入 external_purchase_url。");
    };
  }
  $("productDialog").showModal();
}
async function loadProducts() {
  const status = $("connectionStatus");
  const client = window.supabaseClient;
  if (!client) {
    status.textContent = "尚未連接資料庫：請檢查 supabase-config.js 設定。";
    $("emptyState").hidden = false;
    $("emptyState").textContent = "商品目前無法載入，請稍後再試。";
    return;
  }

  status.textContent = "正在從商品資料庫載入…";
  try {
    const { data: rows, error } = await client
      .from("products")
      .select("id, name, slug, short_description, description, price, compare_at_price, external_purchase_url, status, is_new, is_bestseller, sort_order, created_at, categories(name), product_variants(id, size, color, stock_quantity, is_active), product_images(id, image_url, alt_text, is_primary, sort_order)")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    products = (rows || []).map(row => {
      const imgs = (row.product_images || []).slice().sort((a,b) =>
        Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
      );
      return {
        id: row.id,
        name: row.name,
        subtitle: row.short_description || "",
        description: row.description || "",
        price: Number(row.price),
        category: row.categories?.name || "未分類",
        imageUrl: imgs[0]?.image_url || "",
        purchaseUrl: row.external_purchase_url || "",
        isNew: !!row.is_new,
        tag: row.is_new ? "NEW" : (row.is_bestseller ? "BEST" : ""),
        sortOrder: Number(row.sort_order || 0),
        createdAt: row.created_at,
        variants: (row.product_variants || []).filter(v => v.is_active)
      };
    });

    renderNew();
    renderAll();
    status.textContent = products.length
      ? `已載入 ${products.length} 件上架商品`
      : "資料庫連線成功，目前尚無上架商品。請先建立分類並將商品狀態設為 published。";
  } catch (error) {
    console.error("載入 Supabase 商品失敗：", error);
    status.textContent = "商品資料載入失敗，請檢查 Supabase 權限與資料表關聯。";
    $("emptyState").hidden = false;
    $("emptyState").textContent = "目前無法載入商品。請開啟瀏覽器開發者工具 Console 查看錯誤訊息。";
  }
}

document.addEventListener("click", event => {
  const productCard = event.target.closest("[data-product-id]");
  if (productCard) openProduct(productCard.dataset.productId);
  const categoryLink = event.target.closest("[data-category-link]");
  if (categoryLink) {
    activeCategory = categoryLink.dataset.categoryLink;
    document.querySelectorAll(".pill").forEach(p => p.classList.toggle("active", p.dataset.category === activeCategory));
    renderAll();
  }
  const pill = event.target.closest(".pill");
  if (pill) {
    activeCategory = pill.dataset.category;
    document.querySelectorAll(".pill").forEach(p => p.classList.toggle("active", p === pill));
    renderAll();
  }
});
document.addEventListener("keydown", event => {
  const productCard = event.target.closest && event.target.closest(".product-card");
  if (productCard && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault(); openProduct(productCard.dataset.productId);
  }
});
$("searchInput").addEventListener("input", renderAll);
$("sortSelect").addEventListener("change", renderAll);
$("dialogClose").addEventListener("click", () => $("productDialog").close());
$("productDialog").addEventListener("click", event => {
  if (event.target === $("productDialog")) $("productDialog").close();
});
$("menuToggle").addEventListener("click", () => $("mobileNav").classList.toggle("open"));
$("mobileNav").addEventListener("click", event => {
  if (event.target.closest("a")) $("mobileNav").classList.remove("open");
});
loadProducts();
