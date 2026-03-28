/* ════════════════════════════════════════════════
   CONFIG & STATE
═══════════════════════════════════════════════ */
const BASE_URL   = "";
let activeFilter = 'all';
let currentPage  = 0;
let wished       = new Set();
let toastTimer;
let currentCart  = null;

// ✅ Token header helper
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": "Bearer " + token } : {})
  };
}

/* ════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── HARDCODED REVIEWS ───────────────────────── */
const reviews = [
  { name:"Sarah M.",  dog:"Golden Retriever, 3 yrs",
    text:"My golden literally runs to her bowl now. Total game changer!",
    product:"Salmon & Sweet Potato",  stars:5, avatar:"👩" },
  { name:"James K.",  dog:"Labrador, 5 yrs",
    text:"Our lab's digestion improved within a week. He loves every bite.",
    product:"Chicken & Brown Rice",   stars:5, avatar:"👨" },
  { name:"Priya L.",  dog:"French Bulldog, 2 yrs",
    text:"Not a single allergy flare-up since switching. Miracle formula!",
    product:"Wagyu Beef Gourmet",     stars:5, avatar:"👩🏽" },
  { name:"Tom H.",    dog:"Border Collie Pup, 4 mo",
    text:"Vet is amazed at his development. Healthy weight, sharp eyes!",
    product:"Puppy Power Bites",      stars:5, avatar:"👨🏻" },
  { name:"Maria G.",  dog:"Dachshund, 8 yrs",
    text:"Senior Vitality Blend made a visible difference in mobility.",
    product:"Senior Vitality Blend",  stars:4, avatar:"👩🏻" },
  { name:"Derek W.",  dog:"Siberian Husky, 2 yrs",
    text:"Our husky finishes every single time. Fast shipping too!",
    product:"Turkey & Quinoa Bowl",   stars:5, avatar:"🧔" },
];

/* ════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════ */
function checkAuth() {
  const username = localStorage.getItem("username");
  const authBtn  = document.getElementById("authBtn");
  const nameEl   = document.getElementById("navUsername");

  if (username) {
    authBtn.textContent  = "Logout";
    nameEl.textContent   = "👋 " + username;
    nameEl.style.display = "inline";
  } else {
    authBtn.textContent  = "Login";
    nameEl.style.display = "none";
  }
}

async function logout() {
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method:      "POST",
      headers:     authHeaders(),
      credentials: "include"
    });
  } catch(e) {}

  localStorage.removeItem("username");
  localStorage.removeItem("email");
  localStorage.removeItem("roles");
  localStorage.removeItem("token");
  location.reload();
}

document.getElementById("authBtn").addEventListener("click", () => {
  if (localStorage.getItem("username")) {
    logout();
  } else {
    window.location.href = "login.html";
  }
});

/* ════════════════════════════════════════════════
   PRODUCTS
═══════════════════════════════════════════════ */
async function fetchProducts(page = 0, size = 8,
                              sortBy = "productId") {
  showProductsLoading(true);
  try {
    const res  = await fetch(
      `${BASE_URL}/api/public/products?page=${page}` +
      `&size=${size}&sortBy=${sortBy}`,
      { credentials: "include" }
    );
    const data = await res.json();
    renderProducts(data.products);
    renderPagination(data.totalPages, data.pageNumber);
    currentPage = data.pageNumber;
  } catch(e) {
    document.getElementById("productsGrid").innerHTML =
      `<div style="text-align:center;color:#999;padding:2rem;">
         ⚠️ Could not load products. Is the server running?
       </div>`;
  } finally {
    showProductsLoading(false);
  }
}

async function searchProducts(keyword) {
  if (!keyword.trim()) {
    fetchProducts();
    return;
  }
  showProductsLoading(true);
  try {
    const res  = await fetch(
      `${BASE_URL}/api/public/products/search` +
      `?keyword=${keyword}&page=0&size=8`,
      { credentials: "include" }
    );
    const data = await res.json();
    renderProducts(data.products);
    renderPagination(data.totalPages, data.pageNumber);
  } catch(e) {
    showToast("⚠️ Search failed!");
  } finally {
    showProductsLoading(false);
  }
}

