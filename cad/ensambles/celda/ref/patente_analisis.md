# Análisis de la patente DE 10 2012 014 181 A1 — referencia de diseño para la celda omnidireccional

**Documento:** DE 10 2012 014 181 A1 — *"Omnidirektionales Fördersystemmodul, modulares omnidirektionales Fördersystem und omnidirektionales Fördersystem"*
**Solicitante:** BIBA – Bremer Institut für Produktion und Logistik GmbH, 28359 Bremen (DE)
**Inventores:** Claudio Uriarte (Bremen), Stefan Kunaschk (Bremen)
**Expediente:** 10 2012 014 181.5 · **Solicitud:** 18.07.2012 · **Publicación (Offenlegung):** 23.01.2014
**Clasificación:** Int. Cl. B65G 13/06 (2012.01)
**Fuente analizada:** `patente_texto.txt` (40 páginas: p1 portada/resumen, p2–p7 descripción, p8 citas, p9–p10 reivindicaciones, p11–p40 dibujos) + verificación visual de las 30 láminas `patente_p11.png` … `patente_p40.png`.

> **Regla de trabajo aplicada:** todo lo que sigue está literalmente en la patente. Cuando algo es *inferencia mía* o *lectura del dibujo* (no del texto), va marcado explícitamente. Lo que no está, está en la sección «LO QUE LA PATENTE NO DICE».

---

## 1. Resumen del mecanismo reivindicado

### 1.1 Los tres niveles jerárquicos

La patente define una jerarquía de tres niveles que conviene no mezclar:

| Nivel | Alemán | Numeral | Qué es |
|---|---|---|---|
| 1 | **Fördereinheit** | `14` | *Unidad de transporte*: **1 rueda omnidireccional + 1 motor propio**. Es el ladrillo elemental. |
| 2 | **Fördersystemmodul** | `10`, `100`, `200`, `260`, `270` | *Módulo*: al menos **dos** unidades `14` una junto a otra, con direcciones eficaces no paralelas. La realización preferida tiene **exactamente tres**. |
| 3 | **(modulares) Fördersystem** | `300` | *Sistema*: muchos módulos yuxtapuestos + **una unidad de control** conectada a todos los motores. |

**Unidad de transporte (`14`)** — Reivindicación 1, p9:

> «umfassend mindestens zwei nebeneinander angeordnete omnidirektionale Fördereinheiten (14, 14) **jeweils aus mindestens einem omnidirektionalen Förderrad (16) und einem einzeln zugeordneten Antriebsmotor (18) zum individuellen Antreiben** des mindestens einen Förderrades (16)»
>
> *«comprendiendo al menos dos unidades de transporte omnidireccionales dispuestas una junto a otra, cada una formada por al menos una rueda omnidireccional (16) y un motor de accionamiento asignado individualmente (18) para accionar de forma individual la al menos una rueda (16)».*

**Condición que define el módulo** — Reivindicación 1, p9:

> «wobei die **Wirkrichtungen** der Förderräder der Fördereinheiten **unter einem Winkel ungleich Null zueinander** verlaufen.»
>
> *«...discurriendo las direcciones eficaces de las ruedas de las unidades bajo un ángulo distinto de cero entre sí».*

Esa es toda la condición de la reivindicación independiente: **≥ 2 ruedas, cada una con su motor, con direcciones eficaces no paralelas**. El razonamiento está en [0007] (p2):

> «Wenn die Wirkrichtungen der beiden Förderachsen parallel verlaufen würden, wäre keine 2D-Bewegung, sondern nur eine Förderung in lediglich einer Richtung möglich.»
>
> *«Si las direcciones eficaces de los dos ejes fueran paralelas, no sería posible un movimiento 2D sino solo un transporte en una única dirección».*

**Con tres unidades se añade la rotación** — [0008] (p2) y reivindicación 2 (p9):

> «Gemäß einer alternativen Ausführungsform können **genau drei** omnidirektionale Fördereinheiten nebeneinander vorgesehen und die Wirkrichtungen der Förderräder der drei Fördereinheiten so zueinander verlaufen, **dass keine parallelen Wirkrichtungen vorliegen**. Auf diese Weise wird ein gezieltes Fördern von Objekten in jeder Richtung in 2D unabhängig voneinander **sowie zusätzlich eine Rotation** ermöglicht. Selbstverständlich können aber auch mehr als drei, wie zum Beispiel vier oder fünf omnidirektionale Fördereinheiten vorgesehen sein.»
>
> *«Según una realización alternativa pueden preverse exactamente tres unidades una junto a otra y que las direcciones eficaces de las tres discurran de modo que no haya direcciones eficaces paralelas. De este modo se posibilita el transporte dirigido de objetos en cualquier dirección en 2D independientemente unos de otros y adicionalmente una rotación. Naturalmente también pueden preverse más de tres, por ejemplo cuatro o cinco unidades.»*

Y [0020] (p3) precisa el alcance de esa rotación:

> «Wenn mindestens drei bzw. genau drei omnidirektionale Fördereinheiten vorgesehen sind, ist zusätzlich auch noch eine Rotation der Objekte möglich, und zwar **nicht nur um ganz bestimmte ortsfeste Punkte, sondern – technisch gesehen – an beliebigen Stellen** oder zumindest nahezu an beliebigen Stellen.»
>
> *«Con al menos tres o exactamente tres unidades es posible además una rotación de los objetos, y no solo alrededor de puntos fijos determinados sino —técnicamente hablando— en posiciones arbitrarias o al menos casi arbitrarias».*

### 1.2 Cómo se combinan los módulos

Tres vías, todas reivindicadas:

1. **Sistema modular con módulos completos** (reiv. 11, p9): muchos módulos según reiv. 1–10 + unidad de control.
2. **Sistema modular con módulos de UNA sola unidad, agrupados de dos en dos o de tres en tres** (reiv. 12 y 13, p9): cada módulo lleva *una* unidad `14`, y los módulos «sind in **Zweiergruppen**» / «in **Dreiergruppen** so angeordnet» que se cumple la condición angular. Es decir: la geometría de tres ruedas puede materializarse repartiendo cada rueda en un módulo distinto. *(Esto es exactamente lo que muestran las Fig. 2–4, módulo `100`: chapa pentagonal con una sola rueda.)*
3. **Sistema no modular** (reiv. 17 y 18, p10): las unidades se montan directamente en una chapa portante con la forma que se quiera. [0006] (p2):
   > «Dabei können die Fördereinheiten zum Beispiel auf einem **Trägerblech** montiert sein, das eine gewünschte Form aufweist. In diesem Fall wäre eine **Modularität nicht notwendig**.»
   > *«Las unidades pueden montarse por ejemplo sobre una chapa portante con la forma deseada. En ese caso la modularidad no sería necesaria».*

**Enchufabilidad y superficie:**

