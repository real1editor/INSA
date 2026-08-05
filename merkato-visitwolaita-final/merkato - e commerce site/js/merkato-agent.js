/**
 * Merkato Agent Module
 * Contains agent's isolated history, system instruction, function declarations,
 * and the concrete tool handlers for e-commerce logic.
 */

// Isolated conversational state for the Merkato agent
export let merkatoHistory = [];

export function clearMerkatoHistory() {
  merkatoHistory.length = 0;
}

// System Instruction - Configured for "WolaAI", the official concierge for Visit Wolaita.
export const systemInstruction = "You are \"WolaAI\", the official concierge for the Visit Wolaita / Merkato platform. Help users find authentic local products from Wolaita Sodo, check stock, manage cart actions, navigate the platform sections, and prefill trip planner information.";

// Function Declarations (Tools specification for Gemini API)
export const tools = [
  {
    name: "searchCatalog",
    description: "Search the Merkato catalog for products by keyword query, category, or maximum price.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional keywords to search within the product titles (e.g., 'honey', 'dress', 'coffee')."
        },
        category: {
          type: "string",
          description: "Optional category filter. Allowed categories are: 'Traditional Clothing', 'Local Crafts', 'Food & Spices', 'Household Artifacts'."
        },
        maxPrice: {
          type: "number",
          description: "Optional maximum price filter (e.g., 300)."
        }
      }
    }
  },
  {
    name: "addToCart",
    description: "Add a specific product from the catalog to the user's shopping cart.",
    parameters: {
      type: "object",
      properties: {
        productId: {
          type: "integer",
          description: "The unique ID of the product to add."
        },
        quantity: {
          type: "integer",
          description: "The quantity of the product to add. Defaults to 1."
        }
      },
      required: ["productId"]
    }
  },
  {
    name: "navigate_to_section",
    description: "Smoothly scrolls the browser viewport to a specific section of the Visit Wolaita / Merkato platform.",
    parameters: {
      type: "object",
      properties: {
        section_id: {
          type: "string",
          enum: ["hero", "about", "attractions", "festivals", "contact"],
          description: "The ID of the target section to scroll into view."
        }
      },
      required: ["section_id"]
    }
  },
  {
    name: "prefill_trip_planner",
    description: "Prefills interest, travel date, and customized message in the trip planner or contact form.",
    parameters: {
      type: "object",
      properties: {
        interest: {
          type: "string",
          description: "User's interest (e.g., local history, cultural festivals, traditional food, crafts)."
        },
        travel_date: {
          type: "string",
          description: "Approximate travel date or month (e.g., September, Enkutatash, January)."
        },
        message: {
          type: "string",
          description: "A prefilled message detail, question, or request for the planner."
        }
      },
      required: ["message"]
    }
  }
];

