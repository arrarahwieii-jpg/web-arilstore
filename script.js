// KONFIGURASI ADMIN (PIN RAHASIA)
const ADMIN_PIN = "889988"; 

// URL TARGET REDIRECT
const LINK_TOPUP_DIAMOND = "https://link-web-topup-diamond-lo.com"; 
const LINK_TOKO_BUKU = "https://link-toko-buku-lo.com";

// STATE
const state = {
    userRole: 'guest', 
    selectedGame: '',
    isGameSelected: false,
    products: [
        { id: 1, category: 'ff', title: 'Cheat Free Fire - VIP', price: 'Rp 150.000', icon: '🔥' },
        { id: 2, category: 'ff', title: 'Cheat Free Fire - Pro', price: 'Rp 75.000', icon: '💎' },
        { id: 3, category: '8ball', title: 'Cheto 8Ball Pool - Autowin', price: 'Rp 100.000', icon: '🎱' },
        { id: 4, category: '8ball', title: 'Cheto 8Ball Pool - Longline', price: 'Rp 200.000', icon: '📏' }
    ]
};

// DOM ELEMENTS
const elements = {
    pages: document.querySelectorAll('.page'),
    videos: document.querySelectorAll('.bg-video'),
    loginPanel: document.getElementById('login-panel'),
    loadingFill: document.getElementById('loading-fill'),
    loadingText: document.getElementById('loading-text'),
    audioOverlay: document.getElementById('audio-unlock'),
    userDisplay: document.getElementById('user-display-name'),
    userBadge: document.getElementById('user-badge'),
    aiWidget: document.getElementById('ai-widget'),
    aiChat: document.getElementById('ai-chat'),
    aiInput: document.getElementById('ai-input'),
    productGrid: document.getElementById('product-grid')
};

// 1. AUDIO UNLOCK
window.unlockAudio = function() {
    elements.audioOverlay.classList.add('hidden');
    elements.videos.forEach(v => { v.muted = false; v.volume = 1.0; });
    nextPage('page-splash');
};

// 2. LOGIN & AUTH
window.openAdminLogin = function() {
    Swal.fire({
        title: 'Admin Access', text: 'Masukkan PIN Rahasia Anda:', input: 'password',
        showCancelButton: true, confirmButtonText: 'Masuk', confirmButtonColor: '#ff4d4d', cancelButtonColor: '#333',
        background: '#111', color: '#fff',
        inputValidator: (value) => { if (value !== ADMIN_PIN) return 'PIN Salah! Akses Ditolak.'; }
    }).then((result) => {
        if (result.isConfirmed) {
            state.userRole = 'admin';
            elements.userDisplay.innerText = 'Admin';
            elements.userBadge.classList.remove('hidden');
            elements.loginPanel.classList.add('hidden');
            Swal.fire({ icon: 'success', title: 'Akses Diterima', text: 'Selamat bekerja, Admin.', background: '#111', color: '#fff', timer: 1500, showConfirmButton: false });
            nextPage('page-catalog');
        }
    });
};

window.loginSimulasi = function(provider) {
    Swal.fire({ title: `Login ${provider}`, text: `Mengalihkan...`, icon: 'info', background: '#111', color: '#fff', timer: 1500, showConfirmButton: false })
    .then(() => {
        state.userRole = 'member';
        elements.userDisplay.innerText = `User (Member)`;
        elements.userBadge.classList.add('hidden');
        elements.loginPanel.classList.add('hidden');
        Swal.fire({ icon: 'success', title: 'Berhasil', text: `Login via ${provider} berhasil.`, background: '#111', color: '#fff', timer: 1500, showConfirmButton: false });
        nextPage('page-catalog');
    });
};

window.loginAsGuest = function() {
    state.userRole = 'member';
    elements.userDisplay.innerText = 'Tamu (Member)';
    elements.userBadge.classList.add('hidden');
    elements.loginPanel.classList.add('hidden');
    nextPage('page-catalog');
};

window.logout = function() {
    state.userRole = 'guest';
    elements.userDisplay.innerText = 'Developer Online';
    elements.userBadge.classList.add('hidden');
    nextPage('page-home');
};

