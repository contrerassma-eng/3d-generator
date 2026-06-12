# Protocolo de captura fotográfica

La calidad del 3D se decide aquí, no en el procesamiento. Checklist antes de fotografiar:

## Equipo y configuración

- [ ] Cámara o smartphone en máxima resolución; **EXIF activado** (el pipeline lee la focal).
- [ ] **Focal fija** durante toda la sesión (no zoom). En smartphone: lente principal, sin modo "auto-switch".
- [ ] ISO bajo (≤400), sin flash, sin HDR agresivo, sin filtros ni "mejoras" IA del teléfono.
- [ ] Formato JPG máxima calidad (o RAW + exportación sin recorte).

## Escena

- [ ] Luz **difusa y constante**: nublado exterior, o interior con luz indirecta. Evitar sol directo (sombras duras se "pegan" a la textura).
- [ ] Objeto **estático** sobre fondo con textura (papel kraft, cartón, diario). Fondo liso blanco dificulta el registro.
- [ ] **Referencia de escala en escena**: regla, marcador ArUco impreso, o cualquier pieza de dimensión conocida. Anotar esa dimensión en `descripcion.md`.
- [ ] Superficies brillantes/metálicas: matizar con spray de escaneo (o talco/tiza en aerosol) o luz polarizada cruzada. Si no es posible, esas zonas quedarán declaradas como no confiables.

## Trayectoria de tomas (objeto semi-complejo: 60–120 fotos)

- [ ] **3 órbitas completas** alrededor del objeto: baja (~20° sobre horizonte), media (~45°), alta (~70°).
- [ ] Una foto cada **10–15°** de giro ⇒ 24–36 fotos por órbita.
- [ ] **70–80% de solape** entre fotos consecutivas (la siguiente foto debe contener la mayor parte de la anterior).
- [ ] Detalles y cavidades: 10–20 fotos extra acercándose, siempre con transición gradual (no saltar de lejos a macro).
- [ ] El objeto debe ocupar **50–80% del encuadre**.
- [ ] Moverse alrededor del objeto, no rotar el objeto (si usas mesa giratoria: fondo 100% liso y sin sombras propias, es más delicado).

## Verificación rápida antes de salir de la escena

- [ ] Revisar 5 fotos al azar con zoom: ¿nítidas al 100%?
- [ ] ¿Quedó la referencia de escala visible en ≥5 fotos?
- [ ] ¿Alguna zona del objeto sin cobertura? (mirar mentalmente desde 6 direcciones)

El gate G1 del pipeline rechaza automáticamente fotos borrosas o de baja resolución;
si rechaza más del 15% del set, pedirá re-captura indicando cuáles.
