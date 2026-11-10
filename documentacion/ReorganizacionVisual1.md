# ReorganizaciónVisual1

## Propósito

Propuesta piloto de modernización visual para Raíz Quilpué. Conserva la identidad
cultural y la paleta tierra de la corporación, con mejor jerarquía, profundidad
y comodidad de uso. Esta segunda pasada consolida la **propuesta piloto final
para validación del cliente**, sobre la primera versión funcional.

## Interfaces piloto

- `/asistente`: experiencia principal, bienvenida, sugerencias y conversación.
- Widget flotante: acceso discreto y versión compacta del mismo chat.
- `/admin/ia`: configuración, base de conocimiento, ayuda y prueba del asistente.

No se extiende el rediseño a otras páginas, layouts ni navegación del portal.
No cambia HU-22: proveedor mock, contexto, API, permisos, persistencia y CRUD.
No conecta Qwen, usa claves, aplica SQL 020 ni modifica `.env.local`.

## Principios y patrones para replicar

Los estilos están en `src/components/ai/assistant.css`, con selectores `ai-*`.
Las variables se declaran únicamente en las raíces del piloto. No añadir reglas
globales para `body`, botones, formularios ni tarjetas compartidas del portal.

| Patrón | Aplicación |
| --- | --- |
| Identidad | Raíz Quilpué IA: hoja + destello y badge IA discreto; producto interno de la corporación. El logo institucional permanece intacto. |
| Jerarquía | Título editorial en Poppins, acento en la tipografía Raíz existente, etiquetas breves y descripción concisa. Disponibilidad real desde la configuración. |
| Superficies | Radios de 18–30 px y sombras suaves para los bloques principales. Bordes solo en inputs, separadores o énfasis; evitar tarjetas dentro de tarjetas. |
| Espaciado | Base de 8 px; separaciones de 12, 16 y 24 px. Padding de 24 px en escritorio y 12–18 px en móvil. |
| Botones | Acción principal marrón con texto marfil; secundarias claras con borde. Alto mínimo de 44 px. Hover con fondo y borde más definidos. |
| Inputs | Bordes cálidos, radios de 12–16 px, labels reales, foco visible y feedback del contenedor. Textarea de chat a 16 px en móvil. |
| Estados | Disponibilidad con texto y punto; activa/inactiva con texto y distintivo. Guardado con icono, texto y `role=status`; errores con `role=alert`. No depender solo del color. |
| Conversación | Usuario a la derecha en marrón profundo; IA como bloque abierto con acento lateral cálido. Lectura acotada, texto preservado y enlaces subrayados con separadores, sin otra tarjeta anidada. |
| Inicio | Bienvenida cultural, saludo configurable y cuatro sugerencias. Una sugerencia prepara la pregunta y lleva el foco al input; el visitante la envía por el flujo existente. |
| Conocimiento | Tarjetas con categoría, estado, orden, extracto y acciones etiquetadas. Búsqueda local por texto y filtro por estado; sin consultas ni cambios al almacenamiento. |

`AssistantIdentity.jsx` centraliza el símbolo, nombre y estado. `ChatPanel.jsx`
se reutiliza en las tres superficies; la prueba administrativa mantiene su
provider y conversación separados. El widget ofrece minimizar, cerrar con Escape,
reiniciar la conversación y abrir el asistente completo. El diálogo no es modal,
por lo que permite seguir usando la página.

## Identidad Raíz Quilpué IA

La firma institucional es siempre **Raíz Quilpué IA** en la cabecera del chat,
widget y vista previa. El símbolo combina una hoja con un destello pequeño:
territorio e inteligencia artificial, sin una marca separada ni un robot genérico.
El hero acompaña la firma con un badge IA dorado y una hoja ornamental discreta.

