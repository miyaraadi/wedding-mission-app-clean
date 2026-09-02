(function () {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const missionId =
    params.get('mission');

  const missionNumberEl =
    document.getElementById(
      'missionNumber'
    );

  const missionTextEl =
    document.getElementById(
      'missionText'
    );

  const statusEl =
    document.getElementById(
      'statusText'
    );

  const missionView =
    document.getElementById(
      'missionView'
    );

  const successView =
    document.getElementById(
      'successView'
    );

  const captureInput =
    document.getElementById(
      'captureInput'
    );

  const chooseInput =
    document.getElementById(
      'chooseInput'
    );

  const guestNameInput =
    document.getElementById(
      'guestName'
    );

  const selectedFileBox =
    document.getElementById(
      'selectedFileBox'
    );

  const selectedFilesGrid =
    document.getElementById(
      'selectedFilesGrid'
    );

  const selectedFilesCount =
    document.getElementById(
      'selectedFilesCount'
    );

  const uploadButton =
    document.getElementById(
      'uploadButton'
    );

  const loadingBox =
    document.getElementById(
      'loadingBox'
    );

  const whatsappAdi =
    document.getElementById(
      'whatsappAdi'
    );

  const whatsappNitay =
    document.getElementById(
      'whatsappNitay'
    );


  const ADI_PHONE =
    '972543330598';

  const NITAY_PHONE =
    '972523357812';


  let selectedFiles = [];


  if (!missionId) {

    missionNumberEl.textContent = '';

    missionTextEl.textContent =
      'לא נמצא קוד משימה. אנא סרקו שוב את קוד ה-QR שעל הכרטיס.';

    return;
  }


  missionNumberEl.textContent =
    `#${missionId}`;


  fetch(
    `/api/mission/${encodeURIComponent(
      missionId
    )}`
  )

    .then((response) => {

      if (!response.ok) {
        throw new Error(
          'Mission not found'
        );
      }

      return response.json();
    })

    .then((data) => {

      missionTextEl.textContent =
        data.mission_title;
    })

    .catch(() => {

      missionTextEl.textContent =
        'המשימה לא נמצאה. בדקו את הקישור ונסו שוב.';
    });


  /* ---------- NAME ---------- */

  function getGuestName() {

    return guestNameInput
      .value
      .trim();
  }


  /* ---------- WHATSAPP ---------- */

  function createWhatsappMessage() {

    let message =
      `היי ❤️ לא הצלחתי להעלות דרך האתר.\n` +
      `אני שולח/ת כאן את התמונות או הסרטונים של משימה #${missionId}.`;

    const name =
      getGuestName();

    if (name) {

      message +=
        `\nהשם שלי: ${name}`;
    }

    return message;
  }


  function createWhatsappLink(phone) {

    return (
      `https://wa.me/${phone}` +
      `?text=${encodeURIComponent(
        createWhatsappMessage()
      )}`
    );
  }


  function updateWhatsappLinks() {

    whatsappAdi.href =
      createWhatsappLink(
        ADI_PHONE
      );

    whatsappNitay.href =
      createWhatsappLink(
        NITAY_PHONE
      );
  }


  updateWhatsappLinks();


  guestNameInput
    .addEventListener(
      'input',
      updateWhatsappLinks
    );


  whatsappAdi
    .addEventListener(
      'click',
      updateWhatsappLinks
    );


  whatsappNitay
    .addEventListener(
      'click',
      updateWhatsappLinks
    );


  /* ---------- FILE HELPERS ---------- */

  function isSameFile(a, b) {

    return (
      a.name === b.name &&
      a.size === b.size &&
      a.lastModified ===
        b.lastModified
    );
  }


  function addFiles(fileList) {

    const newFiles =
      Array.from(
        fileList || []
      );


    if (!newFiles.length) {
      return;
    }


    newFiles.forEach((file) => {

      const exists =
        selectedFiles.some(
          (existingFile) =>
            isSameFile(
              existingFile,
              file
            )
        );


      if (!exists) {
        selectedFiles.push(file);
      }
    });


    captureInput.value = '';
    chooseInput.value = '';


    renderSelectedFiles();
  }


  function removeFile(index) {

    selectedFiles.splice(
      index,
      1
    );

    renderSelectedFiles();
  }


  /* ---------- PREVIEW ---------- */

 function renderSelectedFiles() {

  selectedFilesGrid.innerHTML = '';

  const addMoreText =
    document.querySelector('.add-more-text');


  /* אין קבצים */

  if (selectedFiles.length === 0) {

    selectedFileBox.classList.add('hidden');
    uploadButton.classList.add('hidden');

    selectedFilesCount.textContent = '0';

    selectedFilesGrid.style.maxHeight = '';
    selectedFilesGrid.style.overflowY = '';

    return;
  }


  /* יש קבצים */

  selectedFileBox.classList.remove('hidden');
  uploadButton.classList.remove('hidden');

  selectedFilesCount.textContent =
    selectedFiles.length;


  /*
    אם יש יותר מ-3 קבצים:
    רק אזור התמונות מקבל גלילה.
    הכרטיס כולו לא ממשיך להתארך.
  */

  if (selectedFiles.length > 3) {

    selectedFilesGrid.style.maxHeight =
      '112px';

    selectedFilesGrid.style.overflowY =
      'auto';

    selectedFilesGrid.style.overflowX =
      'hidden';

    selectedFilesGrid.style.paddingRight =
      '3px';

    selectedFilesGrid.style.overscrollBehavior =
      'contain';

    selectedFilesGrid.style.webkitOverflowScrolling =
      'touch';


    if (addMoreText) {

      addMoreText.textContent =
        'אפשר להוסיף עוד תמונות או סרטונים';
    }

  }

  else {

    selectedFilesGrid.style.maxHeight =
      '';

    selectedFilesGrid.style.overflowY =
      'visible';

    selectedFilesGrid.style.paddingRight =
      '';


    if (addMoreText) {

      addMoreText.textContent =
        'אפשר להוסיף עוד תמונות או סרטונים';
    }
  }


  /* יצירת התמונות והסרטונים */

  selectedFiles.forEach(
    (file, index) => {

      const preview =
        document.createElement('div');

      preview.className =
        'file-preview';


      /* תמונה */

      if (
        file.type.startsWith('image/')
      ) {

        const image =
          document.createElement('img');

        const objectUrl =
          URL.createObjectURL(file);

        image.src = objectUrl;
        image.alt = file.name;

        image.addEventListener(
          'load',
          () => {

            URL.revokeObjectURL(
              objectUrl
            );
          }
        );

        preview.appendChild(image);
      }


      /* סרטון */

      else if (
        file.type.startsWith('video/')
      ) {

        const video =
          document.createElement('video');

        const objectUrl =
          URL.createObjectURL(file);

        video.src = objectUrl;

        video.controls = true;
        video.preload = 'metadata';
        video.playsInline = true;

        preview.appendChild(video);


        const typeLabel =
          document.createElement('div');

        typeLabel.className =
          'file-type';

        typeLabel.textContent =
          'וידאו';

        preview.appendChild(
          typeLabel
        );
      }


      /* כפתור מחיקה */

      const removeButton =
        document.createElement('button');

      removeButton.type =
        'button';

      removeButton.className =
        'file-remove';

      removeButton.textContent =
        '×';

      removeButton.setAttribute(
        'aria-label',
        `הסרת ${file.name}`
      );

      removeButton.addEventListener(
        'click',
        () => {

          removeFile(index);
        }
      );

      preview.appendChild(
        removeButton
      );

      selectedFilesGrid.appendChild(
        preview
      );
    }
  );


  /* טקסט כפתור ההעלאה */

  if (selectedFiles.length === 1) {

    uploadButton.textContent =
      'העלאת הקובץ';

  }

  else {

    uploadButton.textContent =
      `העלאת ${selectedFiles.length} קבצים`;
  }


  statusEl.textContent = '';
}

  /* ---------- INPUTS ---------- */

  captureInput
    .addEventListener(
      'change',
      (event) => {

        addFiles(
          event.target.files
        );
      }
    );


  chooseInput
    .addEventListener(
      'change',
      (event) => {

        addFiles(
          event.target.files
        );
      }
    );


  /* ---------- UPLOAD ---------- */

  uploadButton
    .addEventListener(
      'click',
      async () => {

        if (
          selectedFiles.length === 0
        ) {

          statusEl.textContent =
            'בחרו קודם תמונה או סרטון.';

          return;
        }


        uploadButton
          .classList
          .add('hidden');


        loadingBox
          .classList
          .remove('hidden');


        captureInput.disabled =
          true;

        chooseInput.disabled =
          true;

        guestNameInput.disabled =
          true;


        statusEl.textContent = '';


        const guestName =
          getGuestName();


        try {

          for (
            let i = 0;
            i < selectedFiles.length;
            i++
          ) {

            const file =
              selectedFiles[i];


            const strongEl =
              loadingBox
                .querySelector(
                  'strong'
                );


            const spanEl =
              loadingBox
                .querySelector(
                  'span'
                );


            if (strongEl) {

              if (
                selectedFiles.length === 1
              ) {

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


            const formData =
              new FormData();


            formData.append(
              'file',
              file
            );


            formData.append(
              'mission_id',
              missionId
            );


            if (guestName) {

              formData.append(
                'uploader_name',
                guestName
              );
            }


            const response =
              await fetch(
                '/api/upload',
                {
                  method: 'POST',
                  body: formData
                }
              );


            let data = {};


            try {

              data =
                await response
                  .json();
            }

            catch (_) {}


            if (
              !response.ok ||
              !data.success
            ) {

              throw new Error(
                data.message ||
                `העלאת קובץ ${i + 1} נכשלה.`
              );
            }
          }


          missionView
            .classList
            .add('hidden');


          successView
            .classList
            .remove('hidden');


          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }


        catch (error) {

          loadingBox
            .classList
            .add('hidden');


          uploadButton
            .classList
            .remove('hidden');


          captureInput.disabled =
            false;

          chooseInput.disabled =
            false;

          guestNameInput.disabled =
            false;


          statusEl.textContent =
            error.message ||
            'ההעלאה נכשלה. אפשר גם לשלוח לנו בוואטסאפ.';
        }
      }
    );

})();
