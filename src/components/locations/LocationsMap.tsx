import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Lock } from 'lucide-react';
import { getCheckedInIds } from './LocalCheckInButton';

export interface LocationEntry {
  slug: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  is_secret: boolean;
  difficulty_level: number | null;
}

interface Props {
  locations: LocationEntry[];
}

const STAUNTON_CENTER: [number, number] = [38.1488, -79.0722];

export default function LocationsMap({ locations }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LocationEntry | null>(null);
  const markersRef = useRef<Record<string, any>>({});
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);

  useEffect(() => {
    setCheckedInIds(getCheckedInIds());
    const onCheckin = () => setCheckedInIds(getCheckedInIds());
    window.addEventListener('qcmm-checkin', onCheckin);
    return () => window.removeEventListener('qcmm-checkin', onCheckin);
  }, []);

  useEffect(() => {
    if (!mapEl.current || locations.length === 0) return;
    if (mapInstance.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapEl.current!, { center: STAUNTON_CENTER, zoom: 15, zoomControl: true });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      const dot = (secret: boolean, checkedIn: boolean) =>
        L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;border-radius:50%;background:${checkedIn ? '#22c55e' : secret ? '#64748b' : '#f97316'};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

      const currentCheckins = getCheckedInIds();
      locations.forEach((loc) => {
        const popup = L.popup({ closeButton: false, className: 'qcmm-popup' }).setContent(
          `<div style="min-width:180px;padding:2px 0">
            <p style="font-weight:600;font-size:13px;color:#111827;margin:0 0 4px">${loc.name}</p>
            ${loc.description ? `<p style="font-size:11px;color:#6b7280;margin:0 0 8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${loc.description}</p>` : ''}
            <a href="/locations/${loc.slug}" style="display:inline-block;font-size:11px;font-weight:500;color:#fff;background:#f97316;padding:4px 10px;border-radius:4px;text-decoration:none">View location</a>
          </div>`
        );
        const marker = L.marker([loc.latitude, loc.longitude], { icon: dot(loc.is_secret, currentCheckins.has(loc.slug)) })
          .addTo(map)
          .bindPopup(popup)
          .on('click', () => { setSelected(loc); marker.openPopup(); });
        markersRef.current[loc.slug] = marker;
      });

      const updateMarkers = (e: Event) => {
        const { locationId } = (e as CustomEvent).detail;
        const m = markersRef.current[locationId];
        const loc = locations.find(l => l.slug === locationId);
        if (m && loc) m.setIcon(dot(loc.is_secret, true));
      };
      window.addEventListener('qcmm-checkin', updateMarkers);

      mapInstance.current = map;

      const userDot = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      if ('geolocation' in navigator) {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([latitude, longitude]);
              userCircleRef.current.setLatLng([latitude, longitude]).setRadius(accuracy);
            } else {
              userMarkerRef.current = L.marker([latitude, longitude], { icon: userDot, zIndexOffset: 1000 }).addTo(map);
              userCircleRef.current = L.circle([latitude, longitude], { radius: accuracy, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }).addTo(map);
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000 }
        );
        return () => {
          navigator.geolocation.clearWatch(watchId);
          if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
        };
      }
    });

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [locations]);

  function panToLocation(loc: LocationEntry) {
    setSelected(loc);
    if (mapInstance.current) mapInstance.current.setView([loc.latitude, loc.longitude], 17, { animate: true });
  }

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] shadow-[var(--theme-shadow-md)]" style={{ height: '420px' }}>
        <div ref={mapEl} style={{ width: '100%', height: '100%' }} />
        <button
          onClick={() => {
            if (!mapInstance.current) return;
            if (userMarkerRef.current) {
              mapInstance.current.setView(userMarkerRef.current.getLatLng(), 17, { animate: true });
            } else {
              navigator.geolocation?.getCurrentPosition((pos) => {
                mapInstance.current.setView([pos.coords.latitude, pos.coords.longitude], 17, { animate: true });
              });
            }
          }}
          className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          title="Center map on your location"
        >
          <MapPin size={12} />
          Find me
        </button>
        <style>{`
          .leaflet-container { font-family: inherit; background: var(--background-secondary); }
          .leaflet-control-attribution { font-size: 10px; }
          .leaflet-control-zoom a { color: var(--foreground); background: var(--background); border-color: var(--border); }
        `}</style>
      </div>

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
            <div key={loc.slug} className={[
              'flex items-start gap-3 rounded-xl border p-3 transition-all',
              selected?.slug === loc.slug
                ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5'
                : 'border-[var(--border)] bg-[var(--background)]',
            ].join(' ')}>
              <button
                onClick={() => panToLocation(loc)}
                className={`mt-0.5 shrink-0 ${checkedInIds.has(loc.slug) ? 'text-green-500' : loc.is_secret ? 'text-[var(--foreground-muted)]' : 'text-[var(--accent)]'}`}
                aria-label="Pan to location on map"
              >
                {loc.is_secret ? <Lock size={13} /> : <MapPin size={13} />}
              </button>
              <div className="min-w-0 flex-1">
                <a
                  href={`/locations/${loc.slug}`}
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

          {filtered.length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-[var(--foreground-muted)]">
              No locations match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--foreground-subtle)] text-center">
          {filtered.length} of {locations.length} locations shown &middot; <span style={{color:'#f97316'}}>●</span> not visited &middot; <span style={{color:'#22c55e'}}>●</span> checked in
        </p>
      </div>
    </div>
  );
}
