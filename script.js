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

const pass = prompt('الرجاء إدخال الرمز:');
if (pass !== '1001') {
    document.body.innerHTML = '<h1 style="color:white; text-align:center; margin-top:20vh; text-shadow:2px 2px 5px #000;">غير مصرح الدخول</h1>';
    throw new Error('Unauthorized');
} else {
    document.getElementById('app-content').style.display = 'flex';
}

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

async function compressImage(file, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
        };
        img.onerror = error => reject(error);
    });
}

async function uploadToImgBB(file) {
    const compressedBlob = await compressImage(file, 0.7);
    const formData = new FormData();
    formData.append('image', compressedBlob, 'image.jpg');
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${CONFIG.IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
    });
    const data = await response.json();
    if (data.success) {
        return { url: data.data.url, deleteUrl: data.data.delete_url };
    } else {
        throw new Error('فشل الرفع');
    }
}

async function deleteFromImgBB(deleteUrl) {
    if (deleteUrl) {
        try { await fetch(deleteUrl); } catch (e) { console.log(e); }
    }
}

window.saveCategory = async () => {
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value;
    const files = document.getElementById('cat-img').files;

    if (!name) return alert('الرجاء إدخال اسم القسم');
    
    const btn = document.getElementById('btn-save-cat');
    btn.innerText = 'جاري الحفظ...';

    try {
        let imgUrls = [];
        if (files.length > 0) {
            for(let file of files) {
                const uploaded = await uploadToImgBB(file);
                imgUrls.push(uploaded);
            }
        }

        if (id) {
            let updateData = { name };
            if (imgUrls.length > 0) updateData.images = imgUrls;
            await updateDoc(doc(db, "categories", id), updateData);
            alert('تم التعديل');
        } else {
            if (imgUrls.length === 0) return alert('الرجاء رفع صورة');
            await addDoc(collection(db, "categories"), { name, images: imgUrls, createdAt: serverTimestamp() });
            alert('تم الحفظ');
        }

        document.getElementById('cat-id').value = '';
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-img').value = '';
        btn.innerHTML = 'حفظ القسم <i class="fa-solid fa-save"></i>';
        loadCategories();
    } catch (error) {
        alert(error.message);
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
        const img = data.images && data.images[0] ? data.images[0].url : '';
        const id = docSnap.id;
        list.innerHTML += `
            <div class="card-3d">
                <img src="${img}">
                <div class="card-title">${data.name}</div>
                <div>
                    <button class="btn-action edit" onclick="editCategory('${id}', '${data.name}')">تعديل <i class="fa-solid fa-pen"></i></button>
                    <button class="btn-action delete" onclick="deleteDocItem('categories', '${id}', '${data.images ? data.images[0].deleteUrl : ''}', loadCategories)">حذف <i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
};

window.editCategory = (id, name) => {
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-name').value = name;
    document.getElementById('btn-save-cat').innerHTML = 'تحديث القسم <i class="fa-solid fa-pen"></i>';
    window.scrollTo(0, 0);
};

window.loadCategoriesForSelect = async () => {
    const select = document.getElementById('prod-cat');
    select.innerHTML = '<option value="">اختر القسم</option>';
    const snapshot = await getDocs(collection(db, "categories"));
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        select.innerHTML += `<option value="${data.name}">${data.name}</option>`;
    });
};

window.saveProduct = async () => {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const cat = document.getElementById('prod-cat').value;
    const desc = document.getElementById('prod-desc').value;
    const price = document.getElementById('prod-price').value;
    const mainFiles = document.getElementById('prod-img-main').files;
    const internalFiles = document.getElementById('prod-img-internal').files;

    if (!name || !cat || !desc || !price) return alert('الرجاء إدخال كافة التفاصيل');

    const btn = document.getElementById('btn-save-prod');
    btn.innerText = 'جاري الحفظ...';

    try {
        let mainImgs = [];
        let internalImgs = [];

        if (mainFiles.length > 0) {
            for(let f of mainFiles) mainImgs.push(await uploadToImgBB(f));
        }
        if (internalFiles.length > 0) {
            for(let f of internalFiles) internalImgs.push(await uploadToImgBB(f));
        }

        if (id) {
            let updateData = { name, category: cat, desc, price: Number(price) };
            if (mainImgs.length > 0) updateData.mainImages = mainImgs;
            if (internalImgs.length > 0) updateData.internalImages = internalImgs;
            await updateDoc(doc(db, "products", id), updateData);
            alert('تم التعديل');
        } else {
            if (mainImgs.length === 0 || internalImgs.length === 0) return alert('الرجاء رفع جميع الصور المطلوبة');
            await addDoc(collection(db, "products"), { name, category: cat, desc, price: Number(price), mainImages: mainImgs, internalImages: internalImgs, createdAt: serverTimestamp() });
            alert('تم الحفظ');
        }

        document.getElementById('prod-id').value = '';
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-cat').value = '';
        document.getElementById('prod-desc').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-img-main').value = '';
        document.getElementById('prod-img-internal').value = '';
        btn.innerHTML = 'حفظ المنتج <i class="fa-solid fa-save"></i>';
        loadProducts();
    } catch (error) {
        alert(error.message);
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
        const img = data.mainImages && data.mainImages[0] ? data.mainImages[0].url : '';
        const delUrl = data.mainImages && data.mainImages[0] ? data.mainImages[0].deleteUrl : '';
        const id = docSnap.id;
        list.innerHTML += `
            <div class="card-3d">
                <img src="${img}">
                <div class="card-title">${data.name}</div>
                <div style="color:#555; font-weight:bold;">${data.price} د.ع - ${data.category}</div>
                <div>
                    <button class="btn-action edit" onclick="editProduct('${id}', '${data.name}', '${data.category}', '${data.desc}', '${data.price}')">تعديل <i class="fa-solid fa-pen"></i></button>
                    <button class="btn-action delete" onclick="deleteDocItem('products', '${id}', '${delUrl}', loadProducts)">حذف <i class="fa-solid fa-trash"></i></button>
                </div>
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
    document.getElementById('btn-save-prod').innerHTML = 'تحديث المنتج <i class="fa-solid fa-pen"></i>';
    window.scrollTo(0, 0);
};

window.saveOffer = async () => {
    const files = document.getElementById('offer-img').files;
    if (files.length === 0) return alert('الرجاء اختيار صورة العرض');
    const btn = document.getElementById('btn-save-offer');
    btn.innerText = 'جاري الحفظ...';
    try {
        for(let file of files) {
            const uploaded = await uploadToImgBB(file);
            await addDoc(collection(db, "offers"), { image: uploaded, createdAt: serverTimestamp() });
        }
        alert('تم حفظ العروض');
        document.getElementById('offer-img').value = '';
        btn.innerHTML = 'حفظ العرض <i class="fa-solid fa-save"></i>';
        loadOffers();
    } catch(e) {
        alert(e.message);
        btn.innerHTML = 'حفظ العرض <i class="fa-solid fa-save"></i>';
    }
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
                <button class="btn-action delete" style="margin-top:10px;" onclick="deleteDocItem('offers', '${docSnap.id}', '${data.image.deleteUrl}', loadOffers)">حذف العرض <i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
};

window.saveBanner = async () => {
    const files = document.getElementById('banner-img').files;
    if (files.length === 0) return alert('الرجاء اختيار صورة للبنر');
    const btn = document.getElementById('btn-save-banner');
    btn.innerText = 'جاري الحفظ...';
    try {
        for(let file of files) {
            const uploaded = await uploadToImgBB(file);
            await addDoc(collection(db, "banners"), { image: uploaded, createdAt: serverTimestamp() });
        }
        alert('تم حفظ البنرات');
        document.getElementById('banner-img').value = '';
        btn.innerHTML = 'حفظ البنر <i class="fa-solid fa-save"></i>';
        loadBanners();
    } catch(e) {
        alert(e.message);
        btn.innerHTML = 'حفظ البنر <i class="fa-solid fa-save"></i>';
    }
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
                <button class="btn-action delete" style="margin-top:10px;" onclick="deleteDocItem('banners', '${docSnap.id}', '${data.image.deleteUrl}', loadBanners)">حذف البنر <i class="fa-solid fa-trash"></i></button>
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
        let btns = `<button class="btn-action delete" onclick="deleteDocItem('orders', '${docSnap.id}', '', () => loadOrders('${status}'))">حذف <i class="fa-solid fa-trash"></i></button>`;
        if (status === 'pending') {
            btns = `<button class="btn-action accept" onclick="acceptOrder('${docSnap.id}')">قبول الطلب <i class="fa-solid fa-check"></i></button>` + btns;
        }
        list.innerHTML += `
            <div class="card-3d">
                <div class="card-title">الطلب: ${docSnap.id}</div>
                <div style="color:#555;">الاسم: ${data.name || 'غير محدد'}</div>
                <div style="color:#555;">السعر الإجمالي: ${data.total || 0} د.ع</div>
                <div style="margin-top:10px;">${btns}</div>
            </div>
        `;
    });
};

window.acceptOrder = async (id) => {
    if(!confirm('قبول الطلب؟')) return;
    await updateDoc(doc(db, "orders", id), { status: 'accepted' });
    loadOrders('pending');
};

window.deleteDocItem = async (col, id, deleteUrl, callback) => {
    if(!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
        if(deleteUrl) await deleteFromImgBB(deleteUrl);
        await deleteDoc(doc(db, col, id));
        callback();
    } catch (e) {
        alert(e.message);
    }
};

window.onload = () => {
    loadOrders('pending');
};
