/* ==========================================================================
   MERKATO — Interactive behavior
   1. Cart counter (persisted in localStorage)
   2. Live search + category filter over the product grid
========================================================================== */
(function () {
  "use strict";

  /* ---- 1. CART ---- */
  var CART_KEY = "merkatoCartCount";

  function readCart() {
    return parseInt(localStorage.getItem(CART_KEY), 10) || 0;
  }

  function writeCart(n) {
    localStorage.setItem(CART_KEY, String(n));
  }

  function getElements() {
    return {
      count: document.getElementById("cart-count"),
      link: document.querySelector(".cart-link")
    };
  }

  function renderCart(count) {
    var el = getElements();
    if (!el.count) return;
    count = Math.max(0, count);
    el.count.textContent = String(count);
    el.count.style.visibility = count > 0 ? "visible" : "hidden";
    if (el.link) {
      var word = count === 1 ? "item" : "items";
      el.link.setAttribute("aria-label", "Cart, " + count + " " + word);
    }
  }

  function bumpCart(amount) {
    var count = readCart() + (amount || 1);
    writeCart(count);
    renderCart(count);
    pulseCart();
  }

function pulseCart() {
  var badge = document.getElementById("cart-count");
  if (!badge) return;
  badge.style.transition = "transform 0.18s ease";
  badge.style.transform = "scale(1.4)";
  setTimeout(function () { badge.style.transform = ""; }, 180);
}

  function initCart() {
    renderCart(readCart());
    document.querySelectorAll(".btn-cart").forEach(function (btn) {
      btn.addEventListener("click", function () { bumpCart(1); });
    });
  }

  /* ---- 2. SEARCH / FILTER ---- */
  var grid = null;
  var searchInput = null;
  var categorySelect = null;
  var noResults = null;

  function cardMatches(card, term, category) {
    var titleEl = card.querySelector(".card-title");
    var title = titleEl ? titleEl.textContent.toLowerCase() : "";
    var hasTerm = !term || title.indexOf(term.toLowerCase()) !== -1;
    var matchesCategory = category === "all" || card.dataset.category === category;
    return hasTerm && matchesCategory;
  }

  function applyFilter() {
    if (!grid) return;
    var term = (searchInput ? searchInput.value : "").trim();
    var category = (categorySelect ? categorySelect.value : "all");
    var visible = 0;

    var cards = grid.querySelectorAll(".product-card");
    cards.forEach(function (card) {
      var show = cardMatches(card, term, category);
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });

    if (noResults) {
      noResults.style.display = visible > 0 ? "none" : "grid";
    }
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function initSearch() {
    grid = document.getElementById("product-grid");
    searchInput = document.getElementById("search-input");
    categorySelect = document.getElementById("search-category");
    noResults = document.getElementById("no-results");

    if (!grid || !searchInput) return;

    var debounced = debounce(applyFilter, 250);
    searchInput.addEventListener("input", debounced);
    if (categorySelect) {
      categorySelect.addEventListener("change", applyFilter);
    }

    var form = searchInput.closest("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        applyFilter();
      });
    }

    applyFilter();
  }

  function onReady(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(initCart);
  onReady(initSearch);

  window.Merkato = {
    getCartCount: readCart,
    setCartCount: function (n) { writeCart(n); renderCart(n); },
    bumpCart: bumpCart,
    applyFilter: applyFilter
  };
})();
