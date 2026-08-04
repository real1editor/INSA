// ============ DATA ============
const products = [
    { id: 1, title: 'Traditional Wolaita Buluko Dress', price: 850.00, rating: 4.9, reviewCount: 342, image: 'https://picsum.photos/seed/wolaita-dress/200/200', category: 'Traditional Clothing', primeEligible: true, inStock: true },
    { id: 2, title: 'Handwoven Kuta Cloth (2m)', price: 450.00, rating: 4.8, reviewCount: 218, image: 'https://picsum.photos/seed/wolaita-kuta/200/200', category: 'Traditional Clothing', primeEligible: true, inStock: true },
    { id: 3, title: 'Artisan Disti Clay Pot Set', price: 320.00, rating: 4.7, reviewCount: 156, image: 'https://picsum.photos/seed/wolaita-disti/200/200', category: 'Local Crafts', primeEligible: false, inStock: true },
    { id: 4, title: 'Handcrafted Bamboo Basket', price: 180.00, rating: 4.8, reviewCount: 289, image: 'https://picsum.photos/seed/wolaita-basket/200/200', category: 'Local Crafts', primeEligible: false, inStock: true },
    { id: 5, title: 'Sodo Coffee Beans (1kg)', price: 280.00, rating: 4.9, reviewCount: 521, image: 'https://picsum.photos/seed/wolaita-coffee/200/200', category: 'Food & Spices', primeEligible: true, inStock: true },
    { id: 6, title: 'Wolaita Spice Blend (Tejber)', price: 120.00, rating: 4.6, reviewCount: 178, image: 'https://picsum.photos/seed/wolaita-spice/200/200', category: 'Food & Spices', primeEligible: false, inStock: true },
    { id: 7, title: 'Enset Kocho (Fermented Bread)', price: 95.00, rating: 4.7, reviewCount: 134, image: 'https://picsum.photos/seed/wolaita-kocho/200/200', category: 'Food & Spices', primeEligible: false, inStock: true },
    { id: 8, title: 'Pure Wolaita Wild Honey', price: 210.00, rating: 4.8, reviewCount: 305, image: 'https://picsum.photos/seed/wolaita-honey/200/200', category: 'Food & Spices', primeEligible: true, inStock: true },
    { id: 9, title: 'Traditional Clay Cooking Utensils', price: 420.00, rating: 4.5, reviewCount: 97, image: 'https://picsum.photos/seed/wolaita-utensils/200/200', category: 'Household Artifacts', primeEligible: false, inStock: true },
    { id: 10, title: 'Hand-carved Wooden Mortar & Pestle', price: 350.00, rating: 4.7, reviewCount: 143, image: 'https://picsum.photos/seed/wolaita-mortar/200/200', category: 'Household Artifacts', primeEligible: false, inStock: true },
    { id: 11, title: 'Woven Straw Market Basket (Large)', price: 260.00, rating: 4.6, reviewCount: 221, image: 'https://picsum.photos/seed/wolaita-straw/200/200', category: 'Local Crafts', primeEligible: false, inStock: true },
    { id: 12, title: 'Traditional Coffee Ceremony Set', price: 580.00, rating: 4.9, reviewCount: 187, image: 'https://picsum.photos/seed/wolaita-ceremony/200/200', category: 'Household Artifacts', primeEligible: true, inStock: true }
];

const topSellers = products.filter(p => p.rating >= 4.7);

const orders = [
    { id: 'ORD-001', date: '2026-07-28', total: 850.00, status: 'Delivered', items: 2 },
    { id: 'ORD-002', date: '2026-08-01', total: 320.50, status: 'In Transit to Sodo', items: 1 },
    { id: 'ORD-003', date: '2026-08-03', total: 120.00, status: 'Processing', items: 3 }
];

// ============ CART STATE ============
let cart = []; // array of { id, quantity }

function getTotalItems() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartItem(productId) {
    return cart.find(item => item.id === productId);
}

function addToCart(productId) {
    const existing = getCartItem(productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id: productId, quantity: 1 });
    }
    updateCartUI();
}

