import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GlobalModal from './GlobalModal';
import { useModal } from '../contexts/ModalContext';
import CustomDropdown from './CustomDropdown';
import PermMultiSelect from './PermMultiSelect';
import Toggle from './Toggle';
import { Button } from './ui/button';
import DatePicker from './DatePicker';
import AlertModal from './AlertModal';
import CustomTooltip from './CustomTooltip';
import SectionHeader from './ui/SectionHeader';
import { useToast } from '../hooks/use-toast';
import {
  Copy, Eye, EyeOff, Plus, HelpCircle, ExternalLink,
  Check, Clock, X, RotateCcw, Pencil, AlertTriangle, ShieldCheck
} from 'lucide-react';
import ActionButton from './ui/ActionButton';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/* ─── Permission categories ──────────────────────────────────────────────── */
const PERM_CATS = [
  { id: 'actors', label: 'Actors', readScope: 'actors:read', writeScope: null },
  { id: 'runs', label: 'Runs', readScope: 'runs:read', writeScope: 'runs:write' },
  { id: 'datasets', label: 'Datasets', readScope: 'datasets:read', writeScope: null },
  { id: 'storage', label: 'Storages', readScope: 'storage:read', writeScope: 'storage:write' },
  { id: 'webhooks', label: 'Webhooks', readScope: 'webhooks:read', writeScope: 'webhooks:write' },
  { id: 'pipelines', label: 'Pipelines', readScope: 'pipelines:read', writeScope: 'pipelines:write' },
];
const ALL_SCOPES = PERM_CATS.flatMap(c => [c.readScope, c.writeScope].filter(Boolean));
const DEFAULT_PERMS = Object.fromEntries(PERM_CATS.map(c => [c.id, c.writeScope ? 'write' : 'read']));

function catOptions(cat) {
  const opts = [
    { value: 'none', label: 'No access' },
    { value: 'read', label: 'Read only' },
  ];
  if (cat.writeScope) opts.push({ value: 'write', label: 'Read and write' });
  return opts;
}

function permsToScopes(perms, includeStorage = false) {
  const s = [];
  PERM_CATS.forEach(c => {
    const v = perms[c.id] || 'none';
    if (v === 'read' || v === 'write') s.push(c.readScope);
    if (v === 'write' && c.writeScope) s.push(c.writeScope);
  });
  if (includeStorage && !s.includes('storage:read')) { s.push('storage:read', 'storage:write'); }
  return s;
}

function scopesToPerms(scopes) {
  const p = {};
  PERM_CATS.forEach(c => {
    const hasW = c.writeScope && scopes.includes(c.writeScope);
    const hasR = scopes.includes(c.readScope);
    p[c.id] = hasW ? 'write' : hasR ? 'read' : 'none';
  });
  return p;
}

