// docs/assets/app.js（首頁功能邏輯，含註解）
import { auth, ensureSignedInAnon } from './firebase.js?v=2';


/** 模擬產品資料（可日後改 Firestore） */
export const PRODUCTS = [
  { id:'p1', title:'L 字鑰匙圈', price:120, category:'周邊', isNew:true },
  { id:'p2', title:'L Logo 貼紙包', price:80, category:'周邊', isNew:false },
  { id:'p3', title:'Let’s Go 手幅', price:180, category:'演出', isNew:true },
  { id:'p4', title:'應援手燈吊飾', price:220, category:'周邊', isNew:false },
];

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
  container.addEventListener('click', ev=>{
    const btn = ev.target.closest('button[data-action]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if(action==='add'){ addToCartById(id); }
    if(action==='view'){ pushRecent(id); alert('已記錄最近瀏覽：' + id); }
  }, { once:true });
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