- [0016] (p3) + reiv. 10: «Zweckmäßigerweise ist das Fördersystemmodul **steckbar**.» → *«El módulo es enchufable/encastrable»*. **La patente no explica cómo.**
- [0051] (p5): la chapa `12` tiene pestañas dobladas hacia abajo `28` con taladros `30` «zum **Verschrauben mit benachbarten Fördersystemmodulen** zur Bildung eines Fördersystems bzw. einer Plattform» → *«para atornillar con módulos vecinos formando un sistema/plataforma»*.
- [0066] (p6): los módulos «sind in einem **Tischgestell 39** zu einem flächigen Fördersystem 300 bzw. zu einer Plattform **zusammengesteckt**. Die Fläche bzw. Plattform **muss nicht eben sein**, sondern kann auch beispielsweise nach oben oder unten **gekrümmt** sein.» → *«...encastrados en un bastidor de mesa formando un sistema plano; la superficie no tiene por qué ser plana, puede estar curvada hacia arriba o hacia abajo».*
- [0006] (p2): «eine durch die Förderräder definierte **Förderfläche** mit beliebiger Gestalt, wie zum Beispiel eben, aber auch zum Beispiel gekrümmt» → *«una superficie de transporte definida por las ruedas, de forma arbitraria: plana o curvada»*.

**Módulos pasivos de borde** — [0064] (p6), reiv. 15–16:

> «Dies unterscheidet sich von dem vorangehend gezeigten Ausführungsformen darin, dass es **keine Antriebsmotoren** aufweist. Somit ist es nicht kraftbetrieben bzw. aktiv, sondern **passiv**. […] Ein derartiges passives Fördersystemmodul ist in erster Linie für **Außenbereiche/Außenkanten** eines flächigen omnidirektionalen Fördersystems bzw. einer Plattform vorgesehen. Es sorgt dafür, dass das Fördersystem **gerade Kanten** hat und Objekte […] stets **gestützt** werden.»
>
> *«Se diferencia en que no tiene motores: no es activo sino pasivo. Está previsto en primer lugar para las zonas/cantos exteriores de un sistema plano. Consigue que el sistema tenga cantos rectos y que los objetos estén siempre apoyados».*

Reiv. 16 (p10) añade que ese módulo pasivo tiene «mindestens eine Kugelrolle (26)» (al menos una rueda de bola), y [0018] (p3) que en su lugar «könnte aber auch **irgendein passiv gelagertes omnidirektionales Element** verwendet werden» (*cualquier elemento omnidireccional montado pasivamente*).

---

## 2. Reglas geométricas que impone la patente

### 2.1 Concepto clave: `Wirkrichtung` ≠ `Hauptdrehachse`

Esta distinción es la que hace que la geometría se pueda leer mal. La patente la advierte explícitamente en [0004] (p2):

> «Weiterhin ist darauf hinzuweisen, dass **je nach Förderradtyp die Wirkrichtung orthogonal zur Hauptdrehachse des Förderrades, aber auch unter einem anderen Winkel verlaufen kann**.»
>
> *«Además hay que advertir que, según el tipo de rueda, la dirección eficaz puede ser ortogonal al eje principal de giro de la rueda, pero también puede formar otro ángulo».*

Y lo concreta en [0053] (p5):

> «Bei **Omniwheels™** stehen die Rotationsachsen der Rollen in einem Winkel von **90° zur Hauptdrehachse und parallel zur Hauptdrehrichtung**. Somit werden Kräfte in Rotationsrichtung übertragen. Die restlichen Kräfte werden von den Rollen aufgenommen. Das heißt, dass **die Wirkrichtung des Rades dieselbe wie die Rotationsrichtung des Rades ist**. Bei **Mecanum-Rädern** sind dagegen die Rollen nicht unter einem Winkel von 90° zur Hauptdrehrichtung angebracht, sondern (üblicherweise) unter einem Winkel von **45°**. Somit ist die **Wirkrichtung des Rades ungleich der Hauptdrehrichtung**.»
>
> *«En las Omniwheels™ los ejes de rotación de los rodillos están a 90° respecto del eje principal de giro y paralelos a la dirección principal de giro. Así se transmiten fuerzas en la dirección de rotación; las restantes las absorben los rodillos. Es decir, la dirección eficaz de la rueda es la misma que su dirección de rotación. En las ruedas Mecanum, en cambio, los rodillos no están a 90° respecto de la dirección principal de giro sino (habitualmente) a 45°. Por tanto la dirección eficaz es distinta de la dirección principal de giro».*

**Consecuencia para el CAD:** con omniwheel clásica, `Wirkrichtung ⟂ Hauptdrehachse H`. Con Mecanum a 45°, la dirección eficaz está girada 45° respecto de la de rodadura.

### 2.2 Regla base (reivindicaciones 1–3)

| Regla | Fuente | Enunciado |
|---|---|---|
| **R1** — mínimo de unidades por módulo | Reiv. 1, p9 | «mindestens zwei nebeneinander angeordnete omnidirektionale Fördereinheiten» → **≥ 2** unidades. |
| **R2** — ángulo entre direcciones eficaces | Reiv. 1, p9 | «unter einem **Winkel ungleich Null** zueinander» → ángulo ≠ 0 (no paralelas). |
| **R3** — con tres unidades | Reiv. 2, p9 | «genau drei […] dass **keine parallelen Wirkrichtungen** vorliegen» → ninguna pareja paralela. |
| **R4** — no ortogonalidad (preferente) | Reiv. 3, p9 / [0009], p2 | «Bevorzugt verlaufen die Wirkrichtungen der Förderräder **nicht orthogonal** zueinander.» → *preferentemente NO a 90° entre sí*. Se repite para grupos de dos/tres (reiv. 14, p9) y para el sistema no modular (reiv. 19, p10). |

> Nota: R4 es una **preferencia reivindicada** (reiv. dependiente), no una prohibición absoluta. Pero es el punto que la patente más argumenta (ver §2.5).

### 2.3 Geometría triangular / hexagonal explícita

**Sí hay geometría triangular explícita.** [0010] (p2) y reivindicación 4 (p9):

> «Günstigerweise sind die Förderräder in den **Seitenmitten eines gleichseitigen Dreiecks** angeordnet. Die Entfernungen der Förderräder vom Mittelpunkt und deren Winkel zueinander **können aber auch unterschiedlich sein**.»
>
> *«Convenientemente, las ruedas están dispuestas en los puntos medios de los lados de un triángulo equilátero. Sin embargo, las distancias de las ruedas al centro y sus ángulos entre sí también pueden ser distintos».*

Reivindicación 4 (p9): «dass die Förderräder (16, 16, 16) in den **Seitenmitten eines gleichseitigen Dreiecks (D)** angeordnet sind.»

**Los ángulos concretos** están en la descripción del ejemplo de la Fig. 1 — [0049] (p5), el párrafo geométricamente más importante de toda la patente:

