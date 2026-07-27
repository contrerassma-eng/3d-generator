#!/usr/bin/env python3
"""Vistas ortográficas + CORTES del SORTER REAL (sorter_CO.stp + Transferencia 90).

Reconstruye la malla del conjunto (base real de base.stl con la transferencia
original quitada y la huella MRT recortada + la transferencia 90 teselada) y
genera un PDF con cortes ortogonales a escala (A-A longitudinal, B-B por la
transferencia, C-C por el cabezal motriz). Las vistas sombreadas (página 1) se
insertan si existen los PNG del visor GLB en el scratchpad (o se omiten).

Uso:  python tools/sorter_cortes.py [transfer_pts.npy] [out.pdf]
Requiere: base.stl, base_remove.bin, y los puntos teselados de la transferencia
(np.save de buildPartGeometry, ver tess.bundle.mjs).
"""
import struct, sys, json, numpy as np, trimesh
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import Rectangle

REPO='/home/user/3d-generator'
PTS=sys.argv[1] if len(sys.argv)>1 else '/tmp/transfer_pts.npy'
OUT=sys.argv[2] if len(sys.argv)>2 else f'{REPO}/cad/ensambles/planos_sorter_real/sorter_real_cortes.pdf'
FECHA='2026-07-20'

raw=open(f'{REPO}/cad/ensambles/base.stl','rb').read(); n=struct.unpack('<I',raw[80:84])[0]
arr=np.frombuffer(raw[84:84+50*n],np.uint8).reshape(n,50)
tris=np.ascontiguousarray(arr[:,12:48]).view('<f4').reshape(n,3,3).astype(np.float64)
mask=np.frombuffer(open(f'{REPO}/cad/ensambles/base_remove.bin','rb').read(),np.uint8)
tris=tris[mask==0]; cen=tris.mean(1)
foot=(cen[:,1]>-1530)&(cen[:,1]<-650)&(cen[:,0]>-60)&(cen[:,0]<475)&(cen[:,2]>-55)
base=tris[~foot].reshape(-1,3); tv=np.load(PTS)
def mesh(V): return trimesh.Trimesh(vertices=V,faces=np.arange(len(V)).reshape(-1,3),process=True)
M=trimesh.util.concatenate([mesh(base),mesh(tv)])

PLANES=[('A-A','Corte longitudinal A-A (plano X=208, eje de máquina)',[208,-1090,0],[1,0,0],1,2,'Y (flujo)','Z'),
        ('B-B','Corte transversal B-B (plano Y=-1090, por la transferencia)',[208,-1090,0],[0,1,0],0,2,'X (ancho)','Z'),
        ('C-C','Corte transversal C-C (plano Y=-300, por cabezal motriz)',[208,-300,0],[0,1,0],0,2,'X (ancho)','Z')]
seg={}
for tag,title,orig,nrm,ih,iv,lh,lv in PLANES:
    s=M.section(plane_origin=orig,plane_normal=nrm)
    polys=[s.vertices[e.points][:,[ih,iv]].tolist() for e in s.entities] if s is not None else []
    seg[tag]={'title':title,'polys':polys,'lh':lh,'lv':lv}
    print(tag,len(polys),'polilíneas')

def titleblock(fig,hoja,titulo):
    ax=fig.add_axes([0,0,1,1]); ax.set_axis_off()
    ax.add_patch(Rectangle((0.006,0.006),0.988,0.988,fill=False,ec='k',lw=1.2))
    ax.add_patch(Rectangle((0.70,0.02),0.28,0.10,fill=False,ec='k',lw=1))
    ax.text(0.715,0.095,'foto3d',fontsize=13,weight='bold')
    ax.text(0.715,0.068,'SORTER REAL (sorter_CO.stp) + Transferencia 90°',fontsize=6.5)
    ax.text(0.715,0.048,titulo,fontsize=7,weight='bold')
    ax.text(0.715,0.030,f'Escala 1:10 · mm · {FECHA}',fontsize=6)
    ax.text(0.958,0.030,hoja,fontsize=8,weight='bold',ha='right')

pdf=PdfPages(OUT)
import os
SC=os.environ.get('SC','')
imgs=[('o_planta','PLANTA'),('o_alzado','ALZADO'),('o_perfil','PERFIL'),('o_iso','ISOMÉTRICA')]
if SC and all(os.path.exists(f'{SC}/{f}.png') for f,_ in imgs):
    import matplotlib.image as mpimg
    fig=plt.figure(figsize=(16.5,11.7)); titleblock(fig,'H1/3','Vistas ortográficas (1er diedro) + isométrica')
    for (f,lab),box in zip(imgs,[[0.04,0.55,0.44,0.40],[0.52,0.55,0.44,0.40],[0.04,0.10,0.44,0.40],[0.52,0.10,0.44,0.40]]):
        a=fig.add_axes(box); a.imshow(mpimg.imread(f'{SC}/{f}.png')); a.set_axis_off(); a.set_title(lab,fontsize=11,weight='bold')
    pdf.savefig(fig); plt.close(fig)

def sheet(tags,hoja,boxes):
    fig=plt.figure(figsize=(16.5,11.7)); titleblock(fig,hoja,' / '.join(tags))
    for tag,box in zip(tags,boxes):
        d=seg[tag]; ax=fig.add_axes(box); ax.set_aspect('equal')
        for p in d['polys']:
            p=np.array(p); ax.plot(p[:,0],p[:,1],'-',color='k',lw=0.55)
        ax.grid(True,alpha=0.25,lw=0.4); ax.set_title(d['title'],fontsize=10,weight='bold')
        ax.set_xlabel(d['lh']+' [mm]'); ax.set_ylabel(d['lv']+' [mm]')
    pdf.savefig(fig); plt.close(fig)

sheet(['A-A'],'H2/3',[[0.06,0.14,0.88,0.78]])
sheet(['B-B','C-C'],'H3/3',[[0.05,0.14,0.44,0.78],[0.53,0.14,0.44,0.78]])
pdf.close()
print('PDF ->',OUT, round(os.path.getsize(OUT)/1e6,2),'MB')
