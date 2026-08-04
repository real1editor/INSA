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

// System Instruction
export const systemInstruction = "You are the Merkato Shopping Assistant for Wolaita Sodo, Ethiopia. Help users find authentic local products, check stock, and manage cart actions.";

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
  }
];

// Tool Handlers mapping to local browser/DOM e-commerce operations
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
  }
};
