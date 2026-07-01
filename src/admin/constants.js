export const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram", url: (v) => `https://www.instagram.com/${v}/` },
  { value: "youtube", label: "YouTube", url: (v) => v.startsWith("http") ? v : `https://www.youtube.com/${v.startsWith("@") ? v : "@" + v}` },
  { value: "facebook", label: "Facebook", url: (v) => `https://www.facebook.com/${v}/` },
  { value: "tiktok", label: "TikTok", url: (v) => `https://www.tiktok.com/@${v}` },
  { value: "twitter", label: "X / Twitter", url: (v) => `https://x.com/${v}` },
  { value: "whatsapp", label: "WhatsApp", url: (v) => `https://wa.me/${v.replace(/[^0-9]/g, "")}` },
  { value: "telefono", label: "Teléfono", url: (v) => v },
  { value: "email", label: "Email", url: (v) => `mailto:${v}` },
  { value: "otro", label: "Otro", url: (v) => v },
];

export const COMUNIDADES_ETNICAS = [
  "", "Qom", "Wichí", "Moqoit", "Pilagá", "General",
];

export const QUE_INCLUYE_EXPERIENCIA = [
  "Guía especializado", "Equipo de seguridad", "Refrigerio", "Almuerzo",
  "Traslado ida y vuelta", "Entrada", "Seguro", "Hidratación",
  "Fotografía profesional", "Material didáctico", "Certificado",
  "Alquiler de equipo", "Degustación", "Clase práctica",
];

export const TIPOS_EXPERIENCIA = [
  "Avistaje de aves", "Cabalgata", "Caminata / Trekking", "Cata de alimentos",
  "Excursión en lancha", "Festival", "Feria artesanal", "Gastronomía",
  "Observación de fauna", "Paseo en bicicleta", "Pesca deportiva",
  "Ruta gastronómica", "Taller artesanal", "Taller de cocina",
  "Tour fotográfico", "Visita a comunidades", "Visita guiada",
  "Yoga y bienestar", "Ecoturismo", "Astroturismo",
];

export const TIPOS_PRODUCTO = [
  "Alfajores artesanales", "Alimentos y bebidas", "Artesanías en cuero",
  "Artesanías en madera", "Carnes y embutidos", "Cerveza artesanal",
  "Cestería y fibras naturales", "Conservas y dulces", "Decoración artesanal",
  "Hilados y tejidos", "Indumentaria textil", "Instrumentos musicales",
  "Joyería y bijouterie", "Lácteos artesanales", "Miel y derivados",
  "Muebles artesanales", "Orfebrería y platería", "Panificación artesanal",
  "Plantas y vivero", "Productos regionales", "Quesos artesanales",
  "Textiles y bordados", "Velas y jabones artesanales", "Hierbas medicinales",
];

export const SERVICIOS_SUGERIDOS = [
  "WiFi gratis", "Desayuno incluido", "Aire acondicionado", "Calefacción",
  "Estacionamiento", "Pileta", "Jardín", "Parrilla", "Cocina compartida",
  "Habitación privada", "Baño privado", "Ropa de cama", "Toallas",
  "TV", "Heladera", "Microondas", "Ventilador", "Agua caliente",
  "Mascotas bienvenidas", "Acceso discapacitados", "Transporte al aeropuerto",
  "Excursiones", "Bicicletas", "Lavandería", "Room service",
  "Restaurante", "Bar", "Salón de eventos", "Seguridad 24h",
];

export const ACTIVIDADES_SUGERIDAS = [
  "Feria", "Exposición", "Concierto", "Espectáculo", "Taller",
  "Feria gastronómica", "Feria artesanal", "Muestra de arte",
  "Feria de productores", "Charla / Conferencia", "Feria de emprendedores",
  "Encuentro cultural", "Festival", "Desfile", "Fiesta popular",
  "Ronda de negocios", "Feria de artesanos", "Exposición de arte",
  "Feria de la economía social", "Feria de diseño",
];