> «Anhand der Fig. 1 ergibt sich ferner, dass die Ausschnitte 20 und damit auch die Förderräder 16 in den **Seitenmitten eines gleichseitigen Dreiecks D** angeordnet sind. Die Fördereinheiten 14 sind also um einen **Winkel γ = 120° sternförmig** zueinander angeordnet. Die **Hauptdrehachsen H** der Förderräder 16 verlaufen unter einem **Winkel β = 90° zu den Seiten a, b und c** des Dreiecks D. Mit anderen Worten verlaufen die Hauptdrehachsen H **kollinear mit den Mittelsenkrechten r, s und t**. Dies bedeutet wiederum, dass die Antriebsmotoren 18 so angeordnet sind, dass sich die **Verlängerungen der Antriebsmotorwellen im Mittelpunkt M** des Fördersystemmoduls 10 treffen.»
>
> *«De la Fig. 1 se desprende además que los recortes 20 —y por tanto también las ruedas 16— están dispuestos en los puntos medios de los lados de un triángulo equilátero D. Las unidades 14 están por tanto dispuestas en estrella formando entre sí un ángulo γ = 120°. Los ejes principales de giro H de las ruedas discurren bajo un ángulo β = 90° respecto de los lados a, b y c del triángulo D. Dicho de otro modo, los ejes H son colineales con las mediatrices r, s y t. Esto significa a su vez que los motores 18 están dispuestos de forma que las prolongaciones de sus ejes se encuentran en el centro M del módulo».*

**Traducido a reglas de construcción CAD (las 4 que se pueden aplicar directamente):**

1. Triángulo equilátero `D` de lados `a`, `b`, `c`. Las tres ruedas `16` se colocan en los **puntos medios de los lados**.
2. Disposición **en estrella a γ = 120°** entre unidades.
3. Cada **eje principal de giro `H` es colineal con la mediatriz** (`r`, `s`, `t`) de su lado → forma **β = 90°** con el lado correspondiente.
4. Las **prolongaciones de los ejes de los motores concurren en el centro `M`** del módulo.

De 1+3, para omniwheel clásica (Wirkrichtung ⟂ H): **la dirección eficaz de cada rueda queda paralela a su lado del triángulo (0°)**, y las tres direcciones eficaces quedan a **60°/120° entre sí** — nunca a 90°. Es decir, la configuración preferida cumple automáticamente R4 (no ortogonal).

**Geometría hexagonal:** la patente **no dice la palabra «hexágono» en el texto de la descripción salvo una vez**, en [0049] (p5): «Es umfasst ein **sechseckiges Trägerblech 12** und drei omnidirektionale Fördereinheiten 14» (*«Comprende una chapa portante hexagonal 12 y tres unidades»*). El teselado hexagonal **no se describe en el texto**, pero es inequívoco en los dibujos: Fig. 15–18 (láminas p35–p38) y sobre todo **Fig. 19a (p39)**, que muestra el panal de módulos hexagonales `10` yuxtapuestos, y **Fig. 19b (p40)**, la misma zona vista desde abajo con los motores `18` y los soportes `32`. *(Lectura de dibujo, no de texto.)*

### 2.4 Disposiciones NO uniformes explícitamente admitidas

La patente se cuida mucho de no quedar atada a la configuración simétrica. Tres grados de libertad admitidos:

- **Distancias distintas al centro** — [0010] y [0011] (p2): «Alternativ oder zusätzlich können die **Entfernungen der Förderräder vom Mittelpunkt unterschiedlich** sein.» → varios círculos de disposición concéntricos, [0063] (p6): «Es gibt dann nicht nur einen Anordnungskreis, sondern **mehrere konzentrische Anordnungskreise**.» En la **Fig. 12b (p26)** están rotulados **R1, R2, R3** distintos.
- **Ejes no colineales con el radio** — [0063] (p6): «**Zwei der Hauptdrehachsen H** der Förderräder 14 verlaufen **nicht kollinear mit den Radien R**. Dementsprechend verlaufen die zugehörigen Geschwindigkeitsvektoren auch **nicht tangential** zum „Anordnungskreis".» Esa realización asimétrica es el módulo `260` (Fig. 12a, lámina p25).
- **Ángulos entre unidades distintos de 120°** — [0010] (p2), citado arriba.

### 2.5 Reglas de reparto de fuerzas (justifican la elección de ángulos)

Este es el material más útil para decidir la geometría según la aplicación. [0025] (p4):

> «Über die omnidirektionalen Förderräder werden Kräfte in die **Rotationsrichtung** auf ein zu bewegendes Objekt übertragen. In allen anderen Richtungen werden die Kräfte von den frei rotierenden Rollen […] aufgenommen und **nicht auf das Objekt übertragen**. […] Die Richtung, die den Vektor mit der **größten Amplitude** aufweist, wird als **Hauptförderrichtung** bezeichnet. […] Wenn zum Beispiel **drei Fördereinheiten in einer nicht-orthogonalen Anordnung, wobei die Fördereinheiten unter einem Winkel von 120° zueinander stehen**, vorliegen, so lässt sich damit eine **gleichmäßigere Verteilung der übertragbaren Kräfte** erzielen, sodass Objekte sehr effektiv in alle Richtungen bewegt werden können. Eine derartige Anordnung eignet sich sehr gut für Aufgaben, bei denen Objekte in allen Richtung bewegt oder **gedreht** werden müssen (**Positionierung**).»
>
> *«A través de las ruedas omnidireccionales se transmiten fuerzas al objeto en la dirección de rotación. En todas las demás direcciones las fuerzas son absorbidas por los rodillos libres y no se transmiten al objeto. […] La dirección cuyo vector tiene mayor amplitud se denomina dirección principal de transporte. […] Si por ejemplo hay tres unidades en disposición no ortogonal, formando 120° entre sí, se logra un reparto más uniforme de las fuerzas transmisibles, de modo que los objetos pueden moverse muy eficazmente en todas las direcciones. Tal disposición se adapta muy bien a tareas en que hay que mover o girar objetos en todas las direcciones (posicionamiento)».*

[0026] (p4) da el **contraejemplo numérico**, el único otro juego de ángulos concreto de toda la patente:

> «Bei einer beispielhaften nicht-orthogonalen Anordnung von drei Förderrädern […] mit **60°–90°–120° Orientierungen** zeigt die Verteilung der übertragbaren Kräfte eine ausgeprägte **Hauptförderrichtung, welche in die 90°-Richtung** zeigt. Im Bereich **–30°–+30°** ist die Kraftübertragung **sehr schlecht**, sodass eine Bewegung quer zur Hauptförderrichtung sehr ineffizient, aber dennoch möglich ist. Eine derartige Anordnung eignet sich sehr gut für **Förderaufgaben**, bei denen ein Objekt hauptsächlich in einer Richtung bewegt wird […] Als Beispiel einer solchen Anwendung dient eine **Förderstrecke mit Ausschleusung**.»
>
> *«En una disposición no ortogonal ejemplar de tres ruedas con orientaciones 60°–90°–120°, el reparto de fuerzas transmisibles muestra una dirección principal de transporte marcada, que apunta en la dirección 90°. En el rango –30° a +30° la transmisión de fuerza es muy mala, de modo que un movimiento transversal a la dirección principal es muy ineficiente pero aun así posible. Tal disposición se adapta muy bien a tareas de transporte en las que un objeto se mueve principalmente en una dirección […] Ejemplo: una línea de transporte con desvío/expulsión».*

