import struct, json, math, numpy as np, trimesh
from collections import defaultdict
from OCP.STEPControl import STEPControl_Reader
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID, TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location

STP='/tmp/sorter_CO.stp'
OUT='/home/user/3d-generator/cad/componentes/models/sorter_CO.glb'
OUT2='/home/user/3d-generator/cad/componentes/models/sorter_CO_piezas.glb'

r=STEPControl_Reader(); r.ReadFile(STP); r.TransferRoots(); shape=r.OneShape()
print('teselando fino (B-rep)…')
BRepMesh_IncrementalMesh(shape, 2.0, False, 0.5, True)   # deflexión lineal 0.4mm

def classify(lo,hi):
    dx,dy,dz=hi-lo; cz=(lo[2]+hi[2])/2; mx=max(dx,dy,dz); mn=min(dx,dy,dz)
    if dy>1000 and dx<55 and dz<55 and 25<cz<65: return 'Banda',[30,30,30]
    if dy>800 and dx<140 and dz<170 and cz<130: return 'Larguero PG40 80x40',[150,160,168]
    if dx>380 and dy<140: return 'Travesano',[120,144,160]
    if dz>200 and lo[2]<-40: return 'Pata soporte',[70,86,96]
    if mx>250: return 'Motor grupo motriz',[84,110,122]
    if 55<mx<130 and mn>30 and abs(dy-dz)<25: return 'Polea rodamiento',[176,190,197]
    if dx>60 and dy<45 and dz<45: return 'Eje rodillo',[190,175,150]
    if 40<mx<220 and cz>100: return 'Guia perfil',[200,208,214]
    if mx<35: return 'Tornilleria',[110,120,128]
    return 'Estructura',[135,155,165]

scene=trimesh.Scene(); tally=defaultdict(int); ntri_total=0
exp=TopExp_Explorer(shape,TopAbs_SOLID); si=0
while exp.More():
    solid=TopoDS.Solid_s(exp.Current()); exp.Next(); si+=1
    P=[]; F=[]
    fe=TopExp_Explorer(solid,TopAbs_FACE)
    while fe.More():
        f=TopoDS.Face_s(fe.Current()); fe.Next()
        loc=TopLoc_Location(); tri=BRep_Tool.Triangulation_s(f,loc)
        if tri is None: continue
        trsf=loc.Transformation(); base=len(P)
        nb=tri.NbNodes()
        for i in range(1,nb+1):
            p=tri.Node(i); p.Transform(trsf); P.append([p.X(),p.Y(),p.Z()])
        for t in range(1,tri.NbTriangles()+1):
            n1,n2,n3=tri.Triangle(t).Get()
            F.append([base+n1-1,base+n2-1,base+n3-1])
    if len(F)<4: continue
    P=np.array(P); F=np.array(F)
    lo=P.min(0); hi=P.max(0); ex=hi-lo; ctr=(lo+hi)/2
    if max(ex)<8 or any(abs(c)>5000 for c in ctr) or max(ex)>4000: continue
    cls,col=classify(lo,hi)
    m=trimesh.Trimesh(vertices=P,faces=F,process=False)
    m.visual.face_colors=np.tile(col+[255],(len(F),1))
    m.apply_scale(0.001)
    scene.add_geometry(m,node_name=f'{cls}_{si}')
    tally[cls]+=1; ntri_total+=len(F)

scene.export(OUT)
print('sólidos:',si,'| piezas:',sum(tally.values()),'| triángulos:',ntri_total,'| clases:',dict(tally))
# copiar a la variante de piezas
import shutil; shutil.copy(OUT,OUT2)
