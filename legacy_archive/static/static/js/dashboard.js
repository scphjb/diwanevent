const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
let ws;
let reconnectDelay = 1000;
let wsHeartbeat;

function connectWebSocket() {
    ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/dashboard`);
    
    ws.onopen = () => {
        reconnectDelay = 1000; // Reset delay on successful connection
        // Start heartbeat to keep connection alive
        wsHeartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'update') {
            updateStats(data.stats);
            addFeedItem(data.participant);
        } else if (data.type === 'stats_update') {
            updateStats(data.stats);
        }
    };
    
    ws.onclose = () => {
        clearInterval(wsHeartbeat);
        setTimeout(connectWebSocket, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000); // Exponential backoff up to 30s
    };
    
    ws.onerror = () => {
        ws.close();
    };
}

connectWebSocket();

function updateStats(stats) {
    if (stats.event_name) document.getElementById('dash-event-name').innerText = `🏛️ ${stats.event_name}`;
    if (stats.location) document.getElementById('dash-location').innerText = `📍 ${stats.location}`;
    if (stats.event_date) document.getElementById('dash-date').innerText = `📅 ${stats.event_date}`;
    
    document.getElementById('present-count').innerText = stats.present;
    document.getElementById('absent-count').innerText = stats.absent;
    document.getElementById('exited-count').innerText = stats.exited;
    document.getElementById('total-invited').innerText = stats.total;
    document.getElementById('quorum-target').innerText = stats.quorum;
    document.getElementById('percentage-text').innerText = `${stats.percentage}%`;
    document.getElementById('progress-bar').style.width = `${stats.percentage}%`;
    
    // Alt counts for no-quorum mode
    if (document.getElementById('absent-count-alt')) {
        document.getElementById('absent-count-alt').innerText = stats.absent;
        document.getElementById('exited-count-alt').innerText = stats.exited;
    }

    // Quorum conditional display
    const showQuorum = stats.show_quorum !== undefined ? stats.show_quorum : true;
    if (document.getElementById('dash-quorum-section')) {
        document.getElementById('dash-quorum-section').style.display = showQuorum ? 'block' : 'none';
        document.getElementById('dash-no-quorum-section').style.display = showQuorum ? 'none' : 'block';
    }

    // Quorum alert
    const alert = document.getElementById('quorum-alert');
    if (showQuorum && stats.present >= stats.quorum) {
        alert.style.display = 'block';
    } else {
        alert.style.display = 'none';
    }
    
    // Update Councils
    if (stats.councils) {
        updateCouncilStats(stats.councils);
    }
    
    // Animate counter
    const counter = document.getElementById('present-count');
    counter.style.transform = 'scale(1.1)';
    setTimeout(() => { counter.style.transform = 'scale(1)'; }, 200);
}

function updateCouncilStats(councils) {
    const container = document.getElementById('council-stats');
    if (!container) return;
    
    container.innerHTML = councils.map(c => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 1.2rem; border-radius: 1rem; transition: all 0.3s;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; align-items: center;">
                <b style="color: var(--text-main); font-size: 0.95rem;">${c.name}</b>
                <span style="color: var(--gold); font-weight: 600; font-size: 0.9rem;">${c.present} <small style="color: var(--text-dim); font-weight: 400;">/ ${c.total}</small></span>
            </div>
            <div style="background: rgba(255,255,255,0.1); border-radius: 1rem; height: 0.5rem; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                <div style="background: linear-gradient(90deg, var(--emerald-dark), var(--emerald)); height: 100%; width: ${c.percent}%; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);"></div>
            </div>
            <div style="text-align: left; font-size: 0.75rem; margin-top: 0.5rem; color: var(--emerald-light); font-weight: 500;">
                ${c.percent}%
            </div>
        </div>
    `).join('');
}

function addFeedItem(p) {
    const feed = document.getElementById('live-feed');
    const item = document.createElement('div');
    item.style.padding = '1.25rem 0';
    item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.animation = 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    
    const isOut = p.event_type === 'check_out';
    const accentColor = isOut ? '#ef4444' : 'var(--emerald-light)';
    
    item.innerHTML = `
        <div style="flex: 1;">
            <b style="font-size: 1rem; color: var(--text-main); display: block;">${p.name}</b>
            <span style="color: var(--text-dim); font-size: 0.8rem; font-weight: 300;">${p.council} | ${p.court}</span>
        </div>
        <div style="text-align: left; min-width: 90px;">
            <span style="display: block; font-size: 0.75rem; color: var(--text-dim); margin-bottom: 2px;">${p.time}</span>
            <span style="background: ${isOut ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; 
                         color: ${accentColor}; 
                         padding: 2px 10px; 
                         border-radius: 99px; 
                         border: 1px solid ${isOut ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
                         font-size: 0.75rem; font-weight: 600;">
                ${isOut ? 'خروج' : 'دخول'}
            </span>
        </div>
    `;
    
    // Add to top
    feed.prepend(item);
    
    // Smooth scrolling to top
    feed.scrollTop = 0;
    
    // Limit feed items
    if (feed.children.length > 50) {
        feed.removeChild(feed.lastChild);
    }
}


// Initial stats and history fetch
async function initStats() {
    // Stats
    const statsResponse = await fetch('/api/stats');
    const stats = await statsResponse.json();
    updateStats(stats);
    
    // History
    const historyResponse = await fetch('/api/attendance/history');
    const history = await historyResponse.json();
    const feed = document.getElementById('live-feed');
    feed.innerHTML = ''; // Clear placeholder
    
    // History comes DESC (newest first), so we reverse to add correctly with prepend
    history.reverse().forEach(item => {
        addFeedItem(item);
    });
}

initStats();