/* ─── Resource-specific permission types ─────────────────────────────────── */
const RESOURCE_TYPES = [
  {
    id: 'actor', label: 'Actor', idLabel: 'Actor ID', idPlaceholder: 'e.g. username/my-actor',
    perms: [
      { value: 'read', label: 'Read', desc: 'View Actor settings, source code, and its builds.', scope: 'actors:read' },
      { value: 'run', label: 'Run', desc: 'Run the Actor and view its runs.', scope: 'runs:write' },
      { value: 'write', label: 'Write', desc: 'Edit Actor settings, source code, and manage builds.', scope: 'actors:write' },
    ],
  },
  {
    id: 'run', label: 'Run', idLabel: 'Run ID', idPlaceholder: 'e.g. run-abc123',
    perms: [
      { value: 'read', label: 'Read', desc: 'View run details, logs, and status.', scope: 'runs:read' },
      { value: 'write', label: 'Write', desc: 'Cancel, delete, or modify run status.', scope: 'runs:write' },
    ],
  },
  {
    id: 'dataset', label: 'Dataset', idLabel: 'Dataset ID', idPlaceholder: 'e.g. dataset-abc123',
    perms: [
      { value: 'read', label: 'Read', desc: 'View and download dataset items.', scope: 'datasets:read' },
      { value: 'write', label: 'Write', desc: 'Push items and manage dataset settings.', scope: 'datasets:write' },
    ],
  },
  {
    id: 'storage', label: 'Storage', idLabel: 'Storage ID', idPlaceholder: 'e.g. kv-store-abc123',
    perms: [
      { value: 'read', label: 'Read', desc: 'Read records from key-value stores and queues.', scope: 'storage:read' },
      { value: 'write', label: 'Write', desc: 'Write records to key-value stores and queues.', scope: 'storage:write' },
    ],
  },
  {
    id: 'webhook', label: 'Webhook', idLabel: 'Webhook ID', idPlaceholder: 'e.g. webhook-abc123',
    perms: [
      { value: 'read', label: 'Read', desc: 'View webhook configurations and dispatch history.', scope: 'webhooks:read' },
      { value: 'write', label: 'Write', desc: 'Create, edit, and delete webhooks.', scope: 'webhooks:write' },
    ],
  },
  {
    id: 'pipeline', label: 'Pipeline', idLabel: 'Pipeline ID', idPlaceholder: 'e.g. pipeline-abc123',
    perms: [
      { value: 'read', label: 'Read', desc: 'View pipeline configurations and run history.', scope: 'pipelines:read' },
      { value: 'write', label: 'Write', desc: 'Create, edit, and delete pipelines.', scope: 'pipelines:write' },
    ],
  },
];

const RESOURCE_OPTIONS = RESOURCE_TYPES.map(r => ({ value: r.id, label: r.label }));

let _entryId = 0;
const mkEntry = (typeId) => ({ uid: ++_entryId, typeId, resourceId: '', selectedPerms: [] });

/* ─── Session storage for full key reveal ─────────────────────────────────── */

/* ─── Scope preview chips ─────────────────────────────────────────────────── */
function ScopeChips({ scopes }) {
  if (!scopes || scopes.length === 0) return <span className="text-xs text-muted-foreground italic">No scopes selected</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map(s => (
        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{s}</span>
      ))}
    </div>
  );
}

/* ─── CREATE MODAL (uses GlobalModal) ─────────────────────────────────────── */
const CREATE_MODAL_ID = 'create-api-token';
const EDIT_MODAL_ID = 'edit-api-token';
const ROTATE_MODAL_ID = 'rotate-api-token';

