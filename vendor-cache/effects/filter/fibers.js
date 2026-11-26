/* filter/fibers */
var C=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.textures3d&&(this.textures3d=t.textures3d),t.shaders&&(this.shaders=t.shaders),t.externalTexture&&(this.externalTexture=t.externalTexture),t.externalMesh&&(this.externalMesh=t.externalMesh),t.builtinMeshes&&(this.builtinMeshes=t.builtinMeshes),t.outputTex&&(this.outputTex=t.outputTex),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.outputXyz&&(this.outputXyz=t.outputXyz),t.outputVel&&(this.outputVel=t.outputVel),t.outputRgba&&(this.outputRgba=t.outputRgba),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var I=Math.PI*2,F=class{constructor(t){this.state=(t>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let t=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(t>>>22^t)>>>0}float(){return this.next()/4294967295}int(t,e){return t+this.next()%(e-t+1)}normal(t=0,e=1){let r=Math.max(this.float(),1e-10),o=this.float();return t+e*Math.sqrt(-2*Math.log(r))*Math.cos(I*o)}};function J(s,t,e,r){let o=Math.ceil(e)+2,x=Math.ceil(e)+2,n=new Float32Array(o*x);for(let i=0;i<n.length;i++)n[i]=r.float();let p=new Float32Array(s*t);for(let i=0;i<t;i++)for(let y=0;y<s;y++){let m=y/s*e,d=i/t*e,u=Math.floor(m),a=Math.floor(d),v=m-u,h=d-a,l=v*v*(3-2*v),T=h*h*(3-2*h),w=n[a*o+u],A=n[a*o+u+1],P=n[(a+1)*o+u],g=n[(a+1)*o+u+1];p[i*s+y]=(w*(1-l)+A*l)*(1-T)+(P*(1-l)+g*l)*T}return p}async function S(s,t){let{width:e,height:r,seed:o,density:x,kink:n,stride:p,strideDeviation:i,duration:y,behavior:m,flowFreq:d,colorFn:u,lineWidth:a,isCancelled:v,onProgress:h}=t,l=new F(o),T=Math.min(e,r),w=Math.max(e,r),A=w/1024,P=J(e,r,d,new F(o*31337)),g=Math.max(1,Math.floor(w*x)),R=l.float()*I,k=[];for(let f=0;f<g;f++)k.push({x:l.float()*e,y:l.float()*r,stride:l.normal(p,i)*A,rot:m==="obedient"?R:l.float()*I,color:u(l,f)});let U=Math.max(1,Math.floor(Math.sqrt(T)*y));s.lineCap="round",s.lineJoin="round",s.lineWidth=a;for(let f=0;f<g;f++){if(v())return;let b=k[f],{r:j,g:G,b:X,a:$}=b.color,D=b.x,O=b.y;for(let M=0;M<U;M++){let z=U>1?M/(U-1):1,q=1-Math.abs(1-z*2),H=Math.floor((D%e+e)%e),Y=Math.floor((O%r+r)%r),_=P[Y*e+H]*I*n;m==="obedient"?_+=R:_+=b.rot;let B=D+Math.sin(_)*b.stride,E=O+Math.cos(_)*b.stride;s.strokeStyle=`rgba(${j}, ${G}, ${X}, ${$*q})`,s.beginPath(),s.moveTo(D,O),s.lineTo(B,E),s.stroke(),D=B,O=E}f%3===0&&(await new Promise(M=>setTimeout(M,0)),h&&h(s.canvas))}h&&h(s.canvas)}var L=class extends C{constructor(){super({name:"Fibers",namespace:"filter",func:"fibers",tags:["noise"],description:"Chaotic fiber texture overlay",globals:{density:{type:"float",default:.5,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},defaultProgram:`search filter, synth

solid(color: #000000)
.fibers(density: 1)
.write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"fibersBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:t,width:e,height:r,params:o,isCancelled:x}){let n=document.createElement("canvas");n.width=e,n.height=r;let p=n.getContext("2d",{willReadFrequently:!0});p.clearRect(0,0,e,r),t("overlayTex",n);let i=o.seed||1,m=.5+(o.density!==void 0?o.density:.5)*2;for(let d=0;d<4;d++){if(x())return;let u=i*1e3+d*137;await S(p,{width:e,height:r,seed:u,density:m,kink:5+u%5,stride:.75,strideDeviation:.125,duration:1,behavior:"chaotic",flowFreq:4,lineWidth:Math.max(1.5,e/384),colorFn:a=>({r:Math.floor(a.float()*200+55),g:Math.floor(a.float()*200+55),b:Math.floor(a.float()*200+55),a:.5}),isCancelled:x,onProgress:a=>t("overlayTex",a)})}}},c=new L;var V={fibersBlend:{glsl:`#version 300 es
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
`}},W=`# fibers

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
`;if(c&&Object.keys(V).length>0){c.shaders||(c.shaders={});for(let[s,t]of Object.entries(V))c.shaders[s]={...t}}c&&W&&(c.help=W);var rt="filter/fibers",ot="filter",nt="fibers",at=c;export{at as default,rt as effectId,nt as effectName,W as help,ot as namespace};
