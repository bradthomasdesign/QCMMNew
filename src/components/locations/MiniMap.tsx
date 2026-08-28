import { useEffect, useRef } from 'react';

interface Props {
  lat: number;
  lng: number;
  name: string;
}

export default function MiniMap({ lat, lng, name }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!mapEl.current || initialized.current) return;
    initialized.current = true;

    import('leaflet').then((L) => {
      const map = L.map(mapEl.current!, {
        center: [lat, lng],
        zoom: 18,
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:32px;height:32px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      }).addTo(map);
    });

    return () => {
      // Leaflet self-cleans when the DOM node is removed
    };
  }, [lat, lng]);

  return (
    <div
      ref={mapEl}
      style={{ width: '100%', height: '100%' }}
      aria-label={`Map showing location of ${name}`}
    />
  );
}
