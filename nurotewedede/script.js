// NuroTewedede - Frontend logic (talks to the Express + Supabase API)
// Ported from the React AI Studio prototype (App.tsx + components) into plain vanilla JS.

// ---------- State ----------
let pools = [];
let currentFilter = 'All';
let currentCategory = 'All';
let currentSearchQuery = '';
let currentSort = 'default';
let currentUser = null;
let authMode = 'signin';
let activeTab = 'pools';
let myReservations = [];
let toastTimer = null;

let reserveState = { pool: null, shares: 1, payment: 'telebirr' };
let detailsState = { pool: null, comments: [] };

let calcQuantities = {};
let calcFamilySize = 4;
let selectedHubId = 'hub-addis';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

const PRESET_SAVINGS_ITEMS = [
    { name: 'White Teff (Gojjam)', unitPriceWholesale: 96, unitPriceRetail: 144, defaultKgPerMonth: 25 },
    { name: 'Red Onions (Ziway)', unitPriceWholesale: 54, unitPriceRetail: 88, defaultKgPerMonth: 15 },
    { name: 'Raw Coffee Beans (Sidama)', unitPriceWholesale: 290, unitPriceRetail: 450, defaultKgPerMonth: 5 },
    { name: 'Sunflower Cooking Oil (Litre)', unitPriceWholesale: 155, unitPriceRetail: 210, defaultKgPerMonth: 10 },
    { name: 'Red Lentils (Misir)', unitPriceWholesale: 168, unitPriceRetail: 236, defaultKgPerMonth: 8 }
];

const SUPPLY_HUBS = [
    { id: 'hub-addis', name: 'Addis Ababa Central Hub', town: 'Addis Ababa', address: 'Bole Megenagna & Kazanchis Stations', woredaOrigins: ['Debre Markos (Gojjam)', 'Ziway / Batu', 'Arsi Zone'], activeDeliveriesCount: 8, coordinates: { x: 52, y: 48 } },
    { id: 'hub-adama', name: 'Adama Trade Hub', town: 'Adama', address: 'Posta Bet District', woredaOrigins: ['Mojo Sourcing', 'Wonji Agricultural Zone'], activeDeliveriesCount: 4, coordinates: { x: 58, y: 52 } },
    { id: 'hub-hawassa', name: 'Hawassa Lake Hub', town: 'Hawassa', address: 'Central Market Station', woredaOrigins: ['Yirgacheffe', 'Sidama Highlands'], activeDeliveriesCount: 5, coordinates: { x: 54, y: 68 } },
    { id: 'hub-bahirdar', name: 'Bahir Dar Tana Hub', town: 'Bahir Dar', address: 'Kebele 11 Distribution Depot', woredaOrigins: ['East Gojjam Cooperative', 'South Gondar'], activeDeliveriesCount: 6, coordinates: { x: 42, y: 28 } },
    { id: 'hub-jimma', name: 'Jimma Kaffa Hub', town: 'Jimma', address: 'University Gate Station', woredaOrigins: ['Jimma Farmers Union', 'Bonga Valley'], activeDeliveriesCount: 3, coordinates: { x: 38, y: 62 } },
    { id: 'hub-sodo', name: 'Wolaita Sodo Hub', town: 'Wolaita Sodo', address: 'Main Terminal Station', woredaOrigins: ['Chencha Highlands', 'Humbo Farmers Union'], activeDeliveriesCount: 2, coordinates: { x: 46, y: 72 } }
];

const AI_QUICK_PROMPTS = [
    'How do we plan a 20-family Teff & Spice group order for Addis Ababa?',
    'What are the best storage tips for 50kg red onions to prevent rotting?',
    'When is peak harvest season for Gojjam White Teff and price trends?',
    'Suggest a bulk grocery supply list for a 30-person holiday feast'
];

const AI_WELCOME = `Hello! I am **NuroTewedede AI**, your direct agricultural sourcing and group-buying advisor for Ethiopian neighborhood hubs.

I can assist you with:
- **Bulk Supply Estimates:** Calculating Teff, Onions, Coffee, Oil, or Pulse quantities for 5 to 50 families.
- **Harvest & Price Seasonality:** Finding peak harvest months in Gojjam, Sidama, Ziway, Arsi, and Jimma.
- **Produce Storage Guidelines:** Keeping bulk 50kg bags fresh without spoilage.
- **Holiday Feast Planning:** Scaling bulk grocery orders for community celebrations (Enkutatash, Genna, Timkat, Eid).

Select a quick topic below or type your question!`;

let aiMessages = [
    { id: 'welcome', sender: 'assistant', text: AI_WELCOME, timestamp: 'Just now' }
];
let aiLoading = false;

// ---------- Helpers ----------

function esc(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fmt(n) {
    return Number(n || 0).toLocaleString();
}

function normalizePool(p) {
    const price = Number(p.price) || 0;
    const retailPrice = Number(p.retail_price ?? p.retailPrice) || Math.round(price * 1.35);
    const currentShares = Number(p.current_shares ?? p.currentShares) || 0;
    const targetShares = Number(p.target_shares ?? p.targetShares) || 1;
    const locked = !!(p.locked || p.status === 'locked' || currentShares >= targetShares);
    const town = p.town || 'Addis Ababa';
    return {
        ...p,
        id: String(p.id),
        title: p.title || 'Community Buying Pool',
        town,
        woreda: p.woreda || 'Regional Woreda',
        price,
        retailPrice,
        unit: p.unit || '1 Share',
        currentShares,
        targetShares,
        locked,
        daysRemaining: p.daysRemaining ?? p.days_remaining ?? 3,
        hubLocation: p.hub_location || p.hubLocation || town + ' Neighborhood Distribution Hub',
        imageUrl: p.image_url || p.imageUrl || DEFAULT_IMAGE,
        organizer: p.organizer || 'Neighborhood Group Coordinator',
        commentsCount: p.comments_count ?? p.commentsCount ?? 0,
        pickupDate: p.pickup_date || p.pickupDate || 'This Week',
        category: p.category || 'Groceries',
        status: p.status || (locked ? 'locked' : 'active')
    };
}

function api(path, options = {}) {
    const token = localStorage.getItem('sb-access-token');
    const base = (window.location.origin && window.location.origin !== 'null')
        ? window.location.origin
        : 'http://localhost:5000';
    return fetch(base + path, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        credentials: 'include',
        ...options,
    }).then(async (r) => {
        let body = {};
        try { body = await r.json(); } catch (e) { /* non-JSON */ }
        if (!r.ok) {
            const err = new Error(body.error || 'Request failed');
            err.status = r.status;
            throw err;
        }
        return body;
    }).catch((err) => {
        if (err instanceof TypeError) {
            throw new Error('Cannot reach the server. Make sure the backend is running (npm start in the backend folder).');
        }
        throw err;
    });
}

