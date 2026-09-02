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
  const nameError = document.getElementById('nameError');

  const whatsappAdi = document.getElementById('whatsappAdi');
  const whatsappNitay = document.getElementById('whatsappNitay');

  const ADI_PHONE = '972543330598';
  const NITAY_PHONE = '972523357812';

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

  function validateName() {
    if (!getGuestName()) {
      nameError.textContent = 'כתבו קודם את השם שלכם ♥';
      guestNameInput.focus();
      return false;
    }

    nameError.textContent = '';
    return true;
  }

  function createWhatsappMessage() {
    const name = getGuestName();

    let message =
      `היי ❤️ לא הצלחתי להעלות דרך האתר.\n` +
      `אני שולח/ת כאן את התמונה או הסרטון של משימה #${missionId}.`;

    if (name) {
      message += `\nהשם שלי: ${name}`;
    }

    return message;
  }

  function createWhatsappLink(phone) {
    const message = encodeURIComponent(createWhatsappMessage());

    return `https://wa.me/${phone}?text=${message}`;
  }

  function updateWhatsappLinks() {
    whatsappAdi.href = createWhatsappLink(ADI_PHONE);
    whatsappNitay.href = createWhatsappLink(NITAY_PHONE);
  }

  updateWhatsappLinks();

  guestNameInput.addEventListener('input', () => {
    nameError.textContent = '';
    updateWhatsappLinks();
  });

  whatsappAdi.addEventListener('click', () => {
    updateWhatsappLinks();
  });

  whatsappNitay.addEventListener('click', () => {
    updateWhatsappLinks();
  });

  async function handleFile(file) {
    if (!file) return;

    if (!validateName()) {
      captureInput.value = '';
      chooseInput.value = '';
      return;
    }

    statusEl.textContent = 'מעלים… אנא המתינו ♥';

    const formData = new FormData();

    formData.append('file', file);
    formData.append('mission_id', missionId);
    formData.append('uploader_name', getGuestName());

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || 'ההעלאה נכשלה, נסו שוב.'
        );
      }

      missionView.classList.add('hidden');
      successView.classList.remove('hidden');

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

    } catch (err) {
      statusEl.textContent =
        err.message ||
        'ההעלאה נכשלה. אפשר גם לשלוח לנו בוואטסאפ ♥';
    }

    captureInput.value = '';
    chooseInput.value = '';
  }

  captureInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
  });

  chooseInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
  });
})();
