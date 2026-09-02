require('dotenv').config();

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const basicAuth = require('express-basic-auth');
const {
  getAuthUrl,
  exchangeCodeForTokens,
  uploadFileToDrive,
  listUploadsFromDrive,
} = require('./googleDrive');

const app = express();
const PORT = process.env.PORT || 3000;

const MISSIONS_PATH = path.join(__dirname, 'missions.json');

// IMPORTANT: this is a *scratch* directory only, used while a single upload
// is being streamed to Drive. Nothing here is treated as durable storage -
// it's fine if it's wiped on every deploy/restart, which is exactly what
// happens on stateless/ephemeral hosts. The only durable copy of any upload
// lives in Google Drive.
const TMP_DIR = path.join(os.tmpdir(), 'wedding-mission-app');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

app.use(express.json());
app.use(express.static(__dirname));

// ---------- helpers ----------

function loadMissions() {
  return JSON.parse(fs.readFileSync(MISSIONS_PATH, 'utf-8'));
}

function deleteTempFile(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) console.warn('[tmp-cleanup] could not delete', filePath, '-', err.message);
  });
}

// ---------- guest-facing API ----------

// Look up a mission's title by id.
app.get('/api/mission/:id', (req, res) => {
  const missions = loadMissions();
  const id = req.params.id;
  const title = missions[id];

  if (!title) {
    return res.status(404).json({ error: 'Mission not found' });
  }

  res.json({ mission_id: id, mission_title: title });
});

// Multer writes the incoming file to the scratch temp dir only long enough
// to stream it on to Drive. It is never treated as the "real" copy.
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TMP_DIR),
    filename: (req, file, cb) => {
      const safeOriginal = file.originalname.replace(/[^\w.\-\u0590-\u05FF]/g, '_');
      cb(null, `${Date.now()}-${process.pid}-${safeOriginal}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB ceiling for mobile videos
});

// Flow: receive/stream upload to temp -> upload to Drive -> wait for Drive's
// confirmation -> delete temp file -> only then respond success. If Drive
// upload fails at any point, the temp file is deleted and the guest gets a
// friendly retry message instead of "Mission complete".
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const tempPath = req.file && req.file.path;

  try {
    const missionId = req.body.mission_id;
    const missions = loadMissions();
    const missionTitle = missions[missionId];

    if (!missionId || !missionTitle) {
      deleteTempFile(tempPath);
      return res.status(400).json({ error: 'invalid_mission', message: 'משימה לא תקינה.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'no_file', message: 'לא נבחר קובץ.' });
    }

    const driveFile = await uploadFileToDrive({
      filePath: tempPath,
      mimeType: req.file.mimetype,
      missionId,
      missionTitle,
      originalFilename: req.file.originalname,
      uploadTimestamp: new Date().toISOString(),
    });

    // Drive has confirmed the file exists (we have a real file id back) -
    // only now is it safe to delete the temp copy and tell the guest it's done.
    deleteTempFile(tempPath);

    res.json({ success: true, drive_link: driveFile.webViewLink });
  } catch (err) {
    console.error('[upload] Drive upload failed:', err.message);
    deleteTempFile(tempPath);
    res.status(502).json({
      error: 'drive_upload_failed',
      message: 'ההעלאה לא הושלמה. בדקו את החיבור לאינטרנט ונסו שוב.',
    });
  }
});

// ---------- one-time Google OAuth flow (server owner only, not guests) ----------

app.get('/auth/google', (req, res) => {
  try {
    res.redirect(getAuthUrl());
  } catch (err) {
    res.status(500).send(`Setup error: ${err.message}`);
  }
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const tokens = await exchangeCodeForTokens(code);
    res.send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; direction: ltr;">
        <h2>Google Drive connected ✅</h2>
        <p>Copy this refresh token and save it as the <code>GOOGLE_REFRESH_TOKEN</code>
        environment variable on your server, then restart the app:</p>
        <pre style="background:#eee;padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-all;">${tokens.refresh_token || '(no refresh_token returned - if this happens, revoke access at https://myaccount.google.com/permissions and try /auth/google again)'}</pre>
        <p>You can close this page and delete it from your browser history afterward.</p>
      </div>
    `);
  } catch (err) {
    res.status(500).send(`Auth error: ${err.message}`);
  }
});

// ---------- private admin page ----------

const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASSWORD || 'changeme' },
  challenge: true,
  realm: 'Wedding Admin',
});

app.use('/admin', adminAuth, express.static(path.join(__dirname, 'admin')));

// Reads directly from Drive (via each file's appProperties) - no local
// uploads database exists to depend on.
app.get('/api/admin/uploads', adminAuth, async (req, res) => {
  try {
    const files = await listUploadsFromDrive();
    const grouped = {};

    for (const file of files) {
      const props = file.appProperties || {};
      const missionId = props.mission_id || 'unknown';

      if (!grouped[missionId]) {
        grouped[missionId] = {
          mission_title: props.mission_title || '(unknown mission)',
          uploads: [],
        };
      }

      grouped[missionId].uploads.push({
        original_filename: props.original_filename || file.name,
        upload_timestamp: props.upload_timestamp || file.createdTime,
        drive_link: file.webViewLink,
      });
    }

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wedding mission app running on port ${PORT}`);
});
