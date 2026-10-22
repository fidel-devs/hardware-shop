const $ = s => document.querySelector(s);
let currentUser = null;
let products = [];
function showNotice(message, error=false) {
  const el=$('#notice'); el.textContent=message; el.classList.remove('hidden','error');
  if(error) el.classList.add('error');
}
async function api(url, options={}) {
  const res=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||'Request failed');
  return data;
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(v){return Number(v||0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function setLoggedIn(user){
  currentUser=user;
  $('#loginPanel').classList.toggle('hidden',!!user);
  $('#appPanel').classList.toggle('hidden',!user);
  $('#userBadge').classList.toggle('hidden',!user);
  if(user) $('#userBadge').textContent=`${user.username} · ${user.role}`;
  document.querySelectorAll('.boss-only').forEach(el=>el.classList.toggle('hidden',!user||user.role!=='boss'));
}
async function refreshProducts(){
  products=await api('/api/products');
  $('#productsBody').innerHTML=products.map(p=>`<tr>
    <td><strong>${esc(p.name)}</strong>${p.brand?`<br><span class="muted small">${esc(p.brand)}</span>`:''}</td>
    <td>${esc(p.category)}</td><td>${money(p.purchase_price)}</td><td>${money(p.selling_price)}</td>
    <td class="${p.quantity<=p.low_stock_level?'low':''}">${p.quantity} ${esc(p.unit)}${p.quantity<=p.low_stock_level?' · LOW':''}</td>
    <td>${currentUser.role==='boss'?`<button class="outline" data-edit="${p.id}">Edit</button> <button class="outline" data-delete="${p.id}">Delete</button>`:'View only'}</td>
  </tr>`).join('') || '<tr><td colspan="6">No items yet. Add your first item above.</td></tr>';
  $('#saleProduct').innerHTML=products.map(p=>`<option value="${p.id}" ${p.quantity<1?'disabled':''}>${esc(p.name)} — KES ${money(p.selling_price)} (${p.quantity} in stock)</option>`).join('');
}
async function refreshSales(){
  const rows=await api('/api/sales');
  $('#salesBody').innerHTML=rows.map(s=>`<tr><td>${esc(s.receipt_no)}</td><td>${esc(s.product_name)}</td><td>${s.quantity}</td><td>${money(s.total)}</td><td>${esc(s.payment_method)}</td><td><span class="status ${esc(s.status)}">${esc(s.status)}</span></td><td>${new Date(s.created_at).toLocaleString()}</td></tr>`).join('')||'<tr><td colspan="7">No sales recorded.</td></tr>';
}
async function refreshUsers(){
  const rows=await api('/api/users');
  $('#usersBody').innerHTML=rows.map(u=>`<tr><td>${esc(u.username)}</td><td>${esc(u.role)}</td><td>${new Date(u.created_at).toLocaleString()}</td></tr>`).join('');
}
async function refreshReports(){
  const d=await api('/api/reports/summary');
  $('#summary').innerHTML=`<div class="stat">Products<strong>${d.products.product_count}</strong></div><div class="stat">Units in stock<strong>${d.products.units_in_stock}</strong></div><div class="stat">Completed sales revenue<strong>KES ${money(d.sales.revenue)}</strong></div>`;
  $('#lowStock').innerHTML=d.lowStock.map(p=>`<li>${esc(p.name)} — ${p.quantity} left (alert at ${p.low_stock_level})</li>`).join('')||'<li>No low-stock items.</li>';
}
async function refreshAll(){
  await refreshProducts(); await refreshSales();
  if(currentUser.role==='boss'){await refreshUsers();await refreshReports();}
}
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden'));
  $(`#${btn.dataset.tab}Tab`).classList.remove('hidden');
}));
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const f=new FormData(e.target);
  try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify(Object.fromEntries(f))});setLoggedIn(d.user);await refreshAll();showNotice('Welcome back.');}
  catch(err){showNotice(err.message,true);}
});
$('#logoutBtn').addEventListener('click',async()=>{await api('/api/auth/logout',{method:'POST'});setLoggedIn(null);});
$('#productForm').addEventListener('submit',async e=>{
  e.preventDefault();const f=new FormData(e.target), b=Object.fromEntries(f);
  b.purchase_price=Number(b.purchase_price);b.selling_price=Number(b.selling_price);b.quantity=Number(b.quantity);b.low_stock_level=Number(b.low_stock_level);
  try{await api('/api/products',{method:'POST',body:JSON.stringify(b)});e.target.reset();e.target.elements.unit.value='bottle';e.target.elements.quantity.value='0';e.target.elements.low_stock_level.value='5';await refreshAll();showNotice('Item added to inventory.');}
  catch(err){showNotice(err.message,true);}
});
$('#productsBody').addEventListener('click',async e=>{
  const del=e.target.dataset.delete, edit=e.target.dataset.edit;
  if(del){
    if(!confirm('Delete this product? This cannot be undone.'))return;
    try{await api(`/api/products/${del}`,{method:'DELETE'});await refreshAll();showNotice('Product deleted.');}catch(err){showNotice(err.message,true);}
  }
  if(edit){
    const p=products.find(x=>x.id===Number(edit));if(!p)return;
    const name=prompt('Item name:',p.name);if(name===null)return;
    const price=prompt('Selling price (KES):',p.selling_price);if(price===null)return;
    const qty=prompt('Current stock quantity:',p.quantity);if(qty===null)return;
    const body={...p,name,selling_price:Number(price),quantity:Number(qty),purchase_price:Number(p.purchase_price),low_stock_level:Number(p.low_stock_level)};
    try{await api(`/api/products/${edit}`,{method:'PUT',body:JSON.stringify(body)});await refreshAll();showNotice('Product updated.');}catch(err){showNotice(err.message,true);}
  }
});
function saleValues(){return {product_id:Number($('#saleForm').elements.product_id.value),quantity:Number($('#saleForm').elements.quantity.value)};}
$('#cashSaleBtn').addEventListener('click',async()=>{
  try{const d=await api('/api/sales/cash',{method:'POST',body:JSON.stringify(saleValues())});await refreshAll();showNotice(`Cash sale saved. Receipt: ${d.receipt_no}. Total KES ${money(d.total)}.`);}
  catch(err){showNotice(err.message,true);}
});
$('#mpesaBtn').addEventListener('click',async()=>{
  const body={...saleValues(),phone:$('#saleForm').elements.phone.value};
  if(!body.phone.trim()){showNotice('Enter the customer phone number first.',true);return;}
  try{const d=await api('/api/mpesa/stkpush',{method:'POST',body:JSON.stringify(body)});await refreshSales();showNotice(`${d.message} Receipt: ${d.receipt_no}. Refresh sales after the customer completes the prompt.`);}
  catch(err){showNotice(err.message,true);}
});
$('#userForm').addEventListener('submit',async e=>{
  e.preventDefault();const f=new FormData(e.target),b=Object.fromEntries(f);
  try{await api('/api/users',{method:'POST',body:JSON.stringify(b)});e.target.reset();await refreshUsers();showNotice('Staff account created. Share the login securely.');}
  catch(err){showNotice(err.message,true);}
});
(async()=>{
  try{const d=await api('/api/auth/me');if(d.user){setLoggedIn(d.user);await refreshAll();}}
  catch(e){console.error(e);}
})();