Complementos:

- [0027] (p4): «Generell ist mit einer Anordnung aus **drei Antrieben eine viel größere Momentübertragung** auf ein Objekt möglich.» → *«en general, con tres accionamientos es posible una transmisión de par mucho mayor»*.
- [0028] (p4): «Schließlich lässt sich durch eine **nicht-orthogonale Anordnung von drei oder mehr** Förderrädern […] eine **symmetrische Kraftverteilung** realisieren.» → *«...un reparto de fuerzas simétrico»*.
- [0020] (p3): «kann durch geeignete **Ausrichtung von direkt benachbarten Förderrädern** zueinander die Hauptförderrichtung beeinflusst, eine **effizientere Kraftübertragung** bewirkt und eine **optimale Verteilung der Kräfte** an die jeweilige Anwendung realisiert werden.» → la orientación relativa entre ruedas **vecinas de módulos distintos** también cuenta.

### 2.6 ⚠️ Contradicción interna 0° vs 90° (verificada en el original)

Hay una **incoherencia real en el documento publicado**, no un error de OCR. La verifiqué abriendo las imágenes `patente_p02.png` y `patente_p09.png`.

| Ubicación | Texto | Traducción |
|---|---|---|
| **[0011], p2** | «dass die **Wirkrichtungen** der Förderräder unter einem Winkel von **0°** zu den Seiten des Dreiecks verlaufen **oder** mindestens eine der Wirkrichtungen […] unter einem Winkel **ungleich 0°** zur zugehörigen Seite […] verläuft» | *«...que las direcciones eficaces formen 0° con los lados del triángulo, o bien que al menos una forme un ángulo distinto de 0° con su lado»* |
| **Reivindicación 5, p9** | «dass die **Wirkrichtungen** der Förderräder unter einem Winkel von **90°** zu den Seiten des Dreiecks verlaufen **oder** mindestens eine […] unter einem Winkel **ungleich 0°** zur zugehörigen Seite […] verläuft» | *«...que las direcciones eficaces formen 90° con los lados del triángulo, o bien...»* |

**Lectura de ingeniería:** [0011] (0°) es coherente con [0049] + [0053]: si `H ⟂ lado` (β = 90°) y `Wirkrichtung ⟂ H` (omniwheel), entonces `Wirkrichtung ∥ lado` = **0°**. La reivindicación 5 dice 90°, que sería correcta si se aplicase al **eje `H`**, no a la dirección eficaz. Además, la segunda mitad de la reiv. 5 sigue diciendo «ungleich 0°», lo que delata que la primera mitad debería decir 0°.

> **Para el diseño:** adóptese **0° (dirección eficaz paralela al lado del triángulo / tangente al círculo de disposición)**, que es la configuración de las Fig. 1 y Fig. 11 y la que la propia patente dice que «vereinfacht die Mathematik hinter der Steuerung». Dejar constancia de la discrepancia.

---

## 3. Accionamiento (Antrieb)

### 3.1 Lo que la patente sí afirma

- **Un motor por rueda, individual, sin excepción.** Es el corazón de la reivindicación 1 y se repite en todas las independientes (1, 12, 13, 17, 18): «einem **einzeln zugeordneten** Antriebsmotor (18) zum **individuellen** Antreiben».
- **Cada motor puede seguir cualquier perfil de velocidad** — [0021] (p3): «Jeder Antriebsmotor kann ein **beliebiges Geschwindigkeitsprofil** fahren.»
- **Encendido selectivo por ahorro energético** — [0022] (p3): «Dies ergibt sich daraus, dass **pro Objekt eine Bahn berechenbar** ist und danach **nur diejenigen Antriebsmotoren eingeschaltet werden, die zum Abfahren der Bahn erforderlich sind**.» → *«se calcula una trayectoria por objeto y después solo se encienden los motores necesarios para recorrerla»*.
- **Geometría de montaje del motor** — [0049] (p5): «die **Verlängerungen der Antriebsmotorwellen** (nicht gezeigt) [treffen sich] im Mittelpunkt M» → *«las prolongaciones de los ejes de los motores (no representados) se encuentran en el centro M»*. Los motores quedan radiales, apuntando al centro.
- **Soporte del conjunto motor+rueda** — [0054] (p5) y [0060] (p6):
  > «Jede der Fördereinheiten 14 ist in bzw. an einem im wesentlichen **C-förmigen, nach oben offenen Träger 32** mit oben beiderseits nach außen gewandten **Abkantungen 34 mit Bohrungen** angebracht, der an der Unterseite […] des Trägerbleches 12 **mittels Schrauben** (nicht gezeigt) befestigt ist. **Die Befestigung kann aber auch anders erfolgen.**»
  > *«Cada unidad está montada en/sobre un soporte 32 esencialmente en forma de C, abierto hacia arriba, con pestañas 34 dobladas hacia fuera en ambos lados con taladros, fijado a la cara inferior de la chapa 12 mediante tornillos (no representados). La fijación puede realizarse también de otro modo».*
- **Montaje bajo la chapa, rueda asomando** — [0014] (p2) y reiv. 8:
  > «ein Trägerblech, an dessen **Unterseite** die omnidirektionale(n) Fördereinheit(en) so gelagert ist/sind, dass das Förderrad […] durch einen […] **Ausschnitt im Trägerblech nach oben vorragt**. Bei dem Ausschnitt kann es sich beispielsweise um eine **Aussparung oder um ein Loch** handeln. Die Fördereinheiten können aber statt an einem Trägerblech auch anderweitig, zum Beispiel an sich **vertikal erstreckenden Profilen**, befestigt sein.»
  > *«...una chapa portante, en cuya cara inferior se alojan las unidades de modo que la rueda sobresale hacia arriba a través de un recorte de la chapa. El recorte puede ser por ejemplo un vaciado o un agujero. Las unidades pueden fijarse también de otro modo, por ejemplo a perfiles que se extienden verticalmente».*

### 3.2 Lo que la patente NO dice del accionamiento

**No se menciona ninguna transmisión.** He buscado en todo el texto: **no aparecen** las palabras `Riemen` (correa), `Zahnriemen` (correa dentada), `Getriebe` (reductor/engranaje), `Zahnrad` (engranaje), `Kupplung` (acoplamiento), `Kette` (cadena) ni `Untersetzung` (desmultiplicación). El único elemento nombrado entre motor y rueda es la **`Antriebsmotorwelle`** (eje del motor), y el texto dice literalmente **«(nicht gezeigt)»** — no representado.

