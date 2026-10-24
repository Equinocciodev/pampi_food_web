# Imágenes por referencia

Revisión del 23/10/2026. Cada referencia lleva la imagen correcta, o su imagen de familia cuando no hay una individual válida.

## Criterio

Una imagen es correcta si muestra **ese** producto: misma variante y sabor, marca Pampi, envase completo y envase compatible con las reglas de envase:

- Passata (PAM-ROJ-01): botella de vidrio.
- Tomate pelado (PAM-ROJ-02): lata metálica.
- Atún y sardinas (PAM-MAR-01/02): vidrio.
- Resto: lo que diga el `envase_propuesto` de cada referencia.

Las imágenes que contradicen estas reglas (las latas de atún y sardinas del catálogo 270) no se usan.

## Fuentes

Por orden de prioridad:

1. **Agencia**: `PAMPI_Web_Agencia_Final.pdf`, que ya aplica las correcciones de envase. En el PDF los renders de las pp. 1 y 4 se ven pequeños (unos 140-165 px de alto a 150 dpi). Por eso los recortes salen de los **archivos originales del paquete de agencia** (`PAMPI_Web_Agencia_Final/assets/*.jpg`, 1536-1800 px), que son esos mismos renders: el SHA-256 coincide con las imágenes de familia que ya estaban en `assets/img/`. Las imágenes de mixes, tés, mermeladas y mallas no salen en el PDF, pero son archivos del mismo paquete de agencia.
2. **Sità**: `PAMPI_Sita_Coleccion_Botanica_2026.pdf`. Solo trae aceite de oliva y mezcla, ya cubiertos por la agencia.
3. **Catálogo 270**: `PAMPI_Catalogo_V11_270_Referencias_Lectura.pdf`. Usa otra línea de diseño (tapas rojas, fondos fotográficos). No ha hecho falta para ninguna referencia.

## Cómo se han hecho las imágenes

- Recorte del envase completo, con un borde suavizado de unos pocos píxeles.
- Centrado en un lienzo cuadrado del mismo fondo crema del render, con margen del 8 % por lado.
- JPEG con calidad 82, de 436 a 1086 px de lado. No se ha ampliado ninguna imagen.
- Archivos: `assets/img/productos/<id>.jpg`. Las coordenadas de cada recorte están en el `source_path` de `data/asset-manifest.json`.
- Ninguna es arte final (`print_ready: false`).

## Tabla

