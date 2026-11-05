// Child Style storefront: multi-image product gallery + size chart.
let products = [];
let activeCategory = "全部";
let activeGalleryProduct = null;
let activeLightboxIndex = 0;
const $ = id => document.getElementById(id);
const money = n => `NT$ ${Number(n || 0).toLocaleString("en-US")}`;
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
function shapeFor(category) { return category === "下身" ? "pants" : category === "配件" ? "accessory" : "tee"; }
function placeholder(product) { return `<div class="product-placeholder ${shapeFor(product.category)}"><span class="placeholder-label">CHILD STYLE / LITTLE CLOSET</span></div>`; }
function productImage(product, className="") { return product.imageUrl ? `<img class="${className}" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy">` : placeholder(product); }
function card(product) {
 const tag=product.tag?`<span class="product-tag">${escapeHtml(product.tag)}</span>`:"";
 return `<article class="product-card" tabindex="0" role="button" aria-label="查看 ${escapeHtml(product.name)}" data-product-id="${escapeHtml(product.id)}"><div class="product-visual">${tag}${productImage(product)}</div><div class="product-info"><div><p class="product-name">${escapeHtml(product.name)}</p><span class="product-category">${escapeHtml(product.category||"Child Style")} · ${escapeHtml(product.subtitle||"")}</span></div><span class="product-price">${money(product.price)}</span></div></article>`;
}
function renderNew(){ $("newProducts").innerHTML=products.filter(p=>p.isNew||p.tag==="NEW").slice(0,4).map(card).join(""); }
function renderAll(){ const term=$("searchInput").value.trim().toLowerCase(); let shown=products.filter(p=>(activeCategory==="全部"||p.category===activeCategory)&&`${p.name} ${p.subtitle||""} ${p.category||""}`.toLowerCase().includes(term)); const sort=$("sortSelect").value; if(sort==="price-low")shown.sort((a,b)=>a.price-b.price); if(sort==="price-high")shown.sort((a,b)=>b.price-a.price); if(sort==="newest")shown.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)); else if(sort==="featured")shown.sort((a,b)=>a.sortOrder-b.sortOrder); $("allProducts").innerHTML=shown.map(card).join(""); $("emptyState").hidden=shown.length>0; }
function renderSpecs(p){
 const sizes=[...new Set((p.variants||[]).map(v=>v.size).filter(Boolean))];
 const colors=[...new Set((p.variants||[]).map(v=>v.color).filter(Boolean))];
 $("sizeLabels").innerHTML=sizes.length?sizes.map(v=>`<span class="spec-chip">${escapeHtml(v)}</span>`).join(""):`<span class="spec-muted">請至賣貨便商品頁確認尺寸</span>`;
 $("colorLabels").innerHTML=colors.length?colors.map(v=>`<span class="color-chip"><i></i>${escapeHtml(v)}</span>`).join(""):`<span class="spec-muted">請至賣貨便商品頁確認顏色</span>`;
}
function setGalleryImage(url,alt,index=0){
 $("dialogImage").innerHTML=url?`<button type="button" class="main-image-zoom" aria-label="點擊放大照片"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"><span>點擊放大 ⤢</span></button>`:`<div class="gallery-empty">CHILD STYLE</div>`;
 activeLightboxIndex=index;
}
function openLightbox(index=activeLightboxIndex){
 const gallery=activeGalleryProduct?.images||[]; if(!gallery.length)return;
 activeLightboxIndex=(index+gallery.length)%gallery.length;
 const item=gallery[activeLightboxIndex];
 $("lightboxImage").src=item.image_url;
 $("lightboxImage").alt=item.alt_text||activeGalleryProduct.name;
 $("lightboxCaption").textContent=`${activeGalleryProduct.name} · ${activeLightboxIndex+1} / ${gallery.length}${item.image_type==="size_chart"?" · 尺寸表":""}`;
 $("imageLightbox").showModal();
}
function moveLightbox(step){const gallery=activeGalleryProduct?.images||[];if(gallery.length>1)openLightbox(activeLightboxIndex+step);}

