// --- Diwan Command Center - Unified Logic ---

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
let ws;
let reconnectDelay = 1000;
let wsHeartbeat;

function connectWebSocket() {
    ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/dashboard`);
    
    ws.onopen = () => {
        reconnectDelay = 1000;
        wsHeartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const currentEventId = localStorage.getItem('diwan_active_event_id') || 1;
        
        if (data.type === 'update' || data.type === 'stats_update') {
            // Only update if it's the current event
            const dataEventId = data.event_id ? data.event_id.toString() : "1";
            const currentIdStr = currentEventId.toString();
            
            if (dataEventId !== currentIdStr) {
                console.log(`Ignoring update for event ${dataEventId} (Current: ${currentIdStr})`);
                return;
            }
            
            if (data.stats) {
                refreshAdminStats(data);
                // Also update analytics if the tab is active
                const activePane = document.querySelector('.pane.active');
                if (activePane && activePane.id === 'pane-analytics' && typeof loadAnalytics === 'function') {
                    loadAnalytics();
                }
            } else {
                refreshAdminStats();
            }
            
            if (data.participant) {
                addAdminFeedItem(data.participant);
                showToast(data.participant);
            }
        } else if (data.type === 'new_question' || data.type === 'question_updated') {
            refreshAdminStats();
            if (typeof loadQuestions === 'function') loadQuestions();
        } else if (data.type === 'badges_ready') {
            const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
            const dict = adminTranslations[lang] || {};
            alert(dict['تم تجهيز الشارات بنجاح!'] || 'تم تجهيز الشارات بنجاح!');
            window.open(data.url, '_blank');
            const btn = document.getElementById('btn-generate-badges-v2');
            if(btn) btn.innerHTML = `<i class="fas fa-id-badge"></i> ${dict['توليد جميع الشارات'] || 'توليد جميع الشارات'}`;
        } else if (data.type === 'badges_error') {
            const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
            const dict = adminTranslations[lang] || {};
            alert((dict['حدث خطأ أثناء توليد الشارات:'] || 'حدث خطأ أثناء توليد الشارات:') + ' ' + data.message);
            const btn = document.getElementById('btn-generate-badges-v2');
            if(btn) btn.innerHTML = `<i class="fas fa-id-badge"></i> ${dict['توليد جميع الشارات'] || 'توليد جميع الشارات'}`;
        }
    };
    
    ws.onclose = () => {
        clearInterval(wsHeartbeat);
        setTimeout(connectWebSocket, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    };
    
    ws.onerror = () => {
        ws.close();
    };
}

connectWebSocket();

// --- Toast Notification System ---
function showToast(p) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const isOut = p.event_type === 'check_out';
    const toast = document.createElement('div');
    toast.className = 'toast' + (isOut ? ' toast-out' : '');
    toast.innerHTML = `
        <div class="toast-icon">${isOut ? '👋' : '✅'}</div>
        <div class="toast-body">
            <div class="toast-name">${p.name}</div>
            <div class="toast-detail">${p.council || ''}</div>
        </div>
        <div class="toast-time">${p.time || new Date().toLocaleTimeString('ar-DZ')}</div>
    `;
    container.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4200);
    
    // Limit visible toasts
    while (container.children.length > 4) container.removeChild(container.firstChild);
}

function showSimpleToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') toast.style.borderRight = '4px solid var(--danger)';
    toast.innerHTML = `
        <div class="toast-icon">${type === 'success' ? '✨' : '❌'}</div>
        <div class="toast-body">
            <div class="toast-name">${message}</div>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

function addAdminFeedItem(p, append = false) {
    const feed = document.getElementById('admin-live-feed');
    if (!feed) return;
    
    // Remove empty state message if exists
    if (feed.children.length === 1 && feed.children[0].getAttribute('data-i18n')) {
        feed.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'feed-item';
    const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
    const dict = adminTranslations[lang] || {};
    
    const timeStr = p.time || (p.check_in_time ? new Date(p.check_in_time).toLocaleTimeString('ar-DZ') : new Date().toLocaleTimeString('ar-DZ'));
    const isOut = p.event_type === 'check_out';

    item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; padding: 10px; border-bottom: 1px solid var(--glass-border);">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 35px; height: 35px; border-radius: 50%; background: ${isOut ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; display: flex; align-items: center; justify-content: center; color: ${isOut ? '#dc2626' : '#10b981'};">
                    ${isOut ? '<svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M377.9 105.9L469.1 197.1c12.5 12.5 12.5 32.8 0 45.3l-91.2 91.2c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L362.7 256l-202.7 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l202.7 0L332.7 151.2c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0zM32 96C14.3 96 0 110.3 0 128V384c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V160h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H32z"/></svg>' : '<svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M217.9 105.9L340.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L217.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1L32 320c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM352 416l64 0c17.7 0 32-14.3 32-32l0-256c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c53 0 96 43 96 96l0 256c0 53-43 96-96 96l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/></svg>'}
                </div>
                <div>
                    <div style="font-weight: 700; color: var(--gold); font-size: 0.95rem;">${p.name}</div>
                    <div style="font-size: 0.75rem; opacity: 0.6;">${p.council || ''}</div>
                </div>
            </div>
            <div style="text-align: left;">
                <div style="font-size: 0.7rem; opacity: 0.5; margin-bottom: 4px;">${timeStr}</div>
                <span class="badge" style="background: ${isOut ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${isOut ? '#ef4444' : '#10b981'}; font-size: 0.7rem; border: 1px solid currentColor;">
                    ${isOut ? (dict['خروج'] || 'خروج') : (dict['دخول'] || 'دخول')}
                </span>
            </div>
        </div>
    `;
    
    if (append) {
        feed.appendChild(item);
    } else {
        feed.prepend(item);
    }
    
    if (feed.children.length > 30) feed.removeChild(feed.lastChild);
}

async function initAdminHistory() {
    try {
        const res = await fetch('/api/admin/history');
        const history = await res.json();
        const feed = document.getElementById('admin-live-feed');
        if (!feed) return;
        
        if (history.length > 0) {
            feed.innerHTML = '';
            history.forEach(item => {
                addAdminFeedItem(item, true); // append=true because history is DESC
            });
        }
    } catch (e) {
        console.error("Failed to load history:", e);
    }
}

async function refreshAdminStats(statsData = null) {
    try {
        let root;
        if (statsData) {
            root = statsData;
        } else {
            const response = await fetch('/api/stats');
            root = await response.json();
        }
        
        const s = root.stats;
        if (!s) return;
        
        if (document.getElementById('stat-present')) document.getElementById('stat-present').innerText = s.present;
        const pEl = document.getElementById('stat-percent');
        if (pEl) pEl.innerText = (s.percentage || 0) + '%';
        if (document.getElementById('stat-questions')) document.getElementById('stat-questions').innerText = s.questions_count || root.questions_count || 0;
        if (document.getElementById('stat-quorum')) document.getElementById('stat-quorum').innerText = `${s.present}/${s.quorum}`;
        if (document.getElementById('stat-plabel')) document.getElementById('stat-plabel').innerText = s.participant_label || 'مشارك';
        
        // Dynamic brand
        if (document.getElementById('brand-name')) document.getElementById('brand-name').innerText = s.app_name || 'ديوان';
        if (document.getElementById('brand-subtitle')) document.getElementById('brand-subtitle').innerText = s.app_subtitle || 'منصة تسيير الفعاليات';
        document.title = (s.app_name || 'ديوان') + ' | مركز القيادة والتحكم';
        
        // Dynamic org labels
        if (document.getElementById('th-org1')) document.getElementById('th-org1').innerText = s.org_label_2 || 'الجهة';
        if (document.getElementById('edit-label-org1')) document.getElementById('edit-label-org1').innerText = s.org_label_2 || 'الجهة';
        if (document.getElementById('edit-label-org2')) document.getElementById('edit-label-org2').innerText = s.org_label_3 || 'القسم';
        if (document.getElementById('add-label-org1')) document.getElementById('add-label-org1').innerText = s.org_label_2 || 'الجهة';
        if (document.getElementById('add-label-org2')) document.getElementById('add-label-org2').innerText = s.org_label_3 || 'القسم';
        
        // Settings inputs
        if (document.getElementById('set-org-label-1')) document.getElementById('set-org-label-1').value = s.org_label_2 || 'الجهة';
        if (document.getElementById('set-org-label-2')) document.getElementById('set-org-label-2').value = s.org_label_3 || 'القسم';
        
        const qLabel = document.getElementById('quorum-label');
        if (qLabel) {
            const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
            const dict = adminTranslations[lang] || {};
            if (s.present >= s.quorum && s.quorum > 0) {
                qLabel.innerText = dict["تم اكتمال النصاب ✅"] || "تم اكتمال النصاب ✅";
                qLabel.style.color = "var(--emerald-light)";
            } else {
                qLabel.innerText = dict["النصاب المطلوب"] || "النصاب المطلوب";
                qLabel.style.color = "var(--text-secondary)";
            }
        }
    } catch (e) { console.error("Stats fail", e); }
}

async function loadSettings() {
    try {
        const response = await fetch('/api/stats');
        const root = await response.json();
        const s = root.stats;
        
        if (document.getElementById('set-hero-title')) document.getElementById('set-hero-title').value = s.hero_title || '';
        if (document.getElementById('set-hero-desc')) document.getElementById('set-hero-desc').value = s.hero_description || '';
        if (document.getElementById('set-event-timestamp')) document.getElementById('set-event-timestamp').value = s.event_timestamp || '';
        if (document.getElementById('set-show-countdown')) document.getElementById('set-show-countdown').checked = !!s.show_countdown;
        if (document.getElementById('set-logo-url')) document.getElementById('set-logo-url').value = s.logo_url || '';
        
        if (document.getElementById('set-registration-enabled')) document.getElementById('set-registration-enabled').checked = !!s.registration_enabled;
        if (document.getElementById('set-require-payment')) document.getElementById('set-require-payment').checked = !!s.require_payment;
        if (document.getElementById('set-ticket-price')) document.getElementById('set-ticket-price').value = s.ticket_price || 0;
        if (document.getElementById('set-currency')) document.getElementById('set-currency').value = s.currency || 'USD';
        if (document.getElementById('set-payment-mode')) document.getElementById('set-payment-mode').value = s.payment_mode || 'test';
        if (document.getElementById('set-stripe-public-key')) document.getElementById('set-stripe-public-key').value = s.stripe_public_key || '';
        if (document.getElementById('set-stripe-secret-key')) document.getElementById('set-stripe-secret-key').value = s.stripe_secret_key || '';
        if (document.getElementById('set-chargily-api-key')) document.getElementById('set-chargily-api-key').value = s.chargily_api_key || '';
        
        if (document.getElementById('set-total')) document.getElementById('set-total').value = s.total || 0;
        if (document.getElementById('set-quorum')) document.getElementById('set-quorum').value = s.quorum || 0;
        if (document.getElementById('set-show-quorum')) document.getElementById('set-show-quorum').checked = !!s.show_quorum;
        
        if (document.getElementById('set-doc-1')) document.getElementById('set-doc-1').value = s.doc_link_1 || '';
        if (document.getElementById('set-show-docs')) document.getElementById('set-show-docs').checked = !!s.show_docs;
        
        if (document.getElementById('announcement-text')) document.getElementById('announcement-text').value = s.announcement_text || '';
        
        // Identity fields
        // Colors are hardcoded
        if (document.getElementById('set-welcome-icon')) document.getElementById('set-welcome-icon').value = s.welcome_icon || 'fa-star';
        if (document.getElementById('set-welcome-title')) document.getElementById('set-welcome-title').value = s.welcome_title || '';
        if (document.getElementById('set-welcome-subtitle')) document.getElementById('set-welcome-subtitle').value = s.welcome_subtitle || '';
        // Report headers are hardcoded
        
        // Venue map
        if (document.getElementById('set-venue-map-url')) document.getElementById('set-venue-map-url').value = s.venue_map_url || '';
        if (document.getElementById('set-venue-map-link')) document.getElementById('set-venue-map-link').value = s.venue_map_link || '';
        
        loadHotels();
    } catch (e) { console.error("Load settings fail", e); }
}

async function saveSettings() {
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const getChk = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    
    const data = {
        hero_title: getVal('set-hero-title'),
        hero_description: getVal('set-hero-desc'),
        event_timestamp: getVal('set-event-timestamp'),
        show_countdown: getChk('set-show-countdown'),
        logo_url: getVal('set-logo-url'),
        total_invited: parseInt(getVal('set-total')) || 0,
        quorum: parseInt(getVal('set-quorum')) || 0,
        show_quorum: getChk('set-show-quorum'),
        doc_link_1: getVal('set-doc-1'),
        show_docs: getChk('set-show-docs'),
        registration_enabled: getChk('set-registration-enabled'),
        require_payment: getChk('set-require-payment'),
        // Custom Labels
        org_label_2: getVal('set-org-label-1') || 'الجهة',
        org_label_3: getVal('set-org-label-2') || 'القسم',
        // Identity fields
        app_name: 'ديوان لتسيير الفعاليات',
        app_subtitle: 'Diwan Event Manager',
        participant_label: 'مشارك',
        participant_label_plural: 'مشاركين',
        primary_color: '#D4AF37',
        secondary_color: '#022C22',
        accent_color: '#10B981',
        welcome_icon: getVal('set-welcome-icon') || 'fa-star',
        welcome_title: getVal('set-welcome-title'),
        welcome_subtitle: getVal('set-welcome-subtitle'),
        footer_text: 'Diwan Event Manager',
        report_header_1: 'منصة ديوان لتسيير الفعاليات',
        report_header_2: '',
        report_signature_1: 'رئيس لجنة التنظيم',
        report_signature_2: '',
        ticket_price: parseFloat(getVal('set-ticket-price')) || 0,
        currency: getVal('set-currency'),
        payment_mode: getVal('set-payment-mode'),
        stripe_public_key: getVal('set-stripe-public-key'),
        stripe_secret_key: getVal('set-stripe-secret-key'),
        chargily_api_key: getVal('set-chargily-api-key'),
    };
    
    const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (res.ok) {
        alert("✅ تم الحفظ بنجاح");
        refreshAdminStats();
        loadSettings();
    }
}

async function saveVenueMap() {
    const data = {
        venue_map_url: document.getElementById('set-venue-map-url').value,
        venue_map_link: document.getElementById('set-venue-map-link').value
    };
    const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (res.ok) {
        alert("✅ تم حفظ بيانات المكان");
        loadSettings();
    }
}

// Toggle a single setting (used by inline checkboxes like show_qa)
async function toggleSetting(key, value) {
    const data = {};
    data[key] = value;
    await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    refreshAdminStats();
    loadSettings();
}

// Media Upload
let currentUploadTarget = '';
function triggerUpload(target) {
    currentUploadTarget = target;
    document.getElementById('generic-uploader').click();
}

async function handleFileUpload(input) {
    if (!input.files[0]) return;
    const fd = new FormData();
    fd.append('file', input.files[0]);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.status === 'success') {
        if (currentUploadTarget === 'logo') {
            document.getElementById('set-logo-url').value = data.url;
        } else if (currentUploadTarget === 'hotel') {
            document.getElementById('hotel-image-url').value = data.url;
        }
    }
}

// Multi-Hotel Management
async function loadHotels() {
    const res = await fetch('/api/admin/hotels');
    const hotels = await res.json();
    const tbody = document.getElementById('hotels-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    // Store hotels globally to easily retrieve them for editing
    window.allHotels = hotels;
    hotels.forEach(h => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${h.image_url ? `<img src="${h.image_url}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">` : '<svg viewBox="0 0 512 512" width="24" height="24" fill="currentColor" style="opacity:0.3;"><path d="M448 80c8.8 0 16 7.2 16 16V415.8l-5-6.5-136-176c-4.5-5.9-11.5-9.3-19-9.3s-14.5 3.4-19 9.3L202 340.7l-30.5-27.3c-5.6-5.1-13.8-5.8-20.2-1.7l-80 50.7C62.5 368 59.1 371.7 57.6 376.1l-1.6 4.9V96c0-8.8 7.2-16 16-16H448zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm80 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg>'}
                    <b>${h.name}</b>
                </div>
            </td>
            <td>${h.phone}</td>
            <td>${h.price}</td>
            <td>
                <button onclick="editHotel(${h.id})" class="btn btn-outline" style="padding: 5px 10px; margin-left: 5px;" title="تعديل"><svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor" style="margin-left:5px;"><path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"/></svg> تعديل</button>
                <button onclick="deleteHotel(${h.id})" class="btn btn-danger" style="padding: 5px 10px;" title="حذف"><svg viewBox="0 0 448 512" width="14" height="14" fill="currentColor" style="margin-left:5px;"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg> حذف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAddHotelModal() { 
    document.getElementById('hotel-modal-title').innerHTML = '<i class="fas fa-hotel"></i> إضافة فندق جديد';
    document.getElementById('hotel-submit-btn').innerText = 'إضافة';
    document.getElementById('hotel-id').value = '';
    document.getElementById('hotel-name').value = '';
    document.getElementById('hotel-phone').value = '';
    document.getElementById('hotel-price').value = '';
    document.getElementById('hotel-map').value = '';
    document.getElementById('hotel-image-url').value = '';
    document.getElementById('add-hotel-modal').style.display = 'flex'; 
}

function editHotel(id) {
    const h = window.allHotels.find(x => x.id === id);
    if (!h) return;
    document.getElementById('hotel-modal-title').innerHTML = '<i class="fas fa-edit"></i> تعديل فندق';
    document.getElementById('hotel-submit-btn').innerText = 'تحديث';
    document.getElementById('hotel-id').value = h.id;
    document.getElementById('hotel-name').value = h.name;
    document.getElementById('hotel-phone').value = h.phone;
    document.getElementById('hotel-price').value = h.price;
    document.getElementById('hotel-map').value = h.map_url;
    document.getElementById('hotel-image-url').value = h.image_url;
    document.getElementById('add-hotel-modal').style.display = 'flex'; 
}

function closeAddHotelModal() { document.getElementById('add-hotel-modal').style.display = 'none'; }

async function saveNewHotel() {
    const id = document.getElementById('hotel-id').value;
    const data = {
        id: id || null,
        name: document.getElementById('hotel-name').value,
        phone: document.getElementById('hotel-phone').value,
        price: document.getElementById('hotel-price').value,
        map_url: document.getElementById('hotel-map').value,
        image_url: document.getElementById('hotel-image-url').value
    };
    
    const url = id ? '/api/admin/hotels/edit' : '/api/admin/hotels/add';
    await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    closeAddHotelModal();
    loadHotels();
}

async function deleteHotel(id) {
    if (!confirm("حذف هذا الفندق؟")) return;
    await fetch('/api/admin/hotels/delete', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id })
    });
    loadHotels();
}

// --- Direct Registration Tab Logic ---
let regSearchTimeout = null;
let barcodeBuffer = "";
let lastKeyTime = Date.now();

window.addEventListener('keydown', (e) => {
    // Only process if Registration Tab is active OR a specific focus? 
    // Usually USB scanners act as keyboards.
    if (e.target.tagName === 'INPUT') return;
    if (Date.now() - lastKeyTime > 50) barcodeBuffer = "";
    if (e.key === 'Enter') {
        if (barcodeBuffer.length > 2) {
            processDirectReg(barcodeBuffer, 'usb_scanner');
            barcodeBuffer = "";
        }
    } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
    }
    lastKeyTime = Date.now();
});

async function handleRegSearch(q) {
    clearTimeout(regSearchTimeout);
    const drop = document.getElementById('reg-results-dropdown');
    if (q.length < 2) { 
        if (drop) drop.style.display = 'none'; 
        return; 
    }
    regSearchTimeout = setTimeout(async () => {
        const res = await fetch(`/api/participants/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!drop) return;
        drop.innerHTML = '';
        if (data.length > 0) {
            data.forEach(p => {
                const item = document.createElement('div');
                item.className = 'result-item';
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b>${p.full_name}</b>
                        <span style="color:var(--gold); font-size:0.8rem;">#${p.order_num}</span>
                    </div>
                    <div style="font-size:0.75rem; opacity:0.5;">${p.council}</div>
                `;
                item.onclick = () => {
                    processDirectReg(p.qr_code || p.order_num, 'manual_search');
                    document.getElementById('reg-name-search').value = '';
                    drop.style.display = 'none';
                };
                drop.appendChild(item);
            });
            drop.style.display = 'block';
        } else {
            drop.style.display = 'none';
        }
    }, 300);
}

function submitRegDirect() {
    const val = document.getElementById('reg-direct-num').value;
    if (val) {
        processDirectReg(val, 'direct_number');
        document.getElementById('reg-direct-num').value = '';
    }
}

async function processDirectReg(code, method) {
    try {
        const res = await fetch('/api/attendance/check-in', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                qr_code: code,
                device_id: 'admin_console',
                device_name: 'كنسول الإدارة',
                entry_method: method
            })
        });
        const data = await res.json();
        
        // Audio & Visual Feedback
        const hist = document.getElementById('reg-history');
        if (hist.innerHTML.includes('لا توجد عمليات')) hist.innerHTML = '';
        
        const item = document.createElement('div');
        item.className = 'feed-item';
        
        if (data.status === 'success') {
            document.getElementById('snd-success').play().catch(()=>{});
            item.innerHTML = `<span style="color:var(--emerald-light);">✅ تم تسجيل: <b>${data.name}</b></span> <small style="opacity:0.4; float:left;">${new Date().toLocaleTimeString()}</small>`;
        } else if (data.status === 'duplicate') {
            document.getElementById('snd-duplicate').play().catch(()=>{});
            item.innerHTML = `<span style="color:var(--gold);">⚠️ مكرر: <b>${data.name}</b></span>`;
        } else {
            document.getElementById('snd-error').play().catch(()=>{});
            item.innerHTML = `<span style="color:var(--danger);">❌ فشل: الرمز ${code} غير معروف</span>`;
        }
        
        hist.prepend(item);
        if (hist.children.length > 10) hist.removeChild(hist.lastChild);
        
        refreshAdminStats();
        loadParticipants();
    } catch (e) { console.error(e); }
}

// Participants Management
window.participantsData = {};
async function loadParticipants(query = '') {
    const res = await fetch(`/api/participants/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const tbody = document.getElementById('participants-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(p => {
        window.participantsData[p.id] = p;
        const row = document.createElement('tr');
        const isPending = p.payment_status === 'pending_payment';
        const canEdit = window.userRole !== 'viewer';
        row.innerHTML = `
            <td>${p.order_num}</td>
            <td><b>${p.full_name}</b></td>
            <td>${p.council}</td>
            <td><span class="badge ${p.attendance_status > 0 ? 'badge-success' : 'badge-dim'}">${p.attendance_status > 0 ? 'حاضر ✅' : 'غائب'}</span></td>
            <td>
                ${isPending ? `<span class="badge" style="background:#dc2626; color:white;">قيد الدفع</span>` : `<span class="badge badge-success">تم الدفع</span>`}
            </td>
            <td>
                ${canEdit ? `
                ${isPending ? `<button onclick="togglePayment(${p.id})" style="color:var(--emerald-bright); border:none; background:none; cursor:pointer; margin-left:10px;" title="تأكيد الدفع"><svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg> تفعيل</button>` : `<button onclick="togglePayment(${p.id})" style="color:#dc2626; border:none; background:none; cursor:pointer; margin-left:10px;" title="تعليق الدفع"><svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47z"/></svg> تعليق</button>`}
                ${p.attendance_status == 0 ? `<button onclick="manualCheckIn(${p.id})" style="color:var(--gold); border:none; background:none; cursor:pointer; margin-left:10px;" title="تسجيل الدخول"><svg viewBox="0 0 448 512" width="14" height="14" fill="currentColor"><path d="M224 256a128 128 0 1 0 0-256 128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"/></svg> تسجيل</button>` : ''}
                <button onclick="openEditModal(${p.id})" style="color:#aaa; border:none; background:none; cursor:pointer; margin-left:10px;" title="تعديل"><svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor"><path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"/></svg></button>
                <button onclick="deleteParticipant(${p.id})" style="color:var(--danger); border:none; background:none; cursor:pointer;" title="حذف"><svg viewBox="0 0 448 512" width="14" height="14" fill="currentColor"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg></button>
                ` : '<span style="opacity:0.3">---</span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function manualCheckIn(id) {
    const p = window.participantsData[id];
    if (!p) return;
    if (p.payment_status === 'pending_payment') {
        alert("لا يمكن تسجيل دخول هذا المشارك لأن الدفع معلق!");
        return;
    }
    processDirectReg(p.qr_code || p.order_num, 'manual_admin_click');
}

async function togglePayment(id) {
    if (!confirm('هل أنت متأكد من تغيير حالة الدفع؟')) return;
    try {
        const res = await fetch(`/api/participants/${id}/payment`, { method: 'POST' });
        if (res.ok) {
            loadParticipants();
        }
    } catch (e) {
        console.error("Error toggling payment:", e);
    }
}

function openEditModal(id) {
    const p = window.participantsData[id];
    if (!p) return;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('edit-name').value = p.full_name;
    document.getElementById('edit-council').value = p.council;
    document.getElementById('edit-court').value = p.court;
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('edit-modal').style.display = 'none'; }
function openAddModal() { document.getElementById('add-modal').style.display = 'flex'; }
function closeAddModal() { document.getElementById('add-modal').style.display = 'none'; }

async function saveEdit() {
    const data = { id: document.getElementById('edit-id').value, full_name: document.getElementById('edit-name').value, council: document.getElementById('edit-council').value, court: document.getElementById('edit-court').value };
    const res = await fetch('/api/admin/edit-participant', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    if (res.ok) {
        showSimpleToast("✅ تم تعديل البيانات بنجاح");
        closeEditModal(); 
        loadParticipants();
    } else {
        showSimpleToast("❌ فشل تعديل البيانات", "error");
    }
}

async function saveAdd() {
    const nameInput = document.getElementById('add-name');
    const name = nameInput.value.trim();
    if (!name) return;
    
    // Check for duplicate names in the current list
    const existing = Object.values(window.participantsData || {}).find(p => p.full_name === name);
    if (existing) {
        if (!confirm(`⚠️ تنبيه: يوجد مشارك مسجل بالفعل بنفس الاسم: "${name}" (${existing.council}).\nهل أنت متأكد من رغبتك في إضافة مشارك جديد بنفس الاسم؟`)) {
            return;
        }
    }
    
    const data = { 
        full_name: name, 
        council: document.getElementById('add-council').value, 
        court: document.getElementById('add-court').value,
        role: document.getElementById('add-role') ? document.getElementById('add-role').value : 'مشارك',
        seat_info: document.getElementById('add-seat') ? document.getElementById('add-seat').value : ''
    };
    const res = await fetch('/api/admin/participants/add', { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(data) 
    });
    if (res.ok) {
        showSimpleToast("✅ تم إضافة المشارك بنجاح");
        closeAddModal(); 
        loadParticipants();
        nameInput.value = '';
    } else {
        showSimpleToast("❌ فشل إضافة المشارك", "error");
    }
}

async function deleteParticipant(id) { if (confirm("حذف؟")) { await fetch('/api/admin/delete-participant', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) }); loadParticipants(); } }

// Q&A
async function loadQuestions() {
    const res = await fetch('/api/questions/list');
    const questions = await res.json();
    const listEl = document.getElementById('full-questions-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    questions.forEach(q => {
        const card = document.createElement('div');
        card.style.background = 'rgba(255,255,255,0.02)';
        card.style.border = '1px solid var(--glass-border)';
        card.style.padding = '1.5rem';
        card.style.borderRadius = '1.5rem';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <b style="color:var(--gold);">${q.name}</b>
                <small style="opacity:0.5;">${q.timestamp}</small>
            </div>
            <p style="font-size:0.95rem;">${q.text}</p>
            <div style="margin-top:1.5rem; display:flex; gap:10px;">
                ${!q.answered ? `<button onclick="markQ(${q.id})" class="btn btn-gold" style="padding:5px 15px; font-size:0.8rem;">إجابة</button>` : '<span style="color:var(--emerald-light); font-size:0.8rem;">✅ تمت الإجابة</span>'}
                <button onclick="delQ(${q.id})" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        `;
        listEl.appendChild(card);
    });
}

window.markQ = async (id) => { await fetch('/api/questions/mark-answered', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) }); loadQuestions(); };
window.delQ = async (id) => { if (confirm("حذف؟")) { await fetch('/api/questions/delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) }); loadQuestions(); } };

// System Tools
async function generateBadges() {
    const status = document.getElementById('badge-status');
    const btn = document.querySelector('button[onclick="generateBadges()"]');
    
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التوليد...';
    status.innerHTML = "⏳ يتم الآن توليد البطاقات في الخلفية. سيتم إشعارك فور الانتهاء...";
    
    try {
        const res = await fetch('/api/admin/generate-badges-v2', { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'processing') {
            status.innerHTML = "⏳ " + data.message;
        } else if (data.status === 'success') {
            // Fallback just in case
            status.innerHTML = `<a href="${data.url}" class="btn btn-gold" target="_blank"><i class="fas fa-download"></i> تحميل الملف الجاهز</a>`;
            if(btn) btn.innerHTML = '<i class="fas fa-file-pdf"></i> إصدار البطاقات الموحدة';
        } else {
            status.innerHTML = "❌ فشل الإصدار: " + (data.message || "Unknown error");
            if(btn) btn.innerHTML = '<i class="fas fa-file-pdf"></i> إصدار البطاقات الموحدة';
        }
    } catch(e) {
        status.innerHTML = "❌ حدث خطأ في الاتصال";
        if(btn) btn.innerHTML = '<i class="fas fa-file-pdf"></i> إصدار البطاقات الموحدة';
    }
}

async function resetAttendance() {
    if (confirm("⚠️ تحذير: سيتم مسح كافة سجلات الحضور نهائياً. هل أنت متأكد؟")) {
        await fetch('/api/admin/reset', { method: 'POST' });
        refreshAdminStats();
    }
}

async function handleImport(input) {
    if (!input.files[0]) return;
    const fd = new FormData(); fd.append('file', input.files[0]);
    const res = await fetch('/api/admin/import', { method: 'POST', body: fd });
    if (res.ok) { alert("✅ تم استيراد قاعدة البيانات بنجاح"); loadParticipants(); }
}

async function initAdminHistory() {
    const res = await fetch('/api/attendance/history');
    const history = await res.json();
    const feed = document.getElementById('admin-live-feed');
    if (feed) { feed.innerHTML = ''; history.reverse().forEach(p => addAdminFeedItem(p)); }
}

// --- Questions Management ---
async function loadQuestions() {
    try {
        const res = await fetch('/api/questions/list');
        const data = await res.json();
        const container = document.getElementById('full-questions-list');
        if (!container) return;
        container.innerHTML = '';
        data.forEach(q => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.background = q.pinned ? 'rgba(212, 175, 55, 0.1)' : 'var(--glass)';
            card.style.borderColor = q.pinned ? 'var(--gold)' : 'var(--glass-border)';
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <div>
                        <div style="font-weight:bold; font-size:1.1rem; color:var(--gold); display:flex; align-items:center; gap:5px;">
                            ${q.pinned ? '<i class="fas fa-thumbtack"></i>' : ''} ${q.name}
                        </div>
                        <div style="font-size:0.8rem; opacity:0.5;">${q.timestamp}</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="pinQuestion(${q.id})" class="btn" style="padding: 5px 15px; background: ${q.pinned ? 'var(--gold)' : 'var(--glass)'}; border: 1px solid var(--gold); color: ${q.pinned ? '#000' : 'var(--gold)'};" title="${q.pinned ? 'إلغاء التثبيت' : 'تثبيت'}">
                            <i class="fas fa-thumbtack"></i> ${q.pinned ? 'مثبت' : 'تثبيت'}
                        </button>
                        <button onclick="deleteQuestion(${q.id})" class="btn btn-danger" style="padding: 5px 15px;" title="حذف السؤال">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
                <div style="font-size:1.1rem; line-height:1.6; margin-bottom:1.5rem;">${q.text}</div>
                ${!q.answered ? `<button class="btn btn-outline" style="width:100%; justify-content:center;" onclick="markAnswered(${q.id})"><i class="fas fa-check"></i> تعليم كمُجاب عنه</button>` : `<div style="text-align:center; color:var(--emerald-light);"><i class="fas fa-check-circle"></i> تمت الإجابة</div>`}
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Error loading questions", e);
    }
}

async function pinQuestion(id) {
    await fetch(`/api/questions/${id}/pin`, { method: 'POST' });
    loadQuestions();
}

async function deleteQuestion(id) {
    if(!confirm('هل أنت متأكد من حذف هذا السؤال نهائياً؟')) return;
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    loadQuestions();
}

async function markAnswered(id) {
    await fetch('/api/questions/mark-answered', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: id})
    });
    loadQuestions();
}

// --- Agenda Management ---
async function loadAdminAgenda() {
    const res = await fetch('/api/agenda');
    const sessions = await res.json();
    const tbody = document.getElementById('agenda-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    window.allAgenda = sessions;
        const canEdit = window.userRole !== 'viewer';
        sessions.forEach(s => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><b>${s.title}</b></td>
                <td>${s.speaker_name || '---'}</td>
                <td>${s.start_time || ''}</td>
                <td>${s.hall || '---'}</td>
                <td>
                    ${canEdit ? `
                    <button onclick="editAgenda(${s.id})" class="btn btn-outline" style="padding:5px 10px;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteAgenda(${s.id})" class="btn btn-danger" style="padding:5px 10px;"><i class="fas fa-trash"></i></button>
                    ` : '<span style="opacity:0.3">---</span>'}
                </td>
            `;
            tbody.appendChild(row);
        });
}

function openAddAgendaModal() {
    document.getElementById('agenda-modal-title').innerHTML = '<i class="fas fa-calendar-plus"></i> إضافة جلسة';
    document.getElementById('agenda-id').value = '';
    document.getElementById('agenda-title').value = '';
    document.getElementById('agenda-speaker').value = '';
    document.getElementById('agenda-start').value = '';
    document.getElementById('agenda-end').value = '';
    document.getElementById('agenda-hall').value = '';
    document.getElementById('agenda-desc').value = '';
    document.getElementById('agenda-order').value = '0';
    document.getElementById('add-agenda-modal').style.display = 'flex';
}

function editAgenda(id) {
    const s = window.allAgenda.find(x => x.id === id);
    if (!s) return;
    document.getElementById('agenda-modal-title').innerHTML = '<i class="fas fa-edit"></i> تعديل جلسة';
    document.getElementById('agenda-id').value = s.id;
    document.getElementById('agenda-title').value = s.title;
    document.getElementById('agenda-speaker').value = s.speaker_name || '';
    document.getElementById('agenda-start').value = s.start_time || '';
    document.getElementById('agenda-end').value = s.end_time || '';
    document.getElementById('agenda-hall').value = s.hall || '';
    document.getElementById('agenda-desc').value = s.description || '';
    document.getElementById('agenda-order').value = s.sort_order || 0;
    document.getElementById('add-agenda-modal').style.display = 'flex';
}

async function saveAgenda() {
    const id = document.getElementById('agenda-id').value;
    const data = {
        id: id || null,
        title: document.getElementById('agenda-title').value,
        speaker_name: document.getElementById('agenda-speaker').value,
        start_time: document.getElementById('agenda-start').value,
        end_time: document.getElementById('agenda-end').value,
        hall: document.getElementById('agenda-hall').value,
        description: document.getElementById('agenda-desc').value,
        sort_order: parseInt(document.getElementById('agenda-order').value) || 0
    };
    const url = id ? '/api/admin/agenda/edit' : '/api/admin/agenda/add';
    await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
    document.getElementById('add-agenda-modal').style.display = 'none';
    loadAdminAgenda();
}

async function editEvent(id, name, date, loc) {
    const newName = prompt("اسم الحدث الجديد:", name);
    if (!newName) return;
    const newDate = prompt("تاريخ الحدث الجديد:", date);
    const newLoc = prompt("مكان الحدث الجديد:", loc);
    
    try {
        const res = await fetch(`/api/admin/events/edit/${id}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ event_name: newName, event_date: newDate, location: newLoc })
        });
        if (res.ok) {
            loadEvents();
            showToast("✅ تم تحديث الحدث بنجاح");
        }
    } catch (err) { console.error(err); }
}

