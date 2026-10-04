# Zeichnet src/bilder/planeten.png als Strichgrafik: Sonne und genau acht Planeten in richtiger Reihenfolge.
# Das Bildmodell zählt Planeten nicht verlässlich. Aufruf: python3 zeichnungen/planeten.py /tmp/p.svg && rsvg-convert -w 896 -h 1200 -b white /tmp/p.svg -o src/bilder/planeten.png
import math, random, sys
OUT=sys.argv[1]
W,H=896,1200; cx,cy=448,215
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/>',
   '<defs><clipPath id="rahmen"><rect x="30" y="30" width="836" height="1140" rx="18"/></clipPath></defs>']
L='stroke="#000" fill="none" stroke-linecap="round" stroke-linejoin="round"'
planeten=[("merkur",235,-42,26),("venus",310,38,36),("erde",390,-30,40),("mars",475,33,32),
          ("jupiter",590,-18,84),("saturn",715,22,60),("uranus",830,-14,48),("neptun",935,12,46)]
o.append('<g clip-path="url(#rahmen)">')
for _,r,_,_ in planeten: o.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" {L} stroke-width="3"/>')
random.seed(7)
pos=[(p,cx+r*math.sin(math.radians(a)),cy+r*math.cos(math.radians(a)),pr) for p,r,a,pr in planeten]
def stern(x,y,s):
    pts=[]
    for i in range(10):
        rr=s if i%2==0 else s*0.45; w=math.radians(-90+i*36)
        pts.append(f"{x+rr*math.cos(w):.1f},{y+rr*math.sin(w):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="#fff" stroke="#000" stroke-width="3" stroke-linejoin="round"/>'
sterne=[];v=0
while len(sterne)<24 and v<8000:
    v+=1
    x,y=random.uniform(60,836),random.uniform(60,1140); s=random.choice([10,12,14,17])
    if math.hypot(x-cx,y-cy)<190: continue
    if any(math.hypot(x-px,y-py)<pr*(2.2 if p=="saturn" else 1)+30 for p,px,py,pr in pos): continue
    if any(math.hypot(x-sx,y-sy)<75 for sx,sy,_ in sterne): continue
    d=math.hypot(x-cx,y-cy)
    if any(abs(d-r)<s+9 for _,r,_,_ in planeten): continue
    sterne.append((x,y,s))
for x,y,s in sterne: o.append(stern(x,y,s))
o.append('</g>')
for i in range(16):
    w=math.radians(i*22.5); r1,r2=(122,168) if i%2==0 else (122,150)
    o.append(f'<path d="M{cx+r1*math.cos(w):.1f} {cy+r1*math.sin(w):.1f}L{cx+r2*math.cos(w-0.09):.1f} {cy+r2*math.sin(w-0.09):.1f}" {L} stroke-width="5"/>')
o.append(f'<circle cx="{cx}" cy="{cy}" r="112" fill="#fff" stroke="#000" stroke-width="6"/>')
o.append(f'<circle cx="{cx-38}" cy="{cy-18}" r="9" fill="#000"/><circle cx="{cx+38}" cy="{cy-18}" r="9" fill="#000"/>')
o.append(f'<path d="M{cx-45} {cy+25}Q{cx} {cy+70} {cx+45} {cy+25}" {L} stroke-width="6"/>')
o.append(f'<circle cx="{cx-70}" cy="{cy+20}" r="14" {L} stroke-width="3"/><circle cx="{cx+70}" cy="{cy+20}" r="14" {L} stroke-width="3"/>')
def kreis(x,y,r,sw=5): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#fff" stroke="#000" stroke-width="{sw}"/>'
for p,x,y,r in pos:
    o.append(f'<clipPath id="c-{p}"><circle cx="{x:.1f}" cy="{y:.1f}" r="{r-2}"/></clipPath>')
    rot=f'transform="rotate(-18 {x:.1f} {y:.1f})"'
    if p=="saturn":
        o.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r*2.0:.0f}" ry="{r*0.55:.0f}" {rot} {L} stroke-width="5"/>')
        o.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r*1.6:.0f}" ry="{r*0.38:.0f}" {rot} {L} stroke-width="3"/>')
    o.append(kreis(x,y,r))
    g=f'<g clip-path="url(#c-{p})" {L} stroke-width="3">'
    k=r/40
    if p=="jupiter":
        o.append(g+"".join(f'<path d="M{x-r} {y+dy*k}q{r/2} {-6} {r} 0t{r} 0"/>' for dy in (-22,-11,0,10,21))+f'<ellipse cx="{x+18*k:.1f}" cy="{y+15*k:.1f}" rx="{15*k:.0f}" ry="{8*k:.0f}"/></g>')
    elif p=="saturn":
        o.append(g+"".join(f'<path d="M{x-r} {y+dy*k}h{2*r}"/>' for dy in (-18,-5,9,22))+'</g>')
        a=r*2.0; b=r*0.55
        o.append(f'<path d="M{x-a:.1f} {y:.1f}A{a:.1f} {b:.1f} 0 0 0 {x+a:.1f} {y:.1f}" {rot} {L} stroke-width="5"/>')
        o.append(f'<path d="M{x-r*1.6:.1f} {y:.1f}A{r*1.6:.1f} {r*0.38:.1f} 0 0 0 {x+r*1.6:.1f} {y:.1f}" {rot} {L} stroke-width="3"/>')
    elif p=="erde":
        o.append(g+f'<path d="M{x-26} {y-14}q10 -13 21 -3t10 13q-8 13 -21 8z"/><path d="M{x+5} {y+10}q13 -5 21 5q-5 16 -18 13z"/><path d="M{x-22} {y+16}q6 -4 10 2"/></g>')
        o.append(kreis(x+60,y-32,12,4))
    elif p=="mars":
        o.append(g+f'<circle cx="{x-9}" cy="{y-6}" r="7"/><circle cx="{x+10}" cy="{y+10}" r="5"/><circle cx="{x+8}" cy="{y-13}" r="3.5"/></g>')
    elif p=="venus":
        o.append(g+f'<path d="M{x-36} {y-8}q12 -10 24 0t24 0t24 0"/><path d="M{x-36} {y+12}q12 -10 24 0t24 0t24 0"/></g>')
    elif p=="uranus":
        o.append(g+f'<path d="M{x-15} {y-50}v100"/><path d="M{x+13} {y-50}v100"/></g>')
    elif p=="neptun":
        o.append(g+f'<path d="M{x-46} {y-14}q23 -9 46 0t46 0"/><path d="M{x-46} {y+14}q23 -9 46 0t46 0"/><ellipse cx="{x-10}" cy="{y}" rx="10" ry="6"/></g>')
    elif p=="merkur":
        o.append(g+f'<circle cx="{x-6}" cy="{y-5}" r="5"/><circle cx="{x+8}" cy="{y+7}" r="3.5"/></g>')
o.append('<rect x="30" y="30" width="836" height="1140" rx="18" fill="none" stroke="#000" stroke-width="6"/></svg>')
open(OUT,"w").write("\n".join(o))
