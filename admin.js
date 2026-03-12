(function () {
  const API = '/api/portfolio';
  const form = document.getElementById('admin-form');
  const viewOrders = document.getElementById('admin-view-orders');
  const viewPortfolio = document.getElementById('admin-view-portfolio');
  const ordersTbody = document.getElementById('admin-orders-tbody');
  const ordersEmpty = document.getElementById('admin-orders-empty');

  function toast(message, type) {
    type = type || 'info';
    var el = document.getElementById('admin-toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'admin-toast admin-toast--' + type + ' admin-toast--visible';
    clearTimeout(el._toastTimer);
    el._toastTimer = setTimeout(function () {
      el.classList.remove('admin-toast--visible');
    }, 3500);
  }

  function getPage() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    return hash === 'orders' ? 'orders' : 'portfolio';
  }

  function showView() {
    var page = getPage();
    if (viewOrders) viewOrders.style.display = page === 'orders' ? 'block' : 'none';
    if (viewPortfolio) viewPortfolio.style.display = page === 'portfolio' ? 'block' : 'none';
    document.querySelectorAll('.admin-nav-link--page').forEach(function (a) {
      a.classList.toggle('active', (a.getAttribute('data-page') || '') === page);
    });
    if (page === 'orders') loadOrders();
  }

  function getOrdersFilter() {
    var sel = document.getElementById('admin-orders-filter');
    return (sel && sel.value) || '';
  }

  function getAdminLang() {
    return (window.i18n && window.i18n.getLang && window.i18n.getLang()) || 'tr';
  }

  function formatOrderOptions(o, lang) {
    var isEn = lang === 'en';
    var parts = [];
    try {
      var parsed = typeof o.options === 'string' ? JSON.parse(o.options || '{}') : (o.options || {});
      if (!parsed || typeof parsed !== 'object') return o.options || '—';

      if (o.packageType === 'photo') {
        var photo = parsed.photoCount != null ? Number(parsed.photoCount) : 0;
        var video = parsed.videoCount != null ? Number(parsed.videoCount) : 0;
        if (isEn) {
          parts.push(photo + ' photo' + (photo !== 1 ? 's' : ''));
          parts.push(video + ' video' + (video !== 1 ? 's' : ''));
        } else {
          parts.push(photo + ' fotoğraf');
          parts.push(video + ' video');
        }
        return parts.join(', ');
      }

      if (o.packageType === 'website') {
        if (parsed.theme) parts.push(isEn ? 'Theme: ' + parsed.theme : 'Tema: ' + parsed.theme);
        if (parsed.products) parts.push(isEn ? 'Products: ' + parsed.products : 'Ürün: ' + parsed.products);
        if (parsed.seo) parts.push(isEn ? 'Advanced SEO' : 'Gelişmiş SEO');
        if (parsed.blog) parts.push(isEn ? 'Blog setup' : 'Blog kurulumu');
        if (parsed.consultancy) parts.push(isEn ? 'Monthly consultancy' : 'Aylık danışmanlık');
        return parts.length ? parts.join(' · ') : '—';
      }

      return Object.keys(parsed).map(function (k) {
        var v = parsed[k];
        return v === true ? (isEn ? 'Yes' : 'Evet') : (k + ': ' + v);
      }).join(', ');
    } catch (e) {
      return o.options || '—';
    }
  }

  function updateOrdersStats(orders) {
    if (!orders || !Array.isArray(orders)) return;
    var totalEl = document.getElementById('admin-stat-orders-total');
    var newEl = document.getElementById('admin-stat-orders-new');
    if (totalEl) totalEl.textContent = orders.length;
    if (newEl) newEl.textContent = orders.filter(function (o) { return (o.status || 'yeni') === 'yeni'; }).length;
  }

  function updateOrderStatus(id, status) {
    fetch('/api/orders/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status })
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function () {
        toast('Durum güncellendi.');
        loadOrders();
      })
      .catch(function () {
        toast('Durum güncellenemedi.', 'error');
      });
  }

  function loadOrders() {
    if (!ordersTbody) return;
    ordersTbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">Yükleniyor…</td></tr>';
    if (ordersEmpty) ordersEmpty.style.display = 'none';
    fetch('/api/orders')
      .then(function (r) { return r.json(); })
      .then(function (orders) {
        if (!orders || !Array.isArray(orders)) orders = [];
        var filter = getOrdersFilter();
        var filtered = filter ? orders.filter(function (o) { return (o.status || 'yeni') === filter; }) : orders;
        updateOrdersStats(orders);
        if (filtered.length === 0) {
          ordersTbody.innerHTML = '';
          if (ordersEmpty) {
            ordersEmpty.style.display = 'block';
            var tMsg = (window.i18n && window.i18n.t) ? window.i18n.t.bind(window.i18n) : function (k) { return k; };
            ordersEmpty.textContent = filter ? tMsg('admin.emptyFiltered') : tMsg('admin.emptyOrders');
          }
          return;
        }
        ordersTbody.innerHTML = '';
        var adminLang = getAdminLang();
        var locale = adminLang === 'en' ? 'en-GB' : 'tr-TR';
        filtered.forEach(function (o) {
          var date = o.createdAt ? new Date(o.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
          var opts = formatOrderOptions(o, adminLang);
          var status = (o.status || 'yeni').toLowerCase();
          var t = (window.i18n && window.i18n.t) ? window.i18n.t.bind(window.i18n) : function (k) { return k; };
          var lblNew = t('admin.statusNew');
          var lblProgress = t('admin.statusInProgress');
          var lblDone = t('admin.statusDone');
          var lblCancelled = t('admin.statusCancelled');
          var pkgLabel = o.packageType === 'website' ? (adminLang === 'en' ? 'Shopify store' : 'Shopify Mağaza') : (adminLang === 'en' ? 'Photo & Video' : 'Fotoğraf & Video');
          var tr = document.createElement('tr');
          tr.dataset.orderId = o.id;
          tr.innerHTML =
            '<td>' + date + '</td>' +
            '<td>' + (o.name || '—') + '<br><small class="admin-table-muted">' + (o.email || '') + '</small></td>' +
            '<td>' + pkgLabel + '</td>' +
            '<td class="admin-order-detail">' + (opts || '—') + (o.message ? '<br><span class="admin-order-note">' + (adminLang === 'en' ? 'Note: ' : 'Not: ') + o.message.slice(0, 120) + (o.message.length > 120 ? '…' : '') + '</span>' : '') + '</td>' +
            '<td><strong>₺' + Number(o.total || 0).toLocaleString(adminLang === 'en' ? 'en-GB' : 'tr-TR') + '</strong></td>' +
            '<td class="admin-order-status-cell">' +
            '<select class="admin-status-select" data-order-id="' + o.id + '" title="' + (adminLang === 'en' ? 'Update status' : 'Durumu güncelle') + '">' +
            '<option value="yeni"' + (status === 'yeni' ? ' selected' : '') + '>' + lblNew + '</option>' +
            '<option value="işlemde"' + (status === 'işlemde' ? ' selected' : '') + '>' + lblProgress + '</option>' +
            '<option value="tamamlandı"' + (status === 'tamamlandı' ? ' selected' : '') + '>' + lblDone + '</option>' +
            '<option value="iptal"' + (status === 'iptal' ? ' selected' : '') + '>' + lblCancelled + '</option>' +
            '</select>' +
            '</td>';
          ordersTbody.appendChild(tr);
          var select = tr.querySelector('.admin-status-select');
          if (select) select.addEventListener('change', function () { updateOrderStatus(o.id, this.value); });
        });
      })
      .catch(function () {
        ordersTbody.innerHTML = '<tr><td colspan="6" class="admin-table-empty">Siparişler yüklenemedi.</td></tr>';
        toast('Siparişler yüklenemedi.', 'error');
      });
  }

  window.addEventListener('hashchange', showView);
  document.querySelectorAll('.admin-nav-link--page').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); window.location.hash = a.getAttribute('data-page') || 'portfolio'; });
  });
  var ordersFilter = document.getElementById('admin-orders-filter');
  if (ordersFilter) ordersFilter.addEventListener('change', loadOrders);
  var ordersRefresh = document.getElementById('admin-orders-refresh');
  if (ordersRefresh) ordersRefresh.addEventListener('click', loadOrders);
  showView();
  const listEl = document.getElementById('admin-list');
  const listLoading = document.getElementById('admin-list-loading');
  const listEmpty = document.getElementById('admin-list-empty');
  const editId = document.getElementById('admin-edit-id');
  const cancelEditBtn = document.getElementById('admin-cancel-edit');
  const submitBtn = document.getElementById('admin-submit');

  function loadList() {
    listLoading.style.display = 'block';
    listEmpty.style.display = 'none';
    listEl.querySelectorAll('.admin-item').forEach((e) => e.remove());
    fetch(API)
      .then((r) => r.json())
      .then((items) => {
        listLoading.style.display = 'none';
        var list = Array.isArray(items) ? items : [];
        var totalEl = document.getElementById('admin-stat-portfolio-total');
        if (totalEl) totalEl.textContent = list.length;
        if (!list.length) {
          listEmpty.style.display = 'block';
          return;
        }
        list.forEach((item) => renderItem(item));
      })
      .catch(() => {
        listLoading.style.display = 'none';
        listEmpty.style.display = 'block';
        listEmpty.textContent = 'Liste yüklenemedi.';
        toast('Portfolio listesi yüklenemedi.', 'error');
      });
  }

  function renderItem(item) {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.dataset.id = item.id;
    const img = item.imageUrl
      ? '<img src="' + item.imageUrl + '" alt="" class="admin-item-image" />'
      : '<div class="admin-item-placeholder">Görsel yok</div>';
    div.innerHTML =
      img +
      '<div class="admin-item-body">' +
      '<div class="admin-item-title">' + (item.title || '—') + '</div>' +
      '<div class="admin-item-meta">' + (item.category === 'photo' ? 'Fotoğraf / Video' : 'Website') + (item.link ? ' · ' + item.link : '') + '</div>' +
      (item.description ? '<p style="font-size:0.9rem;color:var(--text-muted);margin:0;">' + item.description + '</p>' : '') +
      '</div>' +
      '<div class="admin-item-actions">' +
      '<button type="button" class="btn btn-ghost btn-edit">Düzenle</button>' +
      '<button type="button" class="btn btn-ghost btn-delete">Sil</button>' +
      '</div>';
    listEl.appendChild(div);
    div.querySelector('.btn-edit').addEventListener('click', () => setEdit(item));
    div.querySelector('.btn-delete').addEventListener('click', () => deleteItem(item.id));
  }

  function setEdit(item) {
    editId.value = item.id;
    document.getElementById('admin-title').value = item.title || '';
    document.getElementById('admin-description').value = item.description || '';
    document.getElementById('admin-category').value = item.category || 'website';
    document.getElementById('admin-link').value = item.link || '';
    document.getElementById('admin-image').value = '';
    var mediaInput = document.getElementById('admin-media');
    if (mediaInput) mediaInput.value = '';
    toggleMediaGroup();
    submitBtn.textContent = 'Güncelle';
    cancelEditBtn.style.display = 'inline-flex';
    document.getElementById('admin-title').focus();
  }

  function toggleMediaGroup() {
    var cat = document.getElementById('admin-category').value;
    var mediaGroup = document.getElementById('admin-group-media');
    var imageGroup = document.getElementById('admin-group-image');
    if (mediaGroup && imageGroup) {
      mediaGroup.style.display = cat === 'photo' ? 'block' : 'none';
      imageGroup.style.display = cat === 'website' ? 'block' : 'none';
    }
  }
  document.getElementById('admin-category').addEventListener('change', toggleMediaGroup);
  toggleMediaGroup();

  function cancelEdit() {
    editId.value = '';
    form.reset();
    var mediaInput = document.getElementById('admin-media');
    if (mediaInput) mediaInput.value = '';
    submitBtn.textContent = 'Ekle';
    cancelEditBtn.style.display = 'none';
    toggleMediaGroup();
  }

  function deleteItem(id) {
    if (!confirm('Bu öğeyi silmek istediğinize emin misiniz?')) return;
    fetch(API + '/' + id, { method: 'DELETE' })
      .then((r) => (r.ok ? loadList() : Promise.reject()))
      .then(function () { toast('Öğe silindi.'); })
      .catch(function () { toast('Silinemedi.', 'error'); });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editId.value;
    const fd = new FormData();
    fd.set('title', document.getElementById('admin-title').value);
    fd.set('description', document.getElementById('admin-description').value);
    fd.set('category', document.getElementById('admin-category').value);
    fd.set('link', document.getElementById('admin-link').value);
    if (!fd.get('title').trim()) return;
    var imgInput = document.getElementById('admin-image');
    var mediaInput = document.getElementById('admin-media');
    if (imgInput && imgInput.files[0]) fd.append('image', imgInput.files[0]);
    if (mediaInput && mediaInput.files.length) for (var i = 0; i < mediaInput.files.length; i++) fd.append('media', mediaInput.files[i]);
    submitBtn.disabled = true;
    const url = id ? API + '/' + id : API;
    const method = id ? 'PUT' : 'POST';
    fetch(url, { method, body: fd })
      .then(function (r) {
        if (r.ok) return r.json();
        return r.json().then(function (data) { return Promise.reject({ status: r.status, data: data }); }).catch(function () {
          return Promise.reject({ status: r.status, data: {} });
        });
      })
      .then(function () {
        cancelEdit();
        loadList();
        toast(editId.value ? 'Güncellendi.' : 'Eklendi.');
      })
      .catch(function (err) {
        var msg = (err && err.data && err.data.error) ? err.data.error : 'Kaydedilemedi.';
        toast(msg, 'error');
      })
      .finally(function () { submitBtn.disabled = false; });
  });

  cancelEditBtn.addEventListener('click', cancelEdit);
  loadList();
})();
