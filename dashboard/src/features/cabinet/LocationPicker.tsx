import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { LocateFixed, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { Button, toast } from '@/shared/ui';
import { COARSE_ACCURACY_M, locate, locateFailureText } from './geolocation';

// ⚠ Vite'da Leaflet'ning standart marker ikonkasi siniq chiqadi: Vite bergan
// URL allaqachon to'liq, lekin `Icon.Default._getIconUrl` ustiga yana o'zining
// avtomatik aniqlagan `imagePath`ini qo'shib qo'yadi va ikki karra yo'l hosil
// bo'ladi. `L.Icon.Default.mergeOptions` shu sababli ishlamaydi — buning
// o'rniga alohida `L.icon(...)` nusxasi yasab, har bir `<Marker>`ga to'g'ridan
// -to'g'ri beramiz (`Icon.Default`ning ichki yo'l hisoblashi umuman ishlamaydi).
const markerIcon = L.icon({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Farg'ona — kompaniya markazi, xarita shu nuqtada ochiladi (TZ 3.13). */
const DEFAULT_CENTER: [number, number] = [40.3894, 71.7864];
const DEFAULT_ZOOM = 12;
const PIN_ZOOM = 15;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/** "Joylashuvim" holati — foydalanuvchi natijani toast'siz ham ko'rsin. */
type LocateState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | { kind: 'located'; accuracy: number };

export interface LocationPickerProps {
  value: { lat: string; lng: string };
  onChange: (point: { lat: string; lng: string }) => void;
}

/**
 * Yetkazib berish nuqtasini xaritada belgilash (TZ 3.13, D-064).
 *
 * ⚠ Narxga TA'SIR QILMAYDI — faqat logistika uchun, haydovchi manzilni
 *   aniq topishi uchun (CartPage'dagi eski izoh saqlanib qolgan).
 *
 * Uch usul: xaritani bosish, manzil qidiruv (OpenStreetMap Nominatim),
 * yoki brauzer geolokatsiyasi ("Joylashuvim", T-003 — `geolocation.ts`).
 * Belgilangan nuqtaning manzili ham ko'rsatiladi (teskari geokodlash) —
 * mijoz nuqta to'g'ri joyga tushganini raqamlardan emas, nomdan ko'rsin.
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const position: [number, number] | null =
    value.lat && value.lng ? [Number(value.lat), Number(value.lng)] : null;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<[number, number]>(position ?? DEFAULT_CENTER);
  const [locating, setLocating] = useState<LocateState>({ kind: 'idle' });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  // Eski teskari-geokodlash javobi yangisining ustiga yozilmasin
  const addressRequest = useRef(0);

  const setPoint = (lat: number, lng: number, pointAccuracy: number | null = null) => {
    onChange({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
    setCenter([lat, lng]);
    setAccuracy(pointAccuracy);
    if (pointAccuracy === null) setLocating({ kind: 'idle' });
    mapRef.current?.setView([lat, lng], PIN_ZOOM);
    void lookupAddress(lat, lng);
  };

  const lookupAddress = async (lat: number, lng: number) => {
    const request = ++addressRequest.current;
    setAddress(null);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&accept-language=uz&lat=${lat}&lon=${lng}`;
      const response = await fetch(url);
      const data = (await response.json()) as { display_name?: string };
      if (request === addressRequest.current) setAddress(data.display_name ?? null);
    } catch {
      // Manzil — faqat qulaylik; nuqtaning o'zi baribir saqlanadi
    }
  };

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      // ⚠ Nominatim bepul, lekin yuqori trafikda cheklaydi (1 so'rov/soniya
      // siyosati) — B2B checkout uchun yetarli. Trafik oshsa alohida
      // geokodlash xizmatiga o'tish kerak bo'ladi.
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=uz&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data = (await response.json()) as NominatimResult[];
      setResults(data);
      if (data.length === 0) toast.info('Hech narsa topilmadi — boshqa so‘z bilan sinab ko‘ring');
    } catch {
      toast.info('Qidiruv ishlamadi — xaritani bosib nuqtani o‘zingiz belgilang');
    } finally {
      setSearching(false);
    }
  };

  const locateMe = async () => {
    setLocating({ kind: 'pending' });
    const result = await locate();
    if (!result.ok) {
      setLocating({ kind: 'error', message: locateFailureText[result.reason] });
      return;
    }
    const { lat, lng, accuracy: meters } = result.point;
    setPoint(lat, lng, meters);
    setLocating({ kind: 'located', accuracy: meters });
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={(event) => void search(event)} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Manzil qidirish (masalan: Farg‘ona, Mustaqillik ko‘chasi)"
          className="h-9 flex-1 rounded-md border border-line-strong bg-surface px-2 text-sm text-fg"
        />
        <Button type="submit" size="sm" pending={searching}>
          <Search size={15} aria-hidden />
        </Button>
        <Button type="button" size="sm" onClick={() => void locateMe()} pending={locating.kind === 'pending'}>
          <LocateFixed size={15} aria-hidden />
          {locating.kind === 'pending' ? 'Aniqlanmoqda…' : 'Joylashuvim'}
        </Button>
      </form>

      {locating.kind === 'error' && (
        <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
          {locating.message}
        </p>
      )}
      {locating.kind === 'located' && (
        <p role="status" className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted">
          Joylashuvingiz aniqlandi (±{Math.round(locating.accuracy)} m).
          {locating.accuracy > COARSE_ACCURACY_M &&
            ' Aniqlik past — kerak bo‘lsa xaritani bosib nuqtani to‘g‘rilang.'}
        </p>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md border border-line bg-surface p-1 text-xs">
          {results.map((result) => (
            <li key={`${result.lat}-${result.lon}`}>
              <button
                type="button"
                onClick={() => {
                  setPoint(Number(result.lat), Number(result.lon));
                  setResults([]);
                  setQuery(result.display_name);
                }}
                className="block w-full rounded px-2 py-1.5 text-left hover:bg-surface-muted"
              >
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="h-64 overflow-hidden rounded-md border border-line-strong">
        <MapContainer
          center={center}
          zoom={position ? PIN_ZOOM : DEFAULT_ZOOM}
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={setPoint} />
          {position && <Marker position={position} icon={markerIcon} />}
          {position && accuracy !== null && (
            <Circle center={position} radius={accuracy} pathOptions={{ weight: 1, fillOpacity: 0.12 }} />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted">
        {position
          ? `Belgilangan nuqta: ${address ?? `${value.lat}, ${value.lng}`}`
          : 'Xaritani bosib, manzilni qidirib yoki «Joylashuvim» ni bosib nuqta belgilang (ixtiyoriy).'}
      </p>
    </div>
  );
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}