// Tool Handlers mapping to local browser/DOM e-commerce and navigation operations
export const toolHandlers = {
  searchCatalog: async ({ query, category, maxPrice }) => {
    // Access the global products array defined in merkato.js
    const productsList = window.products || [];
    
    let results = productsList;

    if (category) {
      results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (query) {
      const q = query.toLowerCase().trim();
      results = results.filter(p => p.title.toLowerCase().includes(q));
    }

    if (maxPrice !== undefined && maxPrice !== null) {
      results = results.filter(p => p.price <= maxPrice);
    }

    // Return serializable products info for the AI model
    return results.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      inStock: p.inStock,
      primeEligible: p.primeEligible,
      rating: p.rating
    }));
  },

  addToCart: async ({ productId, quantity }) => {
    const qty = parseInt(quantity) || 1;
    const productsList = window.products || [];
    const product = productsList.find(p => p.id === productId);

    if (!product) {
      return { success: false, message: `Product with ID ${productId} not found in the catalog.` };
    }

    if (!product.inStock) {
      return { success: false, message: `Product '${product.title}' is currently out of stock.` };
    }

    // Access global cart and helper functions
    const cartList = window.cart || [];
    const existing = cartList.find(item => item.id === productId);

    if (existing) {
      existing.quantity += qty;
    } else {
      cartList.push({ id: productId, quantity: qty });
    }

    // Trigger standard UI refresh
    if (typeof window.updateCartUI === 'function') {
      window.updateCartUI();
    }

    // Optionally show the drawer so the user can see the addition
    if (typeof window.openCart === 'function') {
      window.openCart();
    }

    // Provide user feedback with existing toast function if available
    if (typeof window.showToast === 'function') {
      window.showToast(`Agent added ${qty}x ${product.title} to your cart!`, 'success');
    }

    return {
      success: true,
      message: `Successfully added ${qty} of '${product.title}' (ID: ${productId}) to the cart.`,
      cartTotalItems: cartList.reduce((sum, item) => sum + item.quantity, 0)
    };
  },

  navigate_to_section: async ({ section_id }) => {
    // Attempt to find element in DOM.
    // In this unified page:
    // - 'hero' matches #hero
    // - 'about' matches `#about-modal` or similar, or we can look for relevant elements. Let's look for about section or modal, or scroll.
    // Let's create section elements or map them:
    // hero -> #hero
    // about -> #about-modal or about section if it exists, otherwise trigger the about modal open.
    // attractions -> '#products-section' (since that is the main attraction of the e-commerce page)
    // festivals -> '#hero' (or anywhere relevant)
    // contact -> '#contact-modal' or `#contact` (which corresponds to the contact modal or footer)
    
    let element = document.getElementById(section_id);
    if (!element) {
      // Check if there are modals
      if (section_id === 'about') {
        const modal = document.getElementById('about-modal');
        if (modal && typeof window.openFooterModal === 'function') {
          window.openFooterModal('about');
          return { success: true, message: `Successfully opened About Us modal.` };
        } else if (modal) {
          modal.classList.remove('hidden');
          const panel = modal.querySelector('.footer-panel');
          const overlay = modal.querySelector('.footer-overlay');
          if (panel) panel.classList.remove('translate-x-full');
          if (overlay) overlay.classList.remove('opacity-0');
          return { success: true, message: `Successfully opened About Us modal panel.` };
        }
      } else if (section_id === 'contact') {
        const modal = document.getElementById('contact-modal');
        if (modal && typeof window.openFooterModal === 'function') {
          window.openFooterModal('contact');
          return { success: true, message: `Successfully opened Contact Us modal.` };
        } else if (modal) {
          modal.classList.remove('hidden');
          const panel = modal.querySelector('.footer-panel');
          const overlay = modal.querySelector('.footer-overlay');
          if (panel) panel.classList.remove('translate-x-full');
          if (overlay) overlay.classList.remove('opacity-0');
          return { success: true, message: `Successfully opened Contact Us modal panel.` };
        }
      } else if (section_id === 'attractions') {
        element = document.getElementById('products-section');
      } else if (section_id === 'festivals') {
        element = document.getElementById('hero');
      }
    }

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return { success: true, message: `Successfully scrolled to section '${section_id}'.` };
    }

    return { success: false, message: `Section '${section_id}' element or modal not found on this page.` };
  },

  prefill_trip_planner: async ({ interest, travel_date, message }) => {
    // Populate form elements in #plannerForm or #contact.
    // In our merkato.html, we have:
    // - textarea in #contact-modal: has selector `textarea` inside `#contact-modal`.
    // Let's populate the textarea inside #contact-modal, and open the contact modal!
    
    const contactModal = document.getElementById('contact-modal');
    if (contactModal) {
      // Find the textarea
      const textarea = contactModal.querySelector('textarea');
      if (textarea) {
        let prefilledText = "";
        if (interest) prefilledText += `Interest: ${interest}\n`;
        if (travel_date) prefilledText += `Travel Date: ${travel_date}\n`;
        if (message) prefilledText += `Message: ${message}`;
        textarea.value = prefilledText;
      }

      // Open the contact modal
      if (typeof window.openFooterModal === 'function') {
        window.openFooterModal('contact');
      } else {
        contactModal.classList.remove('hidden');
        const panel = contactModal.querySelector('.footer-panel');
        const overlay = contactModal.querySelector('.footer-overlay');
        if (panel) panel.classList.remove('translate-x-full');
        if (overlay) overlay.classList.remove('opacity-0');
      }

      return { success: true, message: `Successfully prefilled and opened the contact form modal.` };
    }

    return { success: false, message: `Contact form or modal elements not found.` };
  }
};
