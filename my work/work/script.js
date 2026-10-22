/* Savanna Bites demo menu and cart. Replace WHATSAPP_NUMBER with the restaurant's number. */
const WHATSAPP_NUMBER = "254700000000"; // Kenya country code + number, digits only. Do not include +.
const money = amount => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);

const menuItems = [
  {id:1,name:"Nyama Choma Plate",category:"grill",categoryLabel:"From the grill",description:"Tender, slow-grilled meat with kachumbari and a side of your choice.",price:850,image:"https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80"},
  {id:2,name:"Creamy Chicken Pasta",category:"mains",categoryLabel:"Main dish",description:"A comforting bowl of pasta in a rich, herby cream sauce.",price:650,image:"https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=700&q=80"},
  {id:3,name:"Classic Beef Burger",category:"mains",categoryLabel:"Main dish",description:"Juicy beef, crisp lettuce, tomato and our house sauce.",price:550,image:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80"},
  {id:4,name:"Grilled Chicken",category:"grill",categoryLabel:"From the grill",description:"Marinated chicken grilled until golden, served with fresh greens.",price:700,image:"https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=700&q=80"},
  {id:5,name:"Crispy Masala Chips",category:"sides",categoryLabel:"Side",description:"Golden potato chips tossed in our signature masala seasoning.",price:250,image:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=80"},
  {id:6,name:"Fresh Garden Salad",category:"sides",categoryLabel:"Side",description:"A bright mix of seasonal greens, cucumber and tomato.",price:300,image:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80"},
  {id:7,name:"Pilau & Kachumbari",category:"mains",categoryLabel:"Main dish",description:"Fragrant spiced rice with fresh, zesty kachumbari on the side.",price:450,image:"https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80"},
  {id:8,name:"Fresh Mango Juice",category:"drinks",categoryLabel:"Drink",description:"Sweet, chilled mango juice made for a refreshing break.",price:180,image:"https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=700&q=80"},
  {id:9,name:"Iced Lemon Mint",category:"drinks",categoryLabel:"Drink",description:"Cool lemon, fresh mint and a little sparkle over ice.",price:150,image:"https://images.unsplash.com/photo-1513558161293-cdaf765edfd47?auto=format&fit=crop&w=700&q=80"}
];
// Keep image URLs valid and editable; this final drink uses a known Unsplash photo.
menuItems[8].image = "https://images.unsplash.com/photo-1513558161293-cdaf765edfd47?auto=format&fit=crop&w=700&q=80";

const cart = new Map();
let activeCategory = "all";
const foodGrid = document.getElementById("foodGrid");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartSubtotal = document.getElementById("cartSubtotal");
const resultsLabel = document.getElementById("resultsLabel");
const emptyState = document.getElementById("emptyState");
const menuSearch = document.getElementById("menuSearch");
const orderForm = document.getElementById("orderForm");
const whatsappButton = document.getElementById("whatsappButton");
const formMessage = document.getElementById("formMessage");

function renderMenu() {
  const term = menuSearch.value.trim().toLowerCase();
  const filtered = menuItems.filter(item =>
    (activeCategory === "all" || item.category === activeCategory) &&
    (item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term))
  );
  foodGrid.innerHTML = filtered.map(item => `
    <article class="food-card">
      <div class="food-image-wrap">
        <img class="food-image" src="${item.image}" alt="${item.name}" loading="lazy">
        <span class="food-category">${item.categoryLabel}</span>
      </div>
      <div class="food-info">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <div class="food-bottom">
          <span class="food-price">${money(item.price)}</span>
          <button class="add-btn" type="button" data-add="${item.id}" aria-label="Add ${item.name} to order" title="Add to order">+</button>
        </div>
      </div>
    </article>`).join("");
  resultsLabel.textContent = filtered.length === menuItems.length ? "Showing all dishes" : `Showing ${filtered.length} ${filtered.length === 1 ? "dish" : "dishes"}`;
  emptyState.hidden = filtered.length > 0;
  foodGrid.hidden = filtered.length === 0;
}

function renderCart() {
  const entries = [...cart.entries()];
  const quantity = entries.reduce((sum, [, count]) => sum + count, 0);
  const subtotal = entries.reduce((sum, [id, count]) => sum + menuItems.find(item => item.id === id).price * count, 0);
  cartCount.textContent = quantity;
  cartSubtotal.textContent = money(subtotal);
  whatsappButton.disabled = quantity === 0;
  if (!entries.length) {
    cartItems.innerHTML = `<div class="cart-empty"><span aria-hidden="true">♧</span><b>Your basket is waiting</b><p>Add something delicious from the menu.</p></div>`;
    return;
  }
  cartItems.innerHTML = entries.map(([id, count]) => {
    const item = menuItems.find(product => product.id === id);
    return `<div class="cart-line">
      <div><div class="cart-line-name">${item.name}</div><div class="cart-line-price">${money(item.price)} each · ${money(item.price * count)}</div></div>
      <div class="quantity-controls" aria-label="Quantity for ${item.name}">
        <button type="button" data-minus="${id}" aria-label="Remove one ${item.name}">−</button>
        <span aria-live="polite">${count}</span>
        <button type="button" data-plus="${id}" aria-label="Add one ${item.name}">+</button>
      </div>
      <button type="button" class="remove-line" data-remove="${id}">Remove item</button>
    </div>`;
  }).join("");
}

function addItem(id) {
  cart.set(id, (cart.get(id) || 0) + 1);
  renderCart();
  formMessage.textContent = "";
}

function changeQuantity(id, delta) {
  const next = (cart.get(id) || 0) + delta;
  if (next <= 0) cart.delete(id);
  else cart.set(id, next);
  renderCart();
}

document.getElementById("categoryFilters").addEventListener("click", event => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll(".filter-btn").forEach(filter => {
    const selected = filter === button;
    filter.classList.toggle("active", selected);
    filter.setAttribute("aria-pressed", String(selected));
  });
  renderMenu();
});
menuSearch.addEventListener("input", renderMenu);
foodGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addItem(Number(button.dataset.add));
});
cartItems.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.plus) changeQuantity(Number(button.dataset.plus), 1);
  if (button.dataset.minus) changeQuantity(Number(button.dataset.minus), -1);
  if (button.dataset.remove) { cart.delete(Number(button.dataset.remove)); renderCart(); }
});

async function waitForMpesaResult(checkoutRequestId, maxWaitMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const response = await fetch(`/api/mpesa/status/${encodeURIComponent(checkoutRequestId)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not check payment status.");
    if (result.status === "paid") return result;
    if (result.status === "failed") throw new Error(result.message || "M-Pesa payment failed or was cancelled.");
  }
  throw new Error("Payment is still pending. Check your M-Pesa messages and contact the restaurant before trying again.");
}

orderForm.addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent = "";
  const name = document.getElementById("customerName").value.trim();
  const orderType = document.getElementById("orderType").value;
  const notes = document.getElementById("orderNotes").value.trim();
  const phoneInput = document.getElementById("mpesaPhone");
  const phoneError = document.getElementById("phoneError");
  const nameError = document.getElementById("nameError");
  phoneError.textContent = "";
  nameError.textContent = "";

  if (!cart.size) {
    formMessage.textContent = "Please add at least one dish before paying.";
    return;
  }
  if (name.length < 2 || !/^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ .'-]{1,59}$/.test(name)) {
    nameError.textContent = "Please enter a valid name (at least 2 characters).";
    document.getElementById("customerName").focus();
    return;
  }
  const normalizedPhone = phoneInput.value.trim().replace(/[\s-]/g, "").replace(/^\+/, "");
  const mpesaPhone = normalizedPhone.startsWith("0") ? "254" + normalizedPhone.slice(1) : normalizedPhone;
  if (!/^254[17]\d{8}$/.test(mpesaPhone)) {
    phoneError.textContent = "Enter a valid Kenyan M-Pesa number, e.g. 0712345678 or 254712345678.";
    phoneInput.focus();
    return;
  }
  if (!/^\d{10,15}$/.test(WHATSAPP_NUMBER)) {
    formMessage.textContent = "The restaurant WhatsApp number needs to be configured in script.js.";
    return;
  }

  const entries = [...cart.entries()];
  const items = entries.map(([id, quantity]) => ({ id, quantity }));
  whatsappButton.disabled = true;
  whatsappButton.textContent = "Requesting M-Pesa payment…";
  try {
    const response = await fetch("/api/mpesa/stkpush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: mpesaPhone, items, customerName: name, orderType, notes })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not start M-Pesa payment.");
    if (!data.checkoutRequestId) throw new Error("M-Pesa did not return a checkout request ID.");
    formMessage.textContent = "Payment prompt requested. Check your phone and enter your M-Pesa PIN. Waiting for confirmation…";
    const payment = await waitForMpesaResult(data.checkoutRequestId);

    const subtotal = entries.reduce((sum, [id, count]) => sum + menuItems.find(item => item.id === id).price * count, 0);
    const itemLines = entries.map(([id, count]) => {
      const item = menuItems.find(product => product.id === id);
      return `• ${item.name} x${count} — ${money(item.price * count)}`;
    });
    const message = [
      "Hello Savanna Bites! My M-Pesa payment has been confirmed and I'd like to place this order.",
      "",
      `Name: ${name}`,
      `Order type: ${orderType}`,
      `M-Pesa receipt: ${payment.receipt || "Confirmed"}`,
      "",
      "Order items:", ...itemLines, "",
      `Paid total: ${money(subtotal)}`,
      notes ? `Notes: ${notes}` : "",
      "Please confirm the order and any delivery details. Thank you!"
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    formMessage.textContent = "M-Pesa payment confirmed. Opening WhatsApp so you can send your order details.";
    window.location.href = url;
  } catch (error) {
    formMessage.textContent = error.message || "Payment could not be completed. Please try again or contact the restaurant.";
  } finally {
    whatsappButton.disabled = cart.size === 0;
    whatsappButton.innerHTML = '<span aria-hidden="true">◉</span> Pay with M-Pesa <span aria-hidden="true">↗</span>';
  }
});
const menuToggle = document.getElementById("menuToggle");
const primaryNav = document.getElementById("primaryNav");
menuToggle.addEventListener("click", () => {
  const isOpen = primaryNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  menuToggle.textContent = isOpen ? "×" : "☰";
});
primaryNav.addEventListener("click", event => {
  if (event.target.closest("a")) {
    primaryNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.textContent = "☰";
  }
});
document.getElementById("year").textContent = new Date().getFullYear();
renderMenu();
renderCart();
