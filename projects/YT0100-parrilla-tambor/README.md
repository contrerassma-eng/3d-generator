# YT0100 — Parrilla "Medio Tambor"

Proyecto de **diseño** (capa `user`): no hay etapa fotogramétrica. La geometría
nace acotada en milímetros desde un generador paramétrico, no de fotos.

Parrilla / ahumador sobre medio tambor de 200 L, **100 % atornillada** (cero
soldadura), con perfilería tubular 40×40, 11 piezas de chapa de corte láser +
plegado, motor de spiedo y roble macizo.

## Qué hay acá

```
input/descripcion.md      pedido del usuario → requisitos R1–R10 y supuestos S1–S3 (capa user)
input/web_facts.json      12 datos de terceros con URL, fecha y cita textual (capa web)
design/parametros.json    TODOS los parámetros del producto — la única fuente de verdad
design/lib_chapa.py       chapa plegada: sólido 3D + desarrollo plano real (BA/BD, factor K)
design/gen_parrilla.py    generador: sólido, desarrollos DXF, utillaje, BOM y métricas
design/vista.py           vistas PNG sombreadas para revisar el modelo
out/cad/                  parrilla_tambor.glb|.stl (conjunto) + piezas/ (cada pieza CNC suelta)
out/drawings/             desarrollo_*.dxf (corte láser 1:1) + plantillas + lámina S6
out/BOM.csv               lista de materiales con masas, procesos y consumos
out/MEMORIA_PARRILLA.md   memoria de diseño — incluye "lo que este modelo NO acredita"
out/COSTO.md              dónde está el costo, qué se cambió y qué palancas quedan
design/costos.json        precios con fuente (los que faltan dicen PENDIENTE)
design/costo.py           anidado real, corte de barra, minutos de láser y de armado
out/ARMADO.md             instrucciones de armado (2 llaves, ~45 min)
out/resumen.json          métricas del producto
out/vistas/               PNG del conjunto
```

## Regenerar todo

```bash
cd projects/YT0100-parrilla-tambor
python design/gen_parrilla.py                                  # sólido + DXF + BOM
python design/vista.py iso alzado perfil planta                # vistas
python ../../pipeline/s6_drawings.py . --fuente out/cad/parrilla_tambor.glb   # lámina normalizada (G6)
python design/costo.py 10                                      # costo para un lote de 10
```

Cambiá **un** valor de `design/parametros.json` —el Ø del tambor que
conseguiste, la altura de trabajo, el espesor de chapa— y volvé a correr: se
recalculan la cuna, los desarrollos de corte, las masas y el BOM.

## Estado

- **G6 PASA** — lámina normalizada emitida desde el sólido CAD, escala
  certificada (factor 1,0: el modelo nace en mm reales).
- S0–S5 **no aplican**: no hay fotos que triangular.
- **Sin prototipo, sin cálculo estructural, sin ensayo térmico.** Ver
  `out/MEMORIA_PARRILLA.md` §7 antes de fabricar.