function updateQuantity(productId, delta) {
    const item = getCartItem(productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        cart = cart.filter(i => i.id !== productId);
    } else {
        item.quantity = newQty;
    }
    updateCartUI();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    updateCartUI();
}

function clearCart() {
    cart = [];
    updateCartUI();
}

function getCartSubtotal() {
    return cart.reduce((sum, { id, quantity }) => {
        const product = products.find(p => p.id === id);
        return sum + (product ? product.price * quantity : 0);
    }, 0);
}

// ============ UI UPDATES ============
function updateCartUI() {
    const total = getTotalItems();
    const badge = document.getElementById('cart-badge');
    if (total > 0) {
        badge.classList.remove('hidden');
        badge.textContent = total;
    } else {
        badge.classList.add('hidden');
    }
    renderCartDrawer();
}

// ============ RENDER PRODUCT CARDS ============
function createProductCardHTML(product, variant = 'grid') {
    const stars = renderStars(product.rating);
    const primeHTML = product.primeEligible ? `<div class="flex items-center gap-0.5 text-xs text-blue-400 font-medium"><i class="fas fa-check-circle w-3.5 h-3.5"></i>Prime</div>` : '';
    const outOfStockHTML = !product.inStock ? `<div class="absolute inset-0 bg-black/50 flex items-center justify-center"><span class="text-white font-bold text-sm px-3 py-1 bg-red-600 rounded-full">Out of Stock</span></div>` : '';
    const deliveryText = product.price > 200 ? 'FREE Delivery' : 'Delivery available';

    return `
        <div class="group relative bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1 overflow-hidden w-full">
            <a href="/product/${product.id}" class="block relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img src="${product.image}" alt="${product.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ${outOfStockHTML}
            </a>
            <div class="p-3 space-y-1.5">
                <a href="/product/${product.id}" class="block">
                    <h3 class="font-medium text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-base line-clamp-2">${product.title}</h3>
                </a>
                <div class="flex items-center gap-1.5">
                    <div class="flex items-center">${stars}</div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">(${product.reviewCount})</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-baseline gap-1">
                        <span class="text-lg font-bold text-gray-900 dark:text-white">$${product.price.toFixed(2)}</span>
                    </div>
                    ${primeHTML}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${deliveryText}</div>
                <button data-product-id="${product.id}" class="add-to-cart-btn w-full mt-2 py-2 px-3 bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-800 hover:to-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition hover:shadow-lg hover:shadow-red-600/30 active:scale-95" ${!product.inStock ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart w-4 h-4"></i> Add to Cart
                </button>
                <button class="wishlist-btn absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md transition-all duration-200 hover:scale-110 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                    <i class="far fa-heart w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i++) {
        if (i < full) {
            html += '<i class="fas fa-star w-3.5 h-3.5 text-red-500"></i>';
        } else if (i === full && half) {
            html += '<i class="fas fa-star-half-alt w-3.5 h-3.5 text-red-500"></i>';
        } else {
            html += '<i class="far fa-star w-3.5 h-3.5 text-gray-300 dark:text-gray-600"></i>';
        }
    }
    return html;
}

// ============ RENDER GRID ============
function renderProductGrid(filter = '') {
    const grid = document.getElementById('product-grid');
    const noResults = document.getElementById('no-results');
    const title = document.getElementById('grid-title');
    const subtitle = document.getElementById('grid-subtitle');

    let filtered;
    let isCategoryFilter = false;

    if (filter.trim() === '' || filter === 'all') {
        filtered = products;
    } else if (['Traditional Clothing', 'Local Crafts', 'Food & Spices', 'Household Artifacts'].includes(filter)) {
        filtered = products.filter(p => p.category === filter);
        isCategoryFilter = true;
    } else if (filter === 'Prime') {
        filtered = products.filter(p => p.primeEligible);
        isCategoryFilter = true;
    } else {
        filtered = products.filter(p => p.title.toLowerCase().includes(filter.toLowerCase().trim()));
    }

    if (filter.trim() !== '' && filter !== 'all') {
        if (isCategoryFilter) {
            title.textContent = `Showing: ${filter}`;
        } else {
            title.textContent = 'Search Results';
        }
        title.className = 'text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-800 via-red-600 to-amber-600 border-l-4 border-amber-500 pl-3';
        subtitle.textContent = `Found ${filtered.length} product${filtered.length !== 1 ? 's' : ''} for "${filter}"`;
        subtitle.className = 'text-sm text-gray-400 font-medium mt-1';
    } else {
        title.textContent = 'Featured Products';
        title.className = 'text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-800 via-red-600 to-amber-600 border-l-4 border-amber-500 pl-3';
        subtitle.textContent = 'Handpicked just for you';
        subtitle.className = 'text-sm text-gray-400 font-medium mt-1';
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');
    grid.innerHTML = filtered.map(p => createProductCardHTML(p)).join('');

    // Attach event listeners to "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const id = parseInt(this.dataset.productId);
            addToCart(id);
            const original = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check-circle w-4 h-4"></i> Added!';
            setTimeout(() => { this.innerHTML = original; }, 1500);
        });
    });
}

// ============ RENDER CAROUSEL ============
function renderCarousel() {
    const track = document.getElementById('carousel-track');
    track.innerHTML = topSellers.map(p => {
        // Use compact card for carousel
        const stars = renderStars(p.rating);
        return `
            <div class="flex-shrink-0 w-48 sm:w-56">
                <div class="group relative bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    <a href="/product/${p.id}" class="block relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img src="${p.image}" alt="${p.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </a>
                    <div class="p-3 space-y-1.5">
                        <a href="/product/${p.id}" class="block">
                            <h3 class="font-medium text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-sm line-clamp-2">${p.title}</h3>
                        </a>
                        <div class="flex items-center gap-1.5">
                            <div class="flex items-center">${stars}</div>
                            <span class="text-xs text-gray-500 dark:text-gray-400">(${p.reviewCount})</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-lg font-bold text-gray-900 dark:text-white">$${p.price.toFixed(2)}</span>
                            ${p.primeEligible ? `<div class="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 font-medium"><i class="fas fa-check-circle w-3.5 h-3.5"></i>Prime</div>` : ''}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${p.price > 200 ? 'FREE Delivery' : 'Delivery available'}</div>
                        <button data-product-id="${p.id}" class="add-to-cart-btn w-full mt-2 py-2 px-3 bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-800 hover:to-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition hover:shadow-lg hover:shadow-red-600/30 active:scale-95">
                            <i class="fas fa-shopping-cart w-4 h-4"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach add-to-cart for carousel items
    document.querySelectorAll('#carousel-track .add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const id = parseInt(this.dataset.productId);
            addToCart(id);
            const original = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check-circle w-4 h-4"></i> Added!';
            setTimeout(() => { this.innerHTML = original; }, 1500);
        });
    });
}