Es decir: la patente **no reivindica ni describe accionamiento directo, ni por correa, ni por engranajes**. Simplemente exige «un motor asignado individualmente». *En los dibujos* (Fig. 5a–5d, láminas p15–p18; Fig. 7 y 10, p20 y p23) el motor aparece montado en el mismo soporte C `32`, con su cuerpo alineado con el eje de la rueda y adosado a ella, lo que **sugiere accionamiento directo coaxial**, pero **esto es lectura del dibujo, no afirmación del texto**, y el propio texto declara los ejes «no representados».

---

## 4. Control (Steuerung)

### 4.1 Lo reivindicado

La **unidad de control (`Steuereinrichtung`)** es un elemento **obligatorio de las reivindicaciones de sistema** (11, 12, 13, 17, 18), no del módulo:

> «und eine **Steuereinrichtung, die mit den Antriebsmotoren zum individuellen Ansteuern derselben verbunden ist**.» (reiv. 11, p9)
>
> *«y una unidad de control conectada con los motores para el accionamiento individual de los mismos».*

[0070] (p7) lo recuerda al final de la descripción:

> «Auch wenn dies in der gesamten Beschreibung der Figuren **nicht erwähnt** wurde, so weist das omnidirektionale Fördersystem auch eine **Steuereinrichtung (nicht gezeigt)** auf, die mit den Antriebsmotoren zum individuellen Ansteuern derselben verbunden ist.»
>
> *«Aunque no se mencionó en toda la descripción de las figuras, el sistema presenta también una unidad de control (no representada) conectada con los motores para su accionamiento individual».*

### 4.2 Cinemática: lo que se dice y lo que se omite

**No hay ni una sola ecuación en la patente.** Lo que hay es la descripción cualitativa de la composición vectorial y dos afirmaciones sobre la simplificación matemática:

[0062] (p6) — el enunciado cinemático más concreto, referido a la Fig. 11:

> «In der Fig. 11 sind für das in den Fig. 1, Fig. 6 und Fig. 7 gezeigte Ausführungsbeispiel die **gleichmäßige Anordnung und Orientierung** der Förderräder 16 gezeigt. Die **Hauptdrehachsen H** der Förderräder 16 verlaufen **kollinear mit den Radien R**, so dass die **Geschwindigkeitsvektoren v immer tangential zum „Anordnungskreis"** verlaufen. **Diese Konfiguration vereinfacht die Mathematik hinter der Steuerung.**»
>
> *«En la Fig. 11 se muestran, para el ejemplo de las Fig. 1, 6 y 7, la disposición y orientación uniformes de las ruedas 16. Los ejes principales de giro H son colineales con los radios R, de modo que los vectores de velocidad v son siempre tangenciales al "círculo de disposición". Esta configuración simplifica la matemática que hay detrás del control».*

[0011] (p2) repite la idea para la variante 0°: «Die erstgenannte Alternative **vereinfacht die Mathematik hinter der Steuerung/Ansteuerung**.»

[0065] (p6) — cómo se generan los movimientos, referido a las Fig. 14a–14d:

> «Anhand der Fig. 14a bis Fig. 14d soll […] gezeigt werden, wie sich aus der **Kombination von unterschiedlichen Geschwindigkeitsvektoren (unterschiedliche Richtungen und/oder Beträge) der Antriebsmotoren** sich unterschiedliche **Förderrichtungen** für ein Objekt ergeben können. Es lassen sich damit sehr **komplexe Bewegungsabläufe** erzeugen. Diese umfassen **geradlinige, krummlinige und Drehbewegungen**.»
>
> *«Mediante las Fig. 14a–14d se muestra cómo, a partir de la combinación de distintos vectores de velocidad (distintas direcciones y/o magnitudes) de los motores, resultan distintas direcciones de transporte para un objeto. Se pueden generar secuencias de movimiento muy complejas: rectilíneas, curvilíneas y de rotación».*

[0002]/[0020] (p2/p3) fijan el objetivo funcional: mover **varios objetos simultáneamente con trayectorias individuales**, «gezielt in jeder Richtung in **2D und 3D (Transaktion in Längs- und Querrichtung sowie Rotation)** unabhängig voneinander» — *«en cualquier dirección en 2D y 3D (traslación longitudinal y transversal más rotación) independientemente unos de otros»*. [Nota: el texto escribe «Transaktion», evidente errata por «Translation».]

[0012] (p3) menciona el único sensado citado en toda la patente, y de forma condicional:

> «Selbst wenn zwischen den Rollen des Einzel-Allseitenrades eine **Lücke** vorhanden ist, kann es ausreichen. Ein Objekt […] wird dann aber **nicht ruckelfrei** gefördert werden. Zur **genauen Positionierung** wäre dann wahrscheinlich eine **Positionsüberwachung zum Beispiel mittels Bildverarbeitung** notwendig.»
>
> *«Incluso si hay un hueco entre los rodillos de la rueda simple puede bastar. Pero entonces el objeto no se transportará sin sacudidas. Para un posicionamiento preciso sería probablemente necesaria una supervisión de posición, por ejemplo mediante procesamiento de imagen».*

**Resumen de control:** la patente aporta el *principio* (composición vectorial de velocidades tangenciales sobre un círculo de disposición) y la *arquitectura* (un controlador conectado a todos los motores, mando individual), pero **ninguna fórmula, ninguna matriz de cinemática inversa, ningún lazo, ningún sensor obligatorio**.

---

## 5. Cotas, proporciones, rangos numéricos y materiales

### 5.1 Tabla de TODOS los valores numéricos del documento

