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
  const selectedFilesGrid = document.getElementById('selectedFilesGrid');
  const selectedFilesCount = document.getElementById('selectedFilesCount');

  const uploadButton = document.getElementById('uploadButton');
  const loadingBox = document.getElementById('loadingBox');

  const whatsappAdi = document.getElementById('whatsappAdi');
  const whatsappNitay = document.getElementById('whatsappNitay');

  const ADI_PHONE = '972543330598';
  const NITAY_PHONE = '972523357812';

  let selectedFiles = [];

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


  /* ---------- NAME ---------- */

  function getGuestName() {
    return guestNameInput.value.trim();
  }


  /* ---------- WHATSAPP ---------- */

  function createWhatsappMessage() {
    let message =
      `היי ❤️ לא הצלחתי להעלות דרך האתר.\n` +
      `אני שולח/ת כאן את התמונות או הסרטונים של משימה #${missionId}.`;

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


  /* ---------- FILES ---------- */

  function isSameFile(a, b) {
    return (
      a.name === b.name &&
      a.size === b.size &&
      a.lastModified === b.lastModified
    );
  }

  function addFiles(fileList) {
    const newFiles = Array.from(fileList || []);

    if (!newFiles.length) return;

    newFiles.forEach((file) => {
      const alreadyExists = selectedFiles.some((existingFile) =>
        isSameFile(existingFile, file)
      );

      if (!alreadyExists) {
        selectedFiles.push(file);
      }
    });

    /*
      Important:
      clear the input so the guest can choose
      another photo immediately afterwards.
    */
    captureInput.value = '';
    chooseInput.value = '';

    renderSelectedFiles();
  }


  /* ---------- REMOVE FILE ---------- */

  function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderSelectedFiles();
  }


  /* ---------- PREVIEW ---------- */

  function renderSelectedFiles() {
    selectedFilesGrid.innerHTML = '';

    if (selectedFiles.length === 0) {
      selectedFileBox.classList.add('hidden');
      uploadButton.classList.add('hidden');

      selectedFilesCount.textContent = '';

      return;
    }

    selectedFileBox.classList.remove('hidden');
    uploadButton.classList.remove('hidden');

    selectedFilesCount.textContent = selectedFiles.length;

    selectedFiles.forEach((file, index) => {

      const preview = document.createElement('div');

      preview.className = 'file-preview';


      /* IMAGE */

      if (file.type.startsWith('image/')) {

        const image = document.createElement('img');

        const objectUrl = URL.createObjectURL(file);

        image.src = objectUrl;
        image.alt = file.name;

        image.addEventListener('load', () => {
          URL.revokeObjectURL(objectUrl);
        });

        preview.appendChild(image);
      }


      /* VIDEO */

      else if (file.type.startsWith('video/')) {

        const video = document.createElement('video');

        const objectUrl = URL.createObjectURL(file);

        video.src = objectUrl;

        video.controls = true;
        video.preload = 'metadata';

        preview.appendChild(video);

        const typeLabel = document.createElement('div');

        typeLabel.className = 'file-type';
        typeLabel.textContent = 'וידאו';

        preview.appendChild(typeLabel);

        video.addEventListener('loadedmetadata', () => {
          URL.revokeObjectURL(objectUrl);
        });
      }


      /* DELETE */

      const removeButton = document.createElement('button');

      removeButton.type = 'button';
      removeButton.className = 'file-remove';

      removeButton.textContent = '×';
      removeButton.setAttribute(
        'aria-label',
        `הסרת ${file.name}`
      );

      removeButton.addEventListener('click', () => {
        removeFile(index);
      });

      preview.appendChild(removeButton);

      selectedFilesGrid.appendChild(preview);
    });


    /* UPLOAD BUTTON TEXT */

    if (selectedFiles.length === 1) {
      uploadButton.textContent =
        'העלאת הקובץ';
    } else {
      uploadButton.textContent =
        `העלאת ${selectedFiles.length} קבצים`;
    }

    statusEl.textContent = '';
  }


  /* ---------- FILE INPUT EVENTS ---------- */

  captureInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
  });

  chooseInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
  });


  /* ---------- UPLOAD ---------- */

  uploadButton.addEventListener('click', async () => {

    if (!selectedFiles.length) {
      statusEl.textContent =
        'בחרו קודם תמונה או סרטון.';

      return;
    }

    uploadButton.classList.add('hidden');
    selectedFileBox.classList.add('hidden');

    loadingBox.classList.remove('hidden');

    captureInput.disabled = true;
    chooseInput.disabled = true;
    guestNameInput.disabled = true;

    statusEl.textContent = '';

    const guestName = getGuestName();

    try {

      for (let i = 0; i < selectedFiles.length; i++) {

        const file = selectedFiles[i];

        const strongEl =
          loadingBox.querySelector('strong');

        const spanEl =
          loadingBox.querySelector('span');

        if (strongEl) {

          if (selectedFiles.length === 1) {
            strongEl.textContent =
              'מעלים את הזיכרון שלכם…';
          }

          else {
            strongEl.textContent =
              `מעלים קובץ ${i + 1} מתוך ${selectedFiles.length}…`;
          }
        }

        if (spanEl) {
          spanEl.textContent =
            'אל תסגרו את החלון';
        }

        const formData = new FormData();

        formData.append('file', file);
        formData.append('mission_id', missionId);

        if (guestName) {
          formData.append(
            'uploader_name',
            guestName
          );
        }

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
            data.message ||
            `העלאת קובץ ${i + 1} נכשלה.`
          );
        }
      }


      /* ---------- SUCCESS ---------- */

      missionView.classList.add('hidden');
      successView.classList.remove('hidden');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

    }

    catch (err) {

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
