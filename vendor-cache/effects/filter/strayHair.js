/* filter/strayHair */
var C=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var I=Math.PI*2,S=class{constructor(e){this.state=(e>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let e=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(e>>>22^e)>>>0}float(){return this.next()/4294967295}int(e,t){return e+this.next()%(t-e+1)}normal(e=0,t=1){let o=Math.max(this.float(),1e-10),s=this.float();return e+t*Math.sqrt(-2*Math.log(o))*Math.cos(I*s)}};function N(n,e,t,o){let s=Math.ceil(t)+2,v=Math.ceil(t)+2,r=new Float32Array(s*v);for(let a=0;a<r.length;a++)r[a]=o.float();let p=new Float32Array(n*e);for(let a=0;a<e;a++)for(let u=0;u<n;u++){let c=u/n*t,l=a/e*t,y=Math.floor(c),m=Math.floor(l),b=c-y,d=l-m,i=b*b*(3-2*b),T=d*d*(3-2*d),M=r[m*s+y],A=r[m*s+y+1],F=r[(m+1)*s+y],w=r[(m+1)*s+y+1];p[a*n+u]=(M*(1-i)+A*i)*(1-T)+(F*(1-i)+w*i)*T}return p}async function z(n,e){let{width:t,height:o,seed:s,density:v,kink:r,stride:p,strideDeviation:a,duration:u,behavior:c,flowFreq:l,colorFn:y,lineWidth:m,isCancelled:b,onProgress:d}=e,i=new S(s),T=Math.min(t,o),M=Math.max(t,o),A=M/1024,F=N(t,o,l,new S(s*31337)),w=Math.max(1,Math.floor(M*v)),U=i.float()*I,L=[];for(let f=0;f<w;f++)L.push({x:i.float()*t,y:i.float()*o,stride:i.normal(p,a)*A,rot:c==="obedient"?U:i.float()*I,color:y(i,f)});let P=Math.max(1,Math.floor(Math.sqrt(T)*u));n.lineCap="round",n.lineJoin="round",n.lineWidth=m;for(let f=0;f<w;f++){if(b())return;let x=L[f],{r:W,g:j,b:G,a:$}=x.color,O=x.x,D=x.y;for(let g=0;g<P;g++){let V=P>1?g/(P-1):1,Y=1-Math.abs(1-V*2),q=Math.floor((O%t+t)%t),J=Math.floor((D%o+o)%o),_=F[J*t+q]*I*r;c==="obedient"?_+=U:_+=x.rot;let k=O+Math.sin(_)*x.stride,R=D+Math.cos(_)*x.stride;n.strokeStyle=`rgba(${W}, ${j}, ${G}, ${$*Y})`,n.beginPath(),n.moveTo(O,D),n.lineTo(k,R),n.stroke(),O=k,D=R}f%3===0&&(await new Promise(g=>setTimeout(g,0)),d&&d(n.canvas))}d&&d(n.canvas)}var H=class extends C{constructor(){super({name:"Stray Hair",namespace:"filter",func:"strayHair",tags:["noise"],description:"Stray hair overlay",globals:{density:{type:"float",default:.5,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},defaultProgram:`search filter, synth

perlin(scale: 100)
  .strayHair()
  .write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"strayHairBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:e,width:t,height:o,params:s,isCancelled:v}){let r=document.createElement("canvas");r.width=t,r.height=o;let p=r.getContext("2d");p.clearRect(0,0,t,o),e("overlayTex",r);let a=s.seed||1,u=s.density!==void 0?s.density:.5,c=a*1e3+42;await z(p,{width:t,height:o,seed:c,density:.001+u*.004,kink:5+c%45,stride:.5,strideDeviation:.25,duration:8+c%8,behavior:"unruly",flowFreq:4,lineWidth:Math.max(1,t/400),colorFn:l=>({r:Math.floor(l.float()*30),g:Math.floor(l.float()*30),b:Math.floor(l.float()*30),a:.666}),isCancelled:v,onProgress:l=>e("overlayTex",l)})}},h=new H;var B={strayHairBlend:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D overlayTex;
uniform float alpha;

uniform ivec2 tileOffset;
uniform ivec2 fullResolution;
uniform float renderScale;

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 baseSize = textureSize(inputTex, 0);
    ivec2 overlaySize = textureSize(overlayTex, 0);
    
    vec4 base = texelFetch(inputTex, clamp(coord, ivec2(0), baseSize - 1), 0);
    vec4 overlay = texelFetch(overlayTex, clamp(coord, ivec2(0), overlaySize - 1), 0);

    float a = overlay.a * alpha;
    vec3 result = base.rgb * (1.0 - a) + overlay.rgb * a;
    fragColor = vec4(result, base.a);
}`,wgsl:`// binding(0) deliberately unused \u2014 sampler declared previously was dead
// (only textureLoad is used below, which doesn't need a sampler).
@group(0) @binding(1) var inputTex : texture_2d<f32>;
@group(0) @binding(2) var overlayTex : texture_2d<f32>;
@group(0) @binding(3) var<uniform> alpha : f32;

@fragment
fn main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
    let coord = vec2<i32>(i32(pos.x), i32(pos.y));
    let base = textureLoad(inputTex, coord, 0);
    let overlay = textureLoad(overlayTex, coord, 0);

    let a = overlay.a * alpha;
    let result = base.rgb * (1.0 - a) + overlay.rgb * a;
    return vec4<f32>(result, base.a);
}
`}},E=`# strayHair

Stray hair overlay

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| density | float | 0.5 | 0-1 | Hair density |
| seed | int | 1 | 1-100 | Random seed |
| alpha | float | 0.5 | 0-1 | Overlay opacity |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .strayHair()
  .write(o0)

render(o0)
\`\`\`
`;if(h&&Object.keys(B).length>0){h.shaders||(h.shaders={});for(let[n,e]of Object.entries(B))h.shaders[n]={...e}}h&&E&&(h.help=E);var oe="filter/strayHair",se="filter",re="strayHair",ae=h;export{ae as default,oe as effectId,re as effectName,E as help,se as namespace};