function showProductsLoading(show) {
  const loading = document.getElementById("productsLoading");
  const grid    = document.getElementById("productsGrid");
  if (loading) loading.style.display = show ? "block" : "none";
  if (grid)    grid.style.display    = show ? "none"  : "grid";
}

/* ── Render Products ─────────────────────────── */
function getDiscount(mrp, sp) {
  if (!mrp || !sp || mrp <= sp) return 0;
  return Math.round(((mrp - sp) / mrp) * 100);
}

function renderProducts(products) {
  const grid = document.getElementById("productsGrid");

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center;padding:3rem;
                  grid-column:1/-1;color:#999;">
        <div style="font-size:3rem;">🐾</div>
        <div style="margin-top:.5rem;">No products found</div>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const mrp  = p.mrp  || p.price || 0;
    const sp   = p.specialPrice || p.price || 0;
    const disc = getDiscount(mrp, sp);
    return `
    <div class="product-card" data-id="${p.productId}"
         style="cursor:pointer;"
         onclick="window.location.href='product-detail.html?id=${p.productId}'">
      <div class="product-img" style="position:relative;">
        <button class="product-wishlist
          ${wished.has(p.productId) ? 'loved' : ''}"
                onclick="event.stopPropagation();toggleWish(${p.productId}, this)">
          ${wished.has(p.productId) ? '❤️' : '🤍'}
        </button>
        ${disc > 0
          ? `<span style="position:absolute;top:10px;left:10px;background:#e53935;color:white;font-size:.7rem;font-weight:700;padding:.25rem .6rem;border-radius:20px;z-index:2;">${disc}% OFF</span>`
          : ''}
        ${p.imageUrl
          ? `<img
               src="${p.imageUrl}"
               alt="${p.name}"
               style="width:100%;height:160px;
                      object-fit:cover;border-radius:12px;"
               onerror="this.style.display='none';
                 document.getElementById('emoji-${p.productId}')
                 .style.display='flex';"
             />
             <div id="emoji-${p.productId}"
                  style="display:none;font-size:5rem;
                         height:160px;align-items:center;
                         justify-content:center;">
               🐾
             </div>`
          : `<div style="font-size:5rem;height:160px;
                         display:flex;align-items:center;
                         justify-content:center;">
               🐾
             </div>`
        }
      </div>
      <div class="product-body">
        <div class="product-meta">
          ${p.categoryName || ''} • Stock: ${p.quantity}
        </div>
        <div class="product-name">${p.name}</div>
        <div style="font-size:.82rem;color:#999;margin:.3rem 0;">
          ${p.description ? p.description.substring(0,60) + '...' : ''}
        </div>
        <div class="product-price-row">
          <div>
            ${disc > 0 ? `
              <div style="font-size:.78rem;color:#999;text-decoration:line-through;">MRP: ₹${mrp.toFixed(2)}</div>
              <div class="product-price" style="color:#F4823A;font-size:1.1rem;font-weight:700;">₹${sp.toFixed(2)}</div>
            ` : `
              <div class="product-price">₹${sp.toFixed(2)}</div>
            `}
          </div>
          <button class="btn-add-cart"
                  id="btn-${p.productId}"
                  onclick="event.stopPropagation();addToCart(${p.productId}, this)"
                  ${p.quantity <= 0
                    ? 'disabled style="opacity:.5;cursor:not-allowed"'
                    : ''}>
            ${p.quantity <= 0 ? 'Out of Stock' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  `}).join('');
}

/* ── Pagination ──────────────────────────────── */
function renderPagination(totalPages, currentPage) {
  const container = document.getElementById("pagination");
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  for (let i = 0; i < totalPages; i++) {
    html += `
      <button onclick="fetchProducts(${i})"
        style="
          padding:.4rem .8rem;
          border-radius:8px;
          border:1.5px solid ${i === currentPage
            ? '#F4823A' : '#e0d5cc'};
          background:${i === currentPage ? '#F4823A' : 'white'};
          color:${i === currentPage ? 'white' : '#4A2C17'};
          cursor:pointer;font-weight:600;">
        ${i + 1}
      </button>`;
  }
  container.innerHTML = html;
}

