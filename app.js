// 공통 제출 로직. 각 페이지는 <form data-type="staff|parent">를 둔다.
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbz1CWduvR9HgTP7Ugr6bgZT-Rp34GgJwTpG4KpI0jp8ibb-Vy2KC1ij0v5VDDnIMTvF/exec';
const CLOSE_AT = new Date('2026-10-27T18:00:00+09:00');

function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

function deviceId() {
  let id = store('gm-device');
  if (!id) { id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); store('gm-device', id); }
  return id;
}

// 화면의 마감 시각이 지났으면 서버에 한 번 더 물어 본다(캐시된 옛 파일 대비, 서버 판단이 우선).
async function isOpen() {
  if (new Date() <= CLOSE_AT) return true;
  try { const res = await fetch(ENDPOINT, { cache: 'no-store' }); return !!(await res.json()).open; } catch (e) { return false; }
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('form[data-type]');
  if (!form) return;
  const type = form.dataset.type;
  const err = form.querySelector('.err');
  const btn = form.querySelector('button');

  if (!(await isOpen())) {
    form.classList.add('hidden');
    document.getElementById('closed').classList.remove('hidden');
    return;
  }
  if (store('gm-sent-' + type)) document.getElementById('again').classList.remove('hidden');

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    const data = { type, opinion: fd.get('opinion'), requirement: fd.get('requirement') || '', device: deviceId() };
    if (type === 'parent') {
      data.grade = fd.get('grade'); data.cls = fd.get('cls');
      if (!data.grade || !data.cls) { err.textContent = '학생의 학년과 반을 골라 주세요.'; return; }
    }
    if (!data.opinion) { err.textContent = '찬성 또는 반대를 골라 주세요.'; return; }
    btn.disabled = true; btn.textContent = '보내는 중…';
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(data) });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || '제출하지 못했습니다.');
      store('gm-sent-' + type, new Date().toISOString());
      form.classList.add('hidden');
      document.getElementById('again').classList.add('hidden');
      document.getElementById('done').classList.remove('hidden');
      window.scrollTo(0, 0);
    } catch (e) {
      err.textContent = (e.message && !/fetch|JSON/i.test(e.message)) ? e.message : '전송에 실패했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.';
      btn.disabled = false; btn.textContent = '제출하기';
    }
  });
});
