import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";

const footerLinks = [
	{ label: "Inicio", href: "/" },
	{ label: "Quiénes somos", href: "/quienes-somos" },
	{ label: "Contenidos", href: "/contenido" },
	{ label: "Actividades", href: "/actividades" },
	{ label: "Museo Digital", href: "/museo" },
];

function InstagramIcon({ className }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={className}
		>
			<rect x="3" y="3" width="18" height="18" rx="5" />
			<circle cx="12" cy="12" r="4" />
			<circle cx="17.4" cy="6.6" r="1.05" fill="currentColor" stroke="none" />
		</svg>
	);
}

const iconClassName = "size-[1em] shrink-0";

const socialLinks = [
	{ label: "Correo", href: "mailto:raizquilpue@gmail.com", icon: Mail },
	{
		label: "Instagram",
		href: "https://www.instagram.com/raizquilpue/",
		icon: InstagramIcon,
		external: true,
	},
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
									src="/images/logo/LogoRaizQuilpue.png"
									alt="Logo de Raíz Quilpué"
									width={36}
									height={36}
									className="h-auto w-9 object-contain"
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
							{socialLinks.map((social) => {
								const Icon = social.icon;

								return (
									<a
										key={social.label}
										href={social.href}
										target={social.external ? "_blank" : undefined}
										rel={social.external ? "noreferrer" : undefined}
										className="inline-flex min-h-11 items-center gap-1.5 border border-[#e7dcd2]/20 px-3 py-2 font-mono text-[10px] tracking-wide text-[#e7dcd2]/50 uppercase transition-colors hover:border-[#ffdf90] hover:text-[#ffdf90] sm:min-h-0 sm:py-1.5 sm:text-[11px]"
									>
										<Icon className={iconClassName} strokeWidth={1.8} aria-hidden="true" />
										{social.label}
									</a>
								);
							})}
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
