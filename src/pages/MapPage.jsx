import { GoogleMap, LoadScript, Marker, Polygon } from "@react-google-maps/api";
import places from "../data/points.json";
import chacoLimits from "../data/chacoLimits.json";
import { useState } from "react";
import "../styles/MapPage.css";
import { SidebarComponent } from "../components/SidebarComponent";
export const MapPage = () => {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");

  const filterPlaces =
    filter === "all" ? places : places.filter((l) => l.categoria === filter);

  const containerStyle = {
    width: "100%",
    height: "100vh",
  };

  const center = {
    lat: -25.820885, // Coordenadas de Resistencia, Chaco
    lng: -60.864564,
  };

  const mapOptions = {
    styles: [
      {
        featureType: "all",
        elementType: "all",
        stylers: [{ saturation: -100 }, { gamma: 0.8 }, { lightness: 10 }],
      },

      {
        featureType: "landscape",
        elementType: "geometry.fill",
        stylers: [{ color: "#dddddd" }],
      },
    ],
    disableDefaultUI: true,
    gestureHandling: "greedy",
  };

  const outerBounds = [
    { lat: 85, lng: -180 },
    { lat: 85, lng: 180 },
    { lat: -85, lng: 180 },
    { lat: -85, lng: -180 },
    { lat: 85, lng: -180 },
  ];

  return (
    <>
      <div className="map-container">
        <LoadScript googleMapsApiKey="AIzaSyCtbH9GiLRaHeHKgWCn0vfOl3yOMiZFnIQ">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={8}
            options={mapOptions}
          >
            {/* Máscara que oscurece todo menos Chaco */}
            <Polygon
              paths={[outerBounds, chacoLimits]}
              options={{
                fillColor: "#000000",
                fillOpacity: 0,
                strokeOpacity: 1,
                clickable: false,
                zIndex: 1,
              }}
            />

            {filterPlaces.map((place) => (
              <Marker
                key={place.id}
                position={place.posicion}
                onClick={() => setSelected(place)}
              />
            ))}
          </GoogleMap>
        </LoadScript>
        <SidebarComponent selected={selected} setSelected={setSelected} />
        <div className="filters">
          <button onClick={() => setFilter("all")}>Todos</button>
          <button onClick={() => setFilter("naturaleza")}>Naturaleza</button>
          <button onClick={() => setFilter("cultura")}>Cultura</button>
        </div>
      </div>
    </>
  );
};