| Valor | Qué designa | Fuente (página) |
|---|---|---|
| **≥ 2** | unidades `14` por módulo (mínimo reivindicado) | Reiv. 1 (p9); [0004] (p2) |
| **exactamente 2** | realización particular | [0007] (p2) |
| **exactamente 3** | realización preferida (habilita rotación) | [0008] (p2); reiv. 2 (p9) |
| **4 o 5** | número de unidades explícitamente admitido como alternativa | [0008] (p2) |
| **γ = 120°** | ángulo en estrella entre las 3 unidades del módulo `10` | [0049] (p5) |
| **β = 90°** | ángulo entre el eje principal `H` y el lado del triángulo | [0049] (p5) |
| **120°** | ángulo entre unidades que da reparto uniforme de fuerzas | [0025] (p4) |
| **0°** | ángulo entre dirección eficaz y lado del triángulo (variante simple) | [0011] (p2) |
| **90°** | *idem*, en la reivindicación 5 — **contradice a [0011]** | Reiv. 5 (p9) |
| **≠ 0°** | ángulo entre dirección eficaz y su lado (variante asimétrica) | [0011] (p2); reiv. 5 (p9) |
| **60° – 90° – 120°** | orientaciones del ejemplo con dirección principal marcada | [0026] (p4) |
| **90°** | dirección a la que apunta la Hauptförderrichtung en ese ejemplo | [0026] (p4) |
| **–30° … +30°** | sector angular con transmisión de fuerza «sehr schlecht» | [0026] (p4) |
| **90°** | ángulo de los ejes de los rodillos respecto del eje principal (Omniwheel) | [0053] (p5); [0052] (p5) |
| **45°** | ángulo habitual de los rodillos en rueda **Mecanum** | [0053] (p5) |
| **3** | rodillos `31` toneliformes equidistantes por cada rueda del doble omniwheel | [0052] (p5) |
| **60°** | desfase angular entre los rodillos de las dos ruedas del doble omniwheel | [0052] (p5) |
| **2** | ruedas omni sobre el mismo eje en un «Doppel-Allseitenrad» | [0012] (p2) |
| **1/2, 1/3, 1/4** | fracción de círculo de los vaciados `38` para las ruedas de bola, según la posición de la chapa | [0057] (p6) |
| **6** | lados de la chapa portante del módulo `10` («sechseckig») | [0049] (p5) |
| **5** | lados de la chapa del módulo de una sola unidad («im Wesentlichen fünfeckig») | [0056] (p6) |
| **3** | recortes `20` «im wesentlichen quadratisch» en la chapa del módulo `10` | [0049] (p5) |

### 5.2 Formas y detalles constructivos declarados

- **Chapa portante `12` hexagonal, 3 recortes ~cuadrados `20`** — [0049] (p5): «ein sechseckiges Trägerblech 12 und drei omnidirektionale Fördereinheiten 14 […] Das Trägerblech 12 weist drei **im wesentlichen quadratische Ausschnitte 20** auf».
- **Coplanaridad del plano de transporte** — [0049] (p5): «liegen die **höchsten Punkte 24** der Förderräder 16 in einer, **vorzugsweise horizontalen, Ebene**.» → *«los puntos más altos `24` de las ruedas están en un plano, preferentemente horizontal»*. **Esta es la cota funcional crítica del ensamble.**
- **Ruedas de bola `26` a la altura de las ruedas motrices** — [0050] (p5):
  > «In den **Lücken zwischen den Förderrädern** 16 sind **Kugelrollen 26 in der Höhe der Förderräder 16** auf bzw. in dem Trägerblech 12 angeordnet. Diese **passiven** Kugelrollen stützen von unten Objekte […], die auf den Förderrädern 16 aufliegen, und **verhindern, dass diese sich bei der Bewegung an den Kanten des Fördersystemmoduls einhaken**.»
  > *«En los huecos entre las ruedas se disponen ruedas de bola 26 a la altura de las ruedas, sobre/en la chapa. Estas ruedas de bola pasivas apoyan por debajo los objetos que descansan sobre las ruedas e impiden que se enganchen en los cantos del módulo durante el movimiento».*
  Reiv. 9 (p9) y [0015] (p3) añaden: «mindestens eine […] Kugelrolle und **vorzugsweise mehrere vorzugsweise gleichmäßig verteilte**» → *«al menos una y preferentemente varias, preferentemente repartidas uniformemente»*.
- **Regla de reparto de las ruedas de bola en las juntas entre chapas** — [0057] (p6), muy útil para teselar:
  > «An den Rändern des Trägerbleches 12 sind im Wesentlichen **halbkreisförmige Aussparungen 38 zur Aufnahme von Kugelrollen** ausgebildet. **Je nach Position des Trägerbleches können sie aber zum Beispiel auch 1/2, 1/3, oder 1/4 eines Kreises sein.**»
  > *«En los bordes de la chapa hay vaciados esencialmente semicirculares 38 para alojar ruedas de bola. Según la posición de la chapa pueden ser también, por ejemplo, 1/2, 1/3 o 1/4 de círculo».*
  → Es decir: **las ruedas de bola se sitúan en las juntas y cada chapa aporta una fracción del alojamiento circular**. En la Fig. 19a (p39) se ve que en cada vértice donde concurren tres módulos hay un elemento circular con tres pestañas (1/3 + 1/3 + 1/3). *(Lectura de dibujo.)*
- **Unión entre módulos** — [0051] (p5) y [0058] (p6): «seitliche, **nach unten verlaufende Abkantungen (Laschen) 28 mit Bohrungen 30** zum **Verschrauben** mit benachbarten Fördersystemmodulen» → *«pestañas laterales dobladas hacia abajo con taladros para atornillar con módulos vecinos»*.
- **Tipo de rueda admitido** — [0012] (p2), reiv. 6:
  > «dass jedes omnidirektionale Förderrad aus einem **Einzel-Allseitenrad** oder einem **Mehrfach-Allseitenrad, insbesondere Doppel-Allseitenrad**, besteht.» […] «Ein Beispiel für Allseitenräder stellen die von der Firma **Interroll** hergestellten **Omniwheel™** dar. Bei beispielsweise Doppel-Allseitenrädern befinden sich **zwei Allseitenräder auf derselben Antriebswelle**.»
  > *«...cada rueda omnidireccional consiste en una rueda omni simple o múltiple, en particular doble. […] Un ejemplo son las Omniwheel™ fabricadas por la empresa Interroll. En las dobles hay dos ruedas omni sobre el mismo eje de accionamiento».*
- **Perfil de los rodillos** — [0012] (p3):
  > «Es kann ein Einzel-Allseitenrad ausreichen, insbesondere wenn es eine **ausreichende Anzahl von Rollen** aufweist, so dass sich ein omnidirektionales Profil, d. h. ein zumindest im Wesentlichen **kreisbogenförmiges Profil** des gesamten Allseitenrades ergibt. […] Vorteilhafterweise sind die Rollen der Allseitenräder **kreisbogenförmig** gestaltet […]. **Zylindrische Rollen können aber auch ausreichen.**»
  > *«Puede bastar una rueda simple, en particular si tiene un número suficiente de rodillos de modo que resulte un perfil omnidireccional, es decir, un perfil del conjunto al menos esencialmente en arco de círculo. […] Ventajosamente los rodillos son en arco de círculo. Pero también pueden bastar rodillos cilíndricos».*
- **Geometría del doble omniwheel** — [0052] (p5):
  > «sind bei jedem Allseitenrad des Doppel-Allseitenrades auf der Umlauffläche **drei tonnenförmige (ballige) Hilfsräder (Rollen 31) äquidistant** angebracht, deren **Drehachsen im rechten Winkel zur Drehachse (Hauptdrehachse H) des Hauptrades** liegen und die nahezu breitförmiges Profil bauen. Das andere Allseitenrad […] ist genauso gestaltet, außer dass die Hilfsräder (Rollen) **um 60° zu den Rollen des benachbarten Allseitenrades versetzt** sind.»
  > *«En cada rueda del doble omniwheel hay tres ruedas auxiliares toneliformes (abombadas) —rodillos 31— equidistantes sobre la superficie de rodadura, cuyos ejes de giro están en ángulo recto respecto del eje principal H de la rueda principal […]. La otra rueda es idéntica salvo que sus rodillos están desfasados 60° respecto de los de la rueda vecina».*
