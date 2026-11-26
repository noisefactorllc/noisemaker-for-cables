/* filter/strayHair */
var C=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.textures3d&&(this.textures3d=t.textures3d),t.shaders&&(this.shaders=t.shaders),t.externalTexture&&(this.externalTexture=t.externalTexture),t.externalMesh&&(this.externalMesh=t.externalMesh),t.builtinMeshes&&(this.builtinMeshes=t.builtinMeshes),t.outputTex&&(this.outputTex=t.outputTex),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.outputXyz&&(this.outputXyz=t.outputXyz),t.outputVel&&(this.outputVel=t.outputVel),t.outputRgba&&(this.outputRgba=t.outputRgba),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var I=Math.PI*2,S=class{constructor(t){this.state=(t>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let t=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(t>>>22^t)>>>0}float(){return this.next()/4294967295}int(t,e){return t+this.next()%(e-t+1)}normal(t=0,e=1){let r=Math.max(this.float(),1e-10),a=this.float();return t+e*Math.sqrt(-2*Math.log(r))*Math.cos(I*a)}};function J(s,t,e,r){let a=Math.ceil(e)+2,v=Math.ceil(e)+2,n=new Float32Array(a*v);for(let o=0;o<n.length;o++)n[o]=r.float();let p=new Float32Array(s*t);for(let o=0;o<t;o++)for(let d=0;d<s;d++){let u=d/s*e,l=o/t*e,y=Math.floor(u),m=Math.floor(l),b=u-y,h=l-m,i=b*b*(3-2*b),M=h*h*(3-2*h),w=n[m*a+y],F=n[m*a+y+1],A=n[(m+1)*a+y],g=n[(m+1)*a+y+1];p[o*s+d]=(w*(1-i)+F*i)*(1-M)+(A*(1-i)+g*i)*M}return p}async function z(s,t){let{width:e,height:r,seed:a,density:v,kink:n,stride:p,strideDeviation:o,duration:d,behavior:u,flowFreq:l,colorFn:y,lineWidth:m,isCancelled:b,onProgress:h}=t,i=new S(a),M=Math.min(e,r),w=Math.max(e,r),F=w/1024,A=J(e,r,l,new S(a*31337)),g=Math.max(1,Math.floor(w*v)),R=i.float()*I,U=[];for(let c=0;c<g;c++)U.push({x:i.float()*e,y:i.float()*r,stride:i.normal(p,o)*F,rot:u==="obedient"?R:i.float()*I,color:y(i,c)});let P=Math.max(1,Math.floor(Math.sqrt(M)*d));s.lineCap="round",s.lineJoin="round",s.lineWidth=m;for(let c=0;c<g;c++){if(b())return;let x=U[c],{r:V,g:W,b:j,a:G}=x.color,O=x.x,D=x.y;for(let T=0;T<P;T++){let X=P>1?T/(P-1):1,$=1-Math.abs(1-X*2),q=Math.floor((O%e+e)%e),Y=Math.floor((D%r+r)%r),_=A[Y*e+q]*I*n;u==="obedient"?_+=R:_+=x.rot;let L=O+Math.sin(_)*x.stride,k=D+Math.cos(_)*x.stride;s.strokeStyle=`rgba(${V}, ${W}, ${j}, ${G*$})`,s.beginPath(),s.moveTo(O,D),s.lineTo(L,k),s.stroke(),O=L,D=k}c%3===0&&(await new Promise(T=>setTimeout(T,0)),h&&h(s.canvas))}h&&h(s.canvas)}var H=class extends C{constructor(){super({name:"Stray Hair",namespace:"filter",func:"strayHair",tags:["noise"],description:"Stray hair overlay",globals:{density:{type:"float",default:.5,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}},alpha:{type:"float",default:.5,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}}},defaultProgram:`search filter, synth

perlin(scale: 100)
  .strayHair(density: 1, alpha: 1)
  .write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"strayHairBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:t,width:e,height:r,params:a,isCancelled:v}){let n=document.createElement("canvas");n.width=e,n.height=r;let p=n.getContext("2d",{willReadFrequently:!0});p.clearRect(0,0,e,r),t("overlayTex",n);let o=a.seed||1,d=a.density!==void 0?a.density:.5,u=o*1e3+42;await z(p,{width:e,height:r,seed:u,density:.001+d*.004,kink:5+u%45,stride:.5,strideDeviation:.25,duration:8+u%8,behavior:"unruly",flowFreq:4,lineWidth:Math.max(1,e/400),colorFn:l=>({r:Math.floor(l.float()*30),g:Math.floor(l.float()*30),b:Math.floor(l.float()*30),a:.666}),isCancelled:v,onProgress:l=>t("overlayTex",l)})}},f=new H;var B={strayHairBlend:{glsl:`#version 300 es
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
`;if(f&&Object.keys(B).length>0){f.shaders||(f.shaders={});for(let[s,t]of Object.entries(B))f.shaders[s]={...t}}f&&E&&(f.help=E);var rt="filter/strayHair",at="filter",nt="strayHair",ot=f;export{ot as default,rt as effectId,nt as effectName,E as help,at as namespace};
