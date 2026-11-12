# Indumentaria Personalizada — Sitio web + Personalizador 3D

Sitio web para empresa de ropa personalizada (empresas, colegios y clubes deportivos), con prendas en 3D y un personalizador interactivo para que el cliente arme su diseño y envíe una **solicitud de presupuesto**.

## Qué incluye

**Portada (`index.html`)**
- Hero con una prenda 3D que gira, se arrastra y cambia de prenda y colores.
- Sectores: Empresas, Colegios y Clubes. Cada uno abre el personalizador con un diseño base.
- Catálogo: camiseta, manga larga, musculosa, chomba, buzo canguro y short, todos renderizados en 3D. Al pasar el mouse se ve la espalda.
- Galería de 12 plantillas de diseño, el proceso de trabajo, técnicas y telas, preguntas frecuentes y botón flotante de WhatsApp.

**Personalizador (`personalizar.html`)**, el dashboard del cliente
- **Prenda:** tipo de prenda, cuello (redondo, en V o polo) y tela.
- **Diseño:** 12 estilos (bastones, rayas, franja, banda diagonal, degradé, mitades, laterales, hombros, chevron, geométrico, pinceladas) y plantillas.
- **Colores:** principal, secundario, detalles, mangas, cuello y puños, y textos. Tiene colores rápidos y paletas sugeridas.
- **Textos:** frente (institución), nombre en la espalda, número y 5 tipografías.
- **Logo:** se sube un escudo o logo (PNG, JPG o SVG) y se elige la posición y el tamaño.
- Visor 3D con vistas de frente, espalda y lateral, giro 360°, zoom y deshacer/rehacer.
- **Ficha técnica en PNG** con el frente, la espalda y todas las especificaciones.
- **Link para compartir** el diseño.
- **Mis diseños:** guarda variantes en el navegador para compararlas.
- **Mi solicitud:** se pueden agregar varias prendas con cantidades por talle (adulto y niño), técnica preferida y notas. Después se completa el formulario de contacto y se envía por **WhatsApp** o **email** con todo el detalle. Las fichas se descargan para adjuntarlas.

No se muestran precios: el sitio junta toda la información para que la empresa arme el presupuesto.

## Configuración

Editá **`js/config.js`**:

```js
marca: 'Indumentaria Personalizada',
whatsapp: '5490000000000',   // número real, formato internacional sin "+"
email: 'ventas@tuempresa.com',
instagram: 'tuempresa',
formEndpoint: '',            // opcional (p. ej. Formspree) para recibir las solicitudes por mail automáticamente
```

Las plantillas de diseño y las paletas están en `js/templates.js`. El catálogo de prendas, los estilos, las telas y las tipografías están en `js/garment.js`.

## Cómo verlo

Es un sitio estático: no hace falta compilar nada. Como usa módulos de JavaScript, hay que abrirlo desde un servidor (no con doble clic sobre el archivo):

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Para publicarlo sirve cualquier hosting estático: GitHub Pages, Netlify, Vercel, Hostinger, etc.

## Técnica

- 3D con [Three.js](https://threejs.org) r169, incluido en `vendor/` (no depende de CDNs).
- Las prendas se generan por código, sin modelos externos. El diseño se pinta en un canvas y se aplica como textura, así que cualquier combinación se ve al instante.
- Fuentes de Google Fonts.
