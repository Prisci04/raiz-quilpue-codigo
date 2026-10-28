> Documento histórico: sus pruebas remotas no se repitieron en Pre-Sprint 3. Ver `pre-sprint-3-seguridad.md` para el estado de esta revisión.

# Auditoría de seguridad — Raíz Quilpué

Revisión completa de autenticación, autorización, inyección, exposición de datos, configuración y dependencias. Incluye pruebas en vivo contra el servidor de desarrollo y contra PostgREST con la clave pública. 4 de octubre de 2026.

## Resumen

| Severidad | Cantidad |
| --- | --- |
| Críticas | 1 |
| Altas | 2 |
| Medias | 3 |
| Bajas | 5 |
| Fugas de datos confirmadas | 0 |

Lo primero que hay que hacer: actualizar Next.js de 16.3.1 a 16.3.8. La versión instalada acumula tres avisos críticos de ejecución remota de código sin autenticación, uno de ellos específico de servidores Windows. El salto no rompe nada, pero hay que editar `package.json` a mano porque la versión está clavada sin acento circunflejo.

## Hallazgos

### C1 · Crítica — Next.js 16.3.1 acumula tres RCE sin autenticación

- **Dónde:** `package.json` — la versión está clavada exacta, sin `^`.
- **Impacto:** ejecución remota de código sin credenciales. Uno de los avisos afecta específicamente a servidores alojados en Windows, que es el entorno donde se desarrolla. Otro afecta a la API de optimización de imágenes cuando se sirven archivos AVIF, y la app expone `next/image` en el portal público.
- **Evidencia:** `npm audit` marca el rango vulnerable `16.0.0 - 16.3.5`. [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) (RCE en Windows, `<16.3.3`), [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) (RCE vía AVIF, `<16.3.3`), [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) (RCE en `next/og`, `<16.3.6`).
- **Arreglo:** subir a 16.3.8 (mismo major y minor, sin cambios de ruptura). Como `package.json` fija `"next": "16.3.1"`, `npm audit fix` no lo toca: hay que editar la versión a mano y hacer lo mismo con `eslint-config-next`.

### A1 · Alta — El login no tiene ningún límite de intentos

- **Dónde:** `src/app/api/auth/login/route.js`.
- **Impacto:** permite fuerza bruta y credential stuffing contra las cuentas internas. Además es un vector de denegación de servicio: cada intento cuesta un bcrypt de coste 12 (~400 ms de CPU), así que unas pocas decenas de peticiones simultáneas saturan el servidor sin necesidad de acertar ninguna contraseña. El mismo problema afecta al cambio de contraseña.
- **Evidencia:** 15 intentos fallidos seguidos contra una cuenta real devolvieron 401 en 6,3 s en total, sin bloqueo, sin retardo progresivo y sin captcha. El propio archivo reconoce la deuda en un comentario que dice que el rate limiting queda pendiente antes de producción.
- **Arreglo:** limitar por IP y por correo con backoff exponencial y bloqueo temporal tras N fallos. En Vercel sirve el WAF o un contador en un almacén compartido (Upstash, Redis); un `Map` en memoria no vale porque no se comparte entre instancias.

### A2 · Alta — El cuerpo de la petición se carga entero en memoria antes de medirlo

- **Dónde:** `src/lib/auth/credentials.mjs` (`readJsonObject`) y `src/lib/contenidos/respond.js` (`readContenidoBody`).
- **Impacto:** las dos funciones hacen `await request.text()` y solo después comprueban el límite (4096 y 200000 caracteres). Un POST de varios cientos de megas se materializa completo en memoria antes de ser rechazado. El de login es accesible sin autenticación, así que basta con enviar la cabecera `Origin` correcta.
- **Evidencia:** `readJsonObject` lee el texto en la línea 13 y valida el tamaño en la 18. Las Route Handlers del App Router no aplican el límite de tamaño que sí tenían las API Routes antiguas.
- **Arreglo:** rechazar por `content-length` antes de leer el cuerpo, y confiar además en el límite de la plataforma de despliegue (Vercel corta en 4,5 MB; en un `next start` autogestionado no hay tope).

### M1 · Media — La comprobación de origen se puede falsear con x-forwarded-host

