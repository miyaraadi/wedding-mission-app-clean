(function () {
  const params = new URLSearchParams(window.location.search);
  const missionId = params.get('mission');

  const missionNumberEl = document.getElementById('missionNumber');
  const missionTextEl = document.getElementById('missionText');
  const statusEl = document.getElementById('statusText');
  const missionView = document.getElementById('missionView');
  const successView = document.getElementById('successView');
  const captureInput = document.getElementById('captureInput');
  const chooseInput = document.getElementById('chooseInput');

  if (!missionId) {
    missionNumberEl.textContent = '';
    missionTextEl.textContent = 'לא נמצא קוד משימה. אנא סרקו שוב את קוד ה-QR שעל הכרטיס.';
    return;
  }

  missionNumberEl.textContent = `משימה #${missionId}`;

  fetch(`/api/mission/${encodeURIComponent(missionId)}`)
    .then((r) => {
      if (!r.ok) throw new Error('not found');
      return r.json();
    })
    .then((data) => {
      missionTextEl.textContent = data.mission_title;
    })
    .catch(() => {
      missionTextEl.textContent = 'המשימה לא נמצאה. בדקו את הקישור ונסו שוב.';
    });

  async function handleFile(file) {
    if (!file) return;

    statusEl.textContent = 'מעלים… אנא המתינו';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mission_id', missionId);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'ההעלאה נכשלה, נסו שוב.');
      }

      missionView.classList.add('hidden');
      successView.classList.remove('hidden');
    } catch (err) {
      statusEl.textContent = err.message || 'ההעלאה נכשלה, נסו שוב.';
    }
  }

  captureInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  chooseInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
})();
