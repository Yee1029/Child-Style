(() => {
  const $ = id => document.getElementById(id);
  const state = { categories: [], products: [], session: null, selectedFiles: [], existingImages: [], galleryItems: [], variants: [] };
  const client = () => window.supabaseClient;
  const money = n => `NT$ ${Number(n || 0).toLocaleString("en-US")}`;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[ch]));
  }
  function slugify(value) {
    const s = String(value || "").trim().toLowerCase()
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s || `product-${Date.now()}`;
  }
  function setMessage(id, message, kind = "") {
    const el = $(id); el.textContent = message; el.className = `message ${kind}`.trim();
  }
  function globalMessage(message, kind = "") {
    const el = $("globalMessage"); el.textContent = message; el.style.color = kind === "error" ? "#b42318" : kind === "success" ? "#197347" : "";
    if (message) window.setTimeout(() => { if (el.textContent === message) el.textContent = ""; }, 6500);
  }
  function showAdmin(session) {
    state.session = session;
    $("loginPanel").hidden = true;
    $("adminPanel").hidden = false;
    $("logoutBtn").hidden = false;
    $("signedInEmail").textContent = session.user.email || "已登入";
    loadEverything();
  }
  function showLogin() {
    state.session = null;
    $("loginPanel").hidden = false;
    $("adminPanel").hidden = true;
    $("logoutBtn").hidden = true;
    $("signedInEmail").textContent = "";
  }
  async function verifyAdmin(session) {
    const { data, error } = await client().from("user_roles")
      .select("role").eq("user_id", session.user.id).maybeSingle();
    if (error) throw error;
    if (!data || data.role !== "admin") {
      await client().auth.signOut();
      throw new Error("這個帳號沒有 admin 權限。請確認 Supabase 的 user_roles 資料表已將此使用者設為 admin。");
    }
    return true;
  }
  async function handleLogin(event) {
    event.preventDefault();
    setMessage("loginMessage", "正在登入…");
    const email = $("email").value.trim();
    const password = $("password").value;
    try {
      if (!client()) throw new Error("Supabase 設定未載入，請確認 supabase-config.js 和 supabase-client.js。");
      const { data, error } = await client().auth.signInWithPassword({ email, password });
      if (error) throw error;
      await verifyAdmin(data.session);
      setMessage("loginMessage", "");
      showAdmin(data.session);
    } catch (error) {
      setMessage("loginMessage", error.message || "登入失敗。", "error");
    }
  }
  async function handleLogout() {
    if (!confirm("確定要登出管理後台嗎？")) return;
    const { error } = await client().auth.signOut();
    if (error) globalMessage(error.message, "error");
    showLogin();
  }
  async function loadEverything() {
    await Promise.all([loadCategories(), loadProducts()]);
    loadSellerOrderStats();
  }
  async function loadCategories() {
    const { data, error } = await client().from("categories")
      .select("id,name,slug,description,sort_order,is_active")
      .order("sort_order", { ascending: true }).order("name", { ascending: true });
    if (error) { globalMessage("載入分類失敗：" + error.message, "error"); return; }
    state.categories = data || [];
    const current = $("categorySelect").value;
    $("categorySelect").innerHTML = `<option value="">請選擇分類</option>` + state.categories
      .filter(c => c.is_active)
      .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
    if (current) $("categorySelect").value = current;
    $("categoryList").innerHTML = state.categories.length ? state.categories.map(c => `
      <div class="category-row">
        <div><strong>${escapeHtml(c.name)}</strong><br><small>${escapeHtml(c.slug)} · ${c.is_active ? "啟用中" : "已停用"}</small></div>
        <button type="button" data-toggle-category="${escapeHtml(c.id)}" data-active="${c.is_active ? "true" : "false"}">${c.is_active ? "停用" : "啟用"}</button>
      </div>`).join("") : `<p class="hint">目前沒有分類，請先新增分類。</p>`;
  }
  async function loadProducts() {
    const { data, error } = await client().from("products")
      .select("id,category_id,name,slug,short_description,description,price,compare_at_price,external_purchase_url,status,is_new,is_bestseller,sort_order,published_at,created_at,categories(name),product_images(id,image_url,is_primary,sort_order,image_type),product_variants(id,size,color,stock_quantity,is_active,sort_order)")
      .order("created_at", { ascending: false });
    if (error) { globalMessage("載入商品失敗：" + error.message, "error"); return; }
    state.products = data || [];
    renderProducts();
    $("totalCount").textContent = state.products.length;
    $("publishedCount").textContent = state.products.filter(p => p.status === "published").length;
    $("draftCount").textContent = state.products.filter(p => p.status === "draft").length;
  }
  function renderProducts() {
    const term = $("productSearch").value.trim().toLowerCase();
    const filter = $("statusFilter").value;
    const list = state.products.filter(p =>
      (filter === "all" || p.status === filter) &&
      `${p.name} ${p.slug || ""} ${p.categories?.name || ""}`.toLowerCase().includes(term)
    );
    $("productList").innerHTML = list.length ? list.map(p => {
      const imgs = (p.product_images || []).slice().sort((a,b) => Number(b.is_primary)-Number(a.is_primary) || a.sort_order-b.sort_order);
      const image = imgs[0]?.image_url;
      return `<article class="product-row">
        <div class="product-thumb">${image ? `<img src="${escapeHtml(image)}" alt="">` : "Child Style"}</div>
        <div><h3>${escapeHtml(p.name)}</h3><div class="product-meta"><span>${escapeHtml(p.categories?.name || "未分類")}</span><span>${money(p.price)}</span><span>${p.is_new ? "新品" : ""}${p.is_bestseller ? " · 熱銷" : ""}</span></div></div>
        <span class="status ${escapeHtml(p.status)}">${p.status === "published" ? "已上架" : p.status === "draft" ? "草稿" : "封存"}</span>
        <div class="row-actions"><button type="button" data-edit-product="${escapeHtml(p.id)}">編輯</button><button type="button" data-toggle-publish="${escapeHtml(p.id)}">${p.status === "published" ? "轉草稿" : "上架"}</button></div>
      </article>`;
    }).join("") : `<p class="hint">找不到商品。可以先新增一個分類，再新增商品。</p>`;
  }
  async function createCategory(event) {
    event.preventDefault();
    const name = $("newCategoryName").value.trim();
    if (!name) return;
    setMessage("categoryMessage", "新增中…");
    const { error } = await client().from("categories").insert({
      name, slug: slugify(name), description: "", sort_order: state.categories.length, is_active: true
    });
    if (error) { setMessage("categoryMessage", error.message, "error"); return; }
    $("newCategoryName").value = "";
    setMessage("categoryMessage", "分類新增成功。", "success");
    await loadCategories();
  }
  async function toggleCategory(button) {
    const id = button.dataset.toggleCategory;
    const isActive = button.dataset.active === "true";
    const { error } = await client().from("categories").update({ is_active: !isActive }).eq("id", id);
    if (error) { globalMessage("更新分類失敗：" + error.message, "error"); return; }
    await loadCategories();
  }
  function variantRow(size = "", color = "", note = "") {
    const row = document.createElement("div");
    row.className = "variant-row";
    row.innerHTML = `
      <input class="variant-size" maxlength="40" placeholder="例如 120 / S" value="${escapeHtml(size)}" aria-label="尺寸">
      <input class="variant-color" maxlength="40" placeholder="例如 黑色 / 米白" value="${escapeHtml(color)}" aria-label="顏色">
      <button type="button" class="variant-remove" aria-label="移除此規格" title="移除此規格">×</button>`;
    $("variantRows").appendChild(row);
  }
  function readVariantRows() {
    return Array.from($("variantRows").querySelectorAll(".variant-row")).map(row => ({
      size: row.querySelector(".variant-size").value.trim(),
      color: row.querySelector(".variant-color").value.trim(),
      note: ""
    })).filter(v => v.size || v.color);
  }
  function renderVariantRows(items = []) {
    $("variantRows").innerHTML = "";
    (items.length ? items : [{size:"",color:"",note:""}]).forEach(v => variantRow(v.size || "", v.color || "", v.note || ""));
  }
  function resetForm() {
    $("productForm").reset();
    $("productId").value = "";
    $("productSlug").value = "";
    $("sortOrder").value = "0";
    $("editorTitle").textContent = "新增商品";
    $("saveProductBtn").textContent = "儲存商品";
    $("galleryPreview").innerHTML = "<span>尚未選擇商品照片</span>";
    $("productImages").value = "";
    state.selectedFiles = [];
    state.existingImages = [];
    state.galleryItems = [];
    renderVariantRows([]);
    setMessage("formMessage", "");
  }
  function fillForm(id) {
    const p = state.products.find(item => String(item.id) === String(id));
    if (!p) return;
    $("productId").value = p.id;
    $("productName").value = p.name || "";
    $("categorySelect").value = p.category_id || "";
    $("productPrice").value = p.price ?? "";
    $("comparePrice").value = p.compare_at_price ?? "";
    $("productSlug").value = p.slug || "";
    $("shortDescription").value = p.short_description || "";
    $("description").value = p.description || "";
    $("purchaseUrl").value = p.external_purchase_url || "";
    $("productStatus").value = p.status || "draft";
    $("sortOrder").value = p.sort_order ?? 0;
    $("isNew").checked = !!p.is_new;
    $("isBestseller").checked = !!p.is_bestseller;
    renderVariantRows((p.product_variants || []).filter(v => v.is_active !== false).sort((a,b) => Number(a.sort_order||0)-Number(b.sort_order||0)).map(v => ({size:v.size,color:v.color,note:""})));
    const imgs = (p.product_images || []).slice().sort((a,b) => Number(b.is_primary)-Number(a.is_primary) || a.sort_order-b.sort_order);
    state.existingImages = imgs.map(im => ({...im}));
    state.selectedFiles = [];
    state.galleryItems = state.existingImages.map(im => ({kind:"existing", id:im.id, url:im.image_url, image:im}));
    $("productImages").value = "";
    renderGalleryPreview();
    $("editorTitle").textContent = "編輯商品";
    $("saveProductBtn").textContent = "儲存修改";
    setMessage("formMessage", "已載入商品，可直接修改。", "success");
    $("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function uploadImage(file, productId, prefix = "gallery") {
    if (!file) return "";
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) throw new Error("圖片格式僅支援 JPG、PNG、WebP。");
    if (file.size > 5 * 1024 * 1024) throw new Error("每張圖片大小不可超過 5MB。");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${productId}/${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await client().storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) throw new Error("圖片上傳失敗：" + error.message);
    return client().storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }
  async function saveProduct(event) {
    event.preventDefault();
    const name = $("productName").value.trim();
    const categoryId = $("categorySelect").value;
    const price = Number($("productPrice").value);
    if (!name || !categoryId || !Number.isFinite(price) || price < 0) {
      setMessage("formMessage", "請填寫商品名稱、分類與有效售價。", "error"); return;
    }
    const id = $("productId").value;
    const slug = slugify($("productSlug").value || name);
    const status = $("productStatus").value;
    const payload = {
      name, category_id: categoryId, slug,
      short_description: $("shortDescription").value.trim(),
      description: $("description").value.trim(),
      price,
      compare_at_price: $("comparePrice").value === "" ? null : Number($("comparePrice").value),
      external_purchase_url: $("purchaseUrl").value.trim() || null,
      status, is_new: $("isNew").checked, is_bestseller: $("isBestseller").checked,
      sort_order: Number($("sortOrder").value || 0),
      published_at: status === "published" ? new Date().toISOString() : null
    };
    const button = $("saveProductBtn");
    button.disabled = true; button.textContent = "儲存中…";
    setMessage("formMessage", "正在儲存商品…");
    try {
      let productId = id;
      if (id) {
        const { error } = await client().from("products").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await client().from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Save the product's size/color combinations. These are display specifications, not checkout selections.
      const variantItems = readVariantRows();
      const { error: variantDeleteError } = await client().from("product_variants").delete().eq("product_id", productId);
      if (variantDeleteError) throw variantDeleteError;
      if (variantItems.length) {
        const variantPayload = variantItems.map((v, index) => ({
          product_id: productId,
          sku: `${slug}-${String(productId).replace(/-/g,"").slice(0,8)}-${index + 1}`,
          size: v.size || null,
          color: v.color || null,
          stock_quantity: 0,
          is_active: true,
          sort_order: index
        }));
        const { error: variantInsertError } = await client().from("product_variants").insert(variantPayload);
        if (variantInsertError) throw variantInsertError;
      }

      // Persist the ordered gallery: retain existing rows, add newly uploaded files, and update sort order.
      const orderedItems = state.galleryItems.slice();
      const existingIds = orderedItems.filter(x => x.kind === "existing").map(x => x.id);
      const removed = state.existingImages.filter(im => !existingIds.includes(im.id));
      for (const im of removed) {
        const { error } = await client().from("product_images").delete().eq("id", im.id).eq("product_id", productId);
        if (error) throw error;
      }
      const finalRows = [];
      for (const item of orderedItems) {
        if (item.kind === "existing") {
          finalRows.push({ id:item.id, image_url:item.url, image_type:item.image?.image_type || "gallery" });
        } else if (item.kind === "new") {
          const imageUrl = await uploadImage(item.file, productId, "gallery");
          const { data, error } = await client().from("product_images").insert({
            product_id: productId, image_url: imageUrl, alt_text: `${name} 商品照片`,
            is_primary: false, sort_order: finalRows.length, image_type: "gallery"
          }).select("id").single();
          if (error) throw error;
          finalRows.push({ id:data.id, image_url:imageUrl, image_type:"gallery" });
        }
      }
      for (let i = 0; i < finalRows.length; i++) {
        const { error } = await client().from("product_images").update({
          sort_order:i, is_primary:i===0
        }).eq("id", finalRows[i].id).eq("product_id", productId);
        if (error) throw error;
      }
      setMessage("formMessage", "儲存成功！", "success");
      globalMessage("商品已儲存。", "success");
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      setMessage("formMessage", error.message || "儲存失敗。", "error");
    } finally {
      button.disabled = false; button.textContent = $("productId").value ? "儲存修改" : "儲存商品";
    }
  }
  async function togglePublish(id) {
    const p = state.products.find(item => String(item.id) === String(id));
    if (!p) return;
    const status = p.status === "published" ? "draft" : "published";
    const { error } = await client().from("products").update({
      status, published_at: status === "published" ? new Date().toISOString() : null
    }).eq("id", id);
    if (error) { globalMessage("更新上架狀態失敗：" + error.message, "error"); return; }
    globalMessage(status === "published" ? "商品已上架。" : "商品已轉為草稿。", "success");
    await loadProducts();
  }
  function renderGalleryPreview() {
    const items = state.galleryItems || [];
    $("galleryPreview").innerHTML = items.length ? items.map((item,i)=>`
      <div class="preview-item gallery-edit-item" draggable="true" data-gallery-index="${i}">
        <img src="${escapeHtml(item.kind==="existing" ? item.url : item.previewUrl)}" alt="商品照片 ${i+1}">
        <small>${i===0?"主圖":`照片 ${i+1}`}${item.kind==="new"?" · 待上傳":""}</small>
        <div class="gallery-item-actions">
          <button type="button" data-gallery-move="-1" ${i===0?"disabled":""} aria-label="照片往前">↑</button>
          <button type="button" data-gallery-move="1" ${i===items.length-1?"disabled":""} aria-label="照片往後">↓</button>
          <button type="button" data-gallery-remove aria-label="刪除照片">刪除</button>
        </div>
      </div>`).join("") : "<span>尚未設定商品照片</span>";
  }
  function previewGalleryFiles(files) {
    const picked = Array.from(files || []);
    if (picked.some(f => !["image/jpeg","image/png","image/webp"].includes(f.type) || f.size > 5*1024*1024)) {
      setMessage("formMessage", "請選擇 JPG、PNG、WebP，且每張圖片不得超過 5MB。", "error"); return;
    }
    for (const file of picked) {
      state.selectedFiles.push(file);
      state.galleryItems.push({kind:"new", file, previewUrl:URL.createObjectURL(file)});
    }
    $("productImages").value = "";
    renderGalleryPreview();
  }
  function moveGalleryItem(index, step) {
    const target = index + step;
    if (target < 0 || target >= state.galleryItems.length) return;
    const [item] = state.galleryItems.splice(index,1);
    state.galleryItems.splice(target,0,item);
    renderGalleryPreview();
  }

  let parsedSellerOrders = [];
  function parseSellerItem(raw) {
    const value = String(raw || "").trim();
    const parts = value.split(",");
    const product = (parts.shift() || value).trim();
    const spec = parts.join(",");
    const sizeMatch = spec.match(/尺寸\s*[-：:]\s*([^,，]+)/i) || value.match(/尺寸\s*[-：:]\s*([^,，]+)/i);
    const colorMatch = spec.match(/顏色\s*[-：:]\s*([^,，]+)/i) || product.match(/[-－]\s*(水洗黑|水洗灰|黑色|白色|米白|灰色|藍色|粉色|奶茶色)\s*$/i);
    return { product_name: product, size: sizeMatch ? sizeMatch[1].trim() : "", color: colorMatch ? colorMatch[1].trim() : "" };
  }
  function isCancelledStatus(status) {
    return /取消|退貨|退款|作廢|未成立/i.test(String(status || ""));
  }
  async function readSellerExcel(file) {
    if (!window.XLSX) throw new Error("Excel 解析元件載入失敗，請重新整理後再試。");
    const buffer = await file.arrayBuffer();
    const book = XLSX.read(buffer, { type: "array", cellDates: false, dense: false });
    const normalize = value => String(value ?? "").replace(/[\s\u3000\uFEFF]+/g, "").trim();

    // 此賣貨便匯出格式的實際商品明細在「非訂單匯入」。
    // 固定優先使用該工作表，避免誤選只有欄位模板的「訂單匯入」。
    const preferredNames = ["非訂單匯入", ...book.SheetNames.filter(n => n !== "非訂單匯入")];
    let selected = null;
    for (const sheetName of preferredNames) {
      const sheet = book.Sheets[sheetName];
      if (!sheet) continue;
      // 不設定 blankrows:false，保留 Excel 原始列位置，方便穩定產生明細鍵。
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
      const headerIndex = rows.findIndex(row => {
        const cells = row.map(normalize);
        return cells.some(v => v.includes("訂單編號")) &&
          cells.some(v => v.includes("商品名稱") || v.includes("品名/規格")) &&
          cells.some(v => v === "數量" || v.includes("數量"));
      });
      if (headerIndex < 0) continue;
      const headers = rows[headerIndex].map(normalize);
      const findCol = (...names) => headers.findIndex(h => names.some(n => h.includes(n)));
      const idx = {
        order: findCol("訂單編號"),
        date: findCol("訂購日期"),
        status: findCol("狀態"),
        item: findCol("商品名稱", "品名/規格"),
        qty: findCol("數量"),
        price: findCol("優惠價", "單價"),
        recipient: findCol("收件人姓名")
      };
      if (idx.order >= 0 && idx.item >= 0 && idx.qty >= 0) {
        selected = { sheetName, rows, headerIndex, idx };
        // 非訂單匯入為首選；若它存在標題列，即使資料列有問題也回報該表錯誤，
        // 不要靜默切換到另一張不含商品資料的模板表。
        if (sheetName === "非訂單匯入") break;
      }
    }
    if (!selected) throw new Error("找不到賣貨便訂單明細欄位。請確認上傳的是「訂單資訊」Excel。");

    const { rows, headerIndex, idx, sheetName } = selected;
    let currentOrder = "", currentDate = "", currentStatus = "", currentRecipient = "";
    const output = [];
    for (let r = headerIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const orderCell = String(row[idx.order] ?? "").trim();
      if (orderCell) {
        currentOrder = orderCell;
        currentDate = idx.date >= 0 ? String(row[idx.date] ?? "") : "";
        currentStatus = idx.status >= 0 ? String(row[idx.status] ?? "").replace(/\s+/g, " ").trim() : "";
        currentRecipient = idx.recipient >= 0 ? String(row[idx.recipient] ?? "") : "";
      }
      const itemRaw = String(row[idx.item] ?? "").trim();
      if (!currentOrder || !itemRaw) continue;
      const parsed = parseSellerItem(itemRaw);
      const quantityText = String(row[idx.qty] ?? "").replace(/,/g, "").trim();
      const quantity = Number(quantityText);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      const priceText = idx.price >= 0 ? String(row[idx.price] ?? "").replace(/,/g, "").trim() : "";
      output.push({
        external_order_id: currentOrder,
        line_key: `${sheetName}-${r + 1}`,
        order_date: currentDate,
        order_status: currentStatus,
        recipient: currentRecipient,
        product_name: parsed.product_name,
        raw_item_name: itemRaw,
        size: parsed.size,
        color: parsed.color,
        quantity,
        unit_price: Number(priceText) || 0,
        source_file: file.name
      });
    }
    if (!output.length) {
      throw new Error(`已讀取「${sheetName}」工作表，但商品明細仍為 0 筆。系統已辨識標題列第 ${headerIndex + 1} 列；請回報此訊息，我會再依實際欄位位置修正。`);
    }
    return output;
  }

  async function importSellerOrders() {
    const file=$("sellerOrderFile").files[0];
    if (!file) return;
    const btn=$("importSellerOrdersBtn"); btn.disabled=true;
    $("orderImportStatus").textContent="正在讀取 Excel…";
    try {
      parsedSellerOrders=await readSellerExcel(file);
      const {error}=await client().from("seller_order_lines").upsert(parsedSellerOrders,{onConflict:"external_order_id,line_key"});
      if(error) throw error;
      $("orderImportStatus").textContent=`成功匯入 ${parsedSellerOrders.length} 筆商品明細（工作表自動辨識）。`;
      $("orderImportStatus").className="message success";
      await loadSellerOrderStats();
    } catch(err) {
      $("orderImportStatus").textContent=err.message||"匯入失敗";
      $("orderImportStatus").className="message error";
    } finally {btn.disabled=false;}
  }
  async function loadSellerOrderStats() {
    const {data,error}=await client().from("seller_order_lines").select("external_order_id,order_status,product_name,size,color,quantity");
    if(error) { $("orderImportStatus").textContent="訂單統計載入失敗："+error.message; return; }
    const all=data||[], active=$("orderStatusFilter").value!=="all"?all.filter(x=>!isCancelledStatus(x.order_status)):all;
    const search=($("orderSearch").value||"").trim().toLowerCase();
    const grouped=new Map(), orders=new Set(), products=new Set();
    let units=0;
    for(const x of active) {
      orders.add(x.external_order_id); products.add(x.product_name); units+=Number(x.quantity||0);
      const key=[x.product_name,x.size||"未標示",x.color||"未標示"].join("||");
      const g=grouped.get(key)||{product:x.product_name,size:x.size||"—",color:x.color||"—",quantity:0,orders:new Set()};
      g.quantity+=Number(x.quantity||0);g.orders.add(x.external_order_id);grouped.set(key,g);
    }
    $("orderCount").textContent=orders.size.toLocaleString();
    $("orderUnits").textContent=units.toLocaleString();
    $("orderProductCount").textContent=products.size.toLocaleString();
    const rows=[...grouped.values()].filter(g=>`${g.product} ${g.size} ${g.color}`.toLowerCase().includes(search)).sort((a,b)=>b.quantity-a.quantity);
    $("orderStatsRows").innerHTML=rows.length?rows.map(g=>`<tr><td>${escapeHtml(g.product)}</td><td>${escapeHtml(g.size)}</td><td>${escapeHtml(g.color)}</td><td><strong>${g.quantity}</strong></td><td>${g.orders.size}</td></tr>`).join(""):`<tr><td colspan="5">沒有符合的訂單資料</td></tr>`;
  }

  function wireEvents() {
    $("loginForm").addEventListener("submit", handleLogin);
    $("sellerOrderFile").addEventListener("change", async e => {
      const file=e.target.files[0]; $("importSellerOrdersBtn").disabled=!file;
      if(file) $("orderImportStatus").textContent=`已選擇：${file.name}`;
    });
    $("importSellerOrdersBtn").addEventListener("click", importSellerOrders);
    $("orderSearch").addEventListener("input", loadSellerOrderStats);
    $("orderStatusFilter").addEventListener("change", loadSellerOrderStats);
    $("logoutBtn").addEventListener("click", handleLogout);
    $("categoryForm").addEventListener("submit", createCategory);
    $("productForm").addEventListener("submit", saveProduct);
    $("resetFormBtn").addEventListener("click", resetForm);
    $("productImages").addEventListener("change", e => previewGalleryFiles(e.target.files));
    $("galleryPreview").addEventListener("click", e => {
      const card = e.target.closest("[data-gallery-index]");
      if (!card) return;
      const index = Number(card.dataset.galleryIndex);
      if (e.target.closest("[data-gallery-remove]")) {
        const item = state.galleryItems[index];
        if (item?.kind === "new") URL.revokeObjectURL(item.previewUrl);
        state.galleryItems.splice(index,1);
        renderGalleryPreview();
      } else {
        const move = e.target.closest("[data-gallery-move]");
        if (move) moveGalleryItem(index, Number(move.dataset.galleryMove));
      }
    });
    let draggedGalleryIndex = null;
    $("galleryPreview").addEventListener("dragstart", e => {
      const card = e.target.closest("[data-gallery-index]");
      if (!card) return;
      draggedGalleryIndex = Number(card.dataset.galleryIndex);
      e.dataTransfer.effectAllowed = "move";
    });
    $("galleryPreview").addEventListener("dragover", e => { if (e.target.closest("[data-gallery-index]")) e.preventDefault(); });
    $("galleryPreview").addEventListener("drop", e => {
      const card = e.target.closest("[data-gallery-index]");
      if (!card || draggedGalleryIndex === null) return;
      e.preventDefault();
      const to = Number(card.dataset.galleryIndex);
      const [item] = state.galleryItems.splice(draggedGalleryIndex,1);
      state.galleryItems.splice(to,0,item);
      draggedGalleryIndex = null;
      renderGalleryPreview();
    });
    $("addVariantBtn").addEventListener("click", () => variantRow());
    $("variantRows").addEventListener("click", e => {
      const remove = e.target.closest(".variant-remove");
      if (remove) {
        const rows = $("variantRows").querySelectorAll(".variant-row");
        if (rows.length > 1) remove.closest(".variant-row").remove();
        else {
          remove.closest(".variant-row").querySelectorAll("input").forEach(input => input.value = "");
        }
      }
    });
    $("productName").addEventListener("input", () => {
      if (!$("productId").value && !$("productSlug").dataset.edited) $("productSlug").value = slugify($("productName").value);
    });
    $("productSlug").addEventListener("input", () => $("productSlug").dataset.edited = "true");
    $("productSearch").addEventListener("input", renderProducts);
    $("statusFilter").addEventListener("change", renderProducts);
    $("refreshBtn").addEventListener("click", loadEverything);
    $("categoryList").addEventListener("click", e => {
      const btn = e.target.closest("[data-toggle-category]");
      if (btn) toggleCategory(btn);
    });
    $("productList").addEventListener("click", e => {
      const edit = e.target.closest("[data-edit-product]");
      const toggle = e.target.closest("[data-toggle-publish]");
      if (edit) fillForm(edit.dataset.editProduct);
      if (toggle) togglePublish(toggle.dataset.togglePublish);
    });
  }
  async function init() {
    renderVariantRows([]);
    wireEvents();
    if (!client()) {
      setMessage("loginMessage", "Supabase 設定未載入，請確認 supabase-config.js、supabase-client.js 與網路連線。", "error");
      return;
    }
    const { data: { session }, error } = await client().auth.getSession();
    if (error) { setMessage("loginMessage", error.message, "error"); return; }
    if (session) {
      try { await verifyAdmin(session); showAdmin(session); }
      catch (error) { showLogin(); setMessage("loginMessage", error.message, "error"); }
    } else showLogin();

    client().auth.onAuthStateChange(async (_event, sessionNow) => {
      if (sessionNow && !state.session) {
        try { await verifyAdmin(sessionNow); showAdmin(sessionNow); }
        catch (error) { showLogin(); setMessage("loginMessage", error.message, "error"); }
      } else if (!sessionNow) showLogin();
    });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
