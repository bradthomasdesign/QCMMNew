import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, MapPin, Lock, Loader2 } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Location {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  is_secret: boolean;
  difficulty_level: number | null;
}

const STAUNTON_CENTER: [number, number] = [38.1488, -79.0722];

export default function LocationsMap() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Location | null>(null);
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    supabase
      .from('locations')
      .select('id, name, description, latitude, longitude, is_secret, difficulty_level')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); }
        else { setLocations(data ?? []); }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading || !mapEl.current || locations.length === 0) return;
    if (mapInstance.current) return; // already initialized

    import('leaflet').then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapEl.current!, {
        center: STAUNTON_CENTER,
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const dot = (secret: boolean) =>
        L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;border-radius:50%;background:${secret ? '#64748b' : '#f97316'};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

      locations.forEach((loc) => {
        const popup = L.popup({ closeButton: false, className: 'qcmm-popup' })
          .setContent(
            `<div style="padding:2px 0"><strong style="font-size:13px">${loc.name}</strong><br/><a href="/locations/${loc.id}" style="font-size:11px;color:#f97316;text-decoration:none">View details →</a></div>`
          );
        const marker = L.marker([loc.latitude, loc.longitude], { icon: dot(loc.is_secret) })
          .addTo(map)
          .bindPopup(popup)
          .on('click', () => { setSelected(loc); marker.openPopup(); });
        markersRef.current[loc.id] = marker;
      });

      mapInstance.current = map;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loading, locations]);

  function panToLocation(loc: Location) {
    setSelected(loc);
    if (mapInstance.current) {
      mapInstance.current.setView([loc.latitude, loc.longitude], 17, { animate: true });
    }
  }

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">
        Unable to load locations — {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-[var(--theme-shadow-md)]" style={{ height: '420px' }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background-secondary)]">
            <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
          </div>
        )}
        <div ref={mapEl} style={{ width: '100%', height: '100%' }} />
        {/* Leaflet CSS loaded inline */}
        <style>{`
          .leaflet-container { font-family: inherit; background: var(--background-secondary); }
          .leaflet-control-attribution { font-size: 10px; }
          .leaflet-control-zoom a { color: var(--foreground); background: var(--background); border-color: var(--border); }
        `}</style>
      </div>

      {/* Selected location card */}
      {selected && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3">
          <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-[var(--foreground)]">{selected.name}</p>
            {selected.description && (
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{selected.description}</p>
            )}
          </div>
          <button onClick={() => setSelected(null)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Search + list */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${locations.length} locations…`}
            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-9 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-[400px] overflow-y-auto pr-1">
          {filtered.map((loc) => (
            <div key={loc.id} className={[
              'flex items-start gap-3 rounded-xl border p-3 transition-all',
              selected?.id === loc.id
                ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5'
                : 'border-[var(--border)] bg-[var(--background)]',
            ].join(' ')}>
              <button
                onClick={() => panToLocation(loc)}
                className={`mt-0.5 shrink-0 ${loc.is_secret ? 'text-[var(--foreground-muted)]' : 'text-[var(--accent)]'}`}
                aria-label="Pan to location on map"
              >
                {loc.is_secret ? <Lock size={13} /> : <MapPin size={13} />}
              </button>
              <div className="min-w-0 flex-1">
                <a
                  href={`/locations/${loc.id}`}
                  className="block text-sm font-medium text-[var(--foreground)] leading-snug hover:text-[var(--accent)] transition-colors"
                >
                  {loc.name}
                </a>
                {loc.description && (
                  <p className="text-xs text-[var(--foreground-muted)] leading-snug mt-0.5 line-clamp-1">
                    {loc.description}
                  </p>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-8 text-center text-sm text-[var(--foreground-muted)]">
              No locations match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--foreground-subtle)] text-center">
          {filtered.length} of {locations.length} locations shown &middot; orange dots on the map are public pins
        </p>
      </div>
    </div>
  );
}
