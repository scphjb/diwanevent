let html5QrCode;
let selectedParticipant = null;
let searchTimeout = null;

// Audio setups
const sounds = {
    success: new Audio('/assets/sounds/success.wav'),
    duplicate: new Audio('/assets/sounds/duplicate.wav'),
    error: new Audio('/assets/sounds/error.wav'),
    checkout: new Audio('/assets/sounds/checkout.wav'),
    quorum: new Audio('/assets/sounds/success.wav') // placeholder for quorum chime
};

// Combined Key Listener (HID Scanner + Debug Mode)
let barcodeBuffer = "";
let lastKeyTime = Date.now();

window.addEventListener('keydown', (e) => {
    const currentTime = Date.now();
    
    // Toggle Debug Mode with 'D'
    if (e.key.toLowerCase() === 'd' && e.target.tagName !== 'INPUT') {
        debugMode = !debugMode;
        const log = document.getElementById('debug-log');
        if (log) log.style.display = debugMode ? 'block' : 'none';
        debugLog(`Debug mode ${debugMode ? 'ENABLED' : 'DISABLED'}`);
        return;
    }

    // HID Scanner logic
    if (currentTime - lastKeyTime > 50) barcodeBuffer = "";
    if (e.key === 'Enter') {
        if (barcodeBuffer.length > 2) {
            debugLog(`HID Scan Received: ${barcodeBuffer}`);
            performScan({ qr_code: barcodeBuffer, entry_method: 'hid_scan' });
            barcodeBuffer = "";
        }
    } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
    }
    lastKeyTime = currentTime;
});

function playSound(type) {
    debugLog(`Attempting to play sound: ${type}`);
    if (sounds[type]) {
        // Ensure volume is up
        sounds[type].volume = 1.0;
        sounds[type].play().then(() => {
            debugLog(`Sound ${type} completed`);
        }).catch(err => {
            debugLog(`Audio Error (${type}): ${err.message}`);
        });
    }
}

// Scanner Initialization
function startScanner() {
    debugLog("Initializing Scanner...");
    // Check for Secure Context (HTTPS or localhost)
    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        alert("⚠️ تنبيه أمني: المتصفح يمنع الكاميرا في الهواتف لأن الاتصال يتم عبر HTTP وليس HTTPS.\n\nيرجى استخدام جهاز كمبيوتر، أو تفعيل خاصية 'Insecure origins treated as secure' في إعدادات كروم بالهاتف.");
    }

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (decodedText) => {
            // Success QR scan
            performScan({ qr_code: decodedText, entry_method: 'qr_scan' });
            html5QrCode.pause(); // Pause to show result
            setTimeout(() => html5QrCode.resume(), 1000);
        },
        (errorMessage) => {
            // Optional: ignore frequent frame errors
        }
    ).catch(err => {
        console.error("Camera Start Error:", err);
        const reader = document.getElementById('reader');
        reader.innerHTML = `<div style="padding: 20px; color: white; text-align: center;">
            <p>❌ فشل تشغيل الكاميرا</p>
            <p style="font-size: 0.9rem; opacity: 0.8;">${err}</p>
            <button onclick="location.reload()" class="btn btn-gold" style="margin-top: 10px;">إعادة المحاولة</button>
        </div>`;
    });
}

let debugMode = false;
function debugLog(msg) {
    console.log(`[DEBUG] ${msg}`);
    if (!debugMode) return;
    const log = document.getElementById('debug-log');
    if (log) {
        log.style.display = 'block';
        const entry = document.createElement('div');
        entry.style.marginBottom = '2px';
        entry.innerText = `> ${new Date().toLocaleTimeString()}: ${msg}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }
}


async function performScan(payload) {
    debugLog(`Starting scan: ${JSON.stringify(payload)}`);
    try {
        const modeInput = document.querySelector('input[name="event_type"]:checked');
        payload.event_type = modeInput ? modeInput.value : 'check_in';
        payload.device = "Main Entrance";
        
        debugLog(`Fetching /api/scan with method ${payload.entry_method}...`);
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        debugLog(`Response status: ${response.status}`);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server Error ${response.status}: ${errText}`);
        }
        
        const data = await response.json();
        debugLog(`Data received: ${JSON.stringify(data)}`);
        
        showResult(data);
        addToHistory(data);
        
    } catch (error) {
        debugLog(`FATAL ERROR: ${error.message}`);
        console.error("Scan Error:", error);
        showResult({ status: 'error', name: 'خطأ في النظام', council: error.message });
        alert(`⚠️ خطأ برمي: ${error.message}`);
    }
}

