// NuroTewedede - Frontend logic (talks to the Express + Supabase API)

let pools = [];
let currentFilter = 'All';
let currentSearchQuery = '';
let currentSort = 'default';
let currentUser = null;
let authMode = 'signin';

async function api(path, options = {}) {
    const res = await fetch(`http://localhost:5000${path}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Crucial for sending cookies/session tokens across ports
        ...options,
    });
    let body = {};
    try { body = await res.json(); } catch (e) { /* non-JSON response */ }
    if (!res.ok) {
        const err = new Error(body.error || 'Request failed');
        err.status = res.status;
        throw err;
    }
    return body;
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

// ---------- Pools ----------

async function fetchPools() {
    try {
        const data = await api('/api/pools');
        pools = data.pools || [];
    } catch (err) {
        console.error('Error fetching pools:', err.message);
        pools = [];
    }
    renderPools();
}

function updateMetrics() {
    const totalPools = pools.length;
    const uniqueWoredas = new Set(pools.map(p => p.woreda)).size;
    const avgSavings = pools.length > 0
        ? Math.round(pools.reduce((sum, p) => {
            const retail = p.retail_price || p.retailPrice || (p.price * 1.35);
            return sum + ((retail - p.price) / retail) * 100;
        }, 0) / pools.length)
        : 0;

    const metricPools = document.getElementById('metric-pools');
    const metricWoredas = document.getElementById('metric-woredas');
    const metricSavings = document.getElementById('metric-savings');

    if (metricPools) metricPools.textContent = totalPools;
    if (metricWoredas) metricWoredas.textContent = uniqueWoredas;
    if (metricSavings) metricSavings.textContent = `${avgSavings}%`;
}

function getSortedPools(list) {
    const sorted = [...list];
    switch (currentSort) {
        case 'price-asc':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'progress':
            sorted.sort((a, b) => (b.current_shares / b.target_shares) - (a.current_shares / a.target_shares));
            break;
        default:
            break;
    }
    return sorted;
}

function renderPools() {
    const grid = document.getElementById('pools-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = currentFilter === 'All'
        ? pools
        : pools.filter(p => p.town === currentFilter);

    const searchStatus = document.getElementById('search-status');
    if (currentSearchQuery.trim()) {
        const q = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.woreda.toLowerCase().includes(q));
        if (searchStatus) {
            searchStatus.textContent = `Showing ${filtered.length} result(s) for "${currentSearchQuery}"`;
            searchStatus.classList.remove('hidden');
        }
    } else if (searchStatus) {
        searchStatus.classList.add('hidden');
    }

    const sorted = getSortedPools(filtered);
    const poolCount = document.getElementById('pool-count');
    if (poolCount) poolCount.innerText = `Showing ${sorted.length} pool(s)`;

    if (sorted.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 text-sm">No group pools found matching your criteria.</div>`;
        updateMetrics();
        return;
    }

    sorted.forEach(pool => {
        const currentShares = pool.current_shares ?? pool.currentShares ?? 0;
        const targetShares = pool.target_shares ?? pool.targetShares ?? 1;
        const percentage = Math.min(100, Math.round((currentShares / targetShares) * 100));
        const isLocked = pool.locked;

        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between";
        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-3">
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">${pool.town}</span>
                    <div class="flex items-center gap-2">
                        ${isLocked ? '<span class="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">Locked</span>' : ''}
                        <span class="text-xs text-slate-500 font-medium">From: ${pool.woreda}</span>
                    </div>
                </div>
                <h4 class="text-base font-bold text-slate-800 mb-1">${pool.title}</h4>
                <p class="text-emerald-700 font-extrabold text-lg mb-4">${Number(pool.price).toLocaleString()} ETB <span class="text-xs text-slate-400 font-normal">/ share</span></p>

                <div class="mb-4">
                    <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Progress</span>
                        <span>${currentShares} / ${targetShares} shares (${percentage}%)</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div class="bg-emerald-600 h-full rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>

            <button onclick="reserveShare(${pool.id})" ${isLocked || pool.claimed ? 'disabled' : ''} class="w-full ${isLocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : (pool.claimed ? 'bg-teal-100 text-teal-800 cursor-default' : 'bg-slate-900 hover:bg-emerald-700 text-white')} text-xs font-bold py-2.5 rounded-xl transition shadow-sm">
                ${isLocked ? 'Pool Locked' : (pool.claimed ? 'Reserved by You' : 'Reserve My Share')}
            </button>
        `;
        grid.appendChild(card);
    });

    updateMetrics();
}

function filterTown(town) {
    currentFilter = town;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = "filter-btn bg-emerald-900/40 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/20 transition";
    });
    const activeBtn = document.getElementById(`btn-${town}`);
    if (activeBtn) {
        activeBtn.className = "filter-btn bg-white text-emerald-900 px-3 py-1.5 rounded-lg text-xs font-bold transition";
    }
    renderPools();
}

async function reserveShare(id) {
    if (!currentUser) {
        alert('Please sign in first to reserve a share.');
        openAuthModal();
        return;
    }
    try {
        const data = await api(`/api/pools/${id}/reserve`, { method: 'POST' });
        const idx = pools.findIndex(p => p.id === data.pool.id);
        if (idx !== -1) pools[idx] = data.pool;
        renderPools();
        const updatedShares = data.pool.current_shares ?? data.pool.currentShares;
        const targetShares = data.pool.target_shares ?? data.pool.targetShares;
        alert(`Successfully reserved a share for "${data.pool.title}"! Community pool is now at ${updatedShares}/${targetShares} shares.`);
    } catch (err) {
        alert(err.message);
        fetchPools();
    }
}

// ---------- Create Pool ----------

function handleLaunchPool() {
    if (!currentUser) {
        alert('Please sign in first to launch a pool.');
        openAuthModal();
        return;
    }
    openModal();
}

function openModal() {
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
        town: document.getElementById('item-town').value,
        price: Number(document.getElementById('item-price').value),
        targetShares: Number(document.getElementById('item-target').value),
        woreda: document.getElementById('item-woreda').value
    };

    try {
        const data = await api('/api/pools', { method: 'POST', body: JSON.stringify(newPoolData) });
        pools.unshift(data.pool);
        closeModal();
        const form = document.getElementById('create-form');
        if (form) form.reset();
        renderPools();
        alert("New group-buying pool launched successfully!");
    } catch (err) {
        alert('Error creating pool: ' + err.message);
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
        tabSignin.className = `flex-1 pb-2 text-center text-sm font-${isSignup ? 'medium border-b-2 border-transparent text-slate-500 hover:text-slate-800' : 'bold border-b-2 border-emerald-600 text-emerald-800'}`;
    }
    if (tabSignup) {
        tabSignup.className = `flex-1 pb-2 text-center text-sm font-${isSignup ? 'bold border-b-2 border-emerald-600 text-emerald-800' : 'medium border-b-2 border-transparent text-slate-500 hover:text-slate-800'}`;
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const message = document.getElementById('auth-message');

    try {
        const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const data = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        currentUser = data.user;
        updateAuthUI();
        closeAuthModal();
        e.target.reset();
        alert(authMode === 'signup' ? 'Account created successfully!' : 'Signed in successfully!');
    } catch (err) {
        if (message) {
            message.textContent = err.message;
            message.className = 'text-sm font-medium p-3 rounded-lg text-center bg-red-50 text-red-700';
        }
    }
}

async function handleLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    currentUser = null;
    updateAuthUI();
    fetchPools();
}

function updateAuthUI() {
    const authBtn = document.getElementById('open-auth-btn');
    const userMenu = document.getElementById('user-menu');
    const userEmail = document.getElementById('user-email');

    if (currentUser) {
        if (authBtn) authBtn.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');
        if (userEmail) userEmail.textContent = currentUser.email;
    } else {
        if (authBtn) authBtn.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
    }
}

// ---------- Search / Sort ----------

function initSearchAndSort() {
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value;
            renderPools();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderPools();
        });
    }
}

// ---------- Navigation ----------

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('hidden');
}

function handleNavClick(navItem) {
    const value = navItem.getAttribute('data-nav');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }

    switch (value) {
        case 'home':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'service':
        case 'about':
        case 'how-it-works': {
            const target = document.getElementById(value);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            break;
        }
        default:
            break;
    }
}

function initNavigation() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileMenu);
    }

    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavClick(link);
        });
    });
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
        timerEl.textContent = `${String(days).padStart(2, '0')} : ${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ---------- Boot ----------

async function init() {
    initTheme();
    initSearchAndSort();
    initNavigation();
    initCountdown();

    document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    try {
        const data = await api('/api/auth/me');
        currentUser = data.user;
    } catch (e) {
        currentUser = null;
    }
    updateAuthUI();
    fetchPools();
}

// Expose functions globally for HTML inline event handlers
window.toggleTheme = toggleTheme;
window.openModal = openModal;
window.closeModal = closeModal;
window.filterTown = filterTown;
window.reserveShare = reserveShare;
window.handleCreatePool = handleCreatePool;
window.handleLaunchPool = handleLaunchPool;
window.toggleAuthMode = toggleAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.openAuthModal = openAuthModal;

init();