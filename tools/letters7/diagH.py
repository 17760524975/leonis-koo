import json, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
GRID = json.load(open(os.path.join(HERE,'grid.json'), encoding='utf8'))
P = GRID['A']
SHAPE = {'L':(2,[(0,0),(2,0),(0,2)]),'M':(1,[(0,0),(2,0),(1,1)]),
         'Q':(1,[(0,0),(1,0),(1,1),(0,1)]),'S':(0.5,[(0,0),(1,0),(0,1)]),
         'R':(1,[(0,0),(1,0),(2,1),(1,1)])}
def rot90(p,k):
    c,s=[(1,0),(0,1),(-1,0),(0,-1)][k]
    return [(c*x-s*y,s*x+c*y) for x,y in p]
def poly_area(p):
    a=0.0
    for i in range(len(p)):
        x1,y1=p[i]; x2,y2=p[(i+1)%len(p)]
        a+=x1*y2-x2*y1
    return a/2
def centroid(p):
    Q=[tuple(v) for v in (p if poly_area(p)>0 else p[::-1])]
    a=cx=cy=0.0
    for i in range(len(Q)):
        q=Q[(i+1)%len(Q)]
        cr=Q[i][0]*q[1]-q[0]*Q[i][1]
        a+=cr; cx+=(Q[i][0]+q[0])*cr; cy+=(Q[i][1]+q[1])*cr
    a/=2
    return (cx/(6*a),cy/(6*a))
def ccw(p): return p if poly_area(p)>0 else p[::-1]
def clip_convex(a,b):
    out=[tuple(v) for v in ccw([tuple(v) for v in a])]
    B=[tuple(v) for v in ccw([tuple(v) for v in b])]
    for i in range(len(B)):
        p1,p2=B[i],B[(i+1)%len(B)]
        side=lambda v:(p2[0]-p1[0])*(v[1]-p1[1])-(p2[1]-p1[1])*(v[0]-p1[0])
        inp,out=out,[]
        for j in range(len(inp)):
            cur,nxt=inp[j],inp[(j+1)%len(inp)]
            sc,sn=side(cur),side(nxt)
            if sc>=-1e-12: out.append(cur)
            if (sc>1e-12 and sn<-1e-12) or (sc<-1e-12 and sn>1e-12):
                t=sc/(sc-sn); out.append((cur[0]+(nxt[0]-cur[0])*t, cur[1]+(nxt[1]-cur[1])*t))
        if not out: break
    return out
def iou(A,B):
    c=clip_convex(A,B); inter=abs(poly_area(c)) if len(c)>=3 else 0.0
    uni=abs(poly_area(A))+abs(poly_area(B))-inter
    return inter/uni if uni>0 else 0.0
def options(hull):
    H_=[tuple(v) for v in hull]; cH=centroid(H_); aH=abs(poly_area(H_))
    res=[]
    for key,(ar,base) in SHAPE.items():
        for flip in ([False,True] if key=='R' else [False]):
            b=[(-x,y) for x,y in base] if flip else base
            for k in range(4):
                sh=rot90(b,k); cS=centroid(sh); s=np.sqrt(aH/ar)
                placed=[(cH[0]+(v[0]-cS[0])*s, cH[1]+(v[1]-cS[1])*s) for v in sh]
                res.append((iou(placed,H_),key,k,flip))
    res.sort(key=lambda z:-z[0])
    return res
data=json.load(open(os.path.join(HERE,'pieces.json'),encoding='utf8'))
want=set('H')
for rec in data:
    if rec['ch'] not in want: continue
    ps=sorted(rec['pieces'],key=lambda p:-p['n'])[:7]
    print('===',rec['ch'],'P=',round(P,3))
    for i,p in enumerate(ps):
        o=options(p['hull'])
        print('块%d n=%d 面积a2=%.2f'%(i,p['n'],p['n']/P/P))
        # 每个形状的最好 IoU 与排名
        m={}
        for rank,(q,key,k,flip) in enumerate(o):
            if key not in m: m[key]=(rank,q,k,flip)
        for key in ['L','M','Q','S','R']:
            if key in m: print('   %s best=%.3f 首次排名=%d k=%d flip=%s'%(key,m[key][1],m[key][0],m[key][2],m[key][3]))
        print('   前6:', ' '.join('%s(%.3f)'%(z[1],z[0]) for z in o[:6]))
