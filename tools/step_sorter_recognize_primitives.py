import struct, json, numpy as np, trimesh
from scipy import sparse
from scipy.sparse.csgraph import connected_components

STL='/home/user/3d-generator/cad/ensambles/base.stl'
REMOVE='/home/user/3d-generator/cad/ensambles/base_remove.bin'
OUT='/home/user/3d-generator/cad/ensambles/sorter_recon.json'

raw=open(STL,'rb').read(); n=struct.unpack('<I',raw[80:84])[0]
arr=np.frombuffer(raw[84:84+50*n],dtype=np.uint8).reshape(n,50)
tris=np.ascontiguousarray(arr[:,12:48]).view('<f4').reshape(n,3,3).astype(np.float64)
mask=np.frombuffer(open(REMOVE,'rb').read(),np.uint8); tris=tris[mask==0]; n=len(tris)
V=tris.reshape(n*3,3); q=np.round(V/0.4).astype(np.int64)
_,index,inv=np.unique(q,axis=0,return_index=True,return_inverse=True); inv=np.asarray(inv).ravel()
verts=V[index]; faces=inv.reshape(n,3)
Nv=len(verts)
r=np.concatenate([faces[:,0],faces[:,1],faces[:,2]]); c=np.concatenate([faces[:,1],faces[:,2],faces[:,0]])
g=sparse.coo_matrix((np.ones(len(r),np.int8),(r,c)),shape=(Nv,Nv))
ncomp,lab=connected_components(g,directed=False); fcomp=lab[faces[:,0]]

def quat_from_R(R):
    # R columnas = ejes; devuelve [x,y,z,w]
    t=R[0,0]+R[1,1]+R[2,2]
    if t>0:
        s=0.5/np.sqrt(t+1); w=0.25/s; x=(R[2,1]-R[1,2])*s; y=(R[0,2]-R[2,0])*s; z=(R[1,0]-R[0,1])*s
    elif R[0,0]>R[1,1] and R[0,0]>R[2,2]:
        s=2*np.sqrt(1+R[0,0]-R[1,1]-R[2,2]); w=(R[2,1]-R[1,2])/s; x=0.25*s; y=(R[0,1]+R[1,0])/s; z=(R[0,2]+R[2,0])/s
    elif R[1,1]>R[2,2]:
        s=2*np.sqrt(1+R[1,1]-R[0,0]-R[2,2]); w=(R[0,2]-R[2,0])/s; x=(R[0,1]+R[1,0])/s; y=0.25*s; z=(R[1,2]+R[2,1])/s
    else:
        s=2*np.sqrt(1+R[2,2]-R[0,0]-R[1,1]); w=(R[1,0]-R[0,1])/s; x=(R[0,2]+R[2,0])/s; y=(R[1,2]+R[2,1])/s; z=0.25*s
    return [round(float(v),6) for v in (x,y,z,w)]

parts=[]; nrec={'cilindro':0,'caja':0,'obb':0,'skip':0}
C={'cilindro':'#b0a07a','caja':'#9aa6b0','obb':'#8b98a6'}
for ci in range(ncomp):
    sel=fcomp==ci
    if not sel.any(): continue
    fc=faces[sel]; used=np.unique(fc); remap={v:k for k,v in enumerate(used)}
    m=trimesh.Trimesh(vertices=verts[used],faces=np.vectorize(remap.get)(fc),process=False)
    ex=m.extents; mx=float(max(ex))
    if mx<25: nrec['skip']+=1; continue   # tornillería fina: se omite
    try:
        T,extents=trimesh.bounds.oriented_bounds(m)   # T: world→obb
    except Exception:
        continue
    M=np.linalg.inv(T)                                  # obb→world
    R=M[:3,:3]; center=M[:3,3]; e=extents
    # ¿cilindro? dos extents ~iguales → eje = el tercero; verificar radial circular
    order=np.argsort(e)  # e[order[0]]<=..
    pair=(order[0],order[1]); axis=order[2]
    equalish=abs(e[pair[0]]-e[pair[1]])/max(e[pair[1]],1e-6)<0.18
    kind='caja'
    if equalish:
        # radial de vértices respecto al eje (en marco obb)
        Vl=(T[:3,:3]@m.vertices.T).T + T[:3,3]
        a=axis; perp=[i for i in range(3) if i!=a]
        rad=np.hypot(Vl[:,perp[0]],Vl[:,perp[1]])
        R95=np.percentile(rad,95); Rmed=np.median(rad)
        # cilindro: banda radial estrecha (círculo) vs esquinas (caja→ R95≈Rmed*√2)
        if R95/max(Rmed,1e-6) < 1.20:
            kind='cilindro'
    if kind=='cilindro':
        dia=float((e[pair[0]]+e[pair[1]])/2); h=float(e[axis])
        # orientar: eje del cilindro (columna 'axis' de R) → dir del feature; uso quat de R con eje local = ese
        # construyo un marco donde Z = eje del cilindro
        zc=R[:,axis]; xc=R[:,pair[0]]; yc=np.cross(zc,xc)
        Rc=np.column_stack([xc,yc/np.linalg.norm(yc),zc])
        feat={'id':'f1','name':f'Cilindro Ø{dia:.0f}×{h:.0f}','shape':'cylinder','op':'union','at':[0,0,-h/2],'dir':[0,0,1],'params':{'dia':round(dia,2),'h':round(h,2)}}
        quat=quat_from_R(Rc); nrec['cilindro']+=1; col=C['cilindro']; nm=f'Cilindro Ø{dia:.0f}'
    else:
        w,d,hh=float(e[0]),float(e[1]),float(e[2])
        feat={'id':'f1','name':f'Caja {w:.0f}×{d:.0f}×{hh:.0f}','shape':'box','op':'union','at':[0,0,-hh/2],'dir':[0,0,1],'params':{'w':round(w,2),'d':round(d,2),'h':round(hh,2)}}
        quat=quat_from_R(R)
        # OBB perfecto vs aproximado: fracción de llenado
        fill=float(m.volume)/max(e[0]*e[1]*e[2],1e-6) if m.is_volume else 0
        k='caja' if fill>0.7 else 'obb'; nrec[k]+=1; col=C[k]; nm=('Caja' if k=='caja' else 'Bloque (aprox OBB)')
    parts.append({'id':f'p{ci}','name':nm,'color':col,'pos':[round(float(x),3) for x in center],'quat':quat,'fixed':len(parts)==0,'visible':True,'features':[feat]})

doc={'format':'foto3d-cad','version':1,'meta':{'nombre':'Sorter REAL — reconocido a primitivas (paramétrico)','capa':'user',
  'origen':'tools recon: sorter_CO.stp teselado → primitivas por pieza (OBB): rodillos/ejes→cilindro, placas/perfiles→caja; piezas no fiables→bloque OBB aprox. Editable en el modelador.',
  'reconocido':nrec},'parts':parts,'constraints':[]}
json.dump(doc,open(OUT,'w'),ensure_ascii=False)
print('reconocido:',nrec,'| partes:',len(parts))
