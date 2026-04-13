import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const CONFIG = {
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyAPiiVfmJdGHje0gittK-7yFTYNTQNY6Fk",
        authDomain: "basjfk-58536.firebaseapp.com",
        projectId: "basjfk-58536",
        storageBucket: "basjfk-58536.firebasestorage.app",
        messagingSenderId: "662162908373",
        appId: "1:662162908373:web:b5a789fd0b6ca6964e2e5c"
    }
};

const app = initializeApp(CONFIG.FIREBASE_CONFIG);
const db = getFirestore(app);

// دالة ضغط الصورة وتحويلها إلى Base64 بنسبة 50%
async function compressAndEncodeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // ضغط الصورة بنسبة 50% (0.5)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                resolve(dataUrl);
            };
        };
        reader.onerror = error => reject(error);
    });
}

window.verifyAdmin = () => {
    const pass = document.getElementById('admin-pass').value;
    if (pass === '1001') {
        document.getElementById('login-overlay').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('app-content').style.display = 'flex';
            loadOrders('pending');
        }, 500);
    } else {
        alert('رمز الدخول غير صحيح!');
    }
};

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if(tabId === 'categories') loadCategories();
    if(tabId === 'products') { loadCategoriesForSelect(); loadProducts(); }
    if(tabId === 'offers') loadOffers();
    if(tabId === 'banners') loadBanners();
    if(tabId === 'orders') loadOrders('pending');
    if(tabId === 'accepted-orders') loadOrders('accepted');
};

window.saveCategory = async () => {
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value;
    const file = document.getElementById('cat-img').files[0];

    if (!name) return alert('أدخل اسم القسم');
    const btn = document.getElementById('btn-save-cat');
    btn.innerText = 'جاري المعالجة...';

    try {
        let updateData = { name };
        if (file) {
            const base64Img = await compressAndEncodeImage(file);
            updateData.image = base64Img;
        }

        if (id) {
            await updateDoc(doc(db, "categories", id), updateData);
        } else {
            if (!file) throw new Error('اختر صورة للقسم الجديد');
            await addDoc(collection(db, "categories"), { ...updateData, createdAt: serverTimestamp() });
        }

        document.getElementById('cat-id').value = '';
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-img').value = '';
        btn.innerHTML = 'حفظ القسم <i class="fa-solid fa-save"></i>';
        loadCategories();
    } catch (e) {
        alert(e.message);
        btn.innerHTML = 'حفظ القسم <i class="fa-solid fa-save"></i>';
    }
};

window.loadCategories = async () => {
    const list = document.getElementById('categories-list');
    list.innerHTML = 'جاري التحميل...';
    const snapshot = await getDocs(collection(db, "categories"));
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.innerHTML += `
            <div class="card-3d">
                <img src="${data.image || ''}">
                <div class="card-title">${data.name}</div>
                <button class="btn-action edit" onclick="editCategory('${docSnap.id}', '${data.name}')">تعديل</button>
                <button class="btn-action delete" onclick="deleteDocItem('categories', '${docSnap.id}', null, loadCategories)">حذف</button>
            </div>
        `;
    });
};

window.editCategory = (id, name) => {
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-name').value = name;
    document.getElementById('btn-save-cat').innerText = 'تحديث القسم';
};

window.loadCategoriesForSelect = async () => {
    const select = document.getElementById('prod-cat');
    select.innerHTML = '<option value="">اختر القسم</option>';
    const snapshot = await getDocs(collection(db, "categories"));
    snapshot.forEach(docSnap => {
        select.innerHTML += `<option value="${docSnap.data().name}">${docSnap.data().name}</option>`;
    });
};

window.saveProduct = async () => {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const cat = document.getElementById('prod-cat').value;
    const desc = document.getElementById('prod-desc').value;
    const price = document.getElementById('prod-price').value;
    const mainFile = document.getElementById('prod-img-main').files[0];

    if (!name || !price) return alert('أكمل البيانات');
    const btn = document.getElementById('btn-save-prod');
    btn.innerText = 'جاري الحفظ...';

    try {
        let updateData = { name, category: cat, desc, price: Number(price) };
        
        if (mainFile) {
            updateData.image = await compressAndEncodeImage(mainFile);
        }

        if (id) {
            await updateDoc(doc(db, "products", id), updateData);
        } else {
            await addDoc(collection(db, "products"), { ...updateData, createdAt: serverTimestamp() });
        }

        alert('تم بنجاح');
        switchTab('products');
        btn.innerHTML = 'حفظ المنتج <i class="fa-solid fa-save"></i>';
    } catch (e) {
        alert(e.message);
        btn.innerHTML = 'حفظ المنتج <i class="fa-solid fa-save"></i>';
    }
};