- **Variante Mecanum** — [0013] (p3), reiv. 7, [0061] (p6): el módulo `200` (Fig. 8–10) «unterscheidet sich […] **im Wesentlichen in der Art der Förderräder 16 und dadurch bedingt auch in der Gestaltung der Ausschnitte 20**» → *«se diferencia esencialmente en el tipo de ruedas y, en consecuencia, en el diseño de los recortes»*.

### 5.3 Materiales

**La patente no especifica ningún material.** El único indicio es léxico: la palabra **`Trägerblech`** (*chapa portante*) y los términos `Abkantungen` (*pliegues/dobleces*, propios de chapa plegada) y `Laschen` (*pestañas*) implican **construcción en chapa metálica plegada**. No hay aleación, ni espesor, ni tratamiento, ni material de rodillos, ni dureza, ni recubrimiento.

### 5.4 Aplicaciones declaradas (contexto de dimensionamiento)

[0024] (p3–p4): «Grundsätzlich kann die Erfindung überall dort eingesetzt werden, wo **Objekte auf einer Ebene frei positioniert** werden müssen»; en particular **intralogística**: creación de capas de paquetes para paletizadores automáticos, singularización de flujos de paquetes, entrada/salida de paquetes en transportadores existentes, clasificación y rotación de paquetes. [0023] (p3) destaca «Sehr **kleines Footprint** verglichen mit Lagenvorbereitungsanlagen (Roboter oder Schieber)» y «**Energieeinsparung** durch gezieltes Ein- und Ausschalten von Motoren».

---

## 6. Mapa de realizaciones (qué es cada número de módulo)

| Numeral | Qué es | Figuras | Fuente |
|---|---|---|---|
| `10` | Módulo **activo hexagonal con 3 unidades**, omniwheels dobles. La realización principal. | 1, 6, 7, 14a–14d, 15–18, 19a, 19b | [0049]–[0054] (p5) |
| `100` | Módulo de **una sola unidad**, chapa **pentagonal**, con 4 vaciados `38`. **Aparece rotulado solo en los dibujos** (Fig. 2, 3, 4); el texto lo describe sin darle numeral y dice: «Sie bildet sozusagen die **kleinste Einheit**» ([0055], p6). | 2, 3, 4 | Rotulación de láminas p12–p14 |
| `200` | Módulo hexagonal de 3 unidades con **ruedas Mecanum** (recortes `20` distintos). | 8, 9 | [0061] (p6) |
| `260` | Módulo hexagonal con **disposición y orientación NO uniformes** de las ruedas (radios distintos `R1/R2/R3`, ejes no colineales con el radio). Se cita en las reivindicaciones 1, 2, 3, 6, 8, 9 pero **no se describe en el texto**; solo se identifica por el rótulo de la lámina. | 12a (y su esquema 12b) | Rotulación de lámina p25 + [0063] (p6) |
| `270` | Módulo **pasivo** (sin motor), para bordes exteriores del sistema. | 13a–13d, 15–18 | [0064] (p6) |
| `300` | **Sistema** completo montado en bastidor de mesa `39`, mezcla de módulos `10` activos y `270` pasivos. | 15, 16, 17, 18, 19a, 19b | [0066]–[0069] (p6–p7) |

---

## 7. LO QUE LA PATENTE NO DICE — habrá que decidirlo por diseño

Todo lo siguiente está **ausente del documento** (lo he verificado por búsqueda en el texto completo). Cada punto es una decisión de diseño que **no puede citarse como respaldada por la patente**.

### 7.1 Dimensiones — ausencia total
- **No hay una sola cota en mm, cm ni pulgadas en todo el documento.** Ni un diámetro, ni una longitud, ni un espesor.
- Diámetro de la rueda omni `16`. Anchura del doble omniwheel. Diámetro de los rodillos `31`.
- Dimensión del hexágono de la chapa `12` (lado, entrecaras, circunradio) y del triángulo `D` (lado, circunradio, distancia rueda↔centro `M`).
- Tamaño y tolerancias de los recortes `20`; radio de las esquinas.
- Espesor de la chapa `12`, radios de plegado de `28`/`34`, longitud de las pestañas.
- Diámetro de los taladros `30` y `36`, su posición y su métrica de tornillo.
- Diámetro de las ruedas de bola `26`, su altura de montaje, su capacidad de carga y el diámetro de los vaciados `38`.
- Altura total del módulo, altura libre bajo la chapa, distancia de la superficie de transporte al bastidor.
- Cuántas ruedas de bola por módulo exactamente: [0015] dice «al menos una, preferentemente varias uniformemente repartidas», sin número. Los dibujos muestran del orden de 5–6 por módulo, más las compartidas en las juntas — pero **no es una cifra declarada**.

### 7.2 Accionamiento
- **Tipo de motor**: ni paso a paso, ni BLDC, ni DC escobillas, ni servo. Solo «Antriebsmotor».
- Par, potencia, velocidad nominal, tensión de alimentación, corriente.
- **Cómo se une el eje del motor a la rueda**: el texto dice literalmente «Antriebsmotorwellen (nicht gezeigt)». No hay acoplamiento, ni chavetero, ni prisionero, ni brida.
- **Existencia o no de reductor**, y su relación. La palabra `Getriebe` no aparece.
- **Transmisión**: no se menciona correa, correa dentada, engranaje, cadena ni fricción. El accionamiento directo coaxial que sugieren las Fig. 5a–5d es **lectura del dibujo**.
- Rodamientos de la rueda, precarga, lubricación, tipo de eje.
- Fijación del motor al soporte `32` (el texto solo dice que el soporte se atornilla a la chapa y que «die Befestigung kann aber auch anders erfolgen»).

### 7.3 Control y electrónica
- **No hay ninguna ecuación de cinemática** (ni directa ni inversa). Ni matriz jacobiana, ni descomposición vx/vy/ω → ω₁,ω₂,ω₃.
- Arquitectura del controlador: centralizado vs distribuido, un driver por motor vs multiplexado.
- Bus de comunicación, protocolo, direccionamiento de módulos, sincronización temporal entre módulos.
- **Encoders o realimentación de posición del motor**: no se mencionan. Lo único citado es una eventual «Positionsüberwachung […] mittels Bildverarbeitung» ([0012], p3) y solo como paliativo si la rueda tiene huecos entre rodillos.
- Detección de la posición/orientación del objeto transportado; planificación de trayectorias; reparto de carga entre módulos; qué hace un módulo cuando el objeto lo abandona.
- Alimentación eléctrica: tensión, cableado, cómo llega la corriente a cada módulo del panal, conectores.
- Qué significa exactamente «**steckbar**» (enchufable, [0016]/reiv. 10): no se describe ningún conector mecánico ni eléctrico.

