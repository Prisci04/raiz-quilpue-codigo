# Mejora visual y cierre local de HU-23

Revisión del 8 de noviembre de 2026 sobre `pruebas/dev-aparte`, base `360de0a`.

## Auditoría y decisiones

| Área | Hallazgo | Mejora |
| --- | --- | --- |
| Inicio y secciones públicas | Entradas bruscas; respuesta desigual entre tarjetas | Entradas únicas, cortas y sin ocultar el HTML inicial; sombras y elevación discretas |
| Carrusel de inicio | Avance automático sin pausa; controles muy pequeños | Pausa/reanudación, controles táctiles y avance desactivado con movimiento reducido |
| Actividades y contenidos | Filtros pequeños; foco público inconsistente | Áreas de al menos 44 px, estados `aria-pressed`, foco visible y alineación de controles |
| Publicaciones en móvil | Imagen lateral reducía el espacio del texto | Composición vertical en móvil, horizontal desde `sm` |
| Administración | Columnas comprimidas a 1024 px; diálogos abruptos | Anchos mínimos dentro del scroll, foco de paneles y fade de diálogos |
| Ubicación | Bloque poco diferenciado; pérdida de foco al desmontar resultados | Panel, jerarquía, acciones diferenciadas, foco al mapa y retorno al buscador |

Se mantienen paleta, tipografías, contenido e identidad del cliente. No se añaden
animaciones a los formularios, tablas o métricas que puedan distraer del trabajo.
Se corrige también un evento de breakpoint del menú lateral que podía alcanzar
una referencia ya desmontada al navegar mientras cambiaba el ancho de pantalla.

## React Bits y movimiento

`src/components/motion/AnimatedContent.jsx` es una adaptación ligera del patrón
[Animated Content de React Bits](https://reactbits.dev/animations/animated-content),
con implementación nativa de React, IntersectionObserver y Web Animations.
No se instala el componente original con GSAP ni una dependencia nueva.

La entrada combina opacidad y desplazamiento vertical de 12 px durante 420 ms,
una sola vez por montaje. Se aplica a secciones elegidas, sin efectos de blur,
3D, cursores, seguimiento del scroll ni bucles. El contenido permanece visible
en SSR y sin JavaScript. El observador se desconecta al revelar y se liberan los
recursos al desmontar. El foco y los cambios en la preferencia de movimiento
cancelan la animación. Las preferencias también cubren los efectos CSS existentes,
el carrusel y los desplazamientos programáticos de las vistas modificadas.

## HU-23

- Búsqueda explícita, selección por teclado, mapa y corrección por clic o centro.
- Seleccionar un resultado lleva el foco al mapa; quitar coordenadas lo devuelve
  al buscador. El mapa es enfocable incluso antes de cargar Leaflet.
- Lugar y dirección editorial se conservan al elegir o mover un punto.
- `Cómo llegar`: `/maps/dir/?api=1&destination=…`.
- `Abrir en Google Maps`: `/maps/search/?api=1&query=…`.
- Ambas acciones se distinguen visualmente y mediante texto; usan coordenadas
  cuando existen, con fallback al texto y sin mostrar navegación física en virtual.
- Se comprueban guardado, nueva lectura y reapertura con el marcador conservado,
  así como rechazo por esquema incompleto, errores, cancelación y limpieza.

La lógica existente de persistencia no necesitó cambios. API, servicios y mappers
se verifican con dobles locales de autenticación y base de datos; el navegador usa
los componentes reales con servicios de prueba. No se realizan escrituras remotas.
El cierre corresponde al código y la validación local. Los requisitos de despliegue
ya documentados en `hu23-ubicacion.md` siguen requiriendo verificación del entorno
real, incluido el esquema y el proveedor de búsqueda; no se aplicó SQL.

## Validación reproducible

```powershell
node --test scripts/hu23-*.test.mjs
node --test scripts/*.test.mjs
npm.cmd run lint
git diff --check
npm.cmd run build
```

- HU-23: 37 pruebas aprobadas. Suite completa: 406 aprobadas, sin omisiones.
- ESLint, diff y build de producción aprobados.
- Chromium: 11 vistas con componentes reales a 1440, 1024 y 390 px; sin overflow
  horizontal de página ni excepciones. Las tablas y filtros conservan su scroll interno.
- Se revisan inicio, actividades, calendario, contenidos, museo, quiénes somos,
  login, dashboard y listados administrativos de actividades, contenidos y museo.
- Pruebas de movimiento reducido, pausa de carrusel, foco, revelado único y
  estabilidad del espacio ocupado por la animación.
- Build servido con Next: seis rutas (`/`, `/quienes-somos`, `/actividades`,
  `/contenido`, `/museo`, `/admin/login`) en las tres anchuras, HTTP 200, sin
  overflow ni excepciones de runtime. Administración autenticada se revisa con
  componentes reales y fixtures, sin iniciar sesión en una cuenta real.
- Prueba adicional `HU23_LIVE_OSM_TILES=1`: teselas reales visibles en las tres
  anchuras, marcador y atribución; búsqueda y guardados siguen siendo locales.
- Capturas locales en el directorio temporal del usuario: `rq-visual-*.png`,
  `rq-production-*.png`, `rq-hu23-osm-live-*.png` y `rq-hu23-public-*.png`.

No se modifica `.env.local`, SQL, Supabase ni dependencias. No se hace push.
