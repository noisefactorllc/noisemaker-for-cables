/* filter/fibers */
var C=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var I=Math.PI*2,F=class{constructor(e){this.state=(e>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let e=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(e>>>22^e)>>>0}float(){return this.next()/4294967295}int(e,t){return e+this.next()%(t-e+1)}normal(e=0,t=1){let n=Math.max(this.float(),1e-10),s=this.float();return e+t*Math.sqrt(-2*Math.log(n))*Math.cos(I*s)}};function X(o,e,t,n){let s=Math.ceil(t)+2,x=Math.ceil(t)+2,r=new Float32Array(s*x);for(let i=0;i<r.length;i++)r[i]=n.float();let p=new Float32Array(o*e);for(let i=0;i<e;i++)for(let y=0;y<o;y++){let m=y/o*t,f=i/e*t,c=Math.floor(m),a=Math.floor(f),v=m-c,u=f-a,l=v*v*(3-2*v),M=u*u*(3-2*u),T=r[a*s+c],A=r[a*s+c+1],P=r[(a+1)*s+c],w=r[(a+1)*s+c+1];p[i*o+y]=(T*(1-l)+A*l)*(1-M)+(P*(1-l)+w*l)*M}return p}async function S(o,e){let{width:t,height:n,seed:s,density:x,kink:r,stride:p,strideDeviation:i,duration:y,behavior:m,flowFreq:f,colorFn:c,lineWidth:a,isCancelled:v,onProgress:u}=e,l=new F(s),M=Math.min(t,n),T=Math.max(t,n),A=T/1024,P=X(t,n,f,new F(s*31337)),w=Math.max(1,Math.floor(T*x)),k=l.float()*I,B=[];for(let d=0;d<w;d++)B.push({x:l.float()*t,y:l.float()*n,stride:l.normal(p,i)*A,rot:m==="obedient"?k:l.float()*I,color:c(l,d)});let U=Math.max(1,Math.floor(Math.sqrt(M)*y));o.lineCap="round",o.lineJoin="round",o.lineWidth=a;for(let d=0;d<w;d++){if(v())return;let b=B[d],{r:G,g:$,b:H,a:V}=b.color,D=b.x,O=b.y;for(let g=0;g<U;g++){let Y=U>1?g/(U-1):1,q=1-Math.abs(1-Y*2),J=Math.floor((D%t+t)%t),N=Math.floor((O%n+n)%n),_=P[N*t+J]*I*r;m==="obedient"?_+=k:_+=b.rot;let R=D+Math.sin(_)*b.stride,E=O+Math.cos(_)*b.stride;o.strokeStyle=`rgba(${G}, ${$}, ${H}, ${V*q})`,o.beginPath(),o.moveTo(D,O),o.lineTo(R,E),o.stroke(),D=R,O=E}d%3===0&&(await new Promise(g=>setTimeout(g,0)),u&&u(o.canvas))}u&&u(o.canvas)}var L=class extends C{constructor(){super({name:"Fibers",namespace:"filter",func:"fibers",tags:["noise"],description:"Chaotic fiber texture overlay",globals:{density:{type:"float",default:.5,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},defaultProgram:`search filter, synth

solid(color: #000000)
.fibers(density: 1)
.write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"fibersBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:e,width:t,height:n,params:s,isCancelled:x}){let r=document.createElement("canvas");r.width=t,r.height=n;let p=r.getContext("2d");p.clearRect(0,0,t,n),e("overlayTex",r);let i=s.seed||1,m=.5+(s.density!==void 0?s.density:.5)*2;for(let f=0;f<4;f++){if(x())return;let c=i*1e3+f*137;await S(p,{width:t,height:n,seed:c,density:m,kink:5+c%5,stride:.75,strideDeviation:.125,duration:1,behavior:"chaotic",flowFreq:4,lineWidth:Math.max(1.5,t/384),colorFn:a=>({r:Math.floor(a.float()*200+55),g:Math.floor(a.float()*200+55),b:Math.floor(a.float()*200+55),a:.5}),isCancelled:x,onProgress:a=>e("overlayTex",a)})}}},h=new L;var W={fibersBlend:{glsl:`#version 300 es
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
`;if(h&&Object.keys(W).length>0){h.shaders||(h.shaders={});for(let[o,e]of Object.entries(W))h.shaders[o]={...e}}h&&j&&(h.help=j);var ne="filter/fibers",se="filter",re="fibers",ae=h;export{ae as default,ne as effectId,re as effectName,j as help,se as namespace};
