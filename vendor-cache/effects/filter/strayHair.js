/* filter/strayHair */
var C=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.textures3d&&(this.textures3d=e.textures3d),e.shaders&&(this.shaders=e.shaders),e.externalTexture&&(this.externalTexture=e.externalTexture),e.externalMesh&&(this.externalMesh=e.externalMesh),e.builtinMeshes&&(this.builtinMeshes=e.builtinMeshes),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var I=Math.PI*2,S=class{constructor(e){this.state=(e>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let e=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(e>>>22^e)>>>0}float(){return this.next()/4294967295}int(e,t){return e+this.next()%(t-e+1)}normal(e=0,t=1){let r=Math.max(this.float(),1e-10),n=this.float();return e+t*Math.sqrt(-2*Math.log(r))*Math.cos(I*n)}};function N(s,e,t,r){let n=Math.ceil(t)+2,v=Math.ceil(t)+2,a=new Float32Array(n*v);for(let o=0;o<a.length;o++)a[o]=r.float();let p=new Float32Array(s*e);for(let o=0;o<e;o++)for(let d=0;d<s;d++){let u=d/s*t,l=o/e*t,y=Math.floor(u),m=Math.floor(l),b=u-y,c=l-m,i=b*b*(3-2*b),T=c*c*(3-2*c),g=a[m*n+y],F=a[m*n+y+1],A=a[(m+1)*n+y],w=a[(m+1)*n+y+1];p[o*s+d]=(g*(1-i)+F*i)*(1-T)+(A*(1-i)+w*i)*T}return p}async function z(s,e){let{width:t,height:r,seed:n,density:v,kink:a,stride:p,strideDeviation:o,duration:d,behavior:u,flowFreq:l,colorFn:y,lineWidth:m,isCancelled:b,onProgress:c}=e,i=new S(n),T=Math.min(t,r),g=Math.max(t,r),F=g/1024,A=N(t,r,l,new S(n*31337)),w=Math.max(1,Math.floor(g*v)),U=i.float()*I,L=[];for(let h=0;h<w;h++)L.push({x:i.float()*t,y:i.float()*r,stride:i.normal(p,o)*F,rot:u==="obedient"?U:i.float()*I,color:y(i,h)});let P=Math.max(1,Math.floor(Math.sqrt(T)*d));s.lineCap="round",s.lineJoin="round",s.lineWidth=m;for(let h=0;h<w;h++){if(b())return;let x=L[h],{r:W,g:j,b:G,a:$}=x.color,O=x.x,D=x.y;for(let M=0;M<P;M++){let q=P>1?M/(P-1):1,V=1-Math.abs(1-q*2),Y=Math.floor((O%t+t)%t),J=Math.floor((D%r+r)%r),_=A[J*t+Y]*I*a;u==="obedient"?_+=U:_+=x.rot;let k=O+Math.sin(_)*x.stride,R=D+Math.cos(_)*x.stride;s.strokeStyle=`rgba(${W}, ${j}, ${G}, ${$*V})`,s.beginPath(),s.moveTo(O,D),s.lineTo(k,R),s.stroke(),O=k,D=R}h%3===0&&(await new Promise(M=>setTimeout(M,0)),c&&c(s.canvas))}c&&c(s.canvas)}var H=class extends C{constructor(){super({name:"Stray Hair",namespace:"filter",func:"strayHair",tags:["noise"],description:"Stray hair overlay",globals:{density:{type:"float",default:.5,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},defaultProgram:`search filter, synth

perlin(scale: 100)
  .strayHair(density: 1, alpha: 1)
  .write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"strayHairBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:e,width:t,height:r,params:n,isCancelled:v}){let a=document.createElement("canvas");a.width=t,a.height=r;let p=a.getContext("2d",{willReadFrequently:!0});p.clearRect(0,0,t,r),e("overlayTex",a);let o=n.seed||1,d=n.density!==void 0?n.density:.5,u=o*1e3+42;await z(p,{width:t,height:r,seed:u,density:.001+d*.004,kink:5+u%45,stride:.5,strideDeviation:.25,duration:8+u%8,behavior:"unruly",flowFreq:4,lineWidth:Math.max(1,t/400),colorFn:l=>({r:Math.floor(l.float()*30),g:Math.floor(l.float()*30),b:Math.floor(l.float()*30),a:.666}),isCancelled:v,onProgress:l=>e("overlayTex",l)})}},f=new H;var B={strayHairBlend:{glsl:`#version 300 es
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
`;if(f&&Object.keys(B).length>0){f.shaders||(f.shaders={});for(let[s,e]of Object.entries(B))f.shaders[s]={...e}}f&&E&&(f.help=E);var re="filter/strayHair",ne="filter",ae="strayHair",oe=f;export{oe as default,re as effectId,ae as effectName,E as help,ne as namespace};