// ============ CART DRAWER ============
function renderCartDrawer() {
    const container = document.getElementById('cart-items');
    const countSpan = document.getElementById('cart-item-count');
    const subtotalSpan = document.getElementById('cart-subtotal');
    const checkoutBtn = document.getElementById('checkout-btn');

    const totalItems = getTotalItems();
    countSpan.textContent = `(${totalItems} ${totalItems === 1 ? 'item' : 'items'})`;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center">
                <div class="text-6xl mb-4">🛒</div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Your cart is empty</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Add items to get started</p>
                <button id="continue-shopping" class="mt-6 px-6 py-2 bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-800 hover:to-amber-700 text-white font-semibold rounded-lg transition">Continue Shopping</button>
            </div>
        `;
        document.getElementById('continue-shopping')?.addEventListener('click', () => closeCart());
        checkoutBtn.disabled = true;
        subtotalSpan.textContent = '$0.00';
        return;
    }

    checkoutBtn.disabled = false;
    let html = '';
    let subtotal = 0;
    cart.forEach(({ id, quantity }) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        subtotal += product.price * quantity;
        html += `
            <div class="flex gap-3 items-start border-b border-gray-200 dark:border-gray-700 pb-4" data-cart-item="${id}">
                <a href="/product/${id}" class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <img src="${product.image}" alt="${product.title}" class="w-full h-full object-cover" />
                </a>
                <div class="flex-1 min-w-0">
                    <a href="/product/${id}" class="text-sm font-medium text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-2">${product.title}</a>
                    <div class="flex items-center gap-1 mt-0.5">
                        <span class="text-sm font-bold text-gray-900 dark:text-white">$${product.price.toFixed(2)}</span>
                        ${product.primeEligible ? `<span class="text-xs text-blue-600 dark:text-blue-400 font-medium ml-1">Prime</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2 mt-2">
                        <div class="flex items-center border border-gray-300 dark:border-gray-700 rounded-md">
                            <button class="qty-minus px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-l-md" data-id="${id}"><i class="fas fa-minus w-3.5 h-3.5 text-gray-700 dark:text-gray-300"></i></button>
                            <span class="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">${quantity}</span>
                            <button class="qty-plus px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-r-md" data-id="${id}"><i class="fas fa-plus w-3.5 h-3.5 text-gray-700 dark:text-gray-300"></i></button>
                        </div>
                        <button class="cart-remove p-1.5 text-gray-400 hover:text-red-500 transition" data-id="${id}"><i class="fas fa-trash w-4 h-4"></i></button>
                    </div>
                </div>
            </div>
        `;
    });

    // Add clear cart button if more than 1 item
    if (cart.length > 1) {
        html += `<button id="clear-cart-btn" class="text-sm text-red-600 hover:text-red-500 transition">Clear Cart</button>`;
    }

    container.innerHTML = html;
    subtotalSpan.textContent = `$${subtotal.toFixed(2)}`;

    // Event listeners for cart controls
    container.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            updateQuantity(id, 1);
        });
    });
    container.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            updateQuantity(id, -1);
        });
    });
    container.querySelectorAll('.cart-remove').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            removeFromCart(id);
        });
    });
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearCart);
}

