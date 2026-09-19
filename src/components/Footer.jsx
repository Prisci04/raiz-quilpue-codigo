import Image from "next/image";
import Link from "next/link";

const footerLinks = [
	{ label: "Inicio", href: "/" },
	{ label: "Quiénes somos", href: "/quienes-somos" },
	{ label: "Contenidos", href: "/contenido" },
	{ label: "Actividades", href: "/actividades" },
];

export default function Footer() {
	return (
		<footer className="site-footer">
			<div className="mx-auto max-w-7xl px-6 py-16">
				<div className="grid grid-cols-1 gap-10 md:grid-cols-4">
					<div className="md:col-span-2">
						<div className="mb-5 flex items-center gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-[#ffdf90]">
								{/* CAMBIAR IMAGEN AQUÍ: usa el mismo logo oficial del Header. */}
								<Image
									src="/images/logo/logoraizquilpue.png"
									alt="Logo de Raíz Quilpué"
									width={36}
									height={36}
									className="h-9 w-9 object-contain"
								/>
							</div>
							<div>
								<div className="font-serif text-lg font-bold text-[#e7dcd2]">
									Raíz Quilpué
								</div>
								<div className="font-mono text-[9px] tracking-[0.18em] text-[#ffdf90] uppercase">
									¿Quienes somos?
								</div>
							</div>
						</div>
						<p className="max-w-[320px] text-sm leading-relaxed text-[#e7dcd2]/60">
							Rescatando la memoria, fortaleciendo la identidad y construyendo comunidad desde Quilpué.
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							{[
								{ label: "Correo", href: "mailto:raizquilpue@gmail.com" },
								{ label: "Instagram", href: "https://www.instagram.com/raizquilpue/" },
							].map((social) => (
								<a
									key={social.label}
									href={social.href}
									target={social.label === "Instagram" ? "_blank" : undefined}
									rel={social.label === "Instagram" ? "noreferrer" : undefined}
									className="border border-[#e7dcd2]/20 px-3 py-1.5 font-mono text-[10px] tracking-wide text-[#e7dcd2]/50 uppercase transition-colors hover:border-[#ffdf90] hover:text-[#ffdf90]"
								>
									{social.label}
								</a>
							))}
						</div>
					</div>

					<div>
						<h4 className="mb-4 font-mono text-[10px] tracking-[0.15em] text-[#ffdf90] uppercase">
							Portal
						</h4>
						<ul className="space-y-2">
							{footerLinks.map((item) => (
								<li key={item.label}>
									<Link
										href={item.href}
										className="text-sm text-[#e7dcd2]/55 transition-colors hover:text-[#e7dcd2]"
									>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h4 className="mb-4 font-mono text-[10px] tracking-[0.15em] text-[#ffdf90] uppercase">
							Contacto
						</h4>
						<ul className="space-y-2 text-sm text-[#e7dcd2]/55">
							<li>Quilpué, Región de Valparaíso, Chile</li>
							<li className="pt-2"><a href="mailto:raizquilpue@gmail.com">raizquilpue@gmail.com</a></li>
							<li>+56 9 3940 5350</li>
						</ul>
					</div>
				</div>

				<div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#e7dcd2]/10 pt-6 md:flex-row">
					<p className="font-mono text-[10px] tracking-wide text-[#e7dcd2]/35">
						© 2026 Raíz Quilpué — Todos los derechos reservados.
					</p>
					<p className="font-mono text-[10px] tracking-wide text-[#e7dcd2]/35">
						PATRIMONIO · CULTURA · COMUNIDAD 
					</p>
				</div>
			</div>
		</footer>
	);
}