- **Dónde:** `src/lib/auth/origin.mjs`, función `isTrustedOrigin`.
- **Impacto:** es la única defensa explícita contra CSRF junto con la cookie `SameSite=Lax`. La función compara el `Origin` con `x-forwarded-host` y, si esa cabecera no la impone un proxy de confianza, el atacante controla los dos lados de la comparación.
- **Evidencia:** con `Origin: http://evil.test` el servidor responde 403 `FORBIDDEN_ORIGIN`. Añadiendo `x-forwarded-host: evil.test` la petición pasa el control y llega a validar credenciales (401). Desde un navegador la explotación es difícil porque una cabecera personalizada dispara preflight, pero desde cualquier cliente no-navegador o detrás de un proxy mal configurado el control desaparece.
- **Arreglo:** validar el `Origin` contra una lista blanca de hosts en variables de entorno, o aceptar `x-forwarded-host` solo cuando la petición venga del proxy conocido.

### M2 · Media — No se envía ninguna cabecera de seguridad

- **Dónde:** `next.config.mjs` — no hay bloque `headers()`.
- **Impacto:** sin `X-Frame-Options` ni `frame-ancestors`, el panel administrativo se puede incrustar en un iframe ajeno (clickjacking sobre acciones como eliminar contenido o desactivar usuarios). Sin CSP no hay red de seguridad ante un XSS futuro; sin HSTS hay ventana para downgrade a HTTP; sin `nosniff` el navegador puede adivinar tipos MIME.
- **Evidencia:** `GET /admin/login` devuelve 200 y ninguna de estas cabeceras: `content-security-policy`, `x-frame-options`, `strict-transport-security`, `x-content-type-options`, `referrer-policy`, `permissions-policy`.
- **Arreglo:** añadir `headers()` en `next.config.mjs` con, como mínimo, `frame-ancestors 'none'` para `/admin`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y HSTS en producción.

### M3 · Media — Un script del repositorio fija una contraseña de administrador débil

- **Dónde:** `scripts/reset-admin-password.mjs`.
- **Impacto:** el script pone la contraseña de `admin@example.com` en `[credencial retirada]` con bcrypt de coste 10, saltándose la política de la aplicación (12 caracteres, mayúscula, número y símbolo). Además lee `.env.local` y lleva la contraseña en claro dentro del código. El archivo está sin rastrear, así que un `git add .` lo subiría al repositorio.
- **Evidencia:** esa credencial no funciona hoy: `admin@example.com` con `[credencial retirada]` devuelve 401 `INVALID_CREDENTIALS`, igual que las otras combinaciones débiles que se probaron. El riesgo es que el script se vuelva a ejecutar o se publique.
- **Arreglo:** borrar el script. Si hace falta una utilidad de recuperación, que pida la contraseña por entrada estándar, use el mismo coste de bcrypt y valide la política antes de escribir.

### B1 · Baja — El hash señuelo usa menos rondas que los reales

- **Dónde:** `src/lib/auth/password.js`.
- **Impacto:** `verifyPassword` compara contra un hash falso cuando el correo no existe, que es la técnica correcta para no filtrar qué cuentas existen. Pero ese señuelo tiene coste 10 y los hashes reales coste 12, así que un correo inexistente responde unas cuatro veces más rápido. Es un oráculo de enumeración de usuarios por temporización.
- **Evidencia:** `DUMMY_PASSWORD_HASH` empieza por `$2b$10$` mientras que `BCRYPT_ROUNDS` vale 12.
- **Arreglo:** regenerar el hash señuelo con 12 rondas.

### B2 · Baja — Las sesiones no se limitan ni se purgan

- **Dónde:** `src/lib/auth/session.js` y la tabla `sesiones`.
- **Impacto:** cada inicio de sesión inserta una fila nueva sin borrar las anteriores del mismo usuario ni limitar cuántas puede haber. Las caducadas solo desaparecen cuando alguien vuelve a usar ese token concreto, así que la tabla crece indefinidamente y un robo de credenciales deja sesiones vivas difíciles de inventariar.
- **Evidencia:** `createSession` solo hace `insert`. `deleteSesionByTokenHash` se ejecuta al validar un token ya caducado o al cerrar sesión.
- **Arreglo:** tarea programada que borre `fecha_expiracion` vencida, y un tope de sesiones simultáneas por usuario.

### B3 · Baja — Las URLs de imagen se guardan validadas pero se pintan sin revalidar