async function deleteAgenda(id) {
    if (!confirm('حذف هذه الجلسة؟')) return;
    await fetch('/api/admin/agenda/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) });
    loadAdminAgenda();
}

// --- Speakers Management ---
async function loadAdminSpeakers() {
    const res = await fetch('/api/speakers');
    const speakers = await res.json();
    const tbody = document.getElementById('speakers-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    window.allSpeakers = speakers;
        const canEdit = window.userRole !== 'viewer';
        speakers.forEach(sp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${sp.image_url ? `<img src="${sp.image_url}" style="width:35px;height:35px;border-radius:50%;object-fit:cover;">` : '<i class="fas fa-user-circle" style="font-size:1.5rem;opacity:0.3;"></i>'}
                        <b>${sp.name}</b>
                    </div>
                </td>
                <td>${sp.title || '---'}</td>
                <td>${sp.topic || '---'}</td>
                <td>
                    ${canEdit ? `
                    <button onclick="editSpeaker(${sp.id})" class="btn btn-outline" style="padding:5px 10px;" title="تعديل"><svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor"><path d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5L437.7 172.3 339.7 74.3 172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"/></svg></button>
                    <button onclick="deleteSpeaker(${sp.id})" class="btn btn-danger" style="padding:5px 10px;" title="حذف"><svg viewBox="0 0 448 512" width="14" height="14" fill="currentColor"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg></button>
                    ` : '<span style="opacity:0.3">---</span>'}
                </td>
            `;
            tbody.appendChild(row);
        });
}

function openAddSpeakerModal() {
    const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
    const dict = adminTranslations[lang] || {};
    document.getElementById('speaker-modal-title').innerHTML = `<i class="fas fa-user-plus"></i> ${dict['إضافة متحدث'] || 'إضافة متحدث'}`;
    document.getElementById('speaker-id').value = '';
    document.getElementById('speaker-name').value = '';
    document.getElementById('speaker-stitle').value = '';
    document.getElementById('speaker-bio').value = '';
    document.getElementById('speaker-image').value = '';
    document.getElementById('speaker-topic').value = '';
    document.getElementById('add-speaker-modal').style.display = 'flex';
}

function editSpeaker(id) {
    const sp = window.allSpeakers.find(x => x.id === id);
    if (!sp) return;
    const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
    const dict = adminTranslations[lang] || {};
    document.getElementById('speaker-modal-title').innerHTML = `<i class="fas fa-edit"></i> ${dict['تعديل متحدث'] || 'تعديل متحدث'}`;
    document.getElementById('speaker-id').value = sp.id;
    document.getElementById('speaker-name').value = sp.name;
    document.getElementById('speaker-stitle').value = sp.title || '';
    document.getElementById('speaker-bio').value = sp.bio || '';
    document.getElementById('speaker-image').value = sp.image_url || '';
    document.getElementById('speaker-topic').value = sp.topic || '';
    document.getElementById('add-speaker-modal').style.display = 'flex';
}

async function saveSpeaker() {
    const id = document.getElementById('speaker-id').value;
    const data = {
        id: id || null,
        name: document.getElementById('speaker-name').value,
        title: document.getElementById('speaker-stitle').value,
        bio: document.getElementById('speaker-bio').value,
        image_url: document.getElementById('speaker-image').value,
        topic: document.getElementById('speaker-topic').value
    };
    const url = id ? '/api/admin/speakers/edit' : '/api/admin/speakers/add';
    await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    document.getElementById('add-speaker-modal').style.display = 'none';
    loadAdminSpeakers();
}

async function deleteSpeaker(id) {
    const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
    const dict = adminTranslations[lang] || {};
    if (!confirm(dict['حذف هذا المتحدث؟'] || 'حذف هذا المتحدث؟')) return;
    await fetch('/api/admin/speakers/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) });
    loadAdminSpeakers();
}

// --- Event Management ---
async function loadEvents() {
    try {
        const response = await fetch('/api/admin/events');
        const events = await response.json();
        
        // Populate header switcher
        const switcher = document.getElementById('event-active-select');
        if (switcher) {
            switcher.innerHTML = '';
            events.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.textContent = e.event_name;
                switcher.appendChild(opt);
            });
            // Set active from local storage or first one
            const activeId = localStorage.getItem('diwan_active_event_id') || (events.length > 0 ? events[0].id : 1);
            switcher.value = activeId;
        }

        // Populate management table
        const tbody = document.getElementById('events-table-body');
        if (tbody) {
            tbody.innerHTML = '';
            events.forEach(e => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding: 1.2rem; font-weight: 900; color: var(--gold); font-size: 1.1rem;">${e.event_name}</td>
                    <td style="padding: 1.2rem; opacity: 0.8; font-size: 0.9rem;"><i class="far fa-calendar-alt" style="margin-left: 8px; color: var(--gold); opacity: 0.5;"></i> ${e.event_date || '---'}</td>
                    ${e.hasOwnProperty('owner_name') ? `<td style="padding: 1.2rem; font-weight: bold; color: var(--emerald-light); font-size: 0.9rem;">${e.owner_name || '---'}</td>` : ''}
                    <td style="padding: 1.2rem; opacity: 0.8; font-size: 0.9rem;"><i class="fas fa-map-marker-alt" style="margin-left: 8px; color: var(--gold); opacity: 0.5;"></i> ${e.location || '---'}</td>
                    <td style="padding: 1.2rem;">
                        <span class="badge ${e.status === 'active' ? 'badge-success' : 'badge-dim'}" style="padding: 6px 15px; border-radius: 20px; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">
                            ${e.status === 'active' ? '<i class="fas fa-signal"></i> Active' : '<i class="fas fa-pause-circle"></i> Inactive'}
                        </span>
                    </td>
                    <td style="padding: 1.2rem; text-align: center;">
                        <div style="display: flex; gap: 0.8rem; justify-content: center;">
                            <button class="btn-action btn-switch" onclick="switchActiveEvent(${e.id})" title="تفعيل / دخول">
                                <svg viewBox="0 0 512 512" width="18" height="18" fill="currentColor"><path d="M217.9 105.9L340.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L217.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1L32 320c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM352 416l64 0c17.7 0 32-14.3 32-32l0-256c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64 0c53 0 96 43 96 96l0 256c0 53-43 96-96 96l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/></svg>
                            </button>
                            <button class="btn-action" style="background: rgba(16, 185, 129, 0.1); color: var(--emerald-light);" onclick="editEvent(${e.id}, '${e.event_name}', '${e.event_date}', '${e.location}')" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteEvent(${e.id})" title="حذف نهائي">
                                <svg viewBox="0 0 448 512" width="18" height="18" fill="currentColor"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (err) {
        console.error("Error loading events:", err);
    }
}

async function switchActiveEvent(eventId) {
    try {
        const response = await fetch(`/api/admin/switch-event/${eventId}`, { method: 'POST' });
        if (response.ok) {
            localStorage.setItem('diwan_active_event_id', eventId);
            window.location.reload(); // Hard refresh to reload all stats/context
        }
    } catch (err) {
        console.error("Error switching event:", err);
    }
}

function openAddEventModal() {
    document.getElementById('add-event-modal').style.display = 'flex';
}

async function saveEvent() {
    const data = {
        event_name: document.getElementById('new-event-name').value,
        event_date: document.getElementById('new-event-date').value,
        location: document.getElementById('new-event-location').value
    };
    
    try {
        const response = await fetch('/api/admin/events/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            const res = await response.json();
            document.getElementById('add-event-modal').style.display = 'none';
            loadEvents();
            switchActiveEvent(res.event_id);
        }
    } catch (err) {
        console.error("Error saving event:", err);
    }
}

async function deleteEvent(eventId) {
    const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
    const dict = adminTranslations[lang] || {};
    if (!confirm(dict['هل أنت متأكد من حذف هذا الحدث نهائياً؟ سيتم مسح كافة المشاركين التابعين له!'] || 'هل أنت متأكد من حذف هذا الحدث نهائياً؟ سيتم مسح كافة المشاركين التابعين له!')) return;
    
    try {
        const response = await fetch(`/api/admin/events/delete/${eventId}`, { method: 'POST' });
        if (response.ok) {
            loadEvents();
            if (localStorage.getItem('diwan_active_event_id') == eventId) {
                localStorage.removeItem('diwan_active_event_id');
                window.location.reload();
            }
        } else {
            const res = await response.json();
            alert(res.error || 'فشل حذف الحدث');
        }
    } catch (err) {
        console.error("Error deleting event:", err);
    }
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    loadEvents(); // Load events first
    refreshAdminStats();
    initAdminHistory();
    loadAdminAgenda();
    loadAdminSpeakers();
    loadPolls();
    loadCertSettings();
});

// --- Voting System ---
async function loadPolls() {
    try {
        const response = await fetch('/api/admin/polls');
        const polls = await response.json();
        const container = document.getElementById('polls-container');
        if (!container) return;
        
        container.innerHTML = '';
        polls.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '1.5rem';
            card.innerHTML = `
                <h4 style="color: var(--gold); margin-bottom: 1rem;">${p.question}</h4>
                <div id="poll-results-${p.id}">
                    ${p.options.map(o => `
                        <div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                            <span>${o.option_text}</span>
                            <span id="opt-count-${o.id}" style="font-weight: bold; color: var(--gold);">0</span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-outline" style="width:100%; margin-top: 1rem;" onclick="refreshPollResults(${p.id})">
                    <i class="fas fa-sync"></i> تحديث النتائج
                </button>
            `;
            container.appendChild(card);
            refreshPollResults(p.id);
        });
    } catch (err) { console.error(err); }
}

async function refreshPollResults(pollId) {
    const res = await fetch(`/api/polls/results/${pollId}`);
    const results = await res.json();
    results.forEach(r => {
        const el = document.getElementById(`opt-count-${r.id}`);
        if (el) el.innerText = r.vote_count;
    });
}

async function openCreatePollModal() {
    const question = prompt("أدخل سؤال التصويت:");
    if (!question) return;
    const optionsStr = prompt("أدخل الخيارات مفصولة بفواصل (مثال: نعم, لا, ربما):");
    if (!optionsStr) return;
    const options = optionsStr.split(',').map(o => o.trim());
    
    await fetch('/api/admin/polls/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ question, options })
    });
    loadPolls();
}

// --- Certificates System ---
async function loadCertSettings() {
    try {
        const res = await fetch('/api/certificate/template');
        const data = await res.json();
        if (data) {
            document.getElementById('cert-enabled').value = data.is_enabled ? "true" : "false";
            document.getElementById('cert-bg-url').value = data.bg_image_url || '';
            document.getElementById('cert-font-color').value = data.font_color || '#000000';
            document.getElementById('cert-name-y').value = data.name_y_pos || 400;
        }
    } catch (err) { console.error(err); }
}

async function saveCertSettings() {
    const data = {
        is_enabled: document.getElementById('cert-enabled').value === "true",
        bg_image_url: document.getElementById('cert-bg-url').value,
        font_color: document.getElementById('cert-font-color').value,
        name_y_pos: parseInt(document.getElementById('cert-name-y').value)
    };
    const res = await fetch('/api/admin/certificate/template', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    if (res.ok) showToast("✅ تم حفظ إعدادات الشهادة بنجاح");
}

// --- User Management ---
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const users = await response.json();
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        users.forEach(u => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--glass-border)';
            row.innerHTML = `
                <td style="padding: 1rem;">${u.full_name || u.username}</td>
                <td style="padding: 1rem; opacity: 0.7;">${u.username}</td>
                <td style="padding: 1rem;"><span class="badge" style="background: rgba(212, 175, 55, 0.1); color: var(--gold); padding: 4px 10px; border-radius: 8px; font-size: 0.8rem;">${u.role}</span></td>
                <td style="padding: 1rem; font-weight: bold; color: var(--gold);">
                    ${u.event_credits || 0}
                    <button class="btn-action" style="margin-right: 8px; background: rgba(255,255,255,0.05); color: var(--text-primary);" onclick="editUserCredits(${u.id}, ${u.event_credits || 0})" title="تعديل الرصيد">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
                <td style="padding: 1rem; opacity: 0.5; font-size: 0.85rem;">${new Date(u.created_at).toLocaleString('ar-DZ')}</td>
                <td style="padding: 1rem; text-align: center;">
                    <button class="btn btn-outline" style="padding: 5px 12px; border-color: var(--danger); color: var(--danger);" onclick="deleteUser(${u.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error loading users:", err);
    }
}

async function editUserCredits(userId, current) {
    const newCredits = prompt("أدخل الرصيد الجديد للفعاليات لهذا المستخدم:", current);
    if (newCredits === null) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/credits`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ credits: parseInt(newCredits) || 0 })
        });
        if (response.ok) {
            loadUsers();
            showToast("تم تحديث الرصيد بنجاح");
        }
    } catch (err) {
        console.error("Error updating credits:", err);
    }
}

async function deleteUser(userId) {
    const lang = localStorage.getItem('diwan_admin_lang') || 'ar';
    const dict = adminTranslations[lang] || {};
    if (!confirm(dict['هل أنت متأكد؟'] || 'هل أنت متأكد؟')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (response.ok) {
            loadUsers();
        } else {
            alert(dict['فشل حذف المستخدم'] || 'فشل حذف المستخدم');
        }
    } catch (err) {
        console.error("Error deleting user:", err);
    }
}
