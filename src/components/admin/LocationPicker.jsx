import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

function pinIcon() {
  return L.divIcon({
    className: "",
    html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="#1E88E5"/>
      <circle cx="16" cy="16" r="6.5" fill="#FFFFFF"/>
    </svg>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });
}

// Default center: Bhubaneswar, Odisha (propertyBrands HQ) — shown only until
// a pin is set or a search moves the map.
const DEFAULT_CENTER = [20.2961, 85.8245];

function ClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// Recenters the map whenever the coordinate changes from outside a direct
// map interaction (typing into the lat/lng fields, or a search result).
function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.[0], position?.[1]]);
  return null;
}

// Uses OpenStreetMap's free Nominatim search — no API key needed. Only
// fires on explicit search (button click / Enter), never on keystroke, to
// stay well within its light-use policy.
async function geocode(query) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

const inputStyle = { background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#1F2937" };

export default function LocationPicker({ latitude, longitude, onChange }) {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const hasPosition = latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude);
  const position = hasPosition ? [latitude, longitude] : null;

  function pick(lat, lng) {
    onChange({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim() || searching) return;
    setSearching(true);
    setSearchError("");
    try {
      const results = await geocode(search);
      if (!results || results.length === 0) {
        setSearchError("No matching place found — try being more specific, or click directly on the map.");
        return;
      }
      pick(parseFloat(results[0].lat), parseFloat(results[0].lon));
    } catch {
      setSearchError("Search failed — check your connection, or click directly on the map instead.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e); }}
          placeholder="Search an address or locality to jump the map there..."
          className="flex-1 text-sm px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2"
          style={inputStyle}
        />
        <button type="button" onClick={handleSearch} disabled={searching}
          className="text-sm font-bold px-4 rounded-xl shrink-0 disabled:opacity-60"
          style={{ background: "#1E88E5", color: "#FFFFFF" }}>
          {searching ? "Searching..." : "Search"}
        </button>
      </div>
      {searchError && <p className="text-xs" style={{ color: "#DC2626" }}>{searchError}</p>}

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E2E8F0", height: 260 }}>
        <MapContainer center={position || DEFAULT_CENTER} zoom={position ? 15 : 12} style={{ width: "100%", height: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={pick} />
          {position && <Recenter position={position} />}
          {position && (
            <Marker
              position={position}
              icon={pinIcon()}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  pick(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs" style={{ color: "#6B7280" }}>
          {position ? "Drag the pin or click elsewhere on the map to adjust it." : "Click anywhere on the map to drop a pin, or search above."}
        </p>
        {position && (
          <button type="button" onClick={() => onChange({ latitude: null, longitude: null })}
            className="text-xs font-bold hover:underline" style={{ color: "#DC2626" }}>
            Clear pin
          </button>
        )}
      </div>

      {position && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#6B7280" }}>Latitude</label>
            <input type="number" step="any" value={latitude}
              onChange={(e) => onChange({ latitude: e.target.value === "" ? null : parseFloat(e.target.value), longitude })}
              className="w-full text-sm px-3 py-2 rounded-lg focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#6B7280" }}>Longitude</label>
            <input type="number" step="any" value={longitude}
              onChange={(e) => onChange({ latitude, longitude: e.target.value === "" ? null : parseFloat(e.target.value) })}
              className="w-full text-sm px-3 py-2 rounded-lg focus:outline-none" style={inputStyle} />
          </div>
        </div>
      )}
    </div>
  );
}
