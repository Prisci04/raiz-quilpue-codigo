export const ACTIVIDADES_FILTERS = [
  "Todas",
  "Visitas",
  "Talleres",
  "Conferencias",
  "Exposiciones",
  "Festivales",
];

export const ACTIVIDADES_MOCK = [
  {
    id: "visita-centro-historico",
    title: "Visita Guiada: Centro Histórico de Quilpué",
    category: "Visitas",
    date: "2026-09-19",
    time: "10:00 hrs",
    location: "Plaza de Armas, Quilpué",
    description:
      "Recorre los principales hitos históricos del centro de Quilpué con guías especializados.",
    fullDescription:
      "Acompáñanos en un recorrido guiado por el centro histórico de Quilpué, donde revisaremos calles, plazas, edificios patrimoniales y relatos que narran la evolución urbana y cultural de nuestra comuna. La visita incluye material histórico y conversación abierta con guías locales.",
    extras: [
      "Duración aproximada: 90 minutos",
      "Guías especializados en patrimonio local",
      "Salida desde la Plaza de Armas",
    ],
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    inscritos: 22,
    cupos: 30,
  },
  {
    id: "taller-memoria-oral",
    title: "Taller de Memoria Oral",
    category: "Talleres",
    date: "2026-09-21",
    time: "15:30 hrs",
    location: "Sala de Archivo Municipal",
    description:
      "Un espacio para registrar historias familiares y vecinales a través de entrevistas y relatos.",
    fullDescription:
      "En este taller práctico abordaremos técnicas para narrar historias de barrio, recuperar testimonios de la comunidad y transformar memoria viva en relatos sostenibles. Participarán docentes, mediadores culturales y habitantes de Quilpué.",
    extras: [
      "Material de trabajo incluido",
      "Actividad de participación abierta",
      "Inscripción con cupo limitado",
    ],
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    inscritos: 15,
    cupos: 18,
  },
  {
    id: "conferencia-patrimonio",
    title: "Conferencia: Patrimonio y Ciudad",
    category: "Conferencias",
    date: "2026-09-24",
    time: "19:00 hrs",
    location: "Casa de la Cultura",
    description:
      "Una mirada crítica sobre la relación entre patrimonio, memoria urbana y comunidad.",
    fullDescription:
      "La conferencia reúne a especialistas y activistas culturales para abordar cómo las ciudades construyen memoria colectiva a partir de bienes patrimoniales, relatos locales y políticas culturales. Un espacio de diálogo entre historia, arte y ciudad.",
    extras: [
      "Entrada libre con inscripción previa",
      "Especialistas invitados",
      "Cierre con preguntas abiertas",
    ],
    image:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    inscritos: 41,
    cupos: 50,
  },
  {
    id: "expo-fotografias-antiguas",
    title: "Exposición: Fotografías del Quilpué antiguo",
    category: "Exposiciones",
    date: "2026-09-27",
    time: "12:00 hrs",
    location: "Museo Digital Raíz",
    description:
      "Un recorrido visual con imágenes históricas de calles, familias y paisajes del pasado.",
    fullDescription:
      "La muestra reúne instantáneas de la historia local entendidas como patrimonio visual: casas, trabajos, fiestas, paseos y paisajes cotidianos. Una mirada estética y documental sobre la memoria colectiva de Quilpué.",
    extras: [
      "Acceso libre durante horario de museos",
      "Sala de proyección incluida",
      "Recorridos guiados los fines de semana",
    ],
    image:
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
    inscritos: 68,
    cupos: 100,
  },
  {
    id: "festival-memoria-viva",
    title: "Festival de la Memoria Viva",
    category: "Festivales",
    date: "2026-10-02",
    time: "17:30 hrs",
    location: "Parque de la Ciudad",
    description:
      "Musica, narración y arte para celebrar la memoria, la identidad y la comunidad local.",
    fullDescription:
      "El festival reúne expresiones culturales, música, poesía y performances que recuerdan la importancia de la identidad local. Una jornada abierta para compartir memoria, arte y encuentro comunitario.",
    extras: [
      "Entrada gratuita",
      "Más de 8 artistas locales",
      "Zona de comida y patrimonio visual",
    ],
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    inscritos: 120,
    cupos: 180,
  },
  {
    id: "visita-archivo-municipal",
    title: "Visita al Archivo Municipal",
    category: "Visitas",
    date: "2026-10-05",
    time: "11:00 hrs",
    location: "Archivo Histórico Municipal",
    description:
      "Descubre documentos, actas y fotografías que revelan la evolución de la comuna.",
    fullDescription:
      "Participa en una visita guiada a las colecciones documentales del archivo municipal, donde se muestran materiales de gran valor para la comprensión histórica de Quilpué y su tejido social.",
    extras: [
      "Capacidad máxima reducida",
      "Recorrido por salas y archivos",
      "Material de apoyo documental",
    ],
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
    inscritos: 18,
    cupos: 24,
  },
  {
    id: "taller-restauracion-objetos",
    title: "Taller de Restauración de Objetos",
    category: "Talleres",
    date: "2026-10-09",
    time: "16:00 hrs",
    location: "Taller de Patrimonio",
    description:
      "Aprende fundamentos básicos para la conservación y cuidado de piezas del patrimonio familiar.",
    fullDescription:
      "En este taller participativo revisaremos técnicas simples de limpieza, documentación y preservación de objetos con valor histórico. Cada participante tendrá una experiencia práctica y una guía de cuidado para su propio patrimonio.",
    extras: [
      "Cupo limitado para 12 personas",
      "Material didáctico incluido",
      "Dirigido a público general",
    ],
    image:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    inscritos: 9,
    cupos: 12,
  },
  {
    id: "conferencia-cultura-popular",
    title: "Conferencia: Cultura Popular y Territorio",
    category: "Conferencias",
    date: "2026-10-12",
    time: "18:30 hrs",
    location: "Auditorio Municipal",
    description:
      "Explora los códigos, fiestas y rituales que forman parte de la identidad local.",
    fullDescription:
      "La conferencia recorrerá prácticas culturales, tradiciones y festividades que han marcado la experiencia colectiva en Quilpué, desde instituciones vecinales hasta celebraciones públicas que aún resuenan en la memoria ciudadana.",
    extras: [
      "Ingreso por inscripción",
      "Encuentro con investigadores locales",
      "Espacio para preguntas",
    ],
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
    inscritos: 38,
    cupos: 45,
  },
  {
    id: "expo-arte-local",
    title: "Exposición: Arte Local en Perspectiva",
    category: "Exposiciones",
    date: "2026-10-16",
    time: "13:00 hrs",
    location: "Galería del Barrio",
    description:
      "Muestra de artistas contemporáneos inspirados por la memoria, el paisaje y la identidad de Quilpué.",
    fullDescription:
      "La galería presenta trabajos de artistas locales que reinterpretan paisajes, recuerdos y materiales del territorio. Un proyecto que conecta la historia de la comuna con el arte contemporáneo.",
    extras: [
      "Apertura con conversación abierta",
      "Exhibición permanente por temporada",
      "Visitas guiadas cada domingo",
    ],
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    inscritos: 52,
    cupos: 75,
  },
  {
    id: "festival-de-los-barrios",
    title: "Festival de los Barrios",
    category: "Festivales",
    date: "2026-10-18",
    time: "16:00 hrs",
    location: "Calle Alameda, Quilpué",
    description:
      "Celebración abierta con música, gastronomía y relatos de los barrios de la ciudad.",
    fullDescription:
      "Una jornada comunitaria donde cada barrio comparte historias, música, sabores y tradiciones. El festival promueve encuentro, memoria territorial y reconocimiento de los protagonistas de la vida cotidiana local.",
    extras: [
      "Actividad abierta al público",
      "Stands de gastronomía local",
      "Espacios de narración y repertorio local",
    ],
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    inscritos: 94,
    cupos: 140,
  },
  {
    id: "visita-patrimonio-cerro",
    title: "Visita a Patrimonio del Cerro",
    category: "Visitas",
    date: "2026-10-22",
    time: "09:30 hrs",
    location: "Mirador del Cerro",
    description:
      "Recorrido por paisajes, arquitectura y memoria de los sectores históricos más relevantes.",
    fullDescription:
      "La visita conecta paisaje, arquitectura y memoria colectiva para entender cómo el territorio y la historia han configurado la identidad de Quilpué. Un recorrido pensado para mirar el entorno con nuevas claves.",
    extras: [
      "Recomendado para grupos pequeños",
      "Guías en formato de recorrido paseo",
      "Incluye recorrido visual y relato",
    ],
    image:
      "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80",
    inscritos: 11,
    cupos: 20,
  },
  {
    id: "taller-documental-familiar",
    title: "Taller: Documental Familiar",
    category: "Talleres",
    date: "2026-10-26",
    time: "14:00 hrs",
    location: "Espacio de Creación Comunitaria",
    description:
      "Aprende a construir un relato visual de tu familia o barrio con material audiovisual y oral.",
    fullDescription:
      "En este taller, cada participante trabajará en torno a fotografías, relatos y materiales familiares para prototipar una pequeña película o documento visual. Una propuesta de creación y memoria colectiva.",
    extras: [
      "Se entregan guías de trabajo",
      "Uso de material audiovisual básico",
      "Cupo pequeño para acompañamiento personalizado",
    ],
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    inscritos: 16,
    cupos: 20,
  },
  {
    id: "conferencia-resiliencia-cultural",
    title: "Conferencia: Resiliencia Cultural",
    category: "Conferencias",
    date: "2026-10-30",
    time: "18:00 hrs",
    location: "Centro de Eventos del Barrio",
    description:
      "Conversación sobre memoria, comunidad y defensa del patrimonio cultural en tiempos cambiantes.",
    fullDescription:
      "Una mirada a la forma en que las comunidades resguardan sus bienes materiales e inmateriales, defendiendo la historia, los métodos de transmisión y las prácticas culturales que sostienen la identidad.",
    extras: [
      "Apertura con proyección documental",
      "Panel con especialistas del territorio",
      "Espacio para intercambio comunitario",
    ],
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
    inscritos: 27,
    cupos: 35,
  },
  {
    id: "expo-sobre-puestos",
    title: "Exposición: Puestos y Mercados",
    category: "Exposiciones",
    date: "2026-11-02",
    time: "10:30 hrs",
    location: "Mercado de Quilpué",
    description:
      "Una mirada a los mercados, comercios y vida cotidiana que durante décadas sostuvieron la comunidad.",
    fullDescription:
      "A través de documentos, objetos y relatos, la muestra revisa la historia económica y social del mercado y los puestos, entendidos como espacio de intercambio cultural y vida vecinal.",
    extras: [
      "Recorrido dictado por historiadores",
      "Incluye testimonios de comerciantes",
      "Muestra de objetos y documentos",
    ],
    image:
      "https://images.unsplash.com/photo-1556908470-38f22a0f3533?auto=format&fit=crop&w=1200&q=80",
    inscritos: 45,
    cupos: 60,
  },
  {
    id: "festival-nocturno",
    title: "Festival Nocturno de Huellas",
    category: "Festivales",
    date: "2026-11-06",
    time: "20:00 hrs",
    location: "Paseo de la Estación",
    description:
      "Música, luz y narración en un festival nocturno para celebrar la comunidad y sus huellas.",
    fullDescription:
      "La noche abre un recorrido artístico con proyecciones, música en vivo, narración teatral y actividades para toda la familia. Una experiencia que vincula la memoria con el presente creativo del territorio.",
    extras: [
      "Entrada libre",
      "Actividades para familias",
      "Escena musical en vivo",
    ],
    image:
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80",
    inscritos: 82,
    cupos: 120,
  },
  {
    id: "visita-paseo-barrio",
    title: "Visita: Paseo por Barrios Tradicionales",
    category: "Visitas",
    date: "2026-11-09",
    time: "09:00 hrs",
    location: "Sector Los Álamos",
    description:
      "Un recorrido por los paisajes y memorias de los barrios tradicionales de la comuna.",
    fullDescription:
      "En este paseo recorreremos barrios clave de Quilpué, revisando cómo la vida cotidiana, la arquitectura y las relaciones comunitarias han dejado huellas que aún dan forma al territorio actual.",
    extras: [
      "Paseo de mañana y charla final",
      "Recomendado para grupos",
      "Cupo limitado",
    ],
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    inscritos: 14,
    cupos: 22,
  },
  {
    id: "taller-estampas-comunitarias",
    title: "Taller de Estampas Comunitarias",
    category: "Talleres",
    date: "2026-11-13",
    time: "16:30 hrs",
    location: "Espacio Abierto Cultural",
    description:
      "Crea estampas inspiradas en plantas, calles y tejidos del patrimonio cotidiano.",
    fullDescription:
      "En una propuesta artística y colectiva, cada participante diseña estampas con referencias del barrio, la historia local y la flora propia del territorio, incorporando la memoria visual como práctica participativa.",
    extras: [
      "Todo el material será entregado",
      "Actividad de creación grupal",
      "Se entregará trabajo final",
    ],
    image:
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80",
    inscritos: 20,
    cupos: 25,
  },
  {
    id: "conferencia-urbanismo-memoria",
    title: "Conferencia: Urbanismo y Memoria",
    category: "Conferencias",
    date: "2026-11-18",
    time: "19:30 hrs",
    location: "Universidad de la Comuna",
    description:
      "Reflexiona sobre cómo el planeamiento urbano afecta la memoria colectiva y la experiencia citadina.",
    fullDescription:
      "El encuentro aborda el vínculo entre urbanismo, patrimonio y barrio, mostrando cómo los cambios del espacio público impactan la identidad y la capacidad de memoria de las comunidades.",
    extras: [
      "Panel con arquitectos y urbanistas",
      "Discusión con la comunidad",
      "Cierre con preguntas",
    ],
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    inscritos: 33,
    cupos: 40,
  },
  {
    id: "expo-pueblos-vecinos",
    title: "Exposición: Pueblos Vecinos",
    category: "Exposiciones",
    date: "2026-11-20",
    time: "11:00 hrs",
    location: "Galería de la Plaza",
    description:
      "Una muestra comparativa sobre historias, paisajes y memorias comunes con las comunas vecinas.",
    fullDescription:
      "La exposición conversa con otros territorios del área metropolitana para entender la interdependencia histórica entre Quilpué y los pueblos vecinos, vista desde su patrimonio, sus rutas y sus redes de vida.",
    extras: [
      "Se acompañará con material documental",
      "Público general",
      "Visitas guiadas los sábados",
    ],
    image:
      "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=1200&q=80",
    inscritos: 58,
    cupos: 80,
  },
  {
    id: "festival-barrial-memoria",
    title: "Festival Barrial de la Memoria",
    category: "Festivales",
    date: "2026-11-26",
    time: "18:30 hrs",
    location: "Plaza del Barrio",
    description:
      "Celebración colectiva con música, relatos y propuestas artísticas para recuperar la memoria local.",
    fullDescription:
      "Una propuesta comunitaria para celebrar relatos de barrio, música local y ejercicios de memoria vivida, donde diferentes actores del territorio se reúnen para narrar la historia común.",
    extras: [
      "Actividad abierta",
      "Más de 10 expresiones artísticas",
      "Espacios de encuentro y participación",
    ],
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
    inscritos: 137,
    cupos: 200,
  },
  {
    id: "visita-escuela-calle",
    title: "Visita: Escuela y Calle",
    category: "Visitas",
    date: "2026-12-01",
    time: "10:00 hrs",
    location: "Paseo de la Escuela Antigua",
    description:
      "Recorrido por escenarios educativos y de vida cotidiana que marcaron la construcción de la comuna.",
    fullDescription:
      "En esta visita revisamos la relación entre educación, barrio y vida pública, explorando lugares y relatos asociados a la infancia, la escuela y la calle como espacios de memoria compartida.",
    extras: [
      "Guías locales",
      "Recorrido urbano y de relato",
      "Actividad para familias y grupos",
    ],
    image:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    inscritos: 12,
    cupos: 18,
  },
  {
    id: "taller-manualidades-historicas",
    title: "Taller de Manualidades Históricas",
    category: "Talleres",
    date: "2026-12-04",
    time: "15:00 hrs",
    location: "Centro Cultural",
    description:
      "Crea objetos inspirados en textilería, oficios y materiales del patrimonio local.",
    fullDescription:
      "A través de técnicas tradicionales y un enfoque de memoria material, este taller invita a reflexionar sobre la historia del trabajo, los materiales y la creatividad en distintos tiempos de la comunidad.",
    extras: [
      "Trabajo colectivo y práctico",
      "Material didáctico incluido",
      "Cupo reducido para acompañamiento",
    ],
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    inscritos: 18,
    cupos: 24,
  },
  {
    id: "conferencia-historia-del-trabajo",
    title: "Conferencia: Historia del Trabajo en Quilpué",
    category: "Conferencias",
    date: "2026-12-08",
    time: "18:30 hrs",
    location: "Auditorio de la Biblioteca",
    description:
      "Un recorrido por las historias del trabajo, la producción y la ciudad en su dimensión humana.",
    fullDescription:
      "La charla revisa la memoria del trabajo en el territorio, desde oficios y empleos locales hasta cambios productivos y su impacto sobre las relaciones sociales y los barrios.",
    extras: [
      "Investigadores y testimonios",
      "Conversación abierta final",
      "Entrada con inscripción",
    ],
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
    inscritos: 29,
    cupos: 38,
  },
  {
    id: "expo-calles-y-viviendas",
    title: "Exposición: Calles y Viviendas",
    category: "Exposiciones",
    date: "2026-12-11",
    time: "12:30 hrs",
    location: "Museo de Barrio",
    description:
      "Una representación visual de la vivienda, la calle y la vida vecinal en la historia local.",
    fullDescription:
      "La muestra reúne planos, relatos y fotografías de distintas épocas para comprender cómo el espacio doméstico y la vida colectiva han configurado las calles y los barrios de Quilpué.",
    extras: [
      "Exposición visual y documental",
      "Conexión con historias familiares",
      "Visitas guiadas los sábados",
    ],
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    inscritos: 64,
    cupos: 90,
  },
  {
    id: "festival-de-las-escuelas",
    title: "Festival de las Escuelas",
    category: "Festivales",
    date: "2026-12-15",
    time: "17:00 hrs",
    location: "Plaza Central",
    description:
      "Un encuentro artístico y patrimonial entre escuelas, familias y comunidad para celebrar la memoria local.",
    fullDescription:
      "El festival reúne diversas escuelas y organizaciones comunitarias para compartir expresiones artísticas ligadas a la historia y la identidad local, fortaleciendo vínculos entre generaciones.",
    extras: [
      "Abierto a familias",
      "Presentaciones culturales",
      "Espacio de intercambio y convivencia",
    ],
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
    inscritos: 148,
    cupos: 220,
  },
  {
    id: "visita-fundacion-local",
    title: "Visita a la Fundación Local",
    category: "Visitas",
    date: "2027-01-08",
    time: "11:30 hrs",
    location: "Fundación del Patrimonio",
    description:
      "Recorrido por colecciones institucionales, relatos de barrio y objetos de valor local.",
    fullDescription:
      "La visita presenta colecciones y materiales restaurados por la fundación local, con foco en la recuperación de memoria de la comunidad y la relación entre pasado y presente.",
    extras: [
      "Recorrido en formato breve",
      "Coordinado por personal especializado",
      "Cupo limitado",
    ],
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
    inscritos: 10,
    cupos: 16,
  },
  {
    id: "taller-historias-domesticas",
    title: "Taller de Historias Domésticas",
    category: "Talleres",
    date: "2027-01-12",
    time: "14:30 hrs",
    location: "Centro Vecinal",
    description:
      "Una experiencia para narrar la historia de la casa, la familia y los espacios cotidianos.",
    fullDescription:
      "Cada participante trabaja con una historia familiar o doméstica para construir un relato oral y visual con valor local, reconociendo la casa y el barrio como escenarios clave de la memoria colectiva.",
    extras: [
      "Trabajos grupales",
      "Actividad participativa",
      "Cupo pequeño para acompañamiento",
    ],
    image:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    inscritos: 17,
    cupos: 22,
  },
  {
    id: "conferencia-futuro-del-patrimonio",
    title: "Conferencia: El Futuro del Patrimonio",
    category: "Conferencias",
    date: "2027-01-20",
    time: "18:00 hrs",
    location: "Casa de la Cultura",
    description:
      "Debate sobre cómo preservar la memoria en un contexto digital, colectivo y cambiante.",
    fullDescription:
      "La discusión reúne pensamiento crítico y práctica cultural para revisar nuevos formatos de patrimonialización, digitalización y participación ciudadana en la memoria común.",
    extras: [
      "Invitados especialistas",
      "Apertura con contexto digital",
      "Espacio de preguntas",
    ],
    image:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    inscritos: 31,
    cupos: 42,
  },
  {
    id: "expo-sentidos-del-barrio",
    title: "Exposición: Sentidos del Barrio",
    category: "Exposiciones",
    date: "2027-01-24",
    time: "13:00 hrs",
    location: "Galería Comunitaria",
    description:
      "Un recorrido sensorial por olores, sonidos, recorridos y recuerdos del barrio.",
    fullDescription:
      "La muestra propone una experiencia sensorial de la memoria urbana, reuniendo relatos, sonidos y fragmentos visuales que permiten entender el barrio como un entramado emocional y colectivo.",
    extras: [
      "Intervención audiovisual",
      "Acceso libre",
      "Recorridos grupales",
    ],
    image:
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
    inscritos: 49,
    cupos: 70,
  },
  {
    id: "festival-vecinos-en-escena",
    title: "Festival Vecinos en Escena",
    category: "Festivales",
    date: "2027-01-30",
    time: "19:00 hrs",
    location: "Plaza del Mercado",
    description:
      "Una celebración escénica con vecinos, artistas y memoria teatral de la comuna.",
    fullDescription:
      "En un formato teatral y participativo, el festival reúne a vecinos y artistas para crear una experiencia de memoria viva donde la comunidad se vuelve protagonista del relato local.",
    extras: [
      "Abierto al público",
      "Escenarios simultáneos",
      "Puesta en escena comunitaria",
    ],
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    inscritos: 122,
    cupos: 180,
  },
];

export const ACTIVIDAD_KEY = "raiz-quilpue-actividades";

export function getStoredActivities() {
  if (typeof window === "undefined") {
    return ACTIVIDADES_MOCK;
  }

  try {
    const raw = window.localStorage.getItem(ACTIVIDAD_KEY);
    if (!raw) return ACTIVIDADES_MOCK;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : ACTIVIDADES_MOCK;
  } catch {
    return ACTIVIDADES_MOCK;
  }
}

export function persistActivities(activities) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVIDAD_KEY, JSON.stringify(activities));
}

export function getActivityById(id) {
  return getStoredActivities().find((activity) => activity.id === id) ?? ACTIVIDADES_MOCK[0];
}
