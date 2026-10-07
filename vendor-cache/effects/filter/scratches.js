/* filter/scratches */
var F=class{constructor(e={}){this.state={},this.uniforms={},e.name&&(this.name=e.name),e.namespace&&(this.namespace=e.namespace),e.func&&(this.func=e.func),e.description&&(this.description=e.description),e.tags&&(this.tags=e.tags),e.globals&&(this.globals=e.globals),e.passes&&(this.passes=e.passes),e.textures&&(this.textures=e.textures),e.textures3d&&(this.textures3d=e.textures3d),e.shaders&&(this.shaders=e.shaders),e.externalTexture&&(this.externalTexture=e.externalTexture),e.externalMesh&&(this.externalMesh=e.externalMesh),e.builtinMeshes&&(this.builtinMeshes=e.builtinMeshes),e.outputTex3d&&(this.outputTex3d=e.outputTex3d),e.outputGeo&&(this.outputGeo=e.outputGeo),e.uniformLayout&&(this.uniformLayout=e.uniformLayout),e.uniformLayouts&&(this.uniformLayouts=e.uniformLayouts),e.paramAliases&&(this.paramAliases=e.paramAliases),e.openCategories&&(this.openCategories=e.openCategories),e.defaultProgram&&(this.defaultProgram=e.defaultProgram),e.hidden&&(this.hidden=!0),e.deprecatedBy&&(this.deprecatedBy=e.deprecatedBy),e.onInit&&(this._configOnInit=e.onInit),e.onUpdate&&(this._configOnUpdate=e.onUpdate),e.onDestroy&&(this._configOnDestroy=e.onDestroy),e.asyncInit&&(this._configAsyncInit=e.asyncInit)}onInit(){this._configOnInit&&this._configOnInit.call(this)}onUpdate(e){return this._configOnUpdate?this._configOnUpdate.call(this,e):{}}onDestroy(){this._configOnDestroy&&this._configOnDestroy.call(this)}asyncInit(e){return this._configAsyncInit?this._configAsyncInit.call(this,e):Promise.resolve()}};var I=Math.PI*2,C=class{constructor(e){this.state=(e>>>0)*747796405+2891336453>>>0}next(){this.state=this.state*747796405+2891336453>>>0;let e=(this.state>>>(this.state>>>28)+4^this.state)*277803737>>>0;return(e>>>22^e)>>>0}float(){return this.next()/4294967295}int(e,t){return e+this.next()%(t-e+1)}normal(e=0,t=1){let n=Math.max(this.float(),1e-10),r=this.float();return e+t*Math.sqrt(-2*Math.log(n))*Math.cos(I*r)}};function X(s,e,t,n){let r=Math.ceil(t)+2,x=Math.ceil(t)+2,o=new Float32Array(r*x);for(let a=0;a<o.length;a++)o[a]=n.float();let m=new Float32Array(s*e);for(let a=0;a<e;a++)for(let d=0;d<s;d++){let c=d/s*t,l=a/e*t,h=Math.floor(c),u=Math.floor(l),v=c-h,f=l-u,i=v*v*(3-2*v),M=f*f*(3-2*f),T=o[u*r+h],A=o[u*r+h+1],P=o[(u+1)*r+h],w=o[(u+1)*r+h+1];m[a*s+d]=(T*(1-i)+A*i)*(1-M)+(P*(1-i)+w*i)*M}return m}async function E(s,e){let{width:t,height:n,seed:r,density:x,kink:o,stride:m,strideDeviation:a,duration:d,behavior:c,flowFreq:l,colorFn:h,lineWidth:u,isCancelled:v,onProgress:f}=e,i=new C(r),M=Math.min(t,n),T=Math.max(t,n),A=T/1024,P=X(t,n,l,new C(r*31337)),w=Math.max(1,Math.floor(T*x)),L=i.float()*I,k=[];for(let p=0;p<w;p++)k.push({x:i.float()*t,y:i.float()*n,stride:i.normal(m,a)*A,rot:c==="obedient"?L:i.float()*I,color:h(i,p)});let S=Math.max(1,Math.floor(Math.sqrt(M)*d));s.lineCap="round",s.lineJoin="round",s.lineWidth=u;for(let p=0;p<w;p++){if(v())return;let b=k[p],{r:G,g:$,b:q,a:H}=b.color,D=b.x,O=b.y;for(let g=0;g<S;g++){let V=S>1?g/(S-1):1,Y=1-Math.abs(1-V*2),J=Math.floor((D%t+t)%t),N=Math.floor((O%n+n)%n),_=P[N*t+J]*I*o;c==="obedient"?_+=L:_+=b.rot;let R=D+Math.sin(_)*b.stride,B=O+Math.cos(_)*b.stride;s.strokeStyle=`rgba(${G}, ${$}, ${q}, ${H*Y})`,s.beginPath(),s.moveTo(D,O),s.lineTo(R,B),s.stroke(),D=R,O=B}p%3===0&&(await new Promise(g=>setTimeout(g,0)),f&&f(s.canvas))}f&&f(s.canvas)}var U=class extends F{constructor(){super({name:"Scratches",namespace:"filter",func:"scratches",tags:["noise"],description:"Film scratch overlay",globals:{density:{type:"float",default:.3,uniform:"density",min:0,max:1,step:.01,ui:{label:"density",control:"slider"}},alpha:{type:"float",default:.75,uniform:"alpha",min:0,max:1,step:.01,ui:{label:"alpha",control:"slider"}},seed:{type:"int",default:1,uniform:"seed",min:1,max:100,step:1,ui:{label:"seed",control:"slider"}}},defaultProgram:`search filter, synth

solid(color: #2b2b2b)
.scratches()
.write(o0)`,textures:{overlayTex:{width:"screen",height:"screen",format:"rgba8"}},passes:[{name:"blend",program:"scratchesBlend",inputs:{inputTex:"inputTex",overlayTex:"overlayTex"},uniforms:{alpha:"alpha"},outputs:{fragColor:"outputTex"}}]})}async asyncInit({updateTexture:e,width:t,height:n,params:r,isCancelled:x}){let o=document.createElement("canvas");o.width=t,o.height=n;let m=o.getContext("2d",{willReadFrequently:!0});m.clearRect(0,0,t,n),e("overlayTex",o);let a=r.seed||1,d=r.density!==void 0?r.density:.3;for(let c=0;c<4;c++){if(x())return;let l=a*1e3+c*251,h=l%2===0;await E(m,{width:t,height:n,seed:l,density:.1+d*.4,kink:.125+l%50/400,stride:.75,strideDeviation:.5,duration:2+l%3,behavior:h?"obedient":"unruly",flowFreq:2+l%3,lineWidth:Math.max(.5,t/1024),colorFn:()=>({r:255,g:255,b:255,a:1}),isCancelled:x,onProgress:u=>e("overlayTex",u)})}}},y=new U;var W={scratchesBlend:{glsl:`#version 300 es
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
`;if(y&&Object.keys(W).length>0){y.shaders||(y.shaders={});for(let[s,e]of Object.entries(W))y.shaders[s]={...e}}y&&j&&(y.help=j);var ne="filter/scratches",re="filter",oe="scratches",ae=y;export{ae as default,ne as effectId,oe as effectName,j as help,re as namespace};