// ---------- Toast ----------

function showToast(msg, isError) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = 'fixed bottom-6 right-6 z-50 hidden bg-' + (isError ? 'rose' : 'emerald') + '-900 text-white border border-' + (isError ? 'rose' : 'emerald') + '-700 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold';
    toast.classList.remove('hidden');
    toast.classList.add('flex');
    toastTimer = setTimeout(function () {
        toast.classList.add('hidden');
        toast.classList.remove('flex');
    }, 4000);
}

// ---------- Theme ----------

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    html.classList.toggle('dark', !isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    updateThemeIcons();
}

function updateThemeIcons() {
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (sunIcon && moonIcon) {
        sunIcon.classList.toggle('hidden', !isDark);
        moonIcon.classList.toggle('hidden', isDark);
    }
}

function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    updateThemeIcons();
}

// ---------- Navigation / Tabs ----------

function showTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.view-section').forEach(function (sec) {
        sec.classList.add('hidden');
    });
    const target = document.getElementById('view-' + tab);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.mobile-tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.add('hidden');

    if (tab === 'calculator') renderCalculator();
    if (tab === 'hubs') renderHubs();
    if (tab === 'ai') renderAiMessages();
    if (tab === 'myshares') loadMyShares();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('hidden');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

// ---------- Town / Category filtering ----------

function setTown(town) {
    currentFilter = town;
    const dSelect = document.getElementById('town-select');
    const mSelect = document.getElementById('town-select-mobile');
    if (dSelect) dSelect.value = town;
    if (mSelect) mSelect.value = town;
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.className = "filter-btn bg-emerald-900/40 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/20 transition";
    });
    const activeBtn = document.getElementById('btn-' + town);
    if (activeBtn) {
        activeBtn.className = "filter-btn bg-white text-emerald-900 px-3 py-1.5 rounded-lg text-xs font-bold transition";
    }
    renderPools();
}

function setCategory(category) {
    currentCategory = category;
    renderCategoryPills();
    renderPools();
}

function renderCategoryPills() {
    const container = document.getElementById('category-pills');
    if (!container) return;
    const cats = ['All'].concat(Array.from(new Set(pools.map(function (p) { return p.category; }))).filter(Boolean));
    container.innerHTML = cats.map(function (cat) {
        return '<button onclick="setCategory(\'' + esc(cat) + '\')" class="cat-pill px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (cat === currentCategory ? 'active' : 'bg-white/10 text-white hover:bg-white/20') + '">' + esc(cat) + '</button>';
    }).join('');
}

// ---------- Pools ----------

async function fetchPools() {
    try {
        const data = await api('/api/pools');
        pools = (data.pools || []).map(normalizePool);
    } catch (err) {
        console.error('Error fetching pools:', err.message);
        pools = [];
        if (/Cannot reach the server/.test(err.message)) {
            showToast(err.message, true);
        }
    }
    try {
        renderCategoryPills();
    } catch (e) { /* category pills are optional */ }
    renderPools();
}

function updateMetrics() {
    const totalPools = pools.length;
    const uniqueWoredas = new Set(pools.map(function (p) { return p.woreda; })).size;
    const avgSavings = pools.length > 0
        ? Math.round(pools.reduce(function (sum, p) {
            const retail = p.retailPrice;
            return sum + ((retail - p.price) / retail) * 100;
        }, 0) / pools.length)
        : 0;

    const metricPools = document.getElementById('metric-pools');
    const metricWoredas = document.getElementById('metric-woredas');
    const metricSavings = document.getElementById('metric-savings');
    if (metricPools) metricPools.textContent = totalPools;
    if (metricWoredas) metricWoredas.textContent = uniqueWoredas;
    if (metricSavings) metricSavings.textContent = avgSavings + '%';
}

function getSortedPools(list) {
    const sorted = list.slice();
    switch (currentSort) {
        case 'price-asc':
            sorted.sort(function (a, b) { return a.price - b.price; });
            break;
        case 'price-desc':
            sorted.sort(function (a, b) { return b.price - a.price; });
            break;
        case 'savings':
            sorted.sort(function (a, b) {
                return (b.retailPrice - b.price) / b.retailPrice - (a.retailPrice - a.price) / a.retailPrice;
            });
            break;
        case 'progress':
            sorted.sort(function (a, b) {
                return (b.currentShares / b.targetShares) - (a.currentShares / a.targetShares);
            });
            break;
        default:
            break;
    }
    return sorted;
}

function getStatusBadge(pool) {
    if (pool.status === 'ready_for_pickup') {
        return '<span class="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">Ready for Pickup</span>';
    }
    if (pool.status === 'in_transit') {
        return '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">In-Transit Highway</span>';
    }
    if (pool.locked || pool.currentShares >= pool.targetShares) {
        return '<span class="inline-flex items-center gap-1 bg-amber-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">Pool Locked</span>';
    }
    return '<span class="inline-flex items-center gap-1 bg-emerald-800 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">Active Pool</span>';
}

const PIN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243A8 8 0 1117.657 16.657z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';

