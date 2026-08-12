import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Eye, EyeOff, Lock, Unlock, Pencil, Check, X } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface SlugOption { slug: string; name: string; }

interface Location {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  is_active: boolean;
  is_secret: boolean;
  difficulty_level: number | null;
  character_slugs: string[];
  collection_slugs: string[];
}

interface EditState {
  id: string;
  name: string;
  description: string;
  difficulty_level: string;
  character_slugs: string[];
  collection_slugs: string[];
}

interface Props {
  characterOptions?: SlugOption[];
  collectionOptions?: SlugOption[];
}

function SlugCheckboxes({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: SlugOption[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  if (options.length === 0) return null;
  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter(s => s !== slug) : [...selected, slug]);
  }
  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const on = selected.includes(o.slug);
          return (
            <button
              key={o.slug}
              type="button"
              onClick={() => toggle(o.slug)}
              className={[
                'px-2 py-0.5 rounded-full text-xs border transition-colors',
                on
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--background-secondary)] text-[var(--foreground-muted)] hover:border-[var(--accent)]/50',
              ].join(' ')}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LocationsAdmin({ characterOptions = [], collectionOptions = [] }: Props) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    supabase
      .from('locations')
      .select('id,name,description,latitude,longitude,is_active,is_secret,difficulty_level,character_slugs,collection_slugs')
      .order('name')
      .then(({ data }) => { setLocations(data ?? []); setLoading(false); });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function toggleActive(loc: Location) {
    const { error } = await supabase.from('locations').update({ is_active: !loc.is_active }).eq('id', loc.id);
    if (!error) {
      setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, is_active: !l.is_active } : l));
      showToast(`${loc.name} ${loc.is_active ? 'deactivated' : 'activated'}`);
    }
  }

  async function toggleSecret(loc: Location) {
    const { error } = await supabase.from('locations').update({ is_secret: !loc.is_secret }).eq('id', loc.id);
    if (!error) {
      setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, is_secret: !l.is_secret } : l));
      showToast(`${loc.name} marked ${loc.is_secret ? 'public' : 'secret'}`);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('locations')
      .update({
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        difficulty_level: editing.difficulty_level ? parseInt(editing.difficulty_level) : null,
        character_slugs: editing.character_slugs,
        collection_slugs: editing.collection_slugs,
      })
      .eq('id', editing.id);
    setSaving(false);
    if (!error) {
      setLocations(prev => prev.map(l => l.id === editing.id ? {
        ...l,
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        difficulty_level: editing.difficulty_level ? parseInt(editing.difficulty_level) : null,
        character_slugs: editing.character_slugs,
        collection_slugs: editing.collection_slugs,
      } : l));
      setEditing(null);
      showToast('Location saved');
    }
  }

  const filtered = locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: locations.length,
    active: locations.filter(l => l.is_active).length,
    secret: locations.filter(l => l.is_secret).length,
  };

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--foreground)] text-[var(--background)] text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">Locations</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">Manage all {stats.total} pin locations</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: 'Total', value: stats.total }, { label: 'Active', value: stats.active }, { label: 'Secret', value: stats.secret }].map(s => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-4 py-3">
            <p className="text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
            <p className="text-xs text-[var(--foreground-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search locations…"
          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-9 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">Loading…</div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">Name</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">Difficulty</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--foreground-secondary)]">Active</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--foreground-secondary)]">Secret</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--foreground-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(loc => (
                <tr key={loc.id} className="hover:bg-[var(--background-secondary)] transition-colors align-top">
                  <td className="px-4 py-3">
                    {editing?.id === loc.id ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          value={editing.name}
                          onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))}
                          className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--input-focus)]"
                        />
                        <input
                          value={editing.description}
                          onChange={e => setEditing(p => p && ({ ...p, description: e.target.value }))}
                          placeholder="Description…"
                          className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--input-focus)]"
                        />
                        <SlugCheckboxes
                          label="Collections"
                          options={collectionOptions}
                          selected={editing.collection_slugs}
                          onChange={v => setEditing(p => p && ({ ...p, collection_slugs: v }))}
                        />
                        <SlugCheckboxes
                          label="Characters"
                          options={characterOptions}
                          selected={editing.character_slugs}
                          onChange={v => setEditing(p => p && ({ ...p, character_slugs: v }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{loc.name}</p>
                        {loc.description && <p className="text-xs text-[var(--foreground-muted)] truncate max-w-xs">{loc.description}</p>}
                        {(loc.collection_slugs.length > 0 || loc.character_slugs.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {loc.collection_slugs.map(s => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                                {collectionOptions.find(o => o.slug === s)?.name ?? s}
                              </span>
                            ))}
                            {loc.character_slugs.map(s => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--background-secondary)] text-[var(--foreground-muted)] border border-[var(--border)]">
                                {characterOptions.find(o => o.slug === s)?.name ?? s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === loc.id ? (
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editing.difficulty_level}
                        onChange={e => setEditing(p => p && ({ ...p, difficulty_level: e.target.value }))}
                        className="w-14 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--input-focus)]"
                      />
                    ) : (
                      <span className="text-[var(--foreground-muted)]">{loc.difficulty_level ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(loc)}
                      title={loc.is_active ? 'Deactivate' : 'Activate'}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${loc.is_active ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-[var(--muted)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]'}`}
                    >
                      {loc.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleSecret(loc)}
                      title={loc.is_secret ? 'Make public' : 'Make secret'}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${loc.is_secret ? 'bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20' : 'bg-[var(--muted)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]'}`}
                    >
                      {loc.is_secret ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing?.id === loc.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-xs hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50"
                        >
                          <Check size={12} /> Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--muted)] text-[var(--foreground-muted)] text-xs hover:bg-[var(--muted)] transition-colors"
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing({
                          id: loc.id,
                          name: loc.name,
                          description: loc.description ?? '',
                          difficulty_level: loc.difficulty_level?.toString() ?? '',
                          character_slugs: loc.character_slugs ?? [],
                          collection_slugs: loc.collection_slugs ?? [],
                        })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--muted)] text-[var(--foreground-muted)] text-xs hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)] transition-colors"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-[var(--foreground-muted)]">No locations match &ldquo;{search}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