### 7.4 Materiales y fabricación
- Material y espesor de la chapa `12` y del soporte `32`.
- Material de la llanta y de los rodillos de la rueda omni (elastómero, PU, dureza Shore, coeficiente de fricción).
- Acabados, tratamientos superficiales, tolerancias de fabricación.
- Proceso de fabricación de la chapa (corte láser + plegado es la lectura razonable de `Abkantungen`, pero no está escrito).

### 7.5 Prestaciones y validación
- Carga máxima por rueda y por módulo; peso máximo del objeto transportado.
- Velocidad y aceleración máximas del objeto; precisión de posicionamiento.
- Tamaño mínimo del objeto en relación al paso del panal (cuántos módulos debe cubrir un paquete para ser controlable).
- Ruido, vida útil, mantenimiento, seguridad.

### 7.6 Geometría no resuelta
- **La contradicción 0° / 90°** entre [0011] y la reivindicación 5 (§2.6) — hay que optar; recomendación: 0°.
- El **paso del teselado** hexagonal y la orientación relativa entre módulos vecinos: el texto solo dice, de forma cualitativa, que «durch geeignete Ausrichtung von direkt benachbarten Förderrädern zueinander die Hauptförderrichtung beeinflusst» ([0020], p3). **No hay regla de fase entre módulos**.
- La forma exacta de los módulos pasivos de borde `270` (medio hexágono, triángulo, etc.) y cómo se rematan las esquinas del sistema.
- Si las ruedas de bola de la junta son una por vértice compartida entre tres chapas: lo sugieren [0057] («1/3 eines Kreises») y la Fig. 19a, pero **no se afirma**.

---

## 8. Índice de figuras ↔ láminas (verificado abriendo las 30 imágenes)

Las figuras están descritas en el texto en [0030]–[0048] (p4 y p5); las láminas ocupan p11–p40, **una figura por página**:

| Figura | Lámina | Contenido | Numerales rotulados en la lámina |
|---|---|---|---|
| Fig. 1 | p11 | Planta del módulo `10` con la construcción geométrica | 10, 12, 14, 16, 18, 20, 26, 31, a, b, c, r, s, t, H, M |
| Fig. 2 | p12 | Planta del módulo de una unidad `100` (chapa pentagonal) | 100, 12, 14, 16, 18, 20, 38 |
| Fig. 3 | p13 | Perspectiva del `100` desde abajo/oblicuo | 100, 12, 18, 22, 28, 30, 32, 38 |
| Fig. 4 | p14 | Alzado del `100` | 100, 12, 16, 18, 22, 24, 28, 30 |
| Fig. 5a | p15 | Unidad `14` sin chapa, perspectiva | 16, 32, 34, 36 |
| Fig. 5b | p16 | Unidad `14` sin chapa, planta | 16, 18, 34, 36 |
| Fig. 5c | p17 | Unidad `14` sin chapa, vista frontal del motor | 16, 18, 32, 34 |
| Fig. 5d | p18 | Unidad `14` sin chapa, lateral (se ven los rodillos `31`) | 18, 31, 32, 34 |
| Fig. 6 | p19 | Perspectiva del módulo `10` | 10, 12, 14, 16, 18, 20, 22, 26, 28, 30, 32 |
| Fig. 7 | p20 | Alzado del módulo `10` (plano de puntos altos `24`) | 10, 12, 16, 18, 24, 26, 28, 30, 32, 34 |
| Fig. 8 | p21 | Planta del módulo Mecanum `200` | 200, 12, 14, 16, 18, 20, 26 |
| Fig. 9 | p22 | Perspectiva del `200` | 200, 14, 16, 18, 20, 22, 26, 28, 30, 32 |
| Fig. 10 | p23 | Alzado del `200` | 16, 18, 24, 28, 30 |
| Fig. 11 | p24 | **Esquema cinemático** del `10`: `H` colineal con `R`, `v` tangencial | 16, H, R, v⃗ |
| Fig. 12a | p25 | Planta del módulo asimétrico `260` | 260, 14, 16, 18, 20, 26 |
| Fig. 12b | p26 | **Esquema** del `260`: radios distintos, `v` no tangencial | 16, H, R1, R2, R3, v⃗ |
| Fig. 13a | p27 | Perspectiva del módulo pasivo `270` | 270, 12, 16, 20, 22, 26, 28, 30, 32 |
| Fig. 13b | p28 | Planta del `270` | 270, 12, 16, 20, 26 |
| Fig. 13c | p29 | Alzado del `270` | 270, 12, 26, 28, 30, 32, 34 |
| Fig. 13d | p30 | Vista lateral del `270` | 270, 12, 24, 26, 28, 30, 32 |
| Fig. 14a | p31 | Combinación de vectores → traslación | 10, v⃗, F⃗ |
| Fig. 14b | p32 | Combinación de vectores → trayectoria curva | 10, v⃗, F⃗ |
| Fig. 14c | p33 | Combinación de vectores → rotación | 10, v⃗, F⃗ |
| Fig. 14d | p34 | Combinación de vectores → traslación pura | 10, v⃗, F⃗ |
| Fig. 15 | p35 | Sistema `300` sobre bastidor `39` con paquetes `40` | 300, 10, 39, 40, 270 |
| Fig. 16 | p36 | El mismo sistema en otra fase (capa paletizable) | 300, 10, 39, 40, 270 |
| Fig. 17 | p37 | Planta del sistema con trayectorias (recta, diagonal, curva con giro, rotación pura) | 300, 10, 39, 40, 270 |
| Fig. 18 | p38 | Planta: formación de una capa de paquetes | 300, 10, 39, 40, 270 |
| Fig. 19a | p39 | **Detalle del panal desde arriba** — teselado hexagonal | 300, 10, 16, 18 |
| Fig. 19b | p40 | **Detalle del panal desde abajo** — motores y soportes | 300, 10, 18, 32 |

---

## 9. Cierre — cláusula de combinabilidad

[0071] (p7):

> «Die in der vorstehenden Beschreibung, in den Zeichnungen sowie in den Ansprüchen offenbarten Merkmale der Erfindung können sowohl **einzeln als auch in den beliebigen Kombinationen** für die Verwirklichung der Erfindung in ihren verschiedenen Ausführungsformen wesentlich sein.»
>
> *«Las características de la invención divulgadas en la descripción, los dibujos y las reivindicaciones pueden ser esenciales, tanto individualmente como en cualquier combinación, para la realización de la invención en sus distintas formas».*

**Estado de la técnica citado** (p1): DE 40 13 194 C2, DE 25 15 009 B2, DE 36 08 630 A1, DE 10 2010 008 970 A1, DE 19 31 701 A, FR 2 798 122 A1, GB 2 213 908 A, **US 5 396 977 A** (único comentado, en [0002], p2), JP H07-291 433 A, JP H05-201 527 A.
