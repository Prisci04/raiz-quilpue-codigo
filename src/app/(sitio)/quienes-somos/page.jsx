import Image from "next/image";
import { BookOpen, Handshake, MapPinned, Users } from "lucide-react";

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
      icon: MapPinned,
      word: "Territorio",
      background: "#687a42",
      ink: "#e7dcd2",
      numberColor: "#feca2b",
      span: "md:col-span-7",
      title: "Identidad y pertenencia territorial",
      description:
        "Reconocemos el territorio como parte esencial de nuestra identidad y promovemos el vínculo de las personas con Quilpué y su historia.",
    },
    {
      icon: BookOpen,
      word: "Archivo",
      background: "#ffdf90",
      ink: "#704a31",
      numberColor: "#db700f",
      span: "md:col-span-5",
      title: "Memoria y patrimonio",
      description:
        "Rescatamos, cuidamos y difundimos las memorias, historias y expresiones que forman parte del patrimonio local.",
    },
    {
      icon: Users,
      word: "Voces",
      background: "#8ebcc2",
      ink: "#704a31",
      numberColor: "#e7dcd2",
      span: "md:col-span-5",
      title: "Participación e inclusión",
      description:
        "Creemos en una cultura construida con las voces, experiencias y miradas diversas de quienes habitan nuestro territorio.",
    },
    {
      icon: Handshake,
      word: "Encuentro",
      background: "#db700f",
      ink: "#e7dcd2",
      numberColor: "#ffdf90",
      span: "md:col-span-7",
      title: "Colaboración y comunidad",
      description:
        "Trabajamos colectivamente, generando espacios de encuentro y colaboración para construir y preservar nuestra historia en comunidad.",
    },
  ],
  // CAMBIAR TEXTO AQUÍ
  directoryTitle: "Directorio",
  // CAMBIAR TEXTO AQUÍ
  directorySubtitle: "Quienes hacen posible Raíz Quilpué",
  // CAMBIAR TEXTO AQUÍ
  director: {
    name: "Millaray Demanet",
    role: "Presidenta",
    description:
      "Como fundadora, mi propósito es seguir impulsando iniciativas que acerquen el patrimonio a las personas y permitan que nuevas generaciones conozcan y valoren la identidad de Quilpué",
    image: "/images/quienes-somos/Presidenta.png",
  },
  // CAMBIAR TEXTO AQUÍ
  board: [
    {
      name: "Angelo Villagrán",
      role: "Vicepresidente",
      image: "/images/quienes-somos/Vicepresidente.png",
    },
    {
      name: "Melissa Pacheco",
      role: "Tesorera",
      image: "/images/quienes-somos/Tesorera.png",
    },
    {
      name: "Cristina Callejas",
      role: "Secretaria",
      image: "/images/quienes-somos/Secretaria.png",
    },
  ],
  // CAMBIAR TEXTO AQUÍ
  foundersTitle: "Fundadores",
  // CAMBIAR TEXTO AQUÍ
  foundersSubtitle: "Nuestros orígenes",
  // CAMBIAR TEXTO AQUÍ
  foundersLead: "Cuatro personas dieron el primer paso para hacer crecer esta raíz.",
  // CAMBIAR TEXTO AQUÍ
  founders: [
    { name: "Millaray Demanet", role: "Presidenta" },
    { name: "Angelo Villagrán", role: "Vicepresidente" },
    { name: "Melissa Pacheco", role: "Tesorera" },
    { name: "Javiera Chappa", role: "Secretaria" },
  ],
  // CAMBIAR TEXTO AQUÍ
  foundationLabel: "Fundación Raíz Quilpué",
  // CAMBIAR TEXTO AQUÍ
  foundationDate: "17 de junio de 2026",
  // CAMBIAR TEXTO AQUÍ
  foundationText:
    "El 17 de junio de 2026 ocurrió un hito muy importante para nosotros: oficialmente se firmó para ser una corporación sin fines de lucro, desde la comunidad para la comunidad, con el fin de valorar, preservar y unir el patrimonio, cultura e historia de nuestro Quilpué.",
  // CAMBIAR TEXTO AQUÍ
  quoteEyebrow: "Raíz Quilpué",
  // CAMBIAR TEXTO AQUÍ
  quote:
    "Preservar la memoria es mantener vivo el vínculo entre quienes fuimos, quienes somos y quienes vendrán.",
};

