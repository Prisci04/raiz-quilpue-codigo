# Imágenes del sitio

Sube aquí las imágenes organizadas según la página donde se utilizarán:

```text
public/images/
├── inicio/
├── quienes-somos/
├── contenido/
└── actividades/
```

## Cómo usar una imagen

1. Copia el archivo dentro de la carpeta de su página.
2. Usa una ruta que comience con `/images/` en el código.
3. No incluyas `public` en la ruta.

Ejemplo:

```jsx
<Image
  src="/images/inicio/hero-quilpue.jpg"
  alt="Vista histórica de Quilpué"
  width={1800}
  height={1000}
/>
```

## Organización sugerida

- `inicio/`: hero, publicaciones destacadas y próxima actividad.
- `quienes-somos/`: presidenta, historia, equipo y patrimonio local.
- `contenido/`: noticias, cápsulas históricas y patrimonio.
- `actividades/`: portadas, afiches y fotografías de actividades.

Usa nombres descriptivos en minúsculas, sin espacios ni tildes. Por ejemplo: `presidenta-raiz-quilpue.jpg`.

Las imágenes que todavía estén configuradas con URLs remotas se pueden cambiar desde las constantes marcadas con `// CAMBIAR IMAGEN AQUÍ`.