function renderPools() {
    const grid = document.getElementById('pools-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = currentFilter === 'All'
        ? pools
        : pools.filter(function (p) { return p.town === currentFilter; });

    if (currentCategory !== 'All') {
        filtered = filtered.filter(function (p) { return p.category === currentCategory; });
    }

    const searchStatus = document.getElementById('search-status');
    if (currentSearchQuery.trim()) {
        const q = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(function (p) {
            return p.title.toLowerCase().indexOf(q) !== -1 ||
                p.woreda.toLowerCase().indexOf(q) !== -1 ||
                p.town.toLowerCase().indexOf(q) !== -1 ||
                p.category.toLowerCase().indexOf(q) !== -1;
        });
        if (searchStatus) {
            searchStatus.textContent = 'Showing ' + filtered.length + ' result(s) for "' + currentSearchQuery + '"';
            searchStatus.classList.remove('hidden');
        }
    } else if (searchStatus) {
        searchStatus.classList.add('hidden');
    }

    const sorted = getSortedPools(filtered);
    const poolCount = document.getElementById('pool-count');
    if (poolCount) poolCount.innerText = 'Showing ' + sorted.length + ' pool(s)';

    if (sorted.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 text-sm">No group pools found matching your criteria.</div>';
        updateMetrics();
        return;
    }

    sorted.forEach(function (pool) {
        const percentage = Math.min(100, Math.round((pool.currentShares / pool.targetShares) * 100));
        const savingsAmount = pool.retailPrice - pool.price;
        const savingsPercent = pool.retailPrice > 0 ? Math.round((savingsAmount / pool.retailPrice) * 100) : 0;
        const isReservable = !pool.locked && pool.currentShares < pool.targetShares;

        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group";
        card.innerHTML =
            '<div>' +
                '<div class="relative h-44 overflow-hidden bg-slate-100">' +
                    '<img src="' + esc(pool.imageUrl) + '" alt="' + esc(pool.title) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">' +
                    '<div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20"></div>' +
                    '<div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">' +
                        getStatusBadge(pool) +
                        '<span class="bg-amber-400 text-slate-950 text-[11px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">Save ' + savingsPercent + '%</span>' +
                    '</div>' +
                    '<div class="absolute bottom-3 left-3 right-3 text-white">' +
                        '<span class="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-bold px-2 py-0.5 rounded-md mb-1">' + esc(pool.category) + '</span>' +
                        '<div class="flex items-center gap-1 text-[11px] text-slate-200 font-medium truncate">' + PIN_ICON + '<span>Origin: ' + esc(pool.woreda) + '</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="p-5 space-y-4">' +
                    '<div>' +
                        '<div class="flex items-center justify-between text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">' +
                            '<span>' + esc(pool.town) + ' Hub</span><span>Pickup: ' + esc(pool.pickupDate) + '</span>' +
                        '</div>' +
                        '<h3 class="text-base font-extrabold text-slate-900 truncate">' + esc(pool.title) + '</h3>' +
                        '<p class="text-xs text-slate-500 font-medium">Unit: ' + esc(pool.unit) + '</p>' +
                    '</div>' +
                    '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">' +
                        '<div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Group Price</p><p class="text-lg font-black text-emerald-800">' + fmt(pool.price) + ' ETB</p></div>' +
                        '<div class="text-right"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Market Retail</p><p class="text-xs font-semibold text-slate-400 line-through">' + fmt(pool.retailPrice) + ' ETB</p><p class="text-[10px] font-bold text-emerald-600">Save ' + fmt(savingsAmount) + ' ETB / unit</p></div>' +
                    '</div>' +
                    '<div class="space-y-1.5">' +
                        '<div class="flex justify-between items-center text-xs font-bold text-slate-700">' +
                            '<span>Pool Reservation</span><span>' + pool.currentShares + ' / ' + pool.targetShares + ' shares (' + percentage + '%)</span>' +
                        '</div>' +
                        '<div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">' +
                            '<div class="h-full rounded-full transition-all duration-500 ' + (percentage >= 100 ? 'bg-amber-500' : 'bg-emerald-600') + '" style="width: ' + percentage + '%"></div>' +
                        '</div>' +
                        '<div class="flex justify-between text-[11px] text-slate-400 font-medium">' +
                            '<span>' + (pool.daysRemaining > 0 ? pool.daysRemaining + ' days left' : 'Locking today') + '</span>' +
                            '<span>Organizer: ' + esc(String(pool.organizer).split(' ')[0]) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="p-5 pt-0 flex gap-2">' +
                '<button onclick="openPoolDetails(\'' + pool.id + '\')" class="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition flex items-center justify-center gap-1" title="Community Discussion & Details">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>' +
                    '<span class="text-xs font-bold">' + pool.commentsCount + '</span>' +
                '</button>' +
                '<button onclick="openReserveModal(\'' + pool.id + '\')" ' + (isReservable ? '' : 'disabled') + ' class="flex-1 py-2.5 rounded-2xl text-xs font-black transition shadow-sm flex items-center justify-center gap-1.5 ' + (isReservable ? 'bg-emerald-800 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed') + '">' +
                    (isReservable ? 'Reserve Share' : 'Pool Fully Reserved') +
                '</button>' +
            '</div>';
        grid.appendChild(card);
    });

    updateMetrics();
}

// ---------- Reserve Modal ----------

function openReserveModal(id) {
    if (!currentUser) {
        showToast('Please sign in first to reserve a share.');
        openAuthModal();
        return;
    }
    const pool = pools.find(function (p) { return p.id === String(id); });
    if (!pool) return;
    if (pool.locked || pool.currentShares >= pool.targetShares) {
        showToast('This pool is already fully reserved.');
        return;
    }
    reserveState = { pool: pool, shares: 1, payment: 'telebirr' };
    renderReserveForm();
    const modal = document.getElementById('reserve-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeReserveModal() {
    const modal = document.getElementById('reserve-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderReserveForm() {
    const card = document.getElementById('reserve-modal-card');
    if (!card || !reserveState.pool) return;
    const pool = reserveState.pool;
    const maxShares = Math.max(1, pool.targetShares - pool.currentShares);
    const shares = Math.min(reserveState.shares, maxShares);
    reserveState.shares = shares;
    const totalPrice = pool.price * shares;
    const totalRetailPrice = pool.retailPrice * shares;
    const totalSavings = totalRetailPrice - totalPrice;
    const methods = ['telebirr', 'cbe', 'cash'];
    const methodLabels = { telebirr: 'TeleBirr', cbe: 'CBE Birr', cash: 'Pay at Hub' };
    const methodColors = { telebirr: 'text-emerald-600', cbe: 'text-blue-600', cash: 'text-amber-600' };

    const methodButtons = methods.map(function (m) {
        const active = reserveState.payment === m;
        return '<button type="button" onclick="setPayment(\'' + m + '\')" class="p-3 rounded-2xl border text-left transition flex flex-col items-center justify-center gap-1.5 ' + (active ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-600/30' : 'border-slate-200 bg-white text-slate-600') + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 ' + methodColors[m] + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>' +
            '<span class="text-xs font-bold">' + methodLabels[m] + '</span>' +
        '</button>';
    }).join('');

    card.innerHTML =
        '<button onclick="closeReserveModal()" class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Close">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</button>' +
        '<div class="space-y-5">' +
            '<div>' +
                '<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">Reserve Share in Pool</span>' +
                '<h3 class="text-xl font-black text-slate-900">' + esc(pool.title) + '</h3>' +
                '<p class="text-xs text-slate-500 mt-1">Direct from <strong>' + esc(pool.woreda) + '</strong> to <strong>' + esc(pool.hubLocation) + '</strong></p>' +
            '</div>' +
            '<div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">' +
                '<div class="flex justify-between items-center text-xs font-bold text-slate-700">' +
                    '<span>Select Shares (' + esc(pool.unit) + ')</span><span class="text-emerald-600">Max available: ' + maxShares + '</span>' +
                '</div>' +
                '<div class="flex items-center gap-3">' +
                    '<button type="button" onclick="reserveStep(-1)" class="w-10 h-10 rounded-xl bg-white border border-slate-300 font-black text-lg text-slate-800 hover:bg-slate-100 transition">-</button>' +
                    '<span class="text-lg font-black text-slate-900 min-w-[2rem] text-center">' + shares + '</span>' +
                    '<button type="button" onclick="reserveStep(1)" class="w-10 h-10 rounded-xl bg-white border border-slate-300 font-black text-lg text-slate-800 hover:bg-slate-100 transition">+</button>' +
                    '<div class="flex-1 text-right"><p class="text-[10px] text-slate-400 font-bold uppercase">Subtotal</p><p class="text-lg font-black text-emerald-800">' + fmt(totalPrice) + ' ETB</p></div>' +
                '</div>' +
                '<div class="pt-2 border-t border-slate-200 flex justify-between text-xs font-semibold">' +
                    '<span class="text-slate-500">Retail market cost:</span><span class="text-slate-400 line-through">' + fmt(totalRetailPrice) + ' ETB</span>' +
                '</div>' +
                '<div class="flex justify-between text-xs font-bold text-emerald-700">' +
                    '<span>You Save With Pool:</span><span>' + fmt(totalSavings) + ' ETB</span>' +
                '</div>' +
            '</div>' +
            '<div class="space-y-2">' +
                '<label class="block text-xs font-bold uppercase text-slate-600">Select Payment / Guarantee Method</label>' +
                '<div class="grid grid-cols-3 gap-2">' + methodButtons + '</div>' +
            '</div>' +
            '<div class="bg-slate-100 p-3 rounded-xl text-xs text-slate-600">' +
                'Order notification will be sent to: <strong>' + esc(currentUser && currentUser.email ? currentUser.email : 'Guest Buyer') + '</strong>. Pickup location: <strong>' + esc(pool.hubLocation) + '</strong> on <strong>' + esc(pool.pickupDate) + '</strong>.' +
            '</div>' +
            '<div class="flex justify-end gap-2 pt-2">' +
                '<button type="button" onclick="closeReserveModal()" class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition">Cancel</button>' +
                '<button type="button" id="reserve-confirm-btn" onclick="confirmReservation()" class="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md">Confirm Reservation (' + fmt(totalPrice) + ' ETB)</button>' +
            '</div>' +
        '</div>';
}

function reserveStep(delta) {
    if (!reserveState.pool) return;
    const maxShares = Math.max(1, reserveState.pool.targetShares - reserveState.pool.currentShares);
    reserveState.shares = Math.min(maxShares, Math.max(1, reserveState.shares + delta));
    renderReserveForm();
}

function setPayment(method) {
    reserveState.payment = method;
    renderReserveForm();
}

async function confirmReservation() {
    const pool = reserveState.pool;
    const shares = reserveState.shares;
    const payment = reserveState.payment;
    if (!pool) return;
    const confirmBtn = document.getElementById('reserve-confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Reserving...';
    }
    try {
        const data = await api('/api/pools/' + pool.id + '/reserve', {
            method: 'POST',
            body: JSON.stringify({ shares: shares, paymentMethod: payment })
        });
        const updated = normalizePool(data.pool || pool);
        const idx = pools.findIndex(function (p) { return p.id === pool.id; });
        if (idx !== -1) pools[idx] = updated;
        renderPools();
        renderReserveSuccess(data.reservation || { shares: shares, paymentMethod: payment, voucherCode: 'NT-' + Math.floor(100000 + Math.random() * 900000) }, updated);
        showToast('Successfully reserved ' + (data.reservation && data.reservation.shares ? data.reservation.shares : shares) + ' share(s)! Digital pickup voucher generated.');
    } catch (err) {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Reservation';
        }
        showToast(err.message, true);
    }
}

function renderReserveSuccess(reservation, pool) {
    const card = document.getElementById('reserve-modal-card');
    if (!card) return;
    const code = reservation.voucherCode || 'NT-' + Math.floor(100000 + Math.random() * 900000);
    const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + code;
    const method = (reservation.paymentMethod || reserveState.payment || 'telebirr').toUpperCase();
    const qty = reservation.shares || reserveState.shares;

    card.innerHTML =
        '<button onclick="closeReserveModal()" class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Close">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</button>' +
        '<div class="space-y-6 text-center py-2">' +
            '<div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">' +
                '<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
            '</div>' +
            '<div>' +
                '<h3 class="text-xl font-black text-slate-900">Share Reservation Confirmed!</h3>' +
                '<p class="text-xs text-slate-500 mt-1">Your digital pickup voucher has been generated for ' + esc(pool.title) + '.</p>' +
            '</div>' +
            '<div class="bg-slate-50 border border-slate-200 rounded-3xl p-5 max-w-xs mx-auto space-y-3">' +
                '<div class="bg-white p-3 rounded-2xl shadow-inner w-36 h-36 mx-auto flex items-center justify-center border border-slate-200">' +
                    '<img src="' + esc(qr) + '" alt="QR voucher" class="w-full h-full object-contain">' +
                '</div>' +
                '<div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pickup Ticket Code</p><p class="text-base font-black text-emerald-800 tracking-wider">' + code + '</p></div>' +
                '<div class="text-[11px] text-slate-600 space-y-1 text-left border-t border-slate-200 pt-3">' +
                    '<p>• <strong>Quantity:</strong> ' + qty + ' x ' + esc(pool.unit) + '</p>' +
                    '<p>• <strong>Hub:</strong> ' + esc(pool.hubLocation) + '</p>' +
                    '<p>• <strong>Pickup Date:</strong> ' + esc(pool.pickupDate) + '</p>' +
                    '<p>• <strong>Method:</strong> ' + method + '</p>' +
                '</div>' +
            '</div>' +
            '<div class="flex justify-center gap-3">' +
                '<button type="button" onclick="closeReserveModal()" class="px-6 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-black hover:bg-emerald-700 transition">Done</button>' +
            '</div>' +
        '</div>';
}

// ---------- Pool Details Modal (Comments) ----------

async function openPoolDetails(id) {
    const pool = pools.find(function (p) { return p.id === String(id); });
    if (!pool) return;
    detailsState = { pool: pool, comments: [] };
    const modal = document.getElementById('details-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    renderDetails();
    try {
        const data = await api('/api/pools/' + pool.id + '/comments');
        detailsState.comments = data.comments || [];
        renderDetails();
    } catch (err) {
        console.error('Failed to fetch comments:', err.message);
    }
}

function closeDetailsModal() {
    const modal = document.getElementById('details-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderDetails() {
    const card = document.getElementById('details-modal-card');
    if (!card || !detailsState.pool) return;
    const pool = detailsState.pool;
    const percentage = Math.min(100, Math.round((pool.currentShares / pool.targetShares) * 100));
    const comments = detailsState.comments || [];

    const commentList = comments.length === 0
        ? '<p class="text-xs text-slate-400 text-center py-4">No comments yet. Be the first neighbor to post a note!</p>'
        : comments.map(function (c) {
            return '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1">' +
                '<div class="flex justify-between items-center font-bold">' +
                    '<span class="text-slate-800 flex items-center gap-1">' + esc(c.user_name || c.userName || 'Neighbor Buyer') + ' (' + esc(c.user_town || 'Addis Ababa') + ')' + (c.is_coordinator || c.isCoordinator ? '<span class="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-md font-extrabold">Coordinator</span>' : '') + '</span>' +
                    '<span class="text-[10px] text-slate-400">' + esc(c.created_at || 'Just now') + '</span>' +
                '</div>' +
                '<p class="text-slate-600">' + esc(c.text) + '</p>' +
            '</div>';
        }).join('');

    card.innerHTML =
        '<button onclick="closeDetailsModal()" class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Close">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</button>' +
        '<div class="flex flex-col sm:flex-row gap-4 items-start">' +
            '<img src="' + esc(pool.imageUrl) + '" alt="' + esc(pool.title) + '" class="w-full sm:w-32 h-28 object-cover rounded-2xl border border-slate-200">' +
            '<div class="space-y-1 flex-1">' +
                '<div class="flex items-center gap-2">' +
                    '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">' + esc(pool.town) + ' Hub</span>' +
                    '<span class="text-xs text-slate-400 font-bold">Origin: ' + esc(pool.woreda) + '</span>' +
                '</div>' +
                '<h3 class="text-xl font-black text-slate-900">' + esc(pool.title) + '</h3>' +
                '<p class="text-xs text-slate-500">Unit: <strong>' + esc(pool.unit) + '</strong> • Pickup Hub: <strong>' + esc(pool.hubLocation) + '</strong></p>' +
                '<div class="pt-1 flex items-center gap-3">' +
                    '<span class="text-lg font-black text-emerald-800">' + fmt(pool.price) + ' ETB</span>' +
                    '<span class="text-xs text-slate-400 line-through">' + fmt(pool.retailPrice) + ' ETB</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">' +
            '<div class="flex justify-between items-center text-xs font-bold text-slate-700">' +
                '<span>Progress (' + pool.currentShares + ' / ' + pool.targetShares + ' shares)</span><span>' + percentage + '% Reserved</span>' +
            '</div>' +
            '<div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">' +
                '<div class="bg-emerald-600 h-full rounded-full transition-all duration-500" style="width: ' + percentage + '%"></div>' +
            '</div>' +
            '<div class="flex justify-between text-xs text-slate-500">' +
                '<span>Organizer: ' + esc(pool.organizer) + '</span>' +
                '<button onclick="closeDetailsModal(); openReserveModal(\'' + pool.id + '\')" ' + (pool.locked || pool.currentShares >= pool.targetShares ? 'disabled' : '') + ' class="bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-xl text-xs transition disabled:opacity-50">Reserve Share</button>' +
            '</div>' +
        '</div>' +
        '<div class="space-y-3 pt-2 border-t border-slate-100">' +
            '<h4 class="text-xs font-black uppercase text-slate-400 tracking-wider">Neighborhood Community Board (' + comments.length + ')</h4>' +
            '<form onsubmit="postComment(event)" class="flex gap-2">' +
                '<input type="text" id="comment-input" placeholder="Ask a question or post a note for the pool coordinator..." class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">' +
                '<button type="submit" class="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">Post</button>' +
            '</form>' +
            '<div class="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin">' + commentList + '</div>' +
        '</div>';
}

async function postComment(e) {
    e.preventDefault();
    if (!detailsState.pool) return;
    if (!currentUser) {
        showToast('Please sign in first to post a comment.');
        openAuthModal();
        return;
    }
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;
    try {
        const data = await api('/api/pools/' + detailsState.pool.id + '/comments', {
            method: 'POST',
            body: JSON.stringify({ text: text })
        });
        if (data.comment) {
            detailsState.comments = [data.comment].concat(detailsState.comments);
        }
        renderDetails();
        showToast('Comment posted to the community board.');
    } catch (err) {
        showToast(err.message, true);
    }
}

// ---------- Savings Calculator ----------

function calcInitQuantities() {
    const q = {};
    PRESET_SAVINGS_ITEMS.forEach(function (item) {
        q[item.name] = item.defaultKgPerMonth;
    });
    return q;
}

function renderCalculator() {
    const container = document.getElementById('calc-items');
    if (!container) return;
    if (Object.keys(calcQuantities).length === 0) {
        calcQuantities = calcInitQuantities();
    }

    container.innerHTML = PRESET_SAVINGS_ITEMS.map(function (item) {
        const qty = calcQuantities[item.name] || 0;
        const itemRetail = qty * item.unitPriceRetail;
        const itemWholesale = qty * item.unitPriceWholesale;
        const itemSaved = itemRetail - itemWholesale;
        const unitLabel = item.name.indexOf('Litre') !== -1 ? 'Litres' : 'kg';
        const max = item.name.indexOf('Litre') !== -1 ? 40 : 100;
        return '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">' +
            '<div class="flex justify-between items-center text-xs font-bold">' +
                '<span class="text-slate-800">' + esc(item.name) + '</span>' +
                '<span class="text-emerald-700 font-extrabold">' + qty + ' ' + unitLabel + ' / month</span>' +
            '</div>' +
            '<input type="range" min="0" max="' + max + '" step="1" value="' + qty + '" oninput="calcQuantityChange(this)" data-item="' + esc(item.name) + '" class="w-full accent-emerald-600 h-2 cursor-pointer">' +
            '<div class="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">' +
                '<span>Group Rate: ' + item.unitPriceWholesale + ' ETB/unit</span>' +
                '<span>Retail Market: ' + item.unitPriceRetail + ' ETB/unit</span>' +
                '<span class="text-emerald-600 font-bold">Save ' + fmt(itemSaved) + ' ETB</span>' +
            '</div>' +
        '</div>';
    }).join('');

    updateCalculatorSummary();
}

function calcQuantityChange(input) {
    calcQuantities[input.dataset.item] = Number(input.value);
    const valueLabel = input.parentElement.querySelector('span.text-emerald-700');
    if (valueLabel) {
        const item = PRESET_SAVINGS_ITEMS.find(function (it) { return it.name === input.dataset.item; });
        const unitLabel = item && item.name.indexOf('Litre') !== -1 ? 'Litres' : 'kg';
        valueLabel.textContent = input.value + ' ' + unitLabel + ' / month';
    }
    updateCalculatorSummary();
}

function updateCalculatorSummary() {
    let totalWholesale = 0;
    let totalRetail = 0;
    PRESET_SAVINGS_ITEMS.forEach(function (item) {
        const qty = calcQuantities[item.name] || 0;
        totalWholesale += qty * item.unitPriceWholesale;
        totalRetail += qty * item.unitPriceRetail;
    });
    const monthly = totalRetail - totalWholesale;
    const annual = monthly * 12;
    const pct = totalRetail > 0 ? Math.round((monthly / totalRetail) * 100) : 0;

    const elMonthly = document.getElementById('calc-monthly-savings');
    const elPct = document.getElementById('calc-save-percent');
    const elRetail = document.getElementById('calc-retail');
    const elWholesale = document.getElementById('calc-wholesale');
    const elAnnual = document.getElementById('calc-annual');
    if (elMonthly) elMonthly.textContent = fmt(monthly);
    if (elPct) elPct.textContent = pct;
    if (elRetail) elRetail.textContent = fmt(totalRetail);
    if (elWholesale) elWholesale.textContent = fmt(totalWholesale);
    if (elAnnual) elAnnual.textContent = fmt(annual);
}

function setFamilySize(size) {
    calcFamilySize = size;
    const multiplier = size / 4;
    const q = {};
    PRESET_SAVINGS_ITEMS.forEach(function (item) {
        q[item.name] = Math.round(item.defaultKgPerMonth * multiplier);
    });
    calcQuantities = q;
    document.querySelectorAll('.calc-family-btn').forEach(function (btn) {
        btn.classList.toggle('active', Number(btn.dataset.size) === size);
    });
    renderCalculator();
}

// ---------- Hub Map Tracker ----------

function renderHubs() {
    const selected = SUPPLY_HUBS.find(function (h) { return h.id === selectedHubId; }) || SUPPLY_HUBS[0];
    selectedHubId = selected.id;

    const list = document.getElementById('hub-list');
    if (list) {
        list.innerHTML = SUPPLY_HUBS.map(function (hub) {
            const active = hub.id === selected.id;
            return '<button onclick="selectHub(\'' + hub.id + '\')" class="w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between ' + (active ? 'bg-emerald-800 text-white border-emerald-700 shadow-md' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100') + '">' +
                '<div>' +
                    '<h4 class="text-sm font-bold flex items-center gap-1.5">' + esc(hub.name) + '</h4>' +
                    '<p class="text-xs mt-0.5 ' + (active ? 'text-emerald-100' : 'text-slate-500') + '">' + esc(hub.address) + '</p>' +
                '</div>' +
                '<span class="text-[10px] font-bold px-2 py-1 rounded-full ' + (active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800') + '">' + hub.activeDeliveriesCount + ' Active Pools</span>' +
            '</button>';
        }).join('');
    }

    const nodes = document.getElementById('hub-map-nodes');
    if (nodes) {
        nodes.innerHTML = SUPPLY_HUBS.map(function (hub) {
            const active = hub.id === selected.id;
            return '<button onclick="selectHub(\'' + hub.id + '\')" style="left: ' + hub.coordinates.x + '%; top: ' + hub.coordinates.y + '%;" class="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none">' +
                '<div class="relative flex items-center justify-center p-2 rounded-full transition-transform ' + (active ? 'scale-125' : 'hover:scale-110') + '">' +
                    '<span class="absolute inset-0 rounded-full animate-ping opacity-75 ' + (active ? 'bg-emerald-500' : 'bg-teal-500') + '"></span>' +
                    '<div class="relative w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg ' + (active ? 'bg-emerald-600 ring-4 ring-emerald-400/40' : 'bg-slate-800 border border-slate-600') + '">' + PIN_ICON + '</div>' +
                '</div>' +
                '<div class="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-lg transition ' + (active ? 'bg-emerald-600 text-white z-30' : 'bg-slate-900/90 text-slate-300 border border-slate-700') + '">' + esc(hub.town) + '</div>' +
            '</button>';
        }).join('');
    }

    const townEl = document.getElementById('hub-town');
    const woredasEl = document.getElementById('hub-woredas');
    const nameEl = document.getElementById('hub-name');
    const addressEl = document.getElementById('hub-address');
    const originsEl = document.getElementById('hub-origins');
    if (townEl) townEl.textContent = selected.town;
    if (woredasEl) woredasEl.textContent = selected.woredaOrigins.join(', ');
    if (nameEl) nameEl.textContent = selected.name + ' Details';
    if (addressEl) addressEl.textContent = selected.address;
    if (originsEl) originsEl.textContent = selected.woredaOrigins.join(' • ');
}

function selectHub(id) {
    selectedHubId = id;
    renderHubs();
}

// ---------- AI Supply Assistant ----------

function renderMarkdown(text) {
    return esc(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderAiMessages() {
    const container = document.getElementById('ai-messages');
    if (!container) return;

    container.innerHTML = aiMessages.map(function (msg) {
        const isUser = msg.sender === 'user';
        return '<div class="flex items-start gap-3 ' + (isUser ? 'flex-row-reverse' : '') + '">' +
            '<div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ' + (isUser ? 'bg-slate-900 text-white' : 'bg-emerald-800 text-white') + '">' +
                (isUser ? '<span class="text-[10px]">YOU</span>' : '<span class="text-[10px]">AI</span>') +
            '</div>' +
            '<div class="max-w-[85%] rounded-3xl p-4 text-xs sm:text-sm leading-relaxed ' + (isUser ? 'bg-emerald-800 text-white rounded-tr-none' : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none') + '">' +
                '<div class="whitespace-pre-wrap font-sans">' + renderMarkdown(msg.text) + '</div>' +
                '<p class="text-[10px] font-medium text-right mt-1 ' + (isUser ? 'text-emerald-200/80' : 'text-slate-400') + '">' + esc(msg.timestamp) + '</p>' +
            '</div>' +
        '</div>';
    }).join('');

    if (aiLoading) {
        container.insertAdjacentHTML('beforeend',
            '<div class="flex items-center gap-3">' +
                '<div class="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs"><span class="animate-pulse">AI</span></div>' +
                '<div class="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center gap-2">' +
                    '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>NuroTewedede AI is processing woreda supply data...' +
                '</div>' +
            '</div>');
    }

    container.scrollTop = container.scrollHeight;
}

function renderAiChips() {
    const chips = document.getElementById('ai-chips');
    if (!chips) return;
    chips.innerHTML = AI_QUICK_PROMPTS.map(function (qp) {
        return '<button onclick="sendQuickPrompt(this)"' + (aiLoading ? ' disabled' : '') + ' data-prompt="' + esc(qp) + '" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 text-xs font-semibold whitespace-nowrap transition border border-slate-200 disabled:opacity-50">💡 ' + esc(qp) + '</button>';
    }).join('');
}

async function sendAiMessage(textToSend) {
    const input = document.getElementById('ai-input');
    const prompt = (textToSend || (input ? input.value : '')).trim();
    if (!prompt || aiLoading) return;

    aiMessages.push({
        id: 'user-' + Date.now(),
        sender: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (input) input.value = '';
    aiLoading = true;
    renderAiMessages();
    renderAiChips();

    try {
        const data = await api('/api/ai-assistant', {
            method: 'POST',
            body: JSON.stringify({ prompt: prompt })
        });
        aiMessages.push({
            id: 'ai-' + Date.now(),
            sender: 'assistant',
            text: data.reply || 'No response received.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    } catch (err) {
        aiMessages.push({
            id: 'err-' + Date.now(),
            sender: 'assistant',
            text: '⚠️ Unable to connect to Gemini AI Assistant: ' + err.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    } finally {
        aiLoading = false;
        renderAiMessages();
        renderAiChips();
    }
}

function sendQuickPrompt(btn) {
    sendAiMessage(btn.dataset.prompt);
}

function submitAiForm(e) {
    e.preventDefault();
    sendAiMessage();
}

// ---------- My Reserved Shares ----------

async function loadMyShares() {
    const empty = document.getElementById('my-shares-empty');
    const grid = document.getElementById('my-shares-grid');
    if (!grid) return;

    if (!currentUser) {
        if (empty) {
            empty.innerHTML = '<p class="text-sm font-semibold">Sign in to view your reserved shares and pickup vouchers.</p>' +
                '<button onclick="openAuthModal()" class="bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition">Sign In</button>';
            empty.classList.remove('hidden');
        }
        if (grid) grid.innerHTML = '';
        return;
    }

    try {
        const data = await api('/api/reservations/mine');
        myReservations = data.reservations || [];
    } catch (err) {
        console.error('Failed to load reservations:', err.message);
        myReservations = [];
    }

    if (myReservations.length === 0) {
        if (empty) {
            empty.innerHTML = '<p class="text-sm font-semibold">You haven\'t reserved any pool shares yet.</p>' +
                '<button onclick="showTab(\'pools\')" class="bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition">Browse Active Group Pools</button>';
            empty.classList.remove('hidden');
        }
        grid.innerHTML = '';
        return;
    }

    if (empty) empty.classList.add('hidden');
    grid.innerHTML = myReservations.map(function (res) {
        const pool = res.pool || {};
        const code = res.voucher_code || res.voucherCode || 'NT-000000';
        const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + code;
        const method = (res.payment_method || res.paymentMethod || 'telebirr').toUpperCase();
        const created = res.created_at ? new Date(res.created_at).toLocaleDateString() : 'Today';
        return '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-4 items-center">' +
            '<div class="w-20 h-20 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center flex-shrink-0">' +
                '<img src="' + esc(qr) + '" alt="QR voucher" class="w-full h-full object-contain">' +
            '</div>' +
            '<div class="space-y-1 text-xs">' +
                '<h4 class="font-extrabold text-slate-900 truncate">' + esc(pool.title || 'Group Pool') + '</h4>' +
                '<p class="text-slate-500 font-semibold">Shares: <strong>' + (res.shares || 1) + ' unit(s)</strong> • Method: <strong>' + method + '</strong></p>' +
                '<p class="text-emerald-700 font-bold">Voucher Code: ' + esc(code) + '</p>' +
                '<p class="text-[10px] text-slate-400">Reserved on: ' + created + '</p>' +
            '</div>' +
        '</div>';
    }).join('');
}

// ---------- Create Pool ----------

function handleLaunchPool() {
    if (!currentUser) {
        showToast('Please sign in first to launch a pool.');
        openAuthModal();
        return;
    }
    const modal = document.getElementById('pool-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal() {
    const modal = document.getElementById('pool-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function handleCreatePool(e) {
    e.preventDefault();
    const newPoolData = {
        title: document.getElementById('item-name').value,
        category: document.getElementById('item-category').value,
        town: document.getElementById('item-town').value,
        woreda: document.getElementById('item-woreda').value,
        price: Number(document.getElementById('item-price').value),
        retailPrice: document.getElementById('item-retail').value ? Number(document.getElementById('item-retail').value) : undefined,
        unit: document.getElementById('item-unit').value || '50 kg Bag',
        targetShares: Number(document.getElementById('item-target').value),
        hubLocation: document.getElementById('item-hub').value || document.getElementById('item-town').value + ' Neighborhood Distribution Hub',
        organizer: document.getElementById('item-organizer').value || 'Neighborhood Group Coordinator'
    };

    try {
        const data = await api('/api/pools', { method: 'POST', body: JSON.stringify(newPoolData) });
        pools.unshift(normalizePool(data.pool));
        closeModal();
        const form = document.getElementById('create-form');
        if (form) form.reset();
        renderCategoryPills();
        renderPools();
        showToast('New group-buying pool launched successfully!');
    } catch (err) {
        showToast('Error creating pool: ' + err.message, true);
    }
}

// ---------- Auth ----------

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function toggleAuthMode(isSignup) {
    authMode = isSignup ? 'signup' : 'signin';
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const tabSignin = document.getElementById('auth-tab-signin');
    const tabSignup = document.getElementById('auth-tab-signup');
    const message = document.getElementById('auth-message');

    if (message) { message.classList.add('hidden'); message.textContent = ''; }
    if (title) title.textContent = isSignup ? 'Create Account' : 'Sign In';
    if (submitBtn) submitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
    if (tabSignin) {
        tabSignin.className = 'flex-1 pb-2 text-center text-sm font-' + (isSignup ? 'medium border-b-2 border-transparent text-slate-500 hover:text-slate-800' : 'bold border-b-2 border-emerald-600 text-emerald-800');
    }
    if (tabSignup) {
        tabSignup.className = 'flex-1 pb-2 text-center text-sm font-' + (isSignup ? 'bold border-b-2 border-emerald-600 text-emerald-800' : 'medium border-b-2 border-transparent text-slate-500 hover:text-slate-800');
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const message = document.getElementById('auth-message');
    const isSignup = authMode === 'signup';

    try {
        const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
        const data = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify({ email: email, password: password }),
        });
        if (isSignup && !data.session) {
            e.target.reset();
            if (message) {
                message.textContent = 'Account created! Check your email to confirm your account, then sign in.';
                message.className = 'text-sm font-medium p-3 rounded-lg text-center bg-emerald-50 text-emerald-700';
                message.classList.remove('hidden');
            }
            return;
        }
        if (data.session && data.session.access_token) {
            localStorage.setItem('sb-access-token', data.session.access_token);
        }
        currentUser = data.user;
        updateAuthUI();
        closeAuthModal();
        e.target.reset();
        showToast(isSignup ? 'Account created successfully!' : 'Signed in successfully!');
    } catch (err) {
        if (message) {
            message.textContent = err.message;
            message.className = 'text-sm font-medium p-3 rounded-lg text-center bg-red-50 text-red-700';
            message.classList.remove('hidden');
        }
    }
}

async function handleLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    localStorage.removeItem('sb-access-token');
    currentUser = null;
    updateAuthUI();
    fetchPools();
    showToast('Signed out successfully.');
}

function updateAuthUI() {
    const authBtn = document.getElementById('open-auth-btn');
    const userMenu = document.getElementById('user-menu');
    const userEmail = document.getElementById('user-email');

    if (currentUser) {
        if (authBtn) authBtn.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');
        if (userEmail) userEmail.textContent = currentUser.email || currentUser.user_metadata?.email || '';
    } else {
        if (authBtn) authBtn.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
    }
}

// ---------- Countdown ----------

function initCountdown() {
    const timerEl = document.getElementById('countdown-timer');
    if (!timerEl) return;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 20);
    deadline.setHours(0, 0, 0, 0);

    function updateCountdown() {
        const now = new Date();
        const diff = deadline - now;
        if (diff <= 0) {
            timerEl.textContent = '00 : 00 : 00 : 00';
            return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        timerEl.textContent = String(days).padStart(2, '0') + ' : ' + String(hours).padStart(2, '0') + ' : ' + String(minutes).padStart(2, '0') + ' : ' + String(seconds).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ---------- Boot ----------

function init() {
    initTheme();
    initCountdown();

    document.querySelectorAll('.tab-btn, .mobile-tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            showTab(btn.dataset.tab);
        });
    });

    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if (mobileToggle) mobileToggle.addEventListener('click', toggleMobileMenu);

    const townSelects = document.querySelectorAll('#town-select, #town-select-mobile');
    townSelects.forEach(function (sel) {
        sel.addEventListener('change', function () {
            setTown(sel.value);
        });
    });

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            currentSearchQuery = e.target.value;
            renderPools();
        });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', function (e) {
            currentSort = e.target.value;
            renderPools();
        });
    }

    document.querySelectorAll('.calc-family-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setFamilySize(Number(btn.dataset.size));
        });
    });

    const aiForm = document.getElementById('ai-form');
    if (aiForm) aiForm.addEventListener('submit', submitAiForm);

    const closeAuthBtn = document.getElementById('close-auth-modal');
    if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);

    const userMenuBtn = document.getElementById('user-menu-btn');
    if (userMenuBtn) userMenuBtn.addEventListener('click', toggleUserMenu);

    document.addEventListener('click', function (e) {
        const dropdown = document.getElementById('user-dropdown');
        const btn = document.getElementById('user-menu-btn');
        if (dropdown && !dropdown.classList.contains('hidden') && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    const poolModal = document.getElementById('pool-modal');
    const reserveModal = document.getElementById('reserve-modal');
    const detailsModal = document.getElementById('details-modal');
    const authModal = document.getElementById('auth-modal');

    function modalBackdropClick(modal, closer) {
        if (!modal) return;
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closer();
        });
    }
    modalBackdropClick(poolModal, closeModal);
    modalBackdropClick(reserveModal, closeReserveModal);
    modalBackdropClick(detailsModal, closeDetailsModal);
    modalBackdropClick(authModal, closeAuthModal);

    renderCalculator();
    renderHubs();
    renderAiChips();
    renderAiMessages();

    api('/api/auth/me')
        .then(function (data) {
            currentUser = data.user || null;
        })
        .catch(function () {
            currentUser = null;
        })
        .then(function () {
            updateAuthUI();
            fetchPools();
        });
}

// Expose functions globally for HTML inline event handlers
window.toggleTheme = toggleTheme;
window.showTab = showTab;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserMenu = toggleUserMenu;
window.filterTown = setTown;
window.setCategory = setCategory;
window.setTown = setTown;
window.openReserveModal = openReserveModal;
window.closeReserveModal = closeReserveModal;
window.reserveStep = reserveStep;
window.setPayment = setPayment;
window.confirmReservation = confirmReservation;
window.openPoolDetails = openPoolDetails;
window.closeDetailsModal = closeDetailsModal;
window.postComment = postComment;
window.calcQuantityChange = calcQuantityChange;
window.selectHub = selectHub;
window.sendQuickPrompt = sendQuickPrompt;
window.handleLaunchPool = handleLaunchPool;
window.handleCreatePool = handleCreatePool;
window.closeModal = closeModal;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.handleLogout = handleLogout;

init();
