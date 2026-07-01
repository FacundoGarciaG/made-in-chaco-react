import { describe, it, expect } from "vitest";
import { optimizarUrlCloudinary } from "./imageUrl";

const BASE_URL = "https://res.cloudinary.com/demo/image/upload/v12345/folder/img.jpg";

describe("optimizarUrlCloudinary", () => {
  it("agrega f_auto,q_auto a URLs de Cloudinary", () => {
    const result = optimizarUrlCloudinary(BASE_URL);
    expect(result).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v12345/folder/img.jpg",
    );
  });

  it("agrega width cuando se especifica", () => {
    const result = optimizarUrlCloudinary(BASE_URL, 300);
    expect(result).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_300,c_fill/v12345/folder/img.jpg",
    );
  });

  it("devuelve null tal cual", () => {
    expect(optimizarUrlCloudinary(null)).toBeNull();
  });

  it("devuelve undefined tal cual", () => {
    expect(optimizarUrlCloudinary(undefined)).toBeUndefined();
  });

  it("devuelve URLs no-Cloudinary sin cambios", () => {
    const url = "https://example.com/image.jpg";
    expect(optimizarUrlCloudinary(url)).toBe(url);
  });

  it("devuelve URLs de iconos locales sin cambios", () => {
    const url = "/icons/artesano.png";
    expect(optimizarUrlCloudinary(url)).toBe(url);
  });
});
