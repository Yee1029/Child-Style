// 85°X - store — 初版展示資料。正式版將改由 Supabase 讀取商品。
const products = [
  {id:1,name:"Everyday Boxy Tee",zh:"日常寬版短 T",category:"上衣",price:590,tag:"NEW",sizes:["S","M","L","XL"],colors:["黑色","白色","灰色"],description:"以日常舒適為出發點的寬鬆版型，適合單穿或層次搭配。",garment:"#202020",shape:"tee",newest:6,url:""},
  {id:2,name:"Essential Logo Tee",zh:"經典 Logo 短 T",category:"上衣",price:490,tag:"BEST",sizes:["S","M","L","XL"],colors:["白色","黑色"],description:"簡約俐落的日常單品，讓穿搭回到最舒服的狀態。",garment:"#f8f7f4",shape:"tee",newest:5,url:""},
  {id:3,name:"Relaxed Cargo Pants",zh:"休閒工裝長褲",category:"下身",price:1080,tag:"NEW",sizes:["S","M","L"],colors:["軍綠","黑色"],description:"寬鬆輪廓搭配實用口袋，為日常穿搭增加層次。",garment:"#6c725b",shape:"pants",newest:4,url:""},
  {id:4,name:"Daily Tote Bag",zh:"日常帆布托特包",category:"配件",price:390,tag:"",sizes:["F"],colors:["米白","黑色"],description:"輕便好搭的日常托特包，通勤、出門都能使用。",garment:"#b8a78e",shape:"accessory",newest:3,url:""},
  {id:5,name:"Heavyweight Sweatshirt",zh:"重磅落肩大學 T",category:"上衣",price:990,tag:"",sizes:["M","L","XL"],colors:["炭灰","米白"],description:"厚實布料與落肩剪裁，適合微涼天氣與日常層次穿搭。",garment:"#777773",shape:"tee",newest:2,url:""},
  {id:6,name:"Straight Fit Denim",zh:"直筒丹寧長褲",category:"下身",price:1180,tag:"",sizes:["S","M","L","XL"],colors:["深藍","淺藍"],description:"俐落直筒版型，容易搭配不同風格的上衣與鞋款。",garment:"#38495d",shape:"pants",newest:1,url:""},
  {id:7,name:"Everyday Cap",zh:"日常棒球帽",category:"配件",price:450,tag:"",sizes:["F"],colors:["黑色","卡其"],description:"簡潔輪廓與低調配色，為整體穿搭補上最後一筆。",garment:"#292929",shape:"accessory",newest:0,url:""},
  {id:8,name:"Layered Long Sleeve",zh:"層次感長袖上衣",category:"上衣",price:790,tag:"SALE",sizes:["S","M","L"],colors:["白色","黑色"],description:"適合單穿或內搭的長袖基本款，打造自在的日常風格。",garment:"#c5bdb0",shape:"tee",newest:0,url:""}
];
let activeCategory = "全部";
const $ = (id) => document.getElementById(id);
const money = n => `NT$ ${Number(n).toLocaleString("en-US")}`;

function placeholder(product) {
  return `<div class="product-placeholder ${product.shape}" style="--garment:${product.garment}"><span class="placeholder-label">85°X / ESSENTIALS</span></div>`;
}
function card(product) {
  const tag = product.tag ? `<span class="product-tag">${product.tag}</span>` : "";
  return `<article class="product-card" tabindex="0" role="button" aria-label="查看 ${product.zh}" data-product-id="${product.id}">
    <div class="product-visual">${tag}${placeholder(product)}</div>
    <div class="product-info"><div><p class="product-name">${product.zh}</p><span class="product-category">${product.category} · ${product.name}</span></div><span class="product-price">${money(product.price)}</span></div>
  </article>`;
}
function renderNew() {
  $("newProducts").innerHTML = products.filter(p => p.tag === "NEW" || p.tag === "BEST").slice(0,4).map(card).join("");
}
function renderAll() {
  const term = $("searchInput").value.trim().toLowerCase();
  let shown = products.filter(p => (activeCategory === "全部" || p.category === activeCategory) &&
    `${p.name} ${p.zh} ${p.category}`.toLowerCase().includes(term));
  const sort = $("sortSelect").value;
  if (sort === "price-low") shown.sort((a,b) => a.price-b.price);
  if (sort === "price-high") shown.sort((a,b) => b.price-a.price);
  if (sort === "newest") shown.sort((a,b) => b.newest-a.newest);
  $("allProducts").innerHTML = shown.map(card).join("");
  $("emptyState").hidden = shown.length > 0;
}
function openProduct(id) {
  const p = products.find(item => item.id === Number(id));
  if (!p) return;
  $("dialogImage").innerHTML = placeholder(p);
  $("dialogCategory").textContent = `${p.category.toUpperCase()} / 85°X ESSENTIALS`;
  $("dialogName").textContent = p.zh;
  $("dialogPrice").textContent = money(p.price);
  $("dialogDescription").textContent = p.description;
  $("sizeSelect").innerHTML = p.sizes.map(s => `<option>${s}</option>`).join("");
  $("colorSelect").innerHTML = p.colors.map(c => `<option>${c}</option>`).join("");
  const link = $("purchaseLink");
  if (p.url) {
    link.href = p.url;
    link.classList.remove("is-disabled");
    link.textContent = "前往賣貨便購買 ↗";
    link.onclick = null;
  } else {
    link.href = "#";
    link.textContent = "尚未設定賣貨便連結";
    link.onclick = (event) => { event.preventDefault(); alert("這是展示用商品。正式上線前，請在管理後台填入此商品的賣貨便網址。"); };
  }
  $("productDialog").showModal();
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
renderNew();
renderAll();
