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
    const primeHTML = product.primeEligible ? `<div class="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 font-medium"><i class="fas fa-check-circle w-3.5 h-3.5"></i>Prime</div>` : '';
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
                    <h3 class="font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors text-base line-clamp-2">${product.title}</h3>
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
                <button data-product-id="${product.id}" class="add-to-cart-btn w-full mt-2 py-2 px-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition hover:shadow-lg hover:shadow-red-600/30 active:scale-95" ${!product.inStock ? 'disabled' : ''}>
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

    const filtered = filter.trim() === '' ? products : products.filter(p => p.title.toLowerCase().includes(filter.toLowerCase().trim()));

    if (filter.trim() !== '') {
        title.textContent = 'Search Results';
        subtitle.textContent = `Found ${filtered.length} products for "${filter}"`;
    } else {
        title.textContent = 'Featured Products';
        subtitle.textContent = 'Handpicked just for you';
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
            // feedback
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
                            <h3 class="font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm line-clamp-2">${p.title}</h3>
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
                        <button data-product-id="${p.id}" class="add-to-cart-btn w-full mt-2 py-2 px-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition hover:shadow-lg hover:shadow-red-600/30 active:scale-95">
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
                <button id="continue-shopping" class="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition">Continue Shopping</button>
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
            <div class="flex gap-3 items-start border-b border-gray-100 dark:border-gray-800 pb-4" data-cart-item="${id}">
                <a href="/product/${id}" class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <img src="${product.image}" alt="${product.title}" class="w-full h-full object-cover" />
                </a>
                <div class="flex-1 min-w-0">
                    <a href="/product/${id}" class="text-sm font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors line-clamp-2">${product.title}</a>
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
        html += `<button id="clear-cart-btn" class="text-sm text-red-500 hover:text-red-600 transition">Clear Cart</button>`;
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

// ============ THEME TOGGLE ============
function initTheme() {
    const btn = document.getElementById('theme-toggle');
    const icon = btn.querySelector('i');
    btn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
            icon.className = 'fas fa-sun w-5 h-5';
        } else {
            icon.className = 'fas fa-moon w-5 h-5';
        }
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    // Check saved theme
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        icon.className = 'fas fa-sun w-5 h-5';
    }
}

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
    drawer.className = 'fixed top-0 left-0 z-50 h-full w-72 bg-gray-900 dark:bg-gray-950 transform transition-transform duration-300 ease-in-out -translate-x-full shadow-2xl lg:hidden';
    drawer.id = 'mobile-drawer';
    drawer.innerHTML = `
        <div class="flex items-center justify-between p-4 border-b border-gray-800">
            <span class="text-xl font-bold text-red-600">Merkato Wolaita</span>
            <button id="mobile-close" class="p-2 hover:bg-gray-800 rounded-md"><i class="fas fa-times w-5 h-5 text-white"></i></button>
        </div>
        <nav class="p-4 space-y-4">
            <a href="/" class="block py-2 px-3 hover:bg-gray-800 rounded-md text-white">Home</a>
            <a href="/deals" class="block py-2 px-3 hover:bg-gray-800 rounded-md text-white">Today's Deals</a>
            <a href="/registry" class="block py-2 px-3 hover:bg-gray-800 rounded-md text-white">Registry</a>
            <a href="/gift-cards" class="block py-2 px-3 hover:bg-gray-800 rounded-md text-white">Gift Cards</a>
            <a href="/sell" class="block py-2 px-3 hover:bg-gray-800 rounded-md text-white">Sell</a>
            <a href="/orders" class="block py-2 px-3 hover:bg-gray-800 rounded-md text-white">Orders</a>
        </nav>
    `;
    document.body.appendChild(drawer);

    function openMenu() {
        overlay.classList.remove('hidden');
        drawer.classList.remove('-translate-x-full');
    }
    function closeMenu() {
        overlay.classList.add('hidden');
        drawer.classList.add('-translate-x-full');
    }

    toggle.addEventListener('click', openMenu);
    document.getElementById('mobile-close').addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initUserMenu();
    initMobileMenu();
    initHero();
    renderProductGrid();
    renderCarousel();
    initCarouselScroll();
    initSearch();

    // Cart icon toggle
    document.getElementById('cart-icon').addEventListener('click', openCart);
    document.getElementById('cart-close').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    document.getElementById('checkout-btn').addEventListener('click', function() {
        if (cart.length === 0) return;
        alert('Proceeding to checkout...');
        closeCart();
    });

    // Initial cart UI
    updateCartUI();
});