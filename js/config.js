/* =========================================================================
   CONFIGURACIÓN DE LA EMPRESA — editá estos datos y se actualizan en todo
   el sitio (encabezado, pie, botones de WhatsApp/email y formulario).
   ========================================================================= */
export const CONFIG = {
  marca: 'Taller Pacino',
  marcaCorta: 'TP',
  linea: 'SPORT',
  // WhatsApp en formato internacional, sin + ni espacios. Ej: 5491122334455
  whatsapp: '5490000000000',
  email: 'ventas@tallerpacino.com',
  instagram: 'tallerpacino',
  ciudad: 'Argentina',
  // (Opcional) Endpoint para recibir solicitudes por email sin backend propio,
  // p. ej. Formspree: 'https://formspree.io/f/xxxxxxx'. Vacío = desactivado.
  formEndpoint: '',
};

export function applyConfig(root = document) {
  root.querySelectorAll('[data-cfg]').forEach((el) => {
    const k = el.dataset.cfg;
    if (k === 'whatsapp-link') el.href = `https://wa.me/${CONFIG.whatsapp}`;
    else if (k === 'email-link') { el.href = `mailto:${CONFIG.email}`; el.textContent = CONFIG.email; }
    else if (k === 'instagram-link') { el.href = `https://instagram.com/${CONFIG.instagram}`; el.textContent = '@' + CONFIG.instagram; }
    else if (k === 'year') el.textContent = new Date().getFullYear();
    else if (CONFIG[k] != null) el.textContent = CONFIG[k];
  });
}