/* ── Filter ──────────────────────────────────── */
function filterProducts(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn')
          .forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (filter === 'all') {
    fetchProducts(0);
  } else {
    searchProducts(filter);
  }

  document.getElementById('shop')
          .scrollIntoView({ behavior: 'smooth' });
}

/* ════════════════════════════════════════════════
   CART
═══════════════════════════════════════════════ */
async function addToCart(productId, btn) {
  if (!localStorage.getItem("username")) {
    showToast("⚠️ Please login to add items!");
    setTimeout(() => window.location.href = "login.html", 1500);
    return;
  }

  btn.disabled    = true;
  btn.textContent = "Adding...";

  try {
    const res = await fetch(
      // ✅ Correct backend URL: /api/cart/add/{productId}
      `${BASE_URL}/api/cart/add/${productId}`,
      {
        method:      "POST",
        headers:     authHeaders(),
        credentials: "include"
      }
    );

    if (res.ok) {
      const cart = await res.json();
      updateCartUI(cart);
      showToast("🛒 Added to cart!");
      btn.textContent = "✓ Added";
      setTimeout(() => {
        btn.textContent = "+ Add";
        btn.disabled    = false;
      }, 1800);
    } else if (res.status === 401) {
      showToast("⚠️ Please login first!");
      window.location.href = "login.html";
      btn.disabled    = false;
      btn.textContent = "+ Add";
    } else {
      const text = await res.text();
      showToast("❌ " + (text || "Could not add to cart"));
      btn.disabled    = false;
      btn.textContent = "+ Add";
    }
  } catch(e) {
    showToast("❌ Server error!");
    btn.disabled    = false;
    btn.textContent = "+ Add";
  }
}

async function fetchCart() {
  if (!localStorage.getItem("username")) return;
  try {
    // ✅ Correct backend URL: /api/cart
    const res = await fetch(`${BASE_URL}/api/cart`, {
      headers:     authHeaders(),
      credentials: "include"
    });
    if (res.ok) {
      const cart = await res.json();
      updateCartUI(cart);
    }
  } catch(e) {}
}

async function removeFromCart(cartItemId) {
  try {
    // ✅ Correct: DELETE /api/cart/remove/{cartItemId}
    const res = await fetch(
      `${BASE_URL}/api/cart/remove/${cartItemId}`,
      {
        method:      "DELETE",
        headers:     authHeaders(),
        credentials: "include"
      }
    );
    if (res.ok) {
      const cart = await res.json();
      updateCartUI(cart);
      showToast("🗑️ Removed from cart");
    }
  } catch(e) {
    showToast("❌ Could not remove item");
  }
}

async function updateQuantity(cartItemId, newQty) {
  if (newQty <= 0) {
    removeFromCart(cartItemId);
    return;
  }
  try {
    // ✅ Correct: PUT /api/cart/update/{cartItemId}?quantity=N
    const res = await fetch(
      `${BASE_URL}/api/cart/update/${cartItemId}?quantity=${newQty}`,
      {
        method:      "PUT",
        headers:     authHeaders(),
        credentials: "include"
      }
    );
    if (res.ok) {
      const cart = await res.json();
      updateCartUI(cart);
    } else {
      const text = await res.text();
      showToast("❌ " + text);
    }
  } catch(e) {
    showToast("❌ Could not update quantity");
  }
}

