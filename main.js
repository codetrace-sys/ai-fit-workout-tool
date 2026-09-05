const API_BASE = 'http://127.0.0.1:5000';

let currentPlanData = null;

// ==================== API 请求封装 ====================

async function apiGet(path) {
    const resp = await fetch(`${API_BASE}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || '请求失败');
    return data;
}

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

async function apiDelete(path) {
    const resp = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || '请求失败');
    return data;
}

// ==================== 表单 & 按钮 ====================

// 字段范围规则：id -> { min, max, label }
const FIELD_RULES = {
    height: { min: 50, max: 250, label: '身高' },
    weight: { min: 20, max: 200, label: '体重' },
    age: { min: 5, max: 120, label: '年龄' },
    days: { min: 1, max: 6, label: '每周训练天数' },
};

// 校验单个字段范围，返回错误消息（空字符串表示通过）
function validateField(id) {
    const input = document.getElementById(id);
    const rule = FIELD_RULES[id];
    if (!input || !rule) return '';

    const val = input.value.trim();
    const num = Number(val);

    if (val === '') {
        // 必填缺失不算范围错误，让 validateForm 统一处理
        return '';
    }
    if (isNaN(num)) {
        return `${rule.label}必须是数字`;
    }
    if (num < rule.min || num > rule.max) {
        return `${rule.label}应在 ${rule.min} ~ ${rule.max} 之间`;
    }
    return '';
}

// 给字段加上/清除错误样式
function setFieldError(id, errorMsg) {
    const input = document.getElementById(id);
    if (!input) return;
    clearFieldError(id);

    if (errorMsg) {
        input.classList.add('invalid');
        const err = document.createElement('span');
        err.className = 'field-error';
        err.textContent = errorMsg;
        input.parentNode.appendChild(err);
    }
}

// 清除字段错误样式
function clearFieldError(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.classList.remove('invalid');
    const err = input.parentNode.querySelector('.field-error');
    if (err) err.remove();
}

// 表单必填项 + 范围校验
function validateForm() {
    const fields = ['height', 'weight', 'age', 'days'];

    // 范围校验（每个字段失焦已经各自校验过了，但生成按钮再统一兜一遍）
    for (const id of fields) {
        const err = validateField(id);
        if (err) {
            setFieldError(id, err);
            return false;
        }
    }

    // 必填校验
    const height = document.getElementById('height').value.trim();
    const weight = document.getElementById('weight').value.trim();
    const age = document.getElementById('age').value.trim();
    const days = document.getElementById('days').value.trim();
    if (!height || !weight || !age || !days) {
        alert('请填写身高、体重、年龄、每周训练天数');
        return false;
    }
    return true;
}

// 收集表单数据，返回一个对象
function collectFormData() {
    return {
        height: document.getElementById('height').value,
        weight: document.getElementById('weight').value,
        age: document.getElementById('age').value,
        target: document.getElementById('target').value,
        days: document.getElementById('days').value,
        exp: document.getElementById('exp').value,
        tool: document.getElementById('tool').value,
    };
}

// 生成区存在内容，显示重新生成按钮，否则显示生成按钮
function updateGenerateBtn() {
    const btn = document.getElementById('generateBtn');
    btn.textContent = currentPlanData ? '重新生成计划' : '生成健身计划';
}

// 生成过程中显示生成中，按钮变灰
function updateGenerateBtnLoading(loading) {
    const btn = document.getElementById('generateBtn');
    if (loading) {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.textContent = '生成中...';
    } else {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = '生成健身计划';
    }
}

// ==================== 渲染 ====================

// 生成健身计划 HTML 字符串（只写标签和 class，样式由 CSS 控制）
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

// 将 HTML 字符串渲染到指定选择器
function renderTo(selector, html) {
    const box = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;
    if (!box) {
        console.error('renderTo: 找不到目标元素', selector);
        return;
    }
    box.innerHTML = html;
}

// ==================== 事件绑定 ====================

// 表单字段失焦时校验范围，输入时清除错误
Object.keys(FIELD_RULES).forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur', () => {
        const err = validateField(id);
        err ? setFieldError(id, err) : clearFieldError(id);
    });
    input.addEventListener('input', () => clearFieldError(id));
});

// 生成按钮：提交表单数据 -> 后端组 prompt -> AI 返回 JSON
document.getElementById('generateBtn').addEventListener('click', async () => {
    if (currentPlanData) {
        if (!confirm('当前已有生成的计划，确定要重新生成吗？')) return;
    }
    if (!validateForm()) return;

    const btn = document.getElementById('generateBtn');
    const resultBox = document.getElementById('result');
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.textContent = '⏳ 生成中...';
    resultBox.innerHTML = '';

    try {
        const data = await apiPost('/api/generate', collectFormData());
        currentPlanData = JSON.parse(data.content);
        renderTo('#result', buildPlanHTML(currentPlanData));
        updateGenerateBtn();
    } catch (e) {
        resultBox.innerHTML = `<p class="status-error">生成失败：${e.message}</p>`;
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        if (currentPlanData) {
            btn.textContent = '重新生成计划';
        } else {
            btn.textContent = originalText;
        }
    }
});

// 保存按钮：把当前计划发到后端写入 JSON 文件
document.getElementById('saveBtn').addEventListener('click', async () => {
    if (!currentPlanData) {
        alert('还没有生成计划，无法保存');
        return;
    }
    try {
        const data = await apiPost('/api/plans', currentPlanData);
        alert(`保存成功！\nKey：${data.key}`);
    } catch (e) {
        alert('保存失败：' + e.message);
        console.error(e);
    }
});

document.getElementById('showHistory').addEventListener('click', () => {
    window.location.href = 'history.html';
});