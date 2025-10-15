// docs/assets/app.js
import { auth, ensureSignedInAnon } from './firebase.js?v=6';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// === 從 Google 試算表載入商品（gviz JSON） ===
export let PRODUCTS = [];

export async function initProducts(SPREADSHEET_ID, SHEET_NAME = '商品') {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
  const txt = await fetch(url, { cache: 'no-store' }).then(r => r.text());
  const json = JSON.parse(txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  const cols = json.table.cols.map(c => c.label);
  const rows = json.table.rows || [];

  const list = rows.map(r => {
    const obj = {};
    r.c.forEach((cell, i) => obj[cols[i]] = cell ? cell.v : '');
    return {
      id: String(obj.id || '').trim(),
      title: String(obj.title || '').trim(),
      price: Number(obj.price || 0),
      origin: String(obj.origin||'').trim(),
      category: String(obj.category || '').trim() || '其他',
      isNew: String(obj.isNew || '').toUpperCase() === 'TRUE',
      stock: Number(obj.stock || 0),
      image: String(obj.image || '').trim(),
      isHidden: String(obj.isHidden || '').toUpperCase() === 'TRUE',
    };
  }).filter(p => p.id && !p.isHidden);

  PRODUCTS = list.length ? list : [
    { id:'p1', title:'L 字鑰匙圈', price:120, category:'周邊', isNew:true,  stock:99 },
    { id:'p2', title:'L Logo 貼紙包', price:80,  category:'周邊', isNew:false, stock:50 },
    { id:'p3', title:'Let’s Go 手幅', price:180, category:'演出', isNew:true,  stock:20 },
    { id:'p4', title:'應援手燈吊飾', price:220, category:'周邊', isNew:false, stock:0  },
  ];
}

// === 購物車（localStorage） ===
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

// === 最近瀏覽 ===
const RV_KEY = 'recentViewed';
export function pushRecent(pid){
  const now = Date.now();
  let arr = JSON.parse(localStorage.getItem(RV_KEY) || '[]');
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

// === 渲染卡片 ===
const fmt = n => Number(n || 0).toLocaleString('zh-Hant-TW');

// === 渲染卡片（長條樣式 + NEW 在標題後、兩顆按鈕並排）===
export function renderCards(container, products){
  

  container.innerHTML = (products||[]).map(p => `
    <div class="card row-card" data-pid="${p.id}">
      <a href="product.html?id=${encodeURIComponent(p.id)}">
        ${p.image
          ? `<img class="thumb" src="${p.image}" alt="${p.title}">`
          : `<div class="thumb" style="background:#f3f4f6"></div>`}
      </a>

      <div class="meta">
        <div class="title">
          ${p.title}
          ${p.isNew ? '<span class="badge new" style="margin-left:8px">NEW</span>' : ''}
        </div>
        <div class="sub">分類：${p.category||'其他'}　庫存：${p.stock ?? 0}</div>
        <div class="price">NT$ ${fmt(p.price)}</div>

        <div class="actions">
          <button class="btn" data-action="add" data-id="${p.id}" ${(p.stock??0)<=0?'disabled':''}>加入購物車</button>
          <a class="btn secondary" href="product.html?id=${encodeURIComponent(p.id)}">看一下</a>
        </div>
      </div>
    </div>
  `).join('');

  // 綁加入購物車（保持一次綁定）
  if (!container._bound) {
    container.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button[data-action="add"]');
      if(!btn) return;
      addToCartById(btn.dataset.id);
    });
    container._bound = true;
  }
}



// === 搜尋與分類 ===
export function filterProducts({ q='', cat, origin } = {}) {
  const kw = q.trim().toLowerCase();
  const allCat = !cat || cat === 'ALL' || cat === '全部分類';
  const allOrigin = !origin || origin === 'ALL';

  return PRODUCTS.filter(p => {
    const okCat = allCat || p.category === cat;
    const okOrigin = allOrigin || p.origin === origin;
    const okKw = !kw || p.title.toLowerCase().includes(kw);
    return okCat && okOrigin && okKw;
  });
}



// === 側拉面板 ===
// === 側拉面板 ===
export function setupDrawer(){
  const btn = document.getElementById('avatarBtn');
  const mask = document.getElementById('drawerMask');
  const drawer = document.getElementById('drawer');
  const close = () => { drawer.classList.remove('open'); mask.classList.remove('show'); };
  const open  = () => { drawer.classList.add('open');  mask.classList.add('show');  };
  btn?.addEventListener('click', open);
  mask?.addEventListener('click', close);

  const box = document.getElementById('drawerProfile');

  // 先確保匿名登入（有 UID 才能下單）
  ensureSignedInAnon().then(() => render());

  function render(){
    const u = auth.currentUser;
    const isAnon = !!u?.isAnonymous;
    const uid = u?.uid || 'guest';
    const emailShown = u?.email || (isAnon ? '匿名使用者' : '');

    box.innerHTML = `
      <div class="drawer-header">
        <div class="avatar">我</div>
        <div>
          <div><strong>${emailShown || '未登入'}</strong></div>
          <div class="small">UID：${uid.slice(0,8)}...</div>
        </div>
        <button id="drawerClose" class="btn secondary" style="margin-left:auto;padding:4px 8px">關閉</button>
      </div>
      <hr>
      <div class="small" style="margin-bottom:8px">${isAnon ? '目前為匿名狀態，可綁定 Email 以保存訂單' : '已登入'}</div>

      ${isAnon ? `
        <label>Email</label>
        <input id="email" class="input" placeholder="example@gmail.com" type="email" autocomplete="email">
        <label>密碼（至少 6 碼）</label>
        <input id="pw" class="input" placeholder="******" type="password" autocomplete="new-password">
        <div class="row" style="margin-top:8px">
          <button id="btnLink" class="btn">綁定（把匿名升級成 Email）</button>
          <button id="btnLogin" class="btn secondary">用 Email 直接登入</button>
        </div>
      ` : `
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <a href="order.html" class="btn secondary">我的訂單</a>
          <button id="btnLogout" class="btn secondary">登出</button>
        </div>
      `}

      <div style="margin-top:8px"><a href="admin.html" class="small">（管理員入口）</a></div>
    `;

    document.getElementById('drawerClose')?.addEventListener('click', close);

    // 匿名 → 綁定 Email
    document.getElementById('btnLink')?.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const pw    = document.getElementById('pw').value.trim();
      if(!email || pw.length<6){ alert('請輸入 Email 與至少 6 碼密碼'); return; }
      try {
        const cred = EmailAuthProvider.credential(email, pw);
        await linkWithCredential(auth.currentUser, cred);
        alert('綁定成功！已升級為 Email 帳號');
        render();
      } catch (e) {
        if (e?.code === 'auth/credential-already-in-use') {
          alert('這個 Email 已被使用，請改用「用 Email 直接登入」。');
        } else {
          alert('綁定失敗：' + (e?.message || e));
        }
      }
    });

    // 登入 / 註冊
    document.getElementById('btnLogin')?.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const pw    = document.getElementById('pw').value.trim();
      if(!email || pw.length<6){ alert('請輸入 Email 與至少 6 碼密碼'); return; }
      try {
        try {
          await signInWithEmailAndPassword(auth, email, pw);
        } catch {
          await createUserWithEmailAndPassword(auth, email, pw);
        }
        alert('登入完成！');
        render();
      } catch(e){
        alert('登入/註冊失敗：' + (e?.message || e));
      }
    });

    // 登出 → 回匿名
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
      await signOut(auth);
      await ensureSignedInAnon();
      alert('已登出');
      render();
    });
  }
}
