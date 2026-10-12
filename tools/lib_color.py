# -*- coding: utf-8 -*-
"""
lib_color.py — Apariencias reales de Inventor, cuerpo por cuerpo.

Inventor 2027 en espanol trae 199 apariencias en la "Biblioteca de materiales de
Inventor". `SurfaceBody.Appearance` acepta un asset copiado al documento, asi que
una misma pieza puede tener cuerpos de distinto color (cuerpo blanco + porta
boquillas rojo, por ejemplo) sin partirla en varios .ipt.

Uso:

    p = Pintor(app)
    p.pintar(doc, body, 'Blanco')

Los nombres cortos del mapa son los que se usan en los modelos; el valor es el
nombre real de la apariencia en la biblioteca.
"""

LIBRERIA = 'Biblioteca de materiales de Inventor'

MAPA = {
    'Aluminio': 'Aluminio - Pulido',
    'AluminioMate': 'Aluminio - Plano',
    'AluminioAnod': 'Anodizado - Gris claro',
    'AluminioMecanizado': 'Mecanizado - Aluminio',
    'Inox': 'Inoxidable - Bruñido',
    'InoxSatinado': 'Inoxidable - Satinado Grueso Pantalla',
    'Acero': 'Acero',
    'AceroPulido': 'Acero - Pulido',
    'Galvanizado': 'Acero galvanizado',
    'Cromo': 'Cromo - Pulido',
    'Zinc': 'Zinc Cromado 2',
    'Plata': 'Plata',
    'Negro': 'Negro',
    'NegroMate': 'Suave - Negro',
    'NegroTextura': 'Textura fina - Negro',
    'Caucho': 'Caucho - Negro',
    'Blanco': 'Blanco',
    'BlancoMate': 'Suave - Blanco',
    'BlancoTextura': 'Textura gruesa - Blanco',
    'Gris': 'Gris',
    'GrisClaro': 'Gris claro',
    'GrisOscuro': 'Gris oscuro',
    'GrisMedio': 'Suave - Gris medio',
    'Amarillo': 'Amarillo',
    'AmarilloSuave': 'Suave - Amarillo',
    'Rojo': 'Rojo',
    'RojoSuave': 'Suave - Rojo',
    'Naranja': 'Naranja',
    'Azul': 'Caucho - Azul',
    'AzulAcero': 'Azul acero',
    'AzulClaro': 'Azul celeste medio',
    'Verde': 'Verde oscuro',
    'Plastico': 'Nilón 6',
    'PlasticoNegro': 'Suave - Negro',
    'Policarbonato': 'Policarbonato - Claro',
    'PolicarbonatoAhumado': 'Policarbonato - Ahumado',
    'Vidrio': 'Claro',
    'Cobre': 'Cobre - Satinado',
    'Laton': 'Latón - Satinado',
    'Marfil': 'Suave - Marfil',
    'Carton': 'Cartón',
    'Madera': 'Nogal',
}


class Pintor:
    def __init__(self, app):
        self.app = app
        self.avisos = []
        try:
            self.lib = app.AssetLibraries.Item(LIBRERIA)
        except Exception as e:
            self.lib = None
            self.avisos.append(f'biblioteca de apariencias no disponible: {e}')
        self._cache = {}

    def _asset(self, doc, corto):
        """Asset de apariencia ya copiado a `doc`, cacheado por documento."""
        nombre = MAPA.get(corto, corto)
        clave = (id(doc), nombre)
        if clave in self._cache:
            return self._cache[clave]
        asset = None
        try:                                   # si ya esta en el documento
            asset = doc.AppearanceAssets.Item(nombre)
        except Exception:
            asset = None
        if asset is None and self.lib is not None:
            try:
                asset = self.lib.AppearanceAssets.Item(nombre).CopyTo(doc)
            except Exception as e:
                self.avisos.append(f'apariencia "{nombre}": {e}')
                return None
        self._cache[clave] = asset
        return asset

    def pintar(self, doc, body, corto):
        """Pinta un cuerpo. Devuelve True si quedo aplicada."""
        a = self._asset(doc, corto)
        if a is None:
            return False
        try:
            body.Appearance = a
            return True
        except Exception as e:
            self.avisos.append(f'cuerpo {corto}: {e}')
            return False

    def pintar_doc(self, doc, corto):
        """Apariencia por defecto de todo el documento."""
        a = self._asset(doc, corto)
        if a is None:
            return False
        try:
            doc.ActiveAppearanceAsset = a
            return True
        except Exception:
            try:
                doc.ActiveRenderStyle = doc.RenderStyles.Item(MAPA.get(corto, corto))
                return True
            except Exception as e:
                self.avisos.append(f'documento {corto}: {e}')
                return False
