/* filter/scratches */
var I=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var C=Math.PI*2,F=class{constructor(t){this.state=(t>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let t=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(t>>>22^t)>>>0}float(){return this.next()/4294967295}int(t,e){return t+this.next()%(e-t+1)}normal(t=0,e=1){let n=Math.max(this.float(),1e-10),o=this.float();return t+e*Math.sqrt(-2*Math.log(n))*Math.cos(C*o)}};function X(s,t,e,n){let o=Math.ceil(e)+2,x=Math.ceil(e)+2,r=new Float32Array(o*x);for(let a=0;a<r.length;a++)r[a]=n.float();let m=new Float32Array(s*t);for(let a=0;a<t;a++)for(let h=0;h<s;h++){let c=h/s*e,l=a/t*e,u=Math.floor(c),d=Math.floor(l),v=c-u,f=l-d,i=v*v*(3-2*v),T=f*f*(3-2*f),w=r[d*o+u],A=r[d*o+u+1],P=r[(d+1)*o+u],M=r[(d+1)*o+u+1];m[a*s+h]=(w*(1-i)+A*i)*(1-T)+(P*(1-i)+M*i)*T}return m}async function E(s,t){let{width:e,height:n,seed:o,density:x,kink:r,stride:m,strideDeviation:a,duration:h,behavior:c,flowFreq:l,colorFn:u,lineWidth:d,isCancelled:v,onProgress:f}=t,i=new F(o),T=Math.min(e,n),w=Math.max(e,n),A=w/1024,P=X(e,n,l,new F(o*31337)),M=Math.max(1,Math.floor(w*x)),L=i.float()*C,k=[];for(let p=0;p<M;p++)k.push({x:i.float()*e,y:i.float()*n,stride:i.normal(m,a)*A,rot:c==="obedient"?L:i.float()*C,color:u(i,p)});let S=Math.max(1,Math.floor(Math.sqrt(T)*h));s.lineCap="round",s.lineJoin="round",s.lineWidth=d;for(let p=0;p<M;p++){if(v())return;let b=k[p],{r:G,g:$,b:H,a:V}=b.color,D=b.x,O=b.y;for(let g=0;g<S;g++){let Y=S>1?g/(S-1):1,q=1-Math.abs(1-Y*2),J=Math.floor((D%e+e)%e),N=Math.floor((O%n+n)%n),_=P[N*e+J]*C*r;c==="obedient"?_+=L:_+=b.rot;let B=D+Math.sin(_)*b.stride,R=O+Math.cos(_)*b.stride;s.strokeStyle=`rgba(${G}, ${$}, ${H}, ${V*q})`,s.beginPath(),s.moveTo(D,O),s.lineTo(B,R),s.stroke(),D=B,O=R}p%3===0&&(await new Promise(g=>setTimeout(g,0)),f&&f(s.canvas))}f&&f(s.canvas)}var U=class extends I{constructor(){super({name:"Scratches",namespace:"filter",func:"scratches",tags:["noise"],description:"Film scratch overlay",globals:{density:{type:"float",default:.3,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},alpha:{type:"float",default:.75,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}}},defaultProgram:`search filter, synth

solid(color: #2b2b2b)
.scratches()
.write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"scratchesBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:t,width:e,height:n,params:o,isCancelled:x}){let r=document.createElement("canvas");r.width=e,r.height=n;let m=r.getContext("2d");m.clearRect(0,0,e,n),t("overlayTex",r);let a=o.seed||1,h=o.density!==void 0?o.density:.3;for(let c=0;c<4;c++){if(x())return;let l=a*1e3+c*251,u=l%2===0;await E(m,{width:e,height:n,seed:l,density:.1+h*.4,kink:.125+l%50/400,stride:.75,strideDeviation:.5,duration:2+l%3,behavior:u?"obedient":"unruly",flowFreq:2+l%3,lineWidth:Math.max(.5,e/1024),colorFn:()=>({r:255,g:255,b:255,a:1}),isCancelled:x,onProgress:d=>t("overlayTex",d)})}}},y=new U;var W={scratchesBlend:{glsl:`#version 300 es
precision highp float;

uniform sampler2D inputTex;
uniform sampler2D overlayTex;
uniform float alpha;

out vec4 fragColor;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 base = texelFetch(inputTex, coord, 0);
    vec4 overlay = texelFetch(overlayTex, coord, 0);

    // Scratches use max-blend: bright white lines over image
    float scratchStrength = overlay.a * alpha;
    vec3 result = max(base.rgb, vec3(scratchStrength));
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

    let scratchStrength = overlay.a * alpha;
    let result = max(base.rgb, vec3<f32>(scratchStrength));
    return vec4<f32>(result, base.a);
}
`}},j=`# scratches

Film scratch overlay

## Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| density | float | 0.3 | 0-1 | Scratch density |
| alpha | float | 0.75 | 0-1 | Scratch opacity |
| seed | int | 1 | 1-100 | Random seed |

## Usage

\`\`\`
search filter, synth

noise(seed: 1, ridges: true)
  .scratches()
  .write(o0)

render(o0)
\`\`\`
`;if(y&&Object.keys(W).length>0){y.shaders||(y.shaders={});for(let[s,t]of Object.entries(W))y.shaders[s]={...t}}y&&j&&(y.help=j);var nt="filter/scratches",ot="filter",rt="scratches",at=y;export{at as default,nt as effectId,rt as effectName,j as help,ot as namespace};