// ✅ SIRF EK updateCartUI
function updateCartUI(cart) {
  currentCart = cart;

  const list   = document.getElementById("cartItemsList");
  const footer = document.getElementById("cartFooter");
  const badge  = document.getElementById("cartCount");

  // ✅ Backend returns {cartId, products:[...], totalPrice}
  // products field mein each item: {productId, productName, image, quantity, price}
  const items = cart.products || cart.items || [];
  const totalItems = items.reduce((s, i) => s + (i.quantity || 0), 0);
  badge.textContent = totalItems;

  if (items.length === 0) {
    list.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <div>Your cart is empty</div>
        <div style="font-size:.82rem;margin-top:.4rem;color:#999;">
          Add some yummy food for your pup!
        </div>
      </div>`;
    footer.style.display = "none";
    return;
  }

  // ✅ Use items[] from above, backend uses 'image' field (not imageUrl)
  list.innerHTML = items.map(i => {
    const imgSrc  = i.image || i.imageUrl;
    const price   = i.price  || 0;
    const qty     = i.quantity || 1;
    const subtotal = price * qty;
    return `
    <div class="cart-item">
      <div class="cart-item-img">
        ${imgSrc
          ? `<img src="${imgSrc}"
                  alt="${i.productName}"
                  style="width:50px;height:50px;
                         object-fit:cover;border-radius:8px;"
                  onerror="this.style.display='none'"/>`
          : `<div style="font-size:2rem;">🐾</div>`
        }
      </div>

      <div style="flex:1;">
        <div class="cart-item-name">${i.productName}</div>
        <div class="cart-item-price">
          ₹${subtotal.toFixed(2)}
        </div>
        <div style="font-size:.8rem;color:#999;
                    margin-bottom:.4rem;">
          ₹${price.toFixed(2)} each
        </div>

        <!-- +- Quantity Controls -->
        <div style="display:flex;align-items:center;gap:.5rem;">
          <button
            onclick="updateQuantity(${i.cartItemId},
                     ${qty - 1})"
            style="width:28px;height:28px;border-radius:50%;
                   border:1.5px solid #e0d5cc;background:white;
                   font-size:1rem;cursor:pointer;display:flex;
                   align-items:center;justify-content:center;
                   color:#4A2C17;font-weight:700;transition:all .2s;"
            onmouseover="this.style.background='#F4823A';
                         this.style.color='white';
                         this.style.border='1.5px solid #F4823A'"
            onmouseout="this.style.background='white';
                        this.style.color='#4A2C17';
                        this.style.border='1.5px solid #e0d5cc'"
          >−</button>

          <span style="font-weight:700;font-size:1rem;
                       color:#4A2C17;min-width:24px;
                       text-align:center;">
            ${qty}
          </span>

          <button
            onclick="updateQuantity(${i.cartItemId},
                     ${qty + 1})"
            style="width:28px;height:28px;border-radius:50%;
                   border:1.5px solid #e0d5cc;background:white;
                   font-size:1rem;cursor:pointer;display:flex;
                   align-items:center;justify-content:center;
                   color:#4A2C17;font-weight:700;transition:all .2s;"
            onmouseover="this.style.background='#F4823A';
                         this.style.color='white';
                         this.style.border='1.5px solid #F4823A'"
            onmouseout="this.style.background='white';
                        this.style.color='#4A2C17';
                        this.style.border='1.5px solid #e0d5cc'"
          >+</button>
        </div>
      </div>

      <button class="cart-item-remove"
              onclick="removeFromCart(${i.cartItemId})"
              title="Remove item">✕</button>
    </div>
  `;
  }).join('');

  document.getElementById("cartTotal").textContent =
    `₹${(cart.totalPrice || 0).toFixed(2)}`;
  footer.style.display = "block";
}

/* ════════════════════════════════════════════════
   PAYMENT MODAL
═══════════════════════════════════════════════ */
function openPaymentModal() {
  if (!localStorage.getItem("username")) {
    showToast("⚠️ Please login first!");
    window.location.href = "login.html";
    return;
  }

  if (!currentCart || !(currentCart.products || currentCart.items)
      || (currentCart.products || currentCart.items || []).length === 0) {
    showToast("⚠️ Your cart is empty!");
    return;
  }

  // ✅ Summary populate karo
  const summary = document.getElementById("modalSummary");
  summary.innerHTML = `
    ${currentCart.items.map(i => `
      <div class="modal-summary-item">
        <span>${i.productName} × ${i.quantity}</span>
        <span>₹${i.subtotal.toFixed(2)}</span>
      </div>
    `).join('')}
    <div class="modal-summary-item">
      <span>Total</span>
      <span>₹${currentCart.totalPrice.toFixed(2)}</span>
    </div>
  `;

  // ✅ Address fields clear karo
  ['delName','delPhone','delAddress',
   'delCity','delState','delPincode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const errEl = document.getElementById("addressError");
  if (errEl) errEl.textContent = '';

  document.getElementById("paymentOverlay")
          .classList.add("open");
  toggleCart();
}

function closePaymentModal() {
  document.getElementById("paymentOverlay")
          .classList.remove("open");
}

function closeSuccessModal() {
  document.getElementById("successOverlay")
          .classList.remove("open");
  fetchProducts();
}

/* ════════════════════════════════════════════════
   CONFIRM ORDER — Address + Razorpay
═══════════════════════════════════════════════ */
async function confirmOrder() {
  const btn = document.getElementById("placeOrderBtn");
  const paymentMethod = document.querySelector(
    'input[name="payMethod"]:checked').value;

  // ✅ Address fields read karo
  const delName    = document.getElementById("delName")
                             .value.trim();
  const delPhone   = document.getElementById("delPhone")
                             .value.trim();
  const delAddress = document.getElementById("delAddress")
                             .value.trim();
  const delCity    = document.getElementById("delCity")
                             .value.trim();
  const delState   = document.getElementById("delState")
                             .value.trim();
  const delPincode = document.getElementById("delPincode")
                             .value.trim();
  const addressErr = document.getElementById("addressError");

  // ✅ Validate karo
  addressErr.textContent = "";

  if (!delName || !delPhone || !delAddress ||
      !delCity || !delState || !delPincode) {
    addressErr.textContent =
      "⚠️ Please fill all address fields!";
    return;
  }

  if (!/^\d{10}$/.test(delPhone)) {
    addressErr.textContent =
      "⚠️ Phone number must be 10 digits!";
    return;
  }

  if (!/^\d{6}$/.test(delPincode)) {
    addressErr.textContent =
      "⚠️ Pincode must be 6 digits!";
    return;
  }

  btn.disabled    = true;
  btn.textContent = "Processing...";

  try {
    // ✅ Step 1 — Razorpay order create karo
    const orderRes = await fetch(
      `${BASE_URL}/api/payment/create-order`,
      {
        method:      "POST",
        headers:     authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          amount: currentCart.totalPrice
        })
      }
    );

    const orderData = await orderRes.json();

    // ✅ Step 2 — Razorpay Checkout
    const options = {
      key:         orderData.keyId,
      amount:      orderData.amount,
      currency:    "INR",
      name:        "Doggy Diet India 🐾",
      description: "Premium Dog Food Order",
      order_id:    orderData.orderId,

      handler: async function(response) {

        // ✅ Step 3 — Verify karo
        const verifyRes = await fetch(
          `${BASE_URL}/api/payment/verify`,
          {
            method:      "POST",
            headers:     authHeaders(),
            credentials: "include",
            body: JSON.stringify({
              razorpay_order_id:
                response.razorpay_order_id,
              razorpay_payment_id:
                response.razorpay_payment_id,
              razorpay_signature:
                response.razorpay_signature
            })
          }
        );

        const verifyData = await verifyRes.json();

        if (verifyData.status === "SUCCESS") {

          // ✅ Step 4 — Order place karo with address
          const placeRes = await fetch(
            `${BASE_URL}/api/orders/place`,
            {
              method:      "POST",
              headers:     authHeaders(),
              credentials: "include",
              body: JSON.stringify({
                paymentMethod:   paymentMethod,
                deliveryName:    delName,
                deliveryPhone:   delPhone,
                deliveryAddress: delAddress,
                deliveryCity:    delCity,
                deliveryState:   delState,
                deliveryPincode: delPincode
              })
            }
          );

          const placeData = await placeRes.json();
          closePaymentModal();

          // ✅ Success Modal
          document.getElementById("successMsg")
            .textContent =
            `Payment of ₹${currentCart.totalPrice
              .toFixed(2)} successful!`;
          document.getElementById("successOrderId")
            .textContent =
            `Order #${placeData.orderId} confirmed 🐾\n` +
            `Delivering to: ${delCity}, ${delState} - ` +
            `${delPincode}`;
          document.getElementById("successOverlay")
            .classList.add("open");

          fetchCart();
          fetchProducts();

        } else {
          showToast("❌ Payment verification failed!");
        }
      },

      prefill: {
        name:    delName,
        email:   localStorage.getItem("email") || "",
        contact: delPhone
      },

      theme: { color: "#F4823A" },

      modal: {
        ondismiss: function() {
          showToast("⚠️ Payment cancelled!");
          btn.disabled    = false;
          btn.textContent = "🎉 Place Order";
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
    closePaymentModal();

  } catch(e) {
    console.error("Payment error:", e);
    showToast("❌ Payment failed! Try again.");
    btn.disabled    = false;
    btn.textContent = "🎉 Place Order";
  }
}

