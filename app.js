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

  const guestNameInput = document.getElementById('guestName');

  const selectedFileBox = document.getElementById('selectedFileBox');
  const selectedFileName = document.getElementById('selectedFileName');

  const uploadButton = document.getElementById('uploadButton');

  const loadingBox = document.getElementById('loadingBox');

  const whatsappAdi = document.getElementById('whatsappAdi');
  const whatsappNitay = document.getElementById('whatsappNitay');

  const ADI_PHONE = '972543330598';
  const NITAY_PHONE = '972523357812';

  let selectedFile = null;

  if (!missionId) {
    missionNumberEl.textContent = '';
    missionTextEl.textContent =
      'לא נמצא קוד משימה. אנא סרקו שוב את קוד ה-QR שעל הכרטיס.';
    return;
  }

  missionNumberEl.textContent = `#${missionId}`;

  fetch(`/api/mission/${encodeURIComponent(missionId)}`)
    .then((r) => {
      if (!r.ok) throw new Error('not found');
      return r.json();
    })
    .then((data) => {
      missionTextEl.textContent = data.mission_title;
    })
    .catch(() => {
      missionTextEl.textContent =
        'המשימה לא נמצאה. בדקו את הקישור ונסו שוב.';
    });

  function getGuestName() {
    return guestNameInput.value.trim();
  }

  function createWhatsappMessage() {
    let message =
      `היי ❤️ לא הצלחתי להעלות דרך האתר.\n` +
      `אני שולח/ת כאן את התמונה או הסרטון של משימה #${missionId}.`;

    const name = getGuestName();

    if (name) {
      message += `\nהשם שלי: ${name}`;
    }

    return message;
  }

  function createWhatsappLink(phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(
      createWhatsappMessage()
    )}`;
  }

  function updateWhatsappLinks() {
    whatsappAdi.href = createWhatsappLink(ADI_PHONE);
    whatsappNitay.href = createWhatsappLink(NITAY_PHONE);
  }

  updateWhatsappLinks();

  guestNameInput.addEventListener('input', updateWhatsappLinks);

  whatsappAdi.addEventListener('click', updateWhatsappLinks);
  whatsappNitay.addEventListener('click', updateWhatsappLinks);

  function selectFile(file) {
    if (!file) return;

    selectedFile = file;

    selectedFileName.textContent = file.name;

    selectedFileBox.classList.remove('hidden');
    uploadButton.classList.remove('hidden');

    statusEl.textContent = '';
  }

  captureInput.addEventListener('change', (e) => {
    selectFile(e.target.files[0]);
  });

  chooseInput.addEventListener('change', (e) => {
    selectFile(e.target.files[0]);
  });

  uploadButton.addEventListener('click', async () => {
    if (!selectedFile) {
      statusEl.textContent = 'בחרו קודם תמונה או סרטון.';
      return;
    }

    uploadButton.classList.add('hidden');
    selectedFileBox.classList.add('hidden');

    loadingBox.classList.remove('hidden');

    captureInput.disabled = true;
    chooseInput.disabled = true;
    guestNameInput.disabled = true;

    statusEl.textContent = '';

    const formData = new FormData();

    formData.append('file', selectedFile);
    formData.append('mission_id', missionId);

    const name = getGuestName();

    if (name) {
      formData.append('uploader_name', name);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      let data = {};

      try {
        data = await res.json();
      } catch (_) {}

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || 'ההעלאה נכשלה. נסו שוב.'
        );
      }

      missionView.classList.add('hidden');
      successView.classList.remove('hidden');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

    } catch (err) {
      loadingBox.classList.add('hidden');

      selectedFileBox.classList.remove('hidden');
      uploadButton.classList.remove('hidden');

      captureInput.disabled = false;
      chooseInput.disabled = false;
      guestNameInput.disabled = false;

      statusEl.textContent =
        err.message ||
        'ההעלאה נכשלה. אפשר גם לשלוח לנו בוואטסאפ.';
    }
  });
})();
