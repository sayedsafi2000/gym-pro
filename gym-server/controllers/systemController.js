const fs = require('fs');
const path = require('path');

// Shared folder bind-mounted between host and container. Host watcher
// (host-updater.sh / host-updater.ps1) polls the trigger file and runs
// update-client.{sh,ps1}. Status file is written by host, read by server.
const SYSTEM_DIR = process.env.SYSTEM_DIR || '/app/system';
const TRIGGER_FILE = path.join(SYSTEM_DIR, 'update-requested.json');
const STATUS_FILE = path.join(SYSTEM_DIR, 'update-status.json');
const LOCK_FILE = path.join(SYSTEM_DIR, '.updating');

const STATUS_STALE_MS = 3 * 60 * 1000; // watcher considered offline after 3 min without touch

function ensureDir() {
  try {
    fs.mkdirSync(SYSTEM_DIR, { recursive: true });
  } catch (e) {
    // If the folder can't be created, trigger endpoints will fail clearly.
  }
}

function readStatus() {
  try {
    const raw = fs.readFileSync(STATUS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { state: 'idle' };
  }
}

function getVersion(req, res) {
  res.json({
    success: true,
    data: {
      imageTag: process.env.IMAGE_TAG || 'latest',
      branch: process.env.BRANCH || 'main',
      startedAt: startedAt,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  });
}

function requestUpdate(req, res) {
  ensureDir();

  if (fs.existsSync(LOCK_FILE)) {
    return res.status(409).json({
      success: false,
      message: 'Update already in progress.',
    });
  }

  if (fs.existsSync(TRIGGER_FILE)) {
    return res.status(409).json({
      success: false,
      message: 'Update already queued. Waiting for host watcher to pick it up.',
    });
  }

  const payload = {
    requestedAt: new Date().toISOString(),
    requestedBy: req.admin?._id?.toString() || 'unknown',
    requestedByEmail: req.admin?.email || 'unknown',
  };

  try {
    fs.writeFileSync(TRIGGER_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Failed to write trigger file: ${e.message}. Is the system volume mounted?`,
    });
  }

  res.json({ success: true, data: { queued: true, requestedAt: payload.requestedAt } });
}

function getUpdateStatus(req, res) {
  ensureDir();
  const status = readStatus();
  const triggerPending = fs.existsSync(TRIGGER_FILE);
  const locked = fs.existsSync(LOCK_FILE);

  res.json({
    success: true,
    data: {
      ...status,
      triggerPending,
      locked,
    },
  });
}

function getWatcherHealth(req, res) {
  ensureDir();
  let mtime = null;
  try {
    mtime = fs.statSync(STATUS_FILE).mtimeMs;
  } catch (e) {
    // status file hasn't been created yet — watcher may never have run
  }

  const now = Date.now();
  const ageMs = mtime ? now - mtime : null;
  const healthy = mtime !== null && ageMs < STATUS_STALE_MS;

  res.json({
    success: true,
    data: {
      healthy,
      lastHeartbeatAt: mtime ? new Date(mtime).toISOString() : null,
      ageMs,
      staleThresholdMs: STATUS_STALE_MS,
    },
  });
}

const startedAt = new Date().toISOString();

module.exports = {
  getVersion,
  requestUpdate,
  getUpdateStatus,
  getWatcherHealth,
};
