// Initial mock database state representing active neighborhood group pools
let pools = [
    { id: 1, title: "Highland White Teff (50kg Bag)", town: "Addis Ababa", price: 6800, retailPrice: 8500, currentShares: 14, targetShares: 20, woreda: "Gojjam Woreda" },
    { id: 2, title: "Red Onion Bulk Package (25kg)", town: "Adama", price: 1850, retailPrice: 2400, currentShares: 8, targetShares: 15, woreda: "Ziway Farm Hub" },
    { id: 3, title: "Cooking Oil Bulk Cartons (20L)", town: "Hawassa", price: 3400, retailPrice: 4200, currentShares: 18, targetShares: 25, woreda: "Hawassa Industrial Hub" },
    { id: 4, title: "Sidamo Organic Coffee Beans (10kg)", town: "Wolaita Sodo", price: 4200, retailPrice: 5100, currentShares: 5, targetShares: 10, woreda: "Boloso Sore Woreda" },
    { id: 5, title: "Maize / Corn Bulk Supply (100kg)", town: "Wolaita Sodo", price: 3100, retailPrice: 3800, currentShares: 12, targetShares: 20, woreda: "Damot Gale Hub" },
    { id: 6, title: "Barley Wholesale Package (40kg)", town: "Jimma", price: 3800, retailPrice: 4700, currentShares: 9, targetShares: 15, woreda: "Agaro Farm Hub" },
    { id: 7, title: "Chickpea (Shimbra) Wholesale (30kg)", town: "Jimma", price: 2900, retailPrice: 3600, currentShares: 12, targetShares: 20, woreda: "Mana Woreda" }
];

let currentFilter = 'All';
let currentSearchQuery = '';
let currentSort = 'default';

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';

    if (isDark) {
        html.setAttribute('data-theme', 'light');
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }

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
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    updateThemeIcons();
}

function updateMetrics() {
    const totalPools = pools.length;
    const uniqueWoredas = new Set(pools.map(p => p.woreda)).size;
    const avgSavings = pools.length > 0
        ? Math.round(pools.reduce((sum, p) => sum + ((p.retailPrice - p.price) / p.retailPrice) * 100, 0) / pools.length)
        : 0;

    document.getElementById('metric-pools').textContent = totalPools;
    document.getElementById('metric-woredas').textContent = uniqueWoredas;
    document.getElementById('metric-savings').textContent = `${avgSavings}%`;
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
            sorted.sort((a, b) => (b.currentShares / b.targetShares) - (a.currentShares / a.targetShares));
            break;
        default:
            break;
    }
    return sorted;
}

function renderPools() {
    const grid = document.getElementById('pools-grid');
    grid.innerHTML = '';

    let filtered = currentFilter === 'All'
        ? pools
        : pools.filter(p => p.town === currentFilter);

    if (currentSearchQuery.trim()) {
        const q = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.woreda.toLowerCase().includes(q));
        document.getElementById('search-status').textContent = `Showing ${filtered.length} result(s) for "${currentSearchQuery}"`;
        document.getElementById('search-status').classList.remove('hidden');
    } else {
        document.getElementById('search-status').classList.add('hidden');
    }

    const sorted = getSortedPools(filtered);

    document.getElementById('pool-count').innerText = `Showing ${sorted.length} pool(s)`;

    if (sorted.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 text-sm">No group pools found matching your criteria.</div>`;
        updateMetrics();
        return;
    }

    sorted.forEach(pool => {
        const percentage = Math.min(100, Math.round((pool.currentShares / pool.targetShares) * 100));
        const isLocked = pool.currentShares >= pool.targetShares;

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
                <p class="text-emerald-700 font-extrabold text-lg mb-4">${pool.price.toLocaleString()} ETB <span class="text-xs text-slate-400 font-normal">/ share</span></p>
                
                <!-- Progress Bar -->
                <div class="mb-4">
                    <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Progress</span>
                        <span>${pool.currentShares} / ${pool.targetShares} shares (${percentage}%)</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div class="bg-emerald-600 h-full rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>

            <button onclick="reserveShare(${pool.id})" ${isLocked ? 'disabled' : ''} class="w-full ${isLocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-emerald-700 text-white'} text-xs font-bold py-2.5 rounded-xl transition shadow-sm">
                ${isLocked ? 'Pool Locked' : 'Reserve My Share'}
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
    if(activeBtn) {
        activeBtn.className = "filter-btn bg-white text-emerald-900 px-3 py-1.5 rounded-lg text-xs font-bold transition";
    }
    renderPools();
}

function reserveShare(id) {
    const pool = pools.find(p => p.id === id);
    if (pool) {
        if (pool.currentShares < pool.targetShares) {
            pool.currentShares++;
            renderPools();
            alert(`Successfully reserved a share for "${pool.title}"! Community pool is now at ${pool.currentShares}/${pool.targetShares} shares.`);
        } else {
            alert("This pool is already fully funded!");
        }
    }
}

function openModal() {
    document.getElementById('pool-modal').classList.remove('hidden');
    document.getElementById('pool-modal').classList.add('flex');
}

function closeModal() {
    document.getElementById('pool-modal').classList.add('hidden');
    document.getElementById('pool-modal').classList.remove('flex');
}

function handleCreatePool(e) {
    e.preventDefault();
    const newPool = {
        id: pools.length + 1,
        title: document.getElementById('item-name').value,
        town: document.getElementById('item-town').value,
        price: Number(document.getElementById('item-price').value),
        retailPrice: Number(document.getElementById('item-price').value) * 1.3,
        currentShares: 1, 
        targetShares: Number(document.getElementById('item-target').value),
        woreda: document.getElementById('item-woreda').value
    };

    pools.unshift(newPool);
    closeModal();
    document.getElementById('create-form').reset();
    renderPools();
    alert("New group-buying pool launched successfully!");
}

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

// Initialize display on load
initTheme();
initSearchAndSort();
renderPools();
