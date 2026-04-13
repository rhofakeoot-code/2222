import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const CONFIG = {
    IMGBB_API_KEY: "7fa910ddeffb3ce5937e0b4ff50246c8",
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyAPiiVfmJdGHje0gittK-7yFTYNTQNY6Fk",
        authDomain: "basjfk-58536.firebaseapp.com",
        projectId: "basjfk-58536",
        storageBucket: "basjfk-58536.firebasestorage.app",
        messagingSenderId: "662162908373",
        appId: "1:662162908373:web:b5a789fd0b6ca6964e2e5c"
    }
};

// تصفير البيانات المحلية للمتجر
const categories = [];
const products = [];

// التحقق من رمز الدخول
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

const app = initializeApp(CONFIG.FIREBASE_CONFIG);
const db = getFirestore(app);

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

async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    // استخدام الرابط الصحيح لإصلاح Failed to fetch
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${CONFIG.IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    if (data.success) {
        return { url: data.data.url, deleteUrl: data.data.delete_url };
    } else {
        throw new Error('فشل الرفع: ' + data.error.message);
    }
}

window.saveCategory = async () => {
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value;
    const file = document.getElementById('cat-img').files[0];

    if (!name) return alert('أدخل اسم القسم');
    const btn = document.getElementById('btn-save-cat');
    btn.innerText = 'جاري الرفع...';

    try {
        let updateData = { name };
        if (file) {
            const uploaded = await uploadToImgBB(file);
            updateData.images = [uploaded];
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
        const img = data.images ? data.images[0].url : '';
        list.innerHTML += `
            <div class="card-3d">
                <img src="${img}">
                <div class="card-title">${data.name}</div>
                <button class="btn-action edit" onclick="editCategory('${docSnap.id}', '${data.name}')">تعديل</button>
                <button class="btn-action delete" onclick="deleteDocItem('categories', '${docSnap.id}', '${data.images ? data.images[0].deleteUrl : ''}', loadCategories)">حذف</button>
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
    const internalFiles = document.getElementById('prod-img-internal').files;

    if (!name || !price) return alert('أكمل البيانات');
    const btn = document.getElementById('btn-save-prod');
    btn.innerText = 'جاري الحفظ...';

    try {
        let updateData = { name, category: cat, desc, price: Number(price) };
        
        if (mainFile) {
            updateData.mainImages = [await uploadToImgBB(mainFile)];
        }
        
        if (internalFiles.length > 0) {
            let internals = [];
            for(let f of internalFiles) internals.push(await uploadToImgBB(f));
            updateData.internalImages = internals;
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
                <img src="${data.mainImages ? data.mainImages[0].url : ''}">
                <div class="card-title">${data.name}</div>
                <div style="font-weight:bold; color:#FF6B6B;">${data.price} د.ع</div>
                <button class="btn-action edit" onclick="editProduct('${docSnap.id}', '${data.name}', '${data.category}', '${data.desc}', '${data.price}')">تعديل</button>
                <button class="btn-action delete" onclick="deleteDocItem('products', '${docSnap.id}', '${data.mainImages ? data.mainImages[0].deleteUrl : ''}', loadProducts)">حذف</button>
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
    btn.innerText = 'جاري الرفع...';
    try {
        for(let f of files) {
            const up = await uploadToImgBB(f);
            await addDoc(collection(db, "offers"), { image: up, createdAt: serverTimestamp() });
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
                <img src="${data.image.url}">
                <button class="btn-action delete" onclick="deleteDocItem('offers', '${docSnap.id}', '${data.image.deleteUrl}', loadOffers)">حذف</button>
            </div>
        `;
    });
};

window.saveBanner = async () => {
    const files = document.getElementById('banner-img').files;
    if (files.length === 0) return alert('اختر صور');
    const btn = document.getElementById('btn-save-banner');
    btn.innerText = 'جاري الرفع...';
    try {
        for(let f of files) {
            const up = await uploadToImgBB(f);
            await addDoc(collection(db, "banners"), { image: up, createdAt: serverTimestamp() });
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
                <img src="${data.image.url}">
                <button class="btn-action delete" onclick="deleteDocItem('banners', '${docSnap.id}', '${data.image.deleteUrl}', loadBanners)">حذف</button>
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
        let btns = `<button class="btn-action delete" onclick="deleteDocItem('orders', '${docSnap.id}', '', () => loadOrders('${status}'))">حذف</button>`;
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

window.deleteDocItem = async (col, id, delUrl, cb) => {
    if(!confirm('حذف؟')) return;
    try {
        if(delUrl) await fetch(delUrl).catch(() => {});
        await deleteDoc(doc(db, col, id));
        cb();
    } catch(e) { alert(e.message); }
};
