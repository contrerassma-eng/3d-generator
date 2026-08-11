# RC-SCH40-48 — rodillo transportador plano y cónico

> Capa `user`: lo de este archivo es **afirmación del usuario**, no dato
> verificado. Lo de norma o catálogo está en `web_facts.json` con URL, fecha y cita.

objeto: Rodillo de transportador (plano cilíndrico + cónico de curva)
fabricante: fabricación propia — réplica funcional de Damon 2.240.SHC.AFA y 2.640.SHJ.AFA
modelo: RC-SCH40-48
materiales: cañería ASTM A53 Gr.B SCH 40 NPS 1-1/2"; eje SAE 1045 Ø12 g6; rodamientos 6201-2Z; tapas SKPB4812-1.5; anillos DIN 471 Ø12; camisas PA6/PA6-CF negro antiestático

## Dimensiones declaradas (mm)

largo_mm: 553
ancho_mm: 87.49
alto_mm: 87.49

## Escala

No aplica el flujo fotogramétrico (S0–S5): este proyecto no parte de fotos sino de
**planos de catálogo rasterizados**. La escala se derivó por medición en píxeles y
está auditada en `cad/ensambles/rodillos_sch40/ESCALA.md`.

referencia_escala: diámetro exterior del tubo en el plano 2.240.SHC.AFA (478 px) y paso entre canales (286.5 px)
referencia_escala_mm: 50
factor_escala: 0.104712

## Objeto del encargo

1. **Rodillo plano** (cilíndrico) — se hace primero y sirve de base.
2. **Rodillo cónico** para curva — el mismo rodillo plano con **camisas plásticas**
   cónicas encajadas encima.

## Requisitos que puso el usuario

| # | Requisito | Dónde queda resuelto |
|---|---|---|
| R1 | Partir de **cañería SCH 40 de 1-1/2" nominal**, que da **1.9" = 48.26 mm** por fuera | `params.mjs → P.tubo` |
| R2 | Hacer primero el **plano** y sobre esa base el **cónico con camisas plásticas** | `plano.mjs → nucleo()`, reutilizado por `conico.mjs` |
| R3 | El plano lleva **tapas de rodamiento** | `plano.mjs`, tapa SKPB4812-1.5 |
| R4 | En Chile **cuesta encontrar el eje hexagonal de 9/16"** | confirmado y ampliado: el del catálogo es **11 mm métrico**, y 9/16" no es medida estándar. README §5 |
| R5 | Alternativa A: **eje redondo de 12 mm** con **cara plana en los terminales** | **adoptada**: Ø12 g6 con dos caras planas e/c 11 × 12 |
| R6 | Alternativa B: comprar el de **1/2"** y hacerle un **rebaje en el extremo** para que asiente el rodamiento o el resorte | evaluada en README §"El eje: opción A vs B"; queda como segunda opción |
| R7 | Diseño **fabricable y detallado**: materiales, **seguros**, todo, con componentes estandarizados | README §Los seguros, §Secuencia de armado, lista de materiales |
| R8 | La **tapa debe ser metálica del catálogo** y hay que **lograr exactamente el mismo resultado** | tapa SKPB4812-1.5 tal cual; envolvente 532/531/553/522 idéntico al Damon |
| R9 | Evaluar además una **tapa impresa en nylon con carbono** | README §"Tapa metálica de catálogo vs tapa impresa en PA-CF" |

## Referencias entregadas por el usuario

- `2D2.240.SHC.AFAW522.pdf` — Damon **2.240.SHC.AFA**: rodillo recto Ø50×1.5, eje
  11hex, spring loaded, W = 522.
- `2D2.640.SHJ.AFAW522.pdf` — Damon **2.640.SHJ.AFA**: la misma base más camisas
  cónicas negras antiestáticas; tabla WT/D1/D2.
- `Rod.pdf` (15 p.) — catálogo de portarodamientos (SKPB, SKP, SKPRB, SKJF).

Se usan como **referencia dimensional y de nomenclatura**. No se redistribuyen.

## Hipótesis de servicio — A CONFIRMAR

Estas tres no las dio el usuario; se supusieron para poder verificar el rodamiento
y la flecha. Si son otras, cambiar `P.carga` y volver a correr la compuerta.

| Hipótesis | Valor supuesto |
|---|---|
| Carga por rodillo | **500 N** (≈51 kg) |
| Velocidad de línea | **0.5 m/s** |
| Vida objetivo | **20 000 h** |

Con ellas: `s₀ = 12.4`, `L10h ≈ 2×10⁶ h`, flecha del tubo **0.054 mm**.

## Preguntas abiertas

1. **¿La curva es de 880 mm de radio interior?** El cono elegido (D1 = 55.6,
   k = 0.06289) corresponde a esa curva. Si es otra: `D1 = 2·(R + c)·tan(1.8°)`.
2. **¿Gravedad o arrastre por correa redonda?** Si lleva correa, los canales del
   catálogo **no se pueden mecanizar sobre SCH 40** (README §4): hay que decidir
   entre collar postizo o cambiar a tubo Ø50×1.5–2.
3. **¿Importa el peso?** La cañería hace que el tubo pese **2.1×** lo que pesa el
   Ø50×1.5 del catálogo (2 009 g vs 937 g).
