import "../styles/HeaderComponent.css";
export const HeaderComponent = () => {
  return (
    <>
      <header>
        {/* LOGO  */}
        <a href="#" className="logo">
          MADE IN CHACO
        </a>

        <input type="checkbox" name="checkbox" id="menu-toggle" />
        <label for="menu-toggle" className="menu-icon-action">
          <div className="bx bx-menu" id="menu-icon"></div>
        </label>

        <ul className="navlist">
          <li>
            <a href="#">Home</a>
          </li>
          <li>
            <a href="#">Proyecto</a>
          </li>
          <li>
            <a href="#">Quiénes somos</a>
          </li>
          <li>
            <a href="#">Contacto</a>
          </li>
        </ul>
      </header>
    </>
  );
};
