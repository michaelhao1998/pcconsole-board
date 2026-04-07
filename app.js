// ===== Supabase 配置 =====
const SUPABASE_URL = 'https://iczpfjjzcqwxjmbwskyr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tQ87RglYgFskm0jB7_pufA_-B5ksNmf';
const API = `${SUPABASE_URL}/rest/v1`;
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object`;
const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function uploadImage(file) {
  const ext = file.name.split('.').pop();
  const name = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
  const res = await fetch(`${STORAGE_URL}/progress-images/${name}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': file.type },
    body: file
  });
  if (!res.ok) throw new Error('图片上传失败');
  return `${STORAGE_URL}/public/progress-images/${name}`;
}

// ===== 预设选项 =====
const PROJECTS = ['DF','Highguard','Fate trigger','Wonderland','The Cube','CFH','粒粒小人国','HOKW','ABI','POE2','湮灭之潮','soulframe','Dune','Project Spirit','Terminal brigade','Exborne','Project T','B4B2','Exterminauts','Roco Kingdom','Project Hi Game','Zoopunk','Last Sentinel','Project Raid','Dread Merdian','不涉及具体项目'];
const PLATFORMS = ['PlayStation','Xbox','Steam','Epic','TT','twitch','Tap','小黑盒','其他平台（标注具体平台）','内部运营信息','不涉及具体平台'];
const TYPES = ['业务落地','平台合作进展','项目组支持','风险提示','信息输入'];
const IMPORTANCE = ['重要','次重要','日常'];
const SCOPES = ['IEG','IEG Global'];
const PEOPLE = ['Jacob','Jim','Allen','Anna','Ailsa','Rita','Angela','Ryan','Michael'];
const ADMIN_NAME = 'Michael';

// ===== Supabase API 封装 =====
async function fetchProgress() {
  const res = await fetch(`${API}/progress?select=*,progress_updates(*)&order=created_at.desc`, { headers: HEADERS });
  if (!res.ok) throw new Error('加载数据失败');
  return await res.json();
}

async function insertProgress(records) {
  const res = await fetch(`${API}/progress`, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify(records)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || '提交失败'); }
  return await res.json();
}

async function insertUpdate(record) {
  const res = await fetch(`${API}/progress_updates`, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify(record)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || '更新失败'); }
  return await res.json();
}

async function updateProgress(id, data) {
  const res = await fetch(`${API}/progress?id=eq.${id}`, {
    method: 'PATCH', headers: HEADERS,
    body: JSON.stringify(data)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || '修改失败'); }
  return await res.json();
}

async function deleteProgress(id) {
  await fetch(`${API}/progress_updates?progress_id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
  const res = await fetch(`${API}/progress?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || '删除失败'); }
}

// ===== 管理员判断 =====
const ADMIN_PASSWORD = 'pcconsole2026';
let currentUser = localStorage.getItem('pcboard_user') || '';
let adminLoggedIn = sessionStorage.getItem('pcboard_admin') === 'true';

function isAdmin() { return adminLoggedIn; }
function setCurrentUser(name) { currentUser = name; localStorage.setItem('pcboard_user', name); }
function canEdit(record) { return isAdmin() || record.person === currentUser; }

function showAdminLogin() {
  if (adminLoggedIn) return;
  const pwd = prompt('请输入管理员密码：');
  if (pwd === null) return;
  if (pwd === ADMIN_PASSWORD) {
    adminLoggedIn = true;
    sessionStorage.setItem('pcboard_admin', 'true');
    setCurrentUser('Michael');
    updateAdminUI();
    showToast('✅ 管理员登录成功');
    renderDashboard();
  } else {
    showToast('❌ 密码错误', 'var(--red)');
  }
}

function adminLogout() {
  adminLoggedIn = false;
  sessionStorage.removeItem('pcboard_admin');
  updateAdminUI();
  showToast('已退出管理员模式');
  renderDashboard();
}

function updateAdminUI() {
  const area = document.getElementById('admin-area');
  if (adminLoggedIn) {
    area.innerHTML = `<div class="admin-logged">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
      <span>管理员</span>
      <button class="admin-logout" onclick="adminLogout()">退出</button>
    </div>`;
  } else {
    area.innerHTML = `<button class="nav-btn" id="admin-login-btn" onclick="showAdminLogin()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      <span>管理员登录</span>
    </button>`;
  }
}

// ===== 全局数据缓存 =====
let allData = [];

// ===== 视图切换 =====
function switchView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  if (v === 'dashboard') loadAndRenderDashboard();
  if (v === 'agent') agentInit();
  if (v === 'input') {
    document.getElementById('input-title').textContent = '录入工作进展';
    document.getElementById('input-subtitle').textContent = '支持一次性录入多条进展';
    initInputForms();
  }
}

// ===== 看板渲染 =====
async function loadAndRenderDashboard() {
  try {
    showLoading(true);
    allData = await fetchProgress();
    renderDashboard();
  } catch (e) {
    showToast('❌ ' + e.message, 'var(--red)');
  } finally {
    showLoading(false);
  }
}