// ============ CART DRAWER TOGGLE ============
function openCart() {
    document.getElementById('cart-overlay').classList.remove('hidden');
    document.getElementById('cart-drawer').classList.remove('translate-x-full');
    renderCartDrawer();
}

function closeCart() {
    document.getElementById('cart-overlay').classList.add('hidden');
    document.getElementById('cart-drawer').classList.add('translate-x-full');
}

// ============ HERO CAROUSEL ============
const heroSlides = [
    { title: "Discover Wolaita's Rich Cultural Heritage", subtitle: 'Authentic handmade textiles, spices & local goods', emoji: '🏺', bg: 'from-red-800 via-yellow-700 to-red-900' },
    { title: 'Handcrafted Textiles & Spices from Wolaita', subtitle: 'Traditional Buluko, Kuta, and authentic Wolaita flavors', emoji: '🧵', bg: 'from-red-900 via-yellow-600 to-red-800' },
    { title: 'Delivered from Wolaita Sodo to Your Doorstep', subtitle: 'Fresh coffee, honey, kocho & artisanal crafts shipped nationwide', emoji: '📦', bg: 'from-red-700 via-yellow-800 to-red-900' }
];
let heroIndex = 0;
let heroInterval;

function updateHero(index) {
    const slide = heroSlides[index];
    const container = document.getElementById('hero-slide');
    container.className = `relative h-48 sm:h-64 md:h-80 lg:h-[420px] bg-gradient-to-r ${slide.bg} flex items-center justify-center transition-all duration-700`;
    document.getElementById('hero-title').textContent = slide.title;
    document.getElementById('hero-subtitle').textContent = slide.subtitle;
    document.getElementById('hero-emoji').textContent = slide.emoji;
    document.querySelectorAll('#hero-dots button').forEach((dot, i) => {
        dot.className = `transition-all duration-300 rounded-full ${i === index ? 'w-6 sm:w-8 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`;
    });
}

function initHero() {
    const dotsContainer = document.getElementById('hero-dots');
    heroSlides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = `transition-all duration-300 rounded-full ${i === 0 ? 'w-6 sm:w-8 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`;
        dot.dataset.index = i;
        dot.addEventListener('click', () => {
            clearInterval(heroInterval);
            heroIndex = i;
            updateHero(heroIndex);
            heroInterval = setInterval(autoHero, 5000);
        });
        dotsContainer.appendChild(dot);
    });

    document.getElementById('hero-prev').addEventListener('click', () => {
        clearInterval(heroInterval);
        heroIndex = (heroIndex - 1 + heroSlides.length) % heroSlides.length;
        updateHero(heroIndex);
        heroInterval = setInterval(autoHero, 5000);
    });
    document.getElementById('hero-next').addEventListener('click', () => {
        clearInterval(heroInterval);
        heroIndex = (heroIndex + 1) % heroSlides.length;
        updateHero(heroIndex);
        heroInterval = setInterval(autoHero, 5000);
    });

    function autoHero() {
        heroIndex = (heroIndex + 1) % heroSlides.length;
        updateHero(heroIndex);
    }
    heroInterval = setInterval(autoHero, 5000);
}

// ============ CAROUSEL SCROLL ============
function initCarouselScroll() {
    const track = document.getElementById('carousel-track');
    document.getElementById('carousel-prev').addEventListener('click', () => {
        track.scrollBy({ left: -track.clientWidth * 0.8, behavior: 'smooth' });
    });
    document.getElementById('carousel-next').addEventListener('click', () => {
        track.scrollBy({ left: track.clientWidth * 0.8, behavior: 'smooth' });
    });
}

// ============ SEARCH ============
function initSearch() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', function() {
        renderProductGrid(this.value);
    });
    document.getElementById('search-btn').addEventListener('click', function() {
        renderProductGrid(document.getElementById('search-input').value);
    });
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const colors = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-gray-800';
    toast.className = `toast pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium ${colors} border border-gray-700`;
    toast.innerHTML = `<i class="fas fa-info-circle w-4 h-4"></i> ${message}`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ ORDERS MODAL ============
function renderOrdersList() {
    const list = document.getElementById('orders-list');
    if (!list) return;
    list.innerHTML = orders.map(order => {
        const statusColor = order.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            order.status === 'In Transit to Sodo' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        return `
            <div class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-semibold text-gray-900 dark:text-white">${order.id}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}">${order.status}</span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${order.date} · ${order.items} item${order.items > 1 ? 's' : ''}</p>
                </div>
                <span class="text-sm font-bold text-gray-900 dark:text-white">$${order.total.toFixed(2)}</span>
            </div>
        `;
    }).join('');
}

function openOrdersModal() {
    const modal = document.getElementById('orders-modal');
    const panel = modal.querySelector('.slide-panel');
    const overlay = modal.querySelector('.orders-overlay');
    modal.classList.remove('hidden');
    renderOrdersList();
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        panel.classList.add('active');
    });
}

function closeOrdersModal() {
    const modal = document.getElementById('orders-modal');
    const panel = modal.querySelector('.slide-panel');
    const overlay = modal.querySelector('.orders-overlay');
    overlay.classList.remove('active');
    panel.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// ============ LOCATION MODAL ============
function openLocationModal() {
    const modal = document.getElementById('location-modal');
    const panel = modal.querySelector('.slide-panel');
    const overlay = modal.querySelector('.location-overlay');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        panel.classList.add('active');
    });
}

function closeLocationModal() {
    const modal = document.getElementById('location-modal');
    const panel = modal.querySelector('.slide-panel');
    const overlay = modal.querySelector('.location-overlay');
    overlay.classList.remove('active');
    panel.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// ============ CATEGORIES DRAWER ============
function openCategoriesDrawer() {
    const drawer = document.getElementById('categories-drawer');
    const overlay = document.getElementById('categories-overlay');
    drawer.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
}

function closeCategoriesDrawer() {
    const drawer = document.getElementById('categories-drawer');
    const overlay = document.getElementById('categories-overlay');
    drawer.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
}

// ============ FOOTER MODALS ============
function openFooterModal(id) {
    const modal = document.getElementById(id);
    const panel = modal.querySelector('.footer-panel');
    const overlay = modal.querySelector('.footer-overlay');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        panel.classList.add('active');
    });
}

function closeFooterModal(id) {
    const modal = document.getElementById(id);
    const panel = modal.querySelector('.footer-panel');
    const overlay = modal.querySelector('.footer-overlay');
    overlay.classList.remove('active');
    panel.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function initFooterLinks() {
    document.querySelectorAll('[data-footer-modal]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = link.dataset.footerModal;
            openFooterModal(modalId);
        });
    });

    document.querySelectorAll('[data-footer-toast]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const name = link.dataset.footerToast;
            showToast(`The ${name} section is coming soon to Merkato!`);
        });
    });

    document.querySelectorAll('.footer-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('[id$="-modal"]');
            if (modal) closeFooterModal(modal.id);
        });
    });

    document.querySelectorAll('.footer-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const modal = overlay.closest('[id$="-modal"]');
            if (modal) closeFooterModal(modal.id);
        });
    });
}

// ============ THEME TOGGLE ============
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  
  function setMode(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    updateToggleIcons(isDark);
  }

  function updateToggleIcons(isDark) {
    if (!toggleBtn) return;
    const sunIcon = toggleBtn.querySelector('.fa-sun');
    const moonIcon = toggleBtn.querySelector('.fa-moon');
    if (sunIcon && moonIcon) {
      sunIcon.classList.toggle('hidden', !isDark);
      moonIcon.classList.toggle('hidden', isDark);
    }
  }

  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  setMode(shouldBeDark);

  if (toggleBtn) {
    toggleBtn.onclick = (e) => {
      e.preventDefault();
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      setMode(!isCurrentlyDark);
    };
  }
}

document.addEventListener('DOMContentLoaded', initTheme);

// ============ USER MENU DROPDOWN ============
function initUserMenu() {
    const btn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    const chevron = document.getElementById('user-chevron');
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        chevron.classList.toggle('rotate-180');
    });
    document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
        chevron.classList.remove('rotate-180');
    });
}

// ============ MOBILE MENU ============
function initMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-40 bg-black/50 lg:hidden hidden';
    overlay.id = 'mobile-overlay';
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.className = 'fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out -translate-x-full shadow-2xl lg:hidden border-r border-gray-200 dark:border-gray-800';
    drawer.id = 'mobile-drawer';
    drawer.innerHTML = `
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <span class="text-xl font-bold text-red-600">Merkato Wolaita</span>
            <button id="mobile-close" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"><i class="fas fa-times w-5 h-5 text-gray-500 dark:text-gray-400"></i></button>
        </div>
        <nav class="p-4 space-y-4">
            <a href="#" id="mobile-home" class="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-600 dark:hover:text-amber-400 rounded-md text-gray-700 dark:text-gray-300 transition">Home</a>
            <a href="#" id="mobile-deals" class="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-600 dark:hover:text-amber-400 rounded-md text-gray-700 dark:text-gray-300 transition">Today's Deals</a>
            <a href="#" id="mobile-registry" class="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-600 dark:hover:text-amber-400 rounded-md text-gray-700 dark:text-gray-300 transition">Registry</a>
            <a href="#" id="mobile-gift-cards" class="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-600 dark:hover:text-amber-400 rounded-md text-gray-700 dark:text-gray-300 transition">Gift Cards</a>
            <a href="#" id="mobile-sell" class="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-600 dark:hover:text-amber-400 rounded-md text-gray-700 dark:text-gray-300 transition">Sell</a>
            <a href="#" id="mobile-orders" class="block py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-600 dark:hover:text-amber-400 rounded-md text-gray-700 dark:text-gray-300 transition">Orders</a>
        </nav>
    `;
    document.body.appendChild(drawer);

function openMobileMenu() {
    overlay.classList.remove('hidden');
    drawer.classList.remove('-translate-x-full');
}

