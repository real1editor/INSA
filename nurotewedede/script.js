// Initial mock database state representing active neighborhood group pools
let pools = [
    { id: 1, title: "Highland White Teff (50kg Bag)", town: "Addis Ababa", price: 6800, currentShares: 14, targetShares: 20, woreda: "Gojjam Woreda" },
    { id: 2, title: "Red Onion Bulk Package (25kg)", town: "Adama", price: 1850, currentShares: 8, targetShares: 15, woreda: "Ziway Farm Hub" },
    { id: 3, title: "Cooking Oil Bulk Cartons (20L)", town: "Hawassa", price: 3400, currentShares: 18, targetShares: 25, woreda: "Hawassa Industrial Hub" },
    { id: 4, title: "Sidamo Organic Coffee Beans (10kg)", town: "Addis Ababa", price: 4200, currentShares: 5, targetShares: 10, woreda: "Yirgacheffe Woreda" },
    { id: 5, title: "Chickpea (Shimbra) Wholesale (30kg)", town: "Bahir Dar", price: 2900, currentShares: 12, targetShares: 20, woreda: "Gondar Zuria" }
];

let currentFilter = 'All';

function renderPools() {
    const grid = document.getElementById('pools-grid');
    grid.innerHTML = '';

    const filtered = currentFilter === 'All' 
        ? pools 
        : pools.filter(p => p.town === currentFilter);

    document.getElementById('pool-count').innerText = `Showing ${filtered.length} pool(s)`;

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 text-sm">No group pools found for this neighborhood hub.</div>`;
        return;
    }

    filtered.forEach(pool => {
        const percentage = Math.min(100, Math.round((pool.currentShares / pool.targetShares) * 100));
        
        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between";
        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-3">
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">${pool.town}</span>
                    <span class="text-xs text-slate-500 font-medium">From: ${pool.woreda}</span>
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

            <button onclick="reserveShare(${pool.id})" class="w-full bg-slate-900 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm">
                Reserve My Share
            </button>
        `;
        grid.appendChild(card);
    });
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

// Initialize display on load
renderPools();