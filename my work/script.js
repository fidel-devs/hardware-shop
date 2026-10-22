/* Savanna Bites demo menu and cart. Replace WHATSAPP_NUMBER with the restaurant's number. */
const WHATSAPP_NUMBER = "254745025326"; // Kenya country code + number, digits only. Do not include +.
const money = amount => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);

const menuItems = [
  {id:1,name:"Nyama Choma Plate",category:"grill",categoryLabel:"From the grill",description:"Tender, slow-grilled meat with kachumbari and a side of your choice.",price:850,image:"https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80"},
  {id:2,name:"Creamy Chicken Pasta",category:"mains",categoryLabel:"Main dish",description:"A comforting bowl of pasta in a rich, herby cream sauce.",price:650,image:"https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=700&q=80"},
  {id:3,name:"Classic Beef Burger",category:"mains",categoryLabel:"Main dish",description:"Juicy beef, crisp lettuce, tomato and our house sauce.",price:550,image:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80"},
  {id:4,name:"Grilled Chicken",category:"grill",categoryLabel:"From the grill",description:"Marinated chicken grilled until golden, served with fresh greens.",price:700,image:"https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=700&q=80"},
  {id:5,name:"Crispy Masala Chips",category:"sides",categoryLabel:"Side",description:"Golden potato chips tossed in our signature masala seasoning.",price:250,image:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=80"},
  {id:6,name:"Fresh Garden Salad",category:"sides",categoryLabel:"Side",description:"A bright mix of seasonal greens, cucumber and tomato.",price:300,image:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80"},
  {id:7,name:"Pilau & Kachumbari",category:"mains",categoryLabel:"Main dish",description:"Fragrant spiced rice with fresh, zesty kachumbari on the side.",price:450,image:"https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80"},
  {id:8,name:"Hot Black Coffee",category:"drinks",categoryLabel:"Drink",description:"Pure simple drink made from roasted coffee beans and hot water without any milk.",price:180,image:"flamingo/food9.jpg"},
  {id:9,name:"Plater For Two",category:"Mains",categoryLabel:"Main dish",description:"A Hearty protein rich feast featuring a variety of griled,fried and roasted meat served with rice and juice.",price:650,image:"flamingo/food10.jpg"},
  {id:10,name:"Fresh Orange Juice",category:"drinks",categoryLabel:"Drink",description:"Sweet, chilled orange juice made for a refreshing break.",price:180,image:"flamingo/food26.jpg"},
  {id:11,name:"Fried Chicken and chips",category:"mains",categoryLabel:"Main dish",description:"Golden-fried Chicken with Hot,Seasoned potato chips.",price:550,image:"flamingo/food24.jpg"},
  {id:12,name:"Cripsy-Fried Chicken",category:"mains",categoryLabel:"Main dish",description:"Cripsy fried chicken served with fresh salad.",price:180,image:"flamingo/food23.jpg"},
  {id:13,name:"Beef Biryani",category:"mains",categoryLabel:"Main dish",description:"Deeply flavoured rice dish cooked with fragrant east african spices and meat.",price:1500,image:"flamingo/food16.jpg"},
  {id:14,name:"Vegetable Rice",category:"mains",categoryLabel:"Main dish",description:"A vibrant dish made of wok-tossed rice and mixed with finely diced vegetables.",price:350,image:"flamingo/food20.jpg"},
  {id:15,name:"Chai/Milk Tea",category:"drinks",categoryLabel:"Drink",description:"A warm soothing cup of traditional milk tea.",price:180,image:"flamingo/food22.jpg"},       
  {id:16,name:"Fresh Lemon Juice",category:"mains",categoryLabel:"Main dish",description:"Sweet, chilled mango juice made for a refreshing break.",price:180,image:"flamingo/food13.jpg"},
  {id:17,name:"Fried Chicken,Chips and kachumbari",category:"mains",categoryLabel:"Main dish",description:"Crispy fried chicken paired with generous side of hot flutty potato chips.",price:180,image:"flamingo/food6.jpg"},
    {id:7,name:"Pilau & Kachumbari",category:"mains",categoryLabel:"Main dish",description:"Fragrant spiced rice with fresh, zesty kachumbari on the side.",price:450,image:"https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80"}
   
  
];
// Keep image URLs valid and editable; this final drink uses a known Unsplash photo.
menuItems[17].image = "https://images.unsplash.com/photo-1513558161293-cdaf765edfd47?auto=format&fit=crop&w=700&q=80";


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

orderForm.addEventListener("submit", event => {
  event.preventDefault();
  formMessage.textContent = "";
  const name = document.getElementById("customerName").value.trim();
  const orderType = document.getElementById("orderType").value;
  const notes = document.getElementById("orderNotes").value.trim();
  const nameError = document.getElementById("nameError");
  nameError.textContent = "";

  if (!cart.size) {
    formMessage.textContent = "Please add at least one dish before ordering.";
    return;
  }
  if (name.length < 2) {
    nameError.textContent = "Please enter a name with at least 4 characters.";
    document.getElementById("customerName").focus();
    return;
  }
  if (!/^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ .'-]{1,59}$/.test(name)) {
    nameError.textContent = "Please use a valid name (letters, spaces, apostrophes or hyphens).";
    document.getElementById("customerName").focus();
    return;
  }
  if(!orderType) {
    formMessage.textContent= "please select order type: Delivery, Pickup or Dine-in";
    formMessage.style.color = "red";
    document.getElementById("orderType").focus();
    document.getElementById("orderType").style.border = "2px solid red";
    return;
  }

  if (!/^\d{10,15}$/.test(WHATSAPP_NUMBER)) {
    formMessage.textContent = "The restaurant WhatsApp number needs to be configured in script.js.";
    return;
  }
  const DELIVERY_FEE = 125;
  const deliveryFee = (orderType === 'Pickup' || orderType === 'Dine-in') ? 0 :DELIVERY_FEE;
  const entries = [...cart.entries()];
  const subtotal = entries.reduce((sum, [id, count]) => sum + menuItems.find(item => item.id === id).price * count, 0);
  const finalTotal = subtotal + deliveryFee;
  const itemLines = entries.map(([id, count]) => {
    const item = menuItems.find(product => product.id === id);
    return `• ${item.name} x${count} — ${money(item.price * count)}`;
  });
  const message = [
    "Hello majid Bites! I'd like to place an order.",
    "",
    `Name: ${name}`,
    `Order type: ${orderType}`,
    "",
    "Order items:",
    ...itemLines,
    "",
    `Subtotal: ${money(subtotal)}`,
    `delivery Fee: ${money(deliveryFee)}`,
    `Total: ${money(finalTotal)}`,
    notes ? `Notes: ${notes}` : "",
    "",
    "Please confirm my order. Thank you!"
  ].filter(Boolean).join("\n");

  // Opens WhatsApp with a prefilled message. The user must press Send in WhatsApp.
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.href = url;
  formMessage.textContent = "WhatsApp is opening with your order prepared. Review it and press Send; this website cannot verify delivery or restaurant receipt.";
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