function closeMobileMenu() {
    overlay.classList.add('hidden');
    drawer.classList.add('-translate-x-full');
}

    toggle.addEventListener('click', openMobileMenu);
    document.getElementById('mobile-close').addEventListener('click', closeMobileMenu);
    overlay.addEventListener('click', closeMobileMenu);
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', function() {
    initUserMenu();
    initMobileMenu();
    initHero();
    renderProductGrid();
    renderCarousel();
    initCarouselScroll();
    initSearch();
    initFooterLinks();

    // Cart icon toggle
    document.getElementById('cart-icon').addEventListener('click', openCart);
    document.getElementById('cart-close').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    document.getElementById('checkout-btn').addEventListener('click', function() {
        if (cart.length === 0) return;
        alert('Proceeding to checkout...');
        closeCart();
    });

    // Navigation event listeners
    document.getElementById('nav-orders-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openOrdersModal();
    });

    document.getElementById('nav-location-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openLocationModal();
    });

    document.getElementById('nav-all-categories-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openCategoriesDrawer();
    });

    document.getElementById('category-dropdown-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openCategoriesDrawer();
    });

    document.getElementById('nav-deals-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Today\'s Deals feature coming soon!');
    });

    document.getElementById('nav-service-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Customer Service portal coming soon!');
    });

    document.getElementById('nav-registry-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Registry feature coming soon!');
    });

    document.getElementById('nav-gift-cards-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Merkato Gift Cards feature coming soon!');
    });

    document.getElementById('nav-sell-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Sell on Merkato feature coming soon!');
    });

    document.getElementById('nav-prime-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Prime membership benefits coming soon!');
    });

    // Hero & Product Grid CTAs
    document.getElementById('hero-cta-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('view-all-products-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderProductGrid('all');
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Category filter links
    const categoryBtn = document.getElementById('category-dropdown-btn');
    document.querySelectorAll('.category-filter-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            closeCategoriesDrawer();
            if (categoryBtn) {
                const label = category === 'all' ? 'All Categories' : category;
                categoryBtn.querySelector('span').textContent = label;
            }
            renderProductGrid(category);
            document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Modal close listeners
    document.getElementById('orders-close')?.addEventListener('click', closeOrdersModal);
    document.getElementById('orders-modal')?.querySelector('.orders-overlay')?.addEventListener('click', closeOrdersModal);

    document.getElementById('location-close')?.addEventListener('click', closeLocationModal);
    document.getElementById('location-modal')?.querySelector('.location-overlay')?.addEventListener('click', closeLocationModal);

    document.getElementById('categories-close')?.addEventListener('click', closeCategoriesDrawer);
    document.getElementById('categories-overlay')?.addEventListener('click', closeCategoriesDrawer);

    // Location selection
    document.querySelectorAll('.location-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const loc = btn.dataset.location;
            if (loc === 'custom') {
                showToast('Custom address form coming soon!');
            } else {
                showToast(`Delivery set to ${loc}`);
                closeLocationModal();
            }
        });
    });

    // Mobile menu link handlers
    ['mobile-home', 'mobile-deals', 'mobile-registry', 'mobile-gift-cards', 'mobile-sell', 'mobile-orders'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                if (id === 'mobile-orders') {
                    openOrdersModal();
                } else if (id === 'mobile-deals') {
                    showToast('Today\'s Deals feature coming soon!');
                } else if (id === 'mobile-registry') {
                    showToast('Registry feature coming soon!');
                } else if (id === 'mobile-gift-cards') {
                    showToast('Merkato Gift Cards feature coming soon!');
                } else if (id === 'mobile-sell') {
                    showToast('Sell on Merkato feature coming soon!');
                } else {
                    showToast('Coming soon!');
                }
                closeCart();
                closeMobileMenu();
            });
        }
    });

    // Initial cart UI
    updateCartUI();

    // Expose crucial variables and functions to window for the ES module agent
    window.products = products;
    window.cart = cart;
    window.addToCart = addToCart;
    window.updateCartUI = updateCartUI;
    window.openCart = openCart;
    window.showToast = showToast;
});