/* ════════════════════════════════════════════════
   WISHLIST
═══════════════════════════════════════════════ */
function toggleWish(id, btn) {
  if (wished.has(id)) {
    wished.delete(id);
    btn.textContent = '🤍';
    btn.classList.remove('loved');
    showToast('💔 Removed from wishlist');
  } else {
    wished.add(id);
    btn.textContent = '❤️';
    btn.classList.add('loved');
    showToast('❤️ Added to wishlist!');
  }
}

/* ════════════════════════════════════════════════
   REVIEWS
═══════════════════════════════════════════════ */
function renderReviews() {
  const el = document.getElementById('reviewsGrid');
  if (!el) return; // not on this page
  el.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="reviewer">
          <div class="reviewer-avatar">${r.avatar}</div>
          <div>
            <div class="reviewer-name">${r.name}</div>
            <div class="reviewer-dog">🐕 ${r.dog}</div>
          </div>
        </div>
        <div class="review-stars">
          ${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}
        </div>
        <div class="review-text">${r.text}</div>
        <div class="review-product">
          Purchased: ${r.product}
        </div>
      </div>
    `).join('');
}

/* ════════════════════════════════════════════════
   CART TOGGLE
═══════════════════════════════════════════════ */
function toggleCart() {
  document.getElementById('cartPanel')
          .classList.toggle('open');
  document.getElementById('cartOverlay')
          .classList.toggle('open');
}

/* ════════════════════════════════════════════════
   NEWSLETTER
═══════════════════════════════════════════════ */
function subscribeEmail() {
  const v = document.getElementById('emailInput')
                    .value.trim();
  if (!v || !v.includes('@')) {
    showToast('⚠️ Please enter a valid email');
    return;
  }
  document.getElementById('emailInput').value = '';
  showToast("🎉 You're subscribed! Check your email for 10% off.");
}

/* ════════════════════════════════════════════════
   MOBILE MENU
═══════════════════════════════════════════════ */
function closeMobile() {
  document.getElementById('mobileMenu')
          .classList.remove('open');
}

/* ════════════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════════ */
document.getElementById('cartBtn')
        .addEventListener('click', toggleCart);

document.getElementById('hamburgerBtn')
        .addEventListener('click', () => {
          document.getElementById('mobileMenu')
                  .classList.add('open');
        });

document.getElementById('mobileClose')
        .addEventListener('click', closeMobile);

window.addEventListener('scroll', () => {
  document.getElementById('mainNav')
          .classList.toggle('scrolled', scrollY > 30);
});

/* ════════════════════════════════════════════════
   INIT — only run on pages where elements exist
═══════════════════════════════════════════════ */
checkAuth();
fetchCart();
if (document.getElementById('productsGrid')) fetchProducts();
if (document.getElementById('reviewsGrid'))  renderReviews();