`src/components/ai/presentation.mjs` define la identidad y adapta únicamente la
visualización del nombre predeterminado `Asistente Raíz`. No cambia defaults del
backend, respuestas, saludos configurables ni datos persistidos. Un nombre
personalizado se conserva como subtítulo de la firma y como autor de las respuestas.
El input de configuración mantiene su valor original y sigue siendo editable.

## Contraste y composición editorial

Mantener marrón institucional `#704a31`, tinta `#50321f`, marfil `#fffdf9` y beige
`#f4ece4`. La segunda pasada añade marrón profundo `#30241d`, dorado `#dfb47e` y
terracota `#a85e3e`. Usar el dorado sobre superficies oscuras; para texto pequeño
en fondos claros usar marrón o terracota oscuro, no dorado claro.

En `/asistente`, el hero oscuro se une a la conversación marfil en una composición
de dos columnas, con una sola sombra exterior. El título «Descubre Quilpué
conversando» mezcla jerarquía contemporánea con la tipografía cultural existente.
En móvil los bloques se apilan, el hero se compacta y desaparece la ornamentación.
Las cuatro sugerencias numeradas son accesos al compositor, con entrada escalonada.

Reducir cajas anidadas: no enmarcar el saludo, cada respuesta y cada enlace.
Crear jerarquía mediante espacio, contraste de superficies y líneas puntuales.
Reservar sombras para la composición principal, compositor, widget y vista previa.

## Patrón dashboard de Admin

Cabecera con identidad, badge Experiencia IA, estado del formulario y ayuda.
Tres indicadores separados, sin otra tarjeta contenedora: activación del formulario
(bloque oscuro), total y secciones activas, modo Mock de esta versión. No mostrar
fechas ni estados de conexión inventados. El indicador Mock describe el proveedor
de prueba que usa actualmente HU-22; no representa una conexión externa ni consulta
configuración privada. Revisar este texto cuando se autorice otro proveedor.

Configuración y vista previa tienen columnas equilibradas; la vista previa usa
la misma firma y cabecera oscura del widget. Agrupar los campos con `fieldset` y
`legend` en identidad/bienvenida y respuestas/orientación. A 1100 px o menos pasan
a una columna. Los indicadores se mantienen visibles y se reorganizan en móvil.

La base de conocimiento se presenta como biblioteca abierta: encabezado cultural,
filtros y grilla de dos columnas, sin tarjeta exterior. Cada ficha usa un acento
lateral de terracota, categoría, estado, orden y acciones con separador. En móvil,
una columna. Se conserva el CRUD y sus diálogos existentes.

La ayuda conserva su explicación funcional y usa `AdminDialog`: diálogo nativo,
foco contenido, Escape y retorno al control que lo abrió. El botón anuncia
`aria-haspopup=dialog` y tiene nombre accesible. Incluye un consejo para guardar
y probar las respuestas, sin vocabulario técnico.

## React Bits / motion

Se reutiliza `src/components/motion/AnimatedContent.jsx`, adaptación ligera ya
existente de Animated Content de React Bits. No se instala ninguna dependencia.

- Cabeceras y secciones: reveal al entrar en pantalla con el componente existente.
- Tarjetas de conocimiento y mensajes: reveal individual al hacerse visibles;
  el observer se desconecta después de la primera entrada.
- `AnimatedContent` acepta `delay`, `distance` y `duration`; sus defaults siguen
  siendo 0 ms, 12 px y 420 ms, preservando los usos del resto del portal.
- Hero por capas: 520–560 ms, hasta 24 px y demoras de 0–260 ms. Sugerencias:
  360 ms, 14 px y escalones de 65 ms. Métricas: escalones de 80 ms. Biblioteca:
  demoras acotadas a 260 ms, aunque crezca el listado. Mensajes: 240 ms y 8 px.
  El contenido permanece visible en SSR y sin soporte de animación.
- Hover de botones e inputs: transiciones CSS de 160 ms; desplazamiento de 2–3 px
  solo en sugerencias y lanzador del widget.
