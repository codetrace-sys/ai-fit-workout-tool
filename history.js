const API_BASE = 'http://127.0.0.1:5000';

// ==================== API 请求封装 ====================
// 封装 GET 请求，返回 JSON 数据
async function apiGet(path) {
    const resp = await fetch(`${API_BASE}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await resp.json();
    // 判断出错，如果出错抛出新错误，否则返回数据对象
    if (!resp.ok || data.error) throw new Error(data.error || '请求失败');
    return data;
}
// 封装 POST 请求，返回 JSON 数据
async function apiPost(path, body) {
    const resp = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || '请求失败');
    return data;
}
// 封装 DELETE 请求，返回 JSON 数据
async function apiDelete(path) {
    const resp = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || '请求失败');
    return data;
}

// ==================== 渲染计划详情 HTML（和 main.js 保持一致） ====================
// 生成计划详情的 HTML 字符串
function buildPlanHTML(planData) {
    let html = '';
    html += `<h3 class="plan-title">📅 ${planData.weekRange || '本周计划'}</h3>`;

    const plan = planData.plan || {};
    const dayOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    dayOrder.forEach(day => {
        const dayInfo = plan[day];
        if (!dayInfo) return;

        const isTraining = dayInfo.type === '训练日';
        const typeClass = isTraining ? 'type-tag' : 'type-tag rest';
        const typeTag = `<span class="${typeClass}">${dayInfo.type}</span>`;

        html += `<div class="day-card">`;
        html += `<div class="day-header">${day}${typeTag}${dayInfo.focus ? `<span class="day-focus">· ${dayInfo.focus}</span>` : ''}</div>`;

        if (isTraining && dayInfo.exercises && dayInfo.exercises.length > 0) {
            html += `<ul class="exercise-table">`;
            html += `<li class="exercise-head">
                <span class="col-name">动作名称</span>
                <span class="col-sets">组数</span>
                <span class="col-reps">次数</span>
                <span class="col-rest">休息</span>
                <span class="col-note">备注</span>
            </li>`;
            dayInfo.exercises.forEach(ex => {
                html += `<li class="exercise-row">
                    <span class="col-name">${ex.name || '-'}</span>
                    <span class="col-sets">${ex.sets ?? '-'}</span>
                    <span class="col-reps">${ex.reps || '-'}</span>
                    <span class="col-rest">${ex.rest || '-'}</span>
                    <span class="col-note">${ex.note || '-'}</span>
                </li>`;
            });
            html += `</ul>`;
        } else {
            html += `<p class="rest-hint">🧘 休息 · 让身体充分恢复</p>`;
        }

        html += `</div>`;
    });

    return html;
}

// ==================== 历史列表 ====================
// 渲染历史列表页面
async function renderHistoryPage() {
    const listBox = document.getElementById('historyList');

    let resp;
    try {
        resp = await apiGet('/api/plans');
    } catch (e) {
        listBox.innerHTML = `<p class="status-error">加载失败：${e.message}（请确保后端已启动）</p>`;
        return;
    }
    const items = resp.items || [];

    if (items.length === 0) {
        listBox.innerHTML = `
            <div class="empty-hint">
                <p class="icon">📭</p>
                <p class="text">还没有保存过任何计划</p>
                <button class="btn btn-yes" onclick="window.location.href='main.html'">去生成一份</button>
            </div>`;
        return;
    }

    let html = `<div class="history-list-header">
        <span class="count">共 ${items.length} 份历史计划</span>
        <button class="btn btn-no" id="clearAllBtn">清空全部</button>
    </div>`;

    html += '<ul class="history-summary-list">';
    items.forEach(item => {
        html += `<li class="history-summary">
            <div class="history-summary-meta">
                <div>
                    <div class="history-summary-title">📅 ${item.key}</div>
                    <div class="history-summary-sub">${item.trainingDays} 个训练日 · ${item.restDays} 个休息日${item.savedAt ? ' · ' + item.savedAt : ''}</div>
                </div>
                <div class="history-summary-actions">
                    <button class="btn btn-yes" data-action="view" data-key="${encodeURIComponent(item.key)}">查看详情</button>
                    <button class="btn btn-no" data-action="delete" data-key="${encodeURIComponent(item.key)}">删除</button>
                </div>
            </div>
        </li>`;
    });
    html += '</ul>';

    listBox.innerHTML = html;

    listBox.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = decodeURIComponent(btn.dataset.key);
            const action = btn.dataset.action;
            if (action === 'view') viewPlanDetail(key);
            if (action === 'delete') deletePlan(key);
        });
    });

    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            if (!confirm(`确定清空全部 ${items.length} 份历史计划吗？此操作不可恢复！`)) return;
            try {
                await apiDelete('/api/plans');
                alert('已清空全部历史计划');
                renderHistoryPage();
            } catch (e) {
                alert('清空失败：' + e.message);
            }
        });
    }
}

// ==================== 详情 & 删除 ====================
// 查看计划详情
async function viewPlanDetail(key) {
    try {
        const planData = await apiGet(`/api/plans/${encodeURIComponent(key)}`);
        const listBox = document.getElementById('historyList');

        let html = `<div class="detail-actions">
            <button class="btn btn-no" id="backBtn">← 返回列表</button>
            <button class="btn btn-no" id="deleteBtn">删除这份</button>
        </div>`;
        html += buildPlanHTML(planData);
        listBox.innerHTML = html;

        document.getElementById('backBtn').addEventListener('click', renderHistoryPage);
        document.getElementById('deleteBtn').addEventListener('click', () => deletePlan(key));
    } catch (e) {
        alert('加载失败：' + e.message);
        renderHistoryPage();
    }
}
// 删除计划
async function deletePlan(key) {
    if (!confirm(`确定删除「${key}」这份计划吗？`)) return;
    try {
        await apiDelete(`/api/plans/${encodeURIComponent(key)}`);
        alert('已删除');
        renderHistoryPage();
    } catch (e) {
        alert('删除失败：' + e.message);
    }
}

renderHistoryPage();