window.checkAuthAndGoCatalog = function() {
    if (state.userRole === 'guest') elements.loginPanel.classList.remove('hidden');
    else nextPage('page-catalog');
};

// 3. NAVIGASI HALAMAN
window.nextPage = function(targetId) {
    elements.videos.forEach(v => { v.pause(); v.currentTime = 0; });
    elements.pages.forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });

    const target = document.getElementById(targetId);
    if (!target) return;
    target.style.display = 'flex';
    void target.offsetWidth; 
    target.classList.add('active');

    const vidId = targetId === 'page-splash' ? 'vid-splash' : targetId === 'page-home' ? 'vid-home' : targetId === 'page-catalog' ? 'vid-catalog' : null;
    if (vidId) {
        const vid = document.getElementById(vidId);
        vid.muted = false;
        vid.play().catch(() => { vid.muted = true; vid.play(); });
    }

    if (targetId === 'page-splash') startLoading();
    if (targetId === 'page-home') elements.loginPanel.classList.add('hidden');
    if (targetId === 'page-diamond') { state.isGameSelected = false; state.selectedGame = ''; }
    if (targetId === 'page-catalog') renderCatalog('all');
};

window.exitWeb = function() {
    Swal.fire({
        title: 'Keluar Web?', text: "Anda akan meninggalkan halaman ini.", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ff4d4d', cancelButtonColor: '#333',
        confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal', background: '#111', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) { window.close(); window.location.href = 'about:blank'; }
    });
};

function startLoading() {
    let progress = 0;
    elements.loadingFill.style.width = '0%';
    elements.loadingText.innerText = 'Loading 0%';
    
    const titleSplash = document.getElementById('title-splash');
    const btnNext = document.getElementById('btn-next-splash');
    const btnExit = document.getElementById('btn-exit');

    // Pastiin elemen ke-hide di awal
    titleSplash.classList.add('hidden'); 
    btnNext.classList.add('hidden'); 
    btnExit.classList.add('hidden');

    const interval = setInterval(() => {
        // Acak naikin progress biar kerasa natural
        progress += Math.floor(Math.random() * 15) + 5; 
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // FASE 1: Tunggu 0.5 detik, munculin judul
            setTimeout(() => {
                titleSplash.classList.remove('hidden');
            }, 500);
            
            // FASE 2: Tunggu 3 detik dari loading penuh, munculin tombol Next & Exit
            setTimeout(() => {
                btnNext.classList.remove('hidden');
                btnExit.classList.remove('hidden');
            }, 3000); // Ini yang bikin tombol nongolnya agak lama (sesuai request 2-3 detik)
        }
        
        elements.loadingFill.style.width = progress + '%';
        elements.loadingText.innerText = `Loading ${progress}%`;
    }, 150);
}

// ==========================================
// 4. KATALOG PRODUK & KERANJANG
// ==========================================
window.filterCategory = function(category, btnElement) {
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    renderCatalog(category);
};

function renderCatalog(categoryFilter = 'all') {
    if (!elements.productGrid) return;
    
    const filtered = state.products.filter(p => categoryFilter === 'all' || p.category === categoryFilter);
    
    if (filtered.length === 0) {
        elements.productGrid.innerHTML = `<p style="color:#aaa; grid-column: 1/-1; text-align:center;">Belum ada produk.</p>`;
        return;
    }

    elements.productGrid.innerHTML = filtered.map(product => `
        <div class="product-card" onclick="openDigitalModal('${product.title}')">
            <div class="product-image">${product.icon}</div>
            <div class="product-info">
                <div class="product-title">${product.title}</div>
                <div class="product-price">${product.price}</div>
            </div>
        </div>
    `).join('');
}

// PEMBELIAN LANGSUNG (TANPA KERANJANG)
window.openDigitalModal = function(productName) {
    Swal.fire({
        title: productName,
        text: "Produk ini dibeli langsung. Lanjutkan ke pembayaran?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4da6ff',
        cancelButtonColor: '#333',
        confirmButtonText: 'Beli Langsung',
        cancelButtonText: 'Batal',
        background: '#111', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Mengalihkan ke Pembayaran...',
                text: `Pesanan: ${productName}`,
                background: '#111', color: '#fff',
                timer: 1500, showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });
        }
    });
};