- **Dónde:** `ContenidoDocumento.jsx` (`renderImage`), `ContenidosPanel.jsx` (miniatura del panel), `ActivityCard.jsx`, `ActividadesCalendar.jsx`, `actividad-view.jsx`, `contenido-view.jsx` y `home-view.jsx`.
- **Impacto:** para contenidos, `safeContenidoHref` valida al escribir, pero solo exige esquema `http` o `https`: cualquier dominio externo vale, así que una portada puede recolectar la IP y el user-agent de cada visitante. Para actividades no hay validación de ningún tipo en la capa de aplicación: el servicio devuelve `imagen_url` tal cual y los componentes la pintan directamente. Hoy no existe API de escritura de actividades, así que el valor solo puede entrar por SQL directo, pero el día que se construya ese CRUD el agujero queda abierto si no se reutiliza el validador de contenidos.
- **Evidencia:** `actividades.service.js` expone `imagen_url` sin filtro. Los componentes del portal usan `next/image`, que al menos exige que el host coincida con `remotePatterns`; la miniatura del panel de contenidos y el renderizador del cuerpo usan una etiqueta `img` nativa, que carga cualquier host sin restricción. Esto no es XSS: un `javascript:` o un `data:` en el `src` de una imagen no ejecuta script en los navegadores actuales.
- **Arreglo:** validar el host al escribir (no solo el esquema) y reutilizar `safeContenidoHref` en el futuro formulario de actividades. Acotar los destinos a Supabase Storage y al dominio propio, que es el mismo arreglo que pide B4.

### B4 · Baja — remotePatterns permite cualquier proyecto de Supabase

- **Dónde:** `next.config.mjs`.
- **Impacto:** el patrón `**.supabase.co` habilita el optimizador de imágenes para cualquier proyecto de Supabase del mundo, no solo el propio. Convierte el servidor en un proxy de imágenes de terceros y aumenta la superficie de la API de optimización, que es justamente donde está uno de los RCE críticos.
- **Evidencia:** `remotePatterns` incluye `hostname: "**.supabase.co"`.
- **Arreglo:** fijar el subdominio exacto del proyecto.

### B5 · Baja — Dependencias transitivas con avisos de denegación de servicio

- **Dónde:** `sharp`, `js-yaml`, `brace-expansion`, `micromatch`, `braces`, `fast-glob`.
- **Impacto:** `sharp` 0.35.3 arrastra vulnerabilidades de libheif; el resto son consumos cuadráticos o recursión sin control que se explotan con patrones muy anidados. La mayoría vive en la cadena de desarrollo (ESLint), no en el servidor en producción.
- **Evidencia:** `npm audit` reporta 9 avisos en total: 1 crítico (`next`) y 8 altos. `npm audit fix` resuelve todos los transitivos sin cambios de ruptura.
- **Arreglo:** ejecutar `npm audit fix` y volver a auditar.

## Pruebas ejecutadas contra el servidor

Peticiones reales a `localhost:3000` y a PostgREST.

| Prueba | Observado | Resultado |
| --- | --- | --- |
| 7 endpoints de `/api/admin` sin cookie de sesión | 401 `UNAUTHENTICATED` en los 7 | Correcto |
| Cookie `rq_session` inventada con formato válido | 401 en la API y redirección 307 a `/admin/login` | Correcto |
| Lectura de `usuarios`, `sesiones`, `usuario_roles` y `roles` con la clave pública | 42501 permiso denegado en las cuatro | Correcto |
| Inserción en `contenidos`, `usuarios` y `sesiones` con la clave pública | 42501 en las tres | Correcto |
| Borrador real consultado sin sesión (PostgREST, API y página) | Invisible por RLS, 404 en `/api/contenido/6` y en `/contenido/6` | Correcto |
| POST de login sin `Origin` y con `Origin` ajeno | 403 `FORBIDDEN_ORIGIN` en ambos | Correcto |
| POST de login con `Origin` ajeno más `x-forwarded-host` falso | Pasa el control de origen y llega a validar credenciales | Vulnerable (M1) |
| 15 intentos de login fallidos consecutivos | 15 respuestas 401 en 6,3 s, sin bloqueo ni retardo | Vulnerable (A1) |
| Cabeceras de seguridad en `/admin/login` | Las seis esperadas ausentes | Vulnerable (M2) |
| Credenciales débiles conocidas (`[credencial retirada]`, `admin`) | 401 en todas las combinaciones probadas | Correcto |