function openProduct(id){
 const p=products.find(item=>String(item.id)===String(id)); if(!p)return; activeGalleryProduct=p;
 $("dialogCategory").textContent=`${p.category||"Child Style"} / CHILD STYLE COLLECTION`; $("dialogName").textContent=p.name; $("dialogPrice").textContent=money(p.price); $("dialogDescription").textContent=p.description||p.subtitle||"為日常穿搭打造的 Child Style 選品。";
 const gallery=p.images||[]; setGalleryImage(gallery[0]?.image_url||p.imageUrl,p.name,0);
 $("galleryThumbnails").innerHTML=gallery.length>1?gallery.map((im,i)=>`<button type="button" class="gallery-thumb ${i===0?'active':''}" data-gallery-index="${i}" aria-label="查看第 ${i+1} 張照片"><img src="${escapeHtml(im.image_url)}" alt="${escapeHtml(im.alt_text||`商品照片 ${i+1}`)}"><small>${im.image_type==="size_chart"?"尺寸表":`照片 ${i+1}`}</small></button>`).join(""):"";
 renderSpecs(p);
 const link=$("purchaseLink"); if(p.purchaseUrl){link.href=p.purchaseUrl;link.textContent="前往賣貨便選擇規格並購買 ↗";link.onclick=null;}else{link.href="#";link.textContent="尚未設定賣貨便連結";link.onclick=e=>{e.preventDefault();alert("此商品尚未設定賣貨便網址。");};}
 $("stockNote").textContent="以上尺寸與顏色為商品規格展示；實際可購買規格及庫存請以賣貨便商品頁為準。";
 $("productDialog").showModal();
}
async function loadProducts(){
 const status=$("connectionStatus"),client=window.supabaseClient;
 if(!client){status.textContent="尚未連接資料庫：請檢查 supabase-config.js 設定。";$("emptyState").hidden=false;return;}
 status.textContent="正在從商品資料庫載入…";
 try{
  const {data:rows,error}=await client.from("products").select("id,name,slug,short_description,description,price,compare_at_price,external_purchase_url,status,is_new,is_bestseller,sort_order,created_at,categories(name),product_variants(id,size,color,stock_quantity,is_active),product_images(id,image_url,alt_text,is_primary,sort_order,image_type)").eq("status","published").order("sort_order",{ascending:true}).order("created_at",{ascending:false});
  if(error)throw error;
  products=(rows||[]).map(row=>{const imgs=(row.product_images||[]).slice().sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||a.sort_order-b.sort_order);const gallery=imgs;return{id:row.id,name:row.name,subtitle:row.short_description||"",description:row.description||"",price:Number(row.price),category:row.categories?.name||"未分類",images:gallery,imageUrl:gallery[0]?.image_url||"",purchaseUrl:row.external_purchase_url||"",isNew:!!row.is_new,tag:row.is_new?"NEW":row.is_bestseller?"BEST":"",sortOrder:Number(row.sort_order||0),createdAt:row.created_at,variants:(row.product_variants||[]).filter(v=>v.is_active)};});
  renderNew();renderAll();status.textContent=products.length?`已載入 ${products.length} 件上架商品`:"資料庫連線成功，目前尚無上架商品。";
 }catch(error){console.error(error);status.textContent="商品資料載入失敗，請檢查資料庫欄位與權限。";$("emptyState").hidden=false;$("emptyState").textContent="目前無法載入商品，請確認管理員已執行新版資料庫欄位 SQL。";}
}
document.addEventListener("click",event=>{
 const zoom=event.target.closest(".main-image-zoom"); if(zoom){openLightbox(activeLightboxIndex);return;}
 const thumb=event.target.closest("[data-gallery-index]"); if(thumb&&activeGalleryProduct){const i=Number(thumb.dataset.galleryIndex);const im=activeGalleryProduct.images[i];if(im){setGalleryImage(im.image_url,activeGalleryProduct.name,i);document.querySelectorAll(".gallery-thumb").forEach((b,j)=>b.classList.toggle("active",j===i));}return;}
 const productCard=event.target.closest("[data-product-id]");if(productCard)openProduct(productCard.dataset.productId);
 const categoryLink=event.target.closest("[data-category-link]");if(categoryLink){activeCategory=categoryLink.dataset.categoryLink;document.querySelectorAll(".pill").forEach(p=>p.classList.toggle("active",p.dataset.category===activeCategory));renderAll();}
 const pill=event.target.closest(".pill");if(pill){activeCategory=pill.dataset.category;document.querySelectorAll(".pill").forEach(p=>p.classList.toggle("active",p===pill));renderAll();}
});
document.addEventListener("keydown",event=>{const c=event.target.closest&&event.target.closest(".product-card");if(c&&(event.key==="Enter"||event.key===" ")){event.preventDefault();openProduct(c.dataset.productId);}});
$("searchInput").addEventListener("input",renderAll);$("sortSelect").addEventListener("change",renderAll);$("dialogClose").addEventListener("click",()=>$("productDialog").close());$("productDialog").addEventListener("click",e=>{if(e.target===$("productDialog"))$("productDialog").close();});$("menuToggle").addEventListener("click",()=>$("mobileNav").classList.toggle("open"));$("mobileNav").addEventListener("click",e=>{if(e.target.closest("a"))$("mobileNav").classList.remove("open");});loadProducts();

document.addEventListener("DOMContentLoaded",()=>{
 $("lightboxClose")?.addEventListener("click",()=>$("imageLightbox").close());
 $("lightboxPrev")?.addEventListener("click",()=>moveLightbox(-1));
 $("lightboxNext")?.addEventListener("click",()=>moveLightbox(1));
 $("imageLightbox")?.addEventListener("click",e=>{if(e.target===$("imageLightbox"))$("imageLightbox").close();});
 document.addEventListener("keydown",e=>{if(!$("imageLightbox")?.open)return;if(e.key==="ArrowLeft")moveLightbox(-1);if(e.key==="ArrowRight")moveLightbox(1);});
});