function showResult(data) {
    console.log("Showing Result:", data);
    const overlay = document.getElementById('result-overlay');
    const title = document.getElementById('overlay-title');
    const name = document.getElementById('overlay-name');
    const details = document.getElementById('overlay-details');
    const time = document.getElementById('overlay-time');
    
    overlay.className = ''; // reset
    
    let displayTitle = '❌ غير معروف';
    let displayName = data.name || (data.status === 'not_found' ? "غير مسجل" : "خطأ تقني");
    let displayDetails = data.council ? `${data.council} | ${data.court || '--'}` : (data.status === 'not_found' ? 'يرجى مراجعة القائمة' : 'تأكد من الاتصال');
    let displayTime = data.time || new Date().toLocaleTimeString();
    let soundType = 'error';

    if (data.status === 'success' || data.status === 'checkout_success') {
        overlay.classList.add('overlay-success');
        displayTitle = data.status === 'success' ? '✅ تم التسجيل' : '🚪 تسجيل خروج';
        soundType = data.status === 'success' ? 'success' : 'checkout';
    } else if (data.status === 'duplicate') {
        overlay.classList.add('overlay-duplicate');
        displayTitle = '⚠️ مكرر مسبقاً';
        soundType = 'duplicate';
    } else if (data.status === 'frozen') {
        overlay.classList.add('overlay-error');
        displayTitle = '⏳ عذراً، تم غلق التسجيل';
        soundType = 'error';
    } else if (data.status === 'not_found') {
        overlay.classList.add('overlay-error');
        displayTitle = '❌ غير مسجل';
        soundType = 'error';
    } else {
        overlay.classList.add('overlay-error');
    }
    
    title.innerText = displayTitle;
    name.innerText = displayName;
    details.innerText = displayDetails;
    time.innerText = displayTime;
    
    playSound(soundType);
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 1000);
}

function addToHistory(data) {
    const tbody = document.getElementById('scan-history');
    if (!tbody) return;

    const statusTranslations = {
        'success': 'تم الدخول ✅',
        'checkout_success': 'تسجيل خروج 🚪',
        'duplicate': 'مكرر ⚠️',
        'frozen': 'التسجيل مغلق ❄️',
        'not_found': 'غير مسجل ❌',
        'error': 'خطأ تقني 🛠️'
    };
    
    const row = document.createElement('tr');
    row.style.animation = 'fadeIn 0.5s ease-out';
    
    const statusColor = (data.status === 'success' || data.status === 'checkout_success') ? 'var(--gold-light)' : '#f87171';
    const displayName = data.name || (data.status === 'not_found' ? 'غير مسجل' : 'خطأ');
    const displayStatus = statusTranslations[data.status] || data.status;
    
    row.innerHTML = `
        <td style="padding: 1rem; color: var(--text-dim); border-bottom: 1px solid rgba(255,255,255,0.05);">${data.time || '--'}</td>
        <td style="padding: 1rem; color: var(--text-main); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05);">${displayName}</td>
        <td style="padding: 1rem; color: var(--text-dim); border-bottom: 1px solid rgba(255,255,255,0.05);">${data.council || '--'}</td>
        <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);"><span style="background: rgba(0,0,0,0.3); color: ${statusColor}; padding: 6px 14px; border-radius: 99px; font-size: 0.8rem; border: 1px solid ${statusColor}; font-weight: bold;">${displayStatus}</span></td>
    `;
    tbody.prepend(row);
    
    // Limit history to 15 items
    if (tbody.children.length > 15) {
        tbody.removeChild(tbody.lastChild);
    }
}

// Search Logic
document.getElementById('name-search-input').addEventListener('input', (e) => {
    const query = e.target.value;
    clearTimeout(searchTimeout);
    
    if (query.length < 3) {
        document.getElementById('search-results').style.display = 'none';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const response = await fetch(`/api/participants/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        const resultsDiv = document.getElementById('search-results');
        resultsDiv.innerHTML = '';
        
        if (results.length > 0) {
            results.forEach(p => {
                const item = document.createElement('div');
                item.style.padding = '1rem';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                item.style.transition = 'background 0.3s';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--text-main); font-weight: 600;">${p.full_name}</span>
                        <span style="color: var(--gold); font-size: 0.8rem;">#${p.order_num}</span>
                    </div>
                    <small style="color: var(--text-dim);">${p.council} | ${p.court}</small>
                `;
                item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.05)';
                item.onmouseout = () => item.style.background = 'transparent';
                item.onclick = () => showConfirmation(p);
                resultsDiv.appendChild(item);
            });
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    }, 300);
});

function showConfirmation(p) {
    selectedParticipant = p;
    document.getElementById('confirm-name').innerText = p.full_name;
    document.getElementById('confirm-id').innerText = p.order_num;
    document.getElementById('confirm-council').innerText = p.council;
    document.getElementById('confirm-court').innerText = p.court;
    document.getElementById('confirmation-modal').style.display = 'flex';
    document.getElementById('search-results').style.display = 'none';
}

// Event Listeners
document.getElementById('start-btn').onclick = () => {
    startScanner();
    // Warm up audio
    playSound('success');
};

document.getElementById('stop-btn').onclick = () => {
    if (html5QrCode) html5QrCode.stop();
};

document.getElementById('manual-submit').onclick = () => {
    const val = document.getElementById('order-num-input').value;
    if (val) {
        performScan({ order_num: val, entry_method: 'manual_number' });
        document.getElementById('order-num-input').value = '';
    }
};

document.getElementById('confirm-yes').onclick = () => {
    if (!selectedParticipant) {
        debugLog("ERROR: No participant selected for confirmation");
        return;
    }
    
    debugLog(`Confirming registration for: ${selectedParticipant.full_name}`);
    performScan({ 
        order_num: selectedParticipant.order_num, 
        entry_method: 'name_search',
        search_query: document.getElementById('name-search-input').value
    });
    document.getElementById('confirmation-modal').style.display = 'none';
    document.getElementById('name-search-input').value = '';
};

document.getElementById('confirm-no').onclick = () => {
    document.getElementById('confirmation-modal').style.display = 'none';
};
