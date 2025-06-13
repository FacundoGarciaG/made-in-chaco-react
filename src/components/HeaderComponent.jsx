import { NavLink } from "react-router-dom";
import "../styles/HeaderComponent.css";
export const HeaderComponent = () => {
  return (
    <>
      <header>
        {/* LOGO  */}
        <NavLink className="logo" to="/" aria-current="page">
          MADE IN CHACO
        </NavLink>

        <input type="checkbox" name="checkbox" id="menu-toggle" />
        <label htmlFor="menu-toggle" className="menu-icon-action">
          <div className="bx bx-menu" id="menu-icon"></div>
        </label>

        <ul className="navlist">
          <li>
            <NavLink to="/" aria-current="page">
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/" aria-current="page">
              Proyecto
            </NavLink>
          </li>
          <li>
            <NavLink to="/" aria-current="page">
              Quienes somos
            </NavLink>
          </li>
          <li>
            <NavLink to="/" aria-current="page">
              Contacto
            </NavLink>
          </li>
        </ul>
      </header>
    </>
  );
};
