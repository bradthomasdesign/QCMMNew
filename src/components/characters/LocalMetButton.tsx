import { useState, useEffect } from 'react';
import { Star, Check } from 'lucide-react';

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

interface Props {
  slug: string;
  name: string;
}

export default function LocalMetButton({ slug, name }: Props) {
  const [met, setMet] = useState(false);

  useEffect(() => {
    setMet(getMetSlugs().has(slug));
  }, [slug]);

  if (met) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-400">
        <Check size={16} className="shrink-0" />
        You met {name}!
      </div>
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
