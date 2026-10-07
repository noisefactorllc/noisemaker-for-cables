/* filter/fibers */
var C=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.textures3d&&(this.textures3d=e.textures3d),e.shaders&&(this.shaders=e.shaders),e.externalTexture&&(this.externalTexture=e.externalTexture),e.externalMesh&&(this.externalMesh=e.externalMesh),e.builtinMeshes&&(this.builtinMeshes=e.builtinMeshes),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var I=Math.PI*2,F=class{constructor(e){this.state=(e>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let e=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(e>>>22^e)>>>0}float(){return this.next()/4294967295}int(e,t){return e+this.next()%(t-e+1)}normal(e=0,t=1){let n=Math.max(this.float(),1e-10),r=this.float();return e+t*Math.sqrt(-2*Math.log(n))*Math.cos(I*r)}};function X(s,e,t,n){let r=Math.ceil(t)+2,x=Math.ceil(t)+2,o=new Float32Array(r*x);for(let i=0;i<o.length;i++)o[i]=n.float();let p=new Float32Array(s*e);for(let i=0;i<e;i++)for(let y=0;y<s;y++){let m=y/s*t,d=i/e*t,u=Math.floor(m),a=Math.floor(d),v=m-u,c=d-a,l=v*v*(3-2*v),T=c*c*(3-2*c),g=o[a*r+u],A=o[a*r+u+1],P=o[(a+1)*r+u],w=o[(a+1)*r+u+1];p[i*s+y]=(g*(1-l)+A*l)*(1-T)+(P*(1-l)+w*l)*T}return p}async function S(s,e){let{width:t,height:n,seed:r,density:x,kink:o,stride:p,strideDeviation:i,duration:y,behavior:m,flowFreq:d,colorFn:u,lineWidth:a,isCancelled:v,onProgress:c}=e,l=new F(r),T=Math.min(t,n),g=Math.max(t,n),A=g/1024,P=X(t,n,d,new F(r*31337)),w=Math.max(1,Math.floor(g*x)),k=l.float()*I,R=[];for(let f=0;f<w;f++)R.push({x:l.float()*t,y:l.float()*n,stride:l.normal(p,i)*A,rot:m==="obedient"?k:l.float()*I,color:u(l,f)});let U=Math.max(1,Math.floor(Math.sqrt(T)*y));s.lineCap="round",s.lineJoin="round",s.lineWidth=a;for(let f=0;f<w;f++){if(v())return;let b=R[f],{r:G,g:$,b:q,a:H}=b.color,D=b.x,O=b.y;for(let M=0;M<U;M++){let V=U>1?M/(U-1):1,Y=1-Math.abs(1-V*2),J=Math.floor((D%t+t)%t),N=Math.floor((O%n+n)%n),_=P[N*t+J]*I*o;m==="obedient"?_+=k:_+=b.rot;let B=D+Math.sin(_)*b.stride,E=O+Math.cos(_)*b.stride;s.strokeStyle=`rgba(${G}, ${$}, ${q}, ${H*Y})`,s.beginPath(),s.moveTo(D,O),s.lineTo(B,E),s.stroke(),D=B,O=E}f%3===0&&(await new Promise(M=>setTimeout(M,0)),c&&c(s.canvas))}c&&c(s.canvas)}var L=class extends C{constructor(){super({name:"Fibers",namespace:"filter",func:"fibers",tags:["noise"],description:"Chaotic fiber texture overlay",globals:{density:{type:"float",default:.5,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},defaultProgram:`search filter, synth

solid(color: #000000)
.fibers(density: 1)
.write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"fibersBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:e,width:t,height:n,params:r,isCancelled:x}){let o=document.createElement("canvas");o.width=t,o.height=n;let p=o.getContext("2d",{willReadFrequently:!0});p.clearRect(0,0,t,n),e("overlayTex",o);let i=r.seed||1,m=.5+(r.density!==void 0?r.density:.5)*2;for(let d=0;d<4;d++){if(x())return;let u=i*1e3+d*137;await S(p,{width:t,height:n,seed:u,density:m,kink:5+u%5,stride:.75,strideDeviation:.125,duration:1,behavior:"chaotic",flowFreq:4,lineWidth:Math.max(1.5,t/384),colorFn:a=>({r:Math.floor(a.float()*200+55),g:Math.floor(a.float()*200+55),b:Math.floor(a.float()*200+55),a:.5}),isCancelled:x,onProgress:a=>e("overlayTex",a)})}}},h=new L;var W={fibersBlend:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D overlayTex;
uniform float alpha;

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 base = texelFetch(inputTex, coord, 0);
    vec4 overlay = texelFetch(overlayTex, coord, 0);

    float a = overlay.a * alpha;
    vec3 result = base.rgb * (1.0 - a) + overlay.rgb * a;
    fragColor = vec4(result, base.a);
}
`,wgsl:`// binding(0) deliberately unused \u2014 sampler declared previously was dead
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
`}},j=`# fibers

Chaotic fiber texture overlay

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| density | float | 0.5 | 0-1 | Fiber density |
| seed | int | 1 | 1-100 | Random seed |
| alpha | float | 0.5 | 0-1 | Opacity |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .fibers()
  .write(o0)

render(o0)
\`\`\`
`;if(h&&Object.keys(W).length>0){h.shaders||(h.shaders={});for(let[s,e]of Object.entries(W))h.shaders[s]={...e}}h&&j&&(h.help=j);var ne="filter/fibers",re="filter",oe="fibers",ae=h;export{ae as default,ne as effectId,oe as effectName,j as help,re as namespace};
