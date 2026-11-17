
(() => {
  'use strict';

  // ==============================
  // DATA DAN KONFIGURASI
  // ==============================

  const KEY = 'superappku-demo-v1';
  const $ = id => document.getElementById(id);
  const money = n => 'Rp ' + Number(n).toLocaleString('id-ID');

  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  const menu = [
    {
      id: 'nasi',
      name: 'Nasi Goreng Spesial',
      desc: 'Nasi hangat, telur, dan ayam',
      price: 22000,
      emoji: '🍛'
    },
    {
      id: 'mie',
      name: 'Mie Ayam Komplit',
      desc: 'Mie gurih dengan pangsit',
      price: 18000,
      emoji: '🍜'
    },
    {
      id: 'ayam',
      name: 'Ayam Geprek',
      desc: 'Pedas nikmat dengan nasi',
      price: 24000,
      emoji: '🍗'
    },
    {
      id: 'kopi',
      name: 'Es Kopi Susu',
      desc: 'Kopi lembut dan gula aren',
      price: 16000,
      emoji: '☕'
    }
  ];

  const locations = {
    Jatimekar: [-6.8398, 107.4741],
    'Stasiun Padalarang': [-6.8435, 107.4981],
    'Alun-alun Padalarang': [-6.8408, 107.4786],
    'Kota Baru Parahyangan': [-6.8586, 107.4948]
  };

  const statusLabel = {
    pending: 'Menunggu driver',
    accepted: 'Diterima driver',
    onway: 'Dalam perjalanan',
    done: 'Selesai',
    preparing: 'Sedang disiapkan',
    ready: 'Siap diambil'
  };

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (data && Array.isArray(data.orders) &&
          Array.isArray(data.cart)) {
        return data;
      }
    } catch (error) {
      console.warn('Gagal membaca data:', error);
    }
    return { orders: [], cart: [] };
  }

  let state = load();

  let rideMap = null;
  let trackingMap = null;
  let rideLine = null;
  let trackLine = null;
  let trackMarker = null;
  let trackTimer = null;
  let toastTimer = null;

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Gagal menyimpan data:', error);
      notify('Penyimpanan browser tidak tersedia.');
    }
  }

  function notify(message) {
    const toast = $('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  function createId() {
    return String(Date.now()) +
      Math.floor(Math.random() * 1000);
  }

  // ==============================
  // NAVIGASI HALAMAN
  // ==============================

  function setPage(page) {
    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('active', el.id === page);
    });

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle(
        'active',
        el.dataset.page === page
      );
    });

    if ($('pageCrumb')) {
      $('pageCrumb').textContent = page.toUpperCase();
    }

    render();

    if (page === 'tracking') {
      initTrackingMap();
      updateTrackingMap();
    }

    if (page === 'customer') {
      initRideMap();
    }

    setTimeout(refreshMaps, 200);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      setPage(btn.dataset.page);
    });
  });

  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => {
      setPage(btn.dataset.go);
    });
  });

  document.querySelectorAll('[data-service]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isRide = btn.dataset.service === 'ride';

      document.querySelectorAll('[data-service]').forEach(el => {
        el.classList.toggle('active', el === btn);
      });

      $('ridePanel').classList.toggle('hidden', !isRide);
      $('foodPanel').classList.toggle('hidden', isRide);

      if (isRide) {
        initRideMap();
        setTimeout(refreshMaps, 200);
      }
    });
  });

  // ==============================
  // PETA LEAFLET
  // ==============================

  function makeMap(id) {
    const element = $(id);
    if (!element) return null;

    if (typeof L === 'undefined') {
      element.textContent =
        'Peta gagal dimuat. Periksa koneksi internet atau Leaflet.';
      console.error('Leaflet belum tersedia.');
      return null;
    }

    const map = L.map(element, {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView([-6.846, 107.486], 13);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }
    ).addTo(map);

    setTimeout(() => map.invalidateSize(), 200);

    return map;
  }

  function refreshMaps() {
    requestAnimationFrame(() => {
      if (rideMap && $('rideMap').getClientRects().length) {
        rideMap.invalidateSize();
      }

      if (trackingMap &&
          $('trackingMap').getClientRects().length) {
        trackingMap.invalidateSize();
      }
    });
  }

  window.addEventListener('resize', refreshMaps);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      setTimeout(refreshMaps, 150);
    }
  });

  function initRideMap() {
    if (rideMap) {
      refreshMaps();
      return;
    }

    rideMap = makeMap('rideMap');
    if (!rideMap) return;

    Object.entries(locations).forEach(([name, coords]) => {
      L.circleMarker(coords, {
        radius: 7,
        color: '#173e34',
        fillColor: '#7da991',
        fillOpacity: 0.9
      }).addTo(rideMap).bindPopup(name);
    });

    rideLine = L.polyline([], {
      color: '#173e34',
      weight: 4,
      dashArray: '8 7'
    }).addTo(rideMap);

    updateFare();
    updateRidePreview();
    setTimeout(refreshMaps, 200);
  }

  function updateRidePreview() {
    if (!rideMap || !rideLine) return;

    const start = locations[$('pickup').value];
    const end = locations[$('destination').value];

    if (!start || !end) return;

    rideLine.setLatLngs([start, end]);

    if ($('pickup').value === $('destination').value) {
      rideMap.setView(start, 14);
    } else {
      rideMap.fitBounds([start, end], {
        padding: [35, 35],
        maxZoom: 14
      });
    }
  }

  // ==============================
  // SUPERRIDE
  // ==============================

  function updateFare() {
    const pickup = $('pickup').value;
    const destination = $('destination').value;

    const start = locations[pickup];
    const end = locations[destination];

    if (!start || !end) return;

    const distance = Math.sqrt(
      Math.pow(start[0] - end[0], 2) +
      Math.pow(start[1] - end[1], 2)
    );

    const fare = pickup === destination
      ? 10000
      : Math.round(
          (11000 + distance * 300000) / 1000
        ) * 1000;

    $('fare').textContent = money(fare);
    updateRidePreview();
  }

  $('pickup').addEventListener('change', updateFare);
  $('destination').addEventListener('change', updateFare);

  $('bookRide').addEventListener('click', () => {
    const pickup = $('pickup').value;
    const destination = $('destination').value;

    if (pickup === destination) {
      notify('Lokasi jemput dan tujuan harus berbeda.');
      return;
    }

    const total = Number(
      $('fare').textContent.replace(/[^\d]/g, '')
    );

    state.orders.unshift({
      id: createId(),
      type: 'ride',
      pickup,
      destination,
      total,
      status: 'pending',
      created: Date.now()
    });

    save();
    render();

    notify('Pesanan SuperRide dibuat! Buka Driver untuk menerima.');
  });

  // ==============================
  // SUPERFOOD
  // ==============================

  function renderMenu() {
    $('menuGrid').innerHTML = menu.map(item => `
      <div class="menu-card">
        <div class="food-visual">${item.emoji}</div>
        <div class="menu-body">
          <h4>${safe(item.name)}</h4>
          <p>${safe(item.desc)}</p>
          <div class="menu-bottom">
            <strong>${money(item.price)}</strong>
            <button
              type="button"
              class="add-btn"
              data-add="${item.id}"
            >
              + Tambah
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  $('menuGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-add]');
    if (!button) return;

    const item = state.cart.find(
      x => x.id === button.dataset.add
    );

    if (item) {
      item.qty++;
    } else {
      state.cart.push({
        id: button.dataset.add,
        qty: 1
      });
    }

    save();
    renderCart();
    notify('Makanan ditambahkan ke keranjang.');
  });

  function renderCart() {
    const items = state.cart
      .map(x => {
        const product = menu.find(m => m.id === x.id);
        return product ? { ...product, qty: x.qty } : null;
      })
      .filter(Boolean);

    $('cartCount').textContent = items.reduce(
      (sum, item) => sum + item.qty, 0
    );

    $('cartItems').innerHTML = items.length
      ? items.map(item => `
        <div class="cart-row">
          <span>
            ${item.emoji} ${safe(item.name)}
            <br>
            <small>
              ${item.qty} × ${money(item.price)}
            </small>
          </span>
          <button
            type="button"
            data-remove="${item.id}"
          >−</button>
        </div>
      `).join('')
      : '<p class="empty">Belum ada makanan di keranjang.</p>';

    const total = items.reduce(
      (sum, item) => sum + item.price * item.qty, 0
    );

    $('cartTotal').textContent = money(total);
    $('checkout').disabled = items.length === 0;
  }

  $('cartItems').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;

    const item = state.cart.find(
      x => x.id === button.dataset.remove
    );

    if (!item) return;

    item.qty--;

    if (item.qty <= 0) {
      state.cart = state.cart.filter(x => x !== item);
    }

    save();
    renderCart();
  });

  $('checkout').addEventListener('click', () => {
    const items = state.cart
      .map(x => {
        const product = menu.find(m => m.id === x.id);
        return product ? { ...product, qty: x.qty } : null;
      })
      .filter(Boolean);

    if (!items.length) return;

    state.orders.unshift({
      id: createId(),
      type: 'food',
      items,
      total: items.reduce(
        (sum, x) => sum + x.price * x.qty, 0
      ),
      status: 'pending',
      created: Date.now()
    });

    state.cart = [];

    save();
    render();

    notify('Pesanan SuperFood dibuat! Buka Penjual.');
  });

  // ==============================
  // STATUS DAN KARTU ORDER
  // ==============================

  function statusClass(status) {
    if (status === 'done') return 'done';

    if (['accepted', 'onway', 'preparing', 'ready']
      .includes(status)) {
      return 'active';
    }

    return '';
  }

  function orderText(order) {
    if (order.type === 'ride') {
      return `${safe(order.pickup)} → ${safe(order.destination)}`;
    }

    return (order.items || [])
      .map(x => `${Number(x.qty)}× ${safe(x.name)}`)
      .join(', ');
  }

  function orderCard(order, action = '') {
    const type = order.type === 'ride'
      ? '🛵 SuperRide'
      : '🍱 SuperFood';

    return `
      <div class="order-card">
        <div>
          <h4>${type} · #${safe(order.id)}</h4>
          <p>${orderText(order)}</p>
          <p>
            ${money(order.total)} ·
            ${new Date(order.created).toLocaleString('id-ID')}
          </p>
        </div>
        <div class="order-actions">
          <span class="status ${statusClass(order.status)}">
            ${safe(statusLabel[order.status] || order.status)}
          </span>
          ${action}
        </div>
      </div>
    `;
  }

  function empty(message) {
    return `
      <div class="empty-state">
        ✳
        <br><br>
        ${safe(message)}
      </div>
    `;
  }

  function actionButton(label, orderId, step) {
    return `
      <button
        type="button"
        class="mini-btn"
        data-order="${safe(orderId)}"
        data-step="${step}"
      >
        ${label}
      </button>
    `;
  }

  // ==============================
  // DASHBOARD CUSTOMER, DRIVER,
  // DAN PENJUAL
  // ==============================

  function renderOrders() {
    $('customerOrders').innerHTML = state.orders.length
      ? state.orders.map(o => orderCard(o)).join('')
      : empty('Belum ada pesanan. Yuk coba SuperRide atau SuperFood!');

    const driverOrders = state.orders.filter(o =>
      o.type === 'ride' ||
      ['ready', 'accepted', 'onway', 'done'].includes(o.status)
    );

    $('driverIncoming').textContent = driverOrders.filter(o =>
      o.status === 'pending' || o.status === 'ready'
    ).length;

    $('driverActive').textContent = driverOrders.filter(o =>
      ['accepted', 'onway'].includes(o.status)
    ).length;

    $('driverDone').textContent = driverOrders.filter(o =>
      o.status === 'done'
    ).length;

    $('driverOrders').innerHTML = driverOrders.length
      ? driverOrders.map(order => {
          let action = '';

          if (
            (order.type === 'ride' && order.status === 'pending') ||
            order.status === 'ready'
          ) {
            action = actionButton(
              'Terima order', order.id, 'accepted'
            );
          } else if (order.status === 'accepted') {
            action = actionButton(
              'Mulai perjalanan', order.id, 'onway'
            );
          } else if (order.status === 'onway') {
            action = actionButton(
              'Selesaikan', order.id, 'done'
            );
          }

          return orderCard(order, action);
        }).join('')
      : empty('Belum ada order driver.');

    const foodOrders = state.orders.filter(
      o => o.type === 'food'
    );

    $('sellerTotal').textContent = foodOrders.length;

    $('sellerPending').textContent = foodOrders.filter(o =>
      ['pending', 'preparing'].includes(o.status)
    ).length;

    $('sellerReady').textContent = foodOrders.filter(
      o => o.status === 'ready'
    ).length;

    $('sellerOrders').innerHTML = foodOrders.length
      ? foodOrders.map(order => {
          let action = '';

          if (order.status === 'pending') {
            action = actionButton(
              'Siapkan', order.id, 'preparing'
            );
          } else if (order.status === 'preparing') {
            action = actionButton(
              'Siap diambil', order.id, 'ready'
            );
          }

          return orderCard(order, action);
        }).join('')
      : empty('Belum ada pesanan makanan.');
  }

  function handleAction(event) {
    const button = event.target.closest('[data-order]');
    if (!button) return;

    const order = state.orders.find(
      o => o.id === button.dataset.order
    );

    if (!order) return;

    const valid = {
      pending: order.type === 'ride'
        ? ['accepted']
        : ['preparing'],
      preparing: ['ready'],
      ready: ['accepted'],
      accepted: ['onway'],
      onway: ['done']
    };

    if (!(valid[order.status] || [])
      .includes(button.dataset.step)) {
      return;
    }

    order.status = button.dataset.step;

    save();
    render();

    notify(
      `Order #${order.id}: ${statusLabel[order.status]}`
    );
  }

  $('driverOrders').addEventListener('click', handleAction);
  $('sellerOrders').addEventListener('click', handleAction);

  // ==============================
  // TRACKING GPS
  // ==============================

  function initTrackingMap() {
    if (trackingMap) {
      refreshMaps();
      return;
    }

    trackingMap = makeMap('trackingMap');
    if (!trackingMap) return;

    trackLine = L.polyline([], {
      color: '#2b775b',
      weight: 5,
      dashArray: '8 8'
    }).addTo(trackingMap);

    trackMarker = L.marker(
      locations.Jatimekar
    ).addTo(trackingMap)
      .bindPopup('🛵 Driver demo');

    setTimeout(refreshMaps, 200);
  }

  function getTrackingPoints(order) {
    if (order.type === 'ride') {
      return [
        locations[order.pickup],
        locations[order.destination]
      ];
    }

    return [
      locations.Jatimekar,
      locations['Stasiun Padalarang']
    ];
  }

  function updateTrackingMap() {
    if (!trackingMap || !trackLine || !trackMarker) return;

    const order = state.orders.find(
      o => o.id === $('trackOrder').value
    );

    if (!order) {
      trackLine.setLatLngs([]);
      trackMarker.setOpacity(0);
      return;
    }

    const [start, end] = getTrackingPoints(order);
    if (!start || !end) return;

    trackLine.setLatLngs([start, end]);
    trackMarker.setLatLng(start);
    trackMarker.setOpacity(1);

    trackingMap.fitBounds([start, end], {
      padding: [35, 35],
      maxZoom: 14
    });

    setTimeout(refreshMaps, 150);
  }

  function renderTracking() {
    const select = $('trackOrder');
    const previous = select.value;

    select.innerHTML = state.orders.map(order => `
      <option value="${safe(order.id)}">
        #${safe(order.id)} ·
        ${order.type === 'ride' ? 'SuperRide' : 'SuperFood'} ·
        ${safe(statusLabel[order.status] || order.status)}
      </option>
    `).join('');

    if (state.orders.some(o => o.id === previous)) {
      select.value = previous;
    }

    const order = state.orders.find(
      o => o.id === select.value
    );

    $('startTracking').disabled = !order;

    $('trackingInfo').innerHTML = order
      ? `
        <strong>Order #${safe(order.id)}</strong>
        <br>
        ${orderText(order)}
        <br>
        Status: ${safe(statusLabel[order.status])}
        <br>
        Tracking: simulasi lokasi
      `
      : 'Belum ada pesanan untuk dilacak.';
  }

  $('trackOrder').addEventListener('change', () => {
    clearInterval(trackTimer);
    trackTimer = null;
    renderTracking();
    updateTrackingMap();
  });

  $('startTracking').addEventListener('click', () => {
    const order = state.orders.find(
      o => o.id === $('trackOrder').value
    );

    if (!order) {
      notify('Buat pesanan terlebih dahulu.');
      return;
    }

    initTrackingMap();

    if (!trackingMap || !trackMarker || !trackLine) {
      notify('Peta belum siap. Periksa koneksi internet.');
      return;
    }

    const [start, end] = getTrackingPoints(order);

    if (!start || !end) {
      notify('Lokasi pesanan tidak ditemukan.');
      return;
    }

    clearInterval(trackTimer);

    trackLine.setLatLngs([start, end]);
    trackMarker.setLatLng(start).setOpacity(1);

    trackingMap.fitBounds([start, end], {
      padding: [35, 35],
      maxZoom: 14
    });

    refreshMaps();
    notify('Simulasi GPS driver dimulai!');

    let progress = 0;

    trackTimer = setInterval(() => {
      progress = Math.min(1, progress + 0.025);

      const lat = start[0] +
        (end[0] - start[0]) * progress;

      const lng = start[1] +
        (end[1] - start[1]) * progress;

      trackMarker.setLatLng([lat, lng]);

      if (progress >= 1) {
        clearInterval(trackTimer);
        trackTimer = null;
        notify('Simulasi driver sampai tujuan!');
      }
    }, 120);
  });

  // ==============================
  // FUNGSI RENDER UTAMA
  // FIX ERROR "render is not defined"
  // ==============================

  function render() {
    renderCart();
    renderOrders();
    renderTracking();
  }

  // ==============================
  // RESET DATA DEMO
  // ==============================

  $('resetDemo').addEventListener('click', () => {
    const confirmed = confirm(
      'Hapus semua pesanan dan keranjang demo di browser ini?'
    );

    if (!confirmed) return;

    clearInterval(trackTimer);
    trackTimer = null;

    state = {
      orders: [],
      cart: []
    };

    save();
    render();
    setPage('customer');

    notify('Data demo berhasil di-reset.');
  });

  // ==============================
  // JALANKAN APLIKASI
  // ==============================

  function init() {
    renderMenu();
    render();
    initRideMap();

    window.addEventListener('load', () => {
      setTimeout(refreshMaps, 200);
    });
  }

  init();

})();
