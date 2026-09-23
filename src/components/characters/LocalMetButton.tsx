import { useState, useEffect } from 'react';
import { Star, Check, X } from 'lucide-react';

export const MET_CHARS_KEY = 'qcmm-met-characters';

export function getMetSlugs(): Set<string> {
  try {
    const raw = localStorage.getItem(MET_CHARS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addMetSlug(slug: string) {
  try {
    const slugs = getMetSlugs();
    slugs.add(slug);
    localStorage.setItem(MET_CHARS_KEY, JSON.stringify([...slugs]));
    window.dispatchEvent(new CustomEvent('qcmm-met-character', { detail: { slug } }));
  } catch {}
}

function removeMetSlug(slug: string) {
  try {
    const slugs = getMetSlugs();
    slugs.delete(slug);
    localStorage.setItem(MET_CHARS_KEY, JSON.stringify([...slugs]));
    window.dispatchEvent(new CustomEvent('qcmm-met-character', { detail: { slug } }));
  } catch {}
}

interface Props {
  slug: string;
  name: string;
}

export default function LocalMetButton({ slug, name }: Props) {
  const [met, setMet] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setMet(getMetSlugs().has(slug));
  }, [slug]);

  if (met) {
    if (confirming) {
      return (
        <div className="inline-flex flex-col gap-2">
          <p className="text-sm text-[var(--color-foreground-muted)]">Remove {name} from your met list?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                removeMetSlug(slug);
                setMet(false);
                setConfirming(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <X size={14} className="shrink-0" />
              Yes, remove
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={() => setConfirming(true)}
        className="group inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        title="Click to undo"
      >
        <Check size={16} className="shrink-0 group-hover:hidden" />
        <X size={16} className="shrink-0 hidden group-hover:block" />
        <span className="group-hover:hidden">You met {name}!</span>
        <span className="hidden group-hover:inline">Undo</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => { addMetSlug(slug); setMet(true); }}
      className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-500)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
    >
      <Star size={16} className="shrink-0" />
      I Met This Character!
    </button>
  );
}
