# ReorganizaciónVisual1

## Propósito

Propuesta piloto de modernización visual para Raíz Quilpué. Conserva la identidad
cultural y la paleta tierra de la corporación, con mejor jerarquía, profundidad
y comodidad de uso. Es una propuesta para presentar al cliente.

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
| Identidad | Marrón institucional `#704a31`, tinta `#50321f`, marfil `#fffdf9`, superficies cálidas `#f4ece4`. Hojas Lucide como símbolo de territorio; sin estética robótica. |
| Jerarquía | Etiqueta breve, título con la tipografía Raíz existente y descripción concisa. El nombre y la disponibilidad provienen de la configuración real. |
| Tarjetas | Radio de 18–24 px, borde cálido de 1 px y sombra suave `0 16px 48px rgb(80 50 31 / 9%)`. Separar zonas por propósito. |
| Espaciado | Base de 8 px; separaciones de 12, 16 y 24 px. Padding de 24 px en escritorio y 12–18 px en móvil. |
| Botones | Acción principal marrón con texto marfil; secundarias claras con borde. Alto mínimo de 44 px. Hover con fondo y borde más definidos. |
| Inputs | Bordes cálidos, radios de 12–16 px, labels reales, foco visible y feedback del contenedor. Textarea de chat a 16 px en móvil. |
| Estados | Disponibilidad con texto y punto; activa/inactiva con texto y distintivo. Guardado con icono, texto y `role=status`; errores con `role=alert`. No depender solo del color. |
| Conversación | Usuario alineado a la derecha en marrón; asistente en marfil con esquina asimétrica. Lectura acotada, texto preservado y enlaces relacionados como tarjetas pulsables. |
| Inicio | Bienvenida cultural, saludo configurable y cuatro sugerencias. Una sugerencia prepara la pregunta y lleva el foco al input; el visitante la envía por el flujo existente. |
| Conocimiento | Tarjetas con categoría, estado, orden, extracto y acciones etiquetadas. Búsqueda local por texto y filtro por estado; sin consultas ni cambios al almacenamiento. |

`AssistantIdentity.jsx` centraliza el símbolo, nombre y estado. `ChatPanel.jsx`
se reutiliza en las tres superficies; la prueba administrativa mantiene su
provider y conversación separados. El widget ofrece minimizar, cerrar con Escape,
reiniciar la conversación y abrir el asistente completo. El diálogo no es modal,
por lo que permite seguir usando la página.

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
- Duración del reveal: 420 ms; desplazamiento de 12 px. El contenido permanece
  visible durante SSR y cuando no hay soporte de animación.
- Hover de botones e inputs: transiciones CSS de 160 ms; desplazamiento de 2–3 px
  solo en sugerencias y lanzador del widget.
- Widget: entrada CSS de 200 ms y salida mediante Web Animations de 140 ms antes
  de desmontar. Se devuelve el foco al lanzador al cerrar.
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
- Widget de hasta 400 px, limitado al ancho y alto disponibles, con márgenes
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
como `rq-hu22-{chat,welcome,widget,admin,knowledge,help}-{ancho}.png`.
La revisión visual administrativa usa este entorno controlado, no una sesión
contra datos remotos del cliente. La fuente Poppins del build requiere acceso
a Google Fonts; no se cambia la configuración de fuentes para este piloto.

Resultado de esta entrega: 19 pruebas HU-22 aprobadas; suite completa de 456
pruebas aprobadas, sin omisiones. Lint, `git diff --check` y build correctos.
Capturas revisadas para las tres superficies a las tres anchuras, incluyendo
bienvenida, conversación, base de conocimiento y ayuda.

## Futuro

Si la propuesta es aprobada por el cliente, ReorganizaciónVisual1 podrá utilizarse como referencia para modernizar progresivamente el resto de Raíz Quilpué.

Recoger primero la opinión del cliente sobre densidad, tipografía y tono visual.
En una extensión futura, extraer los tokens aprobados a un sistema compartido
de forma gradual; conservar por ahora el alcance aislado de este piloto.
