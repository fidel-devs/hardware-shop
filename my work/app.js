/* BuildStock inventory app.
   This file is the JavaScript: js/app.js
   Data is stored in this browser only (localStorage). */
"use strict";

const STORAGE_PRODUCTS = "buildstock_products_v1";
const STORAGE_SALES = "buildstock_sales_v1";

const $ = (id) => document.getElementById(id);
const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", maximumFractionDigits: 2
}).format(Number(amount) || 0);

function readStore(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not read saved data:", error);
    return [];
  }
}
function saveStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

let products = readStore(STORAGE_PRODUCTS);
let sales = readStore(STORAGE_SALES);
let editingId = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderStats() {
  $("totalProducts").textContent = products.length;
  $("totalUnits").textContent = products.reduce((sum, p) => sum + Number(p.quantity), 0);
  $("lowStock").textContent = products.filter(p => Number(p.quantity) <= Number(p.reorderLevel)).length;
  $("salesTotal").textContent = money(sales.reduce((sum, sale) => sum + Number(sale.total), 0));
}

function renderProducts() {
  const term = $("search").value.trim().toLowerCase();
  const filtered = products.filter(p =>
    [p.name, p.category, p.sku, p.supplier].some(value => String(value || "").toLowerCase().includes(term))
  );
  $("productRows").innerHTML = filtered.map(p => {
    const low = Number(p.quantity) <= Number(p.reorderLevel);
    return `<tr>
      <td><strong>${escapeHtml(p.name)}</strong>${low ? '<small class="low">Low stock</small>' : ""}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${escapeHtml(p.sku || "—")}<small>${escapeHtml(p.supplier || "No supplier")}</small></td>
      <td>${money(p.buyPrice)}</td><td>${money(p.sellPrice)}</td>
      <td class="${low ? "low" : ""}">${Number(p.quantity)}</td>
      <td><div class="actions">
        <button class="edit" data-action="edit" data-id="${p.id}">Edit</button>
        <button class="sell" data-action="sell" data-id="${p.id}">Sell</button>
        <button class="delete" data-action="delete" data-id="${p.id}">Delete</button>
      </div></td>
    </tr>`;
  }).join("");
  $("emptyMessage").hidden = filtered.length > 0;
}

function renderSales() {
  $("salesRows").innerHTML = sales.slice(0, 20).map(sale => `<tr>
    <td>${escapeHtml(new Date(sale.date).toLocaleString())}</td>
    <td>${escapeHtml(sale.productName)}</td>
    <td>${Number(sale.quantity)}</td>
    <td>${money(sale.total)}</td>
  </tr>`).join("");
  $("noSales").hidden = sales.length > 0;
}

function render() {
  renderStats();
  renderProducts();
  renderSales();
}

function resetForm() {
  $("productForm").reset();
  $("reorderLevel").value = "5";
  editingId = null;
  $("productForm").querySelector('button[type="submit"]').textContent = "Save product";
}

$("productForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("productName").value.trim();
  const category = $("category").value;
  const sku = $("sku").value.trim();
  const supplier = $("supplier").value.trim();
  const buyPrice = Number($("buyPrice").value);
  const sellPrice = Number($("sellPrice").value);
  const quantity = Number($("quantity").value);
  const reorderLevel = Number($("reorderLevel").value);

  if (!name || !category || [buyPrice, sellPrice, quantity, reorderLevel].some(n => !Number.isFinite(n) || n < 0)) {
    alert("Please enter valid product details. Prices and quantities cannot be negative.");
    return;
  }
  if (sku && products.some(p => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editingId)) {
    alert("That product code is already in use. Please use a unique code.");
    return;
  }

  if (editingId !== null) {
    const index = products.findIndex(p => p.id === editingId);
    if (index !== -1) products[index] = { ...products[index], name, category, sku, supplier, buyPrice, sellPrice, quantity, reorderLevel };
  } else {
    products.push({ id: Date.now(), name, category, sku, supplier, buyPrice, sellPrice, quantity, reorderLevel });
  }

  saveStore(STORAGE_PRODUCTS, products);
  resetForm();
  render();
});

$("search").addEventListener("input", renderProducts);

$("productRows").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (button.dataset.action === "edit") {
    editingId = id;
    $("productName").value = product.name;
    $("category").value = product.category;
    $("sku").value = product.sku || "";
    $("supplier").value = product.supplier || "";
    $("buyPrice").value = product.buyPrice;
    $("sellPrice").value = product.sellPrice;
    $("quantity").value = product.quantity;
    $("reorderLevel").value = product.reorderLevel;
    $("productForm").querySelector('button[type="submit"]').textContent = "Update product";
    $("productName").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (button.dataset.action === "sell") {
    const answer = prompt(`How many "${product.name}" were sold? Available: ${product.quantity}`);
    if (answer === null) return;
    const quantity = Number(answer);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert("Enter a whole number greater than zero.");
      return;
    }
    if (quantity > Number(product.quantity)) {
      alert("Not enough stock available for this sale.");
      return;
    }
    product.quantity = Number(product.quantity) - quantity;
    sales.unshift({
      id: Date.now(), productName: product.name, quantity,
      total: quantity * Number(product.sellPrice), date: new Date().toISOString()
    });
    saveStore(STORAGE_PRODUCTS, products);
    saveStore(STORAGE_SALES, sales);
    render();
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${product.name}" from inventory? This cannot be undone.`)) return;
    products = products.filter(p => p.id !== id);
    saveStore(STORAGE_PRODUCTS, products);
    render();
  }
});

render();