const images = {
  // CAMBIAR IMAGEN AQUÍ: reemplaza esta URL por file_20150825115129.jpg.
  farmaciaOlmos:
    "/images/quienes-somos/Foto Fundadores.png",
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

      <section className="relative overflow-hidden bg-[#bb9c82]/25 px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between md:mb-8">
            <div>
              <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
                Nuestros valores
              </div>
              <h2 className="font-serif text-3xl font-semibold text-[#704a31] sm:text-4xl">
                {content.valuesTitle}
              </h2>
            </div>
            <p className="hidden font-mono text-[10px] tracking-[0.28em] text-[#946541] uppercase md:block">
              01 — 04
            </p>
          </div>

          <ol className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
            {content.values.map((value, index) => {
              const Icon = value.icon;
              const number = String(index + 1).padStart(2, "0");

              return (
                <li
                  key={value.title}
                  className={`relative overflow-hidden p-5 sm:p-6 ${value.span}`}
                  style={{ background: value.background, color: value.ink }}
                >
                  <span
                    className="pointer-events-none absolute -top-1 right-1 font-serif text-5xl leading-none font-light select-none sm:text-6xl"
                    style={{ color: value.numberColor, opacity: 0.38 }}
                    aria-hidden="true"
                  >
                    {number}
                  </span>

                  <article className="relative flex flex-col gap-3 pr-10 sm:pr-14">
                    <div className="flex items-center gap-2">
                      <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                      <span className="font-mono text-[9px] tracking-[0.2em] uppercase">
                        {value.word}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif text-lg leading-snug font-semibold italic sm:text-xl">
                        {value.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed opacity-90">
                        {value.description}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#db700f] uppercase">
          {content.directorySubtitle}
        </div>
        <h2 className="mb-10 font-serif text-3xl font-semibold text-[#946541]">
          {content.directoryTitle}
        </h2>

        <article className="mb-8 flex flex-col gap-8 bg-[#bb9c82]/25 p-6 sm:p-8 md:flex-row">
          <div className="shrink-0">
            <Image
              src={content.director.image}
              alt={content.director.name}
              width={600}
              height={600}
              className="h-40 w-40 object-cover object-top"
              unoptimized
              style={{ border: "3px solid #feca2b" }}
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
          </div>
        </article>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {content.board.map((person) => (
            <article
              key={person.name}
              className="bg-[#e7dcd2] p-6 text-center"
              style={{ border: "1px solid var(--border)" }}
            >
              <Image
                src={person.image}
                alt={person.name}
                width={400}
                height={400}
                className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
                unoptimized
                style={{ border: "2px solid #feca2b" }}
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

      <section className="bg-[#687a42] px-6 py-12 text-[#e7dcd2] sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <div className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#feca2b] uppercase">
                {content.foundersSubtitle}
              </div>
              <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
                {content.foundersTitle}
              </h2>
              <p className="mt-4 font-serif text-xl leading-snug italic">
                {content.foundersLead}
              </p>
            </div>

            <div className="lg:col-span-8">
              <div className="mb-8 flex gap-5 sm:gap-6">
                <div className="flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center bg-[#ffdf90] text-[#687a42]">
                  <div className="text-center">
                    <div className="font-serif text-2xl leading-none font-bold">17</div>
                    <div className="mt-1 font-mono text-[8px] tracking-wide uppercase">
                      Jun 2026
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-[#feca2b] uppercase">
                    {content.foundationLabel}
                  </p>
                  <p className="text-sm leading-relaxed text-[#e7dcd2]/90">
                    {content.foundationText}
                  </p>
                </div>
              </div>

              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {content.founders.map((person) => (
                  <li key={person.name}>
                    <p className="font-serif text-lg leading-snug italic">
                      {person.name}
                    </p>
                    <div className="mt-3 h-px w-12 bg-[#feca2b]" aria-hidden="true" />
                    <p className="mt-3 font-mono text-[10px] tracking-[0.18em] uppercase">
                      {person.role}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#e7dcd2] px-6 py-16 text-center sm:py-24">
        <p className="mb-5 text-[11px] font-semibold tracking-[0.28em] text-[#db700f] uppercase">
          {content.quoteEyebrow}
        </p>
        <blockquote className="mx-auto max-w-3xl font-serif text-2xl leading-snug font-medium text-[#704a31] sm:text-4xl sm:leading-tight">
          “{content.quote}”
        </blockquote>
      </section>
    </main>
  );
}