// MENU KERANJANG UTAMA (TOP UP / BUKU)
// GANTI FUNGSI openCartPanel() YANG LAMA DENGAN INI
window.openCartPanel = function() {
    // Tampilkan modal custom (bukan SweetAlert lagi)
    document.getElementById('cart-modal').classList.remove('hidden');
};

// TAMBAHKAN FUNGSI BARU INI UNTUK NUTUP MODAL KERANJANG
window.closeCartModal = function() {
    document.getElementById('cart-modal').classList.add('hidden');
};

// ==========================================
// 5. LOGIKA DIAMOND (HALAMAN 4)
// ==========================================
window.selectGame = function(gameName) {
    state.selectedGame = gameName;
    state.isGameSelected = true;
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${gameName} dipilih!`, showConfirmButton: false, timer: 1500, background: '#111', color: '#fff' });
};

window.goToDiamondWeb = function() {
    if (!state.isGameSelected) {
        Swal.fire({ icon: 'warning', title: 'Pilih Game Dulu', text: 'Silakan klik logo game yang ingin Anda top-up terlebih dahulu.', background: '#111', color: '#fff', confirmButtonColor: '#4da6ff' });
        return;
    }
    Swal.fire({ title: 'Mengalihkan...', html: `Membawa Anda ke web Top Up <b>${state.selectedGame}</b>`, background: '#111', color: '#fff', timer: 1500, showConfirmButton: false, didOpen: () => { Swal.showLoading(); } })
    .then(() => { window.open(LINK_TOPUP_DIAMOND, '_blank'); });
};

// ==========================================
// 6. LOGIKA BUKU (HALAMAN 5)
// ==========================================
window.goToBookWeb = function() {
    Swal.fire({ title: 'Mengalihkan...', html: `Membawa Anda ke web ARIL BOOKSTORE`, background: '#111', color: '#fff', timer: 1500, showConfirmButton: false, didOpen: () => { Swal.showLoading(); } })
    .then(() => { window.open(LINK_TOKO_BUKU, '_blank'); });
};

window.toggleAdminPanel = function() {
    if (state.userRole !== 'admin') {
        Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Hanya Admin/Developer.', background: '#111', color: '#fff' });
        return;
    }
    document.getElementById('admin-panel').classList.toggle('hidden');
};

// ==========================================
// 7. AI CUSTOMER SERVICE
// ==========================================
window.toggleAI = function() {
    elements.aiWidget.classList.toggle('hidden');
    if (!elements.aiWidget.classList.contains('hidden')) elements.aiInput.focus();
};

window.handleAIEnter = function(e) { if (e.key === 'Enter') sendAIMessage(); };

window.sendAIMessage = function() {
    const text = elements.aiInput.value.trim();
    if (!text) return;
    appendMessage(text, 'ai-user');
    elements.aiInput.value = '';
    setTimeout(() => {
        const reply = generateAIReply(text.toLowerCase());
        appendMessage(reply, 'ai-bot');
    }, 500);
};

function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `ai-msg ${className}`;
    div.innerText = text;
    elements.aiChat.appendChild(div);
    elements.aiChat.scrollTop = elements.aiChat.scrollHeight;
}

function generateAIReply(input) {
    if (input.includes('diamond') || input.includes('top up') || input.includes('game')) return "Untuk Top Up Diamond, silakan klik tombol Keranjang di kiri atas, lalu pilih 'Top Up Diamond'.";
    if (input.includes('buku') || input.includes('book')) return "Untuk membeli buku, silakan klik tombol Keranjang di kiri atas, lalu pilih 'Beli Buku'.";
    if (input.includes('cheat') || input.includes('mod') || input.includes('apk')) return "Produk Cheat/MOD bisa dibeli langsung dengan mengklik gambarnya di halaman Katalog. Tidak masuk keranjang.";
    if (input.includes('bayar') || input.includes('qris')) return "Pembayaran mendukung QRIS Otomatis (GoPay) dan Transfer Bank BSI.";
    return "Silakan hubungi WA/Telegram kami jika butuh bantuan lebih lanjut.";
}

// Render awal saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    renderCatalog('all');
});