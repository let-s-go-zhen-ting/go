// docs/assets/app.js（首頁功能邏輯，含註解）
import { auth, ensureSignedInAnon } from './firebase.js?v=6';


// === 從 Google 試算表載入商品（gviz JSON） ===
export let PRODUCTS = [];

export async function initProducts(SPREADSHEET_ID, SHEET_NAME = '商品') {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
  const txt = await fetch(url, { cache: 'no-store' }).then(r => r.text());
  // gviz 會包一層：/**/google.visualization.Query.setResponse({...})
  const json = JSON.parse(txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  const cols = json.table.cols.map(c => c.label); // ['id','title','price'...]
  const rows = json.table.rows || [];

  // 轉陣列物件
  const list = rows.map(r => {
    const obj = {};
    r.c.forEach((cell, i) => obj[cols[i]] = cell ? cell.v : '');
    return {
      id: String(obj.id || '').trim(),
      title: String(obj.title || '').trim(),
      price: Number(obj.price || 0),
      category: String(obj.category || '').trim() || '其他',
      isNew: String(obj.isNew || '').toUpperCase() === 'TRUE',
      stock: Number(obj.stock || 0),
      image: String(obj.image || '').trim(),
      isHidden: String(obj.isHidden || '').toUpperCase() === 'TRUE',
    };
  }).filter(p => p.id && !p.isHidden);

  // 設定全域 PRODUCTS
  PRODUCTS = list;
}


// 購物車：localStorage 簡單實作
export function getCart(){ return JSON.parse(localStorage.getItem('cart')||'[]'); }
export function setCart(c){
  localStorage.setItem('cart', JSON.stringify(c));
  const el = document.getElementById('cartCount');
  if(el) el.textContent = c.reduce((s,i)=>s+i.qty,0);
}
export function addToCartById(pid){
  const p = PRODUCTS.find(x=>x.id===pid);
  if(!p) return;
  const cart = getCart();
  const i = cart.findIndex(x=>x.id===p.id);
  if(i>=0){ cart[i].qty += 1; } else { cart.push({id:p.id,title:p.title,price:p.price,qty:1}); }
  setCart(cart);
  alert('已加入購物車');
}

// 最近瀏覽：存 {id, at}，只保留最新 10 筆
const RV_KEY = 'recentViewed';
export function pushRecent(pid){
  const now = Date.now();
  let arr = JSON.parse(localStorage.getItem(RV_KEY) || '[]'); // [{id, at}]
  arr = arr.filter(x=>x.id !== pid);
  arr.unshift({ id: pid, at: now });
  arr = arr.slice(0, 10);
  localStorage.setItem(RV_KEY, JSON.stringify(arr));
}
export function getRecent(){
  const arr = JSON.parse(localStorage.getItem(RV_KEY) || '[]');
  const ids = arr.map(x=>x.id);
  const map = new Map(PRODUCTS.map(p=>[p.id,p]));
  return ids.map(id=>map.get(id)).filter(Boolean);
}

// 渲染卡片
export function renderCards(container, products){
  container.innerHTML = products.map(p => `
    <div class="card" data-pid="${p.id}">
      <div class="row" style="justify-content:space-between">
        <strong>${p.title}</strong>
        ${p.isNew ? '<span class="badge new">NEW</span>' : ''}
      </div>
      <div>分類：${p.category}</div>
      <div>NT$ ${p.price}</div>
      <div class="row">
        <button class="btn" data-action="add" data-id="${p.id}">加入購物車</button>
        <button class="btn secondary" data-action="view" data-id="${p.id}">看一下</button>
      </div>
    </div>
  `).join('');

  // 只綁一次事件，不用 { once:true }
  if (!container._bound) {
    container.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button[data-action]');
      if(!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if(action==='add'){ addToCartById(id); }
      if(action==='view'){ pushRecent(id); alert('已記錄最近瀏覽：' + id); }
    });
    container._bound = true;
  }
}


// 搜尋與分類
export function filterProducts({q='', cat='ALL'}={}){
  const kw = q.trim().toLowerCase();
  return PRODUCTS.filter(p => {
    const okCat = (cat==='ALL') || (p.category===cat);
    const okKw = !kw || (p.title.toLowerCase().includes(kw));
    return okCat && okKw;
  });
}

// 側拉面板
export function setupDrawer(){
  const btn = document.getElementById('avatarBtn');
  const mask = document.getElementById('drawerMask');
  const drawer = document.getElementById('drawer');
  const close = () => { drawer.classList.remove('open'); mask.classList.remove('show'); };
  const open  = () => { drawer.classList.add('open');  mask.classList.add('show');  };
  btn?.addEventListener('click', open);
  mask?.addEventListener('click', close);

  // --- 保底內容（就算 Firebase 還沒成功也有東西看） ---
  const box = document.getElementById('drawerProfile');
  if (box) {
    box.innerHTML = `
      <div class="drawer-header">
        <div class="avatar">我</div>
        <div>
          <div><strong>訪客</strong></div>
          <div class="small">尚未載入使用者</div>
        </div>
        <button id="drawerClose" class="btn secondary" style="margin-left:auto;padding:4px 8px">關閉</button>
      </div>
      <hr>
      <div><a href="order.html" class="btn secondary">我的訂單</a></div>
      <div style="margin-top:8px"><a href="admin.html" class="small">（管理員入口）</a></div>
    `;
    document.getElementById('drawerClose')?.addEventListener('click', close);
  }

  // --- 之後再嘗試匿名登入，成功就把真實資料覆蓋上去 ---
  ensureSignedInAnon()
    .then(() => {
      const u = auth.currentUser;
      const uid = u?.uid || 'guest';
      const email = u?.email || '匿名使用者';
      if (box) {
        box.innerHTML = `
          <div class="drawer-header">
            <div class="avatar">我</div>
            <div>
              <div><strong>${email}</strong></div>
              <div class="small">UID：${uid.slice(0,8)}...</div>
            </div>
            <button id="drawerClose" class="btn secondary" style="margin-left:auto;padding:4px 8px">關閉</button>
          </div>
          <hr>
          <div><a href="order.html" class="btn secondary">我的訂單</a></div>
          <div style="margin-top:8px"><a href="admin.html" class="small">（管理員入口）</a></div>
        `;
        document.getElementById('drawerClose')?.addEventListener('click', close);
      }
    })
    .catch(() => {
      // 失敗就保留保底內容即可
    });
}
