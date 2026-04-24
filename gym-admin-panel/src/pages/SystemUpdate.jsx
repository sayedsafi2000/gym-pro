import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, Download, Clock } from 'lucide-react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import { getErrorMessage } from '../services/errorHandler';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ConfirmModal from '../components/ConfirmModal';

const POLL_INTERVAL_MS = 3000;

const STATE_META = {
  idle:    { label: 'Idle',     badge: 'neutral', icon: Clock },
  running: { label: 'Updating', badge: 'warning', icon: RefreshCw },
  done:    { label: 'Completed',badge: 'success', icon: CheckCircle2 },
  failed:  { label: 'Failed',   badge: 'danger',  icon: AlertTriangle },
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const SystemUpdate = () => {
  const { isSuperAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const [version, setVersion] = useState(null);
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Tracks whether the server went unreachable after a request — we expect
  // that during the container restart portion of an update, and we should
  // *not* mark the update as failed on those 502/network errors.
  const expectingRestart = useRef(false);
  const finishedRef = useRef(false);

  const fetchAll = async () => {
    try {
      const [vRes, sRes, hRes] = await Promise.all([
        api.get('/system/version'),
        api.get('/system/update-status'),
        api.get('/system/watcher-health'),
      ]);
      setVersion(vRes.data.data);
      setStatus(sRes.data.data);
      setHealth(hRes.data.data);
      expectingRestart.current = false;
    } catch (err) {
      // Swallow during restart window — server is literally down.
      if (!expectingRestart.current) {
        showError(getErrorMessage(err, 'Failed to load system status.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // When poll sees state === "done" and we were mid-update, prompt reload.
  useEffect(() => {
    if (!status) return;
    if (status.state === 'done' && !finishedRef.current && requesting) {
      finishedRef.current = true;
      showSuccess('Update complete. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    }
    if (status.state === 'failed' && !finishedRef.current && requesting) {
      finishedRef.current = true;
      setRequesting(false);
      showError(status.error || 'Update failed. Check update.log on the host.');
    }
  }, [status, requesting, showSuccess, showError]);

  const handleInstall = async () => {
    setConfirmOpen(false);
    setRequesting(true);
    finishedRef.current = false;
    expectingRestart.current = true;
    try {
      await api.post('/system/update');
      showSuccess('Update queued. Host watcher will pick it up within 60 seconds.');
    } catch (err) {
      setRequesting(false);
      expectingRestart.current = false;
      showError(getErrorMessage(err, 'Failed to queue update.'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card padding="lg">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Only a super-admin can manage system updates.
        </p>
      </Card>
    );
  }

  const state = status?.state || 'idle';
  const Meta = STATE_META[state] || STATE_META.idle;
  const StateIcon = Meta.icon;
  const canInstall = !requesting && state !== 'running' && !status?.triggerPending && !status?.locked;

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              System
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Updates
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Pull and install the latest GymPro release. The app restarts briefly during install.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setConfirmOpen(true)}
            disabled={!canInstall}
            loading={requesting || state === 'running'}
          >
            <Download className="w-4 h-4" />
            Install Update
          </Button>
        </div>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Current Version
          </h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Image Tag</dt>
              <dd className="font-mono text-slate-900 dark:text-slate-100">{version?.imageTag || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Branch</dt>
              <dd className="font-mono text-slate-900 dark:text-slate-100">{version?.branch || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Server started</dt>
              <dd className="text-slate-900 dark:text-slate-100">{formatDate(version?.startedAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Update Status
          </h3>
          <div className="mt-4 flex items-center gap-3">
            <StateIcon className={`w-5 h-5 ${state === 'running' ? 'animate-spin' : ''}`} />
            <Badge variant={Meta.badge}>{Meta.label}</Badge>
            {status?.triggerPending && state !== 'running' && (
              <span className="text-xs text-slate-500">Queued — waiting for host (≤60s)</span>
            )}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {status?.startedAt && (
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Started</dt>
                <dd className="text-slate-900 dark:text-slate-100">{formatDate(status.startedAt)}</dd>
              </div>
            )}
            {status?.finishedAt && (
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Finished</dt>
                <dd className="text-slate-900 dark:text-slate-100">{formatDate(status.finishedAt)}</dd>
              </div>
            )}
            {status?.error && (
              <div className="mt-2 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {status.error}
              </div>
            )}
          </dl>
        </Card>
      </section>

      <Card padding="md">
        <div className="flex items-center gap-3">
          {health?.healthy ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Host Watcher
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {health?.healthy
                ? `Online — last heartbeat ${formatDate(health.lastHeartbeatAt)}`
                : 'Offline — updates cannot run. On the host, re-run setup-client.sh / setup-client.ps1 to re-register the scheduled task.'}
            </p>
          </div>
          <Badge variant={health?.healthy ? 'success' : 'danger'}>
            {health?.healthy ? 'Healthy' : 'Offline'}
          </Badge>
        </div>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        title="Install update?"
        message="The app will pull the latest images and restart. Expect about 30 seconds of downtime — active users will be logged out and need to refresh."
        confirmLabel="Install now"
        danger={false}
        onConfirm={handleInstall}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default SystemUpdate;
