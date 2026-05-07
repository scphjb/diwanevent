// Analytics Dashboard Logic for Diwan Admin
let timelineChart, orgChart, devicesChart;

const chartColors = {
    gold: '#D4AF37',
    emerald: '#10B981',
    emeraldDark: '#022C22',
    textMain: '#F9FAFB',
    textDim: '#9CA3AF',
    border: 'rgba(255,255,255,0.1)'
};

function getLang() {
    return localStorage.getItem('diwan_admin_lang') || 'ar';
}

function getTranslation(key) {
    const lang = getLang();
    if (typeof adminTranslations !== 'undefined' && adminTranslations[lang] && adminTranslations[lang][key]) {
        return adminTranslations[lang][key];
    }
    return key;
}

async function loadAnalytics() {
    try {
        const response = await fetch('/api/analytics');
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        
        // Render Summary Score
        renderSummary(data.summary);
        
        // Render Charts
        renderTimelineChart(data.hourly_curve);
        renderOrgChart(data.by_council);
        renderDevicesChart(data.devices);
        
        // Render Tables
        renderSessionEngagement(data.session_engagement);
    } catch (error) {
        console.error("Analytics Error:", error);
    }
}

function renderSummary(summary) {
    const scoreEl = document.getElementById('engagement-score');
    if (!scoreEl) return;
    
    scoreEl.textContent = summary.score + '%';
    scoreEl.style.color = summary.score > 70 ? chartColors.emerald : (summary.score > 40 ? chartColors.gold : '#ef4444');
    
    document.getElementById('engagement-label').textContent = summary.label;
    document.getElementById('total-present-stat').textContent = summary.total_present;
    document.getElementById('total-questions-stat').textContent = summary.total_questions;
}

function renderTimelineChart(data) {
    const ctx = document.getElementById('timelineChart').getContext('2d');
    if (timelineChart) timelineChart.destroy();
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.hour),
            datasets: [{
                label: getTranslation('الحضور'),
                data: data.map(d => d.count),
                borderColor: chartColors.emerald,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: chartColors.border }, ticks: { color: chartColors.textDim } },
                y: { beginAtZero: true, grid: { color: chartColors.border }, ticks: { color: chartColors.textDim } }
            }
        }
    });
}

function renderOrgChart(data) {
    const ctx = document.getElementById('orgChart').getContext('2d');
    if (orgChart) orgChart.destroy();
    
    orgChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.slice(0, 8).map(d => d.council),
            datasets: [{
                label: getTranslation('نسبة الحضور %'),
                data: data.slice(0, 8).map(d => d.rate),
                backgroundColor: chartColors.gold,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: chartColors.textDim } },
                y: { beginAtZero: true, max: 100, grid: { color: chartColors.border }, ticks: { color: chartColors.textDim } }
            }
        }
    });
}

function renderDevicesChart(data) {
    const ctx = document.getElementById('devicesChart').getContext('2d');
    if (devicesChart) devicesChart.destroy();
    
    const labels = Object.keys(data).map(l => getTranslation(l));
    const values = Object.values(data);
    const colors = [chartColors.emerald, chartColors.gold, '#3B82F6'];
    
    devicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: chartColors.textMain, font: {family: 'Cairo'} }
                }
            }
        }
    });
}

function renderSessionEngagement(sessions) {
    const container = document.getElementById('session-engagement-list');
    if (!container) return;
    
    container.innerHTML = sessions.map(s => `
        <div style="display:grid; grid-template-columns: 1fr 100px 80px; gap:1rem; border-bottom:1px solid var(--glass-border); padding:0.8rem; font-size:0.9rem;">
            <span>${s.title}</span>
            <span style="text-align:center;">${s.questions_count} ${getTranslation('أسئلة')} / ${s.ratings_count} ${getTranslation('تقييم')}</span>
            <span style="font-weight:bold; color:var(--gold); text-align:right;">${s.score}</span>
        </div>
    `).join('');
}