- Widget: entrada CSS de 280 ms y salida mediante Web Animations de 180 ms antes
  de desmontar, combinando escala .94 y fade. Se devuelve el foco al lanzador.
- Guardado: entrada breve del aviso; loading con spinner únicamente mientras hay
  una operación pendiente.
- `prefers-reduced-motion`: omite reveal y salida del widget, elimina animaciones
  y transiciones del piloto. AnimatedContent cancela la animación si la preferencia
  cambia o el usuario enfoca su contenido.

Evitar efectos permanentes, WebGL, partículas, 3D, librerías de animación pesadas
y animar todo el listado simultáneamente. Mantener los efectos vinculados a una
interacción o entrada, con trabajo acotado a los elementos visibles.

## Responsive y accesibilidad

- Revisión a 1440, 1024 y 390 px, con viewport de 900 px de alto.
- Admin pasa a una columna hasta 1100 px; filtros y acciones se reorganizan.
- El chat tiene scroll interno y compositor fuera del área desplazable. En móvil
  se compacta la bienvenida para mostrar las sugerencias cerca del saludo.
- Widget de hasta 410 px, limitado al ancho y alto disponibles, con márgenes
  seguros. A poca altura oculta bienvenida/sugerencias y el lanzador abierto
  para priorizar mensajes, cierre e input. Revisado también a 390 × 430 px.
- Contraste con tinta oscura sobre superficies claras y marfil sobre marrón;
  foco de 2 px, etiquetas, controles de 44 px y estados con texto.
- Se conservan el log anunciado, Enter para enviar, Shift+Enter para nueva línea,
  composición de texto, límite de caracteres y recuperación tras errores.

## Validación

```powershell
node --test scripts/hu22-*.test.mjs
node --test scripts/*.test.mjs
npm.cmd run lint
git diff --check
npm.cmd run build
```

Las pruebas HU-22 usan componentes y APIs reales con autenticación de prueba,
fuentes controladas y repositorio temporal, sin acceso a Supabase remoto. Cubren
CRUD, permisos, chat compartido, errores, teclado, diálogos, filtros, sugerencias,
overflow y movimiento reducido. Las capturas se guardan en el directorio temporal
como `rq-hu22-{chat,welcome,launcher,widget,admin,knowledge,help}-{ancho}.png`.
La revisión visual administrativa usa este entorno controlado, no una sesión
contra datos remotos del cliente. La fuente Poppins del build requiere acceso
a Google Fonts; no se cambia la configuración de fuentes para este piloto.

Resultado de esta entrega: 19 pruebas HU-22 aprobadas; suite completa de 456
pruebas aprobadas, sin omisiones. Lint, `git diff --check` y build correctos.
Capturas revisadas para las tres superficies a las tres anchuras, incluyendo
bienvenida, conversación, base de conocimiento y ayuda. Se comprueba también que
el renombre visual no altera el nombre guardado y que los nombres personalizados
siguen visibles. La página y el widget se revisaron adicionalmente sirviendo el
build real con Poppins a las tres anchuras, configuración de prueba y sin acceso
a datos remotos. Capturas: `rq-rv1-production-{chat,widget}-{ancho}.png` en el
directorio temporal.

## Futuro

Si la propuesta es aprobada por el cliente, ReorganizaciónVisual1 podrá utilizarse como referencia para modernizar progresivamente el resto de Raíz Quilpué.

Recoger primero la opinión del cliente sobre densidad, tipografía y tono visual.
En una extensión futura, extraer los tokens aprobados a un sistema compartido
de forma gradual; conservar por ahora el alcance aislado de este piloto. Replicar
el contraste oscuro/marfil, el balance Poppins/Raíz, la jerarquía por espacio y
los límites de movimiento antes de agregar más efectos. Evitar convertir cada
sección del portal en una sucesión de tarjetas o propagar el tema de IA a páginas
que cumplen otro propósito. Ninguna expansión se realiza en esta entrega.
