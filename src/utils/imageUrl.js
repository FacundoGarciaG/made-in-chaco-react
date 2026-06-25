const CLOUDINARY_REGEX = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

export function optimizarUrlCloudinary(url, width) {
  if (!url || !CLOUDINARY_REGEX.test(url)) return url;

  const parts = url.split("/image/upload/");
  if (parts.length !== 2) return url;

  const transforms = width
    ? `f_auto,q_auto,w_${width},c_fill`
    : "f_auto,q_auto";

  return `${parts[0]}/image/upload/${transforms}/${parts[1]}`;
}
