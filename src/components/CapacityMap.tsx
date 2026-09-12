import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { UserLocation } from "@/hooks/use-user-location";
import type { IndividualContact } from "@/lib/individual-contacts";
import type { NearbyCarePlace } from "@/lib/nearby-care.server";
import type { Center } from "@/lib/rehab-data";

type MapMode = "centers" | "people";

function pin(color: string, size = 18) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};box-shadow:0 0 0 4px rgba(255,255,255,.9),0 2px 6px rgba(0,0,0,.25)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const USER_PIN = pin("oklch(0.55 0.14 245)", 20);
const PERSON_PIN = pin("oklch(0.62 0.13 310)");
const CARE_PIN = pin("oklch(0.62 0.12 75)");
const REHAB_PIN = pin("oklch(0.48 0.14 150)");

function ViewportController({ location }: { location: UserLocation | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.setView([location.latitude, location.longitude], 10, { animate: true });
  }, [location, map]);
  return null;
}

export default function CapacityMap({ location, individuals, places, centers, mode, onPing, pingPending }: {
  location: UserLocation | undefined;
  individuals: IndividualContact[];
  places: NearbyCarePlace[];
  centers: Center[];
  mode: MapMode;
  onPing: (contact: IndividualContact) => void;
  pingPending: string | undefined;
}) {
  const firstPlace = places[0];
  const firstCenter = centers[0];
  const initialCenter: [number, number] = location
    ? [location.latitude, location.longitude]
    : firstPlace ? [firstPlace.latitude, firstPlace.longitude] : firstCenter ? [firstCenter.latitude, firstCenter.longitude] : [20, 0];

  return (
    <MapContainer center={initialCenter} zoom={location ? 10 : places.length ? 10 : 2} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ViewportController location={location} />
      {location && <Marker position={[location.latitude, location.longitude]} icon={USER_PIN}><Popup>Your current location</Popup></Marker>}
      {mode === "centers" && places.map((place) => (
        <Marker key={place.id} position={[place.latitude, place.longitude]} icon={CARE_PIN}>
          <Popup><strong>{place.name}</strong><br />{place.kind}{place.address && <><br />{place.address}</>}{place.phone && <><br /><a href={`tel:${place.phone.replace(/[^\\d]/g, "")}`}>{place.phone}</a></>}</Popup>
        </Marker>
      ))}
      {mode === "centers" && centers.map((center) => (
        <Marker key={`rehabber-${center.id}`} position={[center.latitude, center.longitude]} icon={REHAB_PIN}>
          <Popup><strong>{center.name}</strong><br />Wildlife rehabilitation center<br />{center.phone && <a href={`tel:${center.phone.replace(/[^\d]/g, "")}`}>{center.phone}</a>}</Popup>
        </Marker>
      ))}
      {mode === "people" && individuals.map((contact) => (
        <Marker key={contact.id} position={[contact.latitude, contact.longitude]} icon={PERSON_PIN}>
          <Popup>
            <strong>{contact.display_name}</strong><br />
            <span>Available on AnimalAid</span><br />
            <button type="button" disabled={!location || pingPending === contact.id} onClick={() => onPing(contact)} className="mt-2 rounded-md bg-[#24734d] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {pingPending === contact.id ? "Sending..." : "Ping for help"}
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
