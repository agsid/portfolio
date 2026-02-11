// script.js
// Simple client-side loader that reads data/courses.json and data/assignments.json.
// Place this file at repo root. GitHub Pages will serve /data/*.json automatically.

// Utility helpers
const toLocalDate = (iso) => {
  try { return new Date(iso); } catch(e){ return null; }
};
const formatDue = (isoStr) => {
  const d = toLocalDate(isoStr);
  if(!d) return "No due date";
  return d.toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
};

let courses = [];
let assignments = [];

async function fetchJSON(path){
  try {
    const res = await fetch(path, {cache: "no-cache"});
    if (!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  } catch (err) {
    console.warn('Failed to load', path, err);
    return null;
  }
}

async function loadData(){
  const c = await fetchJSON('/data/courses.json') || await fetchJSON('data/courses.json');
  const a = await fetchJSON('/data/assignments.json') || await fetchJSON('data/assignments.json');
  courses = Array.isArray(c) ? c : [];
  assignments = Array.isArray(a) ? a : [];
  renderCourses();
  renderAssignments();
}

function renderCourses(){
  const list = document.getElementById('coursesList');
  list.innerHTML = '';
  courses.forEach(course=>{
    const div = document.createElement('div');
    div.className = 'p-3 rounded-lg flex items-center gap-3 hover:scale-[1.01] transition-transform';
    div.innerHTML = `
      <div style="width:44px;height:44px;border-radius:8px;background:${course.color || '#334155'};display:flex;align-items:center;justify-content:center;font-weight:700;color:white;">
        ${course.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
      </div>
      <div>
        <div class="font-medium">${course.name}</div>
        <div class="text-sm muted">${course.teacher} • ${course.room || ''}</div>
      </div>
      <div style="margin-left:auto">
        ${course.link ? `<a href="${course.link}" target="_blank" class="text-sm muted">Open</a>` : ''}
      </div>
    `;
    list.appendChild(div);
  });
}

function renderAssignments(){
  const root = document.getElementById('assignmentsList');
  root.innerHTML = '';
  // sort by due date ascending
  const sorted = assignments.slice().sort((a,b)=>{
    const da = new Date(a.due || 0).getTime();
    const db = new Date(b.due || 0).getTime();
    return (da || 0) - (db || 0);
  });

  document.getElementById('assignCount').textContent = `${sorted.length} items`;

  sorted.forEach(assign=>{
    const course = courses.find(c=>c.id === assign.courseId) || {};
    const card = document.createElement('div');
    card.className = 'p-3 rounded-lg border border-white/5 flex items-start gap-3';
    card.innerHTML = `
      <div style="width:10px;height:44px;border-radius:6px;background:${course.color || '#7c3aed'};margin-top:4px;"></div>
      <div style="flex:1">
        <div class="font-medium">${assign.title}</div>
        <div class="text-sm muted">${course.name || 'No course'}</div>
        <div class="text-sm muted mt-2">Due: <strong>${formatDue(assign.due)}</strong></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:end">
        ${assign.link ? `<a class="text-sm muted" href="${assign.link}" target="_blank">Open</a>` : ''}
        <div class="text-xs muted">${assign.status || ''}</div>
      </div>
    `;
    root.appendChild(card);
  });
}

// Search courses
document.getElementById('search').addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('#coursesList > div').forEach(div=>{
    const text = div.innerText.toLowerCase();
    div.style.display = text.includes(q) ? '' : 'none';
  });
});

// Refresh button: reload data
document.getElementById('refresh').addEventListener('click', loadData);

// Modal editor for assignments (simple)
document.getElementById('add-course').addEventListener('click', ()=>{
  // open modal with assignments JSON for quick edit
  const modal = document.getElementById('modal');
  const editor = document.getElementById('jsonEditor');
  modal.classList.remove('hidden');
  editor.value = JSON.stringify(assignments, null, 2);
});

document.getElementById('closeModal').addEventListener('click', ()=>{
  document.getElementById('modal').classList.add('hidden');
});

document.getElementById('saveJson').addEventListener('click', ()=>{
  const txt = document.getElementById('jsonEditor').value;
  try {
    const parsed = JSON.parse(txt);
    assignments = Array.isArray(parsed) ? parsed : assignments;
    renderAssignments();
    alert('Saved locally in page session. To persist permanently, paste this JSON into /data/assignments.json in your repo.');
    document.getElementById('modal').classList.add('hidden');
  } catch(e){
    alert('Invalid JSON: ' + e.message);
  }
});

// keyboard: press R to reload
document.addEventListener('keydown', (e)=>{
  if(e.key === 'r' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    loadData();
  }
});

loadData();
