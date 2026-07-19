import json, math
from OCP.STEPControl import STEPControl_Reader
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID, TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Plane, GeomAbs_Cylinder
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp

STP='/tmp/sorter_CO.stp'
OUT='/home/user/3d-generator/cad/ensambles/sorter_brep.json'

r=STEPControl_Reader(); r.ReadFile(STP); r.TransferRoots()
shape=r.OneShape()
print('STEP leído')

def face_area(f):
    g=GProp_GProps(); BRepGProp.SurfaceProperties_s(f,g); return g.Mass()

def quat_from_dir(d):
    # cuaternión que lleva Z=(0,0,1) al eje d (unitario)
    x,y,z=d; import math
    # eje de rotación = Z × d ; ángulo = acos(z)
    ax,ay,az=(-y,x,0.0); s=math.hypot(ax,ay,az)
    dot=max(-1,min(1,z)); ang=math.acos(dot)
    if s<1e-9:
        return [0,0,0,1] if z>0 else [1,0,0,0]
    ax,ay,az=ax/s,ay/s,az/s; sh=math.sin(ang/2)
    return [round(ax*sh,6),round(ay*sh,6),round(az*sh,6),round(math.cos(ang/2),6)]

parts=[]; rec={'cilindro':0,'caja':0,'skip':0}
exp=TopExp_Explorer(shape,TopAbs_SOLID); si=0
while exp.More():
    solid=TopoDS.Solid_s(exp.Current()); exp.Next(); si+=1
    bb=Bnd_Box(); BRepBndLib.Add_s(solid,bb)
    xmin,ymin,zmin,xmax,ymax,zmax=bb.Get()
    ex=[xmax-xmin,ymax-ymin,zmax-zmin]; ctr=[(xmin+xmax)/2,(ymin+ymax)/2,(zmin+zmax)/2]
    mx=max(ex)
    if mx<25: rec['skip']+=1; continue
    if any(abs(c)>5000 for c in ctr) or mx>4000: rec['skip']+=1; continue  # sólido atípico mal ubicado del STEP
    # buscar la cara cilíndrica de mayor área
    fe=TopExp_Explorer(solid,TopAbs_FACE); best=None; bestA=0; nplane=0; ncyl=0
    while fe.More():
        f=TopoDS.Face_s(fe.Current()); fe.Next()
        ad=BRepAdaptor_Surface(f); t=ad.GetType()
        if t==GeomAbs_Cylinder:
            ncyl+=1; A=face_area(f)
            if A>bestA: bestA=A; best=ad.Cylinder()
        elif t==GeomAbs_Plane: nplane+=1
    if best is not None and ncyl>=1 and bestA>0.25*(math.pi*max(ex)*max(ex)):
        # cilindro: radio y eje exactos del B-rep
        R=best.Radius(); ax3=best.Axis(); loc=ax3.Location(); dcyl=ax3.Direction()
        d=[dcyl.X(),dcyl.Y(),dcyl.Z()]; n=math.hypot(*d); d=[v/n for v in d]
        # largo = extensión del bbox proyectada sobre el eje
        h=abs(d[0]*ex[0])+abs(d[1]*ex[1])+abs(d[2]*ex[2])
        feat={'id':'f1','name':f'Cilindro Ø{2*R:.1f}×{h:.0f}','shape':'cylinder','op':'union','at':[0,0,-h/2],'dir':[0,0,1],'params':{'dia':round(2*R,2),'h':round(h,2)}}
        parts.append({'id':f's{si}','name':f'Cilindro Ø{2*R:.1f}','color':'#b0a07a','pos':[round(c,2) for c in ctr],'quat':quat_from_dir(d),'fixed':len(parts)==0,'visible':True,'features':[feat]})
        rec['cilindro']+=1
    else:
        w,dd,hh=ex
        feat={'id':'f1','name':f'Caja {w:.0f}×{dd:.0f}×{hh:.0f}','shape':'box','op':'union','at':[0,0,-hh/2],'dir':[0,0,1],'params':{'w':round(w,2),'d':round(dd,2),'h':round(hh,2)}}
        parts.append({'id':f's{si}','name':'Caja','color':'#9aa6b0','pos':[round(c,2) for c in ctr],'quat':[0,0,0,1],'fixed':len(parts)==0,'visible':True,'features':[feat]})
        rec['caja']+=1

doc={'format':'foto3d-cad','version':1,'meta':{'nombre':'Sorter REAL — B-rep nativo reconocido (paramétrico)','capa':'user',
  'origen':'OCP/OpenCASCADE lee sorter_CO.stp; por SÓLIDO: cara cilíndrica dominante → CILINDRO con Ø/eje EXACTOS del B-rep; resto → caja (AABB del STEP).','reconocido':rec},'parts':parts,'constraints':[]}
json.dump(doc,open(OUT,'w'),ensure_ascii=False)
print('sólidos:',si,'| reconocido:',rec,'| partes:',len(parts))
# muestra de diámetros reales
dias=sorted({p['features'][0]['params'].get('dia') for p in parts if p['features'][0]['shape']=='cylinder'})
print('diámetros de cilindro (mm):',[d for d in dias if d][:30])
