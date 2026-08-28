import { useState, useEffect } from 'react';
import { MapPin, Check } from 'lucide-react';

export const CHECKINS_KEY = 'qcmm-checkins';

export function getCheckedInIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKINS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addCheckedIn(locationId: string) {
  try {
    const ids = getCheckedInIds();
    ids.add(locationId);
    localStorage.setItem(CHECKINS_KEY, JSON.stringify([...ids]));
    window.dispatchEvent(new CustomEvent('qcmm-checkin', { detail: { locationId } }));
  } catch {}
}

interface Props {
  locationId: string;
  locationName: string;
}

export default function LocalCheckInButton({ locationId, locationName }: Props) {
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    setCheckedIn(getCheckedInIds().has(locationId));
  }, [locationId]);

  if (checkedIn) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400">
        <Check size={16} className="shrink-0" />
        Checked in!
      </div>
    );
  }

  return (
    <button
      onClick={() => { addCheckedIn(locationId); setCheckedIn(true); }}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-500)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
    >
      <MapPin size={16} className="shrink-0" />
      Check In at {locationName}
    </button>
  );
}
