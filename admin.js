(() => {
  const $ = id => document.getElementById(id);
  const state = { categories: [], products: [], session: null, selectedFiles: [], variants: [] };
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
    const gallery = imgs;
    state.selectedFiles = [];
    $("productImages").value = "";
    $("galleryPreview").innerHTML = gallery.length ? gallery.map((im,i)=>`<div class="preview-item"><img src="${escapeHtml(im.image_url)}" alt="商品圖片 ${i+1}"><small>${im.image_type==="size_chart"?"尺寸表":`照片 ${i+1}`}</small></div>`).join("") : "<span>尚未設定商品照片</span>";
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

      // Append all newly selected gallery photos; keep existing photos intact.
      const { data: existingGallery, error: galleryReadError } = await client().from("product_images")
        .select("id,sort_order,is_primary,image_type").eq("product_id", productId).eq("image_type", "gallery").order("sort_order", { ascending: true });
      if (galleryReadError) throw galleryReadError;
      let nextOrder = (existingGallery || []).reduce((m, im) => Math.max(m, Number(im.sort_order || 0)), -1) + 1;
      for (let i = 0; i < state.selectedFiles.length; i++) {
        const imageUrl = await uploadImage(state.selectedFiles[i], productId, "gallery");
        const isPrimary = (existingGallery || []).length === 0 && i === 0;
        const { error } = await client().from("product_images").insert({
          product_id: productId, image_url: imageUrl, alt_text: `${name} 商品照片 ${nextOrder + 1}`,
          is_primary: isPrimary, sort_order: nextOrder++, image_type: "gallery"
        });
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
  function previewGalleryFiles(files) {
    state.selectedFiles = Array.from(files || []);
    if (state.selectedFiles.some(f => !["image/jpeg","image/png","image/webp"].includes(f.type) || f.size > 5*1024*1024)) {
      state.selectedFiles = []; setMessage("formMessage", "請選擇 JPG、PNG、WebP，且每張圖片不得超過 5MB。", "error"); return;
    }
    $("galleryPreview").innerHTML = state.selectedFiles.length ? state.selectedFiles.map((f,i)=>`<div class="preview-item"><img src="${URL.createObjectURL(f)}" alt="預覽 ${i+1}"><small>${i===0?"本次第一張":"照片 "+(i+1)}</small></div>`).join("") : "<span>尚未選擇新照片</span>";
  }
  function wireEvents() {
    $("loginForm").addEventListener("submit", handleLogin);
    $("logoutBtn").addEventListener("click", handleLogout);
    $("categoryForm").addEventListener("submit", createCategory);
    $("productForm").addEventListener("submit", saveProduct);
    $("resetFormBtn").addEventListener("click", resetForm);
    $("productImages").addEventListener("change", e => previewGalleryFiles(e.target.files));
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
