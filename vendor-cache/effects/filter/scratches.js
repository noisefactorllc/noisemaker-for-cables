/* filter/scratches */
var F=class{constructor(t={}){this.state={},this.uniforms={},t.name&&(this.name=t.name),t.namespace&&(this.namespace=t.namespace),t.func&&(this.func=t.func),t.description&&(this.description=t.description),t.tags&&(this.tags=t.tags),t.globals&&(this.globals=t.globals),t.passes&&(this.passes=t.passes),t.textures&&(this.textures=t.textures),t.textures3d&&(this.textures3d=t.textures3d),t.shaders&&(this.shaders=t.shaders),t.externalTexture&&(this.externalTexture=t.externalTexture),t.externalMesh&&(this.externalMesh=t.externalMesh),t.builtinMeshes&&(this.builtinMeshes=t.builtinMeshes),t.outputTex&&(this.outputTex=t.outputTex),t.outputTex3d&&(this.outputTex3d=t.outputTex3d),t.outputGeo&&(this.outputGeo=t.outputGeo),t.outputXyz&&(this.outputXyz=t.outputXyz),t.outputVel&&(this.outputVel=t.outputVel),t.outputRgba&&(this.outputRgba=t.outputRgba),t.uniformLayout&&(this.uniformLayout=t.uniformLayout),t.uniformLayouts&&(this.uniformLayouts=t.uniformLayouts),t.paramAliases&&(this.paramAliases=t.paramAliases),t.openCategories&&(this.openCategories=t.openCategories),t.defaultProgram&&(this.defaultProgram=t.defaultProgram),t.hidden&&(this.hidden=!0),t.deprecatedBy&&(this.deprecatedBy=t.deprecatedBy),t.onInit&&(this._configOnInit=t.onInit),t.onUpdate&&(this._configOnUpdate=t.onUpdate),t.onDestroy&&(this._configOnDestroy=t.onDestroy),t.asyncInit&&(this._configAsyncInit=t.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(t){return this._configOnUpdate?this._configOnUpdate.call(this,t):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(t){return this._configAsyncInit?this._configAsyncInit.call(this,t):Promise.resolve()}};var I=Math.PI*2,C=class{constructor(t){this.state=(t>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let t=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(t>>>22^t)>>>0}float(){return this.next()/4294967295}int(t,e){return t+this.next()%(e-t+1)}normal(t=0,e=1){let r=Math.max(this.float(),1e-10),n=this.float();return t+e*Math.sqrt(-2*Math.log(r))*Math.cos(I*n)}};function J(s,t,e,r){let n=Math.ceil(e)+2,x=Math.ceil(e)+2,o=new Float32Array(n*x);for(let a=0;a<o.length;a++)o[a]=r.float();let m=new Float32Array(s*t);for(let a=0;a<t;a++)for(let d=0;d<s;d++){let u=d/s*e,l=a/t*e,c=Math.floor(u),h=Math.floor(l),v=u-c,p=l-h,i=v*v*(3-2*v),g=p*p*(3-2*p),M=o[h*n+c],A=o[h*n+c+1],P=o[(h+1)*n+c],w=o[(h+1)*n+c+1];m[a*s+d]=(M*(1-i)+A*i)*(1-g)+(P*(1-i)+w*i)*g}return m}async function E(s,t){let{width:e,height:r,seed:n,density:x,kink:o,stride:m,strideDeviation:a,duration:d,behavior:u,flowFreq:l,colorFn:c,lineWidth:h,isCancelled:v,onProgress:p}=t,i=new C(n),g=Math.min(e,r),M=Math.max(e,r),A=M/1024,P=J(e,r,l,new C(n*31337)),w=Math.max(1,Math.floor(M*x)),L=i.float()*I,R=[];for(let f=0;f<w;f++)R.push({x:i.float()*e,y:i.float()*r,stride:i.normal(m,a)*A,rot:u==="obedient"?L:i.float()*I,color:c(i,f)});let S=Math.max(1,Math.floor(Math.sqrt(g)*d));s.lineCap="round",s.lineJoin="round",s.lineWidth=h;for(let f=0;f<w;f++){if(v())return;let b=R[f],{r:j,g:G,b:X,a:$}=b.color,D=b.x,O=b.y;for(let T=0;T<S;T++){let z=S>1?T/(S-1):1,q=1-Math.abs(1-z*2),H=Math.floor((D%e+e)%e),Y=Math.floor((O%r+r)%r),_=P[Y*e+H]*I*o;u==="obedient"?_+=L:_+=b.rot;let k=D+Math.sin(_)*b.stride,B=O+Math.cos(_)*b.stride;s.strokeStyle=`rgba(${j}, ${G}, ${X}, ${$*q})`,s.beginPath(),s.moveTo(D,O),s.lineTo(k,B),s.stroke(),D=k,O=B}f%3===0&&(await new Promise(T=>setTimeout(T,0)),p&&p(s.canvas))}p&&p(s.canvas)}var U=class extends F{constructor(){super({name:"Scratches",namespace:"filter",func:"scratches",tags:["noise"],description:"Film scratch overlay",globals:{density:{type:"float",default:.3,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},alpha:{type:"float",default:.75,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}}},defaultProgram:`search filter, synth

solid(color: #2b2b2b)
.scratches()
.write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"scratchesBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:t,width:e,height:r,params:n,isCancelled:x}){let o=document.createElement("canvas");o.width=e,o.height=r;let m=o.getContext("2d",{willReadFrequently:!0});m.clearRect(0,0,e,r),t("overlayTex",o);let a=n.seed||1,d=n.density!==void 0?n.density:.3;for(let u=0;u<4;u++){if(x())return;let l=a*1e3+u*251,c=l%2===0;await E(m,{width:e,height:r,seed:l,density:.1+d*.4,kink:.125+l%50/400,stride:.75,strideDeviation:.5,duration:2+l%3,behavior:c?"obedient":"unruly",flowFreq:2+l%3,lineWidth:Math.max(.5,e/1024),colorFn:()=>({r:255,g:255,b:255,a:1}),isCancelled:x,onProgress:h=>t("overlayTex",h)})}}},y=new U;var V={scratchesBlend:{glsl:`#version 300 es
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
`}},W=`# scratches

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
`;if(y&&Object.keys(V).length>0){y.shaders||(y.shaders={});for(let[s,t]of Object.entries(V))y.shaders[s]={...t}}y&&W&&(y.help=W);var rt="filter/scratches",nt="filter",ot="scratches",at=y;export{at as default,rt as effectId,ot as effectName,W as help,nt as namespace};
