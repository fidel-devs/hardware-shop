require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(express.json({limit:"1mb"}));
app.use(express.static(__dirname,));

const db = mysql.createPool({
  host:process.env.DB_HOST || "localhost",
  port:Number(process.env.DB_PORT || 3306),
  user:process.env.DB_USER || "root",
  password:process.env.DB_PASSWORD || "",
  database:process.env.DB_NAME || "hardware_shop",
  waitForConnections:true, connectionLimit:10, decimalNumbers:true
});
const text = (v,max=150) => typeof v==="string" ? v.trim().slice(0,max) : "";
const num = v => v==="" || v===null || v===undefined ? NaN : Number(v);
const moneyOK = n => Number.isFinite(n) && n>=0 && n<=999999999;
const qtyOK = n => Number.isInteger(n) && n>=0 && n<=100000000;
const fail = (res,msg,status=400) => res.status(status).json({error:msg});
const receipt = () => "HS-"+Date.now().toString(36).toUpperCase()+"-"+crypto.randomBytes(2).toString("hex").toUpperCase();

app.get("/api/health",async(req,res)=>{
 try { await db.query("SELECT 1"); res.json({status:"ok",database:"connected"}); }
 catch(e){res.status(503).json({status:"error",database:"unavailable"});}
});
app.get("/api/dashboard",async(req,res,next)=>{
 try{
  const [[p]]=await db.query("SELECT COUNT(*) productCount,COALESCE(SUM(quantity),0) totalUnits,COALESCE(SUM(quantity*purchase_price),0) stockCostValue,SUM(CASE WHEN quantity<=low_stock_level THEN 1 ELSE 0 END) lowStockCount FROM products");
  const [[s]]=await db.query("SELECT COUNT(*) salesCount,COALESCE(SUM(total),0) salesTotal FROM sales WHERE DATE(created_at)=CURDATE()");
  res.json({...p,...s});
 }catch(e){next(e);}
});
app.get("/api/products",async(req,res,next)=>{
 try{
  let sql="SELECT * FROM products WHERE 1=1", args=[];
  const search=text(req.query.search,100), category=text(req.query.category,100);
  if(search){sql+=" AND (name LIKE ? OR sku LIKE ? OR category LIKE ? OR supplier LIKE ?)";args.push(...Array(4).fill("%"+search+"%"));}
  if(category){sql+=" AND category=?";args.push(category);}
  if(req.query.lowStock==="true")sql+=" AND quantity<=low_stock_level";
  sql+=" ORDER BY name";
  const [rows]=await db.query(sql,args);res.json(rows);
 }catch(e){next(e);}
});
app.post("/api/products",async(req,res,next)=>{
 try{
  const name=text(req.body.name),sku=text(req.body.sku,50).toUpperCase(),category=text(req.body.category,100);
  const supplier=text(req.body.supplier,150)||null,purchase=num(req.body.purchase_price),selling=num(req.body.selling_price);
  const quantity=num(req.body.quantity),low=req.body.low_stock_level===undefined?5:num(req.body.low_stock_level);
  if(!name||!sku||!category)return fail(res,"Product name, SKU and category are required.");
  if(!moneyOK(purchase)||!moneyOK(selling))return fail(res,"Prices must be valid non-negative numbers.");
  if(!qtyOK(quantity)||!qtyOK(low))return fail(res,"Quantity and low-stock level must be whole numbers of zero or more.");
  const conn=await db.getConnection();
  try{
   await conn.beginTransaction();
   const [r]=await conn.query("INSERT INTO products(name,sku,category,supplier,purchase_price,selling_price,quantity,low_stock_level) VALUES(?,?,?,?,?,?,?,?)",[name,sku,category,supplier,purchase,selling,quantity,low]);
   if(quantity>0)await conn.query("INSERT INTO stock_movements(product_id,movement_type,quantity_change,note) VALUES(?,'opening',?,'Opening stock')",[r.insertId,quantity]);
   await conn.commit();
   const [rows]=await conn.query("SELECT * FROM products WHERE id=?",[r.insertId]);res.status(201).json(rows[0]);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 }catch(e){if(e.code==="ER_DUP_ENTRY")return fail(res,"That SKU already exists. Use a unique product code.",409);next(e);}
});
app.put("/api/products/:id",async(req,res,next)=>{
 const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return fail(res,"Invalid product ID.");
 try{
  const [oldRows]=await db.query("SELECT * FROM products WHERE id=?",[id]);if(!oldRows.length)return fail(res,"Product not found.",404);
  const old=oldRows[0], name=req.body.name===undefined?old.name:text(req.body.name),sku=req.body.sku===undefined?old.sku:text(req.body.sku,50).toUpperCase(),category=req.body.category===undefined?old.category:text(req.body.category,100);
  const supplier=req.body.supplier===undefined?old.supplier:(text(req.body.supplier,150)||null);
  const purchase=req.body.purchase_price===undefined?Number(old.purchase_price):num(req.body.purchase_price),selling=req.body.selling_price===undefined?Number(old.selling_price):num(req.body.selling_price);
  const quantity=req.body.quantity===undefined?Number(old.quantity):num(req.body.quantity),low=req.body.low_stock_level===undefined?Number(old.low_stock_level):num(req.body.low_stock_level);
  if(!name||!sku||!category)return fail(res,"Name, SKU and category are required.");
  if(!moneyOK(purchase)||!moneyOK(selling))return fail(res,"Prices cannot be negative.");
  if(!qtyOK(quantity)||!qtyOK(low))return fail(res,"Quantity and low-stock level must be whole numbers of zero or more.");
  const diff=quantity-Number(old.quantity);
  await db.query("UPDATE products SET name=?,sku=?,category=?,supplier=?,purchase_price=?,selling_price=?,quantity=?,low_stock_level=? WHERE id=?",[name,sku,category,supplier,purchase,selling,quantity,low,id]);
  if(diff)await db.query("INSERT INTO stock_movements(product_id,movement_type,quantity_change,note) VALUES(?,'adjustment',?,'Manual stock adjustment')",[id,diff]);
  const [rows]=await db.query("SELECT * FROM products WHERE id=?",[id]);res.json(rows[0]);
 }catch(e){if(e.code==="ER_DUP_ENTRY")return fail(res,"That SKU already exists.",409);next(e);}
});
app.delete("/api/products/:id",async(req,res,next)=>{
 try{
  const id=Number(req.params.id);const [[n]]=await db.query("SELECT COUNT(*) n FROM sale_items WHERE product_id=?",[id]);
  if(n.n)return fail(res,"This product has sales history. Set its quantity to zero instead of deleting it.",409);
  const [r]=await db.query("DELETE FROM products WHERE id=?",[id]);if(!r.affectedRows)return fail(res,"Product not found.",404);
  res.json({message:"Product deleted."});
 }catch(e){next(e);}
});
app.get("/api/sales",async(req,res,next)=>{
 try{const [rows]=await db.query("SELECT * FROM sales ORDER BY created_at DESC LIMIT 100");res.json(rows);}catch(e){next(e);}
});
app.post("/api/sales",async(req,res,next)=>{
 const items=req.body.items;
 if(!Array.isArray(items)||!items.length)return fail(res,"Add at least one item to the sale.");
 const method=text(req.body.payment_method,20)||"cash";
 if(!["cash","mpesa","bank","credit","other"].includes(method))return fail(res,"Invalid payment method.");
 const normalized=[];
 for(const i of items){const id=num(i.product_id),q=num(i.quantity);if(!Number.isInteger(id)||id<1||!Number.isInteger(q)||q<1)return fail(res,"Each sale item needs a product and positive whole-number quantity.");normalized.push({id,q});}
 const conn=await db.getConnection();
 try{
  await conn.beginTransaction();let total=0;const lines=[];
  for(const item of normalized){
   const [rows]=await conn.query("SELECT * FROM products WHERE id=? FOR UPDATE",[item.id]);
   if(!rows.length)throw Object.assign(new Error("Selected product not found."),{status:400});
   const p=rows[0];if(Number(p.quantity)<item.q)throw Object.assign(new Error(`Not enough stock for ${p.name}. Available: ${p.quantity}.`),{status:400});
   const price=Number(p.selling_price),line=Math.round(price*item.q*100)/100;total+=line;lines.push({p,q:item.q,price,line});
  }
  total=Math.round(total*100)/100;const rec=receipt();
  const [sale]=await conn.query("INSERT INTO sales(receipt_number,customer_name,customer_phone,total,payment_method) VALUES(?,?,?,?,?)",[rec,text(req.body.customer_name)||null,text(req.body.customer_phone,30)||null,total,method]);
  for(const l of lines){
   await conn.query("INSERT INTO sale_items(sale_id,product_id,product_name,sku,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?)",[sale.insertId,l.p.id,l.p.name,l.p.sku,l.q,l.price,l.line]);
   await conn.query("UPDATE products SET quantity=quantity-? WHERE id=?",[l.q,l.p.id]);
   await conn.query("INSERT INTO stock_movements(product_id,movement_type,quantity_change,note,reference_id) VALUES(?,'sale',?,?,?)",[l.p.id,-l.q,"Sale "+rec,sale.insertId]);
  }
  await conn.commit();res.status(201).json({id:sale.insertId,receipt_number:rec,total,payment_method:method,items:lines.map(l=>({name:l.p.name,sku:l.p.sku,quantity:l.q,unit_price:l.price,line_total:l.line}))});
 }catch(e){await conn.rollback();if(e.status)return fail(res,e.message,e.status);next(e);}finally{conn.release();}
});
app.get("/api/deposits",async(req,res,next)=>{
 try{const [rows]=await db.query("SELECT *,agreed_amount-amount_paid AS balance FROM customer_deposits ORDER BY created_at DESC");res.json(rows);}catch(e){next(e);}
});
app.post("/api/deposits",async(req,res,next)=>{
 try{
  const name=text(req.body.customer_name),phone=text(req.body.customer_phone,30)||null,item=text(req.body.item_description,255);
  const agreed=num(req.body.agreed_amount),paid=req.body.initial_payment===""||req.body.initial_payment===undefined?0:num(req.body.initial_payment);
  const method=text(req.body.payment_method,20)||"cash";
  if(!name||!item)return fail(res,"Customer name and item description are required.");
  if(!Number.isFinite(agreed)||agreed<=0||!Number.isFinite(paid)||paid<0||paid>agreed)return fail(res,"Check the agreed amount and initial payment.");
  if(!["cash","mpesa","bank","other"].includes(method))return fail(res,"Invalid payment method.");
  const conn=await db.getConnection();
  try{
   await conn.beginTransaction();
   const [r]=await conn.query("INSERT INTO customer_deposits(customer_name,customer_phone,item_description,agreed_amount,amount_paid,notes) VALUES(?,?,?,?,?,?)",[name,phone,item,agreed,paid,text(req.body.notes,2000)||null]);
   if(paid>0)await conn.query("INSERT INTO deposit_payments(deposit_id,amount,payment_method) VALUES(?,?,?)",[r.insertId,paid,method]);
   await conn.commit();const [rows]=await conn.query("SELECT *,agreed_amount-amount_paid AS balance FROM customer_deposits WHERE id=?",[r.insertId]);res.status(201).json(rows[0]);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 }catch(e){next(e);}
});
app.post("/api/deposits/:id/payments",async(req,res,next)=>{
 const id=Number(req.params.id),amount=num(req.body.amount),method=text(req.body.payment_method,20)||"cash";
 if(!Number.isInteger(id)||id<1||!Number.isFinite(amount)||amount<=0)return fail(res,"Enter a valid deposit and payment amount.");
 if(!["cash","mpesa","bank","other"].includes(method))return fail(res,"Invalid payment method.");
 const conn=await db.getConnection();
 try{
  await conn.beginTransaction();const [rows]=await conn.query("SELECT * FROM customer_deposits WHERE id=? FOR UPDATE",[id]);
  if(!rows.length)throw Object.assign(new Error("Deposit not found."),{status:404});
  const d=rows[0],balance=Number(d.agreed_amount)-Number(d.amount_paid);
  if(d.status!=="active")throw Object.assign(new Error("Only active deposits can receive payments."),{status:400});
  if(amount>balance)throw Object.assign(new Error(`Payment exceeds remaining balance of KSh ${balance.toFixed(2)}.`),{status:400});
  await conn.query("INSERT INTO deposit_payments(deposit_id,amount,payment_method,reference_code) VALUES(?,?,?,?)",[id,amount,method,text(req.body.reference_code,100)||null]);
  await conn.query("UPDATE customer_deposits SET amount_paid=amount_paid+? WHERE id=?",[amount,id]);await conn.commit();
  const [updated]=await conn.query("SELECT *,agreed_amount-amount_paid AS balance FROM customer_deposits WHERE id=?",[id]);res.json(updated[0]);
 }catch(e){await conn.rollback();if(e.status)return fail(res,e.message,e.status);next(e);}finally{conn.release();}
});
app.patch("/api/deposits/:id/status",async(req,res,next)=>{
 const status=text(req.body.status,20);if(!["active","collected","cancelled"].includes(status))return fail(res,"Invalid status.");
 try{const [r]=await db.query("UPDATE customer_deposits SET status=? WHERE id=?",[status,Number(req.params.id)]);if(!r.affectedRows)return fail(res,"Deposit not found.",404);const [rows]=await db.query("SELECT *,agreed_amount-amount_paid AS balance FROM customer_deposits WHERE id=?",[Number(req.params.id)]);res.json(rows[0]);}catch(e){next(e);}
});
app.use("/api",(req,res)=>res.status(404).json({error:"API route not found."}));
app.use((err,req,res,next)=>{console.error("API error:",err);if(res.headersSent)return next(err);res.status(500).json({error:"Server error. Check the terminal for details."});});
(async()=>{
 try{await db.query("SELECT 1");console.log("MySQL database connected.");app.listen(PORT,"0.0.0.0",()=>console.log(`Hardware shop server running at http://localhost:${PORT}`));}
 catch(e){console.error("Cannot connect to MySQL. Check MySQL is running and .env settings.");console.error(e.message);process.exit(1);}
})();
