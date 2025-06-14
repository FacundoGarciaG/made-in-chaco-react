import "../styles/SidebarComponent.css";

export const SidebarComponent = ({ selected, setSelected }) => {
  return (
    <>
      <div className={`sidebar ${selected ? "open" : "close"}`}>
        {selected && (
          <div className="content">
            <button className="close" onClick={() => setSelected(null)}>
              ×
            </button>
            <h3>{selected.nombre}</h3>
            <p>{selected.descripcion}</p>
            <video width="100%" controls>
              <source src={selected.video} type="video/mp4" />
            </video>
          </div>
        )}
      </div>
    </>
  );
};