| ID | Referencia | Imagen anterior | Imagen final | Fuente | Cobertura | Motivo |
|---|---|---|---|---|---|---|
| PAM-ACE-01 | Coco | `assets/aceites.jpg` (familia) | `assets/productos/pam-ace-01.jpg` | Agencia PDF p. 4 (archivo original assets/aceites.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-ACE-02 | Aguacate | `assets/aceites.jpg` (familia) | `assets/productos/pam-ace-02.jpg` | Agencia PDF p. 4 (archivo original assets/aceites.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-ACE-03 | Oliva | `assets/aceites.jpg` (familia) | `assets/productos/pam-ace-03.jpg` | Agencia PDF p. 4 (archivo original assets/aceites.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-ACE-04 | Oliva + girasol | `assets/aceites.jpg` (familia) | `assets/productos/pam-ace-04.jpg` | Agencia PDF p. 4 (archivo original assets/aceites.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-ROJ-01 | Passata | `assets/passata.jpg` (individual) | `assets/passata.jpg` | Imagen existente (= Agencia PDF p. 2) | individual | Se mantiene: ya era individual y correcta (botella de vidrio, la regla de envase). Es la misma botella de Agencia PDF p. 2. |
| PAM-ROJ-02 | Tomate pelado | `assets/tomate.jpg` (individual) | `assets/tomate.jpg` | Imagen existente (= Agencia PDF p. 2) | individual | Se mantiene: ya era individual y correcta (lata metálica, la regla de envase). Es la misma lata de Agencia PDF p. 2. |
| PAM-OLI-01 | Verdes sin hueso | `assets/aceitunas.jpg` (familia) | `assets/productos/pam-oli-01.jpg` | Agencia PDF p. 4 (archivo original assets/aceitunas.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-OLI-02 | Negras sin hueso | `assets/aceitunas.jpg` (familia) | `assets/productos/pam-oli-02.jpg` | Agencia PDF p. 4 (archivo original assets/aceitunas.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-OLI-03 | Rellenas de pimiento | `assets/aceitunas.jpg` (familia) | `assets/productos/pam-oli-03.jpg` | Agencia PDF p. 4 (archivo original assets/aceitunas.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-OLI-04 | Aliñadas ajo y hierbas | `assets/aceitunas.jpg` (familia) | `assets/productos/pam-oli-04.jpg` | Agencia PDF p. 4 (archivo original assets/aceitunas.jpg) | individual | La etiqueta pone "Ajo y hierbas", es decir, las aliñadas. Se descarta la bolsa del catálogo 270 (p. 23), que solo se parece. |
| PAM-OLI-05 | En rodajas | `assets/aceitunas.jpg` (familia) | `assets/productos/pam-oli-05.jpg` | Agencia PDF p. 4 (archivo original assets/aceitunas.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MAR-01 | Atún en aceite de oliva | `assets/conservas.jpg` (familia) | `assets/productos/pam-mar-01.jpg` | Agencia PDF p. 4 (archivo original assets/conservas.jpg) | individual | Frasco de vidrio, conforme a la regla. Se descartan las latas del catálogo 270 (pp. 63-64), que contradicen la regla. |
| PAM-MAR-02 | Sardinas en aceite de oliva | `assets/conservas.jpg` (familia) | `assets/productos/pam-mar-02.jpg` | Agencia PDF p. 4 (archivo original assets/conservas.jpg) | individual | Frasco de vidrio, conforme a la regla. Se descarta la lata del catálogo 270 (p. 34), que contradice la regla. |
| PAM-QUE-01 | Edam | `assets/quesos.jpg` (familia) | `assets/productos/pam-que-01.jpg` | Agencia PDF p. 1 (archivo original assets/quesos.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-QUE-02 | Gouda | `assets/quesos.jpg` (familia) | `assets/productos/pam-que-02.jpg` | Agencia PDF p. 1 (archivo original assets/quesos.jpg) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-QUE-03 | Baby Edam individual | `assets/quesos.jpg` (familia) | `assets/productos/pam-que-03.jpg` | Agencia PDF p. 1 (archivo original assets/quesos.jpg) | individual | Baby Edam suelto. La etiqueta pone "Baby Edam", no "individual". |
| PAM-QUE-04 | Baby Gouda individual | `assets/quesos.jpg` (familia) | `assets/productos/pam-que-04.jpg` | Agencia PDF p. 1 (archivo original assets/quesos.jpg) | individual | Baby Gouda suelto. La etiqueta pone "Baby Gouda", no "individual". |
| PAM-QUE-05 | Baby Edam en malla | `assets/mallas.jpg` (familia) | `assets/productos/pam-que-05.jpg` | Paquete de agencia, assets/mallas.jpg (no figura en el PDF) | individual | Malla de Baby Edam, con una pieza suelta delante, como en el render de agencia. |
| PAM-QUE-06 | Baby Gouda en malla | `assets/mallas.jpg` (familia) | `assets/productos/pam-que-06.jpg` | Paquete de agencia, assets/mallas.jpg (no figura en el PDF) | individual | Malla de Baby Gouda, con una pieza suelta delante, como en el render de agencia. |
| PAM-MIX-01 | Clásico tostado | `assets/mixes.jpg` (familia) | `assets/productos/pam-mix-01.jpg` | Paquete de agencia, assets/mixes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MIX-02 | Selección premium | `assets/mixes.jpg` (familia) | `assets/productos/pam-mix-02.jpg` | Paquete de agencia, assets/mixes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MIX-03 | Tostado | `assets/mixes.jpg` (familia) | `assets/productos/pam-mix-03.jpg` | Paquete de agencia, assets/mixes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MIX-04 | Fruta y nueces | `assets/mixes.jpg` (familia) | `assets/productos/pam-mix-04.jpg` | Paquete de agencia, assets/mixes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MIX-05 | Tropical | `assets/mixes.jpg` (familia) | `assets/productos/pam-mix-05.jpg` | Paquete de agencia, assets/mixes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MIX-06 | Choco Mix | `assets/mixes.jpg` (familia) | `assets/productos/pam-mix-06.jpg` | Paquete de agencia, assets/mixes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-01 | Manzanilla | `assets/tes.jpg` (familia) | `assets/productos/pam-te-01.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-02 | Frutos rojos | `assets/tes.jpg` (familia) | `assets/productos/pam-te-02.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-03 | Anís | `assets/tes.jpg` (familia) | `assets/productos/pam-te-03.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-04 | Negro clásico | `assets/tes.jpg` (familia) | `assets/productos/pam-te-04.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-05 | Verde | `assets/tes.jpg` (familia) | `assets/productos/pam-te-05.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-06 | Earl Grey | `assets/tes.jpg` (familia) | `assets/productos/pam-te-06.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-07 | Hierbabuena | `assets/tes.jpg` (familia) | `assets/productos/pam-te-07.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-08 | Jengibre y limón | `assets/tes.jpg` (familia) | `assets/productos/pam-te-08.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-09 | Rooibos | `assets/tes.jpg` (familia) | `assets/productos/pam-te-09.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-TE-10 | Manzanilla y anís | `assets/tes.jpg` (familia) | `assets/productos/pam-te-10.jpg` | Paquete de agencia, assets/tes.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-01 | Fresa / regular | `assets/mermeladas.jpg` (familia) | `assets/productos/pam-mer-01.jpg` | Paquete de agencia, assets/mermeladas.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-02 | Fresa / pequeño | `assets/minis.jpg` (familia) | `assets/productos/pam-mer-02.jpg` | Paquete de agencia, assets/minis.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-03 | Durazno / regular | `assets/mermeladas.jpg` (familia) | `assets/productos/pam-mer-03.jpg` | Paquete de agencia, assets/mermeladas.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-04 | Durazno / pequeño | `assets/minis.jpg` (familia) | `assets/productos/pam-mer-04.jpg` | Paquete de agencia, assets/minis.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-05 | Mora / regular | `assets/mermeladas.jpg` (familia) | `assets/productos/pam-mer-05.jpg` | Paquete de agencia, assets/mermeladas.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-06 | Mora / pequeño | `assets/minis.jpg` (familia) | `assets/productos/pam-mer-06.jpg` | Paquete de agencia, assets/minis.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-07 | Guayaba / regular | `assets/mermeladas.jpg` (familia) | `assets/productos/pam-mer-07.jpg` | Paquete de agencia, assets/mermeladas.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-08 | Guayaba / pequeño | `assets/minis.jpg` (familia) | `assets/productos/pam-mer-08.jpg` | Paquete de agencia, assets/minis.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-09 | Piña / regular | `assets/mermeladas.jpg` (familia) | `assets/mermeladas.jpg` | — | familia | Sin render individual regular de piña en ningún PDF. El de minis-extra es el formato pequeño (MER-10). |
| PAM-MER-10 | Piña / pequeño | `assets/minis-extra.jpg` (familia) | `assets/productos/pam-mer-10.jpg` | Paquete de agencia, assets/minis-extra.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-11 | Frutos rojos / regular | `assets/mermeladas.jpg` (familia) | `assets/mermeladas.jpg` | — | familia | Hay un candidato "exacto" en el catálogo 270 (p. 59, U03, 350 g), pero no lo he usado: tapa roja y etiqueta de otra línea de diseño, fondo fotográfico y frutas tapando la base. Pendiente de decisión. |
| PAM-MER-12 | Frutos rojos / pequeño | `assets/minis-extra.jpg` (familia) | `assets/productos/pam-mer-12.jpg` | Paquete de agencia, assets/minis-extra.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-13 | Frambuesa / regular | `assets/mermeladas.jpg` (familia) | `assets/mermeladas.jpg` | — | familia | Sin render individual regular de frambuesa en ningún PDF. El de minis-extra es el formato pequeño (MER-14). |
| PAM-MER-14 | Frambuesa / pequeño | `assets/minis-extra.jpg` (familia) | `assets/productos/pam-mer-14.jpg` | Paquete de agencia, assets/minis-extra.jpg (no figura en el PDF) | individual | Recorte individual del mismo render de agencia. Producto, sabor y envase coinciden. |
| PAM-MER-15 | Surtido degustación | `assets/degustacion.jpg` (familia) | `assets/degustacion.jpg` | Paquete de agencia, assets/degustacion.jpg | individual | Se mantiene la imagen: muestra el propio estuche de degustación de cuatro sabores. Cobertura cambiada a individual. |

## Sin imagen individual correcta (3)

- PAM-MER-09 Piña / regular: Sin render individual regular de piña en ningún PDF. El de minis-extra es el formato pequeño (MER-10).
- PAM-MER-11 Frutos rojos / regular: Hay un candidato "exacto" en el catálogo 270 (p. 59, U03, 350 g), pero no lo he usado: tapa roja y etiqueta de otra línea de diseño, fondo fotográfico y frutas tapando la base. Pendiente de decisión.
- PAM-MER-13 Frambuesa / regular: Sin render individual regular de frambuesa en ningún PDF. El de minis-extra es el formato pequeño (MER-14).

## Cambios en el build

`build/data.mjs`, `build/images.mjs` y `build/check.mjs` aceptan ahora rutas `assets/productos/<id>.jpg`, que se sirven en `/assets/img/productos/`. Las variantes WebP siguen en `assets/img/derived/<id>-<ancho>.webp`.
