import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
export const MapPage = () => {
  const containerStyle = {
    width: "100%",
    height: "400px",
  };

  const center = {
    lat: -27.4516, // Coordenadas de Resistencia, Chaco
    lng: -58.9867,
  };
  return (
    <>
      <LoadScript googleMapsApiKey="AIzaSyCtbH9GiLRaHeHKgWCn0vfOl3yOMiZFnIQ">
        <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12}>
          <Marker position={center} />
        </GoogleMap>
      </LoadScript>
    </>
  );
};
