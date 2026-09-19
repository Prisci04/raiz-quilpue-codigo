import Image from "next/image";

const content = {
  // CAMBIAR TEXTO AQUÍ
  eyebrow: "Raíz Quilpué",
  // CAMBIAR TEXTO AQUÍ
  title: "Quiénes somos",
  // CAMBIAR TEXTO AQUÍ
  missionTitle: "Corporación para la cultura e historia quilpueina Raíz Quilpué",
  // CAMBIAR TEXTO AQUÍ
  missionParagraphs: [
    'Raíz Quilpué es una corporación cultural sin fines de lucro que nace desde el territorio con el propósito de rescatar, preservar y difundir la historia, la cultura y la identidad quilpueína.',
  'Creemos que la identidad local se construye a partir de las historias, recuerdos, experiencias y expresiones culturales de quienes habitan la ciudad. Por ello, promovemos espacios de encuentro, participación y creación colectiva que fortalezcan el vínculo entre las personas y su territorio, mediante actividades comunitarias, intervenciones públicas, iniciativas patrimoniales, proyectos artísticos y acciones de difusión cultural, con el objetivo de contribuir al desarrollo de una comunidad más conectada, participativa y consciente de su historia.',
  'Nuestro trabajo se proyecta hacia la creación de un museo y centro cultural comunitario de Quilpué, concebido como un espacio abierto para la memoria, el arte, la educación y la participación ciudadana.'
  ],
  // CAMBIAR TEXTO AQUÍ
  historyYears: "2026",
  // CAMBIAR TEXTO AQUÍ
  valuesTitle: "Lo que nos guía",
  // CAMBIAR TEXTO AQUÍ
  values: [
    {
      icon: "🌱",
      title: "Raíz",
      description: "Nuestra historia es el cimiento de nuestro futuro.",
    },
    {
      icon: "🤝",
      title: "Comunidad",
      description: "La historia de Quilpué pertenece a todos sus habitantes.",
    },
    {
      icon: "📖",
      title: "Rigor",
      description: "Resguardamos el patrimonio de Quilpué con rigor y respeto.",
    },
    {
      icon: "💡",
      title: "Innovación",
      description: "Tecnología para hacer la cultura accesible a todos.",
    },
  ],
  // CAMBIAR TEXTO AQUÍ
  teamTitle: "Quienes hacen posible Raíz",
  // CAMBIAR TEXTO AQUÍ
  director: {
    name: "Millaray Demanet",
    role: "Directora General",
    description:
      "Como fundadora, mi propósito es seguir impulsando iniciativas que acerquen el patrimonio a las personas y permitan que nuevas generaciones conozcan y valoren la identidad de Quilpué",
  },
  // CAMBIAR TEXTO AQUÍ
  team: [
    { name: "Angelo Villagran", role: "Vicepresidente" },
    { name: "Melissa Pacheco", role: "Tesorera" },
    { name: "Javiera Chappa", role: "Secretaria" },
  ],
};

const images = {
  // CAMBIAR IMAGEN AQUÍ: reemplaza esta URL por la imagen de la presidenta.
  presidenta:
    "/images/quienes-somos/presidenta.png",
  // CAMBIAR IMAGEN AQUÍ: reemplaza esta URL por file_20150825115129.jpg.
  farmaciaOlmos:
    "/images/quienes-somos/Foto Fundadores.png",
  // CAMBIAR IMAGEN AQUÍ: reemplaza las URLs del equipo por las imágenes entregadas.
  team: [
    "/images/quienes-somos/vicepresidente.png",
    "/images/quienes-somos/tesorera.png",
    "/images/quienes-somos/foto fundadora.jpeg",
  ],
};

export default function QuienesSomosPage() {
  return (
    <main className="bg-[#e7dcd2] text-[#946541]">
      <section className="bg-[#bb9c82]/25 px-6 pt-16 pb-14 sm:pt-20 sm:pb-16">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
            {content.eyebrow}
          </div>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,3.8rem)] leading-tight font-semibold text-[#704a31]">
            {content.title}
          </h1>
          <div className="mx-auto mt-6 h-px w-32 bg-[#704a31]" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
              Nuestra misión
            </div>
            <h2 className="mb-6 font-serif text-3xl leading-tight font-semibold text-[#946541] sm:text-4xl">
              {content.missionTitle}
            </h2>
            {content.missionParagraphs.map((paragraph) => (
              <p key={paragraph} className="mb-4 text-base leading-relaxed text-[#946541]">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="relative lg:pl-4">
            <Image
              src={images.farmaciaOlmos}
              alt="Calle comercial de Quilpué"
              width={1200}
              height={900}
              className="h-80 w-full object-cover sm:h-[28rem]"
              unoptimized
              style={{ filter: "sepia(15%)" }}
            />
            <div className="absolute -bottom-5 -left-2 flex h-32 w-32 items-center justify-center bg-[#ffdf90] sm:-left-5">
              <div className="text-center text-[#946541]">
                <div className="font-serif text-3xl font-bold">{content.historyYears}</div>
                <div className="font-mono text-[9px] tracking-wide uppercase">
                  Comienzos
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#bb9c82]/25 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
            Nuestros valores
          </div>
          <h2 className="mb-10 font-serif text-3xl font-semibold text-[#946541]">
            {content.valuesTitle}
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {content.values.map((value) => (
              <article
                key={value.title}
                className="bg-[#e7dcd2] p-6"
                style={{ border: "1px solid var(--border)" }}
              >
                <div className="mb-4 text-3xl" aria-hidden="true">
                  {value.icon}
                </div>
                <h3 className="mb-2 font-serif text-xl font-semibold text-[#946541]">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#946541]">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
          Fundadores
        </div>
        <h2 className="mb-10 font-serif text-3xl font-semibold text-[#946541]">
          {content.teamTitle}
        </h2>

        <article className="mb-8 flex flex-col gap-8 bg-[#bb9c82]/25 p-6 sm:p-8 md:flex-row">
          <div className="shrink-0">
            <Image
              src={images.presidenta}
              alt={content.director.name}
              width={600}
              height={600}
              className="h-40 w-40 object-cover object-top"
              unoptimized
              style={{ border: "3px solid var(--accent)" }}
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
              {content.director.role}
            </div>
            <h3 className="mb-2 font-serif text-2xl font-semibold text-[#946541]">
              {content.director.name}
            </h3>
            <p className="max-w-xl text-sm leading-relaxed text-[#946541]">
              {content.director.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="bg-[#ffdf90] px-2 py-1 font-mono text-[9px] tracking-wide text-[#946541] uppercase">
                Fundadora
              </span>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {content.team.map((person, index) => (
            <article
              key={person.name}
              className="bg-[#e7dcd2] p-6 text-center"
              style={{ border: "1px solid var(--border)" }}
            >
              <Image
                src={images.team[index]}
                alt={person.name}
                width={400}
                height={400}
                className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
                unoptimized
                style={{ border: "2px solid var(--accent)" }}
              />
              <h3 className="font-serif text-base font-semibold text-[#946541]">
                {person.name}
              </h3>
              <p className="mt-1 font-mono text-[10px] tracking-wide text-[#946541]">
                {person.role}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