function CreateModal({ onCreated }) {
  const { isModalOpen, closeModal } = useModal();
  const { toast } = useToast();
  const open = isModalOpen(CREATE_MODAL_ID);

  const [desc, setDesc] = useState('');
  const [setExpiry, setSetExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryErr, setExpiryErr] = useState(false);
  const [limitPerms, setLimitPerms] = useState(false);
  const [perms, setPerms] = useState(DEFAULT_PERMS);
  const [inclStorage, setInclStorage] = useState(false);
  const [resEntries, setResEntries] = useState([]);   // resource-specific
  const [resTypeSelect, setResTypeSelect] = useState(''); // pending type
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setDesc(''); setSetExpiry(false); setExpiryDate(''); setExpiryErr(false);
      setLimitPerms(false); setPerms(DEFAULT_PERMS); setInclStorage(false);
      setResEntries([]); setResTypeSelect(''); setCreating(false);
    }
  }, [open]);

  const handleCreate = async () => {
    if (setExpiry && !expiryDate) { setExpiryErr(true); return; }
    setExpiryErr(false);
    const acctScopes = limitPerms ? permsToScopes(perms, inclStorage) : ALL_SCOPES;
    // Resource-specific scopes are ALWAYS included regardless of limitPerms
    const resScopes = resEntries.flatMap(e => {
      const rt = RESOURCE_TYPES.find(r => r.id === e.typeId);
      return rt ? e.selectedPerms.map(pv => rt.perms.find(p => p.value === pv)?.scope).filter(Boolean) : [];
    });
    const scopes = [...new Set([...acctScopes, ...resScopes])];
    let expires_in_days;
    if (setExpiry && expiryDate) {
      // Compare against end-of-day so "today" is always valid
      const diff = Math.ceil((new Date(expiryDate + 'T23:59:59') - Date.now()) / 86400000);
      if (diff < 0) { toast({ title: 'Error', description: 'Expiry date cannot be in the past', variant: 'destructive' }); return; }
      expires_in_days = Math.max(1, diff);   // today → 1 day
    }
    const name = desc.trim() || `Token ${new Date().toLocaleDateString()}`;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_URL}/api/auth/api-keys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes, ...(expires_in_days ? { expires_in_days } : {}) }),
      });
      if (r.ok) {
        const data = await r.json();
        onCreated(data);
        closeModal();
        toast({ title: 'Token created!', description: "Copy it now — it won't be shown again after this session." });
      } else {
        const err = await r.json();
        toast({ title: 'Error', description: err.detail || 'Failed to create token', variant: 'destructive' });
      }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
    finally { setCreating(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const activeScopes = (() => {
    const acct = limitPerms ? permsToScopes(perms, inclStorage) : ALL_SCOPES;
    // Always include resource-specific scopes in preview too
    const res = resEntries.flatMap(e => {
      const rt = RESOURCE_TYPES.find(r => r.id === e.typeId);
      return rt ? e.selectedPerms.map(pv => rt.perms.find(p => p.value === pv)?.scope).filter(Boolean) : [];
    });
    return [...new Set([...acct, ...res])];
  })();

  return (
    <GlobalModal
      modalId={CREATE_MODAL_ID}
      title="Create a new personal API token"
      size="md"
      contentClassName="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh] scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      customFooter={
        <div className="flex items-center justify-end gap-2">
          <button onClick={closeModal} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel changes</button>
          <button
            onClick={handleCreate}
            disabled={creating || (limitPerms && activeScopes.length === 0)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      }
    >
      <p className="text-xs text-muted-foreground leading-relaxed">
        These tokens provide API access to your personal Scrapi account and its resources, but not to any organizations you're a member of.{' '}
        <a href="#" className="text-primary hover:underline inline-flex items-center gap-0.5">
          Learn more <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={desc}
          onChange={e => e.target.value.length <= 160 && setDesc(e.target.value)}
          placeholder="e.g. CI/CD pipeline for staging environment"
          className="w-full resize-none border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc.length}/160</p>
      </div>

      {/* Expiry toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Toggle on={setExpiry} onChange={setSetExpiry} />
          <span className="text-sm font-medium text-foreground">Set expiration date</span>
        </div>
        {setExpiry && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date <span className="text-muted-foreground/60">(optional)</span></label>
            <DatePicker
              value={expiryDate}
              onChange={v => { setExpiryDate(v); setExpiryErr(false); }}
              minDate={today}
              hasError={expiryErr}
              placeholder="YYYY-MM-DD"
            />
            {expiryErr && <p className="text-xs text-destructive mt-1">Expiration date is required</p>}
          </div>
        )}
      </div>

      {/* Limit permissions toggle */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Toggle on={limitPerms} onChange={setLimitPerms} />
          <span className="text-sm font-medium text-foreground">Limit token permissions</span>
        </div>

        {/* Warning when NOT limiting */}
        {!limitPerms && (
          <div className="flex gap-2.5 p-3 rounded-lg border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              This token will have <strong>full access</strong> to all your account resources (actors, runs, datasets, storage, webhooks, pipelines).
              Enable permission limiting to restrict access to specific resources only.{' '}
              <br /><br />
              To disable anonymous access, go to your account{' '}
              <span className="text-primary cursor-pointer hover:underline">security settings</span>{' '}
              and change General resource access to Restricted.
            </p>
          </div>
        )}

        {/* Permission selector */}
        {limitPerms && (
          <div className="space-y-4">
            {/* Account-level */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Account-level permissions</p>
              <p className="text-xs text-muted-foreground mb-2">
                Choose permissions that will apply to all resources in the entire account. For example, you can use this to allow the token to run all your Actors.
              </p>
              <div className="space-y-2">
                {PERM_CATS.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{cat.label}</span>
                    <div className="flex-1">
                      <CustomDropdown
                        value={perms[cat.id] || 'none'}
                        onChange={v => setPerms(p => ({ ...p, [cat.id]: v }))}
                        options={catOptions(cat)}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource-specific */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Resource-specific permissions</p>
              <p className="text-xs text-muted-foreground mb-2">
                Choose permissions that will apply to specific, existing resources. For example, you can use this to allow the token to run a particular Actor.
              </p>
              <div className="border border-border rounded-lg p-3 space-y-3">
                {/* Add row */}
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <CustomDropdown
                      value={resTypeSelect}
                      onChange={setResTypeSelect}
                      options={RESOURCE_OPTIONS}
                      placeholder="Select resource type"
                      className="w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setResEntries(e => [...e, mkEntry(resTypeSelect)]); setResTypeSelect(''); }}
                    disabled={!resTypeSelect}
                    className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                {/* Resource rows */}
                {resEntries.map((entry) => {
                  const rt = RESOURCE_TYPES.find(r => r.id === entry.typeId);
                  if (!rt) return null;
                  return (
                    <div key={entry.uid} className="border border-border rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">{rt.label}</span>
                        <button
                          type="button"
                          onClick={() => setResEntries(e => e.filter(x => x.uid !== entry.uid))}
                          className="text-[11px] text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                      {/* Resource ID */}
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">{rt.idLabel} <span className="text-muted-foreground/60">(optional)</span></label>
                        <input
                          type="text"
                          value={entry.resourceId}
                          onChange={e => setResEntries(prev => prev.map(x =>
                            x.uid === entry.uid ? { ...x, resourceId: e.target.value } : x
                          ))}
                          placeholder={rt.idPlaceholder}
                          className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      {/* Permission multi-select */}
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Permissions</label>
                        <PermMultiSelect
                          value={entry.selectedPerms}
                          onChange={vals => setResEntries(prev => prev.map(x =>
                            x.uid === entry.uid ? { ...x, selectedPerms: vals } : x
                          ))}
                          options={rt.perms}
                          placeholder="Select permissions…"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Running Actors */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Running Actors</p>
              <p className="text-xs text-muted-foreground mb-2">
                Configure platform behavior when you run an Actor with this token.{' '}
                <a href="#" className="text-primary hover:underline">Learn more ↗</a>
              </p>
              <div className="border border-border rounded-lg p-3 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="radio" name="actorMode" defaultChecked className="mt-0.5 accent-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Full access</p>
                    <p className="text-[11px] text-muted-foreground">Allow Actors to access all your account's data. Use this for Actors you trust.</p>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="radio" name="actorMode" className="mt-0.5 accent-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Restricted access</p>
                    <p className="text-[11px] text-muted-foreground">Restrict what Actors can access using the scope of this token.</p>
                  </div>
                </label>
                <hr className="border-border" />
                <div className="flex items-start gap-2.5">
                  <Toggle on={inclStorage} onChange={setInclStorage} />
                  <div>
                    <p className="text-xs font-medium text-foreground">Allow this token to access default run storages</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      If this token runs an Actor, it will be allowed to read and write to the run's default storages. It will also be allowed to read any default storage of runs that can be accessed via the List runs permission on an Actor.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active scopes */}
            <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
              <p className="text-[10px] font-medium text-accent-foreground mb-1.5">Active scopes:</p>
              <ScopeChips scopes={activeScopes} />
            </div>
          </div>
        )}
      </div>
    </GlobalModal>
  );
}

/* ─── EDIT MODAL ─────────────────────────────────────────────────────────── */
function EditModal({ editToken, onSaved }) {
  const { isModalOpen, closeModal } = useModal();
  const { toast } = useToast();
  const open = isModalOpen(EDIT_MODAL_ID);

  const [name, setName] = useState('');
  const [limitPerms, setLimitPerms] = useState(false);
  const [perms, setPerms] = useState(DEFAULT_PERMS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editToken && open) {
      setName(editToken.name || '');
      const limited = editToken.scopes && editToken.scopes.length < ALL_SCOPES.length;
      setLimitPerms(limited);
      setPerms(limited ? scopesToPerms(editToken.scopes) : DEFAULT_PERMS);
    }
  }, [editToken, open]);

  const handleSave = async () => {
    const scopes = limitPerms ? permsToScopes(perms, false) : ALL_SCOPES;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_URL}/api/auth/api-keys/${editToken.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || editToken.name, scopes }),
      });
      if (r.ok) { onSaved(await r.json()); closeModal(); toast({ title: 'Token updated' }); }
      else { const e = await r.json(); toast({ title: 'Error', description: e.detail, variant: 'destructive' }); }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <GlobalModal
      modalId={EDIT_MODAL_ID}
      title="Edit API token"
      size="sm"
      contentClassName="px-5 py-4 space-y-4"
      customFooter={
        <div className="flex justify-end gap-2">
          <button onClick={closeModal} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      }
    >
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <Toggle on={limitPerms} onChange={setLimitPerms} />
          <span className="text-sm font-medium text-foreground">Limit token permissions</span>
        </div>
        {limitPerms && (
          <div className="space-y-2">
            {PERM_CATS.map(cat => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{cat.label}</span>
                <div className="flex-1">
                  <CustomDropdown
                    value={perms[cat.id] || 'none'}
                    onChange={v => setPerms(p => ({ ...p, [cat.id]: v }))}
                    options={catOptions(cat)}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlobalModal>
  );
}

/* ─── ROTATE MODAL ───────────────────────────────────────────────────────── */
function RotateModal({ onConfirm }) {
  const { isModalOpen, closeModal } = useModal();
  const open = isModalOpen(ROTATE_MODAL_ID);
  const [keepActive, setKeepActive] = useState(true);
  useEffect(() => { if (!open) setKeepActive(true); }, [open]);

  return (
    <GlobalModal
      modalId={ROTATE_MODAL_ID}
      title="Rotate token"
      size="xs"
      contentClassName="px-5 py-4 space-y-4"
      customFooter={
        <div className="flex justify-end gap-2">
          <button onClick={closeModal} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={() => { closeModal(); onConfirm(keepActive); }}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Rotate
          </button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground leading-relaxed">
        After confirmation your token will be regenerated and your applications connected to this token will no longer work.
      </p>
      <div className="flex items-center gap-3">
        <Toggle on={keepActive} onChange={setKeepActive} />
        <span className="text-sm text-foreground">
          Keep the old token active for 24 hours <span className="text-muted-foreground font-normal">(optional)</span>
        </span>
      </div>
    </GlobalModal>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
const ApiIntegrations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openModal } = useModal();

  const [userId, setUserId] = useState('');
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editToken, setEditToken] = useState(null);
  const [rotateTarget, setRotateTarget] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, keyId: null, keyName: '' });

  // Visibility state (eye toggle per key) — persisted in sessionStorage
  const [visible, setVisible] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('api_key_visible') || '{}'); } catch { return {}; }
  });
  const [copiedId, setCopiedId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => { if (user) setUserId(user.id || ''); fetchKeys(); }, [user]);

  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_URL}/api/auth/api-keys`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setKeys(await r.json());
    } catch { } finally { setLoading(false); }
  };

  const handleCreated = data => {
    // Auto-show the newly created key
    if (data.id) setVisible(p => ({ ...p, [data.id]: true }));
    fetchKeys();
  };

  const handleSaved = updated => setKeys(prev => prev.map(k => k.id === updated.id ? { ...k, ...updated } : k));

  const handleRotateConfirm = async (keepActive) => {
    const keyId = rotateTarget?.id;
    setRotateTarget(null);
    if (!keyId) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_URL}/api/auth/api-keys/${keyId}/rotate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep_active_for_hours: keepActive ? 24 : 0 }),
      });
      if (r.ok) {
        setVisible(p => ({ ...p, [keyId]: true }));
        fetchKeys();
        toast({ title: 'Token rotated', description: keepActive ? 'Old token active for 24h grace period.' : 'Old token immediately invalidated.' });
      }
    } catch { toast({ title: 'Error', description: 'Failed to rotate token', variant: 'destructive' }); }
  };

  const confirmDelete = async () => {
    const { keyId } = deleteModal;
    setDeleteModal({ show: false, keyId: null, keyName: '' });
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/auth/api-keys/${keyId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setKeys(p => p.filter(k => k.id !== keyId));
      setVisible(p => { const n = { ...p }; delete n[keyId]; return n; });
      toast({ title: 'Token deleted' });
    } catch { toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }); }
  };

  const copy = (text, type = 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
    else { setCopiedKey(text); setTimeout(() => setCopiedKey(null), 2000); }
    toast({ description: type === 'id' ? 'User ID copied' : 'Token copied to clipboard' });
  };

  const formatExpiry = exp => {
    if (!exp) return null;
    const diff = Math.ceil((new Date(exp) - Date.now()) / 86400000);
    if (diff < 0) return { text: 'Expired', cls: 'text-destructive' };
    if (diff === 0) return { text: 'Expires today', cls: 'text-orange-500' };
    if (diff <= 7) return { text: `Expires in ${diff}d`, cls: 'text-orange-400' };
    return { text: `Expires ${new Date(exp).toLocaleDateString()}`, cls: 'text-muted-foreground' };
  };


  return (
    <div className="space-y-6">
      {/* Modals */}
      <CreateModal onCreated={handleCreated} />
      <EditModal editToken={editToken} onSaved={handleSaved} />
      <RotateModal onConfirm={handleRotateConfirm} />

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">API tokens</h2>
        <p className="text-sm text-muted-foreground">
          These tokens enable API access to your Scrapi account or organization.{' '}
          <strong className="text-foreground">Do not share them with untrusted parties!</strong>{' '}
          <a href="#" className="text-primary hover:underline inline-flex items-center gap-0.5">
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-accent-foreground font-semibold">Scrapi user ID:</span>
          <code className="text-xs font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded ">{userId}</code>
          <button onClick={() => copy(userId, 'id')} className="p-1 rounded hover:bg-muted">
            {copiedId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Personal API tokens card */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <SectionHeader title="Personal API tokens" tip="Personal tokens authenticate API requests on behalf of your user account.">
          <button
            onClick={() => openModal(CREATE_MODAL_ID)}
            disabled={keys.length >= 10}
            className="h-[28px] flex items-center gap-1.5 px-3 rounded-md border border-border bg-card text-[13px] font-bold text-foreground hover:bg-muted hover:border-muted-foreground/30 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Create a new token
          </button>
        </SectionHeader>

        {/* Token list */}
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No API tokens yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {keys.map((key) => {
              const fullKey = key.full_key;
              const isVis = visible[key.id];
              const expiry = formatExpiry(key.expires_at);

              // Using asterisks to perfectly match the design image
              const display = isVis
                ? (fullKey || key.prefix || '(unavailable)')
                : '****************************************';

              return (
                <div key={key.id} className="px-5 py-4 relative">

                  {/* Name label */}
                  <p className="text-sm text-foreground mb-2">{key.name || 'Default API token created on sign up.'}</p>

                  {/* Token row */}
                  <div className="flex items-center gap-2">

                    {/* Input Group (Token + Eye/Copy) */}
                    <div className="flex-1 flex items-center bg-accent border border-border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 h-[30px]">
                      {/* Inner bg for the actual text area to make it look like an input if needed? No, user said same as icons. */}
                      <div className="flex-1 px-3 min-w-0 flex items-center h-full overflow-x-auto hide-scrollbar">
                        <span className={`font-semibold truncate select-all leading-none ${isVis ? 'text-sm text-foreground mt-0' : 'text-lg tracking-[0.02em] text-blue-600 translate-y-[3.5px]'}`}>
                          {display}
                        </span>
                      </div>

                      <div className="flex items-center pr-1.5 shrink-0 gap-0.5">
                        <CustomTooltip content={isVis ? 'Hide' : 'Show'}>
                          <button
                            onClick={() => setVisible(p => ({ ...p, [key.id]: !p[key.id] }))}
                            className="p-1 rounded-md hover:brightness-95 dark:hover:brightness-110 text-muted-foreground transition-all opacity-80 hover:opacity-100"
                          >
                            {isVis ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </CustomTooltip>
                        <CustomTooltip content="Copy">
                          <button
                            onClick={() => copy(fullKey || key.prefix || '')}
                            className="p-1.5 rounded-md hover:brightness-95 dark:hover:brightness-110 text-muted-foreground transition-all ml-0.5 opacity-80 hover:opacity-100"
                          >
                            {copiedKey === (fullKey || key.prefix) ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </CustomTooltip>
                      </div>
                    </div>

                    {/* Action Buttons Group */}
                    <div className="flex items-center shrink-0 gap-1.5">
                      <ActionButton
                        icon={RotateCcw}
                        onClick={() => { setRotateTarget(key); openModal(ROTATE_MODAL_ID); }}
                        title="Rotate"
                      />
                      <ActionButton
                        icon={Pencil}
                        onClick={() => { setEditToken(key); openModal(EDIT_MODAL_ID); }}
                        title="Edit"
                      />
                      <ActionButton
                        label="Delete"
                        variant="danger"
                        onClick={() => setDeleteModal({ show: true, keyId: key.id, keyName: key.name })}
                        disabled={key.is_default}
                      />
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {key.scopes?.length === ALL_SCOPES.length ? (
                      <span className="text-xs text-muted-foreground">Full access</span>
                    ) : key.scopes?.length > 0 ? (
                      key.scopes.map(s => (
                        <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{s}</span>
                      ))
                    ) : null}

                    {expiry && (
                      <><span className="text-xs text-muted-foreground/30">·</span>
                        <span className={`text-xs ${expiry.cls}`}>{expiry.text}</span></>
                    )}

                    {(key.scopes?.length > 0 || expiry) && <span className="text-xs text-muted-foreground/30">·</span>}
                    <span className="text-xs text-muted-foreground">Used {key.usage_count}×</span>

                    {key.last_used_at && (
                      <><span className="text-xs text-muted-foreground/30">·</span>
                        <span className="text-xs text-muted-foreground">Last used {new Date(key.last_used_at).toLocaleDateString()}</span></>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Third-party apps */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <SectionHeader title="Third-party apps & services with access to your account" />
        <div className="px-5 py-4">
          <p className="text-xs text-muted-foreground">These applications are connected to your account and can use API on your behalf.</p>
        </div>
        <div className="py-10 text-center">
          <p className="text-sm font-bold text-muted-foreground">No connected third-party apps</p>
        </div>
      </div>

      {/* Connected third-party accounts */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-3">Connected third-party accounts</h2>
        {[
          { title: 'Account-level integrations', tip: 'Integrations across your entire account.', btn: 'Add account', empty: 'No integrations' },
          { title: 'Actor OAuth accounts', tip: null, btn: null, empty: 'No accounts connected' },
        ].map(sec => (
          <div key={sec.title} className="border border-border rounded-xl bg-card overflow-hidden mb-3">
            <SectionHeader title={sec.title} tip={sec.tip}>
              {sec.btn && (
                <button
                  className="h-[28px] flex items-center gap-1.5 px-3 rounded-md border border-border bg-card text-[13px] font-bold text-foreground hover:bg-muted hover:border-muted-foreground/30 transition-all active:scale-95 shadow-sm"
                >
                  {sec.btn}
                </button>
              )}
            </SectionHeader>
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-1">{sec.empty}</p>
              <a href="#" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">Learn more <ExternalLink className="w-3 h-3" /></a>
            </div>
          </div>
        ))}
      </div>

      <AlertModal
        show={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, keyId: null, keyName: '' })}
        onConfirm={confirmDelete}
        title="Delete API Token"
        message={`Are you sure you want to delete "${deleteModal.keyName}"? This action cannot be undone.`}
        type="warning" showCancel confirmText="Delete" cancelText="Cancel"
      />
    </div>
  );
};

export default ApiIntegrations;