export const RUBROS_COMERCIO = [
  "Alfarería y cerámica", "Alimentos y bebidas artesanales", "Artesanías en cuero / Talabartería",
  "Artesanías en madera", "Carnes y embutidos regionales", "Cerveza artesanal",
  "Cestería y fibras naturales", "Comercio minorista", "Comercio mayorista",
  "Conservas y dulces", "Construcción y materiales", "Consultoría y asesoría",
  "Decoración artesanal", "Educación y capacitación", "Farmacia y perfumería",
  "Ferias y eventos", "Ferretería", "Gastronomía / Restaurante",
  "Gastronomía típica regional", "Herrería artesanal", "Hierbas medicinales y aromáticas",
  "Hilados y tejidos artesanales", "Indumentaria textil", "Indumentaria deportiva",
  "Informática y tecnología", "Instrumentos musicales", "Joyería y bijouterie artesanal",
  "Juguetería y librería", "Kiosco y almacén", "Lácteos artesanales",
  "Limpieza e higiene", "Mascotas y veterinaria", "Miel y derivados",
  "Muebles artesanales", "Mueblería y decoración", "Orfebrería y platería",
  "Panadería y pastelería", "Panificación y pastelería artesanal", "Papelería e imprenta",
  "Peluquería y barbería", "Plantas y vivero", "Productos regionales",
  "Quesos artesanales", "Reciclado y reutilización", "Repostería artesanal",
  "Salud y bienestar", "Servicios culturales", "Servicios turísticos",
  "Supermercado y autoservicio", "Textiles y bordados tradicionales", "Transporte y logística",
  "Velas y jabones artesanales", "Venta de combustibles", "Vidriería y cristalería",
];

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const CATEGORIAS_HOSPEDAJE = [
  "Hotel", "Cabaña", "Hostel", "Posada", "Complejo turístico",
  "Camping", "Departamento temporario", "Casa de campo",
  "Albergue", "Lodge", "Eco-aldea", "Hostería", "Resort",
];

export const TIPOS_RELATO = [
  "Leyenda", "Historia", "Memoria", "Testimonio",
  "Tradición oral", "Mitología", "Anécdota", "Crónica",
  "Poesía", "Narrativa", "Relato de viaje", "Saberes ancestrales",
];

export const FIELD_LABELS = {
  nombre: "Nombre", resumen: "Descripción", email: "Email",
  direccion_escrita: "Dirección", latitud: "Latitud", longitud: "Longitud",
  localidad_id: "Localidad", imagen: "Foto de portada",
  biografia_larga: "Descripción", redes_sociales: "Redes sociales",
  sitio_web: "Sitio web", razon_social: "Razón social", cuit: "CUIT",
  rubro_especifico: "Rubro específico", horario_apertura: "Horario apertura",
  horario_cierre: "Horario cierre", dias_abierto: "Días abierto",
  acepta_tarjetas: "Acepta tarjetas", fecha_evento: "Fecha del evento",
  duracion_dias: "Duración (días)", actividades_principales: "Actividades principales",
  link_entradas: "Link de entradas", es_itinerante: "Es itinerante",
  fecha_inicio_suscripcion: "Inicio suscripción",
  fecha_fin_suscripcion: "Fin suscripción",
  tecnica_principal: "Técnica principal", materiales_usados: "Materiales usados",
  anios_experiencia: "Años de experiencia", taller_abierto: "Taller abierto",
  comunidad_etnica: "Comunidad étnica", contacto_comercial: "Contacto comercial",
  historia_plato: "Historia del plato", ingredientes_clave: "Ingredientes clave",
  receta_destacada: "Receta destacada",
  establecimientos_donde_probar: "Establecimientos",
  año_referencia: "Año de referencia", estilo_arquitectonico: "Estilo arquitectónico",
  declaratoria_oficial: "Declaratoria oficial",
  estado_conservacion: "Estado de conservación",
  nombre_completo: "Nombre completo", apodo: "Apodo",
  biografia_resumida: "Biografía", profesion: "Profesión",
  fecha_nacimiento: "Fecha de nacimiento",
  es_referente_comunidad: "Referente comunitario", contacto: "Contacto",
  etnia: "Etnia", lenguas: "Lenguas", territorio_tradicional: "Territorio tradicional",
  cosmovision: "Cosmovisión", categoria_natural: "Categoría natural",
  actividades: "Actividades", acceso: "Acceso",
  flora_fauna_destacada: "Flora y fauna destacada", mejor_epoca: "Mejor época",
  categoria_hospedaje: "Categoría", servicios: "Servicios",
  capacidad: "Capacidad", tipo_producto: "Tipo de producto",
  metodos_produccion: "Métodos de producción", certificaciones: "Certificaciones",
  tipo_experiencia: "Tipo de experiencia", duracion_experiencia: "Duración",
  que_incluye: "Qué incluye", precio_referencia: "Precio de referencia",
  contacto_reserva: "Contacto / Reserva", operador: "Operador",
  autor: "Autor", fecha_relato: "Fecha del relato",
  tipo_relato: "Tipo de relato", contenido_completo: "Contenido completo",
  tipo_espacio: "Tipo de espacio", horarios: "Horarios",
};