window.loadProducts = async () => {
    const list = document.getElementById('products-list');
    list.innerHTML = 'جاري التحميل...';
    const snapshot = await getDocs(collection(db, "products"));
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.innerHTML += `
            <div class="card-3d">
                <img src="${data.image || ''}">
                <div class="card-title">${data.name}</div>
                <div style="font-weight:bold; color:#FF6B6B;">${data.price} د.ع</div>
                <button class="btn-action edit" onclick="editProduct('${docSnap.id}', '${data.name}', '${data.category}', '${data.desc}', '${data.price}')">تعديل</button>
                <button class="btn-action delete" onclick="deleteDocItem('products', '${docSnap.id}', null, loadProducts)">حذف</button>
            </div>
        `;
    });
};

window.editProduct = (id, name, cat, desc, price) => {
    document.getElementById('prod-id').value = id;
    document.getElementById('prod-name').value = name;
    document.getElementById('prod-cat').value = cat;
    document.getElementById('prod-desc').value = desc;
    document.getElementById('prod-price').value = price;
    document.getElementById('btn-save-prod').innerText = 'تحديث المنتج';
};

window.saveOffer = async () => {
    const files = document.getElementById('offer-img').files;
    if (files.length === 0) return alert('اختر صور');
    const btn = document.getElementById('btn-save-offer');
    btn.innerText = 'جاري المعالجة...';
    try {
        for(let f of files) {
            const base64Img = await compressAndEncodeImage(f);
            await addDoc(collection(db, "offers"), { image: base64Img, createdAt: serverTimestamp() });
        }
        alert('تم الحفظ');
        loadOffers();
    } catch(e) { alert(e.message); }
    btn.innerHTML = 'حفظ العرض <i class="fa-solid fa-save"></i>';
};

window.loadOffers = async () => {
    const list = document.getElementById('offers-list');
    list.innerHTML = 'جاري التحميل...';
    const snapshot = await getDocs(collection(db, "offers"));
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.innerHTML += `
            <div class="card-3d">
                <img src="${data.image}">
                <button class="btn-action delete" onclick="deleteDocItem('offers', '${docSnap.id}', null, loadOffers)">حذف</button>
            </div>
        `;
    });
};

window.saveBanner = async () => {
    const files = document.getElementById('banner-img').files;
    if (files.length === 0) return alert('اختر صور');
    const btn = document.getElementById('btn-save-banner');
    btn.innerText = 'جاري المعالجة...';
    try {
        for(let f of files) {
            const base64Img = await compressAndEncodeImage(f);
            await addDoc(collection(db, "banners"), { image: base64Img, createdAt: serverTimestamp() });
        }
        alert('تم الحفظ');
        loadBanners();
    } catch(e) { alert(e.message); }
    btn.innerHTML = 'حفظ البنر <i class="fa-solid fa-save"></i>';
};

window.loadBanners = async () => {
    const list = document.getElementById('banners-list');
    list.innerHTML = 'جاري التحميل...';
    const snapshot = await getDocs(collection(db, "banners"));
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.innerHTML += `
            <div class="card-3d">
                <img src="${data.image}">
                <button class="btn-action delete" onclick="deleteDocItem('banners', '${docSnap.id}', null, loadBanners)">حذف</button>
            </div>
        `;
    });
};

window.loadOrders = async (status) => {
    const list = document.getElementById(status === 'pending' ? 'orders-list' : 'accepted-orders-list');
    list.innerHTML = 'جاري التحميل...';
    const q = query(collection(db, "orders"), where("status", "==", status));
    const snapshot = await getDocs(q);
    list.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        let btns = `<button class="btn-action delete" onclick="deleteDocItem('orders', '${docSnap.id}', null, () => loadOrders('${status}'))">حذف</button>`;
        if (status === 'pending') btns = `<button class="btn-action accept" onclick="acceptOrder('${docSnap.id}')">قبول</button>` + btns;
        list.innerHTML += `
            <div class="card-3d">
                <div class="card-title">طلب رقم: ${docSnap.id.slice(0,5)}</div>
                <div style="color:#555;">الاسم: ${data.name}</div>
                <div style="font-weight:bold;">${data.total} د.ع</div>
                <div style="margin-top:10px;">${btns}</div>
            </div>
        `;
    });
};

window.acceptOrder = async (id) => {
    await updateDoc(doc(db, "orders", id), { status: 'accepted' });
    loadOrders('pending');
};

window.deleteDocItem = async (col, id, unused, cb) => {
    if(!confirm('حذف؟')) return;
    try {
        await deleteDoc(doc(db, col, id));
        cb();
    } catch(e) { alert(e.message); }
};