## Lo que está bien construido

Cada punto se verificó leyendo el código y, cuando era posible, ejecutando la prueba correspondiente.

### El aislamiento de la base de datos aguanta

Con la clave pública que viaja al navegador, las tablas `usuarios`, `sesiones`, `usuario_roles` y `roles` devuelven 42501 (permiso denegado). Se creó un borrador real y no lo ve ni PostgREST con la clave anónima, ni `GET /api/contenido/6`, ni la página pública `/contenido/6`: los dos responden 404. La política de RLS que limita al rol `anon` a `estado = 'publicada'` funciona.

### Todas las rutas administrativas comprueban la sesión antes de nada

Los 14 handlers bajo `/api/admin` llaman a `requireAdministrador`, `requireGestorContenido` o `requireInternalSession` como primera sentencia. Se probaron 7 endpoints sensibles sin cookie y todos devolvieron 401, incluidos POST de contenidos y PATCH del estado de un usuario. Una cookie inventada con el formato válido (43 caracteres base64url) también cae en 401 y `/admin` redirige a `/admin/login`.

### La autorización nunca viene del frontend

El rol se resuelve siempre consultando `usuario_roles` con el id que sale de la sesión validada. El `rolCodigo` que manda el formulario solo se usa como dato a verificar contra la tabla `roles`, nunca como permiso.

### El manejo de credenciales es sólido

bcrypt con coste 12, token de sesión de 256 bits de `randomBytes`, en base de datos solo el SHA-256 del token, cookie `httpOnly` con `SameSite=Lax` y `secure` en producción, caducidad absoluta de 8 horas e inactividad de 30 minutos. Cambiar la contraseña exige la actual e invalida el resto de sesiones; desactivar a un usuario borra las suyas de inmediato.

### Hay protecciones contra el autobloqueo y la pérdida del último administrador

No puedes desactivar ni eliminar tu propia cuenta, no se puede dejar el sistema sin un administrador activo, y para borrar a alguien primero hay que desactivarlo.

### Sin XSS ni inyección

No existe ningún `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `new Function` en todo `src`. El renderizador de TipTap es una lista blanca de nodos y marcas, `safeHref` bloquea `javascript:` y `data:`, y los enlaces externos salen con `rel="noopener noreferrer"`. Los únicos filtros de PostgREST que reciben entrada del usuario son dos `ilike` sobre el correo, y ambos escapan `%`, `_` y la barra invertida antes de consultar.

### Los secretos están donde deben

`.env.local` está cubierto por `.gitignore` y no aparece en ningún commit del historial. `SUPABASE_SECRET_KEY` solo se usa en archivos marcados con `server-only`, así que nunca entra en un bundle de cliente.

## Orden recomendado

| # | Acción | Esfuerzo |
| --- | --- | --- |
| 1 | Subir Next.js a 16.3.8 y `eslint-config-next` a la par (C1) | Minutos |
| 2 | Ejecutar `npm audit fix` para los transitivos (B5) | Minutos |
| 3 | Borrar `scripts/reset-admin-password.mjs` antes del próximo commit (M3) | Minutos |
| 4 | Añadir `headers()` con CSP, `frame-ancestors`, `nosniff` y HSTS (M2) | 1 hora |
| 5 | Validar `Origin` contra lista blanca en vez de `x-forwarded-host` (M1) | 1 hora |
| 6 | Rate limiting en login y cambio de contraseña (A1) | Medio día |
| 7 | Cortar por `content-length` antes de leer el cuerpo (A2) | 1 hora |
| 8 | Hash señuelo a 12 rondas, purga de sesiones, acotar dominios de imagen (B1–B4) | Medio día |

Los cuatro primeros puntos se pueden cerrar en una sola sesión y eliminan el riesgo crítico junto con la mayor parte de la exposición de configuración. El rate limiting es el único que exige decidir infraestructura, porque un contador en memoria no sirve si la aplicación corre en varias instancias.

## Alcance

Se revisó todo `src`, `database-documentacion`, `scripts`, `next.config.mjs` y el árbol de dependencias. No se auditó la configuración del proyecto en el panel de Supabase ni la plataforma de despliegue. El contenido de prueba creado durante la auditoría se eliminó.