function renderDashboard() {
  const data = allData;
  const fp = document.getElementById('filter-project').value;
  const fpl = document.getElementById('filter-platform').value;
  const fpe = document.getElementById('filter-person').value;
  let filtered = data;
  if (fp) filtered = filtered.filter(d => d.project === fp);
  if (fpl) filtered = filtered.filter(d => d.platform === fpl);
  if (fpe) filtered = filtered.filter(d => {
    const people = [d.person, ...(d.progress_updates || []).map(u => u.person)];
    return people.includes(fpe);
  });

  const projects = new Set(data.map(d => d.project));
  const persons = new Set(data.map(d => d.person));
  document.getElementById('stats-bar').innerHTML = `
    <div class="stat-card"><div class="stat-icon blue">📊</div><div><div class="stat-num">${data.length}</div><div class="stat-label">总进展条目</div></div></div>
    <div class="stat-card"><div class="stat-icon green">🎮</div><div><div class="stat-num">${projects.size}</div><div class="stat-label">涉及项目</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">👥</div><div><div class="stat-num">${persons.size}</div><div class="stat-label">参与人员</div></div></div>
    <div class="stat-card"><div class="stat-icon orange">📅</div><div><div class="stat-num">${getThisWeekCount(data)}</div><div class="stat-label">本周新增</div></div></div>`;

  populateFilter('filter-project', [...new Set(data.map(d => d.project))], fp);
  populateFilter('filter-platform', [...new Set(data.map(d => d.platform))], fpl);
  populateFilter('filter-person', [...new Set(data.flatMap(d => [d.person, ...(d.progress_updates || []).map(u => u.person)]))], fpe);

  const grid = document.getElementById('dashboard-grid');
  const empty = document.getElementById('empty-state');
  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (data.length === 0) { empty.style.display = 'block'; }
    else { empty.style.display = 'none'; grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-sec)">当前筛选条件下无匹配记录</div>'; }
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = filtered.map(d => {
    const updates = d.progress_updates || [];
    const updateCount = updates.length;
    const latestInfo = updateCount > 0 ? updates[updateCount - 1].info : d.info;
    const latestTodo = updateCount > 0 ? (updates[updateCount - 1].todo || d.todo) : d.todo;
    const impClass = d.importance === '重要' ? 'imp-high' : d.importance === '次重要' ? 'imp-mid' : 'imp-low';
    return `<div class="progress-card" onclick="openDetail('${d.id}')">
      <div class="type-bar ${d.type}"></div>
      <div class="card-top">
        <div>
          <div class="card-project">${esc(d.project)}</div>
          <div class="card-meta">
            ${d.importance ? `<span class="tag tag-importance ${impClass}">${esc(d.importance)}</span>` : ''}
            ${d.scope ? `<span class="tag tag-scope">${esc(d.scope)}</span>` : ''}
            <span class="tag tag-platform">${esc(d.platform)}</span>
            <span class="tag tag-type">${esc(d.type)}</span>
            <span class="tag tag-person">${esc(d.person)}</span>
          </div>
        </div>
        <div class="card-date">${formatDate(d.created_at)}</div>
      </div>
      <div class="card-body"><div class="card-info">${esc(latestInfo)}</div></div>
      <div class="card-footer">
        <div class="card-todo">${latestTodo ? '📌 ' + esc(latestTodo) : '暂无待办'}</div>
        ${updateCount > 0 ? `<div class="card-updates">🔄 ${updateCount}次更新</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function populateFilter(id, options, current) {
  const sel = document.getElementById(id);
  const label = sel.options[0].text;
  sel.innerHTML = `<option value="">${label}</option>` + options.sort().map(o => `<option value="${esc(o)}" ${o === current ? 'selected' : ''}>${esc(o)}</option>`).join('');
}

function getThisWeekCount(data) {
  const now = new Date(); const d = now.getDay() || 7;
  const mon = new Date(now); mon.setDate(now.getDate() - (d - 1)); mon.setHours(0, 0, 0, 0);
  return data.filter(r => new Date(r.created_at) >= mon).length;
}

// ===== 录入表单 =====
let formCount = 0;
function initInputForms() { formCount = 0; document.getElementById('input-forms').innerHTML = ''; addFormEntry(); }

function addFormEntry() {
  formCount++;
  const id = 'entry-' + formCount;
  const html = `<div class="form-entry" id="${id}">
    <div class="form-entry-header">
      <span class="form-entry-num">第 ${formCount} 条</span>
      ${formCount > 1 ? `<button class="btn-danger" onclick="removeEntry('${id}')">移除</button>` : ''}
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">项目 *<span class="form-hint">下拉选项仅供参考，支持手动输入</span></label>
        <div class="combo-input">
          <input class="form-input" data-field="project" placeholder="选择或输入项目" onfocus="showCombo(this)" oninput="filterCombo(this)" autocomplete="off">
          <div class="combo-dropdown">${PROJECTS.map(p => `<div class="combo-option" onclick="selectCombo(this)">${esc(p)}</div>`).join('')}</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">业务范围 *</label>
        <select class="form-select" data-field="scope"><option value="">请选择</option>${SCOPES.map(s => `<option>${esc(s)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">平台 *</label>
        <select class="form-select" data-field="platform"><option value="">请选择</option>${PLATFORMS.map(p => `<option>${esc(p)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">进展类型 *</label>
        <select class="form-select" data-field="type"><option value="">请选择</option>${TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">重要性 *</label>
        <select class="form-select" data-field="importance"><option value="">请选择</option>${IMPORTANCE.map(i => `<option>${esc(i)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">填写人 *</label>
        <div class="combo-input">
          <input class="form-input" data-field="person" placeholder="选择或输入姓名" onfocus="showCombo(this)" oninput="filterCombo(this)" autocomplete="off" value="${esc(currentUser)}">
          <div class="combo-dropdown">${PEOPLE.map(p => `<div class="combo-option" onclick="selectCombo(this)">${esc(p)}</div>`).join('')}</div>
        </div>
      </div>
      <div class="form-group full">
        <label class="form-label">核心信息 *（主要进展/重点问题/核心数据）</label>
        <textarea class="form-textarea" data-field="info" rows="3" placeholder="请输入核心进展信息..."></textarea>
      </div>
      <div class="form-group half">
        <label class="form-label">对应待办 to do（待讨论问题/时间/相关人）</label>
        <textarea class="form-textarea" data-field="todo" rows="2" placeholder="选填"></textarea>
      </div>
      <div class="form-group half">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" data-field="remark" rows="2" placeholder="选填"></textarea>
      </div>
      <div class="form-group full">
        <label class="form-label">图片附件（可选，支持多张）</label>
        <div class="img-upload-area" data-field="images">
          <input type="file" accept="image/*" multiple class="img-file-input" onchange="handleImageSelect(this)">
          <div class="img-upload-placeholder">📷 点击或拖拽上传图片</div>
          <div class="img-preview-list"></div>
        </div>
      </div>
    </div>
  </div>`;
  document.getElementById('input-forms').insertAdjacentHTML('beforeend', html);
  document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeEntry(id) { document.getElementById(id).remove(); }

// 图片处理
function handleImageSelect(input) {
  const files = Array.from(input.files);
  const preview = input.closest('.img-upload-area').querySelector('.img-preview-list');
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const item = document.createElement('div');
      item.className = 'img-preview-item';
      item.innerHTML = `<img src="${e.target.result}"><button class="img-remove" onclick="this.parentElement.remove()">×</button>`;
      item._file = file;
      preview.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

async function uploadEntryImages(entry) {
  const items = entry.querySelectorAll('.img-preview-item');
  const urls = [];
  for (const item of items) {
    if (item._file) {
      const url = await uploadImage(item._file);
      urls.push(url);
    }
  }
  return urls;
}

// Combo box
function showCombo(input) {
  const dd = input.nextElementSibling;
  document.querySelectorAll('.combo-dropdown.show').forEach(d => { if (d !== dd) d.classList.remove('show') });
  dd.classList.add('show');
  filterCombo(input);
}
function filterCombo(input) {
  const dd = input.nextElementSibling;
  const val = input.value.toLowerCase();
  dd.querySelectorAll('.combo-option').forEach(o => {
    o.style.display = o.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
}
function selectCombo(option) {
  const dd = option.parentElement;
  dd.previousElementSibling.value = option.textContent;
  dd.classList.remove('show');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.combo-input')) document.querySelectorAll('.combo-dropdown.show').forEach(d => d.classList.remove('show'));
});

// 提交到 Supabase
async function submitAll() {
  const entries = document.querySelectorAll('.form-entry');
  const records = [];
  for (const entry of entries) {
    const project = entry.querySelector('[data-field="project"]').value.trim();
    const scope = entry.querySelector('[data-field="scope"]').value;
    const platform = entry.querySelector('[data-field="platform"]').value;
    const type = entry.querySelector('[data-field="type"]').value;
    const importance = entry.querySelector('[data-field="importance"]').value;
    const person = entry.querySelector('[data-field="person"]').value.trim();
    const info = entry.querySelector('[data-field="info"]').value.trim();
    const todo = entry.querySelector('[data-field="todo"]').value.trim();
    const remark = entry.querySelector('[data-field="remark"]').value.trim();
    if (!project || !scope || !platform || !type || !importance || !person || !info) {
      entry.style.borderColor = 'var(--red)';
      showToast('❌ 请填写所有必填项（标 * 字段）', 'var(--red)');
      return;
    }
    setCurrentUser(person);
    records.push({ project, scope, platform, type, importance, person, info, todo, remark });
  }
  try {
    showLoading(true);
    // 上传图片
    const entryArr = Array.from(entries);
    for (let i = 0; i < records.length; i++) {
      const imgUrls = await uploadEntryImages(entryArr[i]);
      if (imgUrls.length > 0) records[i].images = imgUrls;
    }
    await insertProgress(records);
    showToast(`✅ 成功提交 ${records.length} 条工作进展`);
    switchView('dashboard');
  } catch (e) {
    showToast('❌ ' + e.message, 'var(--red)');
  } finally {
    showLoading(false);
  }
}

// ===== 详情弹窗 & 续录 & 编辑 =====
function openDetail(id) {
  const d = allData.find(r => r.id === id);
  if (!d) return;
  const updates = d.progress_updates || [];
  const editable = canEdit(d);
  const impClass = d.importance === '重要' ? 'imp-high' : d.importance === '次重要' ? 'imp-mid' : 'imp-low';
  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h2>${esc(d.project)}</h2>
        <p class="subtitle">创建于 ${formatDate(d.created_at)} · ${esc(d.person)}</p>
      </div>
      <div style="display:flex;gap:6px">
        ${editable ? `<button class="btn-outline btn-sm" onclick="openEditMode('${d.id}')">✏️ 修改</button>` : ''}
        ${isAdmin() ? `<button class="btn-danger btn-sm" onclick="confirmDelete('${d.id}')">🗑️ 删除</button>` : ''}
      </div>
    </div>
    <div class="detail-tags" style="margin-bottom:18px">
      ${d.importance ? `<span class="tag tag-importance ${impClass}">${esc(d.importance)}</span>` : ''}
      ${d.scope ? `<span class="tag tag-scope">${esc(d.scope)}</span>` : ''}
      <span class="tag tag-platform">${esc(d.platform)}</span>
      <span class="tag tag-type">${esc(d.type)}</span>
    </div>
    <div class="detail-section"><h4>核心信息</h4><p>${esc(d.info).replace(/\n/g, '<br>')}</p></div>
    ${d.todo ? `<div class="detail-section"><h4>对应待办</h4><p>${esc(d.todo).replace(/\n/g, '<br>')}</p></div>` : ''}
    ${d.remark ? `<div class="detail-section"><h4>备注</h4><p>${esc(d.remark).replace(/\n/g, '<br>')}</p></div>` : ''}
    ${d.images && d.images.length > 0 ? `<div class="detail-section"><h4>图片附件</h4><div class="detail-images">${d.images.map(url => `<img src="${esc(url)}" class="detail-img" onclick="window.open('${esc(url)}','_blank')">`).join('')}</div></div>` : ''}
    ${updates.length > 0 ? `<div class="timeline"><h3>📜 更新记录 (${updates.length})</h3>${updates.map(u => `
      <div class="timeline-item">
        <div class="timeline-date">${formatDate(u.created_at)} · ${esc(u.person)}</div>
        <div class="timeline-text">${esc(u.info).replace(/\n/g, '<br>')}</div>
        ${u.todo ? `<div style="font-size:12px;color:var(--text-sec);margin-top:4px">📌 ${esc(u.todo)}</div>` : ''}
        ${u.images && u.images.length > 0 ? `<div class="detail-images" style="margin-top:6px">${u.images.map(url => `<img src="${esc(url)}" class="detail-img" style="width:80px;height:60px" onclick="window.open('${esc(url)}','_blank')">`).join('')}</div>` : ''}
      </div>`).join('')}</div>` : ''}
    <div class="modal-form">
      <h3>📝 续录后续进展</h3>
      <div class="form-grid">
        <div class="form-group full"><label class="form-label">核心信息 *</label><textarea class="form-textarea" id="modal-info" rows="3" placeholder="请输入后续进展..."></textarea></div>
        <div class="form-group"><label class="form-label">对应待办</label><textarea class="form-textarea" id="modal-todo" rows="2" placeholder="选填"></textarea></div>
        <div class="form-group"><label class="form-label">填写人 *</label>
          <div class="combo-input"><input class="form-input" id="modal-person" placeholder="选择或输入" value="${esc(currentUser || d.person)}" onfocus="showCombo(this)" oninput="filterCombo(this)" autocomplete="off">
          <div class="combo-dropdown">${PEOPLE.map(p => `<div class="combo-option" onclick="selectCombo(this)">${esc(p)}</div>`).join('')}</div></div>
        </div>
        <div class="form-group full">
          <label class="form-label">图片附件（可选）</label>
          <div class="img-upload-area" id="modal-images">
            <input type="file" accept="image/*" multiple class="img-file-input" onchange="handleImageSelect(this)">
            <div class="img-upload-placeholder">📷 点击或拖拽上传图片</div>
            <div class="img-preview-list"></div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn-primary" onclick="submitUpdate('${d.id}')">提交更新</button>
        <button class="btn-outline" onclick="closeModal()">取消</button>
      </div>
    </div>`;
  document.getElementById('modal-overlay').classList.add('show');
}

// 编辑模式
function openEditMode(id) {
  const d = allData.find(r => r.id === id);
  if (!d) return;
  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <h2>✏️ 修改进展记录</h2>
    <p class="subtitle">${esc(d.project)} · ${esc(d.person)}</p>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;margin-top:16px">
      <div class="form-group">
        <label class="form-label">项目 *</label>
        <div class="combo-input">
          <input class="form-input" id="edit-project" value="${esc(d.project)}" onfocus="showCombo(this)" oninput="filterCombo(this)" autocomplete="off">
          <div class="combo-dropdown">${PROJECTS.map(p => `<div class="combo-option" onclick="selectCombo(this)">${esc(p)}</div>`).join('')}</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">业务范围 *</label>
        <select class="form-select" id="edit-scope">${SCOPES.map(s => `<option ${s === d.scope ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">平台 *</label>
        <select class="form-select" id="edit-platform">${PLATFORMS.map(p => `<option ${p === d.platform ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">进展类型 *</label>
        <select class="form-select" id="edit-type">${TYPES.map(t => `<option ${t === d.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">重要性 *</label>
        <select class="form-select" id="edit-importance">${IMPORTANCE.map(i => `<option ${i === d.importance ? 'selected' : ''}>${esc(i)}</option>`).join('')}</select>
      </div>
      <div class="form-group full">
        <label class="form-label">核心信息 *</label>
        <textarea class="form-textarea" id="edit-info" rows="3">${esc(d.info)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">对应待办</label>
        <textarea class="form-textarea" id="edit-todo" rows="2">${esc(d.todo || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" id="edit-remark" rows="2">${esc(d.remark || '')}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:18px">
      <button class="btn-primary" onclick="submitEdit('${d.id}')">保存修改</button>
      <button class="btn-outline" onclick="openDetail('${d.id}')">取消</button>
    </div>`;
}

async function submitEdit(id) {
  const project = document.getElementById('edit-project').value.trim();
  const scope = document.getElementById('edit-scope').value;
  const platform = document.getElementById('edit-platform').value;
  const type = document.getElementById('edit-type').value;
  const importance = document.getElementById('edit-importance').value;
  const info = document.getElementById('edit-info').value.trim();
  const todo = document.getElementById('edit-todo').value.trim();
  const remark = document.getElementById('edit-remark').value.trim();
  if (!project || !scope || !platform || !type || !importance || !info) {
    showToast('❌ 请填写所有必填项', 'var(--red)'); return;
  }
  try {
    showLoading(true);
    await updateProgress(id, { project, scope, platform, type, importance, info, todo, remark });
    closeModal();
    await loadAndRenderDashboard();
    showToast('✅ 修改已保存');
  } catch (e) {
    showToast('❌ ' + e.message, 'var(--red)');
  } finally {
    showLoading(false);
  }
}

async function confirmDelete(id) {
  if (!confirm('确定要删除这条进展及其所有更新记录吗？此操作不可撤销。')) return;
  try {
    showLoading(true);
    await deleteProgress(id);
    closeModal();
    await loadAndRenderDashboard();
    showToast('✅ 已删除');
  } catch (e) {
    showToast('❌ ' + e.message, 'var(--red)');
  } finally {
    showLoading(false);
  }
}

async function submitUpdate(progressId) {
  const info = document.getElementById('modal-info').value.trim();
  const todo = document.getElementById('modal-todo').value.trim();
  const person = document.getElementById('modal-person').value.trim();
  if (!info || !person) { showToast('❌ 请填写核心信息和填写人', 'var(--red)'); return; }
  setCurrentUser(person);
  try {
    showLoading(true);
    const imgArea = document.getElementById('modal-images');
    const imgUrls = await uploadEntryImages(imgArea);
    const record = { progress_id: progressId, info, todo, person };
    if (imgUrls.length > 0) record.images = imgUrls;
    await insertUpdate(record);
    closeModal();
    await loadAndRenderDashboard();
    showToast('✅ 后续进展已更新');
  } catch (e) {
    showToast('❌ ' + e.message, 'var(--red)');
  } finally {
    showLoading(false);
  }
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('show'); }

// ===== 工具函数 =====
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function showToast(msg, bg) {
  const t = document.createElement('div'); t.className = 'toast'; if (bg) t.style.background = bg; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
}
function showLoading(show) {
  let el = document.getElementById('loading-overlay');
  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-overlay';
      el.innerHTML = '<div class="loading-spinner"></div>';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
  } else if (el) {
    el.style.display = 'none';
  }
}

// ===== AI Agent 引擎 =====
async function agentInit(){
  try {
    showLoading(true);
    allData = await fetchProgress();
    agentRenderHealth();
  } catch(e){
    showToast('❌ '+e.message,'var(--red)');
  } finally {
    showLoading(false);
  }
}

// --- 数据健康度总览 ---
function agentRenderHealth(){
  const data = allData;
  const now = new Date();
  const dayOfWeek = now.getDay()||7;
  const monStart = new Date(now); monStart.setDate(now.getDate()-(dayOfWeek-1)); monStart.setHours(0,0,0,0);
  const thisWeek = data.filter(d=>new Date(d.created_at)>=monStart);
  const lastWeekStart = new Date(monStart); lastWeekStart.setDate(lastWeekStart.getDate()-7);
  const lastWeek = data.filter(d=>{const t=new Date(d.created_at);return t>=lastWeekStart&&t<monStart;});
  const weekDelta = thisWeek.length - lastWeek.length;
  const withTodo = data.filter(d=>d.todo&&d.todo.trim());
  const projects = new Set(data.map(d=>d.project));
  const missingProjects = PROJECTS.filter(p=>!projects.has(p)&&p!=='不涉及具体项目');
  const people = new Set(data.map(d=>d.person));
  const totalUpdates = data.reduce((s,d)=>(s+(d.progress_updates||[]).length),0);
  const avgUpdates = data.length>0?(totalUpdates/data.length).toFixed(1):'0';
  // 重要进展占比
  const impHigh = data.filter(d=>d.importance==='重要进展').length;
  const impMid = data.filter(d=>d.importance==='次重要进展').length;
  const impLow = data.filter(d=>d.importance==='日常进展').length;
  const noImp = data.filter(d=>!d.importance).length;

  document.getElementById('agent-health').innerHTML = `
    <div class="health-item"><div class="health-num">${data.length}</div><div class="health-label">总记录数</div></div>
    <div class="health-item"><div class="health-num">${thisWeek.length}<span class="health-delta ${weekDelta>=0?'up':'down'}">${weekDelta>=0?'↑':'↓'}${Math.abs(weekDelta)}</span></div><div class="health-label">本周录入 (vs 上周)</div></div>
    <div class="health-item"><div class="health-num">${projects.size}/${PROJECTS.length-1}</div><div class="health-label">项目覆盖率</div></div>
    <div class="health-item"><div class="health-num">${people.size}/${PEOPLE.length}</div><div class="health-label">人员参与率</div></div>
    <div class="health-item"><div class="health-num">${withTodo.length}</div><div class="health-label">含待办条目</div></div>
    <div class="health-item"><div class="health-num">${avgUpdates}</div><div class="health-label">平均更新次数</div></div>
    <div class="health-item"><div class="health-num imp-h">${impHigh}</div><div class="health-label">重要进展</div></div>
    <div class="health-item"><div class="health-num imp-m">${impMid}</div><div class="health-label">次重要进展</div></div>
    <div class="health-item"><div class="health-num">${impLow + noImp}</div><div class="health-label">日常/未标注</div></div>
    <div class="health-item"><div class="health-num">${missingProjects.length}</div><div class="health-label">未覆盖项目</div></div>`;
}

// --- 录入质量巡检 ---
function agentRunQuality(){
  const data = allData;
  const issues = [];
  // 1. 检查信息过短
  const shortInfo = data.filter(d=>d.info&&d.info.length<10);
  if(shortInfo.length) issues.push({level:'warn',msg:`${shortInfo.length} 条记录的核心信息不足10字，建议补充细节`,items:shortInfo.map(d=>`[${d.project}] ${d.info.substring(0,20)}...`)});
  // 2. 缺少待办
  const noTodo = data.filter(d=>!d.todo||!d.todo.trim());
  if(noTodo.length) issues.push({level:'info',msg:`${noTodo.length} 条记录未填写待办事项`,items:noTodo.slice(0,5).map(d=>`[${d.project}] by ${d.person}`)});
  // 3. 缺少重要性标注
  const noImp = data.filter(d=>!d.importance);
  if(noImp.length) issues.push({level:'warn',msg:`${noImp.length} 条记录未标注重要性`,items:noImp.slice(0,5).map(d=>`[${d.project}] by ${d.person}`)});
  // 4. 重复项目+平台组合（同天）
  const dayMap = {};
  data.forEach(d=>{
    const day = (d.created_at||'').substring(0,10);
    const key = `${d.project}|${d.platform}|${day}`;
    dayMap[key]=(dayMap[key]||0)+1;
  });
  const dupes = Object.entries(dayMap).filter(([,c])=>c>1);
  if(dupes.length) issues.push({level:'info',msg:`${dupes.length} 组同日同项目同平台重复录入`,items:dupes.slice(0,5).map(([k,c])=>`${k.replace(/\|/g,' · ')} (${c}条)`)});
  // 5. 超过7天未更新的记录
  const now = new Date();
  const stale = data.filter(d=>{
    const updates = d.progress_updates||[];
    const lastDate = updates.length>0?updates[updates.length-1].created_at:d.created_at;
    return (now-new Date(lastDate))/(1000*60*60*24)>7;
  });
  if(stale.length) issues.push({level:'warn',msg:`${stale.length} 条记录超过7天无更新，建议跟进`,items:stale.slice(0,5).map(d=>`[${d.project}] ${d.person} - 最后更新: ${formatDate(getLastUpdate(d))}`)});

  if(issues.length===0) issues.push({level:'ok',msg:'✅ 所有录入质量良好，未发现异常'});
  renderAgentReport('agent-quality', issues);
}

function getLastUpdate(d){
  const updates = d.progress_updates||[];
  return updates.length>0?updates[updates.length-1].created_at:d.created_at;
}

// --- 周报自动生成 ---
function agentGenWeekly(){
  const data = allData;
  const now = new Date();
  const dayOfWeek = now.getDay()||7;
  const monStart = new Date(now); monStart.setDate(now.getDate()-(dayOfWeek-1)); monStart.setHours(0,0,0,0);
  const thisWeek = data.filter(d=>new Date(d.created_at)>=monStart);

  if(thisWeek.length===0){
    document.getElementById('agent-weekly').innerHTML = '<div class="agent-empty">本周暂无录入数据</div>';
    return;
  }

  // 按重要性分组
  const groups = {important:[],subimportant:[],daily:[]};
  thisWeek.forEach(d=>{
    if(d.importance==='重要进展') groups.important.push(d);
    else if(d.importance==='次重要进展') groups.subimportant.push(d);
    else groups.daily.push(d);
  });

  // 按类型统计
  const typeCounts = {};
  thisWeek.forEach(d=>{typeCounts[d.type]=(typeCounts[d.type]||0)+1;});

  // 按人员统计
  const personCounts = {};
  thisWeek.forEach(d=>{personCounts[d.person]=(personCounts[d.person]||0)+1;});

  const weekLabel = `${monStart.getMonth()+1}/${monStart.getDate()} - ${now.getMonth()+1}/${now.getDate()}`;

  let html = `<div class="weekly-report">
    <div class="weekly-header">📅 本周进展周报 (${weekLabel})</div>
    <div class="weekly-summary">共 <strong>${thisWeek.length}</strong> 条进展，涉及 <strong>${new Set(thisWeek.map(d=>d.project)).size}</strong> 个项目，<strong>${new Set(thisWeek.map(d=>d.person)).size}</strong> 位成员参与</div>`;

  if(groups.important.length>0){
    html += `<div class="weekly-section"><h4>🔴 重要进展 (${groups.important.length})</h4><ul>${groups.important.map(d=>
      `<li><strong>[${esc(d.project)}]</strong> ${esc(d.info.substring(0,80))}${d.info.length>80?'...':''} <span class="weekly-meta">${esc(d.person)} · ${esc(d.platform)}</span></li>`
    ).join('')}</ul></div>`;
  }
  if(groups.subimportant.length>0){
    html += `<div class="weekly-section"><h4>🟡 次重要进展 (${groups.subimportant.length})</h4><ul>${groups.subimportant.map(d=>
      `<li><strong>[${esc(d.project)}]</strong> ${esc(d.info.substring(0,80))}${d.info.length>80?'...':''} <span class="weekly-meta">${esc(d.person)}</span></li>`
    ).join('')}</ul></div>`;
  }
  if(groups.daily.length>0){
    html += `<div class="weekly-section"><h4>🟢 日常进展 (${groups.daily.length})</h4><ul>${groups.daily.map(d=>
      `<li><strong>[${esc(d.project)}]</strong> ${esc(d.info.substring(0,60))}${d.info.length>60?'...':''} <span class="weekly-meta">${esc(d.person)}</span></li>`
    ).join('')}</ul></div>`;
  }

  // 待办汇总
  const todosThisWeek = thisWeek.filter(d=>d.todo&&d.todo.trim());
  if(todosThisWeek.length>0){
    html += `<div class="weekly-section"><h4>📌 本周待办事项 (${todosThisWeek.length})</h4><ul>${todosThisWeek.map(d=>
      `<li><strong>[${esc(d.project)}]</strong> ${esc(d.todo)} <span class="weekly-meta">${esc(d.person)}</span></li>`
    ).join('')}</ul></div>`;
  }

  html += `<div class="weekly-section"><h4>📊 类型分布</h4><div class="weekly-bars">${Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).map(([t,c])=>{
    const pct = Math.round(c/thisWeek.length*100);
    return `<div class="bar-row"><span class="bar-label">${esc(t)}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-val">${c} (${pct}%)</span></div>`;
  }).join('')}</div></div>`;

  html += `</div>`;
  document.getElementById('agent-weekly').innerHTML = html;
}

// --- 待办追踪 ---
function agentTrackTodos(){
  const data = allData;
  const issues = [];
  const withTodo = data.filter(d=>d.todo&&d.todo.trim());
  if(withTodo.length===0){
    issues.push({level:'ok',msg:'当前无待办事项'});
    renderAgentReport('agent-todos',issues);
    return;
  }

  // 按人员分组待办
  const personTodos = {};
  withTodo.forEach(d=>{
    if(!personTodos[d.person]) personTodos[d.person]=[];
    personTodos[d.person].push(d);
  });

  Object.entries(personTodos).forEach(([person,items])=>{
    issues.push({level:'info',msg:`${person} 有 ${items.length} 个待办跟进`,items:items.map(d=>`[${d.project}] ${d.todo.substring(0,50)}${d.todo.length>50?'...':''}`)});
  });

  // 超期待办（超过7天的待办没有后续更新）
  const now = new Date();
  const overdue = withTodo.filter(d=>{
    const updates = d.progress_updates||[];
    const lastDate = updates.length>0?updates[updates.length-1].created_at:d.created_at;
    return (now-new Date(lastDate))/(1000*60*60*24)>7;
  });
  if(overdue.length) issues.unshift({level:'warn',msg:`⚠️ ${overdue.length} 个待办超过7天未跟进`,items:overdue.slice(0,8).map(d=>`[${d.project}] ${d.person}: ${d.todo.substring(0,40)}`)});

  renderAgentReport('agent-todos', issues);
}

// --- 项目覆盖分析 ---
function agentCoverage(){
  const data = allData;
  const issues = [];
  const projectSet = new Set(data.map(d=>d.project));
  const allProjects = PROJECTS.filter(p=>p!=='不涉及具体项目');
  const covered = allProjects.filter(p=>projectSet.has(p));
  const uncovered = allProjects.filter(p=>!projectSet.has(p));
  const rate = Math.round(covered.length/allProjects.length*100);

  issues.push({level:rate>=80?'ok':rate>=50?'info':'warn',msg:`项目覆盖率: ${rate}% (${covered.length}/${allProjects.length})`});

  if(uncovered.length>0){
    issues.push({level:'warn',msg:`${uncovered.length} 个项目尚无任何进展记录`,items:uncovered});
  }

  // 每个项目的录入频率
  const projectCounts = {};
  data.forEach(d=>{projectCounts[d.project]=(projectCounts[d.project]||0)+1;});
  const sorted = Object.entries(projectCounts).sort((a,b)=>b[1]-a[1]);
  if(sorted.length>0){
    issues.push({level:'info',msg:'项目活跃度排名 (Top 10)',items:sorted.slice(0,10).map(([p,c])=>`${p}: ${c} 条记录`)});
  }

  // 平台覆盖
  const platSet = new Set(data.map(d=>d.platform));
  const allPlat = PLATFORMS.filter(p=>!p.includes('不涉及')&&!p.includes('其他'));
  const uncoveredPlat = allPlat.filter(p=>!platSet.has(p));
  if(uncoveredPlat.length>0){
    issues.push({level:'info',msg:`${uncoveredPlat.length} 个平台尚无覆盖`,items:uncoveredPlat});
  }

  renderAgentReport('agent-coverage', issues);
}

// --- 人员工作量分析 ---
function agentWorkload(){
  const data = allData;
  const issues = [];
  const personCounts = {};
  data.forEach(d=>{personCounts[d.person]=(personCounts[d.person]||0)+1;});
  const sorted = Object.entries(personCounts).sort((a,b)=>b[1]-a[1]);
  const avg = data.length>0?Math.round(data.length/PEOPLE.length):0;

  issues.push({level:'info',msg:`人均录入: ${avg} 条 | 总记录: ${data.length} 条`});

  // 各人员详情
  if(sorted.length>0){
    issues.push({level:'info',msg:'各成员录入量',items:sorted.map(([p,c])=>{
      const bar = '█'.repeat(Math.min(Math.round(c/2),20)) + (c>40?'...':'');
      return `${p}: ${c} 条 ${bar}`;
    })});
  }

  // 未参与人员
  const active = new Set(data.map(d=>d.person));
  const inactive = PEOPLE.filter(p=>!active.has(p));
  if(inactive.length>0){
    issues.push({level:'warn',msg:`${inactive.length} 位成员尚无录入记录`,items:inactive});
  }

  // 本周各人员工作量
  const now = new Date();
  const dayOfWeek = now.getDay()||7;
  const monStart = new Date(now); monStart.setDate(now.getDate()-(dayOfWeek-1)); monStart.setHours(0,0,0,0);
  const weekPerson = {};
  data.filter(d=>new Date(d.created_at)>=monStart).forEach(d=>{weekPerson[d.person]=(weekPerson[d.person]||0)+1;});
  const weekSorted = Object.entries(weekPerson).sort((a,b)=>b[1]-a[1]);
  if(weekSorted.length>0){
    issues.push({level:'info',msg:'本周各成员录入',items:weekSorted.map(([p,c])=>`${p}: ${c} 条`)});
  }

  renderAgentReport('agent-workload', issues);
}

// --- 风险预警雷达 ---
function agentRiskRadar(){
  const data = allData;
  const issues = [];

  // 1. 风险提示类进展
  const risks = data.filter(d=>d.type==='风险提示');
  if(risks.length>0){
    issues.push({level:'warn',msg:`🚨 ${risks.length} 条风险提示记录`,items:risks.slice(0,8).map(d=>`[${d.project}] ${d.person}: ${d.info.substring(0,50)}${d.info.length>50?'...':''}`)});
  }

  // 2. 重要进展无后续更新
  const important = data.filter(d=>d.importance==='重要进展');
  const now = new Date();
  const staleImportant = important.filter(d=>{
    const updates = d.progress_updates||[];
    const lastDate = updates.length>0?updates[updates.length-1].created_at:d.created_at;
    return (now-new Date(lastDate))/(1000*60*60*24)>5;
  });
  if(staleImportant.length>0){
    issues.push({level:'warn',msg:`⚠️ ${staleImportant.length} 条重要进展超过5天未更新`,items:staleImportant.map(d=>`[${d.project}] ${d.person}: ${d.info.substring(0,40)}...`)});
  }

  // 3. 本周录入下降
  const dayOfWeek = now.getDay()||7;
  const monStart = new Date(now); monStart.setDate(now.getDate()-(dayOfWeek-1)); monStart.setHours(0,0,0,0);
  const lastWeekStart = new Date(monStart); lastWeekStart.setDate(lastWeekStart.getDate()-7);
  const thisWeek = data.filter(d=>new Date(d.created_at)>=monStart).length;
  const lastWeek = data.filter(d=>{const t=new Date(d.created_at);return t>=lastWeekStart&&t<monStart;}).length;
  if(lastWeek>0 && thisWeek<lastWeek*0.5){
    issues.push({level:'warn',msg:`📉 本周录入量 (${thisWeek}) 较上周 (${lastWeek}) 下降超50%，建议关注`});
  }

  // 4. 单一人员负载过重
  const personCounts = {};
  data.filter(d=>new Date(d.created_at)>=monStart).forEach(d=>{personCounts[d.person]=(personCounts[d.person]||0)+1;});
  const heavy = Object.entries(personCounts).filter(([,c])=>c>10);
  if(heavy.length>0){
    issues.push({level:'info',msg:'本周录入量高的成员（>10条）',items:heavy.map(([p,c])=>`${p}: ${c} 条`)});
  }

  if(issues.length===0) issues.push({level:'ok',msg:'✅ 未检测到明显风险，运营状态健康'});
  renderAgentReport('agent-risk', issues);
}

// --- Agent 运营建议 ---
function agentSuggestions(){
  const data = allData;
  const issues = [];
  const now = new Date();
  const dayOfWeek = now.getDay()||7;
  const monStart = new Date(now); monStart.setDate(now.getDate()-(dayOfWeek-1)); monStart.setHours(0,0,0,0);
  const thisWeek = data.filter(d=>new Date(d.created_at)>=monStart);

  // 覆盖率建议
  const projectSet = new Set(data.map(d=>d.project));
  const uncovered = PROJECTS.filter(p=>p!=='不涉及具体项目'&&!projectSet.has(p));
  if(uncovered.length>5){
    issues.push({level:'warn',msg:`📋 建议：${uncovered.length} 个项目无记录，建议安排专人覆盖：${uncovered.slice(0,5).join('、')}${uncovered.length>5?'等':''}`});
  }

  // 重要性标注建议
  const noImp = data.filter(d=>!d.importance);
  if(noImp.length>0){
    issues.push({level:'info',msg:`🏷️ 建议：${noImp.length} 条历史记录缺少"重要性"标注，建议补充完善，便于周报分级输出`});
  }

  // 更新频率建议
  const stale = data.filter(d=>{
    const updates = d.progress_updates||[];
    const lastDate = updates.length>0?updates[updates.length-1].created_at:d.created_at;
    return (now-new Date(lastDate))/(1000*60*60*24)>14;
  });
  if(stale.length>0){
    issues.push({level:'info',msg:`🔄 建议：${stale.length} 条记录超过14天未更新，建议逐条确认是否已结束或需续录`});
  }

  // 人员参与建议
  const active = new Set(data.map(d=>d.person));
  const inactive = PEOPLE.filter(p=>!active.has(p));
  if(inactive.length>0){
    issues.push({level:'info',msg:`👥 建议：${inactive.join('、')} 尚无录入记录，建议提醒参与信息录入`});
  }

  // 待办清理建议
  const withTodo = data.filter(d=>d.todo&&d.todo.trim());
  const oldTodos = withTodo.filter(d=>{
    const updates = d.progress_updates||[];
    const lastDate = updates.length>0?updates[updates.length-1].created_at:d.created_at;
    return (now-new Date(lastDate))/(1000*60*60*24)>10;
  });
  if(oldTodos.length>0){
    issues.push({level:'info',msg:`📌 建议：${oldTodos.length} 个待办已超10天未跟进，建议做一轮待办清理会`});
  }

  // 本周录入趋势
  if(thisWeek.length===0&&dayOfWeek>=3){
    issues.push({level:'warn',msg:`⏰ 本周已过半但录入量为0，建议提醒团队及时更新进展`});
  } else if(thisWeek.length>0){
    issues.push({level:'ok',msg:`✅ 本周已录入 ${thisWeek.length} 条进展，涉及 ${new Set(thisWeek.map(d=>d.project)).size} 个项目，保持节奏`});
  }

  if(issues.length===0) issues.push({level:'ok',msg:'✅ 看板运营状态良好，暂无额外建议'});
  renderAgentReport('agent-suggestions', issues);
}

// --- Agent 报告渲染 ---
function renderAgentReport(containerId, issues){
  const el = document.getElementById(containerId);
  el.innerHTML = issues.map(issue=>{
    const icon = issue.level==='ok'?'✅':issue.level==='warn'?'⚠️':'ℹ️';
    const cls = issue.level==='ok'?'agent-ok':issue.level==='warn'?'agent-warn':'agent-info';
    let html = `<div class="agent-issue ${cls}"><div class="agent-issue-header">${icon} ${esc(issue.msg)}</div>`;
    if(issue.items&&issue.items.length>0){
      html += `<ul class="agent-issue-list">${issue.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`;
    }
    html += '</div>';
    return html;
  }).join('');
}

// ===== 初始化 =====
window.addEventListener('DOMContentLoaded', () => { updateAdminUI(); loadAndRenderDashboard(); });
