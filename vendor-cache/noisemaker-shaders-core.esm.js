/**
 * Noisemaker Shaders - Core Runtime
 * Includes: CanvasRenderer + UIController + EffectSelect
 * Copyright (c) 2017-2026 Noise Factor LLC. https://noisefactor.io/
 * SPDX-License-Identifier: MIT
 * Build: 1a29d431
 * Date: 2026-07-14T19:47:07.486Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);

// shaders/src/runtime/obj-parser.js
var obj_parser_exports = {};
__export(obj_parser_exports, {
  loadOBJ: () => loadOBJ,
  packMeshDataForTextures: () => packMeshDataForTextures,
  parseOBJ: () => parseOBJ
});
function parseOBJ(objText) {
  const rawPositions = [];
  const rawNormals = [];
  const rawUVs = [];
  const positions = [];
  const normals = [];
  const uvs = [];
  const lines = objText.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const cmd = parts[0];
    switch (cmd) {
      case "v": {
        const x = parseFloat(parts[1]) || 0;
        const y = parseFloat(parts[2]) || 0;
        const z = parseFloat(parts[3]) || 0;
        rawPositions.push([x, y, z]);
        break;
      }
      case "vn": {
        const x = parseFloat(parts[1]) || 0;
        const y = parseFloat(parts[2]) || 0;
        const z = parseFloat(parts[3]) || 0;
        rawNormals.push([x, y, z]);
        break;
      }
      case "vt": {
        const u = parseFloat(parts[1]) || 0;
        const v = parseFloat(parts[2]) || 0;
        rawUVs.push([u, v]);
        break;
      }
      case "f": {
        const faceVerts = [];
        for (let i = 1; i < parts.length; i++) {
          const indices = parts[i].split("/");
          const vIdx = parseInt(indices[0], 10) - 1;
          const vtIdx = indices[1] ? parseInt(indices[1], 10) - 1 : -1;
          const vnIdx = indices[2] ? parseInt(indices[2], 10) - 1 : -1;
          faceVerts.push({ vIdx, vtIdx, vnIdx });
        }
        for (let i = 1; i < faceVerts.length - 1; i++) {
          const v0 = faceVerts[0];
          const v1 = faceVerts[i];
          const v2 = faceVerts[i + 1];
          addVertex(v0);
          addVertex(v2);
          addVertex(v1);
        }
        break;
      }
    }
  }
  function addVertex(v) {
    if (v.vIdx >= 0 && v.vIdx < rawPositions.length) {
      positions.push(...rawPositions[v.vIdx]);
    } else {
      positions.push(0, 0, 0);
    }
    if (v.vnIdx >= 0 && v.vnIdx < rawNormals.length) {
      normals.push(...rawNormals[v.vnIdx]);
    } else {
      normals.push(0, 0, 1);
    }
    if (v.vtIdx >= 0 && v.vtIdx < rawUVs.length) {
      uvs.push(...rawUVs[v.vtIdx]);
    } else {
      uvs.push(0, 0);
    }
  }
  const vertexCount = positions.length / 3;
  if (rawNormals.length === 0 && vertexCount > 0) {
    computeFaceNormals(positions, normals);
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    vertexCount
  };
}
function computeFaceNormals(positions, normals) {
  const vertexCount = positions.length / 3;
  const triangleCount = vertexCount / 3;
  const faceNormals = new Float32Array(triangleCount * 3);
  for (let tri = 0; tri < triangleCount; tri++) {
    const i0 = tri * 9;
    const i1 = i0 + 3;
    const i2 = i0 + 6;
    const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
    const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
    const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-4) {
      nx /= len;
      ny /= len;
      nz /= len;
    } else {
      nx = 0;
      ny = 0;
      nz = 1;
    }
    faceNormals[tri * 3] = nx;
    faceNormals[tri * 3 + 1] = ny;
    faceNormals[tri * 3 + 2] = nz;
  }
  const posToNormal = /* @__PURE__ */ new Map();
  const round = (v) => Math.round(v * 1e4) / 1e4;
  for (let v = 0; v < vertexCount; v++) {
    const px = positions[v * 3];
    const py = positions[v * 3 + 1];
    const pz = positions[v * 3 + 2];
    const key = `${round(px)},${round(py)},${round(pz)}`;
    const triIdx = Math.floor(v / 3);
    const fnx = faceNormals[triIdx * 3];
    const fny = faceNormals[triIdx * 3 + 1];
    const fnz = faceNormals[triIdx * 3 + 2];
    if (!posToNormal.has(key)) {
      posToNormal.set(key, { nx: 0, ny: 0, nz: 0, count: 0 });
    }
    const acc = posToNormal.get(key);
    acc.nx += fnx;
    acc.ny += fny;
    acc.nz += fnz;
    acc.count++;
  }
  for (const acc of posToNormal.values()) {
    const len = Math.sqrt(acc.nx * acc.nx + acc.ny * acc.ny + acc.nz * acc.nz);
    if (len > 1e-4) {
      acc.nx /= len;
      acc.ny /= len;
      acc.nz /= len;
    } else {
      acc.nx = 0;
      acc.ny = 0;
      acc.nz = 1;
    }
  }
  for (let v = 0; v < vertexCount; v++) {
    const px = positions[v * 3];
    const py = positions[v * 3 + 1];
    const pz = positions[v * 3 + 2];
    const key = `${round(px)},${round(py)},${round(pz)}`;
    const acc = posToNormal.get(key);
    normals[v * 3] = acc.nx;
    normals[v * 3 + 1] = acc.ny;
    normals[v * 3 + 2] = acc.nz;
  }
}
async function loadOBJ(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load OBJ: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  return parseOBJ(text);
}
function packMeshDataForTextures(positions, normals, uvs, texWidth, texHeight) {
  const maxVertices = texWidth * texHeight;
  const vertexCount = positions.length / 3;
  if (vertexCount > maxVertices) {
    console.warn(`[OBJ] Mesh has ${vertexCount} vertices, but texture can only hold ${maxVertices}. Truncating.`);
  }
  const usedVertices = Math.min(vertexCount, maxVertices);
  const pixelCount = texWidth * texHeight;
  const positionData = new Float32Array(pixelCount * 4);
  const normalData = new Float32Array(pixelCount * 4);
  const uvData = new Float32Array(pixelCount * 4);
  for (let i = 0; i < usedVertices; i++) {
    const pi = i * 4;
    const vi3 = i * 3;
    const vi2 = i * 2;
    positionData[pi] = positions[vi3];
    positionData[pi + 1] = positions[vi3 + 1];
    positionData[pi + 2] = positions[vi3 + 2];
    positionData[pi + 3] = 1;
    normalData[pi] = normals[vi3];
    normalData[pi + 1] = normals[vi3 + 1];
    normalData[pi + 2] = normals[vi3 + 2];
    normalData[pi + 3] = 0;
    uvData[pi] = uvs[vi2];
    uvData[pi + 1] = uvs[vi2 + 1];
    uvData[pi + 2] = 0;
    uvData[pi + 3] = 0;
  }
  for (let i = usedVertices; i < pixelCount; i++) {
    const pi = i * 4;
    positionData[pi + 3] = 0;
  }
  return {
    positionData,
    normalData,
    uvData,
    vertexCount: usedVertices
  };
}
var init_obj_parser = __esm({
  "shaders/src/runtime/obj-parser.js"() {
  }
});

// shaders/src/lang/lexer.js
var RESERVED_KEYWORDS = Object.freeze({
  let: "LET",
  render: "RENDER",
  write: "WRITE",
  write3d: "WRITE3D",
  true: "TRUE",
  false: "FALSE",
  if: "IF",
  elif: "ELIF",
  else: "ELSE",
  break: "BREAK",
  continue: "CONTINUE",
  return: "RETURN",
  search: "SEARCH",
  subchain: "SUBCHAIN"
});
function lex(src) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;
  function add(type, lexeme, line2, col2) {
    tokens.push({ type, lexeme, line: line2, col: col2 });
  }
  const isDigit = (c) => c >= "0" && c <= "9";
  const isLetter = (c) => c >= "a" && c <= "z" || c >= "A" && c <= "Z";
  const keywords = RESERVED_KEYWORDS;
  while (i < src.length) {
    let ch = src[i];
    if (ch === " " || ch === "	" || ch === "\r") {
      i++;
      col++;
      continue;
    }
    if (ch === "\n") {
      i++;
      line++;
      col = 1;
      continue;
    }
    const startLine = line;
    const startCol = col;
    if (ch === "/" && src[i + 1] === "/") {
      let j = i + 2;
      while (j < src.length && src[j] !== "\n") j++;
      const text = src.slice(i, j);
      add("COMMENT", text, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      let j = i + 2;
      let endLine = line;
      let endCol = col + 2;
      while (j < src.length && !(src[j] === "*" && src[j + 1] === "/")) {
        if (src[j] === "\n") {
          endLine++;
          endCol = 1;
        } else {
          endCol++;
        }
        j++;
      }
      if (j >= src.length) throw new SyntaxError(`Unterminated comment at line ${startLine} col ${startCol}`);
      j += 2;
      const text = src.slice(i, j);
      add("COMMENT", text, startLine, startCol);
      line = endLine;
      col = endCol + 2;
      i = j;
      continue;
    }
    if ((ch === "o" || ch === "s") && isDigit(src[i + 1])) {
      let j = i + 1;
      while (j < src.length && isDigit(src[j])) j++;
      const lexeme = src.slice(i, j);
      const tokenType = ch === "o" ? "OUTPUT_REF" : "SOURCE_REF";
      add(tokenType, lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === "v" && src[i + 1] === "o" && src[i + 2] === "l" && isDigit(src[i + 3])) {
      let j = i + 3;
      while (j < src.length && isDigit(src[j])) j++;
      const lexeme = src.slice(i, j);
      add("VOL_REF", lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === "g" && src[i + 1] === "e" && src[i + 2] === "o" && isDigit(src[i + 3])) {
      let j = i + 3;
      while (j < src.length && isDigit(src[j])) j++;
      const lexeme = src.slice(i, j);
      add("GEO_REF", lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === "x" && src[i + 1] === "y" && src[i + 2] === "z" && isDigit(src[i + 3])) {
      let j = i + 3;
      while (j < src.length && isDigit(src[j])) j++;
      const lexeme = src.slice(i, j);
      add("XYZ_REF", lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === "v" && src[i + 1] === "e" && src[i + 2] === "l" && isDigit(src[i + 3])) {
      let j = i + 3;
      while (j < src.length && isDigit(src[j])) j++;
      const lexeme = src.slice(i, j);
      add("VEL_REF", lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === "r" && src[i + 1] === "g" && src[i + 2] === "b" && src[i + 3] === "a" && isDigit(src[i + 4])) {
      let j = i + 4;
      while (j < src.length && isDigit(src[j])) j++;
      const lexeme = src.slice(i, j);
      add("RGBA_REF", lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === "m" && src[i + 1] === "e" && src[i + 2] === "s" && src[i + 3] === "h" && isDigit(src[i + 4])) {
      let j = i + 4;
      while (j < src.length && isDigit(src[j])) j++;
      const lexeme = src.slice(i, j);
      add("MESH_REF", lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === "#") {
      let j = i + 1;
      while (j < src.length && /[0-9a-fA-F]/.test(src[j])) j++;
      const len = j - i;
      if (len === 4 || len === 7 || len === 9) {
        const lexeme = src.slice(i, j);
        add("HEX", lexeme, startLine, startCol);
        col += len;
        i = j;
        continue;
      }
    }
    if (ch === "(" && src[i + 1] === ")") {
      let j = i + 2;
      while (j < src.length && (src[j] === " " || src[j] === "	")) j++;
      if (src[j] === "=" && src[j + 1] === ">") {
        j += 2;
        while (j < src.length && (src[j] === " " || src[j] === "	")) j++;
        let depth = 0;
        const exprStart = j;
        while (j < src.length) {
          const c = src[j];
          if (c === "(") depth++;
          else if (c === ")") {
            if (depth === 0) break;
            depth--;
          } else if (depth === 0) {
            if (c === "," || c === ";" || c === "\n" || c === "}") break;
          }
          j++;
        }
        const expr = src.slice(exprStart, j).trim();
        add("FUNC", expr, startLine, startCol);
        col += j - i;
        i = j;
        continue;
      }
    }
    if (ch === "." && isDigit(src[i + 1])) {
      let j = i + 1;
      while (j < src.length && isDigit(src[j])) j++;
      const lexeme = src.slice(i, j);
      add("NUMBER", lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (ch === ".") {
      add("DOT", ".", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "(") {
      add("LPAREN", "(", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === ")") {
      add("RPAREN", ")", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "{") {
      add("LBRACE", "{", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "}") {
      add("RBRACE", "}", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "[") {
      add("LBRACKET", "[", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "]") {
      add("RBRACKET", "]", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === ",") {
      add("COMMA", ",", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === ":") {
      add("COLON", ":", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "=") {
      add("EQUAL", "=", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === ";") {
      add("SEMICOLON", ";", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "+") {
      add("PLUS", "+", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "-") {
      add("MINUS", "-", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "*") {
      add("STAR", "*", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === "/") {
      add("SLASH", "/", startLine, startCol);
      i++;
      col++;
      continue;
    }
    if (ch === '"' && src[i + 1] === '"' && src[i + 2] === '"') {
      let j = i + 3;
      while (j < src.length - 2) {
        if (src[j] === '"' && src[j + 1] === '"' && src[j + 2] === '"') {
          break;
        }
        if (src[j] === "\n") {
          line++;
          col = 0;
        }
        j++;
      }
      if (j >= src.length - 2 || !(src[j] === '"' && src[j + 1] === '"' && src[j + 2] === '"')) {
        throw new SyntaxError(`Unterminated triple-quoted string at line ${startLine} col ${startCol}`);
      }
      const content = src.slice(i + 3, j);
      add("STRING", content, startLine, startCol);
      const lines = content.split("\n");
      if (lines.length > 1) {
        col = lines[lines.length - 1].length + 4;
      } else {
        col += j - i + 3;
      }
      i = j + 3;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < src.length && src[j] !== quote && src[j] !== "\n") {
        if (src[j] === "\\" && j + 1 < src.length) {
          j += 2;
        } else {
          j++;
        }
      }
      if (j >= src.length || src[j] === "\n") {
        throw new SyntaxError(`Unterminated string literal at line ${line} col ${col}`);
      }
      const content = src.slice(i + 1, j);
      add("STRING", content, startLine, startCol);
      col += j - i + 1;
      i = j + 1;
      continue;
    }
    if (isDigit(ch)) {
      let j = i;
      while (j < src.length && isDigit(src[j])) j++;
      if (src[j] === "." && isDigit(src[j + 1])) {
        j++;
        while (j < src.length && isDigit(src[j])) j++;
      }
      const lexeme = src.slice(i, j);
      add("NUMBER", lexeme, startLine, startCol);
      col += j - i;
      i = j;
      continue;
    }
    if (isLetter(ch) || ch === "_") {
      let j = i;
      while (j < src.length && (isLetter(src[j]) || isDigit(src[j]) || src[j] === "_")) j++;
      const lexeme = src.slice(i, j);
      if (keywords[lexeme]) {
        add(keywords[lexeme], lexeme, startLine, startCol);
      } else {
        add("IDENT", lexeme, startLine, startCol);
      }
      col += j - i;
      i = j;
      continue;
    }
    throw new SyntaxError(`Unexpected character '${ch}' at line ${line} col ${col}`);
  }
  add("EOF", "", line, col);
  return tokens;
}

// shaders/src/runtime/tags.js
var TAG_DEFINITIONS = Object.freeze({
  color: {
    id: "color",
    description: "Color manipulation"
  },
  distort: {
    id: "distort",
    description: "Input distortion"
  },
  edges: {
    id: "edges",
    description: "Accentuate or isolate texture edges"
  },
  geometric: {
    id: "geometric",
    description: "Shapes"
  },
  lens: {
    id: "lens",
    description: "Emulated camera lens effects"
  },
  noise: {
    id: "noise",
    description: "Very noisy"
  },
  transform: {
    id: "transform",
    description: "Moves stuff around"
  },
  util: {
    id: "util",
    description: "Utility function"
  },
  sim: {
    id: "sim",
    description: "Simulations with temporal state"
  },
  "3d": {
    id: "3d",
    description: "3D volumetric effects"
  },
  audio: {
    id: "audio",
    description: "Audio-reactive effects"
  },
  agents: {
    id: "agents",
    description: "Particle and agent-based systems"
  },
  antialiasing: {
    id: "antialiasing",
    description: "Edge smoothing and antialiasing"
  },
  artist: {
    id: "artist",
    description: "Artistic media emulation"
  },
  blend: {
    id: "blend",
    description: "Compositing and blend modes"
  },
  blur: {
    id: "blur",
    description: "Blur and softening"
  },
  fractal: {
    id: "fractal",
    description: "Fractal patterns"
  },
  geometry: {
    id: "geometry",
    description: "3D mesh geometry"
  },
  glitch: {
    id: "glitch",
    description: "Glitch and corruption effects"
  },
  image: {
    id: "image",
    description: "Image-input effects"
  },
  mesh: {
    id: "mesh",
    description: "3D mesh rendering"
  },
  midi: {
    id: "midi",
    description: "MIDI-reactive effects"
  },
  palette: {
    id: "palette",
    description: "Color palette mapping"
  },
  pattern: {
    id: "pattern",
    description: "Repeating or structured patterns"
  },
  pixel: {
    id: "pixel",
    description: "Pixelation and pixel-level effects"
  },
  text: {
    id: "text",
    description: "Text rendering"
  },
  tiling: {
    id: "tiling",
    description: "Seamless tiling"
  },
  video: {
    id: "video",
    description: "Video-input effects"
  }
});
var VALID_TAGS = Object.freeze(Object.keys(TAG_DEFINITIONS));
var _builtinDescriptors = [
  { id: "io", description: "Pipeline I/O functions (built-in, no search required)" },
  { id: "classicNoisedeck", description: "Complex shaders ported from the original noisedeck.app pipeline" },
  { id: "synth", description: "Generator effects" },
  { id: "mixer", description: "Blend two sources from A to B" },
  { id: "filter", description: "Apply special effects to 2D input" },
  { id: "render", description: "Rendering utilities and feedback loops" },
  { id: "points", description: "Particle and agent-based simulations" },
  { id: "synth3d", description: "3D volumetric generators" },
  { id: "filter3d", description: "3D volumetric processors" },
  { id: "user", description: "User-defined effects" }
];
var _namespaces = new Map(
  _builtinDescriptors.map((d) => [d.id, Object.freeze({ id: d.id, description: d.description })])
);
var _builtinIds = new Set(_namespaces.keys());
var _RESERVED_FUNCTION_NAMES = ["from", "osc", "midi", "audio", "null", "undefined"];
var _ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
var NAMESPACE_DESCRIPTIONS = new Proxy({}, {
  get(target, key, receiver) {
    if (typeof key === "string" && _namespaces.has(key)) {
      return _namespaces.get(key);
    }
    return Reflect.get(target, key, receiver);
  },
  has(target, key) {
    if (typeof key === "string" && _namespaces.has(key)) return true;
    return Reflect.has(target, key);
  },
  ownKeys() {
    return [..._namespaces.keys()];
  },
  getOwnPropertyDescriptor(_, key) {
    if (typeof key === "string" && _namespaces.has(key)) {
      return { enumerable: true, configurable: true, value: _namespaces.get(key) };
    }
    return void 0;
  },
  set(_, key) {
    throw new TypeError(`Cannot mutate NAMESPACE_DESCRIPTIONS directly; use registerNamespace() to add namespace '${String(key)}'`);
  },
  deleteProperty(_, key) {
    if (typeof key === "string" && _namespaces.has(key)) {
      throw new TypeError(`Cannot delete from NAMESPACE_DESCRIPTIONS directly; use unregisterNamespace() to remove namespace '${key}'`);
    }
    return true;
  }
});
var BUILTIN_NAMESPACE = "io";
var IO_FUNCTIONS = Object.freeze([
  "read",
  // Read from 2D surface
  "write",
  // Write to 2D surface
  "read3d",
  // Read from 3D volume/geometry
  "write3d",
  // Write to 3D volume/geometry
  "render",
  // Set render output (special directive)
  "render3d"
  // Render 3D volume to 2D
]);
var VALID_NAMESPACES = [..._namespaces.keys()];
function isValidTag(tagId) {
  return VALID_TAGS.includes(tagId);
}
function isValidNamespace(namespaceId) {
  return _namespaces.has(namespaceId);
}
function getTagDefinition(tagId) {
  return TAG_DEFINITIONS[tagId] || null;
}
function getNamespaceDescription(namespaceId) {
  return _namespaces.get(namespaceId) ?? null;
}
function registerNamespace(id, descriptor) {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Invalid namespace id: must be a non-empty string`);
  }
  if (!_ID_PATTERN.test(id)) {
    throw new Error(`Invalid namespace id '${id}': must match ${_ID_PATTERN}`);
  }
  if (Object.prototype.hasOwnProperty.call(RESERVED_KEYWORDS, id)) {
    throw new Error(`Cannot register namespace '${id}': reserved DSL keyword`);
  }
  if (IO_FUNCTIONS.includes(id)) {
    throw new Error(`Cannot register namespace '${id}': reserved IO function name`);
  }
  if (_RESERVED_FUNCTION_NAMES.includes(id)) {
    throw new Error(`Cannot register namespace '${id}': reserved function name`);
  }
  if (_builtinIds.has(id)) {
    throw new Error(`Cannot register namespace '${id}': built-in namespace`);
  }
  if (descriptor === null || typeof descriptor !== "object") {
    throw new Error(`Invalid descriptor for namespace '${id}': must be an object`);
  }
  if (typeof descriptor.description !== "string" || descriptor.description.length === 0) {
    throw new Error(`Invalid descriptor for namespace '${id}': 'description' must be a non-empty string`);
  }
  const existing = _namespaces.get(id);
  if (existing) {
    if (existing.description !== descriptor.description) {
      throw new Error(`Cannot re-register namespace '${id}' with a different description`);
    }
    return existing;
  }
  const frozen = Object.freeze({ id, description: descriptor.description });
  _namespaces.set(id, frozen);
  VALID_NAMESPACES.push(id);
  return frozen;
}
function unregisterNamespace(id) {
  if (_builtinIds.has(id)) {
    throw new Error(`Cannot unregister namespace '${id}': built-in namespace`);
  }
  if (!_namespaces.has(id)) return false;
  _namespaces.delete(id);
  const i = VALID_NAMESPACES.indexOf(id);
  if (i >= 0) VALID_NAMESPACES.splice(i, 1);
  return true;
}
function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return { valid: false, invalidTags: [] };
  }
  const invalidTags = tags.filter((tag) => !isValidTag(tag));
  return {
    valid: invalidTags.length === 0,
    invalidTags
  };
}
function isIOFunction(funcName) {
  return IO_FUNCTIONS.includes(funcName);
}

// shaders/src/lang/parser.js
function parse(tokens) {
  let current = 0;
  let programSearchOrder = null;
  const programNamespace = {
    imports: [],
    default: null
  };
  const peek = () => tokens[current];
  const advance = () => tokens[current++];
  const expect = (type, msg) => {
    const token = peek();
    if (token.type === type) return advance();
    throw new SyntaxError(`${msg} at line ${token.line} col ${token.col}`);
  };
  function collectComments() {
    const comments = [];
    while (peek()?.type === "COMMENT") {
      comments.push(advance().lexeme);
    }
    return comments;
  }
  const exprStartTokens = /* @__PURE__ */ new Set([
    "PLUS",
    "MINUS",
    "NUMBER",
    "HEX",
    "FUNC",
    "STRING",
    "IDENT",
    "OUTPUT_REF",
    "SOURCE_REF",
    "VOL_REF",
    "GEO_REF",
    "MESH_REF",
    "XYZ_REF",
    "VEL_REF",
    "RGBA_REF",
    "LPAREN",
    "LBRACKET",
    "TRUE",
    "FALSE"
  ]);
  const memberTokenTypes = /* @__PURE__ */ new Set([
    "IDENT",
    "SOURCE_REF",
    "OUTPUT_REF",
    "VOL_REF",
    "GEO_REF",
    "MESH_REF",
    "XYZ_REF",
    "VEL_REF",
    "RGBA_REF",
    "LET",
    "RENDER",
    "TRUE",
    "FALSE",
    "IF",
    "ELIF",
    "ELSE",
    "BREAK",
    "CONTINUE",
    "RETURN",
    "WRITE",
    "WRITE3D",
    "SUBCHAIN"
  ]);
  const cloneNamespaceMeta = (meta) => {
    if (!meta || typeof meta !== "object") {
      return null;
    }
    try {
      if (typeof structuredClone === "function") {
        return structuredClone(meta);
      }
    } catch {
    }
    try {
      return JSON.parse(JSON.stringify(meta));
    } catch {
      return null;
    }
  };
  function transformOscInvocation(call, nameToken) {
    const args = Array.isArray(call.args) ? call.args : [];
    const kwargs = call.kwargs || {};
    const paramOrder = ["type", "min", "max", "speed", "offset", "seed"];
    const validParams = new Set(paramOrder);
    const defaults = {
      type: { type: "Member", path: ["oscKind", "sine"] },
      min: { type: "Number", value: 0 },
      max: { type: "Number", value: 1 },
      speed: { type: "Number", value: 1 },
      offset: { type: "Number", value: 0 },
      seed: { type: "Number", value: 1 }
    };
    for (const key of Object.keys(kwargs)) {
      if (!validParams.has(key)) {
        throw new SyntaxError(`osc() unknown parameter '${key}' at line ${nameToken.line} col ${nameToken.col}. Valid: ${paramOrder.join(", ")}`);
      }
    }
    const resolved = {};
    for (let i = 0; i < paramOrder.length; i++) {
      const paramName = paramOrder[i];
      if (kwargs[paramName] !== void 0) {
        resolved[paramName] = kwargs[paramName];
      } else if (i < args.length) {
        resolved[paramName] = args[i];
      } else if (defaults[paramName] !== void 0) {
        resolved[paramName] = defaults[paramName];
      }
    }
    const typeNode = resolved.type;
    return {
      type: "Oscillator",
      oscType: typeNode,
      min: resolved.min,
      max: resolved.max,
      speed: resolved.speed,
      offset: resolved.offset,
      seed: resolved.seed,
      loc: { line: nameToken.line, col: nameToken.col }
    };
  }
  function transformMidiInvocation(call, nameToken) {
    const args = Array.isArray(call.args) ? call.args : [];
    const kwargs = call.kwargs || {};
    const paramOrder = ["channel", "mode", "min", "max", "sensitivity"];
    const defaults = {
      mode: { type: "Member", path: ["midiMode", "velocity"] },
      min: { type: "Number", value: 0 },
      max: { type: "Number", value: 1 },
      sensitivity: { type: "Number", value: 1 }
    };
    const resolved = {};
    for (let i = 0; i < paramOrder.length; i++) {
      const paramName = paramOrder[i];
      if (kwargs[paramName] !== void 0) {
        resolved[paramName] = kwargs[paramName];
      } else if (i < args.length) {
        resolved[paramName] = args[i];
      } else if (defaults[paramName] !== void 0) {
        resolved[paramName] = defaults[paramName];
      }
    }
    if (!resolved.channel) {
      throw new SyntaxError(`midi() requires 'channel' argument at line ${nameToken.line} col ${nameToken.col}`);
    }
    return {
      type: "Midi",
      channel: resolved.channel,
      mode: resolved.mode,
      min: resolved.min,
      max: resolved.max,
      sensitivity: resolved.sensitivity,
      loc: { line: nameToken.line, col: nameToken.col }
    };
  }
  function transformAudioInvocation(call, nameToken) {
    const args = Array.isArray(call.args) ? call.args : [];
    const kwargs = call.kwargs || {};
    const paramOrder = ["band", "min", "max"];
    const defaults = {
      min: { type: "Number", value: 0 },
      max: { type: "Number", value: 1 }
    };
    const resolved = {};
    for (let i = 0; i < paramOrder.length; i++) {
      const paramName = paramOrder[i];
      if (kwargs[paramName] !== void 0) {
        resolved[paramName] = kwargs[paramName];
      } else if (i < args.length) {
        resolved[paramName] = args[i];
      } else if (defaults[paramName] !== void 0) {
        resolved[paramName] = defaults[paramName];
      }
    }
    if (!resolved.band) {
      throw new SyntaxError(`audio() requires 'band' argument at line ${nameToken.line} col ${nameToken.col}`);
    }
    return {
      type: "Audio",
      band: resolved.band,
      min: resolved.min,
      max: resolved.max,
      loc: { line: nameToken.line, col: nameToken.col }
    };
  }
  function transformFromInvocation(call, nameToken) {
    const fail = (message) => {
      if (nameToken && typeof nameToken.line === "number" && typeof nameToken.col === "number") {
        throw new SyntaxError(`${message} at line ${nameToken.line} col ${nameToken.col}`);
      }
      throw new SyntaxError(message);
    };
    if (call.kwargs && Object.keys(call.kwargs).length) {
      fail("'from' does not support named arguments");
    }
    const args = Array.isArray(call.args) ? call.args : [];
    if (args.length !== 2) {
      fail("'from' requires exactly two arguments (namespace, call)");
    }
    const [namespaceArg, targetArg] = args;
    if (!namespaceArg || namespaceArg.type !== "Ident" && namespaceArg.type !== "Member") {
      fail("'from' namespace argument must be an identifier");
    }
    const namespaceName = namespaceArg.type === "Member" ? namespaceArg.path.join(".") : namespaceArg.name;
    if (!namespaceName) {
      fail("'from' namespace argument must be non-empty");
    }
    let targetCall = null;
    if (targetArg && targetArg.type === "Call") {
      targetCall = targetArg;
    } else if (targetArg && targetArg.type === "Chain" && Array.isArray(targetArg.chain) && targetArg.chain.length === 1) {
      const head = targetArg.chain[0];
      if (head && head.type === "Call") {
        targetCall = head;
      }
    }
    if (!targetCall) {
      fail("'from' second argument must be a call expression");
    }
    const replacement = {
      ...targetCall,
      args: Array.isArray(targetCall.args) ? targetCall.args.map((arg) => arg) : []
    };
    if (targetCall.kwargs) {
      replacement.kwargs = { ...targetCall.kwargs };
    }
    const overrideNamespace = {
      name: namespaceName,
      path: [namespaceName],
      explicit: true,
      source: "from",
      resolved: namespaceName,
      searchOrder: [namespaceName],
      fromOverride: true
    };
    replacement.namespace = overrideNamespace;
    return replacement;
  }
  function hasCallAfterDot(index) {
    let i = index + 1;
    if (tokens[i]?.type !== "DOT") {
      return false;
    }
    while (tokens[i]?.type === "DOT") {
      const segToken = tokens[i + 1];
      if (!segToken || !memberTokenTypes.has(segToken.type)) {
        return false;
      }
      i += 2;
    }
    return tokens[i]?.type === "LPAREN";
  }
  function parseRenderDirective() {
    advance();
    expect("LPAREN", "Expect '('");
    if (peek().type !== "OUTPUT_REF") {
      throw new SyntaxError("Expected output reference in render()");
    }
    const out = { type: "OutputRef", name: advance().lexeme };
    expect("RPAREN", "Expect ')'");
    return out;
  }
  function parseProgram() {
    const plans = [];
    const vars = [];
    let render = null;
    const trailingComments = [];
    const appendStatement = (stmt) => {
      if (!stmt || typeof stmt !== "object") {
        return;
      }
      if (stmt.type === "VarAssign") {
        vars.push(stmt);
      } else {
        plans.push(stmt);
      }
    };
    const consumeRender = () => {
      if (render) {
        const t = peek();
        throw new SyntaxError(`Duplicate render() directive at line ${t.line} col ${t.col}`);
      }
      render = parseRenderDirective();
      while (peek().type === "SEMICOLON") advance();
    };
    const namespaceTokenTypes = /* @__PURE__ */ new Set([
      "IDENT",
      "RENDER",
      "WRITE",
      "WRITE3D",
      "TRUE",
      "FALSE",
      "IF",
      "ELIF",
      "ELSE",
      "BREAK",
      "CONTINUE",
      "RETURN"
    ]);
    function parseSearchDirective() {
      if (programSearchOrder !== null) {
        const t = peek();
        throw new SyntaxError(`Only one search directive is allowed per program at line ${t.line} col ${t.col}`);
      }
      advance();
      const namespaces = [];
      function validateNamespace(token) {
        const ns = token.lexeme;
        if (!isValidNamespace(ns)) {
          throw new SyntaxError(`Invalid namespace '${ns}' at line ${token.line} col ${token.col}. Valid namespaces: ${VALID_NAMESPACES.join(", ")}`);
        }
      }
      const firstToken = peek();
      if (!namespaceTokenTypes.has(firstToken.type)) {
        throw new SyntaxError(`Expected namespace identifier after search at line ${firstToken.line} col ${firstToken.col}`);
      }
      advance();
      validateNamespace(firstToken);
      namespaces.push(firstToken.lexeme);
      while (peek().type === "COMMA") {
        advance();
        const nsToken = peek();
        if (!namespaceTokenTypes.has(nsToken.type)) {
          throw new SyntaxError(`Expected namespace identifier after comma at line ${nsToken.line} col ${nsToken.col}`);
        }
        advance();
        validateNamespace(nsToken);
        namespaces.push(nsToken.lexeme);
      }
      programSearchOrder = namespaces;
      programNamespace.imports = namespaces.map((name) => ({
        name,
        source: "search",
        explicit: true
      }));
      programNamespace.default = { name: namespaces[0], source: "search", explicit: true };
      while (peek().type === "SEMICOLON") advance();
    }
    while (peek().type !== "EOF") {
      if (peek().type === "SEMICOLON") {
        advance();
        continue;
      }
      const leadingComments = collectComments();
      if (peek().type === "EOF") {
        if (leadingComments.length > 0) {
          trailingComments.push(...leadingComments);
        }
        break;
      }
      if (peek().type === "SEMICOLON") {
        continue;
      }
      if (peek().type === "SEARCH") {
        if (plans.length || vars.length || render) {
          const t = peek();
          throw new SyntaxError(`'search' directive must appear before other statements at line ${t.line} col ${t.col}`);
        }
        parseSearchDirective();
        continue;
      }
      if (peek().type === "RENDER") {
        consumeRender();
        if (leadingComments.length > 0 && render) {
          render.leadingComments = leadingComments;
        }
        const trailing = collectComments();
        if (trailing.length > 0) {
          trailingComments.push(...trailing);
        }
        break;
      }
      const stmt = parseStatement();
      if (leadingComments.length > 0 && stmt) {
        stmt.leadingComments = leadingComments;
      }
      appendStatement(stmt);
      while (peek().type === "SEMICOLON") advance();
    }
    expect("EOF", "Expected end of input");
    if (!programSearchOrder || programSearchOrder.length === 0) {
      throw new SyntaxError("Missing required 'search' directive. Every program must start with 'search <namespace>, ...' to specify namespace search order.");
    }
    const program = { type: "Program", plans, render };
    if (vars.length) {
      program.vars = vars;
    }
    if (trailingComments.length) {
      program.trailingComments = trailingComments;
    }
    const searchOrder = programSearchOrder.slice();
    let namespaceMeta = cloneNamespaceMeta({
      imports: programNamespace.imports,
      default: programNamespace.default,
      searchOrder
    });
    if (!namespaceMeta) {
      const importsClone = programNamespace.imports.map((entry) => ({ ...entry }));
      const defaultClone = programNamespace.default ? { ...programNamespace.default } : null;
      namespaceMeta = { imports: importsClone, default: defaultClone, searchOrder: searchOrder.slice() };
    }
    program.namespace = namespaceMeta;
    return program;
  }
  function parseBlock() {
    expect("LBRACE", "Expect '{'");
    const body = [];
    while (peek().type !== "RBRACE") {
      const stmt = parseStatement();
      body.push(stmt);
      while (peek().type === "SEMICOLON") advance();
    }
    expect("RBRACE", "Expect '}'");
    return body;
  }
  function parseStatement() {
    if (peek().type === "SEARCH") {
      const t = peek();
      throw new SyntaxError(`'search' directive is only allowed at the start of the program at line ${t.line} col ${t.col}`);
    }
    if (peek().type === "LET") {
      advance();
      const name = expect("IDENT", "Expected identifier").lexeme;
      expect("EQUAL", "Expect '='");
      if (!exprStartTokens.has(peek().type)) {
        const t = peek();
        throw new SyntaxError(`Expected expression after '=' at line ${t.line} col ${t.col}`);
      }
      const expr = parseAdditive();
      return { type: "VarAssign", name, expr };
    }
    switch (peek().type) {
      case "IF": {
        advance();
        expect("LPAREN", "Expect '('");
        const condition = parseAdditive();
        expect("RPAREN", "Expect ')'");
        const then = parseBlock();
        const elif = [];
        while (peek().type === "ELIF") {
          advance();
          expect("LPAREN", "Expect '('");
          const ec = parseAdditive();
          expect("RPAREN", "Expect ')'");
          const body = parseBlock();
          elif.push({ condition: ec, then: body });
        }
        let elseBranch = null;
        if (peek().type === "ELSE") {
          advance();
          elseBranch = parseBlock();
        }
        return { type: "IfStmt", condition, then, elif, else: elseBranch };
      }
      case "BREAK": {
        advance();
        return { type: "Break" };
      }
      case "CONTINUE": {
        advance();
        return { type: "Continue" };
      }
      case "RETURN": {
        advance();
        if (exprStartTokens.has(peek().type)) {
          const value = parseAdditive();
          return { type: "Return", value };
        }
        return { type: "Return" };
      }
    }
    const chain = parseChain();
    let write = null;
    let write3d = null;
    if (chain.length > 0) {
      const lastNode = chain[chain.length - 1];
      if (lastNode.type === "Write") {
        write = lastNode.surface;
      } else if (lastNode.type === "Write3D") {
        write3d = { tex3d: lastNode.tex3d, geo: lastNode.geo };
      }
    }
    return { chain, write, write3d };
  }
  function parseChain(context = "statement") {
    const firstCall = parseCall();
    const calls = [firstCall];
    while (true) {
      const savedPos = current;
      const leadingComments = collectComments();
      if (peek().type !== "DOT") {
        current = savedPos;
        break;
      }
      advance();
      const postDotComments = collectComments();
      const allComments = [...leadingComments, ...postDotComments];
      const nextType = peek().type;
      if (nextType === "WRITE" || nextType === "WRITE3D") {
        if (context === "expression") {
          const t = peek();
          throw new SyntaxError(`'.write()' is only allowed in statement context at line ${t.line} col ${t.col}`);
        }
        const writeNode = parseWriteCall();
        if (allComments.length > 0) {
          writeNode.leadingComments = allComments;
        }
        calls.push(writeNode);
        continue;
      }
      if (nextType === "SUBCHAIN") {
        const subchainNode = parseSubchainCall();
        if (allComments.length > 0) {
          subchainNode.leadingComments = allComments;
        }
        calls.push(subchainNode);
        continue;
      }
      const call = parseCall();
      if (allComments.length > 0) {
        call.leadingComments = allComments;
      }
      calls.push(call);
    }
    return calls;
  }
  function parseWriteCall() {
    const tokenType = peek().type;
    const tokenLine = peek().line;
    const tokenCol = peek().col;
    if (tokenType === "WRITE") {
      advance();
      expect("LPAREN", "Expect '('");
      let surface = null;
      if (peek().type === "OUTPUT_REF") {
        surface = { type: "OutputRef", name: advance().lexeme };
      } else if (peek().type === "XYZ_REF") {
        surface = { type: "XyzRef", name: advance().lexeme };
      } else if (peek().type === "VEL_REF") {
        surface = { type: "VelRef", name: advance().lexeme };
      } else if (peek().type === "RGBA_REF") {
        surface = { type: "RgbaRef", name: advance().lexeme };
      } else if (peek().type === "MESH_REF") {
        surface = { type: "MeshRef", name: advance().lexeme };
      } else if (peek().type === "IDENT" && peek().lexeme === "none") {
        surface = { type: "OutputRef", name: advance().lexeme };
      } else {
        throw new SyntaxError(`write() requires an explicit surface reference (e.g., o0, o1, xyz0, vel0, rgba0, mesh0, none) at line ${peek().line} col ${peek().col}`);
      }
      expect("RPAREN", "Expect ')'");
      return {
        type: "Write",
        surface,
        loc: { line: tokenLine, col: tokenCol }
      };
    } else if (tokenType === "WRITE3D") {
      advance();
      expect("LPAREN", "Expect '('");
      let tex3d = null;
      if (peek().type === "IDENT" || peek().type === "OUTPUT_REF" || peek().type === "VOL_REF") {
        const tokType = peek().type;
        tex3d = tokType === "OUTPUT_REF" ? { type: "OutputRef", name: advance().lexeme } : tokType === "VOL_REF" ? { type: "VolRef", name: advance().lexeme } : { type: "Ident", name: advance().lexeme };
      } else {
        throw new SyntaxError(`Expected tex3d reference in write3d() at line ${peek().line} col ${peek().col}`);
      }
      expect("COMMA", "Expect ',' between tex3d and geo in write3d()");
      let geo = null;
      if (peek().type === "IDENT" || peek().type === "OUTPUT_REF" || peek().type === "GEO_REF") {
        const tokType = peek().type;
        geo = tokType === "OUTPUT_REF" ? { type: "OutputRef", name: advance().lexeme } : tokType === "GEO_REF" ? { type: "GeoRef", name: advance().lexeme } : { type: "Ident", name: advance().lexeme };
      } else {
        throw new SyntaxError(`Expected geo reference in write3d() at line ${peek().line} col ${peek().col}`);
      }
      expect("RPAREN", "Expect ')'");
      return {
        type: "Write3D",
        tex3d,
        geo,
        loc: { line: tokenLine, col: tokenCol }
      };
    }
    throw new SyntaxError(`Expected write or write3d at line ${tokenLine} col ${tokenCol}`);
  }
  function parseSubchainCall() {
    const tokenLine = peek().line;
    const tokenCol = peek().col;
    advance();
    expect("LPAREN", "Expect '(' after subchain");
    const kwargs = {};
    if (peek().type !== "RPAREN") {
      if (peek().type === "STRING") {
        kwargs.name = { type: "String", value: advance().lexeme };
      } else if (peek().type === "IDENT" && tokens[current + 1]?.type === "COLON") {
        while (peek().type === "IDENT" && tokens[current + 1]?.type === "COLON") {
          const key = advance().lexeme;
          advance();
          if (peek().type !== "STRING") {
            throw new SyntaxError(`Expected string value for subchain ${key} at line ${peek().line} col ${peek().col}`);
          }
          kwargs[key] = { type: "String", value: advance().lexeme };
          if (peek().type === "COMMA") {
            advance();
          }
        }
      }
    }
    expect("RPAREN", "Expect ')' after subchain arguments");
    expect("LBRACE", "Expect '{' to start subchain body");
    const body = [];
    while (peek().type !== "RBRACE") {
      const leadingComments = collectComments();
      if (peek().type === "RBRACE") break;
      if (peek().type !== "DOT") {
        throw new SyntaxError(`Expected '.' before chain element in subchain body at line ${peek().line} col ${peek().col}`);
      }
      advance();
      const postDotComments = collectComments();
      const allComments = [...leadingComments, ...postDotComments];
      const call = parseCall();
      if (allComments.length > 0) {
        call.leadingComments = allComments;
      }
      body.push(call);
    }
    expect("RBRACE", "Expect '}' to end subchain body");
    if (body.length === 0) {
      throw new SyntaxError(`Subchain body cannot be empty at line ${tokenLine} col ${tokenCol}`);
    }
    return {
      type: "Subchain",
      name: kwargs.name?.value || null,
      id: kwargs.id?.value || null,
      body,
      loc: { line: tokenLine, col: tokenCol }
    };
  }
  function parseCall() {
    const nameToken = expect("IDENT", "Expected identifier");
    if (peek().type === "DOT") {
      const next = tokens[current + 1];
      if (next && next.type === "IDENT") {
        const after = tokens[current + 2];
        if (after?.type === "LPAREN") {
          throw new SyntaxError(
            `Inline namespace syntax '${nameToken.lexeme}.${next.lexeme}()' is not allowed. Use 'search ${nameToken.lexeme}' at the start of the program instead, at line ${nameToken.line} col ${nameToken.col}`
          );
        }
      }
    }
    expect("LPAREN", "Expect '('");
    const args = [];
    const kwargs = {};
    let keyword = false;
    if (peek().type !== "RPAREN") {
      if (peek().type === "IDENT" && tokens[current + 1]?.type === "COLON") {
        keyword = true;
        parseKwarg(kwargs);
        while (peek().type === "COMMA") {
          advance();
          if (peek().type === "RPAREN") break;
          if (!(peek().type === "IDENT" && tokens[current + 1]?.type === "COLON")) {
            const t = peek();
            throw new SyntaxError(`Cannot mix positional and keyword arguments at line ${t.line} col ${t.col}`);
          }
          parseKwarg(kwargs);
        }
      } else {
        args.push(parseArg());
        while (peek().type === "COMMA") {
          advance();
          if (peek().type === "RPAREN") break;
          if (peek().type === "IDENT" && tokens[current + 1]?.type === "COLON") {
            const t = peek();
            throw new SyntaxError(`Cannot mix positional and keyword arguments at line ${t.line} col ${t.col}`);
          }
          args.push(parseArg());
        }
      }
    }
    expect("RPAREN", "Expect ')'");
    const call = { type: "Call", name: nameToken.lexeme, args };
    if (keyword) call.kwargs = kwargs;
    if (nameToken.lexeme === "from") {
      return transformFromInvocation(call, nameToken);
    }
    if (nameToken.lexeme === "osc") {
      const oscKwargs = /* @__PURE__ */ new Set(["type", "min", "max", "speed", "offset", "seed"]);
      const hasTypeKwarg = kwargs && "type" in kwargs;
      const firstArgIsOscKind = args.length > 0 && args[0] && args[0].type === "Member" && args[0].path && args[0].path[0] === "oscKind";
      const isBareOsc = args.length === 0 && (!kwargs || Object.keys(kwargs).length === 0);
      const hasOnlyOscKwargs = kwargs && Object.keys(kwargs).length > 0 && Object.keys(kwargs).every((k) => oscKwargs.has(k));
      if (hasTypeKwarg || firstArgIsOscKind || isBareOsc || hasOnlyOscKwargs) {
        return transformOscInvocation(call, nameToken);
      }
    }
    if (nameToken.lexeme === "midi") {
      return transformMidiInvocation(call, nameToken);
    }
    if (nameToken.lexeme === "audio") {
      return transformAudioInvocation(call, nameToken);
    }
    if (nameToken.lexeme === "read") {
      let surface = args[0] || kwargs.tex || kwargs.surface;
      const node = {
        type: "Read",
        surface,
        loc: { line: nameToken.line, col: nameToken.col }
      };
      if (kwargs._skip?.type === "Boolean" && kwargs._skip.value === true) {
        node._skip = true;
      }
      return node;
    }
    if (nameToken.lexeme === "read3d") {
      let tex3d = args[0] || kwargs.tex3d;
      let geo = args[1] || kwargs.geo;
      const node = {
        type: "Read3D",
        tex3d,
        geo: geo || null,
        // null for single-arg form
        loc: { line: nameToken.line, col: nameToken.col }
      };
      if (kwargs._skip?.type === "Boolean" && kwargs._skip.value === true) {
        node._skip = true;
      }
      return node;
    }
    return call;
  }
  function parseArg() {
    return parseAdditive();
  }
  function parseAdditive() {
    let node = parseMultiplicative();
    while (peek().type === "PLUS" || peek().type === "MINUS") {
      const op = advance().type;
      const right = parseMultiplicative();
      const l = toNumber(node);
      const r = toNumber(right);
      node = { type: "Number", value: op === "PLUS" ? l + r : l - r };
    }
    return node;
  }
  function parseMultiplicative() {
    let node = parseUnary();
    while (peek().type === "STAR" || peek().type === "SLASH") {
      const op = advance().type;
      const right = parseUnary();
      const l = toNumber(node);
      const r = toNumber(right);
      node = { type: "Number", value: op === "STAR" ? l * r : l / r };
    }
    return node;
  }
  function parseUnary() {
    if (peek().type === "PLUS") {
      advance();
      return parseUnary();
    }
    if (peek().type === "MINUS") {
      advance();
      const val = parseUnary();
      return { type: "Number", value: -toNumber(val) };
    }
    return parsePrimary();
  }
  function parsePrimary() {
    const token = peek();
    switch (token.type) {
      case "NUMBER":
        advance();
        return { type: "Number", value: parseFloat(token.lexeme) };
      case "STRING":
        advance();
        return { type: "String", value: token.lexeme };
      case "HEX": {
        advance();
        const hex = token.lexeme.slice(1);
        let r, g, b, a = 1;
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.slice(0, 2), 16);
          g = parseInt(hex.slice(2, 4), 16);
          b = parseInt(hex.slice(4, 6), 16);
        } else if (hex.length === 8) {
          r = parseInt(hex.slice(0, 2), 16);
          g = parseInt(hex.slice(2, 4), 16);
          b = parseInt(hex.slice(4, 6), 16);
          a = parseInt(hex.slice(6, 8), 16) / 255;
        }
        return { type: "Color", value: [r / 255, g / 255, b / 255, a] };
      }
      case "LBRACKET": {
        const startLine = token.line;
        const startCol = token.col;
        advance();
        const elements = [];
        if (peek().type !== "RBRACKET") {
          elements.push(parseArg());
          while (peek().type === "COMMA") {
            advance();
            elements.push(parseArg());
          }
        }
        if (peek().type !== "RBRACKET") {
          const t = peek();
          throw new SyntaxError(`Expected ']' at line ${t.line} col ${t.col}`);
        }
        advance();
        return { type: "ArrayLiteral", elements, loc: { line: startLine, col: startCol } };
      }
      case "FUNC":
        advance();
        return { type: "Func", src: token.lexeme };
      case "TRUE":
        advance();
        return { type: "Boolean", value: true };
      case "FALSE":
        advance();
        return { type: "Boolean", value: false };
      case "IDENT": {
        if (token.lexeme === "Math" && tokens[current + 1]?.type === "DOT" && tokens[current + 2]?.type === "IDENT" && tokens[current + 2].lexeme === "PI") {
          advance();
          advance();
          advance();
          return { type: "Number", value: Math.PI };
        }
        if (tokens[current + 1]?.type === "LPAREN" || hasCallAfterDot(current)) {
          const chain = parseChain("expression");
          return chain.length === 1 ? chain[0] : { type: "Chain", chain };
        }
        advance();
        const path = [token.lexeme];
        while (peek().type === "DOT") {
          const next = tokens[current + 1];
          if (!next) break;
          if (tokens[current + 2]?.type === "LPAREN") break;
          if (!memberTokenTypes.has(next.type)) {
            throw new SyntaxError(`Expected identifier after '.' at line ${next.line} col ${next.col}`);
          }
          advance();
          advance();
          path.push(next.lexeme);
        }
        if (path.length > 1) {
          return { type: "Member", path };
        }
        return { type: "Ident", name: path[0] };
      }
      case "OUTPUT_REF":
        advance();
        return { type: "OutputRef", name: token.lexeme };
      case "SOURCE_REF":
        advance();
        return { type: "SourceRef", name: token.lexeme };
      case "VOL_REF":
        advance();
        return { type: "VolRef", name: token.lexeme };
      case "GEO_REF":
        advance();
        return { type: "GeoRef", name: token.lexeme };
      case "XYZ_REF":
        advance();
        return { type: "XyzRef", name: token.lexeme };
      case "VEL_REF":
        advance();
        return { type: "VelRef", name: token.lexeme };
      case "RGBA_REF":
        advance();
        return { type: "RgbaRef", name: token.lexeme };
      case "MESH_REF":
        advance();
        return { type: "MeshRef", name: token.lexeme };
      case "LPAREN": {
        advance();
        const expr = parseAdditive();
        expect("RPAREN", "Expect ')'");
        return expr;
      }
      default:
        throw new SyntaxError(`Unexpected token ${token.type} at line ${token.line} col ${token.col}`);
    }
  }
  function toNumber(node) {
    if (node.type !== "Number") {
      throw new SyntaxError("Expected number");
    }
    return node.value;
  }
  function parseKwarg(obj) {
    const key = expect("IDENT", "Expected identifier").lexeme;
    expect("COLON", "Expect ':'");
    if (!exprStartTokens.has(peek().type)) {
      const t = peek();
      throw new SyntaxError(`Expected expression after '=' at line ${t.line} col ${t.col}`);
    }
    obj[key] = parseArg();
  }
  return parseProgram();
}

// shaders/src/lang/diagnostics.js
var diagnostics = {
  L001: { stage: "lexer", severity: "error", message: "Unexpected character" },
  L002: { stage: "lexer", severity: "error", message: "Unterminated string literal" },
  P001: { stage: "parser", severity: "error", message: "Unexpected token" },
  P002: { stage: "parser", severity: "error", message: "Expected closing parenthesis" },
  S001: { stage: "semantic", severity: "error", message: "Unknown identifier" },
  S002: { stage: "semantic", severity: "warning", message: "Argument out of range" },
  S003: { stage: "semantic", severity: "error", message: "Variable used before assignment" },
  S004: { stage: "semantic", severity: "error", message: "Cannot assign null or undefined" },
  S005: { stage: "semantic", severity: "error", message: "Illegal chain structure" },
  S006: { stage: "semantic", severity: "error", message: "Starter chain missing write() call" },
  S007: { stage: "semantic", severity: "warning", message: "Deprecated parameter alias" },
  S008: { stage: "semantic", severity: "warning", message: "Deprecated effect" },
  R001: { stage: "runtime", severity: "error", message: "Runtime error" }
};
var diagnostics_default = diagnostics;

// shaders/src/lang/enums.js
var legacyEnums = {};
var mutableEnums = legacyEnums;
var frozenEnums = null;
function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (sourceVal && typeof sourceVal === "object" && !Array.isArray(sourceVal) && targetVal && typeof targetVal === "object" && !Array.isArray(targetVal) && !("type" in sourceVal)) {
      if (Object.isFrozen(targetVal)) {
        target[key] = deepMerge({ ...targetVal }, sourceVal);
      } else {
        deepMerge(targetVal, sourceVal);
      }
    } else {
      target[key] = sourceVal;
    }
  }
  return target;
}
function deepClone(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const clone = {};
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key]);
  }
  return clone;
}
function cloneEnumTree(source, mergeEnumsFn) {
  if (!mergeEnumsFn) return deepClone(source);
  const clone = {};
  mergeEnumsFn(clone, source);
  return clone;
}
function deepFreezeEnumTree(node) {
  if (!node || typeof node !== "object" || Object.isFrozen(node)) {
    return node;
  }
  Object.freeze(node);
  for (const child of Object.values(node)) {
    if (child && typeof child === "object") {
      deepFreezeEnumTree(child);
    }
  }
  return node;
}
function rebuildFrozenEnums(mergeEnumsFn) {
  const clone = cloneEnumTree(mutableEnums, mergeEnumsFn);
  frozenEnums = deepFreezeEnumTree(clone);
}
async function mergeIntoEnums(source, mergeEnumsFn) {
  if (!source || typeof source !== "object") {
    return frozenEnums;
  }
  if (mergeEnumsFn) {
    mergeEnumsFn(mutableEnums, source);
  } else {
    deepMerge(mutableEnums, source);
  }
  rebuildFrozenEnums(mergeEnumsFn);
  return frozenEnums;
}
rebuildFrozenEnums();

// share/palettes.json
var palettes_default = {
  none: { mode: "none", amp: [0.5, 0.5, 0.5], freq: [2, 2, 2], offset: [0.5, 0.5, 0.5], phase: [1, 1, 1] },
  seventiesShirt: { mode: "rgb", amp: [0.76, 0.88, 0.37], freq: [1, 1, 1], offset: [0.93, 0.97, 0.52], phase: [0.21, 0.41, 0.56] },
  fiveG: { mode: "rgb", amp: [0.56851584, 0.7740668, 0.23485267], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0.727029, 0.08039695, 0.10427457] },
  afterimage: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0.3, 0.2, 0.2] },
  barstow: { mode: "rgb", amp: [0.45, 0.2, 0.1], freq: [1, 1, 1], offset: [0.7, 0.2, 0.2], phase: [0.5, 0.4, 0] },
  bloob: { mode: "rgb", amp: [0.09, 0.59, 0.48], freq: [1, 1, 1], offset: [0.2, 0.31, 0.98], phase: [0.88, 0.4, 0.33] },
  blueSkies: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.1, 0.4, 0.7], phase: [0.1, 0.1, 0.1] },
  brushedMetal: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0, 0.1, 0.2] },
  burningSky: { mode: "rgb", amp: [0.7259015, 0.7004237, 0.9494409], freq: [1, 1, 1], offset: [0.63290054, 0.37883538, 0.29405284], phase: [0, 0.1, 0.2] },
  california: { mode: "rgb", amp: [0.94, 0.33, 0.27], freq: [1, 1, 1], offset: [0.74, 0.37, 0.73], phase: [0.44, 0.17, 0.88] },
  columbia: { mode: "rgb", amp: [1, 0.7, 1], freq: [1, 1, 1], offset: [1, 0.4, 0.9], phase: [0.4, 0.5, 0.6] },
  cottonCandy: { mode: "rgb", amp: [0.51, 0.39, 0.41], freq: [1, 1, 1], offset: [0.59, 0.53, 0.94], phase: [0.15, 0.41, 0.46] },
  darkSatin: { mode: "hsv", amp: [0, 0, 0.51], freq: [1, 1, 1], offset: [0, 0, 0.43], phase: [0, 0, 0.36] },
  dealerHat: { mode: "rgb", amp: [0.83, 0.45, 0.19], freq: [1, 1, 1], offset: [0.79, 0.45, 0.35], phase: [0.28, 0.91, 0.61] },
  dreamy: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0, 0.2, 0.25] },
  eventHorizon: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.22, 0.48, 0.62], phase: [0.1, 0.3, 0.2] },
  ghostly: { mode: "hsv", amp: [0.02, 0.92, 0.76], freq: [1, 1, 1], offset: [0.51, 0.49, 0.51], phase: [0.71, 0.23, 0.66] },
  grayscale: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [2, 2, 2], offset: [0.5, 0.5, 0.5], phase: [1, 1, 1] },
  hazySunset: { mode: "rgb", amp: [0.79, 0.56, 0.22], freq: [1, 1, 1], offset: [0.96, 0.5, 0.49], phase: [0.15, 0.98, 0.87] },
  heatmap: { mode: "rgb", amp: [0.75804377, 0.62868536, 0.2227562], freq: [1, 1, 1], offset: [0.35536355, 0.12935615, 0.17060602], phase: [0, 0.25, 0.5] },
  hypercolor: { mode: "rgb", amp: [0.79, 0.5, 0.23], freq: [1, 1, 1], offset: [0.75, 0.47, 0.45], phase: [0.08, 0.84, 0.16] },
  jester: { mode: "rgb", amp: [0.7, 0.81, 0.73], freq: [1, 1, 1], offset: [0.1, 0.22, 0.27], phase: [0.99, 0.12, 0.94] },
  justBlue: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [0, 0, 1], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5] },
  justCyan: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [0, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5] },
  justGreen: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [0, 1, 0], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5] },
  justPurple: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 0, 1], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5] },
  justRed: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 0, 0], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5] },
  justYellow: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 0], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5] },
  mars: { mode: "rgb", amp: [0.74, 0.33, 0.09], freq: [1, 1, 1], offset: [0.62, 0.2, 0.2], phase: [0.2, 0.1, 0] },
  modesto: { mode: "rgb", amp: [0.56, 0.68, 0.39], freq: [1, 1, 1], offset: [0.72, 0.07, 0.62], phase: [0.25, 0.4, 0.41] },
  moss: { mode: "rgb", amp: [0.78, 0.39, 0.07], freq: [1, 1, 1], offset: [0, 0.53, 0.33], phase: [0.94, 0.92, 0.9] },
  neptune: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.2, 0.64, 0.62], phase: [0.15, 0.2, 0.3] },
  netOfGems: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.64, 0.12, 0.84], phase: [0.1, 0.25, 0.15] },
  organic: { mode: "rgb", amp: [0.42, 0.42, 0.04], freq: [1, 1, 1], offset: [0.47, 0.27, 0.27], phase: [0.41, 0.14, 0.11] },
  papaya: { mode: "rgb", amp: [0.65, 0.4, 0.11], freq: [1, 1, 1], offset: [0.72, 0.45, 0.08], phase: [0.71, 0.8, 0.84] },
  radioactive: { mode: "rgb", amp: [0.62, 0.79, 0.11], freq: [1, 1, 1], offset: [0.22, 0.56, 0.17], phase: [0.15, 0.1, 0.25] },
  royal: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.41, 0.22, 0.67], phase: [0.2, 0.25, 0.2] },
  santaCruz: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0.25, 0.5, 0.75] },
  sherbet: { mode: "rgb", amp: [0.6059281, 0.17591387, 0.17166573], freq: [1, 1, 1], offset: [0.5224456, 0.3864609, 0.36020845], phase: [0, 0.25, 0.5] },
  sherbetDouble: { mode: "rgb", amp: [0.6059281, 0.17591387, 0.17166573], freq: [2, 2, 2], offset: [0.5224456, 0.3864609, 0.36020845], phase: [0, 0.25, 0.5] },
  silvermane: { mode: "oklab", amp: [0.42, 0, 0], freq: [2, 2, 2], offset: [0.45, 0.5, 0.42], phase: [0.63, 1, 1] },
  skykissed: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.83, 0.6, 0.63], phase: [0.3, 0.1, 0] },
  solaris: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.6, 0.4, 0.1], phase: [0.3, 0.2, 0.1] },
  spooky: { mode: "oklab", amp: [0.46, 0.73, 0.19], freq: [1, 1, 1], offset: [0.27, 0.79, 0.78], phase: [0.27, 0.16, 0.04] },
  springtime: { mode: "rgb", amp: [0.67, 0.25, 0.27], freq: [1, 1, 1], offset: [0.74, 0.48, 0.46], phase: [0.07, 0.79, 0.39] },
  sproingtime: { mode: "rgb", amp: [0.9, 0.43, 0.34], freq: [1, 1, 1], offset: [0.56, 0.69, 0.32], phase: [0.03, 0.8, 0.4] },
  sulphur: { mode: "rgb", amp: [0.73, 0.36, 0.52], freq: [1, 1, 1], offset: [0.78, 0.68, 0.15], phase: [0.74, 0.93, 0.28] },
  summoning: { mode: "rgb", amp: [1, 0, 0.8], freq: [1, 1, 1], offset: [0, 0, 0], phase: [0, 0.5, 0.1] },
  superhero: { mode: "rgb", amp: [1, 0.25, 0.5], freq: [0.5, 0.5, 0.5], offset: [0, 0, 0.25], phase: [0.5, 0, 0] },
  toxic: { mode: "rgb", amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.26, 0.57, 0.03], phase: [0, 0.1, 0.3] },
  tropicalia: { mode: "oklab", amp: [0.28, 0.08, 0.65], freq: [1, 1, 1], offset: [0.48, 0.6, 0.03], phase: [0.1, 0.15, 0.3] },
  tungsten: { mode: "rgb", amp: [0.65, 0.93, 0.73], freq: [1, 1, 1], offset: [0.31, 0.21, 0.27], phase: [0.43, 0.45, 0.48] },
  vaporwave: { mode: "rgb", amp: [0.9, 0.76, 0.63], freq: [1, 1, 1], offset: [0, 0.19, 0.68], phase: [0.43, 0.23, 0.32] },
  vibrant: { mode: "rgb", amp: [0.78, 0.63, 0.68], freq: [1, 1, 1], offset: [0.41, 0.03, 0.16], phase: [0.81, 0.61, 0.06] },
  vintage: { mode: "rgb", amp: [0.97, 0.74, 0.23], freq: [1, 1, 1], offset: [0.97, 0.38, 0.35], phase: [0.34, 0.41, 0.44] },
  vintagePhoto: { mode: "rgb", amp: [0.68, 0.79, 0.57], freq: [1, 1, 1], offset: [0.56, 0.35, 0.14], phase: [0.73, 0.9, 0.99] }
};

// shaders/src/palettes.js
var TAU = Math.PI * 2;
var PALETTES = palettes_default;
var palettes_default2 = PALETTES;

// shaders/src/lang/std_enums.js
var paletteEnum = {};
Object.keys(palettes_default2).forEach((name, index) => {
  paletteEnum[name] = { type: "Number", value: index };
});
var oscKindEnum = {
  sine: { type: "Number", value: 0 },
  // 0 -> 1 -> 0
  tri: { type: "Number", value: 1 },
  // 0 -> 1 -> 0 (linear)
  saw: { type: "Number", value: 2 },
  // 0 -> 1
  sawInv: { type: "Number", value: 3 },
  // 1 -> 0
  square: { type: "Number", value: 4 },
  // on/off
  noise: { type: "Number", value: 5 },
  // periodic noise (alias for noise1d)
  noise1d: { type: "Number", value: 5 },
  // scrolling periodic noise
  noise2d: { type: "Number", value: 6 }
  // two-stage periodic noise
};
var midiModeEnum = {
  noteChange: { type: "Number", value: 0 },
  // value from note regardless of gate
  gateNote: { type: "Number", value: 1 },
  // value from note only while gate on
  gateVelocity: { type: "Number", value: 2 },
  // value from velocity only while gate on
  triggerNote: { type: "Number", value: 3 },
  // note value with time-based falloff
  velocity: { type: "Number", value: 4 }
  // velocity with time-based falloff (default)
};
var audioBandEnum = {
  low: { type: "Number", value: 0 },
  // Low frequency band (~0-200Hz)
  mid: { type: "Number", value: 1 },
  // Mid frequency band (~200-2000Hz)
  high: { type: "Number", value: 2 },
  // High frequency band (~2000Hz+)
  vol: { type: "Number", value: 3 }
  // Overall volume (average)
};
var stdEnums = {
  channel: {
    r: { type: "Number", value: 0 },
    g: { type: "Number", value: 1 },
    b: { type: "Number", value: 2 },
    a: { type: "Number", value: 3 }
  },
  color: {
    mono: { type: "Number", value: 0 },
    rgb: { type: "Number", value: 1 },
    hsv: { type: "Number", value: 2 }
  },
  oscType: {
    sine: { type: "Number", value: 0 },
    linear: { type: "Number", value: 1 },
    sawtooth: { type: "Number", value: 2 },
    sawtoothInv: { type: "Number", value: 3 },
    square: { type: "Number", value: 4 },
    noise1d: { type: "Number", value: 5 },
    noise2d: { type: "Number", value: 6 }
  },
  oscKind: oscKindEnum,
  midiMode: midiModeEnum,
  audioBand: audioBandEnum,
  palette: paletteEnum
};

// shaders/src/lang/ops.js
var ops = {};
function registerOp(name, spec) {
  ops[name] = spec;
}

// shaders/src/lang/enumPaths.js
function normalizeMemberPath(value) {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    const parts = value.filter((seg) => typeof seg === "string" && seg.length);
    return parts.length ? parts : null;
  }
  if (typeof value === "string") {
    const parts = value.split(".").map((seg) => seg.trim()).filter(Boolean);
    return parts.length ? parts : null;
  }
  if (typeof value === "number") {
    return [String(value)];
  }
  return null;
}
function pathStartsWith(path, prefix) {
  if (!Array.isArray(prefix) || !prefix.length) {
    return true;
  }
  if (!Array.isArray(path) || path.length < prefix.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}
function applyEnumPrefix(path, prefix) {
  if (!Array.isArray(path) || !path.length) {
    return path;
  }
  if (!Array.isArray(prefix) || !prefix.length) {
    return path.slice ? path.slice() : path;
  }
  if (pathStartsWith(path, prefix)) {
    return path.slice();
  }
  for (let i = 1; i < prefix.length; i++) {
    const suffix = prefix.slice(i);
    if (pathStartsWith(path, suffix)) {
      return prefix.slice(0, i).concat(path);
    }
  }
  return prefix.concat(path);
}

// shaders/src/lang/paramAliases.js
var ALIAS_EOL_DATE = "2026-09-01";
var registry = /* @__PURE__ */ Object.create(null);
function registerParamAliases(opName, aliases) {
  if (!registry[opName]) {
    registry[opName] = /* @__PURE__ */ Object.create(null);
  }
  Object.assign(registry[opName], aliases);
}
function resolveParamAliases(opName, kwargs) {
  const warnings = [];
  const aliases = registry[opName];
  if (!aliases) return warnings;
  for (const oldName in aliases) {
    if (!(oldName in kwargs)) continue;
    const newName = aliases[oldName];
    if (!(newName in kwargs)) {
      kwargs[newName] = kwargs[oldName];
    }
    delete kwargs[oldName];
    warnings.push(
      `param '${oldName}' is deprecated, use '${newName}' instead. Aliases will be removed on ${ALIAS_EOL_DATE}.`
    );
  }
  return warnings;
}

// shaders/src/lang/effectAliases.js
var registry2 = /* @__PURE__ */ Object.create(null);
function registerEffectAlias(oldOpName, newName) {
  registry2[oldOpName] = newName;
}
function checkEffectAlias(opName) {
  const newName = registry2[opName];
  if (!newName) return null;
  const oldName = opName.includes(".") ? opName.split(".").pop() : opName;
  return `effect '${oldName}' is deprecated, use '${newName}' instead. Aliases will be removed on ${ALIAS_EOL_DATE}.`;
}

// shaders/src/lang/validator.js
var ALLOWED_STRING_PARAMS = /* @__PURE__ */ new Set([
  "text.text",
  // Text content for text overlay effect
  "text.font",
  // Font family for text overlay effect
  "text.justify"
  // Text justification (left/center/right)
]);
var stateSurfaces = /* @__PURE__ */ new Set(["time", "frame", "mouse", "resolution", "seed", "a"]);
var stateValues = /* @__PURE__ */ new Set(["time", "frame", "mouse", "resolution", "seed", "a", "u1", "u2", "u3", "u4", "s1", "s2", "b1", "b2", "a1", "a2", "deltaTime"]);
var STARTER_OPS = /* @__PURE__ */ new Set();
var SURFACE_PASSTHROUGH_CALLS = /* @__PURE__ */ new Set(["read"]);
var validatorHooks = {};
function registerValidatorHook(name, hook) {
  if (typeof name === "string" && typeof hook === "function") {
    validatorHooks[name] = hook;
  }
}
function registerStarterOps(names = []) {
  if (!Array.isArray(names)) {
    return;
  }
  names.forEach((name) => {
    if (typeof name === "string" && name) {
      STARTER_OPS.add(name);
    }
  });
}
function isStarterOp(name) {
  if (typeof name !== "string") {
    return false;
  }
  if (name === "particles" || name === "render.particles") return false;
  if (STARTER_OPS.has(name)) {
    return true;
  }
  const parts = name.split(".");
  if (parts.length > 1) {
    const canonical = parts[parts.length - 1];
    if (STARTER_OPS.has(canonical)) {
      for (const op of STARTER_OPS) {
        if (op.endsWith("." + canonical)) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}
function clamp(value, min, max) {
  if (typeof min === "number" && value < min) return min;
  if (typeof max === "number" && value > max) return max;
  return value;
}
function toBoolean(value) {
  return typeof value === "number" ? value !== 0 : !!value;
}
function toSurface(arg) {
  if (!arg) return null;
  if (arg.type === "OutputRef") return { kind: "output", name: arg.name };
  if (arg.type === "SourceRef") return { kind: "source", name: arg.name };
  if (arg.type === "XyzRef") return { kind: "xyz", name: arg.name };
  if (arg.type === "VelRef") return { kind: "vel", name: arg.name };
  if (arg.type === "RgbaRef") return { kind: "rgba", name: arg.name };
  if (arg.type === "MeshRef") return { kind: "mesh", name: arg.name };
  if (arg.type === "Ident" && arg.name === "none") return { kind: "output", name: "none" };
  if (arg.type === "Ident" && stateSurfaces.has(arg.name)) return { kind: "state", name: arg.name };
  return null;
}
function callToSurface(node) {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (node.type === "Chain" && Array.isArray(node.chain) && node.chain.length === 1) {
    return callToSurface(node.chain[0]);
  }
  if (node.type !== "Call" || !SURFACE_PASSTHROUGH_CALLS.has(node.name)) {
    return null;
  }
  let target = null;
  if (Array.isArray(node.args) && node.args.length) {
    target = node.args[0];
  }
  if (!target && node.kwargs && typeof node.kwargs === "object") {
    target = node.kwargs.tex;
  }
  if (!target) {
    return null;
  }
  return toSurface(target);
}
function validate(ast) {
  const diagnosticsList = [];
  function pushDiag(code, node, message = diagnostics_default[code].message) {
    let enrichedMessage = message;
    const identName = extractIdentifierName(node);
    if (identName && !message.includes(identName) && !message.includes("'")) {
      enrichedMessage = `${message}: '${identName}'`;
    }
    let location = null;
    if (node?.loc) {
      location = { line: node.loc.line, column: node.loc.column };
    }
    diagnosticsList.push({
      code,
      message: enrichedMessage,
      severity: diagnostics_default[code].severity,
      nodeId: node?.id,
      ...location && { location },
      ...identName && { identifier: identName }
    });
  }
  function extractIdentifierName(node) {
    if (!node) return null;
    if (node.type === "Ident") return node.name;
    if (node.type === "Member" && Array.isArray(node.path)) return node.path.join(".");
    if (node.type === "Call") return node.name;
    if (node.type === "Func" && node.src) return `{${node.src.slice(0, 30)}${node.src.length > 30 ? "..." : ""}}`;
    if (node.name) return node.name;
    if (node.value) return String(node.value);
    return `[${node.type || "unknown"}]`;
  }
  const plans = [];
  const render = ast.render ? ast.render.name : null;
  let tempIndex = 0;
  const programSearchOrder = ast.namespace?.searchOrder;
  if (!programSearchOrder || programSearchOrder.length === 0) {
    throw new Error("Missing required 'search' directive. Every program must start with 'search <namespace>, ...' to specify namespace search order.");
  }
  const symbols = /* @__PURE__ */ new Map();
  function resolveEnum(path) {
    if (!Array.isArray(path) || path.length === 0) return void 0;
    let [head, ...rest] = path;
    let cur;
    if (symbols.has(head)) {
      cur = symbols.get(head);
      if (cur && (cur.type === "Number" || cur.type === "Boolean")) cur = cur.value;
    } else if (Object.prototype.hasOwnProperty.call(frozenEnums, head)) {
      cur = frozenEnums[head];
    } else if (Object.prototype.hasOwnProperty.call(stdEnums, head)) {
      cur = stdEnums[head];
    } else {
      return void 0;
    }
    for (const part of rest) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) {
        cur = cur[part];
      } else {
        return void 0;
      }
    }
    if (cur && (cur.type === "Number" || cur.type === "Boolean")) return cur.value;
    return cur;
  }
  function clone(node) {
    return node && typeof node === "object" ? JSON.parse(JSON.stringify(node)) : node;
  }
  function canResolveOpName(name) {
    for (const ns of programSearchOrder) {
      if (ops[`${ns}.${name}`]) return true;
    }
    return false;
  }
  function resolveCall(call) {
    if (symbols.has(call.name)) {
      const val = symbols.get(call.name);
      if (val.type === "Ident") {
        return { ...call, name: val.name };
      }
      if (val.type === "Call") {
        const mergedArgs = val.args ? val.args.slice() : [];
        const callArgs = call.args || [];
        for (let i = 0; i < callArgs.length; i++) {
          mergedArgs.push(callArgs[i]);
        }
        let mergedKw = val.kwargs ? { ...val.kwargs } : void 0;
        if (call.kwargs) {
          mergedKw = mergedKw || {};
          for (const [k, v] of Object.entries(call.kwargs)) mergedKw[k] = v;
        }
        const merged = { type: "Call", name: val.name, args: mergedArgs };
        if (mergedKw) merged.kwargs = mergedKw;
        if (call.namespace) {
          merged.namespace = { ...call.namespace };
        } else if (val.namespace) {
          merged.namespace = { ...val.namespace };
        }
        return merged;
      }
    }
    return call;
  }
  function firstChainCall(node) {
    if (!node || typeof node !== "object") return null;
    if (node.type === "Call") return node;
    if (node.type === "Chain") {
      const head = node.chain && node.chain[0];
      return head && head.type === "Call" ? head : null;
    }
    return null;
  }
  function getStarterInfo(node) {
    if (!node || typeof node !== "object") return null;
    if (node.type === "Call") {
      let name = node.name;
      if (node.namespace && node.namespace.resolved) {
        name = `${node.namespace.resolved}.${node.name}`;
      }
      return isStarterOp(name) ? { call: node, index: 0 } : null;
    }
    if (node.type === "Chain" && Array.isArray(node.chain)) {
      for (let i = 0; i < node.chain.length; i++) {
        const entry = node.chain[i];
        if (entry && entry.type === "Call") {
          let name = entry.name;
          if (entry.namespace && entry.namespace.resolved) {
            name = `${entry.namespace.resolved}.${entry.name}`;
          }
          if (isStarterOp(name)) {
            return { call: entry, index: i };
          }
        }
      }
    }
    return null;
  }
  function isStarterChain(node) {
    if (!node || node.type !== "Chain") return false;
    const starter = getStarterInfo(node);
    return !!(starter && starter.index === 0);
  }
  function substitute(node) {
    if (!node) return node;
    if (node.type === "Ident" && symbols.has(node.name)) {
      const result2 = substitute(clone(symbols.get(node.name)));
      if (result2 && typeof result2 === "object") {
        result2._varRef = node.name;
      }
      return result2;
    }
    if (node.type === "Chain") {
      const mapped = node.chain.map((c) => {
        const mappedArgs = c.args.map((a) => substitute(a));
        let mappedCall = { type: "Call", name: c.name, args: mappedArgs };
        if (c.kwargs) {
          const kw = {};
          for (const [k, v] of Object.entries(c.kwargs)) kw[k] = substitute(v);
          mappedCall.kwargs = kw;
        }
        return resolveCall(mappedCall);
      });
      return { type: "Chain", chain: mapped };
    }
    if (node.type === "Call") {
      const mappedArgs = node.args.map((a) => substitute(a));
      let mappedCall = { type: "Call", name: node.name, args: mappedArgs };
      if (node.kwargs) {
        const kw = {};
        for (const [k, v] of Object.entries(node.kwargs)) kw[k] = substitute(v);
        mappedCall.kwargs = kw;
      }
      return resolveCall(mappedCall);
    }
    return node;
  }
  if (Array.isArray(ast.vars)) {
    for (const v of ast.vars) {
      const expr = substitute(clone(v.expr));
      if (expr && isStarterChain(expr)) {
        const head = firstChainCall(expr);
        if (head) pushDiag("S006", head);
      }
      if (expr == null || expr.type === "Ident" && (expr.name === "null" || expr.name === "undefined")) {
        pushDiag("S004", v);
        continue;
      }
      if (expr.type === "Ident" && !symbols.has(expr.name) && !stateValues.has(expr.name) && !ops[expr.name] && !canResolveOpName(expr.name)) {
        pushDiag("S003", expr);
        continue;
      }
      if (expr.type === "Chain" && expr.chain.length === 1) {
        symbols.set(v.name, expr.chain[0]);
      } else if (expr.type === "Member") {
        const resolved = resolveEnum(expr.path);
        if (typeof resolved === "number") {
          symbols.set(v.name, { type: "Number", value: resolved });
        } else if (resolved !== void 0) {
          symbols.set(v.name, resolved);
        } else {
          symbols.set(v.name, expr);
        }
      } else {
        symbols.set(v.name, expr);
      }
    }
  }
  function evalExpr(node) {
    const expr = substitute(clone(node));
    if (expr && isStarterChain(expr)) {
      const head = firstChainCall(expr);
      if (head) pushDiag("S006", head);
    }
    if (expr && expr.type === "Member") {
      const resolved = resolveEnum(expr.path);
      if (typeof resolved === "number") return { type: "Number", value: resolved };
      if (resolved !== void 0) return resolved;
    }
    return expr;
  }
  function evalCondition(node) {
    const expr = evalExpr(node);
    if (!expr) return false;
    if (expr.type === "Number") return toBoolean(expr.value);
    if (expr.type === "Boolean") return !!expr.value;
    if (expr.type === "Func") {
      try {
        const fn = new Function("state", `with(state){ return ${expr.src}; }`);
        return { fn: (state) => toBoolean(fn(state)) };
      } catch {
        pushDiag("S001", expr, `Invalid function expression: '${expr.src?.slice(0, 50) || "unknown"}'`);
        return false;
      }
    }
    if (expr.type === "Ident") {
      if (symbols.has(expr.name)) return evalCondition(symbols.get(expr.name));
      if (stateValues.has(expr.name)) {
        const key = expr.name;
        return { fn: (state) => toBoolean(state[key]) };
      }
      pushDiag("S003", expr);
      return false;
    }
    if (expr.type === "Member") {
      const cur = resolveEnum(expr.path);
      if (typeof cur === "number") return toBoolean(cur);
      if (cur !== void 0) return toBoolean(cur);
      pushDiag("S001", expr, `Unknown enum path: '${expr.path?.join(".") || "unknown"}'`);
      return false;
    }
    return false;
  }
  function buildNamespaceSnapshot(callNamespace) {
    if (!callNamespace || typeof callNamespace !== "object") {
      return null;
    }
    const snapshot = {
      call: {
        name: typeof callNamespace.name === "string" ? callNamespace.name : null,
        resolved: typeof callNamespace.resolved === "string" ? callNamespace.resolved : null,
        explicit: !!callNamespace.explicit,
        source: typeof callNamespace.source === "string" ? callNamespace.source : null
      }
    };
    if (Array.isArray(callNamespace.searchOrder)) {
      snapshot.call.searchOrder = Object.freeze(callNamespace.searchOrder.slice());
    }
    if (callNamespace.fromOverride) {
      snapshot.call.fromOverride = true;
    }
    if (callNamespace.resolved) {
      snapshot.resolved = callNamespace.resolved;
    }
    return Object.freeze(snapshot);
  }
  function compileChainStatement(stmt) {
    const chain = [];
    const chainNode = { type: "Chain", chain: stmt.chain };
    const hasWrite = stmt.write || stmt.write3d;
    if (!hasWrite && isStarterChain(chainNode)) {
      pushDiag("S006", stmt.chain[0]);
    }
    if (!hasWrite) {
      pushDiag("S001", stmt.chain[0], "Chain must have explicit write() or write3d() target");
      return null;
    }
    const writeName = stmt.write ? stmt.write.name : null;
    const write3dTarget = stmt.write3d ? {
      tex3d: { kind: "vol", name: stmt.write3d.tex3d?.name || stmt.write3d.tex3d },
      geo: { kind: "geo", name: stmt.write3d.geo?.name || stmt.write3d.geo }
    } : null;
    const states = [];
    function processChain(calls, input, options = {}) {
      const allowStarterless = options.allowStarterless === true;
      let current = input;
      for (const original of calls) {
        if (original.type === "Read") {
          if (current !== null) {
            pushDiag("S001", original, "read() is a starter node and cannot be chained inline. Use standalone read() to start a new chain.");
            continue;
          }
          const surface = toSurface(original.surface);
          if (!surface) {
            pushDiag("S001", original, "read() requires a valid surface reference");
            continue;
          }
          const idx2 = tempIndex++;
          const stepArgs = { tex: surface };
          if (original._skip === true) {
            stepArgs._skip = true;
          }
          const step2 = {
            op: "_read",
            args: stepArgs,
            from: null,
            temp: idx2,
            builtin: true
          };
          if (original.leadingComments) {
            step2.leadingComments = original.leadingComments;
          }
          chain.push(step2);
          current = idx2;
          continue;
        }
        if (original.type === "Read3D" && original.geo) {
          if (current !== null) {
            pushDiag("S001", original, "read3d() is a starter node and cannot be chained inline. Use standalone read3d() to start a new chain.");
            continue;
          }
          const tex3d = original.tex3d?.name ? {
            kind: original.tex3d.type === "VolRef" ? "vol" : "tex3d",
            name: original.tex3d.name
          } : null;
          const geo = original.geo?.name ? {
            kind: original.geo.type === "GeoRef" ? "geo" : "geo",
            name: original.geo.name
          } : null;
          if (!tex3d || !geo) {
            pushDiag("S001", original, "read3d() as starter requires tex3d and geo references");
            continue;
          }
          const idx2 = tempIndex++;
          const stepArgs = { tex3d, geo };
          if (original._skip === true) {
            stepArgs._skip = true;
          }
          const step2 = {
            op: "_read3d",
            args: stepArgs,
            from: null,
            temp: idx2,
            builtin: true
          };
          if (original.leadingComments) {
            step2.leadingComments = original.leadingComments;
          }
          chain.push(step2);
          current = idx2;
          continue;
        }
        if (original.type === "Write") {
          const surface = toSurface(original.surface);
          if (!surface) {
            pushDiag("S001", original, "write() requires a valid surface reference");
            continue;
          }
          if (current === null) {
            pushDiag("S005", original, "write() requires an input - cannot be first in chain");
            continue;
          }
          const idx2 = tempIndex++;
          const step2 = {
            op: "_write",
            args: { tex: surface },
            from: current,
            temp: idx2,
            builtin: true
          };
          if (original.leadingComments) {
            step2.leadingComments = original.leadingComments;
          }
          chain.push(step2);
          current = idx2;
          continue;
        }
        if (original.type === "Write3D") {
          const tex3d = original.tex3d?.name ? {
            kind: original.tex3d.type === "VolRef" ? "vol" : "tex3d",
            name: original.tex3d.name
          } : null;
          const geo = original.geo?.name ? {
            kind: original.geo.type === "GeoRef" ? "geo" : "geo",
            name: original.geo.name
          } : null;
          if (!tex3d || !geo) {
            pushDiag("S001", original, "write3d() requires tex3d and geo references");
            continue;
          }
          if (current === null) {
            pushDiag("S005", original, "write3d() requires an input - cannot be first in chain");
            continue;
          }
          const idx2 = tempIndex++;
          const step2 = {
            op: "_write3d",
            args: { tex3d, geo },
            from: current,
            temp: idx2,
            builtin: true
          };
          if (original.leadingComments) {
            step2.leadingComments = original.leadingComments;
          }
          chain.push(step2);
          current = idx2;
          continue;
        }
        if (original.type === "Subchain") {
          if (current === null) {
            pushDiag("S005", original, "subchain() requires an input - cannot be first in chain");
            continue;
          }
          const beginIdx = tempIndex++;
          const beginStep = {
            op: "_subchain_begin",
            args: {
              name: original.name || null,
              id: original.id || null
            },
            from: current,
            temp: beginIdx,
            builtin: true
          };
          if (original.leadingComments) {
            beginStep.leadingComments = original.leadingComments;
          }
          chain.push(beginStep);
          current = beginIdx;
          current = processChain(original.body, current);
          const endIdx = tempIndex++;
          const endStep = {
            op: "_subchain_end",
            args: {
              name: original.name || null,
              id: original.id || null
            },
            from: current,
            temp: endIdx,
            builtin: true
          };
          chain.push(endStep);
          current = endIdx;
          continue;
        }
        const call = resolveCall({ ...original });
        const effectiveNamespace = call.namespace || { searchOrder: programSearchOrder };
        let opName = null;
        let spec = null;
        const candidateNames = [];
        if (call.namespace && call.namespace.resolved) {
          candidateNames.push(`${call.namespace.resolved}.${call.name}`);
        }
        const searchOrder = effectiveNamespace.searchOrder;
        if (Array.isArray(searchOrder)) {
          for (const ns of searchOrder) {
            candidateNames.push(`${ns}.${call.name}`);
          }
        }
        for (const candidate of candidateNames) {
          if (candidate && ops[candidate]) {
            opName = candidate;
            spec = ops[candidate];
            break;
          }
        }
        if (!spec) {
          pushDiag("S001", original, `Unknown effect: '${call.name}'`);
          continue;
        }
        const effectAliasWarning = checkEffectAlias(opName);
        if (effectAliasWarning) {
          pushDiag("S008", original, effectAliasWarning);
        }
        if (opName === "prev") {
          const idx2 = tempIndex++;
          const args2 = { tex: { kind: "output", name: writeName } };
          const namespaceSnapshot2 = buildNamespaceSnapshot(call.namespace);
          const step2 = { op: opName, args: args2, from: current, temp: idx2 };
          if (namespaceSnapshot2) {
            step2.namespace = namespaceSnapshot2;
          }
          if (original.leadingComments) {
            step2.leadingComments = original.leadingComments;
          }
          chain.push(step2);
          current = idx2;
          continue;
        }
        const isStarter = isStarterOp(opName);
        const starterlessRoot = current === null;
        const allowPassthroughRoot = allowStarterless && SURFACE_PASSTHROUGH_CALLS.has(opName);
        if (starterlessRoot && !isStarter && !allowPassthroughRoot) {
          pushDiag("S005", original);
          continue;
        }
        const starterHasInput = !!(isStarter && current !== null);
        const fromInput = starterHasInput ? null : current;
        if (starterHasInput) {
          pushDiag("S005", original);
        }
        const args = {};
        let argSources = null;
        const kw = call.kwargs;
        if (kw) {
          const aliasWarnings = resolveParamAliases(opName, kw);
          for (const w of aliasWarnings) {
            pushDiag("S007", call, w);
          }
        }
        const seen = /* @__PURE__ */ new Set();
        const specArgs = spec.args || [];
        for (let i = 0; i < specArgs.length; i++) {
          const def = specArgs[i];
          let node = kw && kw[def.name] !== void 0 ? kw[def.name] : call.args[i];
          node = substitute(node);
          const argKey = def.name;
          if (!kw && node && node.type === "Color" && def.type !== "color" && def.name === "r" && specArgs[i + 1]?.name === "g" && specArgs[i + 2]?.name === "b") {
            const [r, g, b] = node.value;
            args[argKey] = r;
            const defG = specArgs[i + 1];
            args[defG.name] = g;
            const defB = specArgs[i + 2];
            args[defB.name] = b;
            i += 2;
            continue;
          }
          if (kw && kw[def.name] !== void 0) seen.add(def.name);
          if (node && node.type === "ArrayLiteral") {
            const value = [];
            for (const el of node.elements) {
              if (el.type === "Number") {
                value.push(el.value);
              } else {
                pushDiag("S002", el, `Array element must be a number for '${def.name}' in ${call.name}()`);
                value.push(0);
              }
            }
            args[argKey] = value;
            argSources = argSources || {};
            argSources[argKey] = "array";
            continue;
          }
          if (def.type === "surface") {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for surface parameter '${def.name}'`);
              args[argKey] = def.default ? toSurface({ type: "Ident", name: def.default }) : null;
              continue;
            }
            let surf = null;
            let invalidStarterChain = false;
            const starter = node ? getStarterInfo(node) : null;
            if (node && node.type === "Read" && node.surface) {
              surf = toSurface(node.surface);
            }
            const inlineSurface = surf || callToSurface(node);
            if (inlineSurface) {
              surf = inlineSurface;
            } else if (node && node.type === "Chain") {
              const idx2 = processChain(node.chain, null, { allowStarterless: true });
              if (idx2 !== null && idx2 !== void 0) {
                surf = { kind: "temp", index: idx2 };
              }
            } else if (node && node.type === "Call") {
              const idx2 = processChain([node], null, { allowStarterless: true });
              if (idx2 !== null && idx2 !== void 0) {
                surf = { kind: "temp", index: idx2 };
              }
            } else if (starter) {
              pushDiag("S005", starter.call);
              invalidStarterChain = true;
            } else {
              surf = toSurface(node);
            }
            if (!surf) {
              if (invalidStarterChain) {
                args[argKey] = surf;
                continue;
              }
              if (!def.default) {
                if (!node) {
                  pushDiag("S001", call, `Missing required surface argument '${def.name}' for ${call.name}()`);
                } else if (node.type === "Ident" && !symbols.has(node.name)) {
                  pushDiag("S003", node, `Undefined variable '${node.name}' for '${def.name}' in ${call.name}()`);
                } else {
                  const nodeName = node.name || node.path?.join(".") || node.value || node.type || "invalid";
                  pushDiag("S001", node, `Invalid surface reference '${nodeName}' for '${def.name}' in ${call.name}()`);
                }
              }
              if (def.default) {
                surf = toSurface({ type: "Ident", name: def.default }) || { kind: "pipeline", name: def.default };
              }
            }
            args[argKey] = surf;
          } else if (def.type === "color") {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for color parameter '${def.name}'`);
              args[argKey] = def.default;
              continue;
            }
            let value;
            if (node && node.type === "Color") {
              value = node.hex || node.value;
            } else {
              if (node && node.type && node.type !== "Ident") {
                pushDiag("S002", node, `Argument out of range for '${def.name}' in ${call.name}()`);
              }
              value = def.default;
            }
            args[argKey] = value;
          } else if (def.type === "vec3") {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for vec3 parameter '${def.name}'`);
              args[argKey] = def.default ? def.default.slice() : [0, 0, 0];
              continue;
            }
            let value;
            if (node && node.type === "Call" && node.name === "vec3" && node.args && node.args.length === 3) {
              value = [];
              for (const arg of node.args) {
                if (arg.type === "Number") {
                  value.push(arg.value);
                } else {
                  pushDiag("S002", arg, `Argument out of range for '${def.name}' in ${call.name}()`);
                  value.push(0);
                }
              }
            } else if (node && node.type === "Color") {
              value = node.value.slice(0, 3);
            } else {
              if (node && node.type && node.type !== "Ident") {
                pushDiag("S002", node, `Argument out of range for '${def.name}' in ${call.name}()`);
              }
              value = def.default ? def.default.slice() : [0, 0, 0];
            }
            args[argKey] = value;
          } else if (def.type === "vec4") {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for vec4 parameter '${def.name}'`);
              args[argKey] = def.default ? def.default.slice() : [0, 0, 0, 1];
              continue;
            }
            let value;
            if (node && node.type === "Call" && node.name === "vec4" && node.args && node.args.length === 4) {
              value = [];
              for (const arg of node.args) {
                if (arg.type === "Number") {
                  value.push(arg.value);
                } else {
                  pushDiag("S002", arg, `Argument out of range for '${def.name}' in ${call.name}()`);
                  value.push(0);
                }
              }
            } else if (node && node.type === "Color") {
              value = node.value.slice();
            } else {
              if (node && node.type && node.type !== "Ident") {
                pushDiag("S002", node, `Argument out of range for '${def.name}' in ${call.name}()`);
              }
              value = def.default ? def.default.slice() : [0, 0, 0, 1];
            }
            args[argKey] = value;
          } else if (def.type === "boolean") {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for boolean parameter '${def.name}'`);
              args[argKey] = def.default !== void 0 ? !!def.default : false;
              continue;
            }
            let value;
            if (node && node.type === "Boolean") {
              value = !!node.value;
            } else if (node && node.type === "Number") {
              value = node.value !== 0;
            } else if (node && node.type === "Func") {
              try {
                const fn = new Function("state", `with(state){ return ${node.src}; }`);
                value = { fn: (state) => !!fn(state) };
              } catch {
                pushDiag("S001", node, `Invalid function for '${def.name}': '${node.src?.slice(0, 50) || "unknown"}'`);
                value = def.default !== void 0 ? !!def.default : false;
              }
            } else if (node && node.type === "Ident" && stateValues.has(node.name)) {
              const key = node.name;
              value = { fn: (state) => !!state[key] };
            } else {
              if (node && node.type === "Ident" && !stateValues.has(node.name)) {
                pushDiag("S003", node);
              } else if (node && node.type && node.type !== "Ident") {
                pushDiag("S002", node, `Argument out of range for '${def.name}' in ${call.name}()`);
              }
              value = def.default !== void 0 ? !!def.default : false;
            }
            args[argKey] = value;
          } else if (def.type === "member") {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for member/enum parameter '${def.name}'`);
              args[argKey] = def.default;
              continue;
            }
            const prefix = normalizeMemberPath(def.enumPath || def.enum);
            let path = null;
            if (node && node.type === "Member") {
              path = normalizeMemberPath(node.path);
            } else if (node && (node.type === "Number" || node.type === "Boolean")) {
              args[argKey] = node.type === "Boolean" ? node.value ? 1 : 0 : node.value;
              continue;
            } else if (node && node.type === "Ident" && stateValues.has(node.name)) {
              const key = node.name;
              args[argKey] = { fn: (state) => state[key] };
              continue;
            } else if (node && node.type === "Ident") {
              path = [node.name];
            }
            if (!path) {
              path = normalizeMemberPath(def.default);
            }
            let resolved = path ? resolveEnum(path) : void 0;
            if (resolved && resolved.type === "Number") {
              resolved = resolved.value;
            }
            if (resolved && resolved.type === "Boolean") {
              resolved = resolved.value ? 1 : 0;
            }
            if (typeof resolved !== "number") {
              path = applyEnumPrefix(path || [], prefix);
              if (prefix && path && !pathStartsWith(path, prefix)) {
                pushDiag("S001", node || call, `Invalid enum value for '${def.name}': expected path starting with '${prefix.join(".")}'`);
                path = prefix.slice();
              }
              resolved = path ? resolveEnum(path) : void 0;
              if (resolved && resolved.type === "Number") {
                resolved = resolved.value;
              }
              if (resolved && resolved.type === "Boolean") {
                resolved = resolved.value ? 1 : 0;
              }
            }
            if (typeof resolved !== "number") {
              const fallback = normalizeMemberPath(def.default);
              let fallbackValue = fallback ? resolveEnum(fallback) : void 0;
              if (fallbackValue && fallbackValue.type === "Number") {
                fallbackValue = fallbackValue.value;
              }
              if (fallbackValue && fallbackValue.type === "Boolean") {
                fallbackValue = fallbackValue.value ? 1 : 0;
              }
              if (typeof fallbackValue === "number") {
                resolved = fallbackValue;
              } else {
                resolved = 0;
              }
            }
            args[argKey] = resolved;
            if (node && node.type === "Member" && path) {
              node.path = path.slice();
            }
          } else if (def.type === "volume") {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for volume parameter '${def.name}'`);
              args[argKey] = def.default ? { kind: "vol", name: def.default } : null;
              continue;
            }
            let value = null;
            if (node && node.type === "Read3D" && node.tex3d && !node.geo) {
              const volName = node.tex3d.name;
              if (/^vol[0-7]$/.test(volName)) {
                value = { kind: "vol", name: volName };
              } else {
                pushDiag("S001", node, `Invalid volume reference '${volName}' in read3d() for '${def.name}' - expected vol0-vol7`);
                value = def.default ? { kind: "vol", name: def.default } : null;
              }
            } else if (node && node.type === "VolRef") {
              value = { kind: "vol", name: node.name };
            } else if (node && node.type === "Ident") {
              if (node.name === "none") {
                value = { kind: "vol", name: "none" };
              } else if (/^vol[0-7]$/.test(node.name)) {
                value = { kind: "vol", name: node.name };
              } else {
                pushDiag("S001", node, `Invalid volume reference '${node.name}' for '${def.name}' - expected vol0-vol7 or none`);
                value = def.default ? { kind: "vol", name: def.default } : null;
              }
            } else if (!node && def.default) {
              value = { kind: "vol", name: def.default };
            }
            args[argKey] = value;
          } else if (def.type === "geometry") {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for geometry parameter '${def.name}'`);
              args[argKey] = def.default ? { kind: "geo", name: def.default } : null;
              continue;
            }
            let value = null;
            if (node && node.type === "Read3D" && node.tex3d && !node.geo) {
              const geoName = node.tex3d.name;
              if (/^geo[0-7]$/.test(geoName)) {
                value = { kind: "geo", name: geoName };
              } else {
                pushDiag("S001", node, `Invalid geometry reference '${geoName}' in read3d() for '${def.name}' - expected geo0-geo7`);
                value = def.default ? { kind: "geo", name: def.default } : null;
              }
            } else if (node && node.type === "GeoRef") {
              value = { kind: "geo", name: node.name };
            } else if (node && node.type === "Ident") {
              if (node.name === "none") {
                value = { kind: "geo", name: "none" };
              } else if (/^geo[0-7]$/.test(node.name)) {
                value = { kind: "geo", name: node.name };
              } else {
                pushDiag("S001", node, `Invalid geometry reference '${node.name}' for '${def.name}' - expected geo0-geo7 or none`);
                value = def.default ? { kind: "geo", name: def.default } : null;
              }
            } else if (!node && def.default) {
              value = { kind: "geo", name: def.default };
            }
            args[argKey] = value;
          } else if (def.type === "string") {
            const funcName = opName.includes(".") ? opName.split(".").pop() : opName;
            const allowlistKey = `${funcName}.${def.name}`;
            if (!ALLOWED_STRING_PARAMS.has(allowlistKey)) {
              pushDiag("S001", node || original, `String parameter '${def.name}' on effect '${funcName}' is NOT in the allowed string params list. String params are strictly controlled - use enums or choices instead.`);
              args[argKey] = def.default;
              continue;
            }
            let value;
            if (node && node.type === "String") {
              value = node.value;
            } else if (node && node.type === "Ident" && def.choices) {
              if (def.choices[node.name] !== void 0) {
                value = def.choices[node.name];
              } else {
                pushDiag("S001", node, `Invalid choice '${node.name}' for string parameter '${def.name}'`);
                value = def.default;
              }
            } else if (node) {
              pushDiag("S001", node, `String parameter '${def.name}' requires a quoted string literal, got ${node.type}`);
              value = def.default;
            } else {
              value = def.default;
            }
            args[argKey] = value;
          } else {
            if (node && node.type === "String") {
              pushDiag("S001", node, `String literal not allowed for numeric parameter '${def.name}' - strings are only valid for type: "string" parameters`);
              args[argKey] = def.default;
              continue;
            }
            let value;
            if (node && (node.type === "Number" || node.type === "Boolean")) {
              value = node.type === "Boolean" ? node.value ? 1 : 0 : node.value;
              const clamped = clamp(value, def.min, def.max);
              if (clamped !== value) {
                pushDiag("S002", node, `Argument out of range for '${def.name}' in ${call.name}() (got ${value}, clamped to ${clamped})`);
              }
              value = clamped;
              if (node._varRef) {
                value = { _varRef: node._varRef, value };
              }
            } else if (node && node.type === "Func") {
              try {
                const fn = new Function("state", `with(state){ return ${node.src}; }`);
                value = { fn, min: def.min, max: def.max };
              } catch {
                pushDiag("S001", node, `Invalid function for '${def.name}': '${node.src?.slice(0, 50) || "unknown"}'`);
                value = def.default;
              }
            } else if (node && node.type === "Oscillator") {
              const oscTypeNode = node.oscType;
              let oscTypeValue = 0;
              if (oscTypeNode && oscTypeNode.type === "Member") {
                const resolved = resolveEnum(oscTypeNode.path);
                if (typeof resolved === "number") {
                  oscTypeValue = resolved;
                } else if (resolved && resolved.type === "Number") {
                  oscTypeValue = resolved.value;
                }
              } else if (oscTypeNode && oscTypeNode.type === "Ident") {
                const resolved = resolveEnum(["oscKind", oscTypeNode.name]);
                if (typeof resolved === "number") {
                  oscTypeValue = resolved;
                } else if (resolved && resolved.type === "Number") {
                  oscTypeValue = resolved.value;
                }
              }
              const resolveOscParam = (param) => {
                if (!param) return void 0;
                if (param.type === "Number") return param.value;
                if (param.type === "Boolean") return param.value ? 1 : 0;
                if (param.type === "Member") {
                  const r = resolveEnum(param.path);
                  if (typeof r === "number") return r;
                  if (r && r.type === "Number") return r.value;
                }
                return void 0;
              };
              value = {
                type: "Oscillator",
                oscType: oscTypeValue,
                min: Math.max(0, Math.min(1, resolveOscParam(node.min) ?? 0)),
                max: Math.max(0, Math.min(1, resolveOscParam(node.max) ?? 1)),
                speed: resolveOscParam(node.speed) ?? 1,
                offset: resolveOscParam(node.offset) ?? 0,
                seed: resolveOscParam(node.seed) ?? 1,
                // Keep original AST for unparsing
                _ast: node,
                // Preserve variable reference marker for unparser round-trip
                ...node._varRef && { _varRef: node._varRef }
              };
            } else if (node && node.type === "Midi") {
              const modeNode = node.mode;
              let modeValue = 4;
              if (modeNode && modeNode.type === "Member") {
                const resolved = resolveEnum(modeNode.path);
                if (typeof resolved === "number") {
                  modeValue = resolved;
                } else if (resolved && resolved.type === "Number") {
                  modeValue = resolved.value;
                }
              } else if (modeNode && modeNode.type === "Ident") {
                const resolved = resolveEnum(["midiMode", modeNode.name]);
                if (typeof resolved === "number") {
                  modeValue = resolved;
                } else if (resolved && resolved.type === "Number") {
                  modeValue = resolved.value;
                }
              }
              const resolveMidiParam = (param) => {
                if (!param) return void 0;
                if (param.type === "Number") return param.value;
                if (param.type === "Boolean") return param.value ? 1 : 0;
                if (param.type === "Member") {
                  const r = resolveEnum(param.path);
                  if (typeof r === "number") return r;
                  if (r && r.type === "Number") return r.value;
                }
                return void 0;
              };
              value = {
                type: "Midi",
                channel: resolveMidiParam(node.channel) ?? 1,
                mode: modeValue,
                min: Math.max(0, Math.min(1, resolveMidiParam(node.min) ?? 0)),
                max: Math.max(0, Math.min(1, resolveMidiParam(node.max) ?? 1)),
                sensitivity: resolveMidiParam(node.sensitivity) ?? 1,
                // Keep original AST for unparsing
                _ast: node,
                // Preserve variable reference marker for unparser round-trip
                ...node._varRef && { _varRef: node._varRef }
              };
            } else if (node && node.type === "Audio") {
              const bandNode = node.band;
              let bandValue = 0;
              if (bandNode && bandNode.type === "Member") {
                const resolved = resolveEnum(bandNode.path);
                if (typeof resolved === "number") {
                  bandValue = resolved;
                } else if (resolved && resolved.type === "Number") {
                  bandValue = resolved.value;
                }
              } else if (bandNode && bandNode.type === "Ident") {
                const resolved = resolveEnum(["audioBand", bandNode.name]);
                if (typeof resolved === "number") {
                  bandValue = resolved;
                } else if (resolved && resolved.type === "Number") {
                  bandValue = resolved.value;
                }
              }
              const resolveAudioParam = (param) => {
                if (!param) return void 0;
                if (param.type === "Number") return param.value;
                if (param.type === "Boolean") return param.value ? 1 : 0;
                if (param.type === "Member") {
                  const r = resolveEnum(param.path);
                  if (typeof r === "number") return r;
                  if (r && r.type === "Number") return r.value;
                }
                return void 0;
              };
              value = {
                type: "Audio",
                band: bandValue,
                min: Math.max(0, Math.min(1, resolveAudioParam(node.min) ?? 0)),
                max: Math.max(0, Math.min(1, resolveAudioParam(node.max) ?? 1)),
                // Keep original AST for unparsing
                _ast: node,
                // Preserve variable reference marker for unparser round-trip
                ...node._varRef && { _varRef: node._varRef }
              };
            } else if (node && node.type === "Member") {
              const cur = resolveEnum(node.path);
              if (typeof cur === "number") {
                value = clamp(cur, def.min, def.max);
                if (value !== cur) {
                  pushDiag("S002", node, `Argument out of range for '${def.name}' in ${call.name}() (got ${cur}, clamped to ${value})`);
                }
              } else if (typeof cur === "boolean") {
                const num = cur ? 1 : 0;
                value = clamp(num, def.min, def.max);
                if (value !== num) {
                  pushDiag("S002", node, `Argument out of range for '${def.name}' in ${call.name}() (got ${num}, clamped to ${value})`);
                }
              } else {
                pushDiag("S001", node, `Cannot resolve enum value for '${def.name}': '${node?.path?.join(".") || node?.name || "unknown"}'`);
                value = def.default;
              }
            } else if (node && node.type === "Ident" && stateValues.has(node.name)) {
              const key = node.name;
              value = { fn: (state) => state[key], min: def.min, max: def.max };
            } else if (node && node.type === "Ident" && def.enum) {
              const prefix = normalizeMemberPath(def.enum);
              const path = prefix ? prefix.concat([node.name]) : [node.name];
              const resolved = resolveEnum(path);
              if (typeof resolved === "number") {
                value = clamp(resolved, def.min, def.max);
              } else if (resolved && resolved.type === "Number") {
                value = clamp(resolved.value, def.min, def.max);
              } else {
                pushDiag("S003", node);
                value = def.default;
              }
            } else if (node && node.type === "Ident" && def.choices) {
              const choiceVal = def.choices[node.name];
              if (typeof choiceVal === "number") {
                value = clamp(choiceVal, def.min, def.max);
              } else {
                pushDiag("S003", node);
                value = def.default;
              }
            } else {
              if (node && node.type === "Ident" && !stateValues.has(node.name)) {
                pushDiag("S003", node);
              } else if (node && node.type && node.type !== "Ident") {
                pushDiag("S002", node, `Argument out of range for '${def.name}' in ${call.name}()`);
              }
              if (def.defaultFrom) {
                const ref = spec.args.find((d) => d.name === def.defaultFrom);
                const refKey = ref ? ref.name : def.defaultFrom;
                if (args[refKey] !== void 0) {
                  value = args[refKey];
                } else {
                  value = def.default;
                }
              } else {
                value = def.default;
              }
            }
            args[argKey] = value;
          }
        }
        if (kw && kw._skip !== void 0) {
          const skipNode = kw._skip;
          if (skipNode && skipNode.type === "Boolean") {
            args._skip = skipNode.value;
          } else {
            args._skip = false;
          }
          seen.add("_skip");
        }
        if (kw) {
          for (const key of Object.keys(kw)) {
            if (!seen.has(key)) {
              pushDiag("S001", kw[key], `Unknown argument '${key}' for ${call.name}()`);
            }
          }
        }
        const hook = typeof call.name === "string" ? validatorHooks[call.name] : null;
        if (typeof hook === "function") {
          const starterInfo = getStarterInfo(original);
          const hookResult = hook({
            call,
            originalCall: original,
            args,
            writeName,
            from: fromInput,
            allocateTemp: () => tempIndex++,
            addStep: (step2) => {
              if (step2 && typeof step2 === "object") {
                chain.push(step2);
              }
            },
            addState: (state) => {
              if (state && typeof state === "object") {
                states.push(state);
              }
            },
            pushDiagnostic: pushDiag,
            states,
            starter: starterInfo
          });
          if (hookResult && hookResult.handled) {
            if (hookResult.current !== void 0 && hookResult.current !== null) {
              current = hookResult.current;
            }
            continue;
          }
        }
        const idx = tempIndex++;
        const namespaceSnapshot = buildNamespaceSnapshot(call.namespace);
        const step = { op: opName, args, from: fromInput, temp: idx };
        if (namespaceSnapshot) {
          step.namespace = namespaceSnapshot;
        }
        if (original.leadingComments) {
          step.leadingComments = original.leadingComments;
        }
        if (original.kwargs && Object.keys(original.kwargs).length > 0) {
          step.rawKwargs = original.kwargs;
        }
        if (argSources) {
          step.argSources = argSources;
        }
        chain.push(step);
        current = idx;
      }
      return current;
    }
    const finalIndex = processChain(stmt.chain, null);
    let writeSurf = null;
    if (stmt.write) {
      writeSurf = { kind: "output", name: stmt.write.name };
    }
    const plan = { chain, write: writeSurf, write3d: write3dTarget, final: finalIndex, states };
    if (stmt.leadingComments) {
      plan.leadingComments = stmt.leadingComments;
    }
    return plan;
  }
  function compileBlock(body) {
    const result2 = [];
    for (const s of body || []) {
      const compiled = compileStmt(s);
      if (compiled) result2.push(compiled);
    }
    return result2;
  }
  function compileStmt(stmt) {
    if (stmt.type === "IfStmt") {
      const cond = evalCondition(stmt.condition);
      const thenBranch = compileBlock(stmt.then);
      const elif = [];
      for (const e of stmt.elif || []) {
        elif.push({ cond: evalCondition(e.condition), then: compileBlock(e.then) });
      }
      const elseBranch = compileBlock(stmt.else);
      return { type: "Branch", cond, then: thenBranch, elif, else: elseBranch };
    }
    if (stmt.type === "Break") {
      return { type: "Break" };
    }
    if (stmt.type === "Continue") {
      return { type: "Continue" };
    }
    if (stmt.type === "Return") {
      const node = { type: "Return" };
      if (stmt.value) node.value = evalExpr(stmt.value);
      return node;
    }
    return compileChainStatement(stmt);
  }
  for (const stmt of ast.plans || []) {
    const compiled = compileStmt(stmt);
    if (compiled) plans.push(compiled);
  }
  const vars = ast.vars || [];
  const searchNamespaces = programSearchOrder || [];
  const result = { plans, diagnostics: diagnosticsList, render, vars, searchNamespaces };
  if (ast.trailingComments) {
    result.trailingComments = ast.trailingComments;
  }
  return result;
}

// shaders/src/lang/unparser.js
var oscKindNames = ["sine", "tri", "saw", "sawInv", "square", "noise1d", "noise2d"];
var midiModeNames = ["noteChange", "gateNote", "gateVelocity", "triggerNote", "velocity"];
var audioBandNames = ["low", "mid", "high", "vol"];
function formatOscillator(osc) {
  const typeName = oscKindNames[osc.oscType] || "sine";
  const parts = [`type: oscKind.${typeName}`];
  if (osc.min !== 0) {
    parts.push(`min: ${osc.min}`);
  }
  if (osc.max !== 1) {
    parts.push(`max: ${osc.max}`);
  }
  if (osc.speed !== 1) {
    parts.push(`speed: ${osc.speed}`);
  }
  if (osc.offset !== 0) {
    parts.push(`offset: ${osc.offset}`);
  }
  if (osc.seed !== 1 && osc.oscType === 5) {
    parts.push(`seed: ${osc.seed}`);
  }
  return `osc(${parts.join(", ")})`;
}
function formatMidi(midi) {
  const parts = [`channel: ${midi.channel}`];
  const modeName = midiModeNames[midi.mode] || "velocity";
  if (modeName !== "velocity") {
    parts.push(`mode: midiMode.${modeName}`);
  }
  if (midi.min !== 0) {
    parts.push(`min: ${midi.min}`);
  }
  if (midi.max !== 1) {
    parts.push(`max: ${midi.max}`);
  }
  if (midi.sensitivity !== 1) {
    parts.push(`sensitivity: ${midi.sensitivity}`);
  }
  return `midi(${parts.join(", ")})`;
}
function formatAudio(audio) {
  const bandName = audioBandNames[audio.band] || "low";
  const parts = [`band: audioBand.${bandName}`];
  if (audio.min !== 0) {
    parts.push(`min: ${audio.min}`);
  }
  if (audio.max !== 1) {
    parts.push(`max: ${audio.max}`);
  }
  return `audio(${parts.join(", ")})`;
}
function formatEnumName(name) {
  if (name.endsWith("Enum")) {
    return name.slice(0, -4);
  }
  return name;
}
function formatValue(value, spec, options = {}, sourceForm) {
  const { customFormatter, enums = {} } = typeof options === "function" ? { customFormatter: options } : options;
  if (customFormatter) {
    const custom = customFormatter(value, spec);
    if (custom !== null && custom !== void 0) {
      return custom;
    }
  }
  if (value === null || value === void 0) {
    return "null";
  }
  if (sourceForm === "array" && (Array.isArray(value) || ArrayBuffer.isView(value))) {
    const arr = Array.isArray(value) ? value : Array.from(value);
    return `[${arr.map((v) => formatValue(v, null, options)).join(", ")}]`;
  }
  if (value && typeof value === "object" && value._varRef) {
    return value._varRef;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  const type = spec?.type;
  if (spec?.choices && typeof value === "number") {
    for (const [name, val] of Object.entries(spec.choices)) {
      if (name.endsWith(":")) continue;
      if (val === value) {
        return formatEnumName(name);
      }
    }
  }
  if (spec?.enum && typeof value === "number") {
    const enumPath = spec.enum;
    const parts = enumPath.split(".");
    let node = enums;
    for (const part of parts) {
      if (node && node[part]) {
        node = node[part];
      } else {
        node = null;
        break;
      }
    }
    if (node && typeof node === "object") {
      for (const [name, val] of Object.entries(node)) {
        const numVal = val && typeof val === "object" && "value" in val ? val.value : val;
        if (numVal === value) {
          return name;
        }
      }
    }
  }
  if (spec?.enum && typeof value === "string") {
    const prefix = spec.enum + ".";
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }
  if (type === "surface") {
    if (value && typeof value === "object" && value.name) {
      if (value.name === "none") {
        return "none";
      }
      return `read(${value.name})`;
    }
    if (typeof value !== "string" || value.length === 0) {
      const defaultSurface = spec?.default || "inputTex";
      if (defaultSurface === "none") {
        return "none";
      }
      return `read(${defaultSurface})`;
    }
    if (value === "none") {
      return "none";
    }
    if (value.includes("(")) {
      return value;
    }
    return `read(${value})`;
  }
  if (type === "volume") {
    if (value && typeof value === "object" && value.name) {
      return value.name;
    }
    if (typeof value !== "string" || value.length === 0) {
      return spec?.default || "vol0";
    }
    return value;
  }
  if (type === "geometry") {
    if (value && typeof value === "object" && value.name) {
      return value.name;
    }
    if (typeof value !== "string" || value.length === 0) {
      return spec?.default;
    }
    return value;
  }
  if (type === "member") {
    return value;
  }
  if (type === "palette") {
    return value;
  }
  if (value && typeof value === "object") {
    if (value.type === "Oscillator" || value.oscillator === true) {
      return formatOscillator(value);
    }
    if (value.type === "Midi") {
      return formatMidi(value);
    }
    if (value.type === "Audio") {
      return formatAudio(value);
    }
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }
    const rounded = Math.round(value * 1e3) / 1e3;
    return String(rounded);
  }
  if (typeof value === "string") {
    if (value.startsWith("#")) {
      return value;
    }
    const isValidIdentifier2 = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
    const isEnumPath = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(value);
    const needsQuoting = type === "string" || !isValidIdentifier2 && !isEnumPath;
    if (needsQuoting) {
      if (value.includes("\n")) {
        return `"""${value}"""`;
      }
      const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
    return value;
  }
  const isArrayLike = Array.isArray(value) || ArrayBuffer.isView(value);
  if (isArrayLike) {
    const arr = Array.isArray(value) ? value : Array.from(value);
    if (type === "vec2" && arr.length === 2 && arr.every((v) => typeof v === "number")) {
      return `vec2(${arr.map((v) => formatValue(v, null, options)).join(", ")})`;
    }
    const isColorControl = spec?.type === "color";
    if (type === "vec3" && arr.length === 3 && arr.every((v) => typeof v === "number")) {
      if (isColorControl) {
        const toHex = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
        return `#${toHex(arr[0])}${toHex(arr[1])}${toHex(arr[2])}`;
      }
      return `vec3(${arr.map((v) => formatValue(v, null, options)).join(", ")})`;
    }
    if (type === "vec4" && arr.length === 4 && arr.every((v) => typeof v === "number")) {
      const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
      return `#${toHex(arr[0])}${toHex(arr[1])}${toHex(arr[2])}${toHex(arr[3])}`;
    }
    if (arr.every((v) => typeof v === "number")) {
      if (arr.length === 2) {
        return `vec2(${arr.map((v) => formatValue(v, null, options)).join(", ")})`;
      }
      if (arr.length === 3) {
        if (isColorControl) {
          const toHex = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
          return `#${toHex(arr[0])}${toHex(arr[1])}${toHex(arr[2])}`;
        }
        return `vec3(${arr.map((v) => formatValue(v, null, options)).join(", ")})`;
      }
      if (arr.length === 4) {
        const toHex = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
        return `#${toHex(arr[0])}${toHex(arr[1])}${toHex(arr[2])}${toHex(arr[3])}`;
      }
    }
    if (isColorControl && arr.length >= 3) {
      const toHex = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
      return `#${toHex(arr[0])}${toHex(arr[1])}${toHex(arr[2])}`;
    }
    return `vec3(${arr.slice(0, 3).map((v) => formatValue(v, null, options)).join(", ")})`;
  }
  if (typeof value === "object") {
    if (value.type === "String") {
      const escaped = value.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
    if (value.type === "Oscillator") {
      return formatOscillator(value);
    }
    if (value._ast && value._ast.type === "Oscillator") {
      return formatOscillator(value);
    }
    if (value.type === "Midi" && typeof value.channel === "number") {
      return formatMidi(value);
    }
    if (value._ast && value._ast.type === "Midi") {
      return formatMidi(value);
    }
    if (value.type === "Audio" && typeof value.band === "number") {
      return formatAudio(value);
    }
    if (value._ast && value._ast.type === "Audio") {
      return formatAudio(value);
    }
    if (value.type === "Oscillator") {
      const typePath = value.oscType;
      let typeName = "sine";
      if (typePath && typePath.type === "Member" && typePath.path) {
        typeName = typePath.path[typePath.path.length - 1];
      } else if (typePath && typePath.type === "Ident") {
        typeName = typePath.name;
      }
      const parts = [`type: oscKind.${typeName}`];
      if (value.min && value.min.type === "Number" && value.min.value !== 0) {
        parts.push(`min: ${value.min.value}`);
      }
      if (value.max && value.max.type === "Number" && value.max.value !== 1) {
        parts.push(`max: ${value.max.value}`);
      }
      if (value.speed && value.speed.type === "Number" && value.speed.value !== 1) {
        parts.push(`speed: ${value.speed.value}`);
      }
      if (value.offset && value.offset.type === "Number" && value.offset.value !== 0) {
        parts.push(`offset: ${value.offset.value}`);
      }
      if (value.seed && value.seed.type === "Number" && value.seed.value !== 1) {
        parts.push(`seed: ${value.seed.value}`);
      }
      return `osc(${parts.join(", ")})`;
    }
    if (value.type === "Midi") {
      const parts = [];
      if (value.channel && value.channel.type === "Number") {
        parts.push(`channel: ${value.channel.value}`);
      }
      const modePath = value.mode;
      let modeName = "velocity";
      if (modePath && modePath.type === "Member" && modePath.path) {
        modeName = modePath.path[modePath.path.length - 1];
      } else if (modePath && modePath.type === "Ident") {
        modeName = modePath.name;
      }
      if (modeName !== "velocity") {
        parts.push(`mode: midiMode.${modeName}`);
      }
      if (value.min && value.min.type === "Number" && value.min.value !== 0) {
        parts.push(`min: ${value.min.value}`);
      }
      if (value.max && value.max.type === "Number" && value.max.value !== 1) {
        parts.push(`max: ${value.max.value}`);
      }
      if (value.sensitivity && value.sensitivity.type === "Number" && value.sensitivity.value !== 1) {
        parts.push(`sensitivity: ${value.sensitivity.value}`);
      }
      return `midi(${parts.join(", ")})`;
    }
    if (value.type === "Audio") {
      const bandPath = value.band;
      let bandName = "low";
      if (bandPath && bandPath.type === "Member" && bandPath.path) {
        bandName = bandPath.path[bandPath.path.length - 1];
      } else if (bandPath && bandPath.type === "Ident") {
        bandName = bandPath.name;
      }
      const parts = [`band: audioBand.${bandName}`];
      if (value.min && value.min.type === "Number" && value.min.value !== 0) {
        parts.push(`min: ${value.min.value}`);
      }
      if (value.max && value.max.type === "Number" && value.max.value !== 1) {
        parts.push(`max: ${value.max.value}`);
      }
      return `audio(${parts.join(", ")})`;
    }
    if (value.type === "Read") {
      const surfaceName = value.surface?.name || value.surface;
      return `read(${surfaceName})`;
    }
    if (value.type === "Read3D") {
      const tex3dName = value.tex3d?.name || value.tex3d;
      if (value.geo) {
        const geoName = value.geo?.name || value.geo;
        return `read3d(${tex3dName}, ${geoName})`;
      } else {
        return `read3d(${tex3dName})`;
      }
    }
    if (value.type === "OutputRef") {
      return value.name;
    }
    if (value.type === "SourceRef") {
      return value.name;
    }
    if (value.type === "VolRef") {
      return value.name;
    }
    if (value.type === "GeoRef") {
      return value.name;
    }
    if (value.type === "Member") {
      return value.path.join(".");
    }
    if (value.type === "Number") {
      return formatValue(value.value, spec, options);
    }
    if (value.type === "Boolean") {
      return value.value ? "true" : "false";
    }
    if (value.kind === "output" || value.kind === "feedback" || value.kind === "source") {
      if (spec && spec.type === "surface") {
        return `read(${value.name})`;
      }
      return value.name;
    }
  }
  if (value && typeof value === "object" && typeof value.length === "number") {
    const arr = Array.from(value);
    const isColorControl = spec?.type === "color";
    if (arr.length >= 2 && arr.length <= 4 && arr.every((v) => typeof v === "number")) {
      if (arr.length === 2) return `vec2(${arr.join(", ")})`;
      if (arr.length === 3) {
        if (isColorControl) {
          const toHex2 = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
          return `#${toHex2(arr[0])}${toHex2(arr[1])}${toHex2(arr[2])}`;
        }
        return `vec3(${arr.join(", ")})`;
      }
      const toHex = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
      return `#${toHex(arr[0])}${toHex(arr[1])}${toHex(arr[2])}${toHex(arr[3])}`;
    }
  }
  return String(value);
}
function unparseCall(call, options = {}) {
  const name = call.name;
  const parts = [];
  const specs = options.specs || {};
  const multilineKwargs = options.multilineKwargs !== false;
  const baseIndent = Number.isFinite(options.indent) ? options.indent : 0;
  const parentIndent = " ".repeat(Math.max(0, baseIndent));
  const childIndent = " ".repeat(Math.max(0, baseIndent + 2));
  if (call.kwargs && Object.keys(call.kwargs).length > 0) {
    for (const [key, value] of Object.entries(call.kwargs)) {
      if (key === "_skip" && value === false) continue;
      const spec = specs[key] || null;
      const sourceForm = call.argSources?.[key];
      if (spec && spec.default !== void 0) {
        const formattedValue = formatValue(value, spec, options, sourceForm);
        const formattedDefault = formatValue(spec.default, spec, options);
        const isExplicitNone = spec.type === "surface" && formattedValue === "none" && formattedDefault !== "none";
        if (formattedValue === formattedDefault && !isExplicitNone) {
          continue;
        }
      }
      parts.push(`${key}: ${formatValue(value, spec, options, sourceForm)}`);
    }
  }
  if (call.args && call.args.length > 0) {
    for (const arg of call.args) {
      parts.push(formatValue(arg, null, options));
    }
  }
  const hasKwargs = call.kwargs && Object.keys(call.kwargs).length > 0 && parts.length > 0;
  if (multilineKwargs && hasKwargs && parts.length > 2) {
    return `${name}(
${parts.map((p) => `${childIndent}${p}`).join(",\n")}
${parentIndent})`;
  }
  return `${name}(${parts.join(", ")})`;
}
function unparseChain(chain, options = {}) {
  const parts = chain.map((call, idx) => unparseCall(call, { ...options, indent: idx === 0 ? 0 : 2 }));
  return parts.join("\n  .");
}
function formatLetExpr(expr, options = {}) {
  if (!expr) return "null";
  const numVal = (node) => node && node.type === "Number" ? node.value : void 0;
  switch (expr.type) {
    case "Number":
      return String(expr.value);
    case "String":
      return JSON.stringify(expr.value);
    case "Boolean":
      return expr.value ? "true" : "false";
    case "Ident":
      return expr.name;
    case "Member":
      return expr.path.join(".");
    case "Oscillator": {
      let typeStr = "oscKind.sine";
      if (expr.oscType?.type === "Member" && expr.oscType.path) {
        typeStr = `oscKind.${expr.oscType.path[expr.oscType.path.length - 1]}`;
      } else if (expr.oscType?.type === "Ident") {
        typeStr = expr.oscType.name;
      }
      const parts = [`type: ${typeStr}`];
      const pushIfNonDefault = (name, node, def) => {
        const v = numVal(node);
        if (v !== void 0 && v !== def) parts.push(`${name}: ${v}`);
      };
      pushIfNonDefault("min", expr.min, 0);
      pushIfNonDefault("max", expr.max, 1);
      pushIfNonDefault("speed", expr.speed, 1);
      pushIfNonDefault("offset", expr.offset, 0);
      pushIfNonDefault("seed", expr.seed, 1);
      return `osc(${parts.join(", ")})`;
    }
    case "Midi": {
      const parts = [];
      const ch = numVal(expr.channel);
      if (ch !== void 0) parts.push(`channel: ${ch}`);
      let modeStr = null;
      if (expr.mode?.type === "Member" && expr.mode.path) {
        const name = expr.mode.path[expr.mode.path.length - 1];
        if (name !== "velocity") modeStr = `midiMode.${name}`;
      } else if (expr.mode?.type === "Ident") {
        modeStr = expr.mode.name;
      }
      if (modeStr) parts.push(`mode: ${modeStr}`);
      const pushMidiField = (name, node, def) => {
        const v = numVal(node);
        if (v !== void 0 && v !== def) parts.push(`${name}: ${v}`);
      };
      pushMidiField("min", expr.min, 0);
      pushMidiField("max", expr.max, 1);
      pushMidiField("sensitivity", expr.sensitivity, 1);
      return `midi(${parts.join(", ")})`;
    }
    case "Audio": {
      let bandStr = "audioBand.low";
      if (expr.band?.type === "Member" && expr.band.path) {
        bandStr = `audioBand.${expr.band.path[expr.band.path.length - 1]}`;
      } else if (expr.band?.type === "Ident") {
        bandStr = expr.band.name;
      }
      const parts = [`band: ${bandStr}`];
      const minVal = numVal(expr.min), maxVal = numVal(expr.max);
      if (minVal !== void 0 && minVal !== 0) parts.push(`min: ${minVal}`);
      if (maxVal !== void 0 && maxVal !== 1) parts.push(`max: ${maxVal}`);
      return `audio(${parts.join(", ")})`;
    }
    case "Call":
      return unparseCall(expr, options);
    case "Chain":
      return unparseChain(expr.chain, options);
    case "Func":
      return `() => ${formatLetExpr(expr.body, options)}`;
    default:
      return formatValue(expr, null, options);
  }
}
function unparse(compiled, overrides = {}, options = {}) {
  options = options.enums ? options : { ...options, enums: stdEnums };
  const lines = [];
  const getEffectDef = options.getEffectDef || null;
  const searchNamespaces = compiled.searchNamespaces || [];
  if (searchNamespaces.length > 0) {
    lines.push(`search ${searchNamespaces.join(", ")}`);
    lines.push("");
  }
  if (compiled.vars && compiled.vars.length > 0) {
    for (const v of compiled.vars) {
      if (v.leadingComments && v.leadingComments.length > 0) {
        for (const c of v.leadingComments) {
          lines.push(c);
        }
      }
      const exprStr = formatLetExpr(v.expr, options);
      lines.push(`let ${v.name} = ${exprStr}`);
    }
    lines.push("");
  }
  let globalStepIndex = 0;
  const plans = compiled.plans || [];
  for (let planIndex = 0; planIndex < plans.length; planIndex++) {
    let joinChainWithComments = function(chain) {
      const parts = [];
      let inSubchain2 = false;
      for (let i = 0; i < chain.length; i++) {
        const elem = chain[i];
        const isFirst = i === 0;
        const baseIndent = inSubchain2 ? "    " : "  ";
        if (elem.leadingComments && elem.leadingComments.length > 0) {
          for (const comment of elem.leadingComments) {
            if (isFirst) {
              parts.push(comment);
            } else {
              parts.push(`${baseIndent}${comment}`);
            }
          }
        }
        if (elem.isSubchainBegin) {
          if (isFirst) {
            parts.push(elem.code);
          } else {
            parts.push(`  .${elem.code}`);
          }
          inSubchain2 = true;
          continue;
        }
        if (elem.isSubchainEnd) {
          parts.push(`  ${elem.code}`);
          inSubchain2 = false;
          continue;
        }
        if (isFirst) {
          parts.push(elem.code);
        } else if (inSubchain2) {
          parts.push(`    .${elem.code}`);
        } else {
          parts.push(`  .${elem.code}`);
        }
      }
      return parts.join("\n");
    };
    const plan = plans[planIndex];
    if (!plan.chain || plan.chain.length === 0) continue;
    if (plan.leadingComments && plan.leadingComments.length > 0) {
      for (const comment of plan.leadingComments) {
        lines.push(comment);
      }
    }
    const chains = [];
    let currentChain = [];
    let inSubchain = false;
    for (const step of plan.chain) {
      const makeChainElement = (code) => {
        const elem = { code };
        if (step.leadingComments && step.leadingComments.length > 0) {
          elem.leadingComments = step.leadingComments;
        }
        return elem;
      };
      if (step.builtin && step.op === "_read") {
        if (currentChain.length > 0) {
          chains.push(currentChain);
          currentChain = [];
        }
        const texName = step.args?.tex?.name || step.args?.tex;
        const hasOverride = overrides[globalStepIndex]?._skip !== void 0;
        const isSkipped = hasOverride ? overrides[globalStepIndex]._skip === true : step.args?._skip === true;
        let readCode;
        if (isSkipped) {
          readCode = `read(surface: ${texName}, _skip: true)`;
        } else {
          readCode = `read(${texName})`;
        }
        currentChain.push(makeChainElement(readCode));
        globalStepIndex++;
        continue;
      }
      if (step.builtin && step.op === "_read3d") {
        if (currentChain.length > 0) {
          chains.push(currentChain);
          currentChain = [];
        }
        const tex3d = step.args?.tex3d?.name || step.args?.tex3d;
        const geo = step.args?.geo?.name || step.args?.geo;
        const hasOverride = overrides[globalStepIndex]?._skip !== void 0;
        const isSkipped = hasOverride ? overrides[globalStepIndex]._skip === true : step.args?._skip === true;
        let read3dCode;
        if (isSkipped) {
          read3dCode = `read3d(tex3d: ${tex3d}, geo: ${geo}, _skip: true)`;
        } else {
          read3dCode = `read3d(${tex3d}, ${geo})`;
        }
        currentChain.push(makeChainElement(read3dCode));
        globalStepIndex++;
        continue;
      }
      if (step.builtin && step.op === "_write") {
        const texName = step.args?.tex?.name || step.args?.tex;
        currentChain.push(makeChainElement(`write(${texName})`));
        globalStepIndex++;
        continue;
      }
      if (step.builtin && step.op === "_write3d") {
        const tex3dName = step.args?.tex3d?.name || step.args?.tex3d;
        const geoName = step.args?.geo?.name || step.args?.geo;
        currentChain.push(makeChainElement(`write3d(${tex3dName}, ${geoName})`));
        globalStepIndex++;
        continue;
      }
      if (step.builtin && step.op === "_subchain_begin") {
        const name = step.args?.name;
        const id = step.args?.id;
        const parts = [];
        if (name) parts.push(`name: "${name}"`);
        if (id) parts.push(`id: "${id}"`);
        const argsStr = parts.length > 0 ? parts.join(", ") : "";
        const elem = { code: `subchain(${argsStr}) {`, isSubchainBegin: true };
        if (step.leadingComments && step.leadingComments.length > 0) {
          elem.leadingComments = step.leadingComments;
        }
        currentChain.push(elem);
        inSubchain = true;
        globalStepIndex++;
        continue;
      }
      if (step.builtin && step.op === "_subchain_end") {
        currentChain.push({ code: "}", isSubchainEnd: true });
        inSubchain = false;
        globalStepIndex++;
        continue;
      }
      const stepOverrides = overrides[globalStepIndex] || {};
      let effectDef = null;
      if (getEffectDef) {
        const namespace = step.namespace?.namespace || step.namespace?.resolved || null;
        effectDef = getEffectDef(step.op, namespace);
      }
      let callName = step.op;
      const nsInfo = step.namespace?.call || step.namespace;
      const isFromOverride = nsInfo?.fromOverride === true;
      const fromNamespace = isFromOverride ? nsInfo?.resolved || nsInfo?.name || step.namespace?.resolved : null;
      for (const ns of searchNamespaces) {
        const prefix = `${ns}.`;
        if (callName.startsWith(prefix)) {
          callName = callName.slice(prefix.length);
          break;
        }
      }
      if (isFromOverride && fromNamespace) {
        const fromPrefix = `${fromNamespace}.`;
        if (callName.startsWith(fromPrefix)) {
          callName = callName.slice(fromPrefix.length);
        }
      }
      const call = {
        name: callName,
        kwargs: {},
        args: []
      };
      if (step.argSources) call.argSources = step.argSources;
      if (step.args) {
        for (const [key, value] of Object.entries(step.args)) {
          if (key === "from" || key === "temp") continue;
          if (key === "_skip" && value !== true) continue;
          if (value && typeof value === "object" && value.kind) {
            call.kwargs[key] = value.name;
          } else {
            call.kwargs[key] = value;
          }
        }
      }
      const specs = effectDef?.globals || {};
      for (const [key, value] of Object.entries(stepOverrides)) {
        if (key.startsWith("_")) {
          call.kwargs[key] = value;
        } else if (effectDef) {
          if (specs[key] !== void 0) {
            call.kwargs[key] = value;
          }
        } else {
          call.kwargs[key] = value;
        }
      }
      const callIndent = currentChain.length === 0 ? 0 : inSubchain ? 4 : 2;
      let callCode = unparseCall(call, { ...options, specs, indent: callIndent });
      if (isFromOverride && fromNamespace) {
        callCode = `from(${fromNamespace}, ${callCode})`;
      }
      currentChain.push(makeChainElement(callCode));
      globalStepIndex++;
    }
    if (currentChain.length > 0) {
      chains.push(currentChain);
    }
    let line = chains.map(joinChainWithComments).join("\n\n");
    const lastStep = plan.chain[plan.chain.length - 1];
    const chainEndsWithWrite = lastStep && lastStep.builtin && lastStep.op === "_write";
    const chainEndsWithWrite3d = lastStep && lastStep.builtin && lastStep.op === "_write3d";
    if (plan.write && !chainEndsWithWrite) {
      const writeName = typeof plan.write === "string" ? plan.write : plan.write.name;
      line += `
  .write(${writeName})`;
    }
    if (plan.write3d && !chainEndsWithWrite3d) {
      const tex3d = plan.write3d.tex3d?.name || plan.write3d.tex3d;
      const geo = plan.write3d.geo?.name || plan.write3d.geo;
      line += `
  .write3d(${tex3d}, ${geo})`;
    }
    lines.push(line);
    if (planIndex < plans.length - 1) {
      lines.push("");
    }
  }
  if (compiled.render) {
    lines.push("");
    lines.push(`render(${compiled.render})`);
  }
  if (compiled.trailingComments && compiled.trailingComments.length > 0) {
    for (const comment of compiled.trailingComments) {
      lines.push(comment);
    }
  }
  return lines.join("\n");
}
function applyParameterUpdates(originalDsl, compileFn, parameterUpdates) {
  const compiled = compileFn(originalDsl);
  if (!compiled || !compiled.plans) {
    return originalDsl;
  }
  const searchMatch = originalDsl.match(/^search\s+(\S.*?)$/m);
  if (searchMatch) {
    compiled.searchNamespaces = searchMatch[1].split(/\s*,\s*/);
  }
  return unparse(compiled, parameterUpdates, {});
}

// shaders/src/lang/transform.js
function deepClone2(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepClone2);
  }
  const cloned = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone2(obj[key]);
  }
  return cloned;
}
function findStepByIndex(compiled, stepIndex) {
  if (!compiled?.plans) return null;
  for (let planIndex = 0; planIndex < compiled.plans.length; planIndex++) {
    const plan = compiled.plans[planIndex];
    if (!plan?.chain) continue;
    for (let chainIndex = 0; chainIndex < plan.chain.length; chainIndex++) {
      const step = plan.chain[chainIndex];
      if (step.temp === stepIndex) {
        return { planIndex, chainIndex, step };
      }
    }
  }
  return null;
}
function checkIsStarter(effectName, searchOrder = []) {
  if (isStarterOp(effectName)) return true;
  if (!effectName.includes(".") && searchOrder.length > 0) {
    for (const ns of searchOrder) {
      if (isStarterOp(`${ns}.${effectName}`)) return true;
    }
  }
  return false;
}
function getEffectSpec(effectName, searchOrder = []) {
  if (ops[effectName]) return ops[effectName];
  if (!effectName.includes(".") && searchOrder.length > 0) {
    for (const ns of searchOrder) {
      const namespacedName = `${ns}.${effectName}`;
      if (ops[namespacedName]) return ops[namespacedName];
    }
  }
  return null;
}
function replaceEffect(compiled, stepIndex, newEffectName, newArgs = {}, options = {}) {
  if (!compiled?.plans) {
    return { success: false, error: "Invalid compiled program: missing plans" };
  }
  const searchOrder = options.searchOrder || compiled.searchNamespaces || [];
  const location = findStepByIndex(compiled, stepIndex);
  if (!location) {
    return { success: false, error: `Step with index ${stepIndex} not found` };
  }
  const { planIndex, chainIndex, step } = location;
  const oldEffectName = step.op;
  const isStarterPosition = chainIndex === 0;
  const newIsStarter = checkIsStarter(newEffectName, searchOrder);
  const newSpec = getEffectSpec(newEffectName, searchOrder);
  if (!newSpec) {
    return { success: false, error: `Effect '${newEffectName}' not found` };
  }
  if (isStarterPosition && !newIsStarter) {
    return {
      success: false,
      error: `Cannot replace starter effect '${oldEffectName}' with non-starter effect '${newEffectName}'. The first effect in a chain must be a starting effect.`
    };
  }
  if (!isStarterPosition && newIsStarter) {
    return {
      success: false,
      error: `Cannot replace non-starter effect '${oldEffectName}' with starter effect '${newEffectName}'. Starting effects can only appear at the beginning of a chain.`
    };
  }
  const newProgram = deepClone2(compiled);
  const finalArgs = {};
  const specArgs = newSpec.args || [];
  for (const def of specArgs) {
    if (def.default !== void 0) {
      finalArgs[def.name] = def.default;
    }
  }
  for (const [key, value] of Object.entries(newArgs)) {
    if (typeof value === "number" && !Number.isInteger(value)) {
      finalArgs[key] = Math.round(value * 1e3) / 1e3;
    } else {
      finalArgs[key] = value;
    }
  }
  let resolvedNewName = newEffectName;
  let effectNamespace = null;
  if (newEffectName.includes(".")) {
    const parts = newEffectName.split(".");
    effectNamespace = parts[0];
    if (!ops[newEffectName]) {
      return { success: false, error: `Effect '${newEffectName}' not found` };
    }
  } else {
    for (const ns of searchOrder) {
      const namespacedName = `${ns}.${newEffectName}`;
      if (ops[namespacedName]) {
        resolvedNewName = namespacedName;
        effectNamespace = ns;
        break;
      }
    }
    if (!effectNamespace) {
      for (const opName of Object.keys(ops)) {
        if (opName.endsWith(`.${newEffectName}`)) {
          resolvedNewName = opName;
          effectNamespace = opName.split(".")[0];
          break;
        }
      }
    }
  }
  if (effectNamespace && !newProgram.searchNamespaces.includes(effectNamespace)) {
    newProgram.searchNamespaces = [...newProgram.searchNamespaces, effectNamespace];
  }
  const newStep = newProgram.plans[planIndex].chain[chainIndex];
  newStep.op = resolvedNewName;
  newStep.args = finalArgs;
  newStep.namespace = effectNamespace ? { resolved: effectNamespace } : null;
  return { success: true, program: newProgram };
}
function listSteps(compiled, options = {}) {
  if (!compiled?.plans) return [];
  const searchOrder = options.searchOrder || compiled.searchNamespaces || [];
  const steps = [];
  for (let planIndex = 0; planIndex < compiled.plans.length; planIndex++) {
    const plan = compiled.plans[planIndex];
    if (!plan?.chain) continue;
    for (let chainIndex = 0; chainIndex < plan.chain.length; chainIndex++) {
      const step = plan.chain[chainIndex];
      const isStarterPosition = chainIndex === 0;
      const isStarter = checkIsStarter(step.op, searchOrder);
      steps.push({
        stepIndex: step.temp,
        planIndex,
        chainIndex,
        effectName: step.op,
        isStarter,
        isStarterPosition,
        canReplaceWithStarter: isStarterPosition,
        canReplaceWithNonStarter: !isStarterPosition,
        args: step.args || {}
      });
    }
  }
  return steps;
}
function getCompatibleReplacements(compiled, stepIndex, options = {}) {
  if (!compiled?.plans) {
    return { success: false, error: "Invalid compiled program: missing plans" };
  }
  const searchOrder = options.searchOrder || compiled.searchNamespaces || [];
  const location = findStepByIndex(compiled, stepIndex);
  if (!location) {
    return { success: false, error: `Step with index ${stepIndex} not found` };
  }
  const { chainIndex } = location;
  const isStarterPosition = chainIndex === 0;
  const starters = [];
  const nonStarters = [];
  for (const opName of Object.keys(ops)) {
    const isStarter = checkIsStarter(opName, searchOrder);
    if (isStarter) {
      starters.push(opName);
    } else {
      nonStarters.push(opName);
    }
  }
  if (isStarterPosition) {
    return { success: true, compatible: starters, incompatible: nonStarters };
  } else {
    return { success: true, compatible: nonStarters, incompatible: starters };
  }
}

// shaders/src/lang/error-formatter.js
function parseLocation(message) {
  const match = message.match(/at line (\d+) col(?:umn)? (\d+)/);
  if (match) {
    return {
      line: parseInt(match[1], 10),
      col: parseInt(match[2], 10)
    };
  }
  return null;
}
function extractMessage(message) {
  return message.replace(/\s+at line \d+ col(?:umn)? \d+$/, "").trim();
}
function formatDslError(source, error, options = {}) {
  const { contextLines = 2 } = options;
  if (!error || typeof error.message !== "string") {
    return error ? String(error) : "Unknown error";
  }
  const loc = parseLocation(error.message);
  const coreMessage = extractMessage(error.message);
  if (!loc || !source) {
    return `SyntaxError: ${coreMessage}`;
  }
  const lines = source.split("\n");
  const errorLine = loc.line;
  const errorCol = loc.col;
  const lastLineNum = Math.min(errorLine + contextLines, lines.length);
  const lineNumWidth = String(lastLineNum).length;
  const parts = [];
  parts.push(`SyntaxError: ${coreMessage}`);
  parts.push(`  --> line ${errorLine}, column ${errorCol}`);
  parts.push("");
  const startLine = Math.max(1, errorLine - contextLines);
  for (let i = startLine; i < errorLine; i++) {
    const lineNum = String(i).padStart(lineNumWidth, " ");
    parts.push(`  ${lineNum} | ${lines[i - 1]}`);
  }
  const errorLineNum = String(errorLine).padStart(lineNumWidth, " ");
  const errorLineContent = lines[errorLine - 1] || "";
  parts.push(`  ${errorLineNum} | ${errorLineContent}`);
  const pointerPadding = " ".repeat(lineNumWidth + 3);
  const colPadding = " ".repeat(Math.max(0, errorCol - 1));
  parts.push(`${pointerPadding}${colPadding}^-- error here`);
  const endLine = Math.min(lines.length, errorLine + contextLines);
  for (let i = errorLine + 1; i <= endLine; i++) {
    const lineNum = String(i).padStart(lineNumWidth, " ");
    parts.push(`  ${lineNum} | ${lines[i - 1]}`);
  }
  return parts.join("\n");
}
function isDslSyntaxError(error) {
  return error instanceof SyntaxError && typeof error.message === "string" && parseLocation(error.message) !== null;
}

// shaders/src/lang/index.js
function compile(src) {
  const tokens = lex(src);
  const ast = parse(tokens);
  return validate(ast);
}

// shaders/src/runtime/effect.js
var Effect = class {
  /**
   * @param {object} [config] - Optional configuration object
   * @param {string} [config.name] - Effect display name
   * @param {string} [config.namespace] - Effect namespace (synth, filter, mixer, etc.)
   * @param {string} [config.func] - DSL function name
   * @param {string[]} [config.tags] - Effect tags for categorization (from VALID_TAGS)
   * @param {object} [config.globals] - Effect parameters/uniforms
   * @param {Array} [config.passes] - Render passes
   * @param {object} [config.textures] - Internal texture allocations
   * @param {string[]} [config.openCategories] - Categories to show expanded by default (e.g. ['general', 'julia'])
   * @param {string} [config.defaultProgram] - Optional default DSL program for the demo UI
   * @param {Function} [config.onInit] - Lifecycle hook: called once on init
   * @param {Function} [config.onUpdate] - Lifecycle hook: called every frame
   * @param {Function} [config.onDestroy] - Lifecycle hook: called on destroy
   */
  constructor(config = {}) {
    this.state = {};
    this.uniforms = {};
    if (config.name) this.name = config.name;
    if (config.namespace) this.namespace = config.namespace;
    if (config.func) this.func = config.func;
    if (config.description) this.description = config.description;
    if (config.tags) this.tags = config.tags;
    if (config.globals) this.globals = config.globals;
    if (config.passes) this.passes = config.passes;
    if (config.textures) this.textures = config.textures;
    if (config.outputTex3d) this.outputTex3d = config.outputTex3d;
    if (config.outputGeo) this.outputGeo = config.outputGeo;
    if (config.uniformLayout) this.uniformLayout = config.uniformLayout;
    if (config.uniformLayouts) this.uniformLayouts = config.uniformLayouts;
    if (config.paramAliases) this.paramAliases = config.paramAliases;
    if (config.openCategories) this.openCategories = config.openCategories;
    if (config.defaultProgram) this.defaultProgram = config.defaultProgram;
    if (config.hidden) this.hidden = true;
    if (config.deprecatedBy) this.deprecatedBy = config.deprecatedBy;
    if (config.onInit) this._configOnInit = config.onInit;
    if (config.onUpdate) this._configOnUpdate = config.onUpdate;
    if (config.onDestroy) this._configOnDestroy = config.onDestroy;
    if (config.asyncInit) this._configAsyncInit = config.asyncInit;
  }
  /**
   * Called once when the effect is initialized.
   */
  onInit() {
    if (this._configOnInit) this._configOnInit.call(this);
  }
  /**
   * Called every frame before rendering.
   * @param {object} context { time, delta, uniforms }
   * @returns {object} Uniforms to bind
   */
  onUpdate(context) {
    if (this._configOnUpdate) return this._configOnUpdate.call(this, context);
    return {};
  }
  /**
   * Called when the effect is destroyed.
   */
  onDestroy() {
    if (this._configOnDestroy) this._configOnDestroy.call(this);
  }
  /**
   * Called after pipeline texture allocation with a context for async CPU rendering.
   * Override to perform one-shot async rendering (e.g., worm tracing).
   * Called again when seed changes (reseed = regenerate).
   * @param {Object} context - { updateTexture, width, height, params, isCancelled }
   */
  asyncInit(context) {
    if (this._configAsyncInit) return this._configAsyncInit.call(this, context);
    return Promise.resolve();
  }
};
var DEFAULT_CATEGORY = "general";
function getUniformCategory(spec) {
  return spec?.ui?.category || DEFAULT_CATEGORY;
}
function groupGlobalsByCategory(globals, options = {}) {
  const { includeHidden = false } = options;
  const categories = {};
  const categoryOrder = [];
  if (!globals) return categories;
  for (const [key, spec] of Object.entries(globals)) {
    if (!includeHidden && (spec.ui?.control === false || spec.ui?.hidden === true)) continue;
    const category = getUniformCategory(spec);
    if (!categories[category]) {
      categories[category] = [];
      if (category !== DEFAULT_CATEGORY) {
        categoryOrder.push(category);
      }
    }
    categories[category].push([key, spec]);
  }
  if (categories[DEFAULT_CATEGORY]) {
    categoryOrder.unshift(DEFAULT_CATEGORY);
  }
  const ordered = {};
  for (const cat of categoryOrder) {
    ordered[cat] = categories[cat];
  }
  return ordered;
}
function getCategories(globals) {
  return Object.keys(groupGlobalsByCategory(globals));
}

// shaders/src/runtime/registry.js
var effects = /* @__PURE__ */ new Map();
function registerEffect(name, definition) {
  effects.set(name, definition);
}
function unregisterEffect(name) {
  return effects.delete(name);
}
function getEffect(name) {
  return effects.get(name);
}
function getAllEffects() {
  return effects;
}

// shaders/src/runtime/palette-expansion.js
var PALETTES2 = [
  // 1: seventiesShirt (rgb)
  { amp: [0.76, 0.88, 0.37], freq: [1, 1, 1], offset: [0.93, 0.97, 0.52], phase: [0.21, 0.41, 0.56], mode: 3 },
  // 2: fiveG (rgb)
  { amp: [0.56851584, 0.7740668, 0.23485267], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0.727029, 0.08039695, 0.10427457], mode: 3 },
  // 3: afterimage (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0.3, 0.2, 0.2], mode: 3 },
  // 4: barstow (rgb)
  { amp: [0.45, 0.2, 0.1], freq: [1, 1, 1], offset: [0.7, 0.2, 0.2], phase: [0.5, 0.4, 0], mode: 3 },
  // 5: bloob (rgb)
  { amp: [0.09, 0.59, 0.48], freq: [1, 1, 1], offset: [0.2, 0.31, 0.98], phase: [0.88, 0.4, 0.33], mode: 3 },
  // 6: blueSkies (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.1, 0.4, 0.7], phase: [0.1, 0.1, 0.1], mode: 3 },
  // 7: brushedMetal (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0, 0.1, 0.2], mode: 3 },
  // 8: burningSky (rgb)
  { amp: [0.7259015, 0.7004237, 0.9494409], freq: [1, 1, 1], offset: [0.63290054, 0.37883538, 0.29405284], phase: [0, 0.1, 0.2], mode: 3 },
  // 9: california (rgb)
  { amp: [0.94, 0.33, 0.27], freq: [1, 1, 1], offset: [0.74, 0.37, 0.73], phase: [0.44, 0.17, 0.88], mode: 3 },
  // 10: columbia (rgb)
  { amp: [1, 0.7, 1], freq: [1, 1, 1], offset: [1, 0.4, 0.9], phase: [0.4, 0.5, 0.6], mode: 3 },
  // 11: cottonCandy (rgb)
  { amp: [0.51, 0.39, 0.41], freq: [1, 1, 1], offset: [0.59, 0.53, 0.94], phase: [0.15, 0.41, 0.46], mode: 3 },
  // 12: darkSatin (hsv)
  { amp: [0, 0, 0.51], freq: [1, 1, 1], offset: [0, 0, 0.43], phase: [0, 0, 0.36], mode: 1 },
  // 13: dealerHat (rgb)
  { amp: [0.83, 0.45, 0.19], freq: [1, 1, 1], offset: [0.79, 0.45, 0.35], phase: [0.28, 0.91, 0.61], mode: 3 },
  // 14: dreamy (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0, 0.2, 0.25], mode: 3 },
  // 15: eventHorizon (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.22, 0.48, 0.62], phase: [0.1, 0.3, 0.2], mode: 3 },
  // 16: ghostly (hsv)
  { amp: [0.02, 0.92, 0.76], freq: [1, 1, 1], offset: [0.51, 0.49, 0.51], phase: [0.71, 0.23, 0.66], mode: 1 },
  // 17: grayscale (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [2, 2, 2], offset: [0.5, 0.5, 0.5], phase: [1, 1, 1], mode: 3 },
  // 18: hazySunset (rgb)
  { amp: [0.79, 0.56, 0.22], freq: [1, 1, 1], offset: [0.96, 0.5, 0.49], phase: [0.15, 0.98, 0.87], mode: 3 },
  // 19: heatmap (rgb)
  { amp: [0.75804377, 0.62868536, 0.2227562], freq: [1, 1, 1], offset: [0.35536355, 0.12935615, 0.17060602], phase: [0, 0.25, 0.5], mode: 3 },
  // 20: hypercolor (rgb)
  { amp: [0.79, 0.5, 0.23], freq: [1, 1, 1], offset: [0.75, 0.47, 0.45], phase: [0.08, 0.84, 0.16], mode: 3 },
  // 21: jester (rgb)
  { amp: [0.7, 0.81, 0.73], freq: [1, 1, 1], offset: [0.1, 0.22, 0.27], phase: [0.99, 0.12, 0.94], mode: 3 },
  // 22: justBlue (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [0, 0, 1], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5], mode: 3 },
  // 23: justCyan (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [0, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5], mode: 3 },
  // 24: justGreen (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [0, 1, 0], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5], mode: 3 },
  // 25: justPurple (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 0, 1], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5], mode: 3 },
  // 26: justRed (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 0, 0], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5], mode: 3 },
  // 27: justYellow (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 0], offset: [0.5, 0.5, 0.5], phase: [0.5, 0.5, 0.5], mode: 3 },
  // 28: mars (rgb)
  { amp: [0.74, 0.33, 0.09], freq: [1, 1, 1], offset: [0.62, 0.2, 0.2], phase: [0.2, 0.1, 0], mode: 3 },
  // 29: modesto (rgb)
  { amp: [0.56, 0.68, 0.39], freq: [1, 1, 1], offset: [0.72, 0.07, 0.62], phase: [0.25, 0.4, 0.41], mode: 3 },
  // 30: moss (rgb)
  { amp: [0.78, 0.39, 0.07], freq: [1, 1, 1], offset: [0, 0.53, 0.33], phase: [0.94, 0.92, 0.9], mode: 3 },
  // 31: neptune (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.2, 0.64, 0.62], phase: [0.15, 0.2, 0.3], mode: 3 },
  // 32: netOfGems (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.64, 0.12, 0.84], phase: [0.1, 0.25, 0.15], mode: 3 },
  // 33: organic (rgb)
  { amp: [0.42, 0.42, 0.04], freq: [1, 1, 1], offset: [0.47, 0.27, 0.27], phase: [0.41, 0.14, 0.11], mode: 3 },
  // 34: papaya (rgb)
  { amp: [0.65, 0.4, 0.11], freq: [1, 1, 1], offset: [0.72, 0.45, 0.08], phase: [0.71, 0.8, 0.84], mode: 3 },
  // 35: radioactive (rgb)
  { amp: [0.62, 0.79, 0.11], freq: [1, 1, 1], offset: [0.22, 0.56, 0.17], phase: [0.15, 0.1, 0.25], mode: 3 },
  // 36: royal (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.41, 0.22, 0.67], phase: [0.2, 0.25, 0.2], mode: 3 },
  // 37: santaCruz (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.5, 0.5, 0.5], phase: [0.25, 0.5, 0.75], mode: 3 },
  // 38: sherbet (rgb)
  { amp: [0.6059281, 0.17591387, 0.17166573], freq: [1, 1, 1], offset: [0.5224456, 0.3864609, 0.36020845], phase: [0, 0.25, 0.5], mode: 3 },
  // 39: sherbetDouble (rgb)
  { amp: [0.6059281, 0.17591387, 0.17166573], freq: [2, 2, 2], offset: [0.5224456, 0.3864609, 0.36020845], phase: [0, 0.25, 0.5], mode: 3 },
  // 40: silvermane (oklab)
  { amp: [0.42, 0, 0], freq: [2, 2, 2], offset: [0.45, 0.5, 0.42], phase: [0.63, 1, 1], mode: 2 },
  // 41: skykissed (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.83, 0.6, 0.63], phase: [0.3, 0.1, 0], mode: 3 },
  // 42: solaris (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.6, 0.4, 0.1], phase: [0.3, 0.2, 0.1], mode: 3 },
  // 43: spooky (oklab)
  { amp: [0.46, 0.73, 0.19], freq: [1, 1, 1], offset: [0.27, 0.79, 0.78], phase: [0.27, 0.16, 0.04], mode: 2 },
  // 44: springtime (rgb)
  { amp: [0.67, 0.25, 0.27], freq: [1, 1, 1], offset: [0.74, 0.48, 0.46], phase: [0.07, 0.79, 0.39], mode: 3 },
  // 45: sproingtime (rgb)
  { amp: [0.9, 0.43, 0.34], freq: [1, 1, 1], offset: [0.56, 0.69, 0.32], phase: [0.03, 0.8, 0.4], mode: 3 },
  // 46: sulphur (rgb)
  { amp: [0.73, 0.36, 0.52], freq: [1, 1, 1], offset: [0.78, 0.68, 0.15], phase: [0.74, 0.93, 0.28], mode: 3 },
  // 47: summoning (rgb)
  { amp: [1, 0, 0.8], freq: [1, 1, 1], offset: [0, 0, 0], phase: [0, 0.5, 0.1], mode: 3 },
  // 48: superhero (rgb)
  { amp: [1, 0.25, 0.5], freq: [0.5, 0.5, 0.5], offset: [0, 0, 0.25], phase: [0.5, 0, 0], mode: 3 },
  // 49: toxic (rgb)
  { amp: [0.5, 0.5, 0.5], freq: [1, 1, 1], offset: [0.26, 0.57, 0.03], phase: [0, 0.1, 0.3], mode: 3 },
  // 50: tropicalia (oklab)
  { amp: [0.28, 0.08, 0.65], freq: [1, 1, 1], offset: [0.48, 0.6, 0.03], phase: [0.1, 0.15, 0.3], mode: 2 },
  // 51: tungsten (rgb)
  { amp: [0.65, 0.93, 0.73], freq: [1, 1, 1], offset: [0.31, 0.21, 0.27], phase: [0.43, 0.45, 0.48], mode: 3 },
  // 52: vaporwave (rgb)
  { amp: [0.9, 0.76, 0.63], freq: [1, 1, 1], offset: [0, 0.19, 0.68], phase: [0.43, 0.23, 0.32], mode: 3 },
  // 53: vibrant (rgb)
  { amp: [0.78, 0.63, 0.68], freq: [1, 1, 1], offset: [0.41, 0.03, 0.16], phase: [0.81, 0.61, 0.06], mode: 3 },
  // 54: vintage (rgb)
  { amp: [0.97, 0.74, 0.23], freq: [1, 1, 1], offset: [0.97, 0.38, 0.35], phase: [0.34, 0.41, 0.44], mode: 3 },
  // 55: vintagePhoto (rgb)
  { amp: [0.68, 0.79, 0.57], freq: [1, 1, 1], offset: [0.56, 0.35, 0.14], phase: [0.73, 0.9, 0.99], mode: 3 }
];
function expandPalette(index) {
  if (index <= 0 || index > PALETTES2.length) {
    return null;
  }
  const entry = PALETTES2[index - 1];
  return {
    paletteOffset: entry.offset.slice(),
    paletteAmp: entry.amp.slice(),
    paletteFreq: entry.freq.slice(),
    palettePhase: entry.phase.slice(),
    paletteMode: entry.mode
  };
}

// shaders/src/runtime/expander.js
var SURFACE_REF_PATTERN = /^(?:o|vol|geo|xyz|vel|rgba)[0-7]$/;
var TEXTURE_ARG_KINDS = /* @__PURE__ */ new Set(["temp", "output", "source", "feedback", "vol", "geo", "xyz", "vel", "rgba", "pipeline"]);
function isTextureArg(arg) {
  return arg !== null && typeof arg === "object" && TEXTURE_ARG_KINDS.has(arg.kind);
}
function registerPassthrough(nodeId, textureMap, currentInput, currentInput3d, currentInputGeo, currentInputXyz, currentInputVel, currentInputRgba) {
  if (currentInput) textureMap.set(`${nodeId}_out`, currentInput);
  if (currentInput3d) textureMap.set(`${nodeId}_out3d`, currentInput3d);
  if (currentInputGeo) textureMap.set(`${nodeId}_outGeo`, currentInputGeo);
  if (currentInputXyz) textureMap.set(`${nodeId}_outXyz`, currentInputXyz);
  if (currentInputVel) textureMap.set(`${nodeId}_outVel`, currentInputVel);
  if (currentInputRgba) textureMap.set(`${nodeId}_outRgba`, currentInputRgba);
}
function ensureBlitProgram(programs) {
  if (programs["blit"]) return;
  programs["blit"] = {
    fragment: `#version 300 es
            precision highp float;
            in vec2 v_texCoord;
            uniform sampler2D src;
            out vec4 fragColor;
            void main() {
                fragColor = texture(src, v_texCoord);
            }`,
    wgsl: `
            struct FragmentInput {
                @builtin(position) position: vec4<f32>,
                @location(0) uv: vec2<f32>,
            }

            @group(0) @binding(0) var src: texture_2d<f32>;
            @group(0) @binding(1) var srcSampler: sampler;

            @fragment
            fn main(in: FragmentInput) -> @location(0) vec4<f32> {
                let uv = vec2<f32>(in.uv.x, 1.0 - in.uv.y);
                return textureSample(src, srcSampler, uv);
            }
        `,
    fragmentEntryPoint: "main"
  };
}
function resolveGlobalSurfaceRef(name) {
  if (name === "none") return "none";
  if (name.startsWith("global_")) return name;
  if (SURFACE_REF_PATTERN.test(name)) return `global_${name}`;
  return name;
}
function expand(compilationResult, options = {}) {
  const shaderOverrides = options.shaderOverrides || {};
  const passes = [];
  const errors = [];
  const programs = {};
  const textureSpecs = {};
  const textureMap = /* @__PURE__ */ new Map();
  let lastWrittenSurface = null;
  const resolveEnum = (path) => {
    const parts = path.split(".");
    let node = stdEnums;
    for (const part of parts) {
      if (node && node[part]) {
        node = node[part];
      } else {
        return null;
      }
    }
    return node && node.value !== void 0 ? node.value : null;
  };
  for (const plan of compilationResult.plans) {
    let currentInput = null;
    let currentInput3d = null;
    let currentInputGeo = null;
    let currentInputXyz = null;
    let currentInputVel = null;
    let currentInputRgba = null;
    let lastInlineWriteTarget = null;
    let currentParticlePipelineId = null;
    const pipelineUniforms = {};
    const chainScopeId = `chain_${compilationResult.plans.indexOf(plan)}`;
    for (const step of plan.chain) {
      if (step.builtin && step.op === "_read") {
        const tex = step.args?.tex;
        if (tex && tex.kind === "output") {
          currentInput = `global_${tex.name}`;
        }
        const nodeId2 = `node_${step.temp}`;
        textureMap.set(`${nodeId2}_out`, currentInput);
        continue;
      }
      if (step.builtin && step.op === "_read3d") {
        const tex3d = step.args?.tex3d;
        const geo = step.args?.geo;
        if (tex3d) {
          if (tex3d.kind === "vol" || tex3d.type === "VolRef") {
            currentInput3d = `global_${tex3d.name}`;
          } else {
            currentInput3d = tex3d.name || tex3d;
          }
        }
        if (geo) {
          if (geo.kind === "geo" || geo.type === "GeoRef") {
            currentInputGeo = `global_${geo.name}`;
          } else {
            currentInputGeo = geo.name || geo;
          }
        }
        const nodeId2 = `node_${step.temp}`;
        if (currentInput3d) textureMap.set(`${nodeId2}_out3d`, currentInput3d);
        if (currentInputGeo) textureMap.set(`${nodeId2}_outGeo`, currentInputGeo);
        continue;
      }
      if (step.builtin && step.op === "_write") {
        const tex = step.args?.tex;
        if (tex && currentInput) {
          if (tex.name !== "none") {
            const targetSurface = `global_${tex.name}`;
            if (currentInput !== targetSurface) {
              const nodeId3 = `node_${step.temp}`;
              const blitPass = {
                id: `${nodeId3}_write_blit`,
                program: "blit",
                type: "render",
                inputs: { src: currentInput },
                outputs: { color: targetSurface },
                uniforms: {},
                nodeId: nodeId3,
                stepIndex: step.temp
              };
              passes.push(blitPass);
              ensureBlitProgram(programs);
              lastWrittenSurface = tex.name;
              lastInlineWriteTarget = { kind: tex.kind, name: tex.name };
            }
          }
          const nodeId2 = `node_${step.temp}`;
          textureMap.set(`${nodeId2}_out`, currentInput);
        }
        continue;
      }
      if (step.builtin && step.op === "_write3d") {
        const tex3d = step.args?.tex3d;
        const geo = step.args?.geo;
        const nodeId2 = `node_${step.temp}`;
        if (tex3d && tex3d.name !== "none" && currentInput3d) {
          const targetVol = `global_${tex3d.name}`;
          if (currentInput3d !== targetVol) {
            const blitPass = {
              id: `${nodeId2}_write3d_vol_blit`,
              program: "blit",
              type: "render",
              inputs: { src: currentInput3d },
              outputs: { color: targetVol },
              uniforms: {},
              nodeId: nodeId2,
              stepIndex: step.temp
            };
            passes.push(blitPass);
            ensureBlitProgram(programs);
          }
        }
        if (geo && geo.name !== "none" && currentInputGeo) {
          const targetGeo = `global_${geo.name}`;
          if (currentInputGeo !== targetGeo) {
            const geoBlitPass = {
              id: `${nodeId2}_write3d_geo_blit`,
              program: "blit",
              type: "render",
              inputs: { src: currentInputGeo },
              outputs: { color: targetGeo },
              uniforms: {},
              nodeId: nodeId2,
              stepIndex: step.temp
            };
            passes.push(geoBlitPass);
          }
        }
        textureMap.set(`${nodeId2}_out`, currentInput);
        textureMap.set(`${nodeId2}_out3d`, currentInput3d);
        textureMap.set(`${nodeId2}_outGeo`, currentInputGeo);
        continue;
      }
      if (step.builtin && step.op === "_subchain_begin") {
        registerPassthrough(`node_${step.temp}`, textureMap, currentInput, currentInput3d, currentInputGeo, currentInputXyz, currentInputVel, currentInputRgba);
        continue;
      }
      if (step.builtin && step.op === "_subchain_end") {
        registerPassthrough(`node_${step.temp}`, textureMap, currentInput, currentInput3d, currentInputGeo, currentInputXyz, currentInputVel, currentInputRgba);
        continue;
      }
      lastInlineWriteTarget = null;
      if (step.args?._skip === true) {
        registerPassthrough(`node_${step.temp}`, textureMap, currentInput, currentInput3d, currentInputGeo, currentInputXyz, currentInputVel, currentInputRgba);
        continue;
      }
      const effectName = step.op;
      const effectDef = getEffect(effectName);
      if (!effectDef) {
        errors.push({ message: `Effect '${effectName}' not found`, step });
        continue;
      }
      const scopeParticleTex = (texName) => {
        if (!currentParticlePipelineId) return texName;
        if (/^global_(xyz|vel|rgba|points_trail|life_data)$/.test(texName)) {
          return `${texName}_${currentParticlePipelineId}`;
        }
        return texName;
      };
      const scopeChainTex = (texName) => {
        const particleResult = scopeParticleTex(texName);
        if (particleResult !== texName) return particleResult;
        if (texName.startsWith("global_")) {
          return `${texName}_${chainScopeId}`;
        }
        return texName;
      };
      const nodeId = `node_${step.temp}`;
      const scopedParamMap = /* @__PURE__ */ new Map();
      const createsParticleTextures = effectDef.textures && effectDef.textures.global_xyz;
      if (createsParticleTextures) {
        currentParticlePipelineId = nodeId;
        currentInputXyz = null;
        currentInputVel = null;
        currentInputRgba = null;
      }
      const compileTimeDefines = {};
      if (effectDef.globals) {
        const sortedGlobalNames = Object.keys(effectDef.globals).sort();
        for (const globalName of sortedGlobalNames) {
          const def = effectDef.globals[globalName];
          if (!def || !def.define) continue;
          let value = def.default;
          if (step.args && Object.prototype.hasOwnProperty.call(step.args, globalName)) {
            const argVal = step.args[globalName];
            value = argVal !== null && typeof argVal === "object" && "value" in argVal ? argVal.value : argVal;
          }
          if (def.type === "member" && typeof value === "string") {
            const resolved = resolveEnum(value);
            if (resolved !== null) value = resolved;
          }
          if (value !== void 0 && value !== null) {
            compileTimeDefines[def.define] = value;
          }
        }
      }
      const programDefineSuffix = Object.entries(compileTimeDefines).map(([k, v]) => `__${k}_${v}`).join("");
      const stepOverrides = shaderOverrides[step.temp];
      const shadersSource = stepOverrides || effectDef.shaders;
      if (shadersSource) {
        for (const [progName, shaders] of Object.entries(shadersSource)) {
          const uniqueProgName = `${nodeId}_${progName}${programDefineSuffix}`;
          if (!programs[uniqueProgName]) {
            const programLayout = effectDef.uniformLayouts?.[progName] || effectDef.uniformLayout;
            programs[uniqueProgName] = {
              ...shaders,
              uniformLayout: programLayout,
              // Pass defines to the backend's compileProgram, which forwards them
              // to injectDefines() to bake them into the shader source.
              defines: { ...compileTimeDefines }
            };
          }
        }
      }
      if (effectDef.textures) {
        for (const [texName, spec] of Object.entries(effectDef.textures)) {
          let virtualTexId;
          const isParticleTex = /^global_(xyz|vel|rgba|points_trail|life_data)$/.test(texName);
          const shouldScopeAsParticle = isParticleTex && currentParticlePipelineId;
          const shouldScopeAsChain = texName.startsWith("global_") && !isParticleTex;
          if (texName.startsWith("global_")) {
            if (shouldScopeAsParticle) {
              virtualTexId = `${texName}_${currentParticlePipelineId}`;
            } else {
              virtualTexId = `${texName}_${chainScopeId}`;
            }
          } else {
            virtualTexId = `${nodeId}_${texName}`;
          }
          const dimReferencesParam = (dim) => typeof dim === "object" && dim !== null && (dim.param !== void 0 || dim.screenDivide !== void 0);
          const hasParamRef = dimReferencesParam(spec.width) || dimReferencesParam(spec.height);
          let resolvedSpec = { ...spec };
          const shouldScopeParams = shouldScopeAsParticle || shouldScopeAsChain || currentParticlePipelineId && !texName.startsWith("global_") || hasParamRef;
          if (shouldScopeParams) {
            const scopeSuffix = shouldScopeAsParticle ? currentParticlePipelineId : chainScopeId;
            const scopeDimSpec = (dimSpec) => {
              if (typeof dimSpec === "object" && dimSpec.param !== void 0) {
                const originalParam = dimSpec.param;
                const scopedParam = `${originalParam}_${scopeSuffix}`;
                scopedParamMap.set(originalParam, scopedParam);
                return {
                  ...dimSpec,
                  param: scopedParam
                };
              }
              if (typeof dimSpec === "object" && dimSpec.screenDivide !== void 0) {
                const originalParam = dimSpec.screenDivide;
                const scopedParam = `${originalParam}_${scopeSuffix}`;
                scopedParamMap.set(originalParam, scopedParam);
                return {
                  ...dimSpec,
                  screenDivide: scopedParam
                };
              }
              return dimSpec;
            };
            resolvedSpec.width = scopeDimSpec(spec.width);
            resolvedSpec.height = scopeDimSpec(spec.height);
          }
          textureSpecs[virtualTexId] = resolvedSpec;
        }
      }
      if (effectDef.textures3d) {
        for (const [texName, spec] of Object.entries(effectDef.textures3d)) {
          let virtualTexId;
          if (texName.startsWith("global_")) {
            virtualTexId = scopeChainTex(texName);
          } else {
            virtualTexId = `${nodeId}_${texName}`;
          }
          textureSpecs[virtualTexId] = { ...spec, is3D: true };
        }
      }
      if (step.from !== null) {
        const prevNodeId = `node_${step.from}`;
        currentInput = textureMap.get(`${prevNodeId}_out`);
      }
      if (effectDef.globals) {
        for (const [globalName, def] of Object.entries(effectDef.globals)) {
          if (def.uniform && def.default !== void 0) {
            if (pipelineUniforms[def.uniform] !== void 0) {
              continue;
            }
            let val = def.default;
            if (def.type === "member" && typeof val === "string") {
              const resolved = resolveEnum(val);
              if (resolved !== null) val = resolved;
            }
            pipelineUniforms[def.uniform] = val;
          }
          if (def.type === "surface" && def.colorModeUniform) {
            if (!step.args || !Object.prototype.hasOwnProperty.call(step.args, globalName)) {
              const isNone = def.default === "none";
              pipelineUniforms[def.colorModeUniform] = isNone ? 0 : 1;
            }
          }
        }
      }
      const colorModeControlledUniforms = /* @__PURE__ */ new Set();
      if (step.args) {
        for (const [argName, arg] of Object.entries(step.args)) {
          if (isTextureArg(arg)) {
            const globalDef = effectDef.globals?.[argName];
            if (globalDef?.colorModeUniform) {
              const isNone = arg.name === "none";
              pipelineUniforms[globalDef.colorModeUniform] = isNone ? 0 : 1;
              colorModeControlledUniforms.add(globalDef.colorModeUniform);
            }
          }
        }
      }
      if (step.args) {
        for (const [argName, arg] of Object.entries(step.args)) {
          const isObjectArg = arg !== null && typeof arg === "object";
          if (isTextureArg(arg)) {
            continue;
          }
          let uniformName = argName;
          if (effectDef.globals && effectDef.globals[argName] && effectDef.globals[argName].uniform) {
            uniformName = effectDef.globals[argName].uniform;
          }
          if (colorModeControlledUniforms.has(uniformName)) {
            continue;
          }
          if (uniformName === "volumeSize" && currentInput3d && pipelineUniforms["volumeSize"] !== void 0) {
            continue;
          }
          let resolvedValue;
          if (isObjectArg && arg.value !== void 0) {
            resolvedValue = arg.value;
          } else {
            resolvedValue = arg;
          }
          pipelineUniforms[uniformName] = resolvedValue;
        }
      }
      const effectPasses = effectDef.passes || [];
      for (let i = 0; i < effectPasses.length; i++) {
        const passDef = effectPasses[i];
        const passId = `${nodeId}_pass_${i}`;
        const programName = `${nodeId}_${passDef.program}${programDefineSuffix}`;
        const pass = {
          id: passId,
          program: programName,
          entryPoint: passDef.entryPoint,
          // For multi-entry-point compute shaders
          drawMode: passDef.drawMode,
          drawBuffers: passDef.drawBuffers,
          // For MRT (Multiple Render Targets)
          count: passDef.count,
          countUniform: passDef.countUniform,
          // For dynamic vertex count from uniforms
          repeat: passDef.repeat,
          // Number of iterations per frame
          blend: passDef.blend,
          workgroups: passDef.workgroups,
          storageBuffers: passDef.storageBuffers,
          storageTextures: passDef.storageTextures,
          inputs: {},
          outputs: {},
          uniforms: {}
        };
        pass.effectKey = effectName;
        pass.effectFunc = effectDef.func || effectName;
        pass.effectNamespace = effectDef.namespace || null;
        pass.nodeId = nodeId;
        pass.stepIndex = step.temp;
        if (currentInput3d && pipelineUniforms["volumeSize"] !== void 0) {
          pass.inheritsVolumeSize = true;
        }
        pass.uniforms = { ...pipelineUniforms };
        if (effectDef.globals) {
          for (const def of Object.values(effectDef.globals)) {
            if (def.uniform && def.default !== void 0) {
              if (pass.uniforms[def.uniform] !== void 0) {
                continue;
              }
              let val = def.default;
              if (def.type === "member" && typeof val === "string") {
                const resolved = resolveEnum(val);
                if (resolved !== null) val = resolved;
              }
              pass.uniforms[def.uniform] = val;
              pipelineUniforms[def.uniform] = val;
            }
          }
        }
        if (effectDef.globals) {
          pass.uniformSpecs = {};
          for (const [argName, def] of Object.entries(effectDef.globals)) {
            const uniformName = def.uniform || argName;
            if ((def.type === "float" || def.type === "int") && !def.choices) {
              pass.uniformSpecs[uniformName] = {
                min: def.min ?? 0,
                max: def.max ?? 100
              };
            }
          }
        }
        if (step.args) {
          for (const [argName, arg] of Object.entries(step.args)) {
            const isObjectArg = arg !== null && typeof arg === "object";
            if (isTextureArg(arg)) {
              continue;
            }
            let uniformName = argName;
            if (effectDef.globals && effectDef.globals[argName] && effectDef.globals[argName].uniform) {
              uniformName = effectDef.globals[argName].uniform;
            }
            if (effectDef.globals) {
              let isControlled = false;
              for (const globalDef of Object.values(effectDef.globals)) {
                if (globalDef.colorModeUniform === uniformName) {
                  isControlled = true;
                  break;
                }
              }
              if (isControlled) {
                continue;
              }
            }
            if (uniformName === "volumeSize" && currentInput3d && pipelineUniforms["volumeSize"] !== void 0) {
              continue;
            }
            let resolvedValue;
            if (isObjectArg && arg.value !== void 0) {
              resolvedValue = arg.value;
            } else {
              resolvedValue = arg;
            }
            pass.uniforms[uniformName] = resolvedValue;
            pipelineUniforms[uniformName] = resolvedValue;
          }
        }
        if (passDef.uniforms) {
          for (const [uniformName, globalRef] of Object.entries(passDef.uniforms)) {
            if (pipelineUniforms[uniformName] !== void 0) {
              pass.uniforms[uniformName] = pipelineUniforms[uniformName];
            } else if (pipelineUniforms[globalRef] !== void 0) {
              pass.uniforms[uniformName] = pipelineUniforms[globalRef];
            } else if (effectDef.globals && effectDef.globals[globalRef]) {
              const globalDef = effectDef.globals[globalRef];
              if (globalDef.default !== void 0) {
                let val = globalDef.default;
                if (globalDef.type === "member" && typeof val === "string") {
                  const resolved = resolveEnum(val);
                  if (resolved !== null) val = resolved;
                }
                pass.uniforms[uniformName] = val;
              }
            }
          }
        }
        if (effectDef.globals) {
          for (const [argName, globalDef] of Object.entries(effectDef.globals)) {
            if (globalDef.type !== "palette") continue;
            const uniformName = globalDef.uniform || argName;
            const index = pass.uniforms[uniformName];
            if (typeof index !== "number") continue;
            const expanded = expandPalette(index);
            if (!expanded) continue;
            for (const [uName, uValue] of Object.entries(expanded)) {
              if (uName in pass.uniforms) {
                pass.uniforms[uName] = Array.isArray(uValue) ? uValue.slice() : uValue;
                pipelineUniforms[uName] = pass.uniforms[uName];
              }
            }
          }
        }
        if (passDef.inputs) {
          for (const [uniformName, texRef] of Object.entries(passDef.inputs)) {
            const isPipelineInput = texRef === "inputTex" || texRef.startsWith("o") && !isNaN(parseInt(texRef.slice(1)));
            const isPipelineInput3d = texRef === "inputTex3d";
            const isPipelineInputGeo = texRef === "inputGeo";
            const isPipelineInputXyz = texRef === "inputXyz";
            const isPipelineInputVel = texRef === "inputVel";
            const isPipelineInputRgba = texRef === "inputRgba";
            if (isPipelineInput) {
              pass.inputs[uniformName] = currentInput || texRef;
            } else if (isPipelineInput3d) {
              pass.inputs[uniformName] = currentInput3d || texRef;
            } else if (isPipelineInputGeo) {
              pass.inputs[uniformName] = currentInputGeo || texRef;
            } else if (isPipelineInputXyz) {
              pass.inputs[uniformName] = currentInputXyz || texRef;
            } else if (isPipelineInputVel) {
              pass.inputs[uniformName] = currentInputVel || texRef;
            } else if (isPipelineInputRgba) {
              pass.inputs[uniformName] = currentInputRgba || texRef;
            } else if (texRef === "noise") {
              pass.inputs[uniformName] = "global_noise";
            } else if (texRef === "midiNoteGrid") {
              pass.inputs[uniformName] = "midiNoteGrid";
            } else if (texRef === "feedback" || texRef === "selfTex") {
              if (plan.write) {
                const outName = typeof plan.write === "object" ? plan.write.name : plan.write;
                const outKind = plan.write.kind || "output";
                const prefix = outKind === "feedback" ? "feedback" : "global";
                pass.inputs[uniformName] = `${prefix}_${outName}`;
              } else {
                pass.inputs[uniformName] = currentInput || "global_inputTex";
              }
            } else if (effectDef.externalTexture && texRef === effectDef.externalTexture) {
              pass.inputs[uniformName] = `${texRef}_step_${step.temp}`;
            } else if (step.args && Object.prototype.hasOwnProperty.call(step.args, texRef)) {
              const arg = step.args[texRef];
              if (arg == null) {
                continue;
              }
              if (arg.kind === "temp") {
                pass.inputs[uniformName] = textureMap.get(`node_${arg.index}_out`);
              } else if (arg.kind === "pipeline" && (arg.name === "inputTex" || arg.name === "inputColor")) {
                pass.inputs[uniformName] = currentInput || arg.name;
              } else if (arg.kind === "output" || arg.kind === "source" || arg.kind === "vol" || arg.kind === "geo" || arg.kind === "xyz" || arg.kind === "vel" || arg.kind === "rgba") {
                pass.inputs[uniformName] = arg.name === "none" ? "none" : `global_${arg.name}`;
              } else if (typeof arg === "string") {
                pass.inputs[uniformName] = resolveGlobalSurfaceRef(arg);
              }
            } else if (effectDef.globals && effectDef.globals[texRef] && effectDef.globals[texRef].default !== void 0) {
              const defaultVal = effectDef.globals[texRef].default;
              if (defaultVal === "none") {
                pass.inputs[uniformName] = "none";
              } else if (defaultVal === "inputTex" || defaultVal === "inputColor") {
                pass.inputs[uniformName] = currentInput || defaultVal;
              } else if (SURFACE_REF_PATTERN.test(defaultVal)) {
                pass.inputs[uniformName] = `global_${defaultVal}`;
              } else if (defaultVal.startsWith("global_")) {
                pass.inputs[uniformName] = scopeChainTex(defaultVal);
              } else {
                pass.inputs[uniformName] = defaultVal;
              }
            } else if (texRef.startsWith("global_")) {
              pass.inputs[uniformName] = scopeChainTex(texRef);
            } else if (texRef === "outputTex") {
              pass.inputs[uniformName] = `${nodeId}_out`;
            } else {
              pass.inputs[uniformName] = `${nodeId}_${texRef}`;
            }
          }
        }
        if (passDef.outputs) {
          for (const [attachment, texRef] of Object.entries(passDef.outputs)) {
            let virtualTex;
            if (texRef === "outputTex") {
              const isLastStep = step === plan.chain[plan.chain.length - 1];
              const isLastPass = i === effectPasses.length - 1;
              if (isLastStep && isLastPass && plan.write) {
                const outName = typeof plan.write === "object" ? plan.write.name : plan.write;
                const outKind = plan.write.kind || "output";
                const prefix = outKind === "feedback" ? "feedback" : "global";
                virtualTex = `${prefix}_${outName}`;
                lastWrittenSurface = outName;
              } else {
                virtualTex = `${nodeId}_out`;
              }
              textureMap.set(virtualTex, virtualTex);
              textureMap.set(`${nodeId}_out`, virtualTex);
            } else if (texRef === "outputTex3d") {
              virtualTex = `${nodeId}_out3d`;
              textureMap.set(`${nodeId}_out3d`, virtualTex);
            } else if (texRef === "outputXyz") {
              virtualTex = `${nodeId}_outXyz`;
              textureMap.set(`${nodeId}_outXyz`, virtualTex);
            } else if (texRef === "outputVel") {
              virtualTex = `${nodeId}_outVel`;
              textureMap.set(`${nodeId}_outVel`, virtualTex);
            } else if (texRef === "outputRgba") {
              virtualTex = `${nodeId}_outRgba`;
              textureMap.set(`${nodeId}_outRgba`, virtualTex);
            } else if (texRef === "inputTex3d") {
              virtualTex = currentInput3d || `${nodeId}_inputTex3d`;
            } else if (texRef === "inputGeo") {
              virtualTex = currentInputGeo || `${nodeId}_inputGeo`;
            } else if (texRef === "inputXyz") {
              virtualTex = currentInputXyz || `${nodeId}_inputXyz`;
            } else if (texRef === "inputVel") {
              virtualTex = currentInputVel || `${nodeId}_inputVel`;
            } else if (texRef === "inputRgba") {
              virtualTex = currentInputRgba || `${nodeId}_inputRgba`;
            } else if (texRef.startsWith("global_")) {
              virtualTex = scopeChainTex(texRef);
            } else if (texRef.startsWith("feedback_")) {
              virtualTex = texRef;
            } else {
              virtualTex = `${nodeId}_${texRef}`;
            }
            pass.outputs[attachment] = virtualTex;
          }
        }
        for (const [originalParam, scopedParam] of scopedParamMap) {
          if (pass.uniforms[originalParam] !== void 0) {
            pass.uniforms[scopedParam] = pass.uniforms[originalParam];
            pipelineUniforms[scopedParam] = pass.uniforms[originalParam];
          }
        }
        if (scopedParamMap.size > 0) {
          pass.scopedParams = Object.fromEntries(scopedParamMap);
        }
        passes.push(pass);
      }
      currentInput = textureMap.get(`${nodeId}_out`);
      if (effectDef.outputTex && !currentInput) {
        const internalTexName = effectDef.outputTex;
        if (internalTexName === "inputTex") {
          if (step.from !== null) {
            const prevNodeId = `node_${step.from}`;
            const prevOutput = textureMap.get(`${prevNodeId}_out`);
            if (prevOutput) {
              textureMap.set(`${nodeId}_out`, prevOutput);
              currentInput = prevOutput;
            }
          }
        } else {
          const virtualTexId = internalTexName.startsWith("global_") ? scopeChainTex(internalTexName) : `${nodeId}_${internalTexName}`;
          textureMap.set(`${nodeId}_out`, virtualTexId);
          currentInput = virtualTexId;
        }
      }
      const out3d = textureMap.get(`${nodeId}_out3d`);
      if (out3d) {
        currentInput3d = out3d;
      }
      const outXyz = textureMap.get(`${nodeId}_outXyz`);
      if (outXyz) {
        currentInputXyz = outXyz;
      }
      const outVel = textureMap.get(`${nodeId}_outVel`);
      if (outVel) {
        currentInputVel = outVel;
      }
      const outRgba = textureMap.get(`${nodeId}_outRgba`);
      if (outRgba) {
        currentInputRgba = outRgba;
      }
      if (effectDef.outputTex3d && !out3d) {
        const internalTexName = effectDef.outputTex3d;
        if (internalTexName === "inputTex3d") {
          if (currentInput3d) {
            textureMap.set(`${nodeId}_out3d`, currentInput3d);
          }
        } else {
          const virtualTexId = internalTexName.startsWith("global_") ? scopeChainTex(internalTexName) : `${nodeId}_${internalTexName}`;
          textureMap.set(`${nodeId}_out3d`, virtualTexId);
          currentInput3d = virtualTexId;
        }
      }
      if (effectDef.outputGeo) {
        const geoTexName = effectDef.outputGeo;
        if (geoTexName === "inputGeo") {
          if (currentInputGeo) {
            textureMap.set(`${nodeId}_outGeo`, currentInputGeo);
          }
        } else {
          const virtualGeoId = `${nodeId}_${geoTexName}`;
          textureMap.set(`${nodeId}_outGeo`, virtualGeoId);
          currentInputGeo = virtualGeoId;
        }
      }
      if (effectDef.outputXyz && !outXyz) {
        const texName = effectDef.outputXyz;
        if (texName === "inputXyz") {
          if (currentInputXyz) {
            textureMap.set(`${nodeId}_outXyz`, currentInputXyz);
          }
        } else {
          const virtualId = texName.startsWith("global_") ? scopeChainTex(texName) : `${nodeId}_${texName}`;
          textureMap.set(`${nodeId}_outXyz`, virtualId);
          currentInputXyz = virtualId;
        }
      }
      if (effectDef.outputVel && !outVel) {
        const texName = effectDef.outputVel;
        if (texName === "inputVel") {
          if (currentInputVel) {
            textureMap.set(`${nodeId}_outVel`, currentInputVel);
          }
        } else {
          const virtualId = texName.startsWith("global_") ? scopeChainTex(texName) : `${nodeId}_${texName}`;
          textureMap.set(`${nodeId}_outVel`, virtualId);
          currentInputVel = virtualId;
        }
      }
      if (effectDef.outputRgba && !outRgba) {
        const texName = effectDef.outputRgba;
        if (texName === "inputRgba") {
          if (currentInputRgba) {
            textureMap.set(`${nodeId}_outRgba`, currentInputRgba);
          }
        } else {
          const virtualId = texName.startsWith("global_") ? scopeChainTex(texName) : `${nodeId}_${texName}`;
          textureMap.set(`${nodeId}_outRgba`, virtualId);
          currentInputRgba = virtualId;
        }
      }
    }
    if (plan.write && currentInput) {
      const outName = typeof plan.write === "object" ? plan.write.name : plan.write;
      lastWrittenSurface = outName;
      const alreadyWritten = lastInlineWriteTarget && lastInlineWriteTarget.kind === "output" && lastInlineWriteTarget.name === outName;
      if (alreadyWritten) {
        continue;
      }
      const targetSurface = `global_${outName}`;
      if (currentInput !== targetSurface) {
        const blitPass = {
          id: `final_blit_${outName}`,
          program: "blit",
          type: "render",
          inputs: { src: currentInput },
          outputs: { color: targetSurface },
          uniforms: {}
        };
        passes.push(blitPass);
      }
    }
  }
  let renderSurface;
  if (compilationResult.render) {
    renderSurface = compilationResult.render;
  } else if (lastWrittenSurface) {
    renderSurface = lastWrittenSurface;
  } else {
    errors.push({ message: "No render surface specified and no write() found - add render(oN) or write(oN)" });
    renderSurface = null;
  }
  return { passes, errors, programs, textureSpecs, renderSurface };
}

// shaders/src/runtime/resources.js
function analyzeLiveness(passes) {
  const lifetime = /* @__PURE__ */ new Map();
  const touch = (texId, index) => {
    if (!texId) return;
    if (texId.startsWith("global_")) return;
    if (!lifetime.has(texId)) {
      lifetime.set(texId, { start: index, end: index });
    } else {
      const l = lifetime.get(texId);
      l.start = Math.min(l.start, index);
      l.end = Math.max(l.end, index);
    }
  };
  passes.forEach((pass, index) => {
    if (pass.inputs) {
      Object.values(pass.inputs).forEach((tex) => touch(tex, index));
    }
    if (pass.outputs) {
      Object.values(pass.outputs).forEach((tex) => touch(tex, index));
    }
  });
  return lifetime;
}
function allocateResources(passes) {
  const lifetime = analyzeLiveness(passes);
  const allocations = /* @__PURE__ */ new Map();
  const freeList = [];
  let physicalCount = 0;
  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i];
    if (pass.outputs) {
      Object.values(pass.outputs).forEach((texId) => {
        if (texId.startsWith("global_")) return;
        if (allocations.has(texId)) return;
        const freeIdx = freeList.findIndex((item) => item.availableAfter < i);
        if (freeIdx !== -1) {
          const item = freeList.splice(freeIdx, 1)[0];
          allocations.set(texId, item.id);
        } else {
          const id = `phys_${physicalCount++}`;
          allocations.set(texId, id);
        }
      });
    }
    if (pass.inputs) {
      Object.values(pass.inputs).forEach((texId) => {
        if (texId.startsWith("global_")) return;
        const l = lifetime.get(texId);
        if (l && l.end === i) {
          const physId = allocations.get(texId);
          if (physId) {
            freeList.push({ id: physId, availableAfter: i });
          }
        }
      });
    }
  }
  return allocations;
}

// shaders/src/runtime/backend.js
var Backend = class {
  constructor(context) {
    this.context = context;
    this.textures = /* @__PURE__ */ new Map();
    this.programs = /* @__PURE__ */ new Map();
    this.uniformBuffers = /* @__PURE__ */ new Map();
    this.capabilities = {
      isMobile: false,
      floatBlend: true,
      floatLinear: true,
      colorBufferFloat: true,
      maxDrawBuffers: 8,
      maxTextureSize: 4096,
      maxStateSize: 2048
      // Default max particle state texture size
    };
  }
  /**
   * Initialize the backend
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error("Backend.init() must be implemented");
  }
  /**
   * Create a texture with the specified parameters
   * @param {string} id - Physical texture ID
   * @param {object} spec - { width, height, format, usage }
   * @returns {object} Texture handle
   */
  createTexture(id, spec) {
    throw new Error("Backend.createTexture() must be implemented");
  }
  /**
   * Create a 3D texture for volumetric data
   * @param {string} id - Physical texture ID
   * @param {object} spec - { width, height, depth, format, usage }
   * @returns {object} Texture handle
   */
  createTexture3D(id, spec) {
    throw new Error("Backend.createTexture3D() must be implemented");
  }
  /**
   * Destroy a texture
   * @param {string} id - Physical texture ID
   */
  destroyTexture(id) {
    throw new Error("Backend.destroyTexture() must be implemented");
  }
  /**
   * Compile a shader program
   * @param {string} id - Program ID
   * @param {object} spec - { source, type, defines }
   * @returns {Promise<object>} Compiled program/pipeline
   */
  async compileProgram(id, spec) {
    throw new Error("Backend.compileProgram() must be implemented");
  }
  /**
   * Execute a render pass
   * @param {object} pass - Pass specification
   * @param {object} state - Current frame state
   */
  executePass(pass, state) {
    throw new Error("Backend.executePass() must be implemented");
  }
  /**
   * Begin a frame
   * @param {object} state - Frame state
   */
  beginFrame(state) {
    throw new Error("Backend.beginFrame() must be implemented");
  }
  /**
   * End a frame
   */
  endFrame() {
    throw new Error("Backend.endFrame() must be implemented");
  }
  /**
   * Copy one texture to another (blit operation)
   * Used for surface copy operations.
   * @param {string} srcId - Source texture ID
   * @param {string} dstId - Destination texture ID
   */
  copyTexture(srcId, dstId) {
    throw new Error("Backend.copyTexture() must be implemented");
  }
  /**
   * Clear a texture to transparent black.
   * Used to clear surfaces when chains are deleted.
   * @param {string} id - Texture ID
   */
  clearTexture(id) {
  }
  /**
   * Get backend name
   * @returns {string}
   */
  getName() {
    throw new Error("Backend.getName() must be implemented");
  }
  /**
   * Check if backend is available
   * @returns {boolean}
   */
  static isAvailable() {
    throw new Error("Backend.isAvailable() must be implemented");
  }
  /**
   * Destroy backend resources
   * @param {object} options
   */
  destroy(options = {}) {
  }
};

// shaders/src/runtime/default-shaders.js
var DEFAULT_VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_texCoord;

void main() {
    v_texCoord = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
var FULLSCREEN_TRIANGLE_POSITIONS = new Float32Array([
  -1,
  -1,
  3,
  -1,
  -1,
  3
]);
var FULLSCREEN_TRIANGLE_VERTEX_COUNT = 3;
var DEFAULT_VERTEX_SHADER_WGSL = `
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    let positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0)
    );
    let pos = positions[vertexIndex];

    var out: VertexOutput;
    out.position = vec4<f32>(pos, 0.0, 1.0);
    out.uv = pos * 0.5 + vec2<f32>(0.5, 0.5);
    return out;
}
`;
var DEFAULT_VERTEX_ENTRY_POINT = "vs_main";
var DEFAULT_FRAGMENT_ENTRY_POINT = "main";

// shaders/src/runtime/backends/webgl2.js
var WebGL2Backend = class _WebGL2Backend extends Backend {
  constructor(context, canvas) {
    super(context);
    this.gl = context;
    this.canvas = canvas || context.canvas || null;
    this.isContextLost = false;
    this.fbos = /* @__PURE__ */ new Map();
    this.depthBuffers = /* @__PURE__ */ new Map();
    this.fullscreenVAO = null;
    this.presentProgram = null;
    this.maxTextureUnits = 16;
    this._vec2Buf = new Float32Array(2);
    this._vec3Buf = new Float32Array(3);
    this._vec4Buf = new Float32Array(4);
    this._mergedUniforms = {};
    this._mergedUniformKeys = [];
    this._packedUniformBuffer = new ArrayBuffer(512);
    this._packedUniformView = new DataView(this._packedUniformBuffer);
    this._packedUniformBytes = new Uint8Array(this._packedUniformBuffer);
  }
  /**
   * Detect if running on a mobile device.
   * Uses user agent and touch capability as heuristics.
   * @returns {boolean}
   */
  static detectMobile() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      return true;
    }
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      return window.screen.width <= 1024;
    }
    return false;
  }
  /**
   * Parse a texture ID to extract the global surface name.
   * Supports both "global_name" and "globalName" patterns.
   * Returns null if not a global, otherwise returns the surface name.
   */
  parseGlobalName(texId) {
    if (typeof texId !== "string") return null;
    if (texId.startsWith("global_")) {
      return texId.replace("global_", "");
    }
    if (texId.startsWith("global") && texId.length > 6) {
      const suffix = texId.slice(6);
      if (/^[A-Z0-9]/.test(suffix)) {
        return suffix.charAt(0).toLowerCase() + suffix.slice(1);
      }
    }
    return null;
  }
  async init() {
    const gl = this.gl;
    const isMobile = _WebGL2Backend.detectMobile();
    const colorBufferFloat = !!gl.getExtension("EXT_color_buffer_float");
    const floatLinear = !!gl.getExtension("OES_texture_float_linear");
    const floatBlend = !!gl.getExtension("EXT_float_blend");
    if (!colorBufferFloat) {
      console.warn("[WebGL2] EXT_color_buffer_float not supported - float texture rendering may fail");
    }
    if (!floatLinear) {
      console.warn("[WebGL2] OES_texture_float_linear not supported - use texelFetch for float textures");
    }
    if (!floatBlend) {
      console.warn("[WebGL2] EXT_float_blend not supported - blending on float textures may fail");
    }
    this.maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    const maxDrawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.capabilities = {
      isMobile,
      floatBlend,
      floatLinear,
      colorBufferFloat,
      maxDrawBuffers,
      maxTextureSize,
      // Cap particle state texture size on mobile to prevent OOM
      // 512x512 = 262k particles, uses ~48MB for state textures
      maxStateSize: isMobile ? 512 : 2048
    };
    this.fullscreenVAO = this.createFullscreenVAO();
    this.emptyVAO = gl.createVertexArray();
    this.presentProgram = this.createPresentProgram();
    this.defaultTexture = this.createDefaultTexture();
    return Promise.resolve();
  }
  createDefaultTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
  createPresentProgram() {
    const gl = this.gl;
    const vs = DEFAULT_VERTEX_SHADER;
    const fs = `#version 300 es
        precision highp float;
        in vec2 v_texCoord;
        uniform sampler2D u_texture;
        out vec4 fragColor;
        void main() {
            fragColor = texture(u_texture, v_texCoord);
        }`;
    const vertShader = this.compileShader(gl.VERTEX_SHADER, vs);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fs);
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.bindAttribLocation(program, 0, "a_position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Failed to link present program");
      return null;
    }
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return {
      handle: program,
      uniforms: {
        texture: gl.getUniformLocation(program, "u_texture")
      }
    };
  }
  createFullscreenVAO() {
    const gl = this.gl;
    const positions = FULLSCREEN_TRIANGLE_POSITIONS;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vao;
  }
  createTexture(id, spec) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const glFormat = this.resolveFormat(spec.format);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      glFormat.internalFormat,
      spec.width,
      spec.height,
      0,
      glFormat.format,
      glFormat.type,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.textures.set(id, {
      handle: texture,
      width: spec.width,
      height: spec.height,
      format: spec.format,
      glFormat
    });
    if (spec.usage && spec.usage.includes("render")) {
      this.createFBO(id, texture);
    }
    return texture;
  }
  createFBO(id, texture) {
    const gl = this.gl;
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`FBO incomplete for texture ${id}: ${status}`);
    }
    const tex = this.textures.get(id);
    if (tex) {
      gl.viewport(0, 0, tex.width, tex.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fbos.set(id, fbo);
  }
  /**
   * Ensure a depth buffer is attached to an FBO for 3D rendering.
   * Creates and caches depth renderbuffers as needed.
   * @param {WebGLFramebuffer} fbo - The framebuffer to attach depth to
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   */
  ensureDepthBuffer(fbo, width, height) {
    const gl = this.gl;
    if (this.depthBuffers.has(fbo)) {
      const existing = this.depthBuffers.get(fbo);
      if (existing.width !== width || existing.height !== height) {
        gl.bindRenderbuffer(gl.RENDERBUFFER, existing.buffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
        existing.width = width;
        existing.height = height;
      }
      return;
    }
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.warn(`[ensureDepthBuffer] FBO incomplete after adding depth: ${status}`);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    this.depthBuffers.set(fbo, { buffer: depthBuffer, width, height });
  }
  /**
   * Create or retrieve an MRT FBO for multiple render targets
   * @param {string} id - Unique identifier for this MRT configuration
   * @param {Array<WebGLTexture>} textures - Array of texture handles to attach
   * @returns {WebGLFramebuffer}
   */
  createMRTFBO(id, textures) {
    const gl = this.gl;
    if (this.fbos.has(id)) {
      return this.fbos.get(id);
    }
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const drawBuffers = [];
    for (let i = 0; i < textures.length; i++) {
      const attachment = gl.COLOR_ATTACHMENT0 + i;
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        attachment,
        gl.TEXTURE_2D,
        textures[i],
        0
      );
      drawBuffers.push(attachment);
    }
    gl.drawBuffers(drawBuffers);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`MRT FBO incomplete for ${id}: ${status}`);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fbos.set(id, fbo);
    return fbo;
  }
  /**
   * Create a 3D texture for volume data.
   * Note: WebGL2 supports sampling from 3D textures but cannot render to them directly.
   * 3D textures are used for volumetric caching and lookup.
   */
  createTexture3D(id, spec) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, texture);
    const glFormat = this.resolveFormat(spec.format);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      glFormat.internalFormat,
      spec.width,
      spec.height,
      spec.depth,
      0,
      glFormat.format,
      glFormat.type,
      null
    );
    const filterMode = spec.filter === "nearest" ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, filterMode);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, filterMode);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_3D, null);
    this.textures.set(id, {
      handle: texture,
      width: spec.width,
      height: spec.height,
      depth: spec.depth,
      format: spec.format,
      glFormat,
      is3D: true
    });
    return texture;
  }
  /**
   * Allocate a cube-map texture (6 faces, all same size).
   * @param {string} id - Texture identifier
   * @param {{ size: number }} options - Cube face edge length in pixels
   */
  createCubeTexture(id, { size }) {
    const gl = this.gl;
    const handle = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, handle);
    for (let f = 0; f < 6; f++) {
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.set(id, { handle, width: size, height: size, cube: true });
    return this.textures.get(id);
  }
  /**
   * Upload RGBA8 pixel data to one face of a cube-map texture.
   * @param {string} id - Texture identifier (must have been created with createCubeTexture)
   * @param {number} face - Face index 0..5 (added to TEXTURE_CUBE_MAP_POSITIVE_X)
   * @param {{ width: number, height: number, data: Uint8Array }} faceData
   */
  uploadCubeFace(id, face, { width, height, data }) {
    const gl = this.gl;
    const tex = this.textures.get(id);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex.handle);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }
  /**
   * Update a texture from an external source (video, image, canvas).
   * This is used for media input effects that need to display camera/video content.
   * @param {string} id - Texture ID
   * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement|ImageBitmap} source - Media source
   * @param {object} [options] - Update options
   * @param {boolean} [options.flipY=true] - Whether to flip the Y axis
   */
  updateTextureFromSource(id, source, options = {}) {
    const gl = this.gl;
    if (!gl) return { width: 0, height: 0 };
    let tex = this.textures.get(id);
    const flipY = options.flipY !== false;
    let width, height;
    if (source instanceof HTMLVideoElement) {
      width = source.videoWidth;
      height = source.videoHeight;
    } else if (source instanceof HTMLImageElement) {
      width = source.naturalWidth || source.width;
      height = source.naturalHeight || source.height;
    } else if (source instanceof HTMLCanvasElement || source instanceof ImageBitmap) {
      width = source.width;
      height = source.height;
    } else {
      console.warn(`[updateTextureFromSource] Unknown source type for ${id}`);
      return { width: 0, height: 0 };
    }
    if (width === 0 || height === 0) {
      return { width: 0, height: 0 };
    }
    if (!tex || tex.width !== width || tex.height !== height) {
      if (tex) {
        gl.deleteTexture(tex.handle);
      }
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      tex = {
        handle: texture,
        width,
        height,
        format: "rgba8",
        glFormat: this.resolveFormat("rgba8"),
        isExternal: true
      };
      this.textures.set(id, tex);
    }
    gl.bindTexture(gl.TEXTURE_2D, tex.handle);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { width, height };
  }
  /**
   * Upload mesh data (positions/normals/uvs) to a mesh surface's textures.
   * Used by meshLoader effect when loading OBJ files.
   * @param {string} meshId - Mesh surface ID (e.g., "mesh0")
   * @param {Float32Array} positionData - RGBA32F position data (xyz, w=valid flag)
   * @param {Float32Array} normalData - RGBA32F normal data (xyz, w=0)
   * @param {Float32Array} uvData - RGBA16F UV data (uv, zw=0)
   * @param {number} width - Texture width
   * @param {number} height - Texture height
   * @param {number} vertexCount - Number of valid vertices
   * @returns {{ success: boolean, vertexCount: number }}
   */
  _uploadMeshTexture(texId, data, width, height, internalFormat, formatName) {
    const gl = this.gl;
    let tex = this.textures.get(texId);
    if (!tex || tex.width !== width || tex.height !== height) {
      if (tex) gl.deleteTexture(tex.handle);
      const handle = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, handle);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, gl.RGBA, gl.FLOAT, data);
      this.textures.set(texId, {
        handle,
        width,
        height,
        format: formatName,
        glFormat: { internal: internalFormat, format: gl.RGBA, type: gl.FLOAT }
      });
    } else {
      gl.bindTexture(gl.TEXTURE_2D, tex.handle);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.FLOAT, data);
    }
  }
  /**
   * Upload a CPU-side Float32Array as a 2D RGBA32F texture.
   * Creates the texture on first call, updates via texSubImage2D on subsequent calls.
   * @param {string} id - Texture identifier
   * @param {Float32Array} data - RGBA float data (width * height * 4 elements)
   * @param {number} width - Texture width
   * @param {number} height - Texture height
   */
  uploadDataTexture(id, data, width, height) {
    const gl = this.gl;
    let tex = this.textures.get(id);
    if (!tex || tex.width !== width || tex.height !== height) {
      if (tex) gl.deleteTexture(tex.handle);
      const handle = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, handle);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);
      this.textures.set(id, {
        handle,
        width,
        height,
        format: "rgba32f",
        glFormat: { internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT }
      });
    } else {
      gl.bindTexture(gl.TEXTURE_2D, tex.handle);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.FLOAT, data);
    }
  }
  uploadMeshData(meshId, positionData, normalData, uvData, width, height, vertexCount) {
    const gl = this.gl;
    const posId = `global_${meshId}_positions`;
    const normId = `global_${meshId}_normals`;
    const uvId = `global_${meshId}_uvs`;
    this._uploadMeshTexture(posId, positionData, width, height, gl.RGBA32F, "rgba32f");
    this._uploadMeshTexture(normId, normalData, width, height, gl.RGBA32F, "rgba32f");
    this._uploadMeshTexture(uvId, uvData, width, height, gl.RGBA16F, "rgba16f");
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { success: true, vertexCount };
  }
  /**
   * Read pixels from a texture for testing/parity diffing. Mirrors
   * WebGPUBackend.readPixels(): returns top-down RGBA8 (0-255) regardless of the
   * texture's internal format. gl.readPixels is bottom-up, so the rows are flipped
   * to top-down to match the WebGPU backend's readback orientation.
   * @param {string} textureId
   * @returns {{width:number, height:number, data:Uint8Array}}
   */
  readPixels(textureId) {
    const gl = this.gl;
    const tex = this.textures.get(textureId);
    if (!tex) throw new Error(`Texture ${textureId} not found`);
    const { handle, width, height, glFormat } = tex;
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, handle, 0);
    const out = new Uint8Array(width * height * 4);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      const isFloat = glFormat && (glFormat.type === gl.HALF_FLOAT || glFormat.type === gl.FLOAT);
      if (isFloat) {
        const buf = new Float32Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, buf);
        for (let i = 0; i < out.length; i++) {
          out[i] = Math.max(0, Math.min(255, Math.round(buf[i] * 255)));
        }
      } else {
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, out);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    const flipped = new Uint8Array(width * height * 4);
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
      flipped.set(out.subarray((height - 1 - y) * rowBytes, (height - y) * rowBytes), y * rowBytes);
    }
    return { width, height, data: flipped };
  }
  destroyTexture(id) {
    const gl = this.gl;
    const tex = this.textures.get(id);
    if (tex) {
      gl.deleteTexture(tex.handle);
      this.textures.delete(id);
    }
    const fbo = this.fbos.get(id);
    if (fbo) {
      gl.deleteFramebuffer(fbo);
      this.fbos.delete(id);
    }
    const mrtToDelete = [];
    for (const fboId of this.fbos.keys()) {
      if (fboId.startsWith("mrt_") && fboId.includes(id)) {
        mrtToDelete.push(fboId);
      }
    }
    for (const mrtId of mrtToDelete) {
      gl.deleteFramebuffer(this.fbos.get(mrtId));
      this.fbos.delete(mrtId);
    }
  }
  /**
   * Clear a texture to transparent black.
   * Used to clear surfaces when chains are deleted.
   * @param {string} id - Texture ID
   */
  clearTexture(id) {
    const gl = this.gl;
    const tex = this.textures.get(id);
    if (!tex) {
      return;
    }
    let fbo = this.fbos.get(id);
    if (!fbo) {
      fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.handle, 0);
      this.fbos.set(id, fbo);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    }
    gl.viewport(0, 0, tex.width, tex.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  /**
   * Copy one texture to another (blit operation).
   * Used for surface copy operations.
   * @param {string} srcId - Source texture ID
   * @param {string} dstId - Destination texture ID
   */
  copyTexture(srcId, dstId) {
    const gl = this.gl;
    const srcTex = this.textures.get(srcId);
    const dstTex = this.textures.get(dstId);
    if (!srcTex || !dstTex) {
      console.warn(`[copyTexture] Missing texture: src=${srcId} (${!!srcTex}), dst=${dstId} (${!!dstTex})`);
      return;
    }
    let readFbo = this.fbos.get(srcId);
    if (!readFbo) {
      readFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFbo);
      gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, srcTex.handle, 0);
    } else {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFbo);
    }
    let drawFbo = this.fbos.get(dstId);
    if (!drawFbo) {
      drawFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, drawFbo);
      gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dstTex.handle, 0);
      this.fbos.set(dstId, drawFbo);
    } else {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, drawFbo);
    }
    gl.blitFramebuffer(
      0,
      0,
      srcTex.width,
      srcTex.height,
      0,
      0,
      dstTex.width,
      dstTex.height,
      gl.COLOR_BUFFER_BIT,
      gl.NEAREST
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }
  async compileProgram(id, spec) {
    const gl = this.gl;
    const rawSource = spec.source || spec.glsl || spec.fragment;
    if (!rawSource) {
      throw new Error(`Shader source missing for program '${id}'. You may need to regenerate the shader manifest.`);
    }
    const source = this.injectDefines(rawSource, spec.defines || {});
    const vsSource = spec.vertex || DEFAULT_VERTEX_SHADER;
    const usingDefaultVertex = !spec.vertex;
    const vertShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, source);
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    if (usingDefaultVertex) {
      gl.bindAttribLocation(program, 0, "a_position");
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw {
        code: "ERR_SHADER_LINK",
        detail: log,
        program: id
      };
    }
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    const uniforms = this.extractUniforms(program);
    const uniformBlocks = this.extractUniformBlocks(program, spec);
    const attributes = {
      a_position: gl.getAttribLocation(program, "a_position"),
      aPosition: gl.getAttribLocation(program, "aPosition")
    };
    const compiledProgram = {
      handle: program,
      uniforms,
      uniformBlocks,
      attributes
    };
    this.programs.set(id, compiledProgram);
    return compiledProgram;
  }
  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      console.error("[GLSL compile error]", log);
      console.error("[GLSL source]", source);
      gl.deleteShader(shader);
      throw {
        code: "ERR_SHADER_COMPILE",
        detail: log,
        source
      };
    }
    return shader;
  }
  injectDefines(source, defines) {
    if (!source) {
      throw new Error("Shader source is missing. You may need to regenerate the shader manifest.");
    }
    let injected = "#version 300 es\nprecision highp float;\nprecision highp int;\n";
    for (const [key, value] of Object.entries(defines)) {
      injected += `#define ${key} ${value}
`;
    }
    const cleaned = source.replace(/^\s*#version.*$/m, "");
    return injected + cleaned;
  }
  extractUniforms(program) {
    const gl = this.gl;
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      const location = gl.getUniformLocation(program, info.name);
      uniforms[info.name] = {
        location,
        type: info.type,
        size: info.size
      };
      if (info.name.endsWith("[0]")) {
        const baseName = info.name.slice(0, -3);
        uniforms[baseName] = uniforms[info.name];
      }
    }
    return uniforms;
  }
  extractUniformBlocks(program, spec) {
    const gl = this.gl;
    const blocks = [];
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);
    if (!count || !spec.uniformLayout) return blocks;
    const maxBlockSize = gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniformBlockName(program, i);
      if (!name) continue;
      const declaredSize = gl.getActiveUniformBlockParameter(program, i, gl.UNIFORM_BLOCK_DATA_SIZE);
      const layoutSize = this.getPackedUniformLayoutSize(spec.uniformLayout);
      const size = Math.max(declaredSize, layoutSize);
      if (size > maxBlockSize) {
        throw {
          code: "ERR_UNIFORM_BLOCK_TOO_LARGE",
          detail: `Uniform block ${name} requires ${size} bytes; device limit is ${maxBlockSize}`,
          program
        };
      }
      const bindingPoint = blocks.length;
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
      gl.bufferData(gl.UNIFORM_BUFFER, size, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);
      gl.uniformBlockBinding(program, i, bindingPoint);
      blocks.push({
        name,
        index: i,
        bindingPoint,
        buffer,
        size,
        layout: spec.uniformLayout
      });
    }
    return blocks;
  }
  getPackedUniformLayoutSize(layout) {
    const layoutArray = this.normalizePackedUniformLayout(layout);
    let maxSlot = 0;
    for (const entry of layoutArray) {
      maxSlot = Math.max(maxSlot, entry.slot);
    }
    return (maxSlot + 1) * 16;
  }
  normalizePackedUniformLayout(layout) {
    if (Array.isArray(layout)) return layout;
    const layoutArray = [];
    for (const [name, spec] of Object.entries(layout || {})) {
      layoutArray.push({ name, slot: spec.slot, components: spec.components });
    }
    return layoutArray;
  }
  executePass(pass, state) {
    const gl = this.gl;
    let maxErrorDrain = 100;
    while (gl.getError() !== gl.NO_ERROR && maxErrorDrain-- > 0) {
    }
    const needsConversion = pass.storageTextures || pass.outputs && pass.outputs.outputBuffer;
    const effectivePass = needsConversion ? this.convertComputeToRender(pass) : pass;
    const program = this.programs.get(effectivePass.program);
    if (!program) {
      console.error(`Program ${effectivePass.program} not found for pass ${effectivePass.id}`);
      throw {
        code: "ERR_PROGRAM_NOT_FOUND",
        pass: effectivePass.id,
        program: effectivePass.program
      };
    }
    gl.useProgram(program.handle);
    const outputKeys = Object.keys(effectivePass.outputs || {});
    const isMRT = effectivePass.drawBuffers > 1 || outputKeys.length > 1;
    let fbo = null;
    let viewportTex = null;
    let outputId = null;
    let mrtAttachmentCount = 0;
    if (isMRT) {
      const textures = [];
      const resolvedOutputIds = [];
      for (const outputKey of outputKeys) {
        let currentOutputId = effectivePass.outputs[outputKey];
        const globalName = this.parseGlobalName(currentOutputId);
        if (globalName) {
          if (state.writeSurfaces && state.writeSurfaces[globalName]) {
            currentOutputId = state.writeSurfaces[globalName];
          }
        }
        if (!outputId) outputId = currentOutputId;
        resolvedOutputIds.push(currentOutputId);
        const tex = this.textures.get(currentOutputId);
        if (tex) {
          textures.push(tex.handle);
          if (!viewportTex) viewportTex = tex;
        } else {
          console.warn(`[executePass MRT] Texture not found for ${currentOutputId} in pass ${effectivePass.id}`);
        }
      }
      if (textures.length > 0) {
        const mrtId = `mrt_${effectivePass.id}_${resolvedOutputIds.join("_")}`;
        fbo = this.createMRTFBO(mrtId, textures);
        mrtAttachmentCount = textures.length;
      }
    } else {
      outputId = effectivePass.outputs?.color || Object.values(effectivePass.outputs || {})[0];
      const globalName = this.parseGlobalName(outputId);
      if (globalName) {
        if (state.writeSurfaces && state.writeSurfaces[globalName]) {
          outputId = state.writeSurfaces[globalName];
        }
      }
      fbo = this.fbos.get(outputId);
      if (!fbo && outputId !== "screen") {
        console.warn(`[executePass] FBO not found for ${outputId} in pass ${effectivePass.id}`);
      }
      viewportTex = this.textures.get(outputId);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo || null);
    if (isMRT && fbo && mrtAttachmentCount > 0) {
      const drawBuffers = [];
      for (let i = 0; i < mrtAttachmentCount; i++) {
        drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
      }
      gl.drawBuffers(drawBuffers);
    }
    if (viewportTex) {
      gl.viewport(0, 0, viewportTex.width, viewportTex.height);
    } else if (effectivePass.viewport) {
      gl.viewport(effectivePass.viewport.x, effectivePass.viewport.y, effectivePass.viewport.w, effectivePass.viewport.h);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    this.bindTextures(effectivePass, program, state);
    this.bindUniforms(effectivePass, program, state);
    this.bindUniformBlocks(effectivePass, program, state);
    if (effectivePass.blend) {
      gl.enable(gl.BLEND);
      if (Array.isArray(effectivePass.blend)) {
        const srcFactor = this.resolveBlendFactor(effectivePass.blend[0]);
        const dstFactor = this.resolveBlendFactor(effectivePass.blend[1]);
        gl.blendFunc(srcFactor, dstFactor);
      } else {
        gl.blendFunc(gl.ONE, gl.ONE);
      }
    } else {
      gl.disable(gl.BLEND);
    }
    if (effectivePass.drawMode === "points") {
      let count = effectivePass.count || 1e3;
      if (count === "auto" || count === "screen" || count === "input") {
        let refTex = null;
        if (count === "input" && effectivePass.inputs) {
          const stateInputId = effectivePass.inputs.xyzTex || effectivePass.inputs.inputTex;
          if (stateInputId) {
            const inputGlobalName = this.parseGlobalName(stateInputId);
            if (inputGlobalName) {
              const surfaceTex = state.surfaces?.[inputGlobalName];
              if (surfaceTex) {
                refTex = surfaceTex;
              }
            } else {
              refTex = this.textures.get(stateInputId);
            }
          }
        } else {
          const tex = this.textures.get(outputId);
          refTex = tex;
        }
        if (refTex && refTex.width && refTex.height) {
          count = refTex.width * refTex.height;
        } else {
          count = gl.drawingBufferWidth * gl.drawingBufferHeight;
        }
      }
      gl.bindVertexArray(this.emptyVAO);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.bindVertexArray(null);
    } else if (effectivePass.drawMode === "billboards") {
      let count = effectivePass.count || 1e3;
      if (count === "auto" || count === "screen" || count === "input") {
        let refTex = null;
        if (count === "input" && effectivePass.inputs && effectivePass.inputs.xyzTex) {
          const inputId = effectivePass.inputs.xyzTex;
          const inputGlobalName = this.parseGlobalName(inputId);
          if (inputGlobalName) {
            const surfaceTex = state.surfaces?.[inputGlobalName];
            if (surfaceTex) {
              refTex = surfaceTex;
            }
          } else {
            refTex = this.textures.get(inputId);
          }
        } else {
          const tex = this.textures.get(outputId);
          refTex = tex;
        }
        if (refTex && refTex.width && refTex.height) {
          count = refTex.width * refTex.height;
        } else {
          count = gl.drawingBufferWidth * gl.drawingBufferHeight;
        }
      }
      gl.bindVertexArray(this.emptyVAO);
      gl.drawArrays(gl.TRIANGLES, 0, count * 6);
      gl.bindVertexArray(null);
    } else if (effectivePass.drawMode === "triangles") {
      const vpWidth = viewportTex?.width || gl.drawingBufferWidth;
      const vpHeight = viewportTex?.height || gl.drawingBufferHeight;
      if (fbo) {
        this.ensureDepthBuffer(fbo, vpWidth, vpHeight);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);
      gl.frontFace(gl.CCW);
      gl.cullFace(gl.BACK);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      let count = effectivePass.count || 3;
      if (effectivePass.countUniform) {
        const uniformName = effectivePass.countUniform;
        let uniformValue = effectivePass.uniforms?.[uniformName];
        if (uniformValue === void 0) {
          uniformValue = state.globalUniforms?.[uniformName];
        }
        if (typeof uniformValue === "number" && uniformValue > 0) {
          count = uniformValue;
        }
      } else if (count === "auto" || count === "input") {
        let refTex = null;
        if (effectivePass.inputs) {
          const meshInputId = effectivePass.inputs.meshPositions || effectivePass.inputs.inputTex;
          if (meshInputId) {
            refTex = this.textures.get(meshInputId);
            if (!refTex) {
              const unscopedId = meshInputId.replace(/_chain_\d+$/, "");
              if (unscopedId !== meshInputId) {
                refTex = this.textures.get(unscopedId);
              }
            }
            if (!refTex) {
              const inputGlobalName = this.parseGlobalName(meshInputId);
              if (inputGlobalName) {
                refTex = state.surfaces?.[inputGlobalName];
              }
            }
          }
        }
        if (refTex && refTex.width && refTex.height) {
          count = refTex.width * refTex.height;
        } else {
          count = 3;
        }
      }
      gl.bindVertexArray(this.emptyVAO);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      gl.bindVertexArray(null);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
    } else {
      gl.bindVertexArray(this.fullscreenVAO);
      gl.drawArrays(gl.TRIANGLES, 0, FULLSCREEN_TRIANGLE_VERTEX_COUNT);
      gl.bindVertexArray(null);
    }
    let error = gl.getError();
    let maxErrorLog = 100;
    while (error !== gl.NO_ERROR && maxErrorLog-- > 0) {
      const outputId2 = effectivePass.outputs?.color || Object.values(effectivePass.outputs || {})[0] || "unknown";
      const inputIds = effectivePass.inputs ? Object.entries(effectivePass.inputs).map(([k, v]) => `${k}=${v}`).join(", ") : "none";
      console.error(`WebGL Error ${error} in pass ${effectivePass.id} (effect: ${effectivePass.effectKey || "unknown"}, program: ${effectivePass.program}, output: ${outputId2}, inputs: ${inputIds})`);
      error = gl.getError();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(null);
    gl.disable(gl.BLEND);
  }
  /**
   * Convert a compute pass to a GPGPU render pass for WebGL2 fallback
   * WebGL2 doesn't support compute shaders, so we use fragment shaders
   * with fullscreen triangles to achieve similar functionality.
   */
  convertComputeToRender(pass) {
    const renderPass = {
      ...pass,
      type: "render",
      _originalType: "compute"
    };
    if (pass.storageTextures) {
      renderPass.outputs = {};
      for (const [key, texId] of Object.entries(pass.storageTextures)) {
        renderPass.outputs[key] = texId;
      }
    }
    if (pass.outputs) {
      renderPass.outputs = {};
      for (const [key, texId] of Object.entries(pass.outputs)) {
        const normalizedKey = key === "outputBuffer" ? "color" : key;
        renderPass.outputs[normalizedKey] = texId;
      }
    }
    if (!renderPass.outputs || Object.keys(renderPass.outputs).length === 0) {
      renderPass.outputs = { color: "outputTex" };
    }
    return renderPass;
  }
  bindTextures(pass, program, state) {
    const gl = this.gl;
    let unit = 0;
    if (!pass.inputs) return;
    for (const [samplerName, texId] of Object.entries(pass.inputs)) {
      if (unit >= this.maxTextureUnits) {
        throw {
          code: "ERR_TOO_MANY_TEXTURES",
          pass: pass.id,
          limit: this.maxTextureUnits
        };
      }
      let texture;
      let texInfo;
      const globalName = this.parseGlobalName(texId);
      if (globalName) {
        texInfo = this.textures.get(texId);
        texture = texInfo?.handle;
        if (!texture) {
          const unscopedId = texId.replace(/_chain_\d+$/, "");
          if (unscopedId !== texId) {
            texInfo = this.textures.get(unscopedId);
            texture = texInfo?.handle;
          }
        }
        if (!texture) {
          texture = state.surfaces?.[globalName]?.handle;
        }
      } else {
        texInfo = this.textures.get(texId);
        texture = texInfo?.handle;
      }
      if (!texture) {
        texture = this.defaultTexture;
      }
      const is3D = texInfo?.is3D;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(is3D ? gl.TEXTURE_3D : gl.TEXTURE_2D, texture || null);
      const uniform = program.uniforms[samplerName];
      if (uniform) {
        gl.uniform1i(uniform.location, unit);
      }
      unit++;
    }
  }
  bindUniforms(pass, program, state) {
    const gl = this.gl;
    const programUniforms = program.uniforms;
    if (pass.uniforms) {
      for (const name in pass.uniforms) {
        const uniform = programUniforms[name];
        if (!uniform) continue;
        const value = pass.uniforms[name];
        if (value === void 0 || value === null) continue;
        this._setUniform(gl, uniform, value);
      }
    }
    if (state.globalUniforms) {
      for (const name in state.globalUniforms) {
        if (pass.uniforms && name in pass.uniforms) continue;
        const uniform = programUniforms[name];
        if (!uniform) continue;
        const value = state.globalUniforms[name];
        if (value === void 0 || value === null) continue;
        this._setUniform(gl, uniform, value);
      }
    }
  }
  bindUniformBlocks(pass, program, state) {
    if (!program.uniformBlocks || program.uniformBlocks.length === 0) return;
    const gl = this.gl;
    const merged = this._mergedUniforms;
    const mergedKeys = this._mergedUniformKeys;
    for (let i = 0; i < mergedKeys.length; i++) {
      merged[mergedKeys[i]] = void 0;
    }
    mergedKeys.length = 0;
    if (pass.uniforms) {
      for (const key in pass.uniforms) {
        const val = pass.uniforms[key];
        if (val !== void 0) {
          merged[key] = val;
          mergedKeys.push(key);
        }
      }
    }
    if (state.globalUniforms) {
      for (const key in state.globalUniforms) {
        if (pass.uniforms && key in pass.uniforms) continue;
        const val = state.globalUniforms[key];
        if (val !== void 0) {
          if (merged[key] === void 0) {
            mergedKeys.push(key);
          }
          merged[key] = val;
        }
      }
    }
    for (const block of program.uniformBlocks) {
      const data = this.packUniformsWithLayout(merged, block.layout, block.size);
      gl.bindBuffer(gl.UNIFORM_BUFFER, block.buffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, block.bindingPoint, block.buffer);
    }
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }
  _resolveUniformAlias(name, uniforms) {
    if (uniforms[name] !== void 0) return uniforms[name];
    if (name === "width" && uniforms.resolution) return uniforms.resolution[0];
    if (name === "height" && uniforms.resolution) return uniforms.resolution[1];
    if (name === "channels") return 4;
    return void 0;
  }
  packUniformsWithLayout(uniforms, layout, minSize = 0) {
    const layoutArray = this.normalizePackedUniformLayout(layout);
    let maxSlot = 0;
    for (const entry of layoutArray) {
      maxSlot = Math.max(maxSlot, entry.slot);
    }
    const bufferSize = Math.max(minSize, (maxSlot + 1) * 16);
    if (bufferSize > this._packedUniformBuffer.byteLength) {
      this._packedUniformBuffer = new ArrayBuffer(bufferSize);
      this._packedUniformView = new DataView(this._packedUniformBuffer);
      this._packedUniformBytes = new Uint8Array(this._packedUniformBuffer);
    }
    const bytes = this._packedUniformBytes;
    const view = this._packedUniformView;
    bytes.fill(0, 0, bufferSize);
    const componentOffset = { x: 0, y: 4, z: 8, w: 12 };
    for (const entry of layoutArray) {
      const value = this._resolveUniformAlias(entry.name, uniforms);
      if (value === void 0 || value === null) continue;
      const slotOffset = entry.slot * 16;
      if (entry.components.length === 1) {
        const offset = slotOffset + componentOffset[entry.components];
        if (typeof value === "boolean") {
          view.setFloat32(offset, value ? 1 : 0, true);
        } else if (typeof value === "number") {
          view.setFloat32(offset, value, true);
        }
      } else if (entry.components.length === 2) {
        const offset = slotOffset + componentOffset[entry.components[0]];
        if (Array.isArray(value)) {
          for (let i = 0; i < Math.min(value.length, 2); i++) {
            view.setFloat32(offset + i * 4, value[i], true);
          }
        } else if (typeof value === "number") {
          view.setFloat32(offset, value, true);
        }
      } else if (entry.components.length === 3) {
        const offset = slotOffset + componentOffset[entry.components[0]];
        if (Array.isArray(value)) {
          for (let i = 0; i < Math.min(value.length, 3); i++) {
            view.setFloat32(offset + i * 4, value[i], true);
          }
        } else if (typeof value === "number") {
          view.setFloat32(offset, value, true);
        }
      } else if (entry.components.length === 4) {
        const offset = slotOffset;
        if (Array.isArray(value)) {
          for (let i = 0; i < Math.min(value.length, 4); i++) {
            view.setFloat32(offset + i * 4, value[i], true);
          }
        } else if (typeof value === "number") {
          view.setFloat32(offset, value, true);
        }
      }
    }
    return bytes.subarray(0, bufferSize);
  }
  /** @private Helper to set a single uniform value */
  _setUniform(gl, uniform, value) {
    const loc = uniform.location;
    switch (uniform.type) {
      case gl.FLOAT:
        if (value instanceof Float32Array || Array.isArray(value)) {
          gl.uniform1fv(loc, value);
        } else {
          gl.uniform1f(loc, value);
        }
        break;
      case gl.INT:
      case gl.BOOL:
        gl.uniform1i(loc, typeof value === "boolean" ? value ? 1 : 0 : value);
        break;
      case gl.FLOAT_VEC2: {
        const v2 = Array.isArray(value) ? value : [value, value];
        const arr2 = this._vec2Buf;
        arr2[0] = v2[0] ?? 0;
        arr2[1] = v2[1] ?? 0;
        gl.uniform2fv(loc, arr2);
        break;
      }
      case gl.FLOAT_VEC3: {
        const v3 = Array.isArray(value) ? value : [value, value, value];
        const arr3 = this._vec3Buf;
        arr3[0] = v3[0] ?? 0;
        arr3[1] = v3[1] ?? 0;
        arr3[2] = v3[2] ?? 0;
        gl.uniform3fv(loc, arr3);
        break;
      }
      case gl.FLOAT_VEC4: {
        const v4 = Array.isArray(value) ? value : [value, value, value, value];
        const arr4 = this._vec4Buf;
        arr4[0] = v4[0] ?? 0;
        arr4[1] = v4[1] ?? 0;
        arr4[2] = v4[2] ?? 0;
        arr4[3] = v4[3] ?? 1;
        gl.uniform4fv(loc, arr4);
        break;
      }
      case gl.FLOAT_MAT3:
        gl.uniformMatrix3fv(loc, false, value);
        break;
      case gl.FLOAT_MAT4:
        gl.uniformMatrix4fv(loc, false, value);
        break;
    }
  }
  beginFrame() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
  }
  endFrame() {
    const gl = this.gl;
    gl.flush();
  }
  present(textureId) {
    const gl = this.gl;
    const tex = this.textures.get(textureId);
    if (!tex || !this.presentProgram || !this.fullscreenVAO) {
      console.warn("Present skipped: missing texture or program", { textureId, tex, prog: !!this.presentProgram });
      return;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.presentProgram.handle);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex.handle);
    gl.uniform1i(this.presentProgram.uniforms.texture, 0);
    gl.bindVertexArray(this.fullscreenVAO);
    gl.drawArrays(gl.TRIANGLES, 0, FULLSCREEN_TRIANGLE_VERTEX_COUNT);
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error(`WebGL Error in present: ${error}`);
    }
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }
  destroy(options = {}) {
    const gl = this.gl;
    if (!gl) {
      return;
    }
    if (!options?.skipTextures) {
      for (const id of Array.from(this.textures.keys())) {
        this.destroyTexture(id);
      }
      this.textures.clear();
    }
    for (const program of this.programs.values()) {
      if (program?.handle) {
        gl.deleteProgram(program.handle);
      }
    }
    this.programs.clear();
    if (this.presentProgram?.handle) {
      gl.deleteProgram(this.presentProgram.handle);
    }
    this.presentProgram = null;
    if (this.fullscreenVAO) {
      gl.deleteVertexArray(this.fullscreenVAO);
      this.fullscreenVAO = null;
    }
    if (this.emptyVAO) {
      gl.deleteVertexArray(this.emptyVAO);
      this.emptyVAO = null;
    }
    for (const entry of this.depthBuffers.values()) {
      if (entry?.buffer) {
        gl.deleteRenderbuffer(entry.buffer);
      }
    }
    this.depthBuffers.clear();
    this.fbos.clear();
    if (options?.loseContext) {
      const loseCtx = gl.getExtension("WEBGL_lose_context");
      if (loseCtx) {
        loseCtx.loseContext();
      }
    }
    this.gl = null;
    this.context = null;
  }
  resolveFormat(format) {
    const gl = this.gl;
    const formats = {
      "rgba8": {
        internalFormat: gl.RGBA8,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE
      },
      "rgba16f": {
        internalFormat: gl.RGBA16F,
        format: gl.RGBA,
        type: gl.HALF_FLOAT
      },
      "rgba32f": {
        internalFormat: gl.RGBA32F,
        format: gl.RGBA,
        type: gl.FLOAT
      },
      "r8": {
        internalFormat: gl.R8,
        format: gl.RED,
        type: gl.UNSIGNED_BYTE
      },
      "r16f": {
        internalFormat: gl.R16F,
        format: gl.RED,
        type: gl.HALF_FLOAT
      },
      "r32f": {
        internalFormat: gl.R32F,
        format: gl.RED,
        type: gl.FLOAT
      }
    };
    return formats[format] || formats["rgba8"];
  }
  /**
   * Convert blend factor string to GL constant
   * @param {string|number} factor - Blend factor string (e.g., "ONE", "SRC_ALPHA") or GL constant
   * @returns {number} GL blend factor constant
   */
  resolveBlendFactor(factor) {
    const gl = this.gl;
    if (typeof factor === "number") return factor;
    const factors = {
      "ZERO": gl.ZERO,
      "ONE": gl.ONE,
      "SRC_COLOR": gl.SRC_COLOR,
      "ONE_MINUS_SRC_COLOR": gl.ONE_MINUS_SRC_COLOR,
      "DST_COLOR": gl.DST_COLOR,
      "ONE_MINUS_DST_COLOR": gl.ONE_MINUS_DST_COLOR,
      "SRC_ALPHA": gl.SRC_ALPHA,
      "ONE_MINUS_SRC_ALPHA": gl.ONE_MINUS_SRC_ALPHA,
      "DST_ALPHA": gl.DST_ALPHA,
      "ONE_MINUS_DST_ALPHA": gl.ONE_MINUS_DST_ALPHA,
      "CONSTANT_COLOR": gl.CONSTANT_COLOR,
      "ONE_MINUS_CONSTANT_COLOR": gl.ONE_MINUS_CONSTANT_COLOR,
      "CONSTANT_ALPHA": gl.CONSTANT_ALPHA,
      "ONE_MINUS_CONSTANT_ALPHA": gl.ONE_MINUS_CONSTANT_ALPHA,
      "SRC_ALPHA_SATURATE": gl.SRC_ALPHA_SATURATE,
      // WebGPU-style lowercase
      "zero": gl.ZERO,
      "one": gl.ONE,
      "src": gl.SRC_COLOR,
      "one-minus-src": gl.ONE_MINUS_SRC_COLOR,
      "dst": gl.DST_COLOR,
      "one-minus-dst": gl.ONE_MINUS_DST_COLOR,
      "src-alpha": gl.SRC_ALPHA,
      "one-minus-src-alpha": gl.ONE_MINUS_SRC_ALPHA,
      "dst-alpha": gl.DST_ALPHA,
      "one-minus-dst-alpha": gl.ONE_MINUS_DST_ALPHA
    };
    return factors[factor] || gl.ONE;
  }
  getName() {
    return "WebGL2";
  }
  static isAvailable() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      return !!gl;
    } catch {
      return false;
    }
  }
};

// shaders/src/runtime/backends/webgpu.js
function float16ToFloat32(h) {
  const sign = h >> 15 & 1;
  const exponent = h >> 10 & 31;
  const mantissa = h & 1023;
  if (exponent === 0) {
    if (mantissa === 0) {
      return sign ? -0 : 0;
    }
    const f2 = mantissa / 1024;
    return (sign ? -1 : 1) * f2 * Math.pow(2, -14);
  } else if (exponent === 31) {
    if (mantissa === 0) {
      return sign ? -Infinity : Infinity;
    }
    return NaN;
  }
  const f = 1 + mantissa / 1024;
  return (sign ? -1 : 1) * f * Math.pow(2, exponent - 15);
}
var WebGPUBackend = class _WebGPUBackend extends Backend {
  constructor(device, context) {
    super(device);
    this.device = device;
    this.context = context;
    this.queue = device.queue;
    this.pipelines = /* @__PURE__ */ new Map();
    this.bindGroups = /* @__PURE__ */ new Map();
    this.samplers = /* @__PURE__ */ new Map();
    this.storageBuffers = /* @__PURE__ */ new Map();
    this.commandEncoder = null;
    this.defaultVertexModule = null;
    this.canvasFormat = typeof navigator !== "undefined" && navigator.gpu?.getPreferredCanvasFormat ? navigator.gpu.getPreferredCanvasFormat() : null;
    this.depthTexture = null;
    this.depthTextureSize = { width: 0, height: 0 };
    this.uniformBufferPool = [];
    this.activeUniformBuffers = [];
    this._mergedUniforms = {};
    this._mergedUniformKeys = [];
    this._singleUniformFloat32 = new Float32Array(4);
    this._singleUniformInt32 = new Int32Array(4);
    this._singleUniformMat3Float32 = new Float32Array(12);
    this._uniformBufferData = new ArrayBuffer(512);
    this._uniformDataView = new DataView(this._uniformBufferData);
    this._uniformBufferSize = 512;
    this.device.addEventListener("uncapturederror", (event) => {
      console.error("WebGPU uncaptured error:", event.error?.message || event.error);
    });
  }
  /**
   * Parse a global texture reference and extract the surface name.
   * Supports both "global_name" (underscore) and "globalName" (camelCase) patterns.
   * Returns null if not a global reference.
   */
  parseGlobalName(texId) {
    if (typeof texId !== "string") return null;
    if (texId.startsWith("global_")) {
      return texId.replace("global_", "");
    }
    if (texId.startsWith("global") && texId.length > 6) {
      const suffix = texId.slice(6);
      if (/^[A-Z0-9]/.test(suffix)) {
        return suffix.charAt(0).toLowerCase() + suffix.slice(1);
      }
    }
    return null;
  }
  /**
   * Detect if running on a mobile device.
   * Uses user agent and touch capability as heuristics.
   * @returns {boolean}
   */
  static detectMobile() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      return true;
    }
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      return window.screen.width <= 1024;
    }
    return false;
  }
  async init() {
    const isMobile = _WebGPUBackend.detectMobile();
    this.capabilities = {
      isMobile,
      floatBlend: true,
      // WebGPU always supports blending on float textures
      floatLinear: true,
      // WebGPU always supports linear filtering on float textures
      colorBufferFloat: true,
      // WebGPU always supports float render targets
      maxDrawBuffers: 8,
      // WebGPU supports many color attachments
      maxTextureSize: this.device.limits.maxTextureDimension2D || 8192,
      // Cap particle state texture size on mobile to prevent OOM
      maxStateSize: isMobile ? 512 : 2048
    };
    this.samplers.set("default", this.device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    }));
    this.samplers.set("nearest", this.device.createSampler({
      minFilter: "nearest",
      magFilter: "nearest",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    }));
    this.samplers.set("repeat", this.device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat"
    }));
    const dummyTexture = this.device.createTexture({
      size: { width: 1, height: 1, depthOrArrayLayers: 1 },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    this.device.queue.writeTexture(
      { texture: dummyTexture },
      new Uint8Array([0, 0, 0, 0]),
      { bytesPerRow: 4 },
      { width: 1, height: 1, depthOrArrayLayers: 1 }
    );
    this.dummyTextureView = dummyTexture.createView();
    return Promise.resolve();
  }
  createTexture(id, spec) {
    const format = this.resolveFormat(spec.format);
    const usage = this.resolveUsage(spec.usage || ["render", "sample", "copySrc", "copyDst"]);
    const texture = this.device.createTexture({
      size: {
        width: spec.width,
        height: spec.height,
        depthOrArrayLayers: 1
      },
      format,
      usage
    });
    const view = texture.createView();
    this.textures.set(id, {
      handle: texture,
      view,
      width: spec.width,
      height: spec.height,
      format: spec.format,
      gpuFormat: format,
      usage
      // Store the usage flags for later checks
    });
    return texture;
  }
  /**
   * Create a 3D texture for volumetric data.
   * WebGPU has full 3D texture support including storage textures for compute shaders.
   */
  createTexture3D(id, spec) {
    const format = this.resolveFormat(spec.format);
    const usage = this.resolveUsage(spec.usage || ["storage", "sample", "copySrc", "copyDst"]);
    const texture = this.device.createTexture({
      size: {
        width: spec.width,
        height: spec.height,
        depthOrArrayLayers: spec.depth
      },
      dimension: "3d",
      format,
      usage
    });
    const view = texture.createView({ dimension: "3d" });
    this.textures.set(id, {
      handle: texture,
      view,
      width: spec.width,
      height: spec.height,
      depth: spec.depth,
      format: spec.format,
      gpuFormat: format,
      usage,
      is3D: true
    });
    return texture;
  }
  destroyTexture(id) {
    const tex = this.textures.get(id);
    if (tex) {
      tex.handle.destroy();
      this.textures.delete(id);
    }
  }
  /**
   * Allocate a cube-map texture (6 faces, all same size).
   * @param {string} id - Texture identifier
   * @param {{ size: number }} options - Cube face edge length in pixels
   */
  createCubeTexture(id, { size }) {
    const device = this.device;
    const handle = device.createTexture({
      size: [size, size, 6],
      format: "rgba8unorm",
      dimension: "2d",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    const view = handle.createView({ dimension: "cube" });
    this.textures.set(id, { handle, view, width: size, height: size, cube: true });
    return this.textures.get(id);
  }
  /**
   * Upload RGBA8 pixel data to one face of a cube-map texture.
   * Mirrors uploadDataTexture's writeTexture + 256-byte row-alignment pattern.
   * @param {string} id - Texture identifier (must have been created with createCubeTexture)
   * @param {number} face - Face index 0..5 (array layer)
   * @param {{ width: number, height: number, data: Uint8Array }} faceData
   */
  uploadCubeFace(id, face, { width, height, data }) {
    const device = this.device;
    const tex = this.textures.get(id);
    const unalignedBytesPerRow = width * 4;
    const bytesPerRow = Math.ceil(unalignedBytesPerRow / 256) * 256;
    let uploadData = data;
    if (bytesPerRow !== unalignedBytesPerRow) {
      const paddedData = new Uint8Array(bytesPerRow * height);
      for (let y = 0; y < height; y++) {
        paddedData.set(data.subarray(y * unalignedBytesPerRow, (y + 1) * unalignedBytesPerRow), y * bytesPerRow);
      }
      uploadData = paddedData;
    }
    device.queue.writeTexture(
      { texture: tex.handle, origin: [0, 0, face] },
      uploadData,
      { bytesPerRow, rowsPerImage: height },
      { width, height, depthOrArrayLayers: 1 }
    );
  }
  /**
   * Upload mesh data (positions/normals/uvs) to a mesh surface's textures.
   * Used by meshLoader effect when loading OBJ files.
   * @param {string} meshId - Mesh surface ID (e.g., "mesh0")
   * @param {Float32Array} positionData - RGBA32F position data (xyz, w=valid flag)
   * @param {Float32Array} normalData - RGBA16F normal data (xyz, w=0)
   * @param {Float32Array} uvData - RGBA16F UV data (uv, zw=0)
   * @param {number} width - Texture width
   * @param {number} height - Texture height
   * @param {number} vertexCount - Number of valid vertices
   * @returns {{ success: boolean, vertexCount: number }}
   */
  uploadMeshData(meshId, positionData, normalData, uvData, width, height, vertexCount) {
    const device = this.device;
    const posId = `global_${meshId}_positions`;
    const normId = `global_${meshId}_normals`;
    const uvId = `global_${meshId}_uvs`;
    const uploadTexture = (id, data, format, gpuFormat) => {
      let tex = this.textures.get(id);
      if (!tex || tex.width !== width || tex.height !== height) {
        if (tex) tex.handle.destroy();
        const handle = device.createTexture({
          size: { width, height, depthOrArrayLayers: 1 },
          format: gpuFormat,
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING
        });
        tex = {
          handle,
          view: handle.createView(),
          width,
          height,
          format,
          gpuFormat
        };
        this.textures.set(id, tex);
      }
      const bytesPerPixel = gpuFormat === "rgba32float" ? 16 : 8;
      const unalignedBytesPerRow = width * bytesPerPixel;
      const bytesPerRow = Math.ceil(unalignedBytesPerRow / 256) * 256;
      let uploadData = data;
      if (bytesPerRow !== unalignedBytesPerRow) {
        const paddedData = new Float32Array(bytesPerRow / 4 * height);
        const srcRowFloats = width * 4;
        const dstRowFloats = bytesPerRow / 4;
        for (let y = 0; y < height; y++) {
          paddedData.set(data.subarray(y * srcRowFloats, (y + 1) * srcRowFloats), y * dstRowFloats);
        }
        uploadData = paddedData;
      }
      device.queue.writeTexture(
        { texture: tex.handle },
        uploadData,
        { bytesPerRow, rowsPerImage: height },
        { width, height }
      );
    };
    uploadTexture(posId, positionData, "rgba32f", "rgba32float");
    uploadTexture(normId, normalData, "rgba32f", "rgba32float");
    uploadTexture(uvId, uvData, "rgba32f", "rgba32float");
    return { success: true, vertexCount };
  }
  /**
   * Upload a CPU-side Float32Array as a 2D RGBA32F texture.
   * @param {string} id - Texture identifier
   * @param {Float32Array} data - RGBA float data (width * height * 4 elements)
   * @param {number} width - Texture width
   * @param {number} height - Texture height
   */
  uploadDataTexture(id, data, width, height) {
    const device = this.device;
    let tex = this.textures.get(id);
    if (!tex || tex.width !== width || tex.height !== height) {
      if (tex) tex.handle.destroy();
      const handle = device.createTexture({
        size: [width, height],
        format: "rgba32float",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
      });
      this.textures.set(id, {
        handle,
        width,
        height,
        format: "rgba32float",
        view: handle.createView()
      });
      tex = this.textures.get(id);
    }
    const bytesPerRow = width * 4 * 4;
    const alignedBytesPerRow = Math.ceil(bytesPerRow / 256) * 256;
    let uploadData = data;
    if (alignedBytesPerRow !== bytesPerRow) {
      const srcRowFloats = width * 4;
      const dstRowFloats = alignedBytesPerRow / 4;
      const paddedData = new Float32Array(dstRowFloats * height);
      for (let y = 0; y < height; y++) {
        paddedData.set(data.subarray(y * srcRowFloats, (y + 1) * srcRowFloats), y * dstRowFloats);
      }
      uploadData = paddedData;
    }
    device.queue.writeTexture(
      { texture: tex.handle },
      uploadData,
      { bytesPerRow: alignedBytesPerRow, rowsPerImage: height },
      { width, height }
    );
  }
  /**
   * Update a texture from an external source (video, image, canvas).
   * This is used for media input effects that need to display camera/video content.
   * @param {string} id - Texture ID
   * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement|ImageBitmap} source - Media source
   * @param {object} [options] - Update options
   * @param {boolean} [options.flipY=true] - Whether to flip the Y axis
   */
  async updateTextureFromSource(id, source, options = {}) {
    let tex = this.textures.get(id);
    let width, height;
    if (source instanceof HTMLVideoElement) {
      width = source.videoWidth;
      height = source.videoHeight;
    } else if (source instanceof HTMLImageElement) {
      width = source.naturalWidth || source.width;
      height = source.naturalHeight || source.height;
    } else if (source instanceof HTMLCanvasElement || source instanceof ImageBitmap) {
      width = source.width;
      height = source.height;
    } else {
      console.warn(`[updateTextureFromSource] Unknown source type for ${id}`);
      return { width: 0, height: 0 };
    }
    if (width === 0 || height === 0) {
      return { width: 0, height: 0 };
    }
    const flipY = options.flipY !== false;
    if (!tex || tex.width !== width || tex.height !== height) {
      if (tex) {
        tex.handle.destroy();
      }
      const texture = this.device.createTexture({
        size: { width, height, depthOrArrayLayers: 1 },
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
      });
      const view = texture.createView();
      tex = {
        handle: texture,
        view,
        width,
        height,
        format: "rgba8",
        gpuFormat: "rgba8unorm",
        isExternal: true
      };
      this.textures.set(id, tex);
    }
    this.device.queue.copyExternalImageToTexture(
      { source, flipY },
      { texture: tex.handle },
      { width, height }
    );
    return { width, height };
  }
  /**
   * Copy one texture to another (blit operation).
   * Used for surface copy operations.
   * @param {string} srcId - Source texture ID
   * @param {string} dstId - Destination texture ID
   */
  copyTexture(srcId, dstId) {
    const srcTex = this.textures.get(srcId);
    const dstTex = this.textures.get(dstId);
    if (!srcTex || !dstTex) {
      console.warn(`[copyTexture] Missing texture: src=${srcId} (${!!srcTex}), dst=${dstId} (${!!dstTex})`);
      return;
    }
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyTextureToTexture(
      { texture: srcTex.handle },
      { texture: dstTex.handle },
      [srcTex.width, srcTex.height, 1]
    );
    this.device.queue.submit([commandEncoder.finish()]);
  }
  /**
   * Clear a texture to transparent black.
   * Used to clear surfaces when chains are deleted.
   * @param {string} id - Texture ID
   */
  clearTexture(id) {
    const tex = this.textures.get(id);
    if (!tex) {
      return;
    }
    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: tex.view,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store"
      }]
    });
    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }
  /**
   * Resolve the WGSL shader source from a program spec.
   * Looks for sources in order: wgsl, source, fragment (for render shaders)
   */
  resolveWGSLSource(spec) {
    if (spec.wgsl) return spec.wgsl;
    if (spec.source) return spec.source;
    if (spec.fragment && !spec.fragment.includes("#version")) {
      return spec.fragment;
    }
    return null;
  }
  async compileProgram(id, spec) {
    const source = this.resolveWGSLSource(spec);
    if (!source) {
      throw {
        code: "ERR_NO_WGSL_SOURCE",
        detail: `No WGSL shader source found for program '${id}'. Available keys: ${Object.keys(spec).join(", ")}`,
        program: id
      };
    }
    const processedSource = this.injectDefines(source, spec.defines || {});
    const hasComputeEntry = /@compute\s/.test(processedSource);
    const hasFragmentEntry = /@fragment\s/.test(processedSource);
    const detectedEntryPoints = this.detectEntryPoints(processedSource);
    const enhancedSpec = {
      ...spec,
      fragmentEntryPoint: detectedEntryPoints.fragment || spec.fragmentEntryPoint,
      vertexEntryPoint: detectedEntryPoints.vertex || spec.vertexEntryPoint,
      computeEntryPoint: detectedEntryPoints.compute || spec.computeEntryPoint
    };
    if (hasComputeEntry && !hasFragmentEntry) {
      return this.compileComputeProgram(id, processedSource, enhancedSpec);
    }
    if (hasFragmentEntry) {
      return this.compileRenderProgram(id, processedSource, enhancedSpec);
    }
    return this.compileRenderProgram(id, processedSource, enhancedSpec);
  }
  /**
   * Detect entry point names from WGSL source.
   * Looks for @vertex fn name and @fragment fn name patterns.
   */
  detectEntryPoints(source) {
    const result = { vertex: null, fragment: null, compute: null };
    const vertexMatch = /@vertex\s*\n?\s*fn\s+(\w+)/.exec(source);
    if (vertexMatch) {
      result.vertex = vertexMatch[1];
    }
    const fragmentMatch = /@fragment\s*\n?\s*fn\s+(\w+)/.exec(source);
    if (fragmentMatch) {
      result.fragment = fragmentMatch[1];
    }
    const computeMatch = /@compute[^f]*fn\s+(\w+)/.exec(source);
    if (computeMatch) {
      result.compute = computeMatch[1];
    }
    return result;
  }
  /**
   * Parse which bindings are used by each entry point in a multi-entry-point shader.
   * Returns a Map of entryPoint -> Set of binding indices.
   */
  parseEntryPointBindings(source, bindings) {
    const entryPointBindings = /* @__PURE__ */ new Map();
    const entryPointRegex = /@(?:compute|vertex|fragment)[^f]*fn\s+(\w+)\s*\([^)]*\)[^{]*\{/g;
    let match;
    while ((match = entryPointRegex.exec(source)) !== null) {
      const entryPoint = match[1];
      const startIdx = match.index + match[0].length;
      let braceCount = 1;
      let endIdx = startIdx;
      for (let i = startIdx; i < source.length && braceCount > 0; i++) {
        if (source[i] === "{") braceCount++;
        else if (source[i] === "}") braceCount--;
        endIdx = i;
      }
      const functionBody = source.slice(startIdx, endIdx);
      const usedBindings = /* @__PURE__ */ new Set();
      for (const binding of bindings) {
        const nameRegex = new RegExp(`\\b${binding.name}\\b`);
        if (nameRegex.test(functionBody)) {
          usedBindings.add(binding.binding);
        }
      }
      entryPointBindings.set(entryPoint, usedBindings);
    }
    return entryPointBindings;
  }
  async compileComputeProgram(id, source, spec) {
    const module = this.device.createShaderModule({ code: source });
    const compilationInfo = await module.getCompilationInfo();
    const errors = compilationInfo.messages.filter((m) => m.type === "error");
    if (errors.length > 0) {
      throw {
        code: "ERR_SHADER_COMPILE",
        detail: errors.map((e) => `Line ${e.lineNum}: ${e.message}`).join("\n"),
        program: id
      };
    }
    const bindings = this.parseShaderBindings(source);
    const entryPoints = [];
    const entryPointRegex = /@compute[^f]*fn\s+(\w+)/g;
    let match;
    while ((match = entryPointRegex.exec(source)) !== null) {
      entryPoints.push(match[1]);
    }
    const entryPointBindings = this.parseEntryPointBindings(source, bindings);
    const pipelines = /* @__PURE__ */ new Map();
    const defaultEntryPoint = spec.computeEntryPoint || entryPoints[0] || "main";
    const defaultPipeline = this.device.createComputePipeline({
      layout: "auto",
      compute: {
        module,
        entryPoint: defaultEntryPoint
      }
    });
    pipelines.set(defaultEntryPoint, defaultPipeline);
    const programInfo = {
      module,
      pipeline: defaultPipeline,
      // Keep for backward compatibility
      pipelines,
      // Map of entry point -> pipeline
      isCompute: true,
      entryPoint: defaultEntryPoint,
      entryPoints,
      // All available entry points
      entryPointBindings,
      // Map of entry point -> Set of used binding indices
      bindings,
      // Store parsed bindings for bind group creation
      // True if the source contains any `@binding` declarations at all,
      // even ones we filtered out as dead. Used by createBindGroup to
      // distinguish "modern shader, all bindings filtered as dead" (use
      // empty bind group) from "legacy shader, no bindings declared"
      // (fall back to legacy entry builder).
      _sourceHasBindings: this.hasShaderBindings(source),
      // Use definition-provided uniformLayout if available, fall back to shader parsing
      packedUniformLayout: spec.uniformLayout || this.parsePackedUniformLayout(source),
      // Minimum size of any var<uniform> struct in the shader (computed from
      // the source). The bind-group buffer must be at least this big or
      // Dawn rejects with "Binding size (X) is smaller than the minimum
      // binding size (Y)". Catches cases where the packed-layout parser
      // under-estimates because the shader only references a subset of slots.
      declaredUniformBufferSize: this.parseDeclaredUniformBufferSize(source)
    };
    this.programs.set(id, programInfo);
    return programInfo;
  }
  async compileRenderProgram(id, source, spec) {
    let bindings = this.parseShaderBindings(source);
    let sourceHasBindings = this.hasShaderBindings(source);
    const hasVertex = /@vertex\s/.test(source);
    const mainModule = this.device.createShaderModule({ code: source });
    const moduleInfo = await mainModule.getCompilationInfo();
    const moduleErrors = moduleInfo.messages.filter((m) => m.type === "error");
    if (moduleErrors.length > 0) {
      throw {
        code: "ERR_SHADER_COMPILE",
        detail: moduleErrors.map((e) => `Line ${e.lineNum}: ${e.message}`).join("\n"),
        program: id
      };
    }
    let vertexModule;
    let vertexEntryPoint;
    let fragmentModule = mainModule;
    if (spec.vertexWGSL || spec.vertexWgsl) {
      const vertexSource = spec.vertexWGSL || spec.vertexWgsl;
      vertexModule = this.device.createShaderModule({ code: vertexSource });
      const vertexInfo = await vertexModule.getCompilationInfo();
      const vertexErrors = vertexInfo.messages.filter((m) => m.type === "error");
      if (vertexErrors.length > 0) {
        throw {
          code: "ERR_SHADER_COMPILE",
          detail: vertexErrors.map((e) => `Line ${e.lineNum}: ${e.message}`).join("\n"),
          program: id
        };
      }
      vertexEntryPoint = spec.vertexEntryPoint || DEFAULT_VERTEX_ENTRY_POINT;
      const vertexBindings = this.parseShaderBindings(vertexSource);
      sourceHasBindings = sourceHasBindings || this.hasShaderBindings(vertexSource);
      if (vertexBindings.length > 0) {
        const bindingKey = (b) => `${b.group}:${b.binding}`;
        const existingKeys = new Set(bindings.map(bindingKey));
        for (const vb of vertexBindings) {
          if (!existingKeys.has(bindingKey(vb))) {
            bindings.push(vb);
          }
        }
        bindings.sort((a, b) => {
          if (a.group !== b.group) return a.group - b.group;
          return a.binding - b.binding;
        });
      }
    } else if (hasVertex) {
      vertexModule = mainModule;
      vertexEntryPoint = spec.vertexEntryPoint || DEFAULT_VERTEX_ENTRY_POINT;
    } else {
      vertexModule = this.getDefaultVertexModule();
      vertexEntryPoint = DEFAULT_VERTEX_ENTRY_POINT;
    }
    const fragmentEntryPoint = spec.fragmentEntryPoint || spec.entryPoint || DEFAULT_FRAGMENT_ENTRY_POINT;
    const outputFormat = this.resolveFormat(spec?.outputFormat || "rgba16float");
    const pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: vertexModule,
        entryPoint: vertexEntryPoint
      },
      fragment: {
        module: fragmentModule,
        entryPoint: fragmentEntryPoint,
        targets: [{
          format: outputFormat,
          blend: this.resolveBlendState(spec?.blend)
        }]
      },
      primitive: {
        topology: spec?.topology || "triangle-list"
      }
    });
    const pipelineCache = /* @__PURE__ */ new Map();
    const initialKey = this.getPipelineKey({
      topology: spec?.topology,
      blend: spec?.blend,
      format: outputFormat
    });
    pipelineCache.set(initialKey, pipeline);
    const programInfo = {
      module: fragmentModule,
      pipeline,
      isCompute: false,
      vertexModule,
      fragmentModule,
      vertexEntryPoint,
      fragmentEntryPoint,
      outputFormat,
      pipelineCache,
      bindings,
      // Store parsed bindings for bind group creation
      // See compileComputeProgram for what this flag is for.
      _sourceHasBindings: sourceHasBindings,
      // Use definition-provided uniformLayout if available, fall back to shader parsing
      packedUniformLayout: spec.uniformLayout || this.parsePackedUniformLayout(source),
      // Minimum size of any var<uniform> struct in the shader (computed from
      // the source). The bind-group buffer must be at least this big or
      // Dawn rejects with "Binding size (X) is smaller than the minimum
      // binding size (Y)". Catches cases where the packed-layout parser
      // under-estimates because the shader only references a subset of slots.
      declaredUniformBufferSize: this.parseDeclaredUniformBufferSize(source)
    };
    this.programs.set(id, programInfo);
    return programInfo;
  }
  /**
   * Parse the source for `var<uniform> name: StructName;` and return the
   * minimum byte size of the referenced struct, computed from its field
   * declarations. Handles `array<vec4<f32>, N>`, `array<f32, N>`, scalar
   * fields, and vector fields. Returns 0 if no struct is found.
   *
   * Used as a buffer-size floor in createUniformBuffer so the runtime never
   * allocates a uniform buffer smaller than the shader's declared struct,
   * which Dawn rejects.
   */
  parseDeclaredUniformBufferSize(source) {
    const bindingRegex = /var<uniform>\s+\w+\s*:\s*(\w+)\s*;/g;
    let largestSize = 0;
    let bindingMatch;
    while ((bindingMatch = bindingRegex.exec(source)) !== null) {
      const structName = bindingMatch[1];
      const structRegex = new RegExp(`struct\\s+${structName}\\s*\\{([^}]+)\\}`, "g");
      const structMatch = structRegex.exec(source);
      if (!structMatch) continue;
      const body = structMatch[1];
      const size = this.computeWgslStructSize(body);
      if (size > largestSize) largestSize = size;
    }
    return largestSize;
  }
  /**
   * Given the body of a WGSL struct (the contents inside the braces),
   * compute its minimum byte size following std140-compatible alignment
   * rules used by WebGPU uniform buffers.
   *
   * This is a defensive estimator — it errs toward larger sizes when in
   * doubt, since over-allocation is harmless but under-allocation causes
   * Dawn to reject the bind group.
   */
  computeWgslStructSize(body) {
    const cleaned = body.replace(/\/\/[^\n]*/g, "");
    const fields = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (c === "<") depth++;
      else if (c === ">") depth--;
      else if ((c === "," || c === ";") && depth === 0) {
        const piece = cleaned.slice(start, i).trim();
        if (piece) fields.push(piece);
        start = i + 1;
      }
    }
    const tail = cleaned.slice(start).trim();
    if (tail) fields.push(tail);
    let offset = 0;
    let maxAlign = 4;
    for (const field of fields) {
      const colonIdx = field.indexOf(":");
      if (colonIdx < 0) continue;
      const typeExpr = field.slice(colonIdx + 1).trim();
      const { size, align } = this.computeWgslTypeSize(typeExpr);
      if (size === 0) continue;
      offset = Math.ceil(offset / align) * align;
      offset += size;
      if (align > maxAlign) maxAlign = align;
    }
    return Math.ceil(offset / maxAlign) * maxAlign;
  }
  /**
   * Compute size + alignment for a WGSL type expression. Returns
   * { size: 0, align: 4 } for unrecognized types.
   */
  computeWgslTypeSize(typeExpr) {
    const arrayMatch = /^array\s*<\s*(.+?)\s*,\s*(\d+)\s*>$/.exec(typeExpr);
    if (arrayMatch) {
      const elemType = arrayMatch[1];
      const count = parseInt(arrayMatch[2], 10);
      const elem = this.computeWgslTypeSize(elemType);
      const stride = Math.max(elem.size, 16);
      return { size: stride * count, align: Math.max(elem.align, 16) };
    }
    const t = typeExpr.replace(/\s+/g, "");
    const map = {
      "f32": { size: 4, align: 4 },
      "i32": { size: 4, align: 4 },
      "u32": { size: 4, align: 4 },
      "f16": { size: 2, align: 2 },
      "bool": { size: 4, align: 4 },
      "vec2<f32>": { size: 8, align: 8 },
      "vec2f": { size: 8, align: 8 },
      "vec2<i32>": { size: 8, align: 8 },
      "vec2i": { size: 8, align: 8 },
      "vec2<u32>": { size: 8, align: 8 },
      "vec2u": { size: 8, align: 8 },
      "vec3<f32>": { size: 12, align: 16 },
      "vec3f": { size: 12, align: 16 },
      "vec3<i32>": { size: 12, align: 16 },
      "vec3i": { size: 12, align: 16 },
      "vec3<u32>": { size: 12, align: 16 },
      "vec3u": { size: 12, align: 16 },
      "vec4<f32>": { size: 16, align: 16 },
      "vec4f": { size: 16, align: 16 },
      "vec4<i32>": { size: 16, align: 16 },
      "vec4i": { size: 16, align: 16 },
      "vec4<u32>": { size: 16, align: 16 },
      "vec4u": { size: 16, align: 16 },
      "mat3x3<f32>": { size: 48, align: 16 },
      "mat3x3f": { size: 48, align: 16 },
      "mat4x4<f32>": { size: 64, align: 16 },
      "mat4x4f": { size: 64, align: 16 }
    };
    return map[t] || { size: 0, align: 4 };
  }
  /**
   * Parse WGSL shader to extract packed uniform layout.
   *
   * Supports multiple patterns:
   * 1. Array-based: uniforms.data[N].xyz unpacking statements
   * 2. Named struct with comments: struct FooParams { field : vec4<f32>, // (name1, name2, name3, name4) }
   * 3. Named struct with params. prefix: let x = params.field.x; patterns
   *
   * Returns an array of {name, slot, components} sorted by slot then component offset.
   *
   * @param {string} source - WGSL shader source
   * @returns {Array<{name: string, slot: number, components: string}>|null}
   */
  parsePackedUniformLayout(source) {
    const byteLayout = this.parseWgslStructByteLayout(source);
    if (byteLayout && byteLayout.length > 0) {
      return { type: "byte", layout: byteLayout };
    }
    const namedStructLayout = this.parseNamedStructLayout(source);
    if (namedStructLayout && namedStructLayout.length > 0) {
      return namedStructLayout;
    }
    const paramsAccessLayout = this.parseParamsAccessLayout(source);
    if (paramsAccessLayout && paramsAccessLayout.length > 0) {
      return paramsAccessLayout;
    }
    if (!source.includes("uniforms.data[")) {
      return null;
    }
    const layout = [];
    const unpackRegex = /(?:let\s+)?(\w+)(?:\s*:\s*[^\n=]+)?\s*=\s*(?:max\s*\([^,]+,\s*)?(?:i32\s*\(\s*)?uniforms\.data\[(\d+)\]\.([xyzw]+)/g;
    let match;
    while ((match = unpackRegex.exec(source)) !== null) {
      const name = match[1];
      const slot = parseInt(match[2], 10);
      const components = match[3];
      layout.push({ name, slot, components });
    }
    if (layout.length === 0) {
      return null;
    }
    const componentOrder = { x: 0, y: 1, z: 2, w: 3 };
    layout.sort((a, b) => {
      if (a.slot !== b.slot) return a.slot - b.slot;
      return componentOrder[a.components[0]] - componentOrder[b.components[0]];
    });
    return layout;
  }
  /**
   * Parse WGSL struct layout with byte offsets for direct field access patterns.
   * Handles structs where fields are accessed as u.fieldName (not u.field.component).
   * Calculates proper WGSL alignment for each field.
   *
   * NOTE: This function skips structs that have comment annotations with component names
   * like `// (width, height, channels, frequency)` - those should be handled by
   * parseNamedStructLayout instead which maps individual uniform names to struct components.
   *
   * @param {string} source - WGSL shader source
   * @returns {Array<{name: string, offset: number, size: number, type: string}>|null}
   */
  parseWgslStructByteLayout(source) {
    const structRegex = /struct\s+(\w*(?:Params|Uniforms|Config|Settings))\s*\{([^}]+)\}/gi;
    const structMatch = structRegex.exec(source);
    if (!structMatch) {
      return null;
    }
    const structBody = structMatch[2];
    if (/\barray\s*</.test(structBody)) {
      return null;
    }
    if (/\/\/\s*\(\s*\w+(?:\s*,\s*\w+)+\s*\)/.test(structBody)) {
      return null;
    }
    const structName = structMatch[1];
    const bindingRegex = new RegExp(`var<uniform>\\s+(\\w+)\\s*:\\s*${structName}\\s*;`);
    const bindingMatch = bindingRegex.exec(source);
    if (!bindingMatch) {
      return null;
    }
    const uniformVarName = bindingMatch[1];
    const fieldRegex = /(\w+)\s*:\s*(f32|i32|u32|vec2f|vec3f|vec4f|vec2<f32>|vec3<f32>|vec4<f32>|vec2i|vec3i|vec4i|vec2<i32>|vec3<i32>|vec4<i32>|vec2u|vec3u|vec4u|vec2<u32>|vec3<u32>|vec4<u32>)/gi;
    const layout = [];
    let offset = 0;
    let maxAlign = 4;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(structBody)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2].toLowerCase();
      const { size, align, baseType, components } = this.getWgslTypeInfo(fieldType);
      maxAlign = Math.max(maxAlign, align);
      offset = Math.ceil(offset / align) * align;
      if (fieldName.startsWith("_") || fieldName.toLowerCase().startsWith("pad")) {
        offset += size;
        continue;
      }
      layout.push({
        name: fieldName,
        offset,
        size,
        type: baseType,
        components
      });
      offset += size;
    }
    const structSize = Math.ceil(offset / maxAlign) * maxAlign;
    const usageRegex = new RegExp(`${uniformVarName}\\.(\\w+)`);
    if (!usageRegex.test(source)) {
      return null;
    }
    if (layout.length > 0) {
      layout.structSize = structSize;
      return layout;
    }
    return null;
  }
  /**
   * Get size, alignment, and type info for WGSL types.
   */
  getWgslTypeInfo(type) {
    const typeMap = {
      "f32": { size: 4, align: 4, baseType: "float", components: 1 },
      "i32": { size: 4, align: 4, baseType: "int", components: 1 },
      "u32": { size: 4, align: 4, baseType: "uint", components: 1 },
      "vec2f": { size: 8, align: 8, baseType: "float", components: 2 },
      "vec2<f32>": { size: 8, align: 8, baseType: "float", components: 2 },
      "vec3f": { size: 12, align: 16, baseType: "float", components: 3 },
      "vec3<f32>": { size: 12, align: 16, baseType: "float", components: 3 },
      "vec4f": { size: 16, align: 16, baseType: "float", components: 4 },
      "vec4<f32>": { size: 16, align: 16, baseType: "float", components: 4 },
      "vec2i": { size: 8, align: 8, baseType: "int", components: 2 },
      "vec2<i32>": { size: 8, align: 8, baseType: "int", components: 2 },
      "vec3i": { size: 12, align: 16, baseType: "int", components: 3 },
      "vec3<i32>": { size: 12, align: 16, baseType: "int", components: 3 },
      "vec4i": { size: 16, align: 16, baseType: "int", components: 4 },
      "vec4<i32>": { size: 16, align: 16, baseType: "int", components: 4 },
      "vec2u": { size: 8, align: 8, baseType: "uint", components: 2 },
      "vec2<u32>": { size: 8, align: 8, baseType: "uint", components: 2 },
      "vec3u": { size: 12, align: 16, baseType: "uint", components: 3 },
      "vec3<u32>": { size: 12, align: 16, baseType: "uint", components: 3 },
      "vec4u": { size: 16, align: 16, baseType: "uint", components: 4 },
      "vec4<u32>": { size: 16, align: 16, baseType: "uint", components: 4 }
    };
    return typeMap[type.toLowerCase()] || { size: 4, align: 4, baseType: "float", components: 1 };
  }
  /**
   * Parse WGSL struct definition with comment annotations to extract uniform layout.
   * Looks for patterns like:
   *   struct FooParams {
   *       dims_freq : vec4<f32>,  // (width, height, channels, frequency)
   *       settings : vec4<f32>,   // (octaves, displacement, splineOrder, _)
   *   }
   *
   * @param {string} source - WGSL shader source
   * @returns {Array<{name: string, slot: number, components: string}>|null}
   */
  parseNamedStructLayout(source) {
    const layout = [];
    const componentNames = ["x", "y", "z", "w"];
    const structRegex = /struct\s+(\w*(?:Params|Uniforms|Config|Settings))\s*\{([^}]+)\}/gi;
    let structMatch;
    while ((structMatch = structRegex.exec(source)) !== null) {
      const structBody = structMatch[2];
      let slot = 0;
      const fieldRegex = /(\w+)\s*:\s*(vec[234]<f32>|f32|i32|u32|array<[^>]+>)[^,;\n]*(?:,|;)?\s*(?:\/\/\s*\(([^)]+)\))?/gi;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(structBody)) !== null) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        const commentNames = fieldMatch[3];
        let numComponents = 4;
        if (fieldType === "f32" || fieldType === "i32" || fieldType === "u32") {
          numComponents = 1;
        } else if (fieldType.startsWith("vec2")) {
          numComponents = 2;
        } else if (fieldType.startsWith("vec3")) {
          numComponents = 3;
        } else if (fieldType.startsWith("vec4")) {
          numComponents = 4;
        }
        if (commentNames) {
          const names = commentNames.split(",").map((n) => n.trim());
          for (let i = 0; i < Math.min(names.length, numComponents); i++) {
            const name = names[i];
            if (name && name !== "_" && !name.toLowerCase().startsWith("pad") && !name.toLowerCase().startsWith("unused") && !name.startsWith("_")) {
              layout.push({
                name,
                slot,
                components: componentNames[i]
              });
            }
          }
        } else {
          if (numComponents === 1) {
            layout.push({
              name: fieldName,
              slot,
              components: "x"
            });
          }
        }
        slot++;
      }
    }
    return layout.length > 0 ? layout : null;
  }
  /**
   * Parse WGSL shader for params.field.component access patterns.
   * Looks for patterns like:
   *   let frequency = params.dims_freq.w;
   *   let time = params.settings.y;
   *
   * This works with named structs by analyzing how fields are accessed.
   *
   * @param {string} source - WGSL shader source
   * @returns {Array<{name: string, slot: number, components: string}>|null}
   */
  parseParamsAccessLayout(source) {
    const layout = [];
    const fieldSlots = /* @__PURE__ */ new Map();
    const structRegex = /struct\s+\w*(?:Params|Uniforms|Config|Settings)\s*\{([^}]+)\}/gi;
    const structMatch = structRegex.exec(source);
    if (!structMatch) {
      return null;
    }
    const structBody = structMatch[1];
    const fieldOrderRegex = /(\w+)\s*:\s*(?:vec[234]<f32>|f32|i32|u32|array<[^>]+>)/gi;
    let slot = 0;
    let fieldMatch;
    while ((fieldMatch = fieldOrderRegex.exec(structBody)) !== null) {
      fieldSlots.set(fieldMatch[1], slot);
      slot++;
    }
    const accessRegex = /(?:let\s+)?(\w+)(?:\s*:\s*[^=\n]+)?\s*=\s*(?:i32\s*\(\s*)?params\.(\w+)\.([xyzw]+)/g;
    let accessMatch;
    while ((accessMatch = accessRegex.exec(source)) !== null) {
      const varName = accessMatch[1];
      const fieldName = accessMatch[2];
      const components = accessMatch[3];
      const fieldSlot = fieldSlots.get(fieldName);
      if (fieldSlot !== void 0) {
        layout.push({
          name: varName,
          slot: fieldSlot,
          components
        });
      }
    }
    const componentOrder = { x: 0, y: 1, z: 2, w: 3 };
    layout.sort((a, b) => {
      if (a.slot !== b.slot) return a.slot - b.slot;
      return componentOrder[a.components[0]] - componentOrder[b.components[0]];
    });
    return layout.length > 0 ? layout : null;
  }
  /**
   * Parse WGSL shader source to extract binding declarations.
   * Returns an array of binding info objects sorted by binding index.
   *
   * @param {string} source - WGSL shader source
   * @returns {Array<{binding: number, group: number, type: string, name: string}>}
   */
  parseShaderBindings(source) {
    const bindings = [];
    const sourceNoComments = this.stripWGSLComments(source);
    const bindingRegex = /@group\s*\(\s*(\d+)\s*\)\s*@binding\s*\(\s*(\d+)\s*\)\s*var(?:<([^>]+)>)?\s+(\w+)\s*:\s*([^;]+)/g;
    let match;
    while ((match = bindingRegex.exec(sourceNoComments)) !== null) {
      const group = parseInt(match[1], 10);
      const binding = parseInt(match[2], 10);
      const storage = match[3] || "";
      const name = match[4];
      const typeDecl = match[5].trim();
      let bindingType = "unknown";
      if (typeDecl.includes("texture_storage_2d")) {
        bindingType = "storage_texture";
      } else if (typeDecl.includes("texture_2d") || typeDecl.includes("texture_3d")) {
        bindingType = "texture";
      } else if (typeDecl === "sampler") {
        bindingType = "sampler";
      } else if (storage.includes("uniform")) {
        bindingType = "uniform";
      } else if (storage.includes("storage")) {
        bindingType = "storage";
      }
      bindings.push({
        group,
        binding,
        type: bindingType,
        name,
        storage,
        typeDecl
      });
    }
    const filtered = bindings.filter((b) => {
      if (b.type === "storage_texture" || b.type === "storage") return true;
      const re = new RegExp(`\\b${b.name}\\b`, "g");
      const count = (sourceNoComments.match(re) || []).length;
      return count > 1;
    });
    filtered.sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      return a.binding - b.binding;
    });
    return filtered;
  }
  hasShaderBindings(source) {
    return /@binding\s*\(/.test(this.stripWGSLComments(source));
  }
  stripWGSLComments(source) {
    let stripped = "";
    let blockDepth = 0;
    for (let i = 0; i < source.length; ) {
      const char = source[i];
      const next = source[i + 1];
      if (blockDepth > 0) {
        if (char === "/" && next === "*") {
          stripped += "  ";
          blockDepth++;
          i += 2;
        } else if (char === "*" && next === "/") {
          stripped += "  ";
          blockDepth--;
          i += 2;
        } else {
          stripped += char === "\n" ? "\n" : " ";
          i++;
        }
      } else if (char === "/" && next === "/") {
        stripped += "  ";
        i += 2;
        while (i < source.length && source[i] !== "\n") {
          stripped += " ";
          i++;
        }
      } else if (char === "/" && next === "*") {
        stripped += "  ";
        blockDepth = 1;
        i += 2;
      } else {
        stripped += char;
        i++;
      }
    }
    return stripped;
  }
  getDefaultVertexModule() {
    if (!this.defaultVertexModule) {
      this.defaultVertexModule = this.device.createShaderModule({
        code: DEFAULT_VERTEX_SHADER_WGSL
      });
    }
    return this.defaultVertexModule;
  }
  injectDefines(source, defines) {
    if (!defines || Object.keys(defines).length === 0) {
      return source;
    }
    let injected = "";
    for (const [key, value] of Object.entries(defines)) {
      if (typeof value === "boolean") {
        injected += `const ${key}: bool = ${value};
`;
      } else if (typeof value === "number") {
        if (Number.isInteger(value)) {
          injected += `const ${key}: i32 = ${value};
`;
        } else {
          injected += `const ${key}: f32 = ${value};
`;
        }
      } else {
        injected += `const ${key} = ${value};
`;
      }
    }
    return injected + source;
  }
  executePass(pass, state) {
    const program = this.programs.get(pass.program);
    if (!program) {
      throw {
        code: "ERR_PROGRAM_NOT_FOUND",
        pass: pass.id,
        program: pass.program
      };
    }
    if (program.isCompute) {
      this.executeComputePass(pass, program, state);
    } else {
      this.executeRenderPass(pass, program, state);
    }
  }
  executeRenderPass(pass, program, state) {
    const outputKeys = Object.keys(pass.outputs || {});
    const isMRT = pass.drawBuffers > 1 || outputKeys.length > 1;
    if (isMRT) {
      this.executeMRTRenderPass(pass, program, state, outputKeys);
      return;
    }
    let outputId = pass.outputs.color || Object.values(pass.outputs)[0];
    const outputSurfaceName = this.parseGlobalName(outputId);
    if (outputSurfaceName) {
      if (state.writeSurfaces && state.writeSurfaces[outputSurfaceName]) {
        outputId = state.writeSurfaces[outputSurfaceName];
      }
    }
    let outputTex = this.textures.get(outputId) || state.surfaces?.[outputId];
    let targetView = outputTex?.view;
    if (!outputTex && outputId === "screen" && this.context) {
      const currentTexture = this.context.getCurrentTexture();
      outputTex = {
        handle: currentTexture,
        view: currentTexture.createView(),
        width: this.context.canvas?.width,
        height: this.context.canvas?.height,
        format: this.canvasFormat,
        gpuFormat: this.canvasFormat
      };
      targetView = outputTex.view;
    }
    if (!outputTex) {
      throw {
        code: "ERR_TEXTURE_NOT_FOUND",
        pass: pass.id,
        texture: outputId
      };
    }
    const viewport = this.resolveViewport(pass, outputTex);
    const colorAttachment = {
      view: targetView,
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      loadOp: pass.clear ? "clear" : "load",
      storeOp: "store"
    };
    const resolvedFormat = outputTex.gpuFormat || outputTex.format || program.outputFormat;
    const is3DPass = pass.drawMode === "triangles";
    let pipeline;
    let renderPassDescriptor;
    if (is3DPass) {
      const depthTex = this.getDepthTexture(outputTex.width, outputTex.height);
      renderPassDescriptor = {
        colorAttachments: [colorAttachment],
        depthStencilAttachment: {
          view: depthTex.createView(),
          depthClearValue: 1,
          depthLoadOp: "clear",
          depthStoreOp: "store"
        }
      };
      pipeline = this.resolve3DRenderPipeline(program, {
        blend: pass.blend,
        format: resolvedFormat
      });
    } else {
      renderPassDescriptor = { colorAttachments: [colorAttachment] };
      pipeline = this.resolveRenderPipeline(program, {
        blend: pass.blend,
        topology: pass.drawMode === "points" ? "point-list" : "triangle-list",
        format: resolvedFormat
      });
    }
    const passEncoder = this.commandEncoder.beginRenderPass(renderPassDescriptor);
    const bindGroup = this.createBindGroup(pass, program, state, pipeline);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    if (viewport) {
      passEncoder.setViewport(viewport.x, viewport.y, viewport.w, viewport.h, 0, 1);
    }
    if (pass.drawMode === "points") {
      const count = this.resolvePointCount(pass, state, outputId, outputTex);
      passEncoder.draw(count, 1, 0, 0);
    } else if (pass.drawMode === "billboards") {
      const count = this.resolvePointCount(pass, state, outputId, outputTex);
      passEncoder.draw(count * 6, 1, 0, 0);
    } else if (pass.drawMode === "triangles") {
      const count = this.resolveMeshVertexCount(pass, state, outputTex);
      passEncoder.draw(count, 1, 0, 0);
    } else {
      passEncoder.draw(3, 1, 0, 0);
    }
    passEncoder.end();
  }
  /**
   * Execute a render pass with Multiple Render Targets (MRT)
   * Used for agent simulation passes that output to multiple state textures
   */
  executeMRTRenderPass(pass, program, state, outputKeys) {
    const colorAttachments = [];
    const formats = [];
    let viewportTex = null;
    for (const outputKey of outputKeys) {
      let outputId = pass.outputs[outputKey];
      const outputSurfaceName = this.parseGlobalName(outputId);
      if (outputSurfaceName) {
        if (state.writeSurfaces && state.writeSurfaces[outputSurfaceName]) {
          outputId = state.writeSurfaces[outputSurfaceName];
        }
      }
      const tex = this.textures.get(outputId) || state.surfaces?.[outputId];
      if (!tex) {
        console.warn(`[executeMRTRenderPass] Texture not found for ${outputId} in pass ${pass.id}`);
        continue;
      }
      if (!viewportTex) viewportTex = tex;
      const resolvedFormat = tex.gpuFormat || this.resolveFormat(tex.format || "rgba16float");
      formats.push(resolvedFormat);
      colorAttachments.push({
        view: tex.view,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: pass.clear ? "clear" : "load",
        storeOp: "store"
      });
    }
    if (colorAttachments.length === 0) {
      throw {
        code: "ERR_NO_MRT_OUTPUTS",
        pass: pass.id
      };
    }
    const pipeline = this.resolveMRTRenderPipeline(program, {
      blend: pass.blend,
      topology: pass.drawMode === "points" ? "point-list" : "triangle-list",
      formats
    });
    const passEncoder = this.commandEncoder.beginRenderPass({
      colorAttachments
    });
    if (viewportTex) {
      passEncoder.setViewport(0, 0, viewportTex.width, viewportTex.height, 0, 1);
    }
    const bindGroup = this.createBindGroup(pass, program, state, pipeline);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    if (pass.drawMode === "points") {
      const count = this.resolvePointCount(pass, state, null, viewportTex);
      passEncoder.draw(count, 1, 0, 0);
    } else if (pass.drawMode === "billboards") {
      const count = this.resolvePointCount(pass, state, null, viewportTex);
      passEncoder.draw(count * 6, 1, 0, 0);
    } else if (pass.drawMode === "triangles") {
      const count = this.resolveMeshVertexCount(pass, state, viewportTex);
      passEncoder.draw(count, 1, 0, 0);
    } else {
      passEncoder.draw(3, 1, 0, 0);
    }
    passEncoder.end();
  }
  /**
   * Get or create a render pipeline with multiple render targets
   */
  resolveMRTRenderPipeline(program, { blend, topology, formats }) {
    const key = `mrt_${topology || "triangle-list"}_${formats.join("_")}_${blend ? JSON.stringify(blend) : "noblend"}`;
    if (!program.pipelineCache.has(key)) {
      const targets = formats.map((format) => ({
        format,
        blend: this.resolveBlendState(blend)
      }));
      const pipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: program.vertexModule || this.getDefaultVertexModule(),
          entryPoint: program.vertexEntryPoint || DEFAULT_VERTEX_ENTRY_POINT
        },
        fragment: {
          module: program.fragmentModule || program.module,
          entryPoint: program.fragmentEntryPoint || DEFAULT_FRAGMENT_ENTRY_POINT,
          targets
        },
        primitive: {
          topology: topology || "triangle-list"
        }
      });
      program.pipelineCache.set(key, pipeline);
    }
    return program.pipelineCache.get(key);
  }
  /**
   * Get or create a depth texture for 3D mesh rendering.
   * @param {number} width - Required width
   * @param {number} height - Required height
   * @returns {GPUTexture} - Depth texture for mesh rendering
   */
  getDepthTexture(width, height) {
    if (!this.depthTexture || this.depthTextureSize.width !== width || this.depthTextureSize.height !== height) {
      if (this.depthTexture) {
        this.depthTexture.destroy();
      }
      this.depthTexture = this.device.createTexture({
        size: { width, height, depthOrArrayLayers: 1 },
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      });
      this.depthTextureSize = { width, height };
    }
    return this.depthTexture;
  }
  /**
   * Get or create a render pipeline for 3D mesh rendering with depth test and back-face culling.
   */
  resolve3DRenderPipeline(program, { blend, format }) {
    const key = `3d|${format || "rgba16float"}|${blend ? JSON.stringify(blend) : "noblend"}`;
    if (!program.pipelineCache.has(key)) {
      const pipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: program.vertexModule || this.getDefaultVertexModule(),
          entryPoint: program.vertexEntryPoint || DEFAULT_VERTEX_ENTRY_POINT
        },
        fragment: {
          module: program.fragmentModule || program.module,
          entryPoint: program.fragmentEntryPoint || DEFAULT_FRAGMENT_ENTRY_POINT,
          targets: [{
            format: format || program.outputFormat || "rgba16float",
            blend: this.resolveBlendState(blend)
          }]
        },
        primitive: {
          topology: "triangle-list",
          cullMode: "back",
          // 'cw' because WGSL shader flips Y which reverses winding order
          frontFace: "cw"
        },
        depthStencil: {
          format: "depth24plus",
          depthWriteEnabled: true,
          depthCompare: "less"
        }
      });
      program.pipelineCache.set(key, pipeline);
    }
    return program.pipelineCache.get(key);
  }
  resolveRenderPipeline(program, { blend, topology, format }) {
    const key = this.getPipelineKey({ blend, topology, format });
    if (!program.pipelineCache.has(key)) {
      const pipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: program.vertexModule || this.getDefaultVertexModule(),
          entryPoint: program.vertexEntryPoint || DEFAULT_VERTEX_ENTRY_POINT
        },
        fragment: {
          module: program.fragmentModule || program.module,
          entryPoint: program.fragmentEntryPoint || DEFAULT_FRAGMENT_ENTRY_POINT,
          targets: [{
            format: format || program.outputFormat || "rgba16float",
            blend: this.resolveBlendState(blend)
          }]
        },
        primitive: {
          topology: topology || "triangle-list"
        }
      });
      program.pipelineCache.set(key, pipeline);
    }
    return program.pipelineCache.get(key);
  }
  getPipelineKey({ blend, topology, format }) {
    const blendKey = blend ? JSON.stringify(blend) : "noblend";
    const topoKey = topology || "triangle-list";
    return `${topoKey}|${blendKey}|${format || "rgba16float"}`;
  }
  resolveBlendState(blend) {
    if (!blend) return void 0;
    const defaultBlend = {
      color: { srcFactor: "one", dstFactor: "one", operation: "add" },
      alpha: { srcFactor: "one", dstFactor: "one", operation: "add" }
    };
    if (Array.isArray(blend)) {
      const [srcFactor, dstFactor] = blend;
      const toFactor = (factor) => {
        if (typeof factor === "string") return factor.toLowerCase().replace(/_/g, "-");
        return null;
      };
      const resolvedSrc = toFactor(srcFactor) || defaultBlend.color.srcFactor;
      const resolvedDst = toFactor(dstFactor) || defaultBlend.color.dstFactor;
      return {
        color: { srcFactor: resolvedSrc, dstFactor: resolvedDst, operation: "add" },
        alpha: { srcFactor: resolvedSrc, dstFactor: resolvedDst, operation: "add" }
      };
    }
    return defaultBlend;
  }
  resolveViewport(pass, tex) {
    if (tex?.width && tex?.height) {
      return { x: 0, y: 0, w: tex.width, h: tex.height };
    }
    if (pass.viewport) {
      return { x: pass.viewport.x, y: pass.viewport.y, w: pass.viewport.w, h: pass.viewport.h };
    }
    if (this.context?.canvas) {
      return { x: 0, y: 0, w: this.context.canvas.width, h: this.context.canvas.height };
    }
    return null;
  }
  resolvePointCount(pass, state, outputId, outputTex) {
    let count = pass.count || 1e3;
    if (count === "auto" || count === "screen" || count === "input") {
      let refTex = null;
      if (count === "input" && pass.inputs) {
        const stateInputId = pass.inputs.xyzTex || pass.inputs.inputTex;
        if (stateInputId) {
          const surfaceName = this.parseGlobalName(stateInputId);
          if (surfaceName) {
            refTex = state.surfaces?.[surfaceName];
          } else {
            refTex = this.textures.get(stateInputId);
          }
        }
      } else {
        refTex = outputTex || this.textures.get(outputId);
      }
      if (refTex && refTex.width && refTex.height) {
        count = refTex.width * refTex.height;
      } else if (this.context?.canvas) {
        count = this.context.canvas.width * this.context.canvas.height;
      }
    }
    return count;
  }
  /**
   * Resolve vertex count for mesh triangle draw mode.
   * Derives count from mesh position texture dimensions or explicit count.
   */
  resolveMeshVertexCount(pass, state) {
    let count = pass.count || 3;
    if (pass.countUniform) {
      const uniformName = pass.countUniform;
      let uniformValue = pass.uniforms?.[uniformName];
      if (uniformValue === void 0) {
        uniformValue = state.globalUniforms?.[uniformName];
      }
      if (typeof uniformValue === "number" && uniformValue > 0) {
        count = uniformValue;
        return count;
      }
    }
    if (count === "auto" || count === "input" || count <= 0) {
      let refTex = null;
      if (pass.inputs) {
        const meshInputId = pass.inputs.meshPositions || pass.inputs.inputTex;
        if (meshInputId) {
          refTex = this.textures.get(meshInputId);
          if (!refTex) {
            const unscopedId = meshInputId.replace(/_chain_\d+$/, "");
            if (unscopedId !== meshInputId) {
              refTex = this.textures.get(unscopedId);
            }
          }
          if (!refTex) {
            const surfaceName = this.parseGlobalName(meshInputId);
            if (surfaceName) {
              refTex = state.surfaces?.[surfaceName];
            }
          }
        }
      }
      if (refTex && refTex.width && refTex.height) {
        count = refTex.width * refTex.height;
      } else {
        count = 3;
      }
    }
    return count;
  }
  /**
   * Get or create a compute pipeline for a specific entry point.
   * Supports multi-entry-point shaders like blur (downsample_main, upsample_main).
   */
  getComputePipeline(program, entryPoint) {
    const targetEntryPoint = entryPoint || program.entryPoint || "main";
    if (program.pipelines?.has(targetEntryPoint)) {
      return program.pipelines.get(targetEntryPoint);
    }
    const pipeline = this.device.createComputePipeline({
      layout: "auto",
      compute: {
        module: program.module,
        entryPoint: targetEntryPoint
      }
    });
    if (program.pipelines) {
      program.pipelines.set(targetEntryPoint, pipeline);
    }
    return pipeline;
  }
  executeComputePass(pass, program, state) {
    const pipeline = this.getComputePipeline(program, pass.entryPoint);
    const bindGroup = this.createBindGroup(pass, program, state, pipeline);
    const workgroups = this.resolveWorkgroups(pass, state);
    const passEncoder = this.commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(workgroups[0], workgroups[1], workgroups[2]);
    passEncoder.end();
    const outputBufferBinding = program.bindings?.find(
      (b) => (b.name === "output_buffer" || b.name === "outputBuffer") && b.type === "storage"
    );
    if (outputBufferBinding && pass.outputs) {
      const outputId = pass.outputs.color || pass.outputs.fragColor || Object.values(pass.outputs)[0];
      if (outputId) {
        this.copyBufferToTexture(state, outputId, outputBufferBinding.name);
      }
    }
  }
  resolveWorkgroups(pass, state) {
    if (pass.workgroups) {
      return pass.workgroups;
    }
    if (pass.size) {
      const { x = pass.size.width, y = pass.size.height, z = pass.size.depth || 1 } = pass.size;
      if (x && y) {
        return [x, y, z];
      }
    }
    const outputId = pass.outputs?.color || Object.values(pass.outputs || {})[0];
    const output = outputId ? this.textures.get(outputId) : null;
    if (output) {
      return [
        Math.ceil(output.width / 8),
        Math.ceil(output.height / 8),
        1
      ];
    }
    const width = state?.screenWidth;
    const height = state?.screenHeight;
    if (width && height) {
      return [
        Math.ceil(width / 8),
        Math.ceil(height / 8),
        1
      ];
    }
    throw {
      code: "ERR_COMPUTE_DISPATCH_UNRESOLVED",
      pass: pass.id,
      detail: "Compute dispatch dimensions could not be inferred"
    };
  }
  /**
   * Create a bind group for a pass.
   *
   * Uses the parsed shader bindings to create entries that match what the shader expects.
   * This handles the various binding conventions used in existing WGSL shaders:
   * - Individual uniform bindings (one per uniform variable)
   * - Texture + sampler pairs
   * - Uniform buffer structs
   * @param {Object} pipeline - Optional resolved pipeline to use for layout (for topology variants)
   */
  createBindGroup(pass, program, state, pipeline = null) {
    const entries = [];
    let bindings = program.bindings || [];
    const targetPipeline = pipeline || program.pipeline;
    if (pass.entryPoint && program.isCompute) {
      const neededBindingNames = /* @__PURE__ */ new Set();
      if (pass.inputs) {
        for (const inputName of Object.keys(pass.inputs)) {
          neededBindingNames.add(inputName);
        }
      }
      if (pass.outputs) {
        for (const outputName of Object.keys(pass.outputs)) {
          neededBindingNames.add(outputName);
        }
      }
      neededBindingNames.add("params");
      for (const binding of bindings) {
        if (binding.type === "storage") {
          neededBindingNames.add(binding.name);
        }
      }
      bindings = bindings.filter((b) => neededBindingNames.has(b.name));
    }
    const getUniform = (name) => {
      if (pass.uniforms && name in pass.uniforms) {
        return pass.uniforms[name];
      }
      if (state.globalUniforms && name in state.globalUniforms) {
        return state.globalUniforms[name];
      }
      return void 0;
    };
    const textureMap = /* @__PURE__ */ new Map();
    if (pass.inputs) {
      for (const [inputName, texId] of Object.entries(pass.inputs)) {
        let textureView;
        const surfaceName = this.parseGlobalName(texId);
        const unscopedMeshId = typeof texId === "string" ? texId.replace(/_chain_\d+$/, "") : texId;
        const isMeshData = typeof unscopedMeshId === "string" && /^global_mesh\d+_(?:positions|normals|uvs)$/.test(unscopedMeshId);
        if (isMeshData) {
          const meshTex = this.textures.get(texId) || this.textures.get(unscopedMeshId);
          textureView = meshTex?.view;
        } else if (surfaceName) {
          const surfaceObj = state.surfaces?.[surfaceName];
          if (surfaceObj?.view) {
            textureView = surfaceObj.view;
          } else {
            let tex = this.textures.get(texId);
            if (!tex) {
              const unscopedId = texId.replace(/_chain_\d+$/, "");
              if (unscopedId !== texId) {
                tex = this.textures.get(unscopedId);
              }
            }
            textureView = tex?.view;
          }
        } else {
          const tex = this.textures.get(texId);
          textureView = tex?.view;
        }
        if (textureView) {
          textureMap.set(inputName, textureView);
          if (inputName === "inputTex") {
            textureMap.set("tex0", textureView);
            textureMap.set("inputColor", textureView);
          }
        }
      }
    }
    const inputSamplerDefault = pass.inputs && Object.values(pass.inputs).some((texId) => {
      const t = this.textures.get(texId) || (typeof texId === "string" ? this.textures.get(texId.replace(/_chain_\d+$/, "")) : null);
      return t?.isExternal === true;
    }) ? "default" : "nearest";
    for (const binding of bindings) {
      if (binding.group !== 0) continue;
      const entry = { binding: binding.binding };
      if (binding.type === "texture") {
        let view = textureMap.get(binding.name);
        if (!view) {
          if (binding.name.startsWith("tex")) {
            const idx = parseInt(binding.name.slice(3), 10);
            const inputKeys = Object.keys(pass.inputs || {});
            if (!isNaN(idx) && idx < inputKeys.length) {
              view = textureMap.get(inputKeys[idx]);
            }
          }
        }
        if (!view) {
          view = this.dummyTextureView;
        }
        if (view) {
          entry.resource = view;
          entries.push(entry);
        }
      } else if (binding.type === "sampler") {
        const samplerType = pass.samplerTypes?.[binding.name] || inputSamplerDefault;
        entry.resource = this.samplers.get(samplerType) || this.samplers.get("default");
        entries.push(entry);
      } else if (binding.type === "uniform") {
        const isStruct = binding.typeDecl && !binding.typeDecl.includes("<") && binding.typeDecl !== "f32" && binding.typeDecl !== "i32" && binding.typeDecl !== "u32" && binding.typeDecl !== "bool" && !binding.typeDecl.startsWith("vec") && !binding.typeDecl.startsWith("mat");
        if (isStruct) {
          const uniformBuffer = this.createUniformBuffer(pass, state, program);
          if (uniformBuffer) {
            entry.resource = { buffer: uniformBuffer };
            entries.push(entry);
          }
        } else {
          let value = getUniform(binding.name);
          if (value === void 0 || value === null || typeof value !== "number" && typeof value !== "boolean" && !Array.isArray(value)) {
            if (binding.typeDecl === "i32" || binding.typeDecl === "u32") {
              value = 0;
            } else if (binding.typeDecl.startsWith("vec2")) {
              value = [0, 0];
            } else if (binding.typeDecl.startsWith("vec3")) {
              value = [0, 0, 0];
            } else if (binding.typeDecl.startsWith("vec4")) {
              value = [0, 0, 0, 0];
            } else if (binding.typeDecl.startsWith("array<")) {
              const m = binding.typeDecl.match(/^array<\s*([^,>]+(?:<[^>]+>)?)\s*,\s*(\d+)\s*>/);
              if (m) {
                const elemType = m[1].trim();
                const count = parseInt(m[2], 10);
                let stride = 16;
                if (elemType === "f32" || elemType === "i32" || elemType === "u32") stride = 4;
                else if (elemType.startsWith("vec2")) stride = 8;
                else if (elemType.startsWith("vec3") || elemType.startsWith("vec4")) stride = 16;
                value = new Array(count * stride / 4).fill(0);
              } else {
                value = 0;
              }
            } else if (binding.typeDecl.startsWith("mat3")) {
              value = [1, 0, 0, 0, 1, 0, 0, 0, 1];
            } else {
              value = 0;
            }
          }
          const buffer = this.createSingleUniformBuffer(value, binding.typeDecl);
          if (buffer) {
            entry.resource = { buffer };
            this.activeUniformBuffers.push(buffer);
            entries.push(entry);
          }
        }
      } else if (binding.type === "storage") {
        const storage = this.createStorageBuffer(binding, pass, state);
        if (storage) {
          entry.resource = { buffer: storage };
          entries.push(entry);
        }
      } else if (binding.type === "storage_texture") {
        const storageView = this.createStorageTextureView(binding, pass, state);
        if (storageView) {
          entry.resource = storageView;
          entries.push(entry);
        }
      }
    }
    if (bindings.length === 0) {
      const sourceHasBindings = program.module && program._sourceHasBindings;
      if (!sourceHasBindings) {
        return this.createLegacyBindGroup(pass, program, state);
      }
      return this.device.createBindGroup({
        layout: targetPipeline.getBindGroupLayout(0),
        entries: []
      });
    }
    try {
      return this.device.createBindGroup({
        layout: targetPipeline.getBindGroupLayout(0),
        entries
      });
    } catch (err) {
      const errStr = err.message || String(err);
      if (!errStr.includes("binding index")) {
        throw err;
      }
      let currentEntries = entries;
      const maxRetries = 10;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const bindingMatch = /binding index (\d+) not present/.exec(errStr);
        if (bindingMatch) {
          const problemBinding = parseInt(bindingMatch[1], 10);
          currentEntries = currentEntries.filter((e) => e.binding !== problemBinding);
          try {
            return this.device.createBindGroup({
              layout: targetPipeline.getBindGroupLayout(0),
              entries: currentEntries
            });
          } catch (retryErr) {
            const retryErrStr = retryErr.message || String(retryErr);
            if (!retryErrStr.includes("binding index")) {
              throw retryErr;
            }
            continue;
          }
        }
        break;
      }
      throw err;
    }
  }
  /**
   * Create a buffer for a single uniform value.
   * Reuses pre-allocated typed arrays to minimize per-frame allocations.
   */
  createSingleUniformBuffer(value, typeDecl) {
    let data;
    let byteLength;
    if (typeof value === "boolean") {
      this._singleUniformInt32[0] = value ? 1 : 0;
      data = this._singleUniformInt32;
      byteLength = 4;
    } else if (typeof value === "number") {
      if (typeDecl === "i32" || typeDecl === "u32") {
        this._singleUniformInt32[0] = Math.round(value);
        data = this._singleUniformInt32;
        byteLength = 4;
      } else {
        this._singleUniformFloat32[0] = value;
        data = this._singleUniformFloat32;
        byteLength = 4;
      }
    } else if (Array.isArray(value)) {
      const arr = this._singleUniformFloat32;
      if (value.length === 2) {
        arr[0] = value[0];
        arr[1] = value[1];
        byteLength = 8;
      } else if (value.length === 3) {
        arr[0] = value[0];
        arr[1] = value[1];
        arr[2] = value[2];
        arr[3] = 0;
        byteLength = 16;
      } else if (value.length === 4) {
        arr[0] = value[0];
        arr[1] = value[1];
        arr[2] = value[2];
        arr[3] = value[3];
        byteLength = 16;
      } else if (value.length === 9) {
        const mat3buf = this._singleUniformMat3Float32;
        for (let col = 0; col < 3; col++) {
          mat3buf[col * 4 + 0] = value[col * 3 + 0];
          mat3buf[col * 4 + 1] = value[col * 3 + 1];
          mat3buf[col * 4 + 2] = value[col * 3 + 2];
          mat3buf[col * 4 + 3] = 0;
        }
        data = mat3buf;
        byteLength = 48;
      } else {
        if (typeof typeDecl === "string" && /^array<\s*vec4/.test(typeDecl)) {
          const m = typeDecl.match(/^array<[^,>]+(?:<[^>]+>)?\s*,\s*(\d+)\s*>/);
          const count = m ? parseInt(m[1], 10) : Math.ceil(value.length / 4);
          const flat = new Float32Array(count * 4);
          const copyLen = Math.min(value.length, flat.length);
          for (let i = 0; i < copyLen; i++) flat[i] = value[i];
          data = flat;
          byteLength = flat.byteLength;
        } else {
          data = new Float32Array(value);
          byteLength = data.byteLength;
        }
      }
      if (!data) data = arr;
    }
    if (!data) return null;
    const bufferSize = Math.max(byteLength, 16);
    let buffer = this.getBufferFromPool(bufferSize);
    if (!buffer) {
      buffer = this.device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
    }
    this.queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, byteLength);
    return buffer;
  }
  /**
   * Create or get a storage buffer for compute shaders.
   * Storage buffers persist across passes within an effect.
   *
   * @param {object} binding - Parsed binding info from shader
   * @param {object} pass - Pass definition
   * @param {object} state - Current render state (includes screenWidth, screenHeight)
   * @returns {GPUBuffer|null}
   */
  createStorageBuffer(binding, pass, state) {
    const bufferName = binding.name;
    if (this.storageBuffers.has(bufferName)) {
      return this.storageBuffers.get(bufferName);
    }
    let byteSize = 0;
    if (bufferName === "output_buffer" || bufferName === "outputBuffer") {
      const width = state?.screenWidth || 1280;
      const height = state?.screenHeight || 720;
      byteSize = width * height * 4 * 4;
    } else if (bufferName === "stats_buffer") {
      const width = state?.screenWidth || 1280;
      const height = state?.screenHeight || 720;
      const workgroupsX = Math.ceil(width / 8);
      const workgroupsY = Math.ceil(height / 8);
      const numWorkgroups = workgroupsX * workgroupsY;
      byteSize = (2 + numWorkgroups * 2) * 4;
    } else if (bufferName.includes("downsample")) {
      const width = state?.screenWidth || 1280;
      const height = state?.screenHeight || 720;
      byteSize = Math.ceil(width / 4) * Math.ceil(height / 4) * 4 * 4;
    } else {
      const width = state?.screenWidth || 1280;
      const height = state?.screenHeight || 720;
      byteSize = width * height * 4 * 4;
    }
    byteSize = Math.max(256, byteSize);
    byteSize = Math.ceil(byteSize / 256) * 256;
    const buffer = this.device.createBuffer({
      size: byteSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    this.storageBuffers.set(bufferName, buffer);
    return buffer;
  }
  /**
   * Create a storage texture view for compute shader output.
   * Storage textures allow direct writes from compute shaders via textureStore().
   *
   * @param {object} binding - Parsed binding info from shader
   * @param {object} pass - Pass definition
   * @param {object} state - Current render state
   * @returns {GPUTextureView|null}
   */
  createStorageTextureView(binding, pass, state) {
    const storageTextures = pass.storageTextures || {};
    const textureId = storageTextures[binding.name];
    if (!textureId) {
      if (binding.name === "output_texture") {
        return this.getOutputStorageView(state);
      }
      console.warn(`No storage texture mapping for ${binding.name}`);
      return null;
    }
    if (textureId === "outputTex") {
      return this.getOutputStorageView(state);
    }
    const surfacePattern = /^o[0-7]$/;
    if (surfacePattern.test(textureId)) {
      const writeTex = state?.writeSurfaces?.[textureId];
      if (writeTex) {
        const texture2 = this.textures.get(writeTex);
        if (texture2) {
          return texture2.view;
        }
      }
    }
    const surfaceName = this.parseGlobalName(textureId);
    if (surfaceName) {
      const writeTex = state?.writeSurfaces?.[surfaceName];
      if (writeTex) {
        const texture2 = this.textures.get(writeTex);
        if (texture2) {
          return texture2.view;
        }
      }
    }
    const texture = this.textures.get(textureId);
    if (texture) {
      return texture.view;
    }
    console.warn(`Storage texture ${textureId} not found`);
    return null;
  }
  /**
   * Get the storage texture view for compute output.
   * Uses the render surface's write texture which has STORAGE_BINDING usage.
   */
  getOutputStorageView(state) {
    const renderSurfaceName = state?.graph?.renderSurface;
    if (renderSurfaceName) {
      const writeTex = state?.writeSurfaces?.[renderSurfaceName];
      if (writeTex) {
        const texture2 = this.textures.get(writeTex);
        if (texture2) {
          return texture2.view;
        }
      }
    }
    console.warn("Render surface write texture not found, using fallback storage texture");
    const width = state?.screenWidth || 1280;
    const height = state?.screenHeight || 720;
    const key = `outputStorage_${width}x${height}`;
    if (!this.storageTextures) {
      this.storageTextures = /* @__PURE__ */ new Map();
    }
    if (this.storageTextures.has(key)) {
      return this.storageTextures.get(key).view;
    }
    const texture = this.device.createTexture({
      size: { width, height },
      format: "rgba16float",
      // Include COPY_DST so copyTextureToTexture can target this texture
      // (used by the chain-handoff path). Without it Dawn rejects with
      // "Destination texture needs to have CopyDst and RenderAttachment
      // usage" — this storage texture has RENDER_ATTACHMENT but was
      // missing COPY_DST.
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    const view = texture.createView();
    this.storageTextures.set(key, { texture, view, width, height });
    return view;
  }
  /**
   * Legacy bind group creation for shaders that don't have parsed bindings.
   */
  createLegacyBindGroup(pass, program, state) {
    const entries = [];
    let binding = 0;
    if (pass.inputs) {
      for (const [samplerName, texId] of Object.entries(pass.inputs)) {
        let textureView;
        if (texId === "none") {
          textureView = this.dummyTextureView;
        } else {
          const surfaceName = this.parseGlobalName(texId);
          if (surfaceName) {
            textureView = state.surfaces?.[surfaceName]?.view;
          } else {
            textureView = this.textures.get(texId)?.view;
          }
        }
        if (!textureView) {
          textureView = this.dummyTextureView;
        }
        if (textureView) {
          entries.push({
            binding: binding++,
            resource: textureView
          });
          const texRec = this.textures.get(texId) || (typeof texId === "string" ? this.textures.get(texId.replace(/_chain_\d+$/, "")) : null);
          const legacyDefault = texRec?.isExternal ? "default" : "nearest";
          const samplerType = pass.samplerTypes?.[samplerName] || legacyDefault;
          entries.push({
            binding: binding++,
            resource: this.samplers.get(samplerType) || this.samplers.get("default")
          });
        }
      }
    }
    if (pass.uniforms || state.globalUniforms) {
      const uniformBuffer = this.createUniformBuffer(pass, state);
      if (uniformBuffer) {
        entries.push({
          binding: binding++,
          resource: {
            buffer: uniformBuffer
          }
        });
      }
    }
    const bindGroup = this.device.createBindGroup({
      layout: program.pipeline.getBindGroupLayout(0),
      entries
    });
    return bindGroup;
  }
  /**
   * Create a uniform buffer with proper std140 alignment.
   *
   * Alignment rules (simplified for common types):
   * - float, int, uint, bool: 4-byte align
   * - vec2: 8-byte align
   * - vec3, vec4: 16-byte align
   * - mat3: 48 bytes (3 x vec4 with 16-byte align)
   * - mat4: 64 bytes (4 x vec4)
   */
  createUniformBuffer(pass, state, program = null) {
    const merged = this._mergedUniforms;
    const mergedKeys = this._mergedUniformKeys;
    for (let i = 0; i < mergedKeys.length; i++) {
      merged[mergedKeys[i]] = void 0;
    }
    mergedKeys.length = 0;
    if (pass.uniforms) {
      for (const key in pass.uniforms) {
        const val = pass.uniforms[key];
        if (val !== void 0) {
          merged[key] = val;
          mergedKeys.push(key);
        }
      }
    }
    if (state.globalUniforms) {
      for (const key in state.globalUniforms) {
        if (pass.uniforms && key in pass.uniforms) continue;
        const val = state.globalUniforms[key];
        if (val !== void 0) {
          if (merged[key] === void 0) {
            mergedKeys.push(key);
          }
          merged[key] = val;
        }
      }
    }
    if (mergedKeys.length === 0) {
      return null;
    }
    const packedLayout = program?.packedUniformLayout;
    const data = packedLayout ? this.packUniformsWithLayout(merged, packedLayout) : this.packUniforms(merged);
    const declaredMin = program?.declaredUniformBufferSize || 0;
    const bufferSize = Math.max(data.byteLength, declaredMin, 16);
    let buffer = this.getBufferFromPool(bufferSize);
    if (!buffer) {
      buffer = this.device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
    }
    this.queue.writeBuffer(buffer, 0, data.buffer || data, data.byteOffset || 0, data.byteLength);
    this.activeUniformBuffers.push(buffer);
    return buffer;
  }
  /**
   * Get a buffer from the pool or return null if none available.
   */
  getBufferFromPool(requiredSize) {
    for (let i = 0; i < this.uniformBufferPool.length; i++) {
      const buffer = this.uniformBufferPool[i];
      if (buffer.size >= requiredSize) {
        this.uniformBufferPool.splice(i, 1);
        return buffer;
      }
    }
    return null;
  }
  /**
   * Pack uniforms into an ArrayBuffer following std140 alignment rules.
   * Reuses pre-allocated buffer when possible to minimize per-frame allocations.
   */
  packUniforms(uniforms) {
    let estimatedSize = 0;
    for (const key in uniforms) {
      const value = uniforms[key];
      if (value === void 0) continue;
      if (typeof value === "number") {
        estimatedSize += 4;
      } else if (Array.isArray(value)) {
        estimatedSize += value.length * 4 + 12;
      } else if (typeof value === "boolean") {
        estimatedSize += 4;
      }
    }
    const bufferSize = Math.max(256, Math.ceil((estimatedSize + 64) / 16) * 16);
    let buffer, view;
    if (bufferSize <= this._uniformBufferSize) {
      buffer = this._uniformBufferData;
      view = this._uniformDataView;
    } else {
      this._uniformBufferData = new ArrayBuffer(bufferSize);
      this._uniformDataView = new DataView(this._uniformBufferData);
      this._uniformBufferSize = bufferSize;
      buffer = this._uniformBufferData;
      view = this._uniformDataView;
    }
    let offset = 0;
    const alignTo = (currentOffset, alignment) => {
      return Math.ceil(currentOffset / alignment) * alignment;
    };
    for (const name in uniforms) {
      const value = uniforms[name];
      if (value === void 0 || value === null) continue;
      if (typeof value === "boolean") {
        offset = alignTo(offset, 4);
        view.setInt32(offset, value ? 1 : 0, true);
        offset += 4;
      } else if (typeof value === "number") {
        offset = alignTo(offset, 4);
        if (Number.isInteger(value) && name !== "time" && name !== "deltaTime" && name !== "aspect") {
          view.setInt32(offset, value, true);
        } else {
          view.setFloat32(offset, value, true);
        }
        offset += 4;
      } else if (Array.isArray(value)) {
        if (value.length === 2) {
          offset = alignTo(offset, 8);
          view.setFloat32(offset, value[0], true);
          view.setFloat32(offset + 4, value[1], true);
          offset += 8;
        } else if (value.length === 3) {
          offset = alignTo(offset, 16);
          view.setFloat32(offset, value[0], true);
          view.setFloat32(offset + 4, value[1], true);
          view.setFloat32(offset + 8, value[2], true);
          offset += 16;
        } else if (value.length === 4) {
          offset = alignTo(offset, 16);
          for (let i = 0; i < 4; i++) {
            view.setFloat32(offset + i * 4, value[i], true);
          }
          offset += 16;
        } else if (value.length === 9) {
          offset = alignTo(offset, 16);
          for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 3; row++) {
              view.setFloat32(offset + row * 4, value[col * 3 + row], true);
            }
            offset += 16;
          }
        } else if (value.length === 16) {
          offset = alignTo(offset, 16);
          for (let i = 0; i < 16; i++) {
            view.setFloat32(offset + i * 4, value[i], true);
          }
          offset += 64;
        } else {
          for (let i = 0; i < value.length; i++) {
            offset = alignTo(offset, 4);
            view.setFloat32(offset, value[i], true);
            offset += 4;
          }
        }
      }
    }
    const usedSize = Math.max(256, alignTo(offset, 16));
    return new Uint8Array(buffer, 0, usedSize);
  }
  /**
   * Pack uniforms into an ArrayBuffer according to a parsed layout.
   * The layout specifies where each uniform should be placed in the array<vec4<f32>, N> struct.
   *
   * Supports three layout formats:
   * 1. Byte layout (from parseWgslStructByteLayout): { type: 'byte', layout: [...] }
   * 2. Array format (from shader parsing): [{ name: 'time', slot: 0, components: 'z' }, ...]
   * 3. Object format (from effect definition): { time: { slot: 0, components: 'z' }, ... }
   *
   * @param {Object} uniforms - Map of uniform names to values
   * @param {Array|Object} layout - Layout specification
   * @returns {Uint8Array}
   */
  _resolveUniformAlias(name, uniforms, { includeChannelCount = false } = {}) {
    if (uniforms[name] !== void 0) return uniforms[name];
    if (name === "width" && uniforms.resolution) return uniforms.resolution[0];
    if (name === "height" && uniforms.resolution) return uniforms.resolution[1];
    if (name === "channels") return 4;
    if (includeChannelCount && name === "channelCount") return 4;
    return void 0;
  }
  packUniformsWithLayout(uniforms, layout) {
    if (layout && layout.type === "byte" && Array.isArray(layout.layout)) {
      return this.packUniformsWithByteLayout(uniforms, layout.layout);
    }
    let layoutArray = layout;
    if (!Array.isArray(layout)) {
      layoutArray = [];
      for (const [name, spec] of Object.entries(layout)) {
        layoutArray.push({ name, slot: spec.slot, components: spec.components });
      }
    }
    let maxSlot = 0;
    for (const entry of layoutArray) {
      maxSlot = Math.max(maxSlot, entry.slot);
    }
    const bufferSize = (maxSlot + 1) * 16;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    const componentOffset = { x: 0, y: 4, z: 8, w: 12 };
    for (const entry of layoutArray) {
      const value = this._resolveUniformAlias(entry.name, uniforms);
      if (value === void 0 || value === null) {
        continue;
      }
      const slotOffset = entry.slot * 16;
      if (entry.components.length === 1) {
        const compOff = componentOffset[entry.components];
        const offset = slotOffset + compOff;
        if (typeof value === "boolean") {
          view.setFloat32(offset, value ? 1 : 0, true);
        } else if (typeof value === "number") {
          view.setFloat32(offset, value, true);
        }
      } else if (entry.components.length === 2) {
        const startComp = entry.components[0];
        const offset = slotOffset + componentOffset[startComp];
        if (Array.isArray(value)) {
          for (let i = 0; i < Math.min(value.length, 2); i++) {
            view.setFloat32(offset + i * 4, value[i], true);
          }
        } else if (typeof value === "number") {
          view.setFloat32(offset, value, true);
        }
      } else if (entry.components.length === 3) {
        const startComp = entry.components[0];
        const offset = slotOffset + componentOffset[startComp];
        if (Array.isArray(value)) {
          for (let i = 0; i < Math.min(value.length, 3); i++) {
            view.setFloat32(offset + i * 4, value[i], true);
          }
        } else if (typeof value === "number") {
          view.setFloat32(offset, value, true);
        }
      } else if (entry.components.length === 4) {
        const offset = slotOffset;
        if (Array.isArray(value)) {
          for (let i = 0; i < Math.min(value.length, 4); i++) {
            view.setFloat32(offset + i * 4, value[i], true);
          }
        } else if (typeof value === "number") {
          view.setFloat32(offset, value, true);
        }
      }
    }
    return new Uint8Array(buffer);
  }
  /**
   * Pack uniforms into an ArrayBuffer using byte-based layout.
   * Each entry specifies exact byte offset and type for the uniform.
   *
   * @param {Object} uniforms - Map of uniform names to values
   * @param {Array<{name: string, offset: number, size: number, type: string, components: number}>} layout
   * @returns {Uint8Array}
   */
  packUniformsWithByteLayout(uniforms, layout) {
    let totalSize = layout.structSize || 0;
    if (!totalSize) {
      for (const entry of layout) {
        totalSize = Math.max(totalSize, entry.offset + entry.size);
      }
    }
    const bufferSize = Math.ceil(totalSize / 16) * 16;
    const buffer = new ArrayBuffer(Math.max(bufferSize, 16));
    const view = new DataView(buffer);
    for (const entry of layout) {
      const value = this._resolveUniformAlias(entry.name, uniforms, { includeChannelCount: true });
      if (value === void 0 || value === null) {
        continue;
      }
      const { offset, type, components } = entry;
      if (components === 1) {
        if (typeof value === "boolean") {
          if (type === "int" || type === "uint") {
            view.setInt32(offset, value ? 1 : 0, true);
          } else {
            view.setFloat32(offset, value ? 1 : 0, true);
          }
        } else if (typeof value === "number") {
          if (type === "int") {
            view.setInt32(offset, Math.round(value), true);
          } else if (type === "uint") {
            view.setUint32(offset, Math.round(value), true);
          } else {
            view.setFloat32(offset, value, true);
          }
        }
      } else if (Array.isArray(value)) {
        for (let i = 0; i < Math.min(value.length, components); i++) {
          const compOffset = offset + i * 4;
          if (type === "int") {
            view.setInt32(compOffset, Math.round(value[i]), true);
          } else if (type === "uint") {
            view.setUint32(compOffset, Math.round(value[i]), true);
          } else {
            view.setFloat32(compOffset, value[i], true);
          }
        }
      } else if (typeof value === "number") {
        if (type === "int") {
          view.setInt32(offset, Math.round(value), true);
        } else if (type === "uint") {
          view.setUint32(offset, Math.round(value), true);
        } else {
          view.setFloat32(offset, value, true);
        }
      }
    }
    return new Uint8Array(buffer);
  }
  beginFrame() {
    while (this.activeUniformBuffers.length > 0) {
      const buffer = this.activeUniformBuffers.pop();
      this.uniformBufferPool.push(buffer);
    }
    this.commandEncoder = this.device.createCommandEncoder();
  }
  endFrame() {
    if (this.commandEncoder) {
      const commandBuffer = this.commandEncoder.finish();
      this.queue.submit([commandBuffer]);
      this.commandEncoder = null;
    }
  }
  present(textureId) {
    if (!this.context) return;
    const tex = this.textures.get(textureId);
    if (!tex) return;
    const pipeline = this.getBlitPipeline();
    const bindGroup = this.createBlitBindGroup(tex);
    const commandEncoder = this.device.createCommandEncoder();
    const canvasTexture = this.context.getCurrentTexture();
    const canvasView = canvasTexture.createView();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: canvasView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store"
      }]
    });
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();
    this.queue.submit([commandEncoder.finish()]);
  }
  destroy(options = {}) {
    if (!options?.skipTextures) {
      for (const id of Array.from(this.textures.keys())) {
        this.destroyTexture(id);
      }
      this.textures.clear();
    }
    if (this.depthTexture) {
      this.depthTexture.destroy();
      this.depthTexture = null;
      this.depthTextureSize = { width: 0, height: 0 };
    }
    this.programs.clear();
    this.pipelines.clear();
    this.bindGroups.clear();
    this.samplers.clear();
    for (const buffer of this.uniformBufferPool) {
      buffer?.destroy?.();
    }
    this.uniformBufferPool = [];
    for (const buffer of this.activeUniformBuffers) {
      buffer?.destroy?.();
    }
    this.activeUniformBuffers = [];
    if (this.context?.unconfigure) {
      try {
        this.context.unconfigure();
      } catch (err) {
        console.warn("Failed to unconfigure WebGPU canvas context", err);
      }
    }
    this.context = null;
    this.queue = null;
  }
  /**
   * Get or create the blit pipeline for presenting to canvas
   */
  getBlitPipeline() {
    if (this._blitPipeline) return this._blitPipeline;
    const blitShaderSource = `
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) uv: vec2<f32>,
            }
            
            @vertex
            fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                var pos = array<vec2<f32>, 3>(
                    vec2<f32>(-1.0, -1.0),
                    vec2<f32>(3.0, -1.0),
                    vec2<f32>(-1.0, 3.0)
                );
                // Standard UVs - internal blits now handle Y-flip
                var uv = array<vec2<f32>, 3>(
                    vec2<f32>(0.0, 0.0),
                    vec2<f32>(2.0, 0.0),
                    vec2<f32>(0.0, 2.0)
                );
                var output: VertexOutput;
                output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
                output.uv = uv[vertexIndex];
                return output;
            }
            
            @group(0) @binding(0) var srcTex: texture_2d<f32>;
            @group(0) @binding(1) var srcSampler: sampler;
            
            @fragment
            fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
                return textureSample(srcTex, srcSampler, input.uv);
            }
        `;
    const module = this.device.createShaderModule({ code: blitShaderSource });
    this._blitPipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs_main"
      },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [{
          format: this.canvasFormat || "bgra8unorm"
        }]
      },
      primitive: {
        topology: "triangle-list"
      }
    });
    return this._blitPipeline;
  }
  /**
   * Create a bind group for blitting a texture to the canvas
   */
  createBlitBindGroup(tex) {
    const pipeline = this.getBlitPipeline();
    const sampler = this.samplers.get("default");
    return this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: tex.view },
        { binding: 1, resource: sampler }
      ]
    });
  }
  /**
   * Get or create the buffer-to-texture compute pipeline.
   * This copies data from a storage buffer (output_buffer) to a storage texture.
   */
  /**
   * Get the render pipeline for copying storage buffer data to a texture.
   * Uses a fullscreen quad with a fragment shader that reads from the buffer.
   * @param {string} format - The target texture format
   */
  getBufferToTextureRenderPipeline(format) {
    const cacheKey = `bufferToTexture_${format}`;
    if (this._bufferToTextureRenderPipelines?.has(cacheKey)) {
      return this._bufferToTextureRenderPipelines.get(cacheKey);
    }
    if (!this._bufferToTextureRenderPipelines) {
      this._bufferToTextureRenderPipelines = /* @__PURE__ */ new Map();
    }
    const shaderSource = `
            struct BufferToTextureParams {
                width: u32,
                height: u32,
                _pad0: u32,
                _pad1: u32,
            }
            
            @group(0) @binding(0) var<storage, read> input_buffer: array<f32>;
            @group(0) @binding(1) var<uniform> params: BufferToTextureParams;
            
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
            }
            
            @vertex
            fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
                // Fullscreen triangle
                var pos = array<vec2<f32>, 3>(
                    vec2<f32>(-1.0, -1.0),
                    vec2<f32>(3.0, -1.0),
                    vec2<f32>(-1.0, 3.0)
                );
                
                var output: VertexOutput;
                output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
                return output;
            }
            
            @fragment
            fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
                // Use fragment position directly (in pixels)
                let x = u32(input.position.x);
                let y = u32(input.position.y);
                
                if (x >= params.width || y >= params.height) {
                    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
                }
                
                let pixel_idx = y * params.width + x;
                let base = pixel_idx * 4u;
                
                return vec4<f32>(
                    input_buffer[base + 0u],
                    input_buffer[base + 1u],
                    input_buffer[base + 2u],
                    input_buffer[base + 3u]
                );
            }
        `;
    const module = this.device.createShaderModule({ code: shaderSource });
    const pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs_main"
      },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [{ format }]
      },
      primitive: {
        topology: "triangle-list"
      }
    });
    this._bufferToTextureRenderPipelines.set(cacheKey, pipeline);
    return pipeline;
  }
  /**
   * Copy data from output_buffer storage buffer to a texture.
   * Uses a render pass with a fullscreen triangle to read from the buffer
   * and write to the texture via fragment shader output.
   */
  copyBufferToTexture(state, outputId, bufferName = "output_buffer") {
    const outputBuffer = this.storageBuffers.get(bufferName);
    if (!outputBuffer) {
      console.warn(`[copyBufferToTexture] ${bufferName} not found`);
      return;
    }
    let outputTex = null;
    const surfaceName = this.parseGlobalName(outputId);
    if (surfaceName) {
      const writeTexId = state.writeSurfaces?.[surfaceName];
      if (writeTexId) {
        outputTex = this.textures.get(writeTexId);
      }
    }
    if (!outputTex && outputId === "outputTex") {
      const renderSurfaceName = state?.graph?.renderSurface;
      if (renderSurfaceName) {
        const writeTexId = state.writeSurfaces?.[renderSurfaceName];
        if (writeTexId) {
          outputTex = this.textures.get(writeTexId);
        }
      }
    }
    if (!outputTex) {
      outputTex = this.textures.get(outputId);
    }
    if (!outputTex) {
      console.warn(`[copyBufferToTexture] Output texture not found: ${outputId}`);
      return;
    }
    const width = state.screenWidth || outputTex.width;
    const height = state.screenHeight || outputTex.height;
    const paramsData = new Uint32Array([width, height, 0, 0]);
    const paramsBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.queue.writeBuffer(paramsBuffer, 0, paramsData);
    const format = outputTex.gpuFormat || "rgba8unorm";
    const pipeline = this.getBufferToTextureRenderPipeline(format);
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: outputBuffer } },
        { binding: 1, resource: { buffer: paramsBuffer } }
      ]
    });
    const passEncoder = this.commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: outputTex.view,
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }]
    });
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();
    this.activeUniformBuffers.push(paramsBuffer);
  }
  resolveFormat(format) {
    const formats = {
      "rgba8": "rgba8unorm",
      "rgba16f": "rgba16float",
      "rgba32f": "rgba32float",
      "r8": "r8unorm",
      "r16f": "r16float",
      "r32f": "r32float",
      "rg8": "rg8unorm",
      "rg16f": "rg16float",
      "rg32f": "rg32float",
      // Pass-through for already-resolved formats
      "rgba8unorm": "rgba8unorm",
      "rgba16float": "rgba16float",
      "rgba32float": "rgba32float",
      "r8unorm": "r8unorm",
      "r16float": "r16float",
      "r32float": "r32float",
      "bgra8unorm": "bgra8unorm"
    };
    return formats[format] || format || "rgba8unorm";
  }
  resolveUsage(usageArray) {
    let usage = 0;
    for (const u of usageArray) {
      switch (u) {
        case "render":
          usage |= GPUTextureUsage.RENDER_ATTACHMENT;
          break;
        case "sample":
          usage |= GPUTextureUsage.TEXTURE_BINDING;
          break;
        case "storage":
          usage |= GPUTextureUsage.STORAGE_BINDING;
          break;
        case "copySrc":
          usage |= GPUTextureUsage.COPY_SRC;
          break;
        case "copyDst":
          usage |= GPUTextureUsage.COPY_DST;
          break;
      }
    }
    return usage;
  }
  getName() {
    return "WebGPU";
  }
  /**
   * Read pixels from a texture for testing purposes.
   * Note: This is async due to WebGPU's buffer mapping requirements.
   * @param {string} textureId - The texture ID to read from
   * @returns {Promise<{width: number, height: number, data: Uint8Array}>}
   */
  async readPixels(textureId) {
    const tex = this.textures.get(textureId);
    if (!tex) {
      throw new Error(`Texture ${textureId} not found`);
    }
    const { handle, width, height, gpuFormat } = tex;
    let bytesPerPixel = 4;
    if (gpuFormat === "rgba16float") {
      bytesPerPixel = 8;
    } else if (gpuFormat === "rgba32float") {
      bytesPerPixel = 16;
    }
    const bytesPerRow = Math.ceil(width * bytesPerPixel / 256) * 256;
    const bufferSize = bytesPerRow * height;
    const stagingBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
      { texture: handle },
      { buffer: stagingBuffer, bytesPerRow },
      { width, height, depthOrArrayLayers: 1 }
    );
    this.queue.submit([commandEncoder.finish()]);
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const mappedRange = stagingBuffer.getMappedRange();
    const data = new Uint8Array(width * height * 4);
    if (gpuFormat === "rgba16float") {
      const srcData = new Uint16Array(mappedRange);
      for (let row = 0; row < height; row++) {
        const srcRowOffset = row * bytesPerRow / 2;
        for (let col = 0; col < width; col++) {
          const srcPixel = srcRowOffset + col * 4;
          const dstPixel = (row * width + col) * 4;
          for (let c = 0; c < 4; c++) {
            const f16 = srcData[srcPixel + c];
            const f32 = float16ToFloat32(f16);
            data[dstPixel + c] = Math.max(0, Math.min(255, Math.round(f32 * 255)));
          }
        }
      }
    } else if (gpuFormat === "rgba32float") {
      const srcData = new Float32Array(mappedRange);
      for (let row = 0; row < height; row++) {
        const srcRowOffset = row * bytesPerRow / 4;
        for (let col = 0; col < width; col++) {
          const srcPixel = srcRowOffset + col * 4;
          const dstPixel = (row * width + col) * 4;
          for (let c = 0; c < 4; c++) {
            const f32 = srcData[srcPixel + c];
            data[dstPixel + c] = Math.max(0, Math.min(255, Math.round(f32 * 255)));
          }
        }
      }
    } else {
      const srcData = new Uint8Array(mappedRange);
      for (let row = 0; row < height; row++) {
        const srcOffset = row * bytesPerRow;
        const dstOffset = row * width * 4;
        data.set(srcData.subarray(srcOffset, srcOffset + width * 4), dstOffset);
      }
    }
    stagingBuffer.unmap();
    stagingBuffer.destroy();
    return { width, height, data };
  }
  static async isAvailable() {
    if (typeof navigator === "undefined" || !navigator.gpu) {
      return false;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }
};

// shaders/src/renderer/cubeCamera.js
var CUBE_FACES = [
  { name: "px", forward: [1, 0, 0], up: [0, -1, 0] },
  { name: "nx", forward: [-1, 0, 0], up: [0, -1, 0] },
  { name: "py", forward: [0, 1, 0], up: [0, 0, 1] },
  { name: "ny", forward: [0, -1, 0], up: [0, 0, -1] },
  { name: "pz", forward: [0, 0, 1], up: [0, -1, 0] },
  { name: "nz", forward: [0, 0, -1], up: [0, -1, 0] }
];
var cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
function faceRight(face) {
  const f = CUBE_FACES[face];
  return cross(f.up, f.forward);
}
function faceBasisMat3(face) {
  const f = CUBE_FACES[face];
  const r = faceRight(face);
  return [r[0], r[1], r[2], f.up[0], f.up[1], f.up[2], f.forward[0], f.forward[1], f.forward[2]];
}
var CUBE_FACE_BASES = [0, 1, 2, 3, 4, 5].map(faceBasisMat3);

// shaders/src/runtime/pipeline.js
var TAU2 = Math.PI * 2;
function oscSine(t) {
  return (1 - Math.cos(t * TAU2)) * 0.5;
}
function oscTri(t) {
  const tf = t - Math.floor(t);
  return 1 - Math.abs(tf * 2 - 1);
}
function oscSaw(t) {
  return t - Math.floor(t);
}
function oscSawInv(t) {
  return 1 - (t - Math.floor(t));
}
function oscSquare(t) {
  return t - Math.floor(t) >= 0.5 ? 1 : 0;
}
function hash21(px, py, s) {
  let x = (px * 234.34 + s) % 1;
  let y = (py * 435.345 + s) % 1;
  if (x < 0) x += 1;
  if (y < 0) y += 1;
  const p = x + y + (x + y) * 34.23;
  return x * y * p % 1;
}
function noise2D(px, py, s) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  let fx = px - ix;
  let fy = py - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy, s);
  const b = hash21(ix + 1, iy, s);
  const c = hash21(ix, iy + 1, s);
  const d = hash21(ix + 1, iy + 1, s);
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}
function oscNoise(t, seed) {
  const temporal = t % 1;
  const angle = temporal * TAU2;
  const radius = 2;
  const loopX = Math.cos(angle) * radius;
  const loopY = Math.sin(angle) * radius;
  const n1 = noise2D(loopX + seed, loopY + seed, seed);
  const n2 = noise2D(loopX + seed * 2, loopY + seed * 2, seed);
  return (n1 + n2) / 2;
}
function evaluateOscillator(osc, normalizedTime) {
  const { oscType, min, max, speed, offset, seed } = osc;
  const t = normalizedTime * speed + offset;
  let value;
  switch (oscType) {
    case 0:
      value = oscSine(t);
      break;
    case 1:
      value = oscTri(t);
      break;
    case 2:
      value = oscSaw(t);
      break;
    case 3:
      value = oscSawInv(t);
      break;
    case 4:
      value = oscSquare(t);
      break;
    case 5:
      value = oscNoise(t, seed);
      break;
    default:
      value = 0;
  }
  return min + value * (max - min);
}
function evaluateMidi(config, midiState, currentTime) {
  if (!midiState) return config.min;
  const channel = midiState.getChannel(config.channel);
  const { mode, min, max, sensitivity } = config;
  let rawValue = 0;
  switch (mode) {
    case 0:
      rawValue = channel.key;
      break;
    case 1:
      if (channel.gate === 1) {
        rawValue = channel.key;
      }
      break;
    case 2:
      if (channel.gate === 1) {
        rawValue = channel.velocity;
      }
      break;
    case 3:
      if (channel.gate === 1) {
        rawValue = channel.key;
        const elapsed = currentTime - channel.time;
        const decay = Math.min(1, elapsed * sensitivity * 1e-3);
        rawValue = rawValue * (1 - decay);
      }
      break;
    case 4:
    // velocity (default) - velocity with falloff
    default:
      if (channel.gate === 1) {
        rawValue = channel.velocity;
        const elapsed = currentTime - channel.time;
        const decay = Math.min(1, elapsed * sensitivity * 1e-3);
        rawValue = rawValue * (1 - decay);
      }
      break;
  }
  const normalized = rawValue / 127;
  return min + normalized * (max - min);
}
function evaluateAudio(config, audioState) {
  if (!audioState) return config.min;
  const { band, min, max } = config;
  let rawValue = 0;
  switch (band) {
    case 0:
      rawValue = audioState.low;
      break;
    case 1:
      rawValue = audioState.mid;
      break;
    case 2:
      rawValue = audioState.high;
      break;
    case 3:
    // vol
    default:
      rawValue = audioState.vol;
      break;
  }
  rawValue = Math.max(0, Math.min(1, rawValue));
  return min + rawValue * (max - min);
}
var Pipeline = class {
  constructor(graph, backend) {
    this.graph = graph;
    this.backend = backend;
    this.frameIndex = 0;
    this.lastTime = 0;
    this.surfaces = /* @__PURE__ */ new Map();
    this.globalUniforms = {};
    this.width = 0;
    this.height = 0;
    this.frameReadTextures = /* @__PURE__ */ new Map();
    this.frameWriteTextures = /* @__PURE__ */ new Map();
    this.animationDuration = 10;
    this._frameState = {
      frameIndex: 0,
      time: 0,
      globalUniforms: null,
      surfaces: {},
      writeSurfaces: {},
      graph: null,
      screenWidth: 0,
      screenHeight: 0
    };
    this._surfaceKeys = [];
    this._writeSurfaceKeys = [];
    this._oscillatorPassProxy = {
      uniforms: {}
    };
    this._resolvedUniforms = {};
    this.lastPassCount = 0;
    this.isCompiling = false;
    this._tileOffset = null;
    this._fullResolution = null;
    this.externalState = {
      midi: null,
      // MidiState instance
      audio: null
      // AudioState instance
    };
    this._asyncRenders = /* @__PURE__ */ new Map();
  }
  /**
   * Set the MIDI state for midi() function resolution.
   * The host application should create a MidiState instance and pass it here.
   * @param {import('./external-input.js').MidiState} midiState
   */
  setMidiState(midiState) {
    this.externalState.midi = midiState;
  }
  /**
   * Set the audio state for audio() function resolution.
   * The host application should create an AudioState instance and pass it here.
   * @param {import('./external-input.js').AudioState} audioState
   */
  setAudioState(audioState) {
    this.externalState.audio = audioState;
  }
  /**
   * Get device capabilities from the backend.
   * Useful for UI to show/hide options or adjust defaults.
   * @returns {{isMobile: boolean, floatBlend: boolean, floatLinear: boolean, colorBufferFloat: boolean, maxDrawBuffers: number, maxTextureSize: number, maxStateSize: number}}
   */
  getCapabilities() {
    return this.backend?.capabilities || {
      isMobile: false,
      floatBlend: true,
      floatLinear: true,
      colorBufferFloat: true,
      maxDrawBuffers: 8,
      maxTextureSize: 4096,
      maxStateSize: 2048
    };
  }
  /**
   * Set the animation duration for oscillators.
   * Oscillators loop evenly over this duration.
   * @param {number} seconds - Animation loop duration in seconds
   */
  setAnimationDuration(seconds) {
    this.animationDuration = seconds;
  }
  /**
   * Initialize the pipeline
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   */
  async init(width, height) {
    await this.backend.init();
    await this.compilePrograms();
    this.resize(width, height);
  }
  /**
   * Compile all shader programs referenced by the graph.
   * Sets isCompiling flag to prevent render loop from executing during compilation.
   */
  async compilePrograms() {
    if (!this.graph || !this.graph.passes) return;
    this.isCompiling = true;
    try {
      const compiled = /* @__PURE__ */ new Set();
      for (const pass of this.graph.passes) {
        if (compiled.has(pass.program)) continue;
        const spec = this.resolveProgramSpec(pass);
        if (!spec) {
          throw {
            code: "ERR_PROGRAM_SPEC_MISSING",
            program: pass.program,
            pass: pass.id
          };
        }
        await this.backend.compileProgram(pass.program, spec);
        compiled.add(pass.program);
      }
    } finally {
      this.isCompiling = false;
    }
  }
  /**
   * Resolve the program specification for a pass
   */
  resolveProgramSpec(pass) {
    const programs = this.graph?.programs;
    if (programs instanceof Map && programs.has(pass.program)) {
      return programs.get(pass.program);
    }
    if (programs && typeof programs === "object" && programs[pass.program]) {
      return programs[pass.program];
    }
    return null;
  }
  /**
   * Resize the pipeline
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.createSurfaces();
    const defaultUniforms = this.collectDefaultUniforms();
    this.recreateTextures(defaultUniforms);
    this.initAsyncEffects();
  }
  /**
   * Initialize effects that have asyncInit handlers.
   * Called after texture allocation and on seed change.
   */
  initAsyncEffects() {
    if (!this.graph || !this.graph.passes) return;
    const seen = /* @__PURE__ */ new Set();
    for (const pass of this.graph.passes) {
      if (!pass.effectKey || !pass.nodeId || seen.has(pass.nodeId)) continue;
      seen.add(pass.nodeId);
      const effectDef = getEffect(pass.effectKey);
      if (!effectDef) continue;
      if (!effectDef._configAsyncInit && effectDef.asyncInit === Effect.prototype.asyncInit) continue;
      this._startAsyncInit(pass.nodeId, effectDef);
    }
  }
  /**
   * Check if an async effect needs regen based on step-specific param changes.
   * Called by ProgramState._applyToPipeline with the step's own values.
   * Only regens the specific node — never touches other effects.
   */
  checkAsyncRegen(nodeId, effectKey, stepValues) {
    const effectDef = getEffect(effectKey);
    if (!effectDef) return;
    if (!effectDef._configAsyncInit && effectDef.asyncInit === Effect.prototype.asyncInit) return;
    if (!this._asyncParamCache) this._asyncParamCache = /* @__PURE__ */ new Map();
    const cache = this._asyncParamCache.get(nodeId) || {};
    let changed = false;
    for (const [paramName, value] of Object.entries(stepValues)) {
      if (paramName === "alpha" || paramName.startsWith("_")) continue;
      if (value === void 0 || value === null) continue;
      if (!effectDef.globals?.[paramName]) continue;
      if (cache[paramName] !== value) {
        changed = true;
        cache[paramName] = value;
      }
    }
    this._asyncParamCache.set(nodeId, cache);
    if (changed) {
      this._startAsyncInit(nodeId, effectDef, { debounce: true, params: stepValues });
    }
  }
  _startAsyncInit(nodeId, effectDef, { debounce = false, params = null } = {}) {
    if (debounce) {
      if (!this._asyncDebounceTimers) this._asyncDebounceTimers = /* @__PURE__ */ new Map();
      const prevTimer = this._asyncDebounceTimers.get(nodeId);
      if (prevTimer) clearTimeout(prevTimer);
      this._asyncDebounceTimers.set(nodeId, setTimeout(() => {
        this._asyncDebounceTimers.delete(nodeId);
        this._startAsyncInit(nodeId, effectDef, { debounce: false, params });
      }, 300));
      return;
    }
    const prevCancel = this._asyncRenders.get(nodeId);
    if (prevCancel) prevCancel();
    let cancelled = false;
    this._asyncRenders.set(nodeId, () => {
      cancelled = true;
    });
    const context = {
      updateTexture: (texName, canvas) => {
        if (cancelled) return;
        const texId = `${nodeId}_${texName}`;
        this.backend.updateTextureFromSource(texId, canvas, { flipY: true });
      },
      width: this.width,
      height: this.height,
      params: params ? { ...params } : { ...this.globalUniforms },
      isCancelled: () => cancelled
    };
    effectDef.asyncInit(context).catch((err) => {
      console.error(`[Pipeline] asyncInit error for ${nodeId}:`, err);
    });
  }
  /**
   * Collect uniform values from all passes for resolving parameter-based
   * texture dimensions. Per-effect uniforms (zoom, stateSize, ...) are
   * authoritative on each pass; the chain-scoped variants written by the
   * expander (e.g. `zoom_chain_0`) carry the per-effect value into a
   * unique key so different chains don't clobber each other when the
   * passes are merged here.
   */
  collectDefaultUniforms() {
    const uniforms = {};
    if (this.graph && this.graph.passes) {
      for (const pass of this.graph.passes) {
        if (pass.uniforms) {
          Object.assign(uniforms, pass.uniforms);
        }
      }
    }
    return uniforms;
  }
  /**
   * Create global output surfaces (o0, o1, o2, o3, o4, o5, o6, o7)
   * Also scans the graph for any other required global surfaces (starting with global_)
   */
  /**
   * Check if a texture ID is a global surface reference and extract the name.
   * Supports "global_name" pattern.
   * Returns null if not a global, otherwise returns the surface name.
   */
  parseGlobalName(texId) {
    if (typeof texId !== "string") return null;
    if (texId.startsWith("global_")) {
      return texId.replace("global_", "");
    }
    return null;
  }
  createSurfaces() {
    const surfaceNames = /* @__PURE__ */ new Set(["o0", "o1", "o2", "o3", "o4", "o5", "o6", "o7"]);
    const geoBufferNames = /* @__PURE__ */ new Set(["geo0", "geo1", "geo2", "geo3", "geo4", "geo5", "geo6", "geo7"]);
    const volumeNames = /* @__PURE__ */ new Set(["vol0", "vol1", "vol2", "vol3", "vol4", "vol5", "vol6", "vol7"]);
    const meshNames = /* @__PURE__ */ new Set(["mesh0", "mesh1", "mesh2", "mesh3", "mesh4", "mesh5", "mesh6", "mesh7"]);
    const defaultUniforms = this.collectDefaultUniforms();
    const meshTexturePattern = /^mesh\d+_(positions|normals|uvs)$/;
    if (this.graph && this.graph.passes) {
      for (const pass of this.graph.passes) {
        if (pass.inputs) {
          for (const texId of Object.values(pass.inputs)) {
            const globalName = this.parseGlobalName(texId);
            if (globalName && !meshTexturePattern.test(globalName)) {
              surfaceNames.add(globalName);
            }
          }
        }
        if (pass.outputs) {
          for (const texId of Object.values(pass.outputs)) {
            const globalName = this.parseGlobalName(texId);
            if (globalName && !meshTexturePattern.test(globalName)) {
              surfaceNames.add(globalName);
            }
          }
        }
      }
    }
    this._needsMidiNoteGrid = false;
    if (this.graph && this.graph.passes) {
      for (const pass of this.graph.passes) {
        if (pass.inputs) {
          for (const texId of Object.values(pass.inputs)) {
            if (texId === "midiNoteGrid") {
              this._needsMidiNoteGrid = true;
              break;
            }
          }
        }
        if (this._needsMidiNoteGrid) break;
      }
    }
    for (const name of surfaceNames) {
      let surfaceWidth = this.width;
      let surfaceHeight = this.height;
      let surfaceFormat = "rgba16f";
      const underscoreId = `global_${name}`;
      let texSpec = this.graph?.textures?.get?.(underscoreId);
      if (texSpec) {
        surfaceWidth = this.resolveDimension(texSpec.width, this.width, defaultUniforms);
        surfaceHeight = this.resolveDimension(texSpec.height, this.height, defaultUniforms);
        if (texSpec.format) surfaceFormat = texSpec.format;
      }
      const oldSurface = this.surfaces.get(name);
      if (oldSurface) {
        const existingTex = this.backend.textures?.get?.(oldSurface.read);
        if (existingTex && existingTex.width === surfaceWidth && existingTex.height === surfaceHeight) {
          continue;
        }
        this.backend.destroyTexture(`global_${name}_read`);
        this.backend.destroyTexture(`global_${name}_write`);
      }
      this.backend.createTexture(`global_${name}_read`, {
        width: surfaceWidth,
        height: surfaceHeight,
        format: surfaceFormat,
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.backend.createTexture(`global_${name}_write`, {
        width: surfaceWidth,
        height: surfaceHeight,
        format: surfaceFormat,
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.surfaces.set(name, {
        read: `global_${name}_read`,
        write: `global_${name}_write`,
        currentFrame: 0
      });
    }
    for (const name of geoBufferNames) {
      const oldSurface = this.surfaces.get(name);
      if (oldSurface) {
        const existingTex = this.backend.textures?.get?.(oldSurface.read);
        if (existingTex && existingTex.width === this.width && existingTex.height === this.height) {
          continue;
        }
        this.backend.destroyTexture(`global_${name}_read`);
        this.backend.destroyTexture(`global_${name}_write`);
      }
      this.backend.createTexture(`global_${name}_read`, {
        width: this.width,
        height: this.height,
        format: "rgba16f",
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.backend.createTexture(`global_${name}_write`, {
        width: this.width,
        height: this.height,
        format: "rgba16f",
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.surfaces.set(name, {
        read: `global_${name}_read`,
        write: `global_${name}_write`,
        currentFrame: 0
      });
    }
    const volumeSliceSize = 64;
    const volumeAtlasHeight = volumeSliceSize * volumeSliceSize;
    for (const name of volumeNames) {
      const oldSurface = this.surfaces.get(name);
      if (oldSurface) {
        const existingTex = this.backend.textures?.get?.(oldSurface.read);
        if (existingTex && existingTex.width === volumeSliceSize && existingTex.height === volumeAtlasHeight) {
          continue;
        }
        this.backend.destroyTexture(`global_${name}_read`);
        this.backend.destroyTexture(`global_${name}_write`);
      }
      this.backend.createTexture(`global_${name}_read`, {
        width: volumeSliceSize,
        height: volumeAtlasHeight,
        format: "rgba16f",
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.backend.createTexture(`global_${name}_write`, {
        width: volumeSliceSize,
        height: volumeAtlasHeight,
        format: "rgba16f",
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.surfaces.set(name, {
        read: `global_${name}_read`,
        write: `global_${name}_write`,
        currentFrame: 0
      });
    }
    for (const name of meshNames) {
      const oldSurface = this.surfaces.get(name);
      if (oldSurface) {
        continue;
      }
      const meshWidth = 256;
      const meshHeight = 256;
      this.backend.createTexture(`global_${name}_positions`, {
        width: meshWidth,
        height: meshHeight,
        format: "rgba32f",
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.backend.createTexture(`global_${name}_normals`, {
        width: meshWidth,
        height: meshHeight,
        format: "rgba32f",
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.backend.createTexture(`global_${name}_uvs`, {
        width: meshWidth,
        height: meshHeight,
        format: "rgba32f",
        usage: ["render", "sample", "copySrc", "copyDst", "storage"]
      });
      this.surfaces.set(name, {
        positions: `global_${name}_positions`,
        normals: `global_${name}_normals`,
        uvs: `global_${name}_uvs`,
        width: meshWidth,
        height: meshHeight
      });
    }
  }
  /**
   * Check if a dimension spec is dynamic (screen-relative, percentage, or parameter-based)
   * Fixed numeric values return false; everything else returns true.
   * @param {number|string|object} spec - Dimension specification
   * @returns {boolean} True if the spec should be re-resolved on resize
   */
  isDynamicDimension(spec) {
    if (typeof spec === "number") {
      return false;
    }
    if (typeof spec === "string") {
      return true;
    }
    if (typeof spec === "object" && spec !== null) {
      return true;
    }
    return true;
  }
  /**
   * Recreate textures with new dimensions based on current uniform values
   * @param {object} [uniforms] - Current uniform values for parameter-based sizing
   */
  recreateTextures(uniforms = {}) {
    if (!this.graph || !this.graph.textures) return;
    for (const [texId, spec] of this.graph.textures.entries()) {
      const isGlobalSurface = texId.startsWith("global_") || texId.startsWith("global");
      if (isGlobalSurface) {
        const hasDynamicWidth = this.isDynamicDimension(spec.width);
        const hasDynamicHeight = this.isDynamicDimension(spec.height);
        if (!hasDynamicWidth && !hasDynamicHeight) {
          continue;
        }
      }
      const width = this.resolveDimension(spec.width, this.width, uniforms);
      const height = this.resolveDimension(spec.height, this.height, uniforms);
      if (isGlobalSurface) {
        let surfaceName = null;
        if (texId.startsWith("global_")) {
          for (const name of this.surfaces.keys()) {
            if (texId.includes(name) || texId.endsWith(name)) {
              surfaceName = name;
              break;
            }
          }
        } else if (texId.startsWith("global")) {
          const suffix = texId.slice(6);
          surfaceName = suffix.charAt(0).toLowerCase() + suffix.slice(1);
        }
        if (!surfaceName || !this.surfaces.has(surfaceName)) {
          continue;
        }
        const surface = this.surfaces.get(surfaceName);
        const readTexId = surface.read;
        const writeTexId = surface.write;
        const existingTex = this.backend.textures?.get?.(readTexId);
        if (existingTex && existingTex.width === width && existingTex.height === height) {
          continue;
        }
        this.backend.destroyTexture(readTexId);
        this.backend.destroyTexture(writeTexId);
        const format = spec.format || "rgba16f";
        this.backend.createTexture(readTexId, {
          width,
          height,
          format,
          usage: ["render", "sample", "copySrc", "copyDst", "storage"]
        });
        this.backend.createTexture(writeTexId, {
          width,
          height,
          format,
          usage: ["render", "sample", "copySrc", "copyDst", "storage"]
        });
      } else {
        const existingTex = this.backend.textures?.get?.(texId);
        if (existingTex && existingTex.width === width && existingTex.height === height) {
          if (!spec.is3D || existingTex.depth === this.resolveDimension(spec.depth, width, uniforms)) {
            continue;
          }
        }
        this.backend.destroyTexture(texId);
        if (spec.is3D) {
          const depth = this.resolveDimension(spec.depth, width, uniforms);
          this.backend.createTexture3D(texId, {
            ...spec,
            width,
            height,
            depth
          });
        } else {
          this.backend.createTexture(texId, {
            ...spec,
            width,
            height
          });
        }
      }
    }
  }
  /**
   * Update parameter-dependent textures when uniforms change
   * Call this when volumeSize or similar sizing parameters change
   * @param {object} uniforms - Current uniform values
   */
  updateParameterTextures(uniforms = {}) {
    this.recreateTextures(uniforms);
  }
  /**
   * Check if a value is an automation config (oscillator, midi, audio)
   * These should not be overwritten by setUniform calls
   * @param {any} value - Value to check
   * @returns {boolean} True if this is an automation config
   */
  isAutomationConfig(value) {
    return value && typeof value === "object" && (value.type === "Oscillator" || value.type === "Midi" || value.type === "Audio" || value._ast?.type === "Oscillator" || value._ast?.type === "Midi" || value._ast?.type === "Audio");
  }
  /**
   * Set tile region for tiled large-resolution rendering.
   * When set, shaders receive tileOffset and fullResolution uniforms
   * so they can compute global coordinates across the full image.
   * @param {{offset: number[], fullResolution: number[], renderScale?: number}} region
   * @param {number[]} region.offset - [x, y] pixel offset of this tile in the full image
   * @param {number[]} region.fullResolution - [w, h] dimensions of the complete output image
   * @param {number} [region.renderScale] - scale factor vs original canvas (e.g. 5.86 for 6000px from 1024px)
   */
  setTileRegion({ offset, fullResolution, renderScale }) {
    this._tileOffset = offset;
    this._fullResolution = fullResolution;
    this._renderScale = renderScale ?? 1;
  }
  /**
   * Clear tile region, returning to normal (non-tiled) rendering.
   */
  clearTileRegion() {
    this._tileOffset = null;
    this._fullResolution = null;
    this._renderScale = null;
  }
  /**
   * Render the current graph once per cube face into 6 face pixel buffers.
   * Faces are ordered +X,-X,+Y,-Y,+Z,-Z (GL cubemap order).
   *
   * The returned array is reused and its entries overwritten on every call;
   * copy the faces (or their `data`) if you need to retain them across calls.
   * The render style (lit blob vs raw sample) is whichever cubemap renderer the
   * graph ends in (renderCubemap3d / renderCubemapSurface) — not a parameter here.
   * yieldBetweenFaces awaits an animation frame before each face render so a
   * host render loop keeps painting during large (e.g. 1024px) captures.
   * @param {{size?:number, outputSurface?:string, time?:number, yieldBetweenFaces?:boolean}} cfg
   * @returns {Promise<Array<{width:number,height:number,data:Uint8Array}>>} reused buffer — copy if retaining
   */
  async renderCubemap({ size = 512, outputSurface = "o0", time = 0, yieldBetweenFaces = false } = {}) {
    const prevW = this.width, prevH = this.height;
    if (this.width !== size || this.height !== size) this.resize(size, size);
    if (!this._cubeFaces) this._cubeFaces = new Array(6);
    for (let face = 0; face < 6; face++) {
      if (yieldBetweenFaces) {
        await new Promise((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          if (typeof requestAnimationFrame === "function") requestAnimationFrame(finish);
          setTimeout(finish, 120);
        });
      }
      this.setUniform("cubeBasis", CUBE_FACE_BASES[face]);
      this.render(time);
      const surface = this.surfaces.get(outputSurface);
      if (!surface) {
        throw new Error(`renderCubemap: output surface "${outputSurface}" not found \u2014 the composition must write its cubemap-renderer result to it (e.g. .renderCubemapSurface().write(${outputSurface}))`);
      }
      this._cubeFaces[face] = await this.backend.readPixels(surface.read);
    }
    if (prevW !== size || prevH !== size) this.resize(prevW, prevH);
    return this._cubeFaces;
  }
  /**
   * Set a global uniform value
   * Automatically triggers texture resizing if the parameter affects texture dimensions
   * NOTE: Does not overwrite automation configs (oscillator, midi, audio) in pass uniforms
   * @param {string} name - Uniform name
   * @param {any} value - Uniform value
   */
  setUniform(name, value) {
    if ((name === "stateSize" || name.startsWith("stateSize_node_")) && typeof value === "number") {
      const maxStateSize = this.backend?.capabilities?.maxStateSize || 2048;
      if (value > maxStateSize) {
        console.warn(`[Pipeline] Capping stateSize from ${value} to ${maxStateSize} for device compatibility`);
        value = maxStateSize;
      }
    }
    const oldValue = this.globalUniforms[name];
    this.globalUniforms[name] = value;
    if (name === "palette" && typeof value === "number") {
      const expanded = expandPalette(value);
      if (expanded) {
        for (const [uName, uValue] of Object.entries(expanded)) {
          this.setUniform(uName, uValue);
        }
        return;
      }
    }
    const isScopedUniform = /_node_\d+$/.test(name) || /_chain_\d+$/.test(name);
    if (this.graph && this.graph.passes) {
      for (const pass of this.graph.passes) {
        if (pass.uniforms && name in pass.uniforms) {
          const currentValue = pass.uniforms[name];
          if (!this.isAutomationConfig(currentValue)) {
            pass.uniforms[name] = value;
          }
        }
        if (!isScopedUniform && pass.uniforms) {
          for (const key of Object.keys(pass.uniforms)) {
            if (key.startsWith(name + "_node_") || key.startsWith(name + "_chain_")) {
              const currentValue = pass.uniforms[key];
              if (!this.isAutomationConfig(currentValue)) {
                pass.uniforms[key] = value;
                this.globalUniforms[key] = value;
              }
            }
          }
        }
      }
    }
    if (oldValue !== value && this.graph && this.graph.textures) {
      let affectsTextures = false;
      for (const spec of this.graph.textures.values()) {
        if (this.dimensionReferencesParam(spec.width, name) || this.dimensionReferencesParam(spec.height, name) || spec.depth && this.dimensionReferencesParam(spec.depth, name) || this.dimensionReferencesScopedParam(spec.width, name) || this.dimensionReferencesScopedParam(spec.height, name) || spec.depth && this.dimensionReferencesScopedParam(spec.depth, name)) {
          affectsTextures = true;
          break;
        }
      }
      if (affectsTextures) {
        this.updateParameterTextures(this.globalUniforms);
      }
    }
  }
  /**
   * Broadcast a runtime update to a chain-scoped param to all other passes
   * in the same chain. The scoped variant name (e.g. 'volumeSize_chain_0')
   * uniquely identifies chain membership — any pass that has it in its
   * uniforms belongs to that chain (the expander seeds it via pipelineUniforms
   * propagation, so every pass in the chain holds a copy).
   *
   * Without this broadcast, runtime updates would leave per-pass copies
   * inconsistent, and `collectDefaultUniforms()`'s last-write-wins merge
   * would pick a stale value — causing atlas sizing to ignore the source
   * emitter's new value.
   *
   * For consumer passes that inherit the unscoped uniform from upstream
   * (`pass.inheritsVolumeSize`), also update the unscoped value so the
   * shader sees the new size. Currently only volumeSize has this inherit
   * semantics; downstream 3D effects use it.
   */
  broadcastChainScopedParam(sourcePass, uniformName, scopedName) {
    if (!this.graph || !this.graph.passes || !sourcePass.uniforms) return;
    const value = sourcePass.uniforms[uniformName];
    for (const otherPass of this.graph.passes) {
      if (otherPass === sourcePass || !otherPass.uniforms) continue;
      if (!(scopedName in otherPass.uniforms)) continue;
      otherPass.uniforms[scopedName] = value;
      if (uniformName === "volumeSize" && otherPass.inheritsVolumeSize && uniformName in otherPass.uniforms) {
        otherPass.uniforms[uniformName] = value;
      }
    }
  }
  /**
   * Check if a dimension spec references a specific parameter directly.
   * Matches both `{ param: 'X' }` (used by 3D atlases, particle state) and
   * `{ screenDivide: 'X' }` (used by sim surfaces).
   * @param {number|string|object} spec - Dimension specification
   * @param {string} paramName - Parameter name to check for
   * @returns {boolean} True if the spec references the parameter
   */
  dimensionReferencesParam(spec, paramName) {
    return typeof spec === "object" && spec !== null && (spec.param === paramName || spec.screenDivide === paramName);
  }
  /**
   * Check if a dimension spec references a scoped variant of a parameter.
   * Scoped params take two forms:
   *   - `paramName_node_N` (per-particle-pipeline, e.g. stateSize_node_5)
   *   - `paramName_chain_N` (per-chain, e.g. volumeSize_chain_0, zoom_chain_0)
   * @param {number|string|object} spec - Dimension specification
   * @param {string} paramName - Base parameter name to check for
   * @returns {boolean} True if the spec references a scoped version of the parameter
   */
  dimensionReferencesScopedParam(spec, paramName) {
    if (typeof spec !== "object" || spec === null) return false;
    const ref = typeof spec.param === "string" ? spec.param : typeof spec.screenDivide === "string" ? spec.screenDivide : null;
    if (!ref) return false;
    return ref.startsWith(paramName + "_node_") || ref.startsWith(paramName + "_chain_");
  }
  /**
   * Resolve dimension spec to actual pixel value
   * @param {number|string|object} spec - Dimension specification
   * @param {number} screenSize - Screen dimension for relative specs
   * @param {object} [uniforms] - Current uniform values for param references
   */
  resolveDimension(spec, screenSize, uniforms = {}) {
    if (typeof spec === "number") {
      return Math.max(1, Math.floor(spec));
    }
    if (spec === "screen" || spec === "auto") {
      return screenSize;
    }
    if (typeof spec === "string" && spec.endsWith("%")) {
      const percent = parseFloat(spec);
      return Math.max(1, Math.floor(screenSize * percent / 100));
    }
    if (typeof spec === "object") {
      if (spec.param !== void 0) {
        const hasTransform = spec.power !== void 0 || spec.multiply !== void 0;
        const paramDefault = spec.paramDefault ?? 64;
        let value = uniforms[spec.param] ?? paramDefault;
        if (spec.multiply !== void 0) {
          value *= spec.multiply;
        }
        if (spec.power !== void 0) {
          value = Math.pow(value, spec.power);
        }
        if (hasTransform && uniforms[spec.param] === void 0 && spec.default !== void 0) {
          value = spec.default;
        }
        return Math.max(1, Math.floor(value));
      }
      if (spec.screenDivide !== void 0) {
        const divisor = uniforms[spec.screenDivide] ?? spec.default ?? 1;
        return Math.max(1, Math.round(screenSize / divisor));
      }
      if (spec.scale !== void 0) {
        let computed = Math.floor(screenSize * spec.scale);
        if (spec.clamp) {
          if (spec.clamp.min !== void 0) {
            computed = Math.max(spec.clamp.min, computed);
          }
          if (spec.clamp.max !== void 0) {
            computed = Math.min(spec.clamp.max, computed);
          }
        }
        return Math.max(1, computed);
      }
    }
    return screenSize;
  }
  /**
   * Sync the internal time reference to a specific value.
   * Call this when pausing to ensure subsequent paused renders have deltaTime = 0.
   * @param {number} time - The normalized time value to sync to
   */
  syncTime(time) {
    this.lastTime = time;
  }
  /**
   * Execute a single frame.
   * Skips rendering if compilation is in progress to avoid race conditions
   * where passes reference programs that haven't been compiled yet.
   */
  render(time = 0) {
    if (this.isCompiling) {
      return;
    }
    let deltaTime = this.lastTime > 0 ? time - this.lastTime : 0;
    if (deltaTime < 0) {
      deltaTime = 1 / 60 / 10;
    }
    this.lastTime = time;
    this.updateGlobalUniforms(time, deltaTime);
    this.frameReadTextures.clear();
    this.frameWriteTextures.clear();
    for (const [name, surface] of this.surfaces.entries()) {
      this.frameReadTextures.set(name, surface.read);
      this.frameWriteTextures.set(name, surface.write);
    }
    this.backend.beginFrame(this.getFrameState());
    let passCount = 0;
    if (this.graph && this.graph.passes) {
      try {
        for (let i = 0; i < this.graph.passes.length; i++) {
          const originalPass = this.graph.passes[i];
          if (this.shouldSkipPass(originalPass)) {
            continue;
          }
          const pass = this.resolvePassUniforms(originalPass, time);
          const repeatCount = this.resolveRepeatCount(pass);
          for (let iter = 0; iter < repeatCount; iter++) {
            try {
              const state = this.getFrameState();
              this.backend.executePass(pass, state);
              passCount++;
              this.updateFrameSurfaceBindings(pass, state);
            } catch (err) {
              console.error(`[Pipeline.render] ERROR executing pass ${pass.id}: ${err.detail || err.message || JSON.stringify(err)}`);
              throw err;
            }
            if (repeatCount > 1) {
              this.adoptIterationBindings(pass);
            }
          }
        }
      } catch (loopErr) {
        console.error(`[Pipeline.render] LOOP ERROR: ${loopErr.detail || loopErr.message || JSON.stringify(loopErr)}`);
        throw loopErr;
      }
    }
    this.backend.endFrame();
    const renderSurfaceName = this.graph?.renderSurface;
    if (renderSurfaceName) {
      const renderSurface = this.surfaces.get(renderSurfaceName);
      if (renderSurface && this.backend.present) {
        const presentId = this.frameReadTextures?.get(renderSurfaceName) ?? renderSurface.read;
        this.backend.present(presentId);
      }
    }
    this.swapBuffers();
    this.lastPassCount = passCount;
    this.frameIndex++;
  }
  /**
   * Update global uniforms (time, resolution, etc.)
   * Mutates existing object to avoid per-frame allocation
   */
  updateGlobalUniforms(time, deltaTime) {
    const g = this.globalUniforms;
    const aspectValue = this.width / this.height;
    g.time = time;
    g.deltaTime = deltaTime;
    g.frame = this.frameIndex;
    if (!g.resolution) {
      g.resolution = [this.width, this.height];
    } else {
      g.resolution[0] = this.width;
      g.resolution[1] = this.height;
    }
    if (!g.tileOffset) {
      g.tileOffset = [0, 0];
    }
    if (!g.fullResolution) {
      g.fullResolution = [this.width, this.height];
    }
    if (this._tileOffset) {
      g.tileOffset[0] = this._tileOffset[0];
      g.tileOffset[1] = this._tileOffset[1];
    } else {
      g.tileOffset[0] = 0;
      g.tileOffset[1] = 0;
    }
    if (this._fullResolution) {
      g.fullResolution[0] = this._fullResolution[0];
      g.fullResolution[1] = this._fullResolution[1];
      const fullAspect = this._fullResolution[0] / this._fullResolution[1];
      g.aspect = fullAspect;
      g.aspectRatio = fullAspect;
    } else {
      g.fullResolution[0] = this.width;
      g.fullResolution[1] = this.height;
      g.aspect = aspectValue;
      g.aspectRatio = aspectValue;
    }
    g.renderScale = this._renderScale || 1;
    if (this.externalState.audio?.waveform) {
      g.audioWaveform = this.externalState.audio.waveform;
    }
    if (this.externalState.audio?.spectrum) {
      g.audioSpectrum = this.externalState.audio.spectrum;
    }
    if (this.externalState.midi) {
      this.externalState.midi.updateNoteGrid();
      this.backend.uploadDataTexture("midiNoteGrid", this.externalState.midi.noteGrid, 128, 16);
      g.midiClockCount = this.externalState.midi.clockCount;
    } else if (this._needsMidiNoteGrid) {
      if (!this._emptyNoteGrid) this._emptyNoteGrid = new Float32Array(128 * 16 * 4);
      this.backend.uploadDataTexture("midiNoteGrid", this._emptyNoteGrid, 128, 16);
    }
    g.midiClockCount = g.midiClockCount || 0;
  }
  /**
   * Resolve automation values (oscillators, MIDI, audio) in a uniform value.
   * If the value is an automation configuration, evaluate it and scale by consumer range.
   * @param {any} value - The uniform value (may be an automation config)
   * @param {number} time - Current time in seconds
   * @param {Object} [paramSpec] - Consumer parameter range { min, max }
   * @returns {any} The resolved value
   */
  resolveUniformValue(value, time, paramSpec) {
    if (!value || typeof value !== "object") return value;
    let pct;
    if (value.type === "Oscillator" || value._ast?.type === "Oscillator") {
      pct = evaluateOscillator(value, time);
    } else if (value.type === "Midi" || value._ast?.type === "Midi") {
      pct = evaluateMidi(value, this.externalState.midi, Date.now());
    } else if (value.type === "Audio" || value._ast?.type === "Audio") {
      pct = evaluateAudio(value, this.externalState.audio);
    } else {
      return value;
    }
    if (paramSpec) {
      return paramSpec.min + pct * (paramSpec.max - paramSpec.min);
    }
    return pct;
  }
  /**
   * Resolve all oscillators in pass uniforms for the current frame.
   * Uses a pre-allocated proxy object to avoid per-frame allocations.
   * @param {Object} pass - The pass definition
   * @param {number} time - Current time in seconds
   * @returns {Object} Pass or proxy with resolved uniforms
   */
  resolvePassUniforms(pass, time) {
    if (!pass.uniforms) return pass;
    const resolvedUniforms = this._resolvedUniforms;
    let hasOscillators = false;
    for (const key in resolvedUniforms) {
      resolvedUniforms[key] = void 0;
    }
    for (const name in pass.uniforms) {
      const value = pass.uniforms[name];
      const spec = pass.uniformSpecs?.[name];
      const resolved = this.resolveUniformValue(value, time, spec);
      resolvedUniforms[name] = resolved;
      if (resolved !== value) {
        hasOscillators = true;
      }
    }
    if (!hasOscillators) {
      return pass;
    }
    const proxy = this._oscillatorPassProxy;
    proxy.id = pass.id;
    proxy.program = pass.program;
    proxy.inputs = pass.inputs;
    proxy.outputs = pass.outputs;
    proxy.clear = pass.clear;
    proxy.blend = pass.blend;
    proxy.drawMode = pass.drawMode;
    proxy.count = pass.count;
    proxy.repeat = pass.repeat;
    proxy.conditions = pass.conditions;
    proxy.viewport = pass.viewport;
    proxy.drawBuffers = pass.drawBuffers;
    proxy.storageTextures = pass.storageTextures;
    proxy.samplerTypes = pass.samplerTypes;
    proxy.entryPoint = pass.entryPoint;
    const proxyUniforms = proxy.uniforms;
    proxy.uniforms = resolvedUniforms;
    this._resolvedUniforms = proxyUniforms;
    return proxy;
  }
  /**
   * Check if a pass should be skipped based on conditions
   */
  shouldSkipPass(pass) {
    if (!pass.conditions) return false;
    const { skipIf, runIf } = pass.conditions;
    if (skipIf) {
      for (const condition of skipIf) {
        const value = this.globalUniforms[condition.uniform] ?? pass.uniforms?.[condition.uniform];
        if (value === condition.equals) {
          return true;
        }
      }
    }
    if (runIf) {
      let shouldRun = true;
      for (const condition of runIf) {
        const value = this.globalUniforms[condition.uniform] ?? pass.uniforms?.[condition.uniform];
        if (value !== condition.equals) {
          shouldRun = false;
          break;
        }
      }
      if (!shouldRun) {
        return true;
      }
    }
    return false;
  }
  /**
   * Resolve the repeat count for a pass.
   * Supports static values or uniform-driven iteration counts.
   * @param {Object} pass - The pass definition
   * @returns {number} - Number of times to execute the pass
   */
  resolveRepeatCount(pass) {
    if (!pass.repeat) return 1;
    if (typeof pass.repeat === "number") {
      return Math.max(1, Math.floor(pass.repeat));
    }
    if (typeof pass.repeat === "string") {
      const value = this.globalUniforms[pass.repeat] ?? pass.uniforms?.[pass.repeat];
      if (typeof value === "number") {
        return Math.max(1, Math.floor(value));
      }
    }
    return 1;
  }
  /**
   * Adopt a repeated pass's frame-local ping-pong bindings into the
   * cross-frame surface record. Frame-local maps (frameReadTextures/
   * frameWriteTextures) are the source of truth -- updateFrameSurfaceBindings()
   * has already advanced them for this iteration; this mirrors those bindings
   * into this.surfaces so end-of-frame persistence and the surface.read/write
   * fallback stay consistent between iterations of a repeated pass. Do NOT
   * recompute the swap from this.surfaces here: a preceding non-repeat pass
   * (e.g. a seed pass) advances only the frame-local maps, so this.surfaces
   * can be stale when this first runs, and re-deriving from it would clobber
   * the correct binding.
   * @param {Object} pass - The pass that just executed
   */
  adoptIterationBindings(pass) {
    if (!pass.outputs) return;
    for (const outputName of Object.values(pass.outputs)) {
      if (typeof outputName !== "string") continue;
      const globalName = this.parseGlobalName(outputName);
      if (!globalName) continue;
      const surface = this.surfaces.get(globalName);
      if (!surface) continue;
      const frameRead = this.frameReadTextures?.get(globalName);
      const frameWrite = this.frameWriteTextures?.get(globalName);
      if (frameRead !== void 0) surface.read = frameRead;
      if (frameWrite !== void 0) surface.write = frameWrite;
    }
  }
  /**
   * Swap double-buffered surfaces at end of frame.
   *
   * For state surfaces (xyz, vel, rgba, trail), we DON'T swap - we persist
   * the frame's final read/write bindings so particles continue from where they left off.
   *
   * For display surfaces (o0-o7), we swap so the next frame renders fresh.
   */
  swapBuffers() {
    const isStateSurface = (name) => {
      if (name === "xyz" || name === "vel" || name === "rgba" || name === "trail") {
        return true;
      }
      if (name.endsWith("_xyz") || name.endsWith("_vel") || name.endsWith("_rgba") || name.endsWith("_trail")) {
        return true;
      }
      if (name.includes("state") || name.includes("State")) {
        return true;
      }
      if (/^(xyz|vel|rgba|points_trail)_node_\d+$/.test(name)) {
        return true;
      }
      return false;
    };
    for (const [name, surface] of this.surfaces.entries()) {
      surface.currentFrame = this.frameIndex;
      if (isStateSurface(name)) {
        const finalRead = this.frameReadTextures?.get(name);
        const finalWrite = this.frameWriteTextures?.get(name);
        if (finalRead && finalWrite) {
          surface.read = finalRead;
          surface.write = finalWrite;
        }
      } else {
        const temp = surface.read;
        surface.read = surface.write;
        surface.write = temp;
      }
    }
  }
  /**
   * Get current frame state
   * Reuses pre-allocated objects to minimize per-frame allocations
   */
  getFrameState() {
    const state = this._frameState;
    const surfaceMap = state.surfaces;
    const writeSurfaceMap = state.writeSurfaces;
    const oldSurfaceKeys = this._surfaceKeys;
    const oldWriteSurfaceKeys = this._writeSurfaceKeys;
    for (let i = 0; i < oldSurfaceKeys.length; i++) {
      surfaceMap[oldSurfaceKeys[i]] = void 0;
    }
    for (let i = 0; i < oldWriteSurfaceKeys.length; i++) {
      writeSurfaceMap[oldWriteSurfaceKeys[i]] = void 0;
    }
    oldSurfaceKeys.length = 0;
    oldWriteSurfaceKeys.length = 0;
    for (const [name, surface] of this.surfaces.entries()) {
      const readTextureId = this.frameReadTextures.get(name) ?? surface.read;
      const tex = this.backend.textures.get(readTextureId);
      if (tex) {
        surfaceMap[name] = tex;
        oldSurfaceKeys.push(name);
      }
      const writeTarget = this.frameWriteTextures.get(name) ?? surface.write;
      writeSurfaceMap[name] = writeTarget;
      oldWriteSurfaceKeys.push(name);
    }
    state.frameIndex = this.frameIndex;
    state.time = this.lastTime;
    state.globalUniforms = this.globalUniforms;
    state.graph = this.graph;
    state.screenWidth = this.width;
    state.screenHeight = this.height;
    return state;
  }
  /**
   * Get the output texture for a surface
   * @param {string} surfaceName - Surface name (defaults to graph.renderSurface)
   */
  getOutput(surfaceName) {
    const name = surfaceName || this.graph?.renderSurface;
    if (!name) return null;
    const surface = this.surfaces.get(name);
    if (!surface) return null;
    return this.backend.textures.get(surface.read);
  }
  /**
   * Clear a surface to transparent black.
   * Used to clear surfaces when chains are deleted.
   * @param {string} surfaceName - Surface name (e.g., 'o0', 'o1')
   */
  clearSurface(surfaceName) {
    if (!surfaceName) return;
    const surface = this.surfaces.get(surfaceName);
    if (!surface) return;
    if (this.backend.clearTexture) {
      this.backend.clearTexture(surface.read);
      this.backend.clearTexture(surface.write);
    }
  }
  /**
   * Update frame-local surface bindings after a pass writes to a global surface.
   * This implements within-frame ping-pong: after a pass writes to a surface,
   * subsequent passes will read from that write buffer, and write to the other buffer.
   */
  updateFrameSurfaceBindings(pass, state) {
    if (!pass.outputs) return;
    for (const outputName of Object.values(pass.outputs)) {
      if (typeof outputName !== "string") continue;
      const surfaceName = this.parseGlobalName(outputName);
      if (surfaceName) {
        if (!this.frameReadTextures || !this.frameWriteTextures) continue;
        const writeId = state.writeSurfaces?.[surfaceName];
        if (!writeId) continue;
        const currentReadId = this.frameReadTextures.get(surfaceName);
        this.frameReadTextures.set(surfaceName, writeId);
        if (currentReadId) {
          this.frameWriteTextures.set(surfaceName, currentReadId);
        }
      }
    }
  }
  /**
   * Dispose of all pipeline resources
   */
  dispose() {
    for (const cancel of this._asyncRenders.values()) {
      cancel();
    }
    this._asyncRenders.clear();
    if (this.backend?.textures) {
      for (const texId of Array.from(this.backend.textures.keys())) {
        this.backend.destroyTexture(texId);
      }
    }
    this.surfaces.clear();
    if (this.backend && typeof this.backend.destroy === "function") {
      this.backend.destroy({ skipTextures: true });
    }
    this.graph = null;
    this.frameReadTextures = null;
    this.globalUniforms = {};
  }
};
async function createPipeline(graph, options = {}) {
  let backend;
  if (options.preferWebGPU && await WebGPUBackend.isAvailable()) {
    const adapter = await navigator.gpu.requestAdapter();
    const requiredFeatures = [];
    if (adapter.features.has("float32-filterable")) {
      requiredFeatures.push("float32-filterable");
    }
    const device = await adapter.requestDevice({
      requiredFeatures,
      requiredLimits: {
        maxColorAttachmentBytesPerSample: Math.min(
          adapter.limits.maxColorAttachmentBytesPerSample,
          128
          // Request up to 128 bytes for flexibility
        )
      }
    });
    let context = null;
    if (options.canvas) {
      context = options.canvas.getContext("webgpu");
      if (context) {
        context.configure({
          device,
          format: navigator.gpu.getPreferredCanvasFormat(),
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
          alphaMode: "premultiplied"
        });
      }
    }
    backend = new WebGPUBackend(device, context);
  } else if (options.canvas) {
    const gl = options.canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (!gl) {
      throw new Error("WebGL2 not available");
    }
    backend = new WebGL2Backend(gl, options.canvas);
  } else {
    throw new Error("No backend available or canvas not provided");
  }
  const pipeline = new Pipeline(graph, backend);
  await pipeline.init(options.width || 800, options.height || 600);
  return pipeline;
}

// shaders/src/runtime/external-input.js
var MidiChannelState = class {
  constructor() {
    this.key = 0;
    this.velocity = 0;
    this.gate = 0;
    this.time = 0;
    this.keys = new Uint8Array(128);
  }
  /**
   * Handle a note-on event.
   * @param {number} key - MIDI note number (0-127)
   * @param {number} velocity - Note velocity (0-127)
   */
  noteOn(key, velocity) {
    this.key = key;
    this.velocity = velocity;
    this.gate = 1;
    this.time = Date.now();
    this.keys[key] = velocity;
  }
  /**
   * Handle a note-off event.
   * Preserves the last key and velocity for reference.
   * @param {number} [key] - MIDI note number to clear (optional)
   */
  noteOff(key) {
    this.gate = 0;
    if (key !== void 0) {
      this.keys[key] = 0;
    }
  }
  /**
   * Reset the channel state.
   */
  reset() {
    this.key = 0;
    this.velocity = 0;
    this.gate = 0;
    this.time = 0;
    this.keys.fill(0);
  }
};
var MidiState = class {
  constructor() {
    this.channels = {};
    for (let i = 1; i <= 16; i++) {
      this.channels[i] = new MidiChannelState();
    }
    this.clockCount = 0;
    this.noteGrid = new Float32Array(128 * 16 * 4);
  }
  /**
   * Get the state for a specific MIDI channel.
   * @param {number} n - Channel number (1-16)
   * @returns {MidiChannelState} The channel state
   */
  getChannel(n) {
    const channel = this.channels[n];
    if (channel) return channel;
    return this.channels[1];
  }
  /**
   * Process a raw MIDI message.
   * Parses the status byte and routes to appropriate channel.
   * @param {Uint8Array} data - Raw MIDI message data [status, key, velocity]
   */
  handleMessage(data) {
    if (!data || data.length < 1) return;
    const status = data[0];
    if (status === 248) {
      this.clockCount++;
      return;
    }
    if (data.length < 3) return;
    const key = data[1];
    const velocity = data[2];
    const channel = (status & 15) + 1;
    const messageType = status & 240;
    const channelState = this.getChannel(channel);
    if (messageType === 144 && velocity > 0) {
      channelState.noteOn(key, velocity);
    } else if (messageType === 128 || messageType === 144 && velocity === 0) {
      channelState.noteOff(key);
    }
  }
  /**
   * Pack all 128 keys x 16 channels into noteGrid Float32Array for GPU upload.
   * Layout: 128-wide x 16-tall RGBA texture.
   * R = velocity (0-1), G = gate (0 or 1), B = 0, A = 0.
   */
  updateNoteGrid() {
    for (let ch = 0; ch < 16; ch++) {
      const keys = this.channels[ch + 1].keys;
      const rowOffset = ch * 128 * 4;
      for (let k = 0; k < 128; k++) {
        const v = keys[k];
        const offset = rowOffset + k * 4;
        this.noteGrid[offset] = v > 0 ? v / 127 : 0;
        this.noteGrid[offset + 1] = v > 0 ? 1 : 0;
      }
    }
  }
  /**
   * Reset all channel states.
   */
  reset() {
    for (let i = 1; i <= 16; i++) {
      this.channels[i].reset();
    }
    this.clockCount = 0;
    this.noteGrid.fill(0);
  }
};
function _avgBins(buf, from, to) {
  const end = Math.min(to, buf.length);
  if (end <= from) return 0;
  let sum = 0;
  for (let i = from; i < end; i++) sum += buf[i];
  return sum / (end - from) / 255;
}
var AudioState = class {
  constructor() {
    this.low = 0;
    this.mid = 0;
    this.high = 0;
    this.vol = 0;
    this.fft = new Float32Array(16);
    this.spectrum = new Float32Array(128);
    this.waveform = new Float32Array(128);
    this.waveform.fill(0.5);
    this._smoothingBuffers = {
      low: [],
      mid: [],
      high: []
    };
    this._maxBufferLength = 5;
  }
  /**
   * Update audio state from a Web Audio AnalyserNode.
   * Extracts frequency bands and calculates overall volume.
   *
   * @param {AnalyserNode} analyser - Web Audio AnalyserNode
   * @param {number} [smoothing=5] - Number of frames to average (1-10)
   */
  updateFromAnalyser(analyser, smoothing = 5) {
    if (!analyser) return;
    this._maxBufferLength = Math.max(1, Math.min(10, smoothing));
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buf);
    const rawLow = _avgBins(buf, 1, 2);
    const rawMid = _avgBins(buf, 2, 12);
    const rawHigh = _avgBins(buf, 12, 47);
    this.low = this._smooth("low", rawLow);
    this.mid = this._smooth("mid", rawMid);
    this.high = this._smooth("high", rawHigh);
    const step = Math.max(1, Math.floor(buf.length / 16));
    let sum = 0;
    for (let i = 0; i < 16; i++) {
      const v = buf[i * step] / 255;
      this.fft[i] = v;
      sum += v;
    }
    this.vol = sum / 16;
  }
  /**
   * Directly set frequency band values.
   * Useful for testing or non-Web Audio sources.
   *
   * @param {number} low - Low band level (0-1)
   * @param {number} mid - Mid band level (0-1)
   * @param {number} high - High band level (0-1)
   */
  setBands(low, mid, high) {
    this.low = Math.max(0, Math.min(1, low));
    this.mid = Math.max(0, Math.min(1, mid));
    this.high = Math.max(0, Math.min(1, high));
    this.vol = (this.low + this.mid + this.high) / 3;
  }
  /**
   * Set spectrum data from raw FFT frequency bytes.
   * @param {Uint8Array} frequencyData - Raw bytes from AnalyserNode.getByteFrequencyData() (0-255)
   */
  setSpectrum(frequencyData) {
    const len = Math.min(frequencyData.length, 128);
    for (let i = 0; i < len; i++) {
      this.spectrum[i] = frequencyData[i] / 255;
    }
  }
  /**
   * Set waveform data from raw time-domain bytes.
   * @param {Uint8Array} timeDomainData - Raw bytes from AnalyserNode.getByteTimeDomainData() (0-255, 128 = silence)
   */
  setWaveform(timeDomainData) {
    const len = Math.min(timeDomainData.length, 128);
    for (let i = 0; i < len; i++) {
      this.waveform[i] = timeDomainData[i] / 255;
    }
  }
  /**
   * Apply smoothing to a value using a rolling buffer.
   * @private
   */
  _smooth(band, value) {
    const buffer = this._smoothingBuffers[band];
    buffer.push(value);
    if (buffer.length > this._maxBufferLength) {
      buffer.shift();
    }
    return buffer.reduce((a, b) => a + b, 0) / buffer.length;
  }
  /**
   * Reset audio state to zero.
   */
  reset() {
    this.low = 0;
    this.mid = 0;
    this.high = 0;
    this.vol = 0;
    this.fft.fill(0);
    this.spectrum.fill(0);
    this.waveform.fill(0.5);
    this._smoothingBuffers.low = [];
    this._smoothingBuffers.mid = [];
    this._smoothingBuffers.high = [];
  }
};
var MidiInputManager = class _MidiInputManager {
  constructor(renderer) {
    this._renderer = renderer;
    this._midiState = null;
    this._midiAccess = null;
    this._enabled = false;
    this._onStatusChange = null;
  }
  /**
   * Check if Web MIDI API is available
   * @returns {boolean}
   */
  static isSupported() {
    return !!(typeof navigator !== "undefined" && navigator.requestMIDIAccess);
  }
  /**
   * Enable MIDI input
   * @returns {Promise<boolean>} Whether MIDI was successfully enabled
   */
  async enable() {
    if (this._enabled) return true;
    if (!_MidiInputManager.isSupported()) {
      console.warn("Web MIDI API not supported");
      this._notifyStatus("MIDI not supported");
      return false;
    }
    try {
      this._midiAccess = await navigator.requestMIDIAccess();
      this._midiState = this._renderer.setMidiState();
      for (const input of this._midiAccess.inputs.values()) {
        this._connectInput(input);
      }
      this._midiAccess.onstatechange = (event) => {
        if (event.port.type === "input") {
          if (event.port.state === "connected") {
            this._connectInput(event.port);
            this._notifyStatus(`MIDI connected: ${event.port.name}`);
          } else {
            this._notifyStatus(`MIDI disconnected: ${event.port.name}`);
          }
        }
      };
      this._enabled = true;
      const inputCount = this._midiAccess.inputs.size;
      this._notifyStatus(`MIDI enabled (${inputCount} device${inputCount !== 1 ? "s" : ""})`);
      return true;
    } catch (err) {
      console.error("MIDI access denied:", err);
      this._notifyStatus("MIDI access denied");
      return false;
    }
  }
  /**
   * Disable MIDI input
   */
  disable() {
    if (!this._enabled) return;
    if (this._midiAccess) {
      for (const input of this._midiAccess.inputs.values()) {
        input.onmidimessage = null;
      }
      this._midiAccess.onstatechange = null;
    }
    this._enabled = false;
    this._notifyStatus("MIDI disabled");
  }
  /**
   * Toggle MIDI input
   * @returns {Promise<boolean>} New enabled state
   */
  async toggle() {
    if (this._enabled) {
      this.disable();
      return false;
    } else {
      return await this.enable();
    }
  }
  /**
   * Check if MIDI is currently enabled
   * @returns {boolean}
   */
  get enabled() {
    return this._enabled;
  }
  /**
   * Set status change callback
   * @param {function(string)} callback
   */
  onStatusChange(callback) {
    this._onStatusChange = callback;
  }
  _connectInput(input) {
    input.onmidimessage = (event) => this._handleMidiMessage(event);
    if (input.connection !== "open") input.open();
  }
  _handleMidiMessage(event) {
    if (!this._midiState) return;
    this._midiState.handleMessage(event.data);
  }
  _notifyStatus(message) {
    if (this._onStatusChange) {
      this._onStatusChange(message);
    }
  }
};
var AudioInputManager = class _AudioInputManager {
  constructor(renderer) {
    this._renderer = renderer;
    this._audioState = null;
    this._audioContext = null;
    this._analyser = null;
    this._source = null;
    this._stream = null;
    this._fftData = null;
    this._animationId = null;
    this._enabled = false;
    this._onStatusChange = null;
    this._smoothing = 0.8;
  }
  /**
   * Check if Web Audio API with microphone is available
   * @returns {boolean}
   */
  static isSupported() {
    return !!(typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof AudioContext !== "undefined");
  }
  /**
   * Enable audio input (requests microphone permission)
   * @returns {Promise<boolean>} Whether audio was successfully enabled
   */
  async enable() {
    if (this._enabled) return true;
    if (!_AudioInputManager.isSupported()) {
      console.warn("Web Audio API or getUserMedia not supported");
      this._notifyStatus("Audio input not supported");
      return false;
    }
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      this._audioContext = new AudioContext();
      this._analyser = this._audioContext.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyser.smoothingTimeConstant = this._smoothing;
      this._source = this._audioContext.createMediaStreamSource(this._stream);
      this._source.connect(this._analyser);
      this._fftData = new Uint8Array(this._analyser.frequencyBinCount);
      this._timeDomainData = new Uint8Array(this._analyser.fftSize);
      this._audioState = this._renderer.setAudioState();
      this._enabled = true;
      this._updateLoop();
      this._notifyStatus("Audio input enabled");
      return true;
    } catch (err) {
      console.error("Audio access denied:", err);
      this._notifyStatus("Audio access denied");
      return false;
    }
  }
  /**
   * Disable audio input
   */
  disable() {
    if (!this._enabled) return;
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    if (this._source) {
      this._source.disconnect();
      this._source = null;
    }
    if (this._stream) {
      this._stream.getTracks().forEach((track) => track.stop());
      this._stream = null;
    }
    if (this._audioContext) {
      this._audioContext.close();
      this._audioContext = null;
    }
    this._analyser = null;
    this._fftData = null;
    this._timeDomainData = null;
    this._enabled = false;
    if (this._audioState) {
      this._audioState.low = 0;
      this._audioState.mid = 0;
      this._audioState.high = 0;
      this._audioState.vol = 0;
      this._audioState.spectrum.fill(0);
      this._audioState.waveform.fill(0.5);
    }
    this._notifyStatus("Audio input disabled");
  }
  /**
   * Toggle audio input
   * @returns {Promise<boolean>} New enabled state
   */
  async toggle() {
    if (this._enabled) {
      this.disable();
      return false;
    } else {
      return await this.enable();
    }
  }
  /**
   * Check if audio is currently enabled
   * @returns {boolean}
   */
  get enabled() {
    return this._enabled;
  }
  /**
   * Set smoothing factor (0-1)
   * @param {number} value
   */
  set smoothing(value) {
    this._smoothing = Math.max(0, Math.min(1, value));
    if (this._analyser) {
      this._analyser.smoothingTimeConstant = this._smoothing;
    }
  }
  /**
   * Set status change callback
   * @param {function(string)} callback
   */
  onStatusChange(callback) {
    this._onStatusChange = callback;
  }
  _updateLoop() {
    if (!this._enabled) return;
    this._analyser.getByteFrequencyData(this._fftData);
    this._audioState.setSpectrum(this._fftData);
    this._analyser.getByteTimeDomainData(this._timeDomainData);
    this._audioState.setWaveform(this._timeDomainData);
    const low = (this._fftData[0] + this._fftData[1] + this._fftData[2] + this._fftData[3]) / 4 / 255;
    const mid = (this._fftData[4] + this._fftData[6] + this._fftData[8] + this._fftData[10]) / 4 / 255;
    const high = (this._fftData[16] + this._fftData[20] + this._fftData[24] + this._fftData[28]) / 4 / 255;
    const vol = (low + mid + high) / 3;
    this._audioState.low = low;
    this._audioState.mid = mid;
    this._audioState.high = high;
    this._audioState.vol = vol;
    this._animationId = requestAnimationFrame(() => this._updateLoop());
  }
  _notifyStatus(message) {
    if (this._onStatusChange) {
      this._onStatusChange(message);
    }
  }
};
var ExternalInputManager = class {
  constructor(renderer) {
    this.midi = new MidiInputManager(renderer);
    this.audio = new AudioInputManager(renderer);
  }
  /**
   * Set status change callback for both managers
   * @param {function(string)} callback
   */
  onStatusChange(callback) {
    this.midi.onStatusChange(callback);
    this.audio.onStatusChange(callback);
  }
};

// shaders/src/runtime/compiler.js
function compileGraph(source, options = {}) {
  const compilationResult = compile(source);
  if (compilationResult.diagnostics?.length > 0) {
    const warnings = compilationResult.diagnostics.filter((d) => d.severity === "warning");
    for (const w of warnings) {
      console.warn(`[noisemaker] ${w.code}: ${w.message}`);
    }
    const errors = compilationResult.diagnostics.filter((d) => d.severity === "error");
    if (errors.length > 0) {
      throw {
        code: "ERR_COMPILATION_FAILED",
        diagnostics: compilationResult.diagnostics
      };
    }
  }
  const { passes, errors: expandErrors, programs, textureSpecs, renderSurface } = expand(
    compilationResult,
    { shaderOverrides: options.shaderOverrides }
  );
  if (expandErrors?.length > 0) {
    throw {
      code: "ERR_EXPANSION_FAILED",
      errors: expandErrors
    };
  }
  const allocations = allocateResources(passes);
  const graph = {
    id: hashSource(source),
    source,
    passes,
    programs,
    allocations,
    textures: extractTextureSpecs(passes, options, textureSpecs),
    renderSurface,
    // Which surface to present to screen (e.g., 'o0', 'o2')
    compiledAt: Date.now()
  };
  return graph;
}
async function createRuntime(source, options = {}) {
  const graph = compileGraph(source, options);
  const pipeline = await createPipeline(graph, options);
  return pipeline;
}
function extractTextureSpecs(passes, options, textureSpecs = {}) {
  const textures = /* @__PURE__ */ new Map();
  for (const [texId, effectSpec] of Object.entries(textureSpecs)) {
    const spec = {
      // Preserve original dimension specs - use 'screen' as default for dynamic resizing
      width: effectSpec.width || "screen",
      height: effectSpec.height || "screen",
      format: effectSpec.format || "rgba16f",
      // copyDst is required so the chain-handoff path can target this texture
      // via copyTextureToTexture, and so updateTextureFromSource /
      // copyExternalImageToTexture can write into it without Dawn rejecting
      // with "Destination texture needs to have CopyDst usage".
      usage: ["render", "sample", "copySrc", "copyDst"]
    };
    if (effectSpec.is3D) {
      spec.depth = effectSpec.depth || effectSpec.width || 64;
      spec.is3D = true;
      spec.usage = ["storage", "sample", "copySrc", "copyDst"];
    }
    textures.set(texId, spec);
  }
  for (const pass of passes) {
    if (pass.outputs) {
      for (const texId of Object.values(pass.outputs)) {
        if (texId.startsWith("global_")) continue;
        if (textures.has(texId)) continue;
        textures.set(texId, {
          width: "screen",
          height: "screen",
          format: "rgba16f",
          usage: ["render", "sample", "copySrc", "copyDst"]
        });
      }
    }
  }
  return textures;
}
function hashSource(source) {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
function formatError(err) {
  if (err.code === "ERR_COMPILATION_FAILED" && Array.isArray(err.diagnostics)) {
    return err.diagnostics.filter((d) => d.severity === "error").map((d) => {
      let msg = d.message || "Unknown error";
      if (d.location) msg += ` (line ${d.location.line}, col ${d.location.column})`;
      return msg;
    }).join("; ") || "Unknown compilation error";
  }
  if (err.code === "ERR_EXPANSION_FAILED" && Array.isArray(err.errors)) {
    return err.errors.map((e) => e.message || String(e)).join("; ");
  }
  if (err.code === "ERR_SHADER_COMPILE") {
    return err.detail || "Shader compile error";
  }
  return err.message || err.detail || (typeof err === "object" ? JSON.stringify(err) : String(err));
}
function recompile(pipeline, newSource, options = {}) {
  try {
    const newGraph = compileGraph(newSource, {
      width: pipeline.width,
      height: pipeline.height,
      shaderOverrides: options.shaderOverrides
    });
    pipeline.graph = newGraph;
    pipeline.createSurfaces();
    const defaultUniforms = pipeline.collectDefaultUniforms();
    pipeline.recreateTextures(defaultUniforms);
    return newGraph;
  } catch (error) {
    console.error("Recompilation failed:", formatError(error));
    return null;
  }
}

// shaders/src/renderer/canvas.js
function isAutomationControlled(value) {
  if (!value || typeof value !== "object") return false;
  if (value._varRef) return true;
  const type = value.type || value._ast?.type;
  return type === "Oscillator" || type === "Midi" || type === "Audio";
}
var KNOWN_3D_GENERATORS = ["noise3d", "cell3d", "shape3d", "fractal3d", "flythrough3d", "cellularAutomata3d", "reactionDiffusion3d"];
var KNOWN_3D_PROCESSORS = ["flow3d", "palette3d", "render3d", "renderLit3d", "renderCubemap3d", "renderCubemapSurface"];
function cloneParamValue(value) {
  if (Array.isArray(value)) {
    return value.slice();
  }
  if (value && typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return value;
    }
  }
  return value;
}
function isValidIdentifier(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}
function sanitizeEnumName(name) {
  let result = name.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/\s+/g, "");
  result = result.replace(/[^a-zA-Z0-9_]/g, "");
  if (!isValidIdentifier(result)) {
    return null;
  }
  return result;
}
function hasTexSurfaceParam(effect) {
  const texSpec = effect?.instance?.globals?.tex;
  return texSpec?.type === "surface";
}
function needsInputTex3d(effect) {
  if (!effect?.instance) return false;
  const passes = effect.instance.passes || [];
  return passes.some(
    (pass) => pass.inputs && Object.values(pass.inputs).includes("inputTex3d")
  );
}
function is3dGenerator(effect) {
  if (!effect || !effect.instance) return false;
  const func = effect.instance.func;
  return effect.instance.outputTex3d && KNOWN_3D_GENERATORS.includes(func);
}
function is3dProcessor(effect) {
  if (!effect || !effect.instance) return false;
  const func = effect.instance.func;
  return effect.instance.outputTex3d && KNOWN_3D_PROCESSORS.includes(func);
}
function hasExplicitTexParam(effect) {
  const texSpec = effect?.instance?.globals?.tex;
  return texSpec?.type === "surface" && texSpec.default !== "inputTex";
}
function getVolGeoParams(effect) {
  if (!effect?.instance?.globals) {
    return { volParam: null, geoParam: null };
  }
  let volParam = null;
  let geoParam = null;
  for (const [key, spec] of Object.entries(effect.instance.globals)) {
    if (spec.type === "volume" && !volParam) {
      volParam = key;
    }
    if (spec.type === "geometry" && !geoParam) {
      geoParam = key;
    }
  }
  return { volParam, geoParam };
}
function isStarterEffect(effect) {
  if (!effect.instance) return false;
  const passes = effect.instance.passes || [];
  if (passes.length === 0) return true;
  const pipelineInputs = /* @__PURE__ */ new Set([
    "inputTex",
    "inputTex3d",
    "o0",
    "o1",
    "o2",
    "o3",
    "o4",
    "o5",
    "o6",
    "o7"
  ]);
  return !passes.some(
    (pass) => pass.inputs && Object.values(pass.inputs).some((val) => pipelineInputs.has(val))
  );
}
var CanvasRenderer = class {
  /**
   * Create a new CanvasRenderer
   * @param {object} options - Configuration options
   * @param {HTMLCanvasElement} options.canvas - Target canvas element
   * @param {HTMLElement} [options.canvasContainer] - Container element for canvas reset
   * @param {number} [options.width=1024] - Render width
   * @param {number} [options.height=1024] - Render height
   * @param {string} [options.basePath='../../shaders'] - Base path for shader assets
   * @param {boolean} [options.preferWebGPU=false] - Use WebGPU backend
   * @param {boolean} [options.useBundles=false] - Load effects from pre-built bundles
   * @param {string} [options.bundlePath='../../dist/effects'] - Base path for effect bundles
   * @param {function} [options.onFrame] - Callback after each frame (receives frameCount)
   * @param {function} [options.onFPS] - Callback when FPS updates (receives fps value)
   * @param {function} [options.onError] - Callback on render error
   * @param {function} [options.onLoadingStart] - Callback when loading starts
   * @param {function} [options.onLoadingProgress] - Callback for loading progress
   * @param {function} [options.onLoadingEnd] - Callback when loading ends
   * @param {function} [options.onContextLost] - Callback when WebGL context is lost
   * @param {function} [options.onContextRestored] - Callback when WebGL context is restored and pipeline rebuilt
   */
  constructor(options = {}) {
    this._canvas = options.canvas;
    this._canvasContainer = options.canvasContainer || null;
    this._width = options.width || 1024;
    this._height = options.height || 1024;
    this._basePath = options.basePath || "../../shaders";
    this._preferWebGPU = options.preferWebGPU || false;
    this._useBundles = options.useBundles || false;
    this._bundlePath = options.bundlePath || "../../dist/effects";
    this._onFrame = options.onFrame || null;
    this._onFPS = options.onFPS || null;
    this._onError = options.onError || null;
    this._onLoadingStart = options.onLoadingStart || null;
    this._onLoadingProgress = options.onLoadingProgress || null;
    this._onLoadingEnd = options.onLoadingEnd || null;
    this._onContextLost = options.onContextLost || null;
    this._onContextRestored = options.onContextRestored || null;
    this._pipeline = null;
    this._currentDsl = "";
    this._currentEffect = null;
    this._uniformBindings = /* @__PURE__ */ new Map();
    this._animationFrameId = null;
    this._loopDuration = 10;
    this._lastFrameTime = performance.now();
    this._loopStartTime = performance.now();
    this._isRunning = false;
    this._frameCount = 0;
    this._fpsFrameCount = 0;
    this._fpsLastUpdateTime = performance.now();
    this._currentFPS = 0;
    this._frameTimeBufferSize = 120;
    this._frameTimeBuffer = new Float32Array(this._frameTimeBufferSize);
    this._frameTimeIndex = 0;
    this._frameTimeCount = 0;
    this._lastRenderTime = 0;
    this._lastPassCount = 0;
    this._manifest = {};
    this._loadedEffects = /* @__PURE__ */ new Map();
    this._effectLoadingPromises = /* @__PURE__ */ new Map();
    this._locale = null;
    this._strings = {};
    this._enums = {};
    this._midiState = null;
    this._audioState = null;
    this._meshCache = /* @__PURE__ */ new Map();
    this._boundRenderLoop = this._renderLoop.bind(this);
    this._isContextLost = false;
    this._wasRunningBeforeContextLoss = false;
    this._setupCanvasObserver();
    this._setupContextLossHandlers();
  }
  /**
   * Set up observation of canvas dimension changes.
   * Intercepts canvas.width and canvas.height setters to detect resizing.
   * @private
   */
  _setupCanvasObserver() {
    if (!this._canvas) return;
    const self = this;
    const canvas = this._canvas;
    const widthDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "width");
    const heightDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "height");
    let resizeScheduled = false;
    function scheduleResize() {
      if (resizeScheduled) return;
      resizeScheduled = true;
      queueMicrotask(() => {
        resizeScheduled = false;
        self._onCanvasDimensionsChanged();
      });
    }
    function interceptDimension(prop, desc) {
      Object.defineProperty(canvas, prop, {
        get() {
          return desc.get.call(this);
        },
        set(value) {
          const old = desc.get.call(this);
          desc.set.call(this, value);
          if (desc.get.call(this) !== old) {
            scheduleResize();
          }
        },
        configurable: true,
        enumerable: true
      });
    }
    interceptDimension("width", widthDesc);
    interceptDimension("height", heightDesc);
  }
  /**
   * Called when canvas dimensions change.
   * Updates the pipeline to match new dimensions.
   * @private
   */
  _onCanvasDimensionsChanged() {
    const newWidth = this._canvas.width;
    const newHeight = this._canvas.height;
    if (newWidth !== this._width || newHeight !== this._height) {
      this.resize(newWidth, newHeight);
    }
  }
  /**
   * Set up WebGL context loss and restore event handlers.
   * On context loss: stops the render loop and notifies the host.
   * On context restore: recompiles the current DSL and resumes rendering.
   * @private
   */
  _setupContextLossHandlers() {
    if (!this._canvas) return;
    this._boundContextLost = (e) => {
      e.preventDefault();
      this._isContextLost = true;
      this._wasRunningBeforeContextLoss = this._isRunning;
      if (this._pipeline?.backend) {
        this._pipeline.backend.isContextLost = true;
      }
      this.stop();
      console.warn("[Canvas] WebGL context lost");
      if (this._onContextLost) {
        this._onContextLost();
      }
    };
    this._boundContextRestored = async () => {
      console.log("[Canvas] WebGL context restored, rebuilding pipeline...");
      this._pipeline = null;
      this._uniformBindings = /* @__PURE__ */ new Map();
      this._isContextLost = false;
      if (this._currentDsl) {
        try {
          await this.compile(this._currentDsl);
          await this._reuploadCachedMeshes();
          if (this._wasRunningBeforeContextLoss) {
            this.start();
          }
          console.log("[Canvas] Pipeline rebuilt successfully after context restore");
        } catch (err) {
          console.error(`[Canvas] Failed to rebuild pipeline after context restore: ${err.detail || err.message || JSON.stringify(err)}`);
          if (this._onError) {
            this._onError(err);
          }
        }
      }
      if (this._onContextRestored) {
        this._onContextRestored();
      }
    };
    this._canvas.addEventListener("webglcontextlost", this._boundContextLost);
    this._canvas.addEventListener("webglcontextrestored", this._boundContextRestored);
  }
  /**
   * Remove WebGL context loss/restore event handlers.
   * @private
   */
  _removeContextLossHandlers() {
    if (!this._canvas) return;
    if (this._boundContextLost) {
      this._canvas.removeEventListener("webglcontextlost", this._boundContextLost);
    }
    if (this._boundContextRestored) {
      this._canvas.removeEventListener("webglcontextrestored", this._boundContextRestored);
    }
  }
  // =========================================================================
  // Public Getters
  // =========================================================================
  /** @returns {boolean} Whether the WebGL context is currently lost */
  get isContextLost() {
    return this._isContextLost;
  }
  /** @returns {string} Current backend ('glsl' or 'wgsl') */
  get backend() {
    return this._preferWebGPU ? "wgsl" : "glsl";
  }
  /** @returns {object|null} Current pipeline object */
  get pipeline() {
    return this._pipeline;
  }
  /** @returns {number} Total frames rendered */
  get frameCount() {
    return this._frameCount;
  }
  /** @returns {number} Current measured FPS */
  get currentFPS() {
    return this._currentFPS;
  }
  /** @returns {boolean} Whether render loop is running */
  get isRunning() {
    return this._isRunning;
  }
  /** @returns {number} Loop duration in seconds */
  get loopDuration() {
    return this._loopDuration;
  }
  /** @returns {number} Last frame render time in ms */
  get lastRenderTime() {
    return this._lastRenderTime;
  }
  /** @returns {number} Number of render passes in last frame */
  get lastPassCount() {
    return this._lastPassCount;
  }
  /**
   * Get frame time statistics for jitter measurement
   * @returns {{mean: number, std: number, min: number, max: number, count: number}}
   */
  getFrameTimeStats() {
    if (this._frameTimeCount === 0) {
      return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
    }
    const count = this._frameTimeCount;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < count; i++) {
      const t = this._frameTimeBuffer[i];
      sum += t;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    const mean = sum / count;
    let sumSq = 0;
    for (let i = 0; i < count; i++) {
      const diff = this._frameTimeBuffer[i] - mean;
      sumSq += diff * diff;
    }
    const std = Math.sqrt(sumSq / count);
    return { mean, std, min, max, count };
  }
  /**
   * Reset frame time tracking buffer
   */
  resetFrameTimeStats() {
    this._frameTimeIndex = 0;
    this._frameTimeCount = 0;
    this._lastRenderTime = 0;
  }
  /** @returns {string} Current DSL source */
  get currentDsl() {
    return this._currentDsl;
  }
  /** @returns {object|null} Current effect object */
  get currentEffect() {
    return this._currentEffect;
  }
  /** @returns {object} Shader manifest */
  get manifest() {
    return this._manifest;
  }
  /** @returns {Map} Loaded effects cache */
  get loadedEffects() {
    return this._loadedEffects;
  }
  /** @returns {object} Enum registry */
  get enums() {
    return this._enums;
  }
  /** @returns {HTMLCanvasElement} Canvas element */
  get canvas() {
    return this._canvas;
  }
  /** @returns {boolean} Whether using bundle mode */
  get useBundles() {
    return this._useBundles;
  }
  /** @returns {string} Bundle path */
  get bundlePath() {
    return this._bundlePath;
  }
  /**
   * Get the last normalized time value rendered by the pipeline.
   * @returns {number} Normalized time (0-1)
   */
  get lastTime() {
    return this._pipeline?.lastTime || 0;
  }
  /**
   * Get device capabilities from the current pipeline.
   * Returns default capabilities if no pipeline is active.
   * @returns {{isMobile: boolean, floatBlend: boolean, floatLinear: boolean, colorBufferFloat: boolean, maxDrawBuffers: number, maxTextureSize: number, maxStateSize: number}}
   */
  get capabilities() {
    return this._pipeline?.getCapabilities() || {
      isMobile: false,
      floatBlend: true,
      floatLinear: true,
      colorBufferFloat: true,
      maxDrawBuffers: 8,
      maxTextureSize: 4096,
      maxStateSize: 2048
    };
  }
  // =========================================================================
  // Public Setters
  // =========================================================================
  /** @param {object|null} effect - Set current effect */
  set currentEffect(effect) {
    this._currentEffect = effect;
  }
  /** @param {string} dsl - Set current DSL */
  set currentDsl(dsl) {
    this._currentDsl = dsl;
  }
  // =========================================================================
  // Configuration
  // =========================================================================
  /**
   * Set loop duration
   * @param {number} duration - Duration in seconds
   */
  setLoopDuration(duration) {
    this._loopDuration = duration;
    this._loopStartTime = performance.now();
  }
  /**
   * Set a uniform value across all passes
   * @param {string} name - Uniform name
   * @param {*} value - Uniform value
   */
  setUniform(name, value) {
    if (this._pipeline && this._pipeline.setUniform) {
      this._pipeline.setUniform(name, value);
    }
  }
  /**
   * Set tile region for tiled large-resolution rendering.
   * @param {{offset: number[], fullResolution: number[]}} region
   */
  setTileRegion(region) {
    if (this._pipeline) this._pipeline.setTileRegion(region);
  }
  /**
   * Clear tile region, returning to normal rendering.
   */
  clearTileRegion() {
    if (this._pipeline) this._pipeline.clearTileRegion();
  }
  /**
   * Render the active effect into 6 cubemap faces. See Pipeline.renderCubemap.
   * The returned array is reused on each call — copy the faces if retaining.
   * @returns {Promise<Array<{width,height,data}>>} reused buffer — copy if retaining
   */
  renderCubemap(config) {
    if (this._pipeline) return this._pipeline.renderCubemap(config);
    return Promise.resolve([]);
  }
  /**
   * Resize the renderer
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this._width = width;
    this._height = height;
    if (this._pipeline && this._pipeline.resize) {
      this._pipeline.resize(width, height);
    }
  }
  /**
   * Set the MIDI state for midi() function resolution.
   * Creates a new MidiState if not provided.
   * @param {MidiState} [midiState] - MidiState instance (creates new if not provided)
   * @returns {MidiState} The MIDI state instance
   */
  setMidiState(midiState) {
    this._midiState = midiState || new MidiState();
    if (this._pipeline) {
      this._pipeline.setMidiState(this._midiState);
    }
    return this._midiState;
  }
  /**
   * Get the current MIDI state
   * @returns {MidiState|null}
   */
  get midiState() {
    return this._midiState;
  }
  /**
   * Set the audio state for audio() function resolution.
   * Creates a new AudioState if not provided.
   * @param {AudioState} [audioState] - AudioState instance (creates new if not provided)
   * @returns {AudioState} The audio state instance
   */
  setAudioState(audioState) {
    this._audioState = audioState || new AudioState();
    if (this._pipeline) {
      this._pipeline.setAudioState(this._audioState);
    }
    return this._audioState;
  }
  /**
   * Get the current audio state
   * @returns {AudioState|null}
   */
  get audioState() {
    return this._audioState;
  }
  // =========================================================================
  // Render Loop
  // =========================================================================
  /**
   * Start the animation loop
   */
  start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this._lastFrameTime = performance.now();
    this._animationFrameId = requestAnimationFrame(this._boundRenderLoop);
  }
  /**
   * Stop the animation loop
   */
  stop() {
    this._isRunning = false;
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }
  /**
   * Sync the pipeline's internal time reference.
   * Call this when pausing to ensure subsequent paused renders have deltaTime = 0.
   * @param {number} normalizedTime - The normalized time value (0-1) to sync to
   */
  syncTime(normalizedTime) {
    if (this._pipeline) {
      this._pipeline.syncTime(normalizedTime);
    }
  }
  /**
   * Render a single frame at a specific time
   * @param {number} normalizedTime - Time value 0-1
   */
  render(normalizedTime) {
    if (this._pipeline && !this._isContextLost) {
      try {
        this._pipeline.render(normalizedTime);
        this._lastPassCount = this._pipeline.lastPassCount;
        this._frameCount++;
      } catch (err) {
        console.error("Render error:", err);
        if (this._onError) {
          this._onError(err);
        }
      }
    }
  }
  /** @private Main render loop */
  _renderLoop(time) {
    if (!this._isRunning) return;
    this._animationFrameId = requestAnimationFrame(this._boundRenderLoop);
    if (this._pipeline) {
      try {
        const renderStart = performance.now();
        const elapsedSeconds = (time - this._loopStartTime) / 1e3;
        const normalizedTime = elapsedSeconds % this._loopDuration / this._loopDuration;
        this._pipeline.render(normalizedTime);
        const renderEnd = performance.now();
        const frameTime = renderEnd - renderStart;
        this._frameTimeBuffer[this._frameTimeIndex] = frameTime;
        this._frameTimeIndex = (this._frameTimeIndex + 1) % this._frameTimeBufferSize;
        if (this._frameTimeCount < this._frameTimeBufferSize) {
          this._frameTimeCount++;
        }
        this._lastRenderTime = frameTime;
        this._lastPassCount = this._pipeline.lastPassCount;
        this._frameCount++;
        if (this._onFrame) {
          this._onFrame(this._frameCount);
        }
      } catch (err) {
        console.error("Render loop error:", err);
        if (this._onError) {
          this._onError(err);
        }
      }
    }
    this._fpsFrameCount++;
    const fpsElapsed = time - this._fpsLastUpdateTime;
    if (fpsElapsed >= 1e3) {
      this._currentFPS = Math.round(this._fpsFrameCount * 1e3 / fpsElapsed);
      this._fpsFrameCount = 0;
      this._fpsLastUpdateTime = time;
      if (this._onFPS) {
        this._onFPS(this._currentFPS);
      }
    }
    this._lastFrameTime = time;
  }
  // =========================================================================
  // Pipeline Lifecycle
  // =========================================================================
  /**
   * Reset the canvas element (for backend switching)
   */
  resetCanvas() {
    if (!this._canvasContainer || !this._canvas) {
      return;
    }
    this._removeContextLossHandlers();
    const newCanvas = this._canvas.cloneNode(false);
    newCanvas.id = this._canvas.id;
    newCanvas.width = this._canvas.width;
    newCanvas.height = this._canvas.height;
    this._canvasContainer.replaceChild(newCanvas, this._canvas);
    this._canvas = newCanvas;
    this._isContextLost = false;
    this._setupContextLossHandlers();
  }
  /**
   * Dispose of the current pipeline
   * @param {object} [options] - Disposal options
   * @param {boolean} [options.loseContext=false] - Force context loss
   * @param {boolean} [options.resetCanvas=false] - Reset canvas element
   */
  async dispose(options = {}) {
    const { loseContext = false, resetCanvas = false } = options;
    if (!this._pipeline) {
      if (resetCanvas) {
        this.resetCanvas();
      }
      return;
    }
    const oldPipeline = this._pipeline;
    this._pipeline = null;
    this._uniformBindings = /* @__PURE__ */ new Map();
    try {
      oldPipeline.backend?.destroy?.({ loseContext });
    } catch (err) {
      console.warn("Failed to destroy pipeline backend", err);
    }
    if (resetCanvas) {
      this.resetCanvas();
    }
  }
  /**
   * Compile DSL and create pipeline
   * @param {string} dsl - DSL source code
   * @param {object} [options] - Compilation options
   * @param {object} [options.shaderOverrides] - Per-step shader overrides
   * @returns {Promise<object>} The created pipeline
   */
  async compile(dsl, options = {}) {
    const shaderOverrides = options.shaderOverrides;
    this._currentDsl = dsl;
    if (!this._pipeline) {
      this._pipeline = await createRuntime(dsl, {
        canvas: this._canvas,
        width: this._width,
        height: this._height,
        preferWebGPU: this._preferWebGPU,
        shaderOverrides
      });
      if (this._midiState) {
        this._pipeline.setMidiState(this._midiState);
      }
      if (this._audioState) {
        this._pipeline.setAudioState(this._audioState);
      }
    } else {
      this._pipeline.isCompiling = true;
      try {
        const newGraph = recompile(this._pipeline, dsl, { shaderOverrides });
        if (!newGraph) {
          this._pipeline.isCompiling = false;
          const previousPipeline = this._pipeline;
          this._pipeline = await createRuntime(dsl, {
            canvas: this._canvas,
            width: this._width,
            height: this._height,
            preferWebGPU: this._preferWebGPU,
            shaderOverrides
          });
          try {
            previousPipeline?.backend?.destroy?.();
          } catch (err) {
            console.warn("Failed to release previous pipeline backend", err);
          }
        } else {
          await this._pipeline.compilePrograms();
        }
      } catch (err) {
        if (this._pipeline) {
          this._pipeline.isCompiling = false;
        }
        throw err;
      }
    }
    this._frameCount = 0;
    this._uniformBindings = /* @__PURE__ */ new Map();
    await this._reuploadCachedMeshes();
    if (this._wasRunningBeforeContextLoss && !this._isRunning && !this._isContextLost) {
      this._wasRunningBeforeContextLoss = false;
      this.start();
    }
    return this._pipeline;
  }
  /**
   * Re-upload cached mesh data to the current backend.
   * Called after backend switch or pipeline recreation.
   * @private
   */
  async _reuploadCachedMeshes() {
    if (!this._pipeline?.backend || this._meshCache.size === 0) {
      return;
    }
    for (const [meshId, cached] of this._meshCache) {
      try {
        this._pipeline.backend.uploadMeshData(
          meshId,
          cached.positionData,
          cached.normalData,
          cached.uvData,
          cached.width,
          cached.height,
          cached.vertexCount
        );
      } catch (err) {
        console.warn(`[Canvas] Failed to re-upload mesh ${meshId}:`, err);
      }
    }
  }
  /**
   * Switch rendering backend
   * @param {string} backend - 'glsl' or 'wgsl'
   */
  async switchBackend(backend) {
    const preferWebGPU = backend === "wgsl";
    if (preferWebGPU === this._preferWebGPU) {
      return;
    }
    const previousBackend = this._preferWebGPU ? "wgsl" : "glsl";
    this._preferWebGPU = preferWebGPU;
    await this.dispose({
      loseContext: previousBackend === "glsl",
      resetCanvas: true
    });
  }
  // =========================================================================
  // Lazy Effect Loading
  // =========================================================================
  /**
   * Load the shader manifest
   * @returns {Promise<object>} The loaded manifest
   */
  async loadManifest() {
    try {
      const manifestRes = await fetch(`${this._basePath}/effects/manifest.json`);
      if (manifestRes.ok) {
        this._manifest = await manifestRes.json();
      }
    } catch (e) {
      console.warn("Failed to load shader manifest");
      throw new Error("Could not load shader manifest - lazy loading requires manifest.json");
    }
    const starterNames = [];
    for (const [effectId, entry] of Object.entries(this._manifest)) {
      if (entry.starter) {
        const parts = effectId.split("/");
        if (parts.length === 2) {
          starterNames.push(parts[1]);
          starterNames.push(`${parts[0]}.${parts[1]}`);
        }
      }
    }
    registerStarterOps(starterNames);
    this._enums = await mergeIntoEnums(stdEnums);
    return this._manifest;
  }
  /**
   * Initialize standard enums (call after loadManifest or standalone)
   */
  async initEnums() {
    this._enums = await mergeIntoEnums(stdEnums);
  }
  /**
   * Get effect names from manifest for a namespace
   * @param {string} namespace - Effect namespace
   * @returns {string[]} Effect names
   */
  getEffectsFromManifest(namespace, { includeHidden = false } = {}) {
    const prefix = `${namespace}/`;
    return Object.keys(this._manifest).filter((key) => key.startsWith(prefix) && (includeHidden || !this._manifest[key].hidden)).map((key) => key.slice(prefix.length)).sort();
  }
  /**
   * Get effect description (localized when a locale is set, else from manifest).
   * @param {string} effectId - Effect ID (namespace/name)
   * @returns {string|null} Description or null if not found
   */
  getEffectDescription(effectId) {
    const entry = this._manifest?.[effectId];
    return this.localize(`${effectId}#desc`, entry?.description ?? null);
  }
  /**
   * Set the active locale for effect-facing strings (display names,
   * descriptions, parameter labels, enum option labels). Opt-in: until this is
   * called, all strings stay English and no catalog is fetched. Lazily fetches
   * `${basePath}/effects/strings.<locale>.json` (plus the English base) and
   * caches it. Pass a falsy value to return to the default (English) behavior.
   * @param {string|null} locale
   * @returns {Promise<string|null>} the active locale
   */
  async setLocale(locale) {
    this._locale = locale || null;
    if (!this._locale) return this._locale;
    if (!this._strings.en) this._strings.en = await this._fetchStrings("en");
    if (this._locale !== "en" && !this._strings[this._locale]) {
      this._strings[this._locale] = await this._fetchStrings(this._locale);
    }
    return this._locale;
  }
  /** @returns {string|null} the active effect-string locale */
  getLocale() {
    return this._locale;
  }
  /**
   * Resolve an effect-string id to the active locale, falling back to the
   * English base catalog, then to `fallback`. With no locale set (the default)
   * this returns `fallback` unchanged, so existing callers get today's English.
   * @param {string} id - e.g. "filter/adjust", "filter/adjust#desc", "filter/adjust.rotation"
   * @param {string|null} [fallback]
   * @returns {string|null}
   */
  localize(id, fallback = null) {
    if (this._locale) {
      const hit = this._strings[this._locale]?.[id];
      if (hit) return hit;
      const base = this._strings.en?.[id];
      if (base) return base;
    }
    return fallback;
  }
  /**
   * Fetch a string catalog for a locale; returns {} on any failure so a
   * missing locale file degrades gracefully to English fallbacks.
   * @param {string} locale
   * @returns {Promise<object>}
   */
  async _fetchStrings(locale) {
    try {
      const res = await fetch(`${this._basePath}/effects/strings.${locale}.json`);
      if (res.ok) return await res.json();
    } catch {
    }
    return {};
  }
  /**
   * Load effect definition
   * @param {string} namespace - Effect namespace
   * @param {string} effectName - Effect name
   * @returns {Promise<object>} Effect object
   */
  async loadEffectDefinition(namespace, effectName) {
    const effectId = `${namespace}/${effectName}`;
    const basePath = `${this._basePath}/effects/${namespace}/${effectName}`;
    try {
      const module = await import(`${basePath}/definition.js`);
      const exported = module.default;
      if (!exported) {
        throw new Error(`No default export in ${effectId}/definition.js`);
      }
      const instance = typeof exported === "function" ? new exported() : exported;
      return { namespace, name: effectName, instance };
    } catch (err) {
      console.error(`Failed to load definition for ${effectId}:`, err);
      throw err;
    }
  }
  /**
   * Load effect shaders
   * @param {object} effect - Effect object
   * @returns {Promise<void>}
   */
  async loadEffectShaders(effect) {
    const { namespace, name: effectName, instance } = effect;
    const effectId = `${namespace}/${effectName}`;
    const basePath = `${this._basePath}/effects/${namespace}/${effectName}`;
    const effectManifest = this._manifest[effectId];
    if (!instance.passes || !effectManifest) return;
    if (!instance.shaders) instance.shaders = {};
    const shaderPromises = [];
    for (const pass of instance.passes) {
      if (!pass.program) continue;
      const prog = pass.program;
      const shaderBucket = instance.shaders[prog] ?? (instance.shaders[prog] = {});
      const glslInfo = effectManifest.glsl?.[prog];
      if (glslInfo === "combined") {
        shaderPromises.push(
          fetch(`${basePath}/glsl/${prog}.glsl`).then((res) => res.ok ? res.text() : null).then((text) => {
            if (text) shaderBucket.glsl = text;
          })
        );
      } else if (glslInfo) {
        if (glslInfo.v) {
          shaderPromises.push(
            fetch(`${basePath}/glsl/${prog}.vert`).then((res) => res.ok ? res.text() : null).then((text) => {
              if (text) shaderBucket.vertex = text;
            })
          );
        }
        if (glslInfo.f) {
          shaderPromises.push(
            fetch(`${basePath}/glsl/${prog}.frag`).then((res) => res.ok ? res.text() : null).then((text) => {
              if (text) shaderBucket.fragment = text;
            })
          );
        }
      }
      if (effectManifest.wgsl?.[prog]) {
        shaderPromises.push(
          fetch(`${basePath}/wgsl/${prog}.wgsl`).then((res) => res.ok ? res.text() : null).then((text) => {
            if (text) shaderBucket.wgsl = text;
          })
        );
      }
    }
    await Promise.all(shaderPromises);
  }
  /**
   * Register effect with the runtime
   * @param {object} effect - Effect object
   * @returns {object|null} Choices to register as enums
   */
  registerEffectWithRuntime(effect) {
    const { namespace, name: effectName, instance } = effect;
    registerEffect(instance.func, instance);
    registerEffect(`${namespace}.${instance.func}`, instance);
    registerEffect(`${namespace}/${effectName}`, instance);
    registerEffect(`${namespace}.${effectName}`, instance);
    if (instance.func) {
      const choicesToRegister = {};
      const args = Object.entries(instance.globals || {}).map(([key, spec]) => {
        let enumPath = spec.enum || spec.enumPath;
        if (spec.choices && !enumPath) {
          enumPath = `${namespace}.${instance.func}.${key}`;
          if (!choicesToRegister[namespace]) {
            choicesToRegister[namespace] = {};
          }
          if (!choicesToRegister[namespace][instance.func]) {
            choicesToRegister[namespace][instance.func] = {};
          }
          choicesToRegister[namespace][instance.func][key] = {};
          for (const [name, val] of Object.entries(spec.choices)) {
            if (name.endsWith(":")) continue;
            choicesToRegister[namespace][instance.func][key][name] = { type: "Number", value: val };
            const sanitized = sanitizeEnumName(name);
            if (sanitized && sanitized !== name) {
              choicesToRegister[namespace][instance.func][key][sanitized] = { type: "Number", value: val };
            }
          }
        }
        return {
          name: key,
          type: spec.type === "vec4" ? "color" : spec.type,
          default: spec.default,
          enum: enumPath,
          enumPath,
          min: spec.min,
          max: spec.max,
          uniform: spec.uniform,
          choices: spec.choices
        };
      });
      const opSpec = {
        name: instance.func,
        args
      };
      registerOp(`${namespace}.${instance.func}`, opSpec);
      if (instance.paramAliases) {
        registerParamAliases(`${namespace}.${instance.func}`, instance.paramAliases);
      }
      if (instance.hidden && instance.deprecatedBy) {
        registerEffectAlias(`${namespace}.${instance.func}`, instance.deprecatedBy);
      }
      return choicesToRegister;
    }
    return null;
  }
  /**
   * Register a starter op for an effect
   * @param {object} effect - Effect object
   */
  registerStarterOpForEffect(effect) {
    if (!effect.instance || !isStarterEffect(effect)) return;
    const func = effect.instance.func || effect.name;
    const namespace = effect.namespace;
    const starterNames = [];
    if (func) {
      starterNames.push(func);
      if (namespace) {
        starterNames.push(`${namespace}.${func}`);
      }
    }
    if (starterNames.length > 0) {
      registerStarterOps(starterNames);
    }
  }
  /**
   * Load effect from a pre-built bundle (definition + shaders inlined)
   * @param {string} namespace - Effect namespace
   * @param {string} effectName - Effect name
   * @returns {Promise<object>} Effect object with shaders already attached
   */
  async loadEffectFromBundle(namespace, effectName) {
    const effectId = `${namespace}/${effectName}`;
    const bundleUrl = `${this._bundlePath}/${namespace}/${effectName}.js`;
    try {
      const module = await import(bundleUrl);
      const exported = module.default;
      if (!exported) {
        throw new Error(`No default export in bundle ${effectId}`);
      }
      let instance;
      if (typeof exported === "function") {
        instance = new exported();
        if (exported.shaders && !instance.shaders) {
          instance.shaders = exported.shaders;
        }
        if (exported.help && !instance.help) {
          instance.help = exported.help;
        }
      } else {
        instance = exported;
      }
      if (module.help && !instance.help) {
        instance.help = module.help;
      }
      return { namespace, name: effectName, instance };
    } catch (err) {
      console.error(`Failed to load bundle for ${effectId}:`, err);
      throw err;
    }
  }
  /**
   * Load a single effect on demand (with caching)
   * @param {string} effectId - Effect ID (namespace/name)
   * @param {object} [options] - Loading options
   * @param {function} [options.onProgress] - Progress callback
   * @returns {Promise<object>} Loaded effect
   */
  async loadEffect(effectId, options = {}) {
    if (this._loadedEffects.has(effectId)) {
      return this._loadedEffects.get(effectId);
    }
    if (this._effectLoadingPromises.has(effectId)) {
      return this._effectLoadingPromises.get(effectId);
    }
    const [namespace, effectName] = effectId.split("/");
    if (!namespace || !effectName) {
      throw new Error(`Invalid effect ID: ${effectId}`);
    }
    const onProgress = options.onProgress || null;
    const loadPromise = (async () => {
      try {
        let effect;
        if (this._useBundles) {
          if (onProgress) onProgress({ effectId, stage: "bundle", status: "loading" });
          effect = await this.loadEffectFromBundle(namespace, effectName);
          if (onProgress) onProgress({ effectId, stage: "bundle", status: "done" });
        } else {
          if (onProgress) onProgress({ effectId, stage: "definition", status: "loading" });
          effect = await this.loadEffectDefinition(namespace, effectName);
          if (onProgress) onProgress({ effectId, stage: "definition", status: "done" });
          if (onProgress) onProgress({ effectId, stage: "shaders", status: "loading" });
          await this.loadEffectShaders(effect);
          if (onProgress) onProgress({ effectId, stage: "shaders", status: "done" });
        }
        const choicesToRegister = this.registerEffectWithRuntime(effect);
        if (choicesToRegister && Object.keys(choicesToRegister).length > 0) {
          this._enums = await mergeIntoEnums(choicesToRegister);
        }
        this.registerStarterOpForEffect(effect);
        this._loadedEffects.set(effectId, effect);
        return effect;
      } catch (err) {
        if (onProgress) onProgress({ effectId, stage: "error", status: "error", error: err });
        throw err;
      } finally {
        this._effectLoadingPromises.delete(effectId);
      }
    })();
    this._effectLoadingPromises.set(effectId, loadPromise);
    return loadPromise;
  }
  /**
   * Load multiple effects in parallel
   * @param {string[]} effectIds - Array of effect IDs
   * @param {object} [options] - Loading options
   * @param {function} [options.onProgress] - Progress callback
   * @returns {Promise<object[]>} Loaded effects
   */
  async loadEffects(effectIds, options = {}) {
    if (effectIds.length === 0) return [];
    const needsLoading = effectIds.filter((id) => !this._loadedEffects.has(id));
    if (needsLoading.length === 0) {
      return effectIds.map((id) => this._loadedEffects.get(id));
    }
    if (this._onLoadingStart) {
      this._onLoadingStart(needsLoading);
    }
    try {
      const loadPromises = needsLoading.map(
        (effectId) => this.loadEffect(effectId, options).catch((err) => {
          console.error(`Failed to load ${effectId}:`, err);
          return null;
        })
      );
      await Promise.all(loadPromises);
      if (this._onLoadingEnd) {
        this._onLoadingEnd();
      }
      return effectIds.map((id) => this._loadedEffects.get(id)).filter(Boolean);
    } catch (err) {
      if (this._onLoadingEnd) {
        this._onLoadingEnd();
      }
      throw err;
    }
  }
  // =========================================================================
  // Bundle Loading
  // =========================================================================
  /**
   * Register effects from a pre-bundled namespace module.
   *
   * Use this as an alternative to lazy-loading when you've imported
   * a namespace bundle (e.g., noisemaker-shaders-filter.esm.js).
   *
   * @example
   * import filterBundle from './noisemaker-shaders-filter.esm.js';
   * await renderer.registerEffectsFromBundle(filterBundle);
   *
   * @param {object} bundle - Bundle module with { namespace, effects, registerAll }
   * @returns {number} Number of effects registered
   */
  registerEffectsFromBundle(bundle) {
    if (!bundle || !bundle.effects || !bundle.namespace) {
      console.warn("[registerEffectsFromBundle] Invalid bundle format");
      return 0;
    }
    const namespace = bundle.namespace;
    let count = 0;
    for (const [effectName, effectDef] of Object.entries(bundle.effects)) {
      const effectId = `${namespace}/${effectName}`;
      if (this._loadedEffects.has(effectId)) {
        continue;
      }
      const effect = {
        namespace,
        name: effectName,
        instance: effectDef
      };
      const choicesToRegister = this.registerEffectWithRuntime(effect);
      if (choicesToRegister && Object.keys(choicesToRegister).length > 0) {
        this._pendingEnumMerges = this._pendingEnumMerges || [];
        this._pendingEnumMerges.push(choicesToRegister);
      }
      this.registerStarterOpForEffect(effect);
      this._loadedEffects.set(effectId, effect);
      count++;
    }
    if (this._pendingEnumMerges && this._pendingEnumMerges.length > 0) {
      const merges = this._pendingEnumMerges;
      this._pendingEnumMerges = [];
      Promise.all(merges.map((m) => mergeIntoEnums(m))).then((results) => {
        for (const result of results) {
          if (result) this._enums = result;
        }
      });
    }
    return count;
  }
  /**
   * Register effects from multiple bundles.
   *
   * @example
   * import filterBundle from './noisemaker-shaders-filter.esm.js';
   * import synthBundle from './noisemaker-shaders-synth.esm.js';
   * renderer.registerEffectsFromBundles([filterBundle, synthBundle]);
   *
   * @param {object[]} bundles - Array of bundle modules
   * @returns {number} Total number of effects registered
   */
  registerEffectsFromBundles(bundles) {
    let total = 0;
    for (const bundle of bundles) {
      total += this.registerEffectsFromBundle(bundle);
    }
    return total;
  }
  /**
   * Check if an effect is available (loaded from bundle or lazy-loaded).
   * @param {string} effectId - Effect ID (namespace/name)
   * @returns {boolean}
   */
  hasEffect(effectId) {
    return this._loadedEffects.has(effectId);
  }
  /**
   * Get all loaded effect IDs.
   * @returns {string[]}
   */
  getLoadedEffectIds() {
    return Array.from(this._loadedEffects.keys());
  }
  /**
   * Get loaded effect IDs for a specific namespace.
   * @param {string} namespace - Namespace to filter by
   * @returns {string[]}
   */
  getLoadedEffectIdsByNamespace(namespace) {
    const prefix = `${namespace}/`;
    return Array.from(this._loadedEffects.keys()).filter((id) => id.startsWith(prefix));
  }
  // =========================================================================
  // External Texture Handling (for media input effects)
  // =========================================================================
  /**
   * Update a texture from an external source (video, image, canvas).
   * This is used for media input effects that need to display camera/video content.
   * @param {string} texId - Texture ID from effect's externalTexture property
   * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement|ImageBitmap} source - Media source
   * @param {object} [options] - Update options
   * @param {boolean} [options.flipY=true] - Whether to flip the Y axis
   * @returns {{ width: number, height: number }} Source dimensions
   */
  updateTextureFromSource(texId, source, options = {}) {
    if (!this._pipeline || !this._pipeline.backend) {
      console.warn("[updateTextureFromSource] Pipeline not ready");
      return { width: 0, height: 0 };
    }
    return this._pipeline.backend.updateTextureFromSource(texId, source, options);
  }
  // =========================================================================
  // Mesh Loading (for meshLoader effect OBJ import)
  // =========================================================================
  /** @private Pack mesh data, cache it, and upload to backend */
  _packCacheAndUploadMesh(meshId, meshData, packMeshDataForTextures2) {
    const texWidth = 256;
    const texHeight = 256;
    const packed = packMeshDataForTextures2(
      meshData.positions,
      meshData.normals,
      meshData.uvs,
      texWidth,
      texHeight
    );
    this._meshCache.set(meshId, {
      positionData: packed.positionData,
      normalData: packed.normalData,
      uvData: packed.uvData,
      width: texWidth,
      height: texHeight,
      vertexCount: packed.vertexCount
    });
    return this._pipeline.backend.uploadMeshData(
      meshId,
      packed.positionData,
      packed.normalData,
      packed.uvData,
      texWidth,
      texHeight,
      packed.vertexCount
    );
  }
  /**
   * Load an OBJ mesh file from URL and upload to a mesh surface.
   * @param {string} url - URL to OBJ file
   * @param {string} [meshId='mesh0'] - Target mesh surface (mesh0-mesh7)
   * @returns {Promise<{success: boolean, vertexCount: number, error?: string}>}
   */
  async loadOBJFromURL(url, meshId = "mesh0") {
    if (!this._pipeline || !this._pipeline.backend) {
      console.warn("[loadOBJFromURL] Pipeline not ready");
      return { success: false, vertexCount: 0, error: "Pipeline not ready" };
    }
    try {
      const { loadOBJ: loadOBJ2, packMeshDataForTextures: packMeshDataForTextures2 } = await Promise.resolve().then(() => (init_obj_parser(), obj_parser_exports));
      const meshData = await loadOBJ2(url);
      const result = this._packCacheAndUploadMesh(meshId, meshData, packMeshDataForTextures2);
      return { success: true, vertexCount: result.vertexCount };
    } catch (err) {
      console.error("[Canvas] Failed to load OBJ:", err);
      return { success: false, vertexCount: 0, error: err.message };
    }
  }
  /**
   * Load OBJ mesh directly from string content.
   * @param {string} objText - Raw OBJ file content
   * @param {string} [meshId='mesh0'] - Target mesh surface (mesh0-mesh7)
   * @returns {Promise<{success: boolean, vertexCount: number, error?: string}>}
   */
  async loadOBJFromString(objText, meshId = "mesh0") {
    if (!this._pipeline || !this._pipeline.backend) {
      console.warn("[loadOBJFromString] Pipeline not ready");
      return { success: false, vertexCount: 0, error: "Pipeline not ready" };
    }
    try {
      const { parseOBJ: parseOBJ2, packMeshDataForTextures: packMeshDataForTextures2 } = await Promise.resolve().then(() => (init_obj_parser(), obj_parser_exports));
      const meshData = parseOBJ2(objText);
      const result = this._packCacheAndUploadMesh(meshId, meshData, packMeshDataForTextures2);
      return { success: true, vertexCount: result.vertexCount };
    } catch (err) {
      console.error("[Canvas] Failed to parse OBJ:", err);
      return { success: false, vertexCount: 0, error: err.message };
    }
  }
  // =========================================================================
  // Uniform/Parameter Handling
  // =========================================================================
  /**
   * Resolve an enum value from a path
   * @param {string} path - Enum path (e.g., "color.mono")
   * @returns {*} Resolved value or null
   */
  resolveEnumValue(path) {
    if (path === void 0 || path === null) return null;
    if (typeof path === "number" || typeof path === "boolean") return path;
    if (typeof path !== "string") return null;
    const segments = path.split(".").filter(Boolean);
    let node = this._enums;
    for (const segment of segments) {
      if (!node || node[segment] === void 0) {
        return null;
      }
      node = node[segment];
    }
    if (typeof node === "number" || typeof node === "boolean") {
      return node;
    }
    if (node && typeof node === "object" && node.value !== void 0) {
      return node.value;
    }
    return null;
  }
  /**
   * Convert a parameter value for use as a uniform
   * @param {*} value - Parameter value
   * @param {object} spec - Parameter spec
   * @returns {*} Converted value
   */
  convertParameterForUniform(value, spec) {
    if (!spec) {
      return value;
    }
    if ((spec.enum || spec.enumPath || spec.type === "member") && typeof value === "string") {
      let enumValue = this.resolveEnumValue(value);
      if ((enumValue === null || enumValue === void 0) && (spec.enum || spec.enumPath)) {
        const base = spec.enum || spec.enumPath;
        enumValue = this.resolveEnumValue(`${base}.${value}`);
      }
      if (enumValue !== null && enumValue !== void 0) {
        return enumValue;
      }
    }
    switch (spec.type) {
      case "boolean":
      case "button":
        return !!value;
      case "int":
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        return typeof value === "number" ? Math.round(value) : parseInt(value, 10);
      case "float":
        return typeof value === "number" ? value : parseFloat(value);
      case "color":
        if (Array.isArray(value)) {
          const result = value.slice(0, 3).map(
            (component) => typeof component === "number" ? component : parseFloat(component)
          );
          while (result.length < 3) result.push(0);
          return result;
        }
        if (typeof value === "string" && value.startsWith("#")) {
          const hex = value.slice(1);
          return [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255
          ];
        }
        break;
      case "vec3":
      case "vec4":
        if (Array.isArray(value)) {
          return value.map((component) => typeof component === "number" ? component : parseFloat(component));
        }
        break;
      default:
        break;
    }
    return value;
  }
  /**
   * Build uniform bindings for the current effect
   * @param {object} effect - Effect object
   */
  buildUniformBindings(effect) {
    this._uniformBindings = /* @__PURE__ */ new Map();
    if (!this._pipeline || !this._pipeline.graph || !Array.isArray(this._pipeline.graph.passes)) {
      return;
    }
    if (!effect || !effect.instance || !effect.instance.globals) {
      return;
    }
    const bridges = /* @__PURE__ */ new Map();
    if (effect.instance.passes) {
      for (const passDef of effect.instance.passes) {
        if (!passDef.uniforms) continue;
        for (const [shaderName, paramRef] of Object.entries(passDef.uniforms)) {
          if (shaderName === paramRef) continue;
          if (!bridges.has(paramRef)) bridges.set(paramRef, /* @__PURE__ */ new Set());
          bridges.get(paramRef).add(shaderName);
        }
      }
    }
    const targetFunc = effect.instance.func;
    const targetNamespace = effect.instance.namespace || effect.namespace || null;
    this._pipeline.graph.passes.forEach((pass, index) => {
      if (!pass) return;
      const passFunc = pass.effectFunc || pass.effectKey || null;
      const passNamespace = pass.effectNamespace || null;
      if (!passFunc || passFunc !== targetFunc) return;
      if (targetNamespace && passNamespace && passNamespace !== targetNamespace) return;
      for (const [paramName, spec] of Object.entries(effect.instance.globals)) {
        if (spec.type === "surface") continue;
        if (!pass.uniforms) continue;
        const uniformName = spec.uniform || paramName;
        if (uniformName in pass.uniforms) {
          if (!this._uniformBindings.has(paramName)) {
            this._uniformBindings.set(paramName, []);
          }
          this._uniformBindings.get(paramName).push({
            passIndex: index,
            uniformName
          });
          continue;
        }
        const paramBridges = bridges.get(paramName);
        if (paramBridges) {
          for (const shaderName of paramBridges) {
            if (shaderName in pass.uniforms) {
              if (!this._uniformBindings.has(paramName)) {
                this._uniformBindings.set(paramName, []);
              }
              this._uniformBindings.get(paramName).push({
                passIndex: index,
                uniformName: shaderName
              });
            }
          }
        }
      }
    });
  }
  /**
   * Apply parameter values to the pipeline
   * @param {object} effect - Current effect
   * @param {object} parameterValues - Parameter values to apply
   */
  applyParameterValues(effect, parameterValues) {
    if (!this._pipeline || !effect || !effect.instance) {
      return;
    }
    if (!this._uniformBindings.size) {
      this.buildUniformBindings(effect);
    }
    const globals = effect.instance.globals || {};
    let scopedParamChanged = false;
    for (const [paramName, spec] of Object.entries(globals)) {
      if (spec.type === "surface") {
        continue;
      }
      const bindings = this._uniformBindings.get(paramName);
      if (!bindings || bindings.length === 0) {
        continue;
      }
      const currentValue = parameterValues[paramName];
      if (currentValue === void 0) {
        continue;
      }
      if (isAutomationControlled(currentValue)) continue;
      const converted = this.convertParameterForUniform(currentValue, spec);
      for (const binding of bindings) {
        const pass = this._pipeline.graph.passes[binding.passIndex];
        if (!pass || !pass.uniforms) {
          continue;
        }
        if (binding.uniformName === "volumeSize" && pass.inheritsVolumeSize) continue;
        pass.uniforms[binding.uniformName] = Array.isArray(converted) ? converted.slice() : converted;
        if (pass.scopedParams && pass.scopedParams[binding.uniformName]) {
          const scopedName = pass.scopedParams[binding.uniformName];
          pass.uniforms[scopedName] = pass.uniforms[binding.uniformName];
          scopedParamChanged = true;
          this._pipeline.broadcastChainScopedParam(pass, binding.uniformName, scopedName);
        }
      }
    }
    if (scopedParamChanged && this._pipeline.recreateTextures) {
      this._pipeline.recreateTextures(this._pipeline.collectDefaultUniforms());
    }
  }
  /**
   * Apply per-step parameter values to the pipeline.
   * This allows different instances of the same effect to have different uniform values.
   * Recreates simulation textures if a chain-scoped param (e.g. zoom) changed.
   * @param {object} stepParameterValues - Map of step_N -> {paramName: value}
   */
  applyStepParameterValues(stepParameterValues) {
    if (!this._pipeline || !this._pipeline.graph || !Array.isArray(this._pipeline.graph.passes)) {
      return;
    }
    let scopedParamChanged = false;
    for (const pass of this._pipeline.graph.passes) {
      if (!pass || pass.stepIndex === void 0) continue;
      const stepKey = `step_${pass.stepIndex}`;
      const stepParams = stepParameterValues[stepKey];
      if (!stepParams) continue;
      const effectKey = pass.effectKey;
      const effectDef = effectKey ? getEffect(effectKey) : null;
      if (!effectDef || !effectDef.globals) continue;
      const colorModeControlledUniforms = /* @__PURE__ */ new Set();
      for (const globalSpec of Object.values(effectDef.globals)) {
        if (globalSpec.colorModeUniform) {
          colorModeControlledUniforms.add(globalSpec.colorModeUniform);
        }
      }
      let paletteExpansion = null;
      for (const [paramName, value] of Object.entries(stepParams)) {
        if (paramName === "_skip") continue;
        if (isAutomationControlled(value)) continue;
        const spec = effectDef.globals[paramName];
        if (!spec || spec.type === "surface") continue;
        const uniformName = spec.uniform || paramName;
        if (colorModeControlledUniforms.has(uniformName)) continue;
        if (!pass.uniforms || !(uniformName in pass.uniforms)) continue;
        if (uniformName === "volumeSize" && pass.inheritsVolumeSize) continue;
        const converted = this.convertParameterForUniform(value, spec);
        pass.uniforms[uniformName] = Array.isArray(converted) ? converted.slice() : converted;
        if (pass.scopedParams && pass.scopedParams[uniformName]) {
          const scopedName = pass.scopedParams[uniformName];
          pass.uniforms[scopedName] = pass.uniforms[uniformName];
          scopedParamChanged = true;
          this._pipeline.broadcastChainScopedParam(pass, uniformName, scopedName);
        }
        if (spec.type === "palette") {
          paletteExpansion = expandPalette(converted);
        }
      }
      if (paletteExpansion) {
        for (const [uName, uValue] of Object.entries(paletteExpansion)) {
          if (uName in pass.uniforms) {
            pass.uniforms[uName] = Array.isArray(uValue) ? uValue.slice() : uValue;
          }
        }
      }
    }
    if (scopedParamChanged && this._pipeline.recreateTextures) {
      this._pipeline.recreateTextures(this._pipeline.collectDefaultUniforms());
    }
  }
};

// demo/shaders/lib/emitter.js
var _listeners;
var Emitter = class {
  constructor() {
    __privateAdd(this, _listeners, /* @__PURE__ */ new Map());
  }
  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {function} callback - Handler function
   */
  on(event, callback) {
    if (!__privateGet(this, _listeners).has(event)) {
      __privateGet(this, _listeners).set(event, /* @__PURE__ */ new Set());
    }
    __privateGet(this, _listeners).get(event).add(callback);
  }
  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} callback - Handler to remove
   */
  off(event, callback) {
    const handlers = __privateGet(this, _listeners).get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }
  /**
   * Subscribe to an event (one-time)
   * @param {string} event - Event name
   * @param {function} callback - Handler function
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }
  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  emit(event, data) {
    const handlers = __privateGet(this, _listeners).get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[Emitter] Error in ${event} handler:`, err);
        }
      }
    }
  }
  /**
   * Remove all listeners for an event (or all events)
   * @param {string} [event] - Event name (omit to clear all)
   */
  removeAllListeners(event) {
    if (event) {
      __privateGet(this, _listeners).delete(event);
    } else {
      __privateGet(this, _listeners).clear();
    }
  }
};
_listeners = new WeakMap();

// demo/shaders/lib/dsl-utils.js
function extractEffectsFromDsl(dsl) {
  const effects2 = [];
  if (!dsl || typeof dsl !== "string") return effects2;
  try {
    const result = compile(dsl);
    if (!result || !result.plans) return effects2;
    let globalStepIndex = 0;
    for (const plan of result.plans) {
      if (!plan.chain) continue;
      for (const step of plan.chain) {
        const fullOpName = step.op;
        const namespace = step.namespace?.namespace || step.namespace?.resolved || null;
        let shortName = fullOpName;
        if (fullOpName.includes(".")) {
          shortName = fullOpName.split(".").pop();
        }
        const rawArgs = step.rawKwargs || {};
        const args = step.args ? { ...step.args } : {};
        for (const [paramName, rawVal] of Object.entries(rawArgs)) {
          const isRawAutomation = rawVal && typeof rawVal === "object" && (rawVal.type === "Oscillator" || rawVal.type === "Midi" || rawVal.type === "Audio" || rawVal._ast?.type === "Oscillator" || rawVal._ast?.type === "Midi" || rawVal._ast?.type === "Audio");
          const currentVal = args[paramName];
          const isArgAutomation = currentVal && typeof currentVal === "object" && (currentVal.type === "Oscillator" || currentVal.type === "Midi" || currentVal.type === "Audio" || currentVal._ast?.type === "Oscillator" || currentVal._ast?.type === "Midi" || currentVal._ast?.type === "Audio");
          if (isRawAutomation && !isArgAutomation) {
            args[paramName] = rawVal;
          }
        }
        effects2.push({
          effectKey: fullOpName,
          namespace,
          name: shortName,
          fullName: fullOpName,
          args,
          rawKwargs: rawArgs,
          stepIndex: globalStepIndex,
          temp: step.temp
        });
        globalStepIndex++;
      }
    }
  } catch (err) {
    if (isDslSyntaxError(err)) {
      console.warn("DSL Syntax Error:\n" + formatDslError(dsl, err));
    } else {
      console.warn("Failed to parse DSL for effect extraction:", err);
    }
  }
  return effects2;
}

// demo/shaders/lib/program-state.js
var ProgramState = class extends Emitter {
  /**
   * Create a new ProgramState instance
   * @param {object} [options={}] - Configuration options
   * @param {object} [options.renderer] - CanvasRenderer instance for pipeline integration
   */
  constructor(options = {}) {
    super();
    this._renderer = options.renderer || null;
    this._stepStates = /* @__PURE__ */ new Map();
    this._structure = [];
    this._writeTargetOverrides = /* @__PURE__ */ new Map();
    this._writeStepTargetOverrides = /* @__PURE__ */ new Map();
    this._readSourceOverrides = /* @__PURE__ */ new Map();
    this._read3dVolOverrides = /* @__PURE__ */ new Map();
    this._read3dGeoOverrides = /* @__PURE__ */ new Map();
    this._write3dVolOverrides = /* @__PURE__ */ new Map();
    this._write3dGeoOverrides = /* @__PURE__ */ new Map();
    this._renderTargetOverride = null;
    this._mediaInputs = /* @__PURE__ */ new Map();
    this._textInputs = /* @__PURE__ */ new Map();
    this._compiled = null;
    this._batchDepth = 0;
    this._batchedChanges = [];
    this._recompilePending = false;
  }
  // =========================================================================
  // Parameter Access Methods
  // =========================================================================
  /**
   * Get a single parameter value
   * @param {string} stepKey - Step identifier (e.g., "step_0")
   * @param {string} paramName - Parameter name
   * @returns {*} Parameter value or undefined
   */
  getValue(stepKey, paramName) {
    const stepState = this._stepStates.get(stepKey);
    if (!stepState) return void 0;
    const value = stepState.values[paramName];
    if (value && typeof value === "object" && value._varRef) {
      return value.value;
    }
    return value;
  }
  /**
   * Set a single parameter value
   * @param {string} stepKey - Step identifier
   * @param {string} paramName - Parameter name
   * @param {*} value - New value
   */
  setValue(stepKey, paramName, value) {
    let stepState = this._stepStates.get(stepKey);
    if (!stepState) {
      stepState = this._createEmptyStepState(stepKey);
      this._stepStates.set(stepKey, stepState);
    }
    const previousValue = this.getValue(stepKey, paramName);
    const effectDef = stepState.effectDef;
    const spec = effectDef?.globals?.[paramName];
    if (spec) {
      value = this._validateValue(value, spec);
    }
    const currentValue = stepState.values[paramName];
    if (currentValue && typeof currentValue === "object" && currentValue._varRef) {
      stepState.values[paramName] = { ...currentValue, value };
    } else {
      stepState.values[paramName] = value;
    }
    if (spec?.define && !this._valuesEqual(previousValue, value)) {
      this._recompilePending = true;
    }
    this._applyToPipeline();
    this._emitChange({ stepKey, paramName, value, previousValue });
  }
  /**
   * Compare two parameter values for equality. Used to decide whether a
   * compile-time-define change actually warrants a recompile (no point
   * recompiling if the slider snaps back to the same int value).
   * @private
   */
  _valuesEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
    return false;
  }
  /**
   * Get all parameter values for a step
   * @param {string} stepKey - Step identifier
   * @returns {Record<string, *>} All parameter values
   */
  getStepValues(stepKey) {
    const stepState = this._stepStates.get(stepKey);
    if (!stepState) return {};
    const result = {};
    for (const [key, value] of Object.entries(stepState.values)) {
      if (value && typeof value === "object" && value._varRef) {
        result[key] = value.value;
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  /**
   * Set multiple parameter values for a step
   * @param {string} stepKey - Step identifier
   * @param {Record<string, *>} values - Parameter values to set
   */
  setStepValues(stepKey, values) {
    this.batch(() => {
      for (const [paramName, value] of Object.entries(values)) {
        this.setValue(stepKey, paramName, value);
      }
    });
  }
  // =========================================================================
  // Batching Support
  // =========================================================================
  /**
   * Execute a function with batched change events
   * Multiple setValue calls within the batch emit a single 'stepchange' event
   * @param {function} fn - Function to execute
   */
  batch(fn) {
    this._batchDepth++;
    try {
      fn();
    } finally {
      this._batchDepth--;
      if (this._batchDepth === 0 && this._batchedChanges.length > 0) {
        this._flushBatchedChanges();
      }
    }
  }
  /**
   * Emit change event or queue for batching. When called outside a batch,
   * also flushes any pending recompile so a single setValue() that touches
   * a `define:`-flagged param triggers exactly one recompile event.
   * @private
   */
  _emitChange(change) {
    if (this._batchDepth > 0) {
      this._batchedChanges.push(change);
    } else {
      this.emit("change", change);
      this._flushPendingRecompile();
    }
  }
  /**
   * Flush batched changes as grouped events
   * @private
   */
  _flushBatchedChanges() {
    const byStep = /* @__PURE__ */ new Map();
    for (const change of this._batchedChanges) {
      if (!byStep.has(change.stepKey)) {
        byStep.set(change.stepKey, { values: {}, previousValues: {} });
      }
      const group = byStep.get(change.stepKey);
      group.values[change.paramName] = change.value;
      group.previousValues[change.paramName] = change.previousValue;
    }
    for (const [stepKey, data] of byStep) {
      this.emit("stepchange", { stepKey, ...data });
    }
    this._batchedChanges = [];
    this._flushPendingRecompile();
  }
  /**
   * Emit `recompileNeeded` if any compile-time-define mutation is pending,
   * then clear the flag. Safe to call when nothing is pending.
   * @private
   */
  _flushPendingRecompile() {
    if (!this._recompilePending) return;
    this._recompilePending = false;
    this.emit("recompileNeeded");
  }
  // =========================================================================
  // DSL Synchronization
  // =========================================================================
  /**
   * Load state from DSL text
   * Parses DSL, extracts effect structure, and initializes step states
   * @param {string} dslText - DSL program text
   */
  fromDsl(dslText) {
    const previousStructure = [...this._structure];
    try {
      this._compiled = compile(dslText);
    } catch (err) {
      this._compiled = null;
    }
    const effects2 = extractEffectsFromDsl(dslText);
    if (!effects2) {
      console.warn("[ProgramState] Failed to parse DSL");
      return;
    }
    const structureChanged = !this._structuresMatch(previousStructure, effects2);
    const preservedValues = this._preserveValuesByOccurrence();
    this._structure = effects2;
    if (structureChanged) {
      this._rebuildStepStates(effects2, preservedValues);
      this.emit("structurechange", { structure: effects2, previousStructure });
    } else {
      this._updateValuesFromDsl(effects2);
    }
    this._applyToPipeline();
    this.emit("load", { structure: effects2 });
  }
  /**
   * Generate DSL text from current state
   * @returns {string} DSL program text
   */
  toDsl() {
    if (!this._renderer?.currentDsl) return "";
    try {
      const compiled = compile(this._renderer.currentDsl);
      if (!compiled?.plans) return this._renderer.currentDsl;
      const overrides = this._buildParameterOverrides();
      this._applyRoutingOverridesToCompiled(compiled);
      const enums = this._renderer?.enums || {};
      const getEffectDefCallback = (effectName, namespace) => {
        let def = getEffect(effectName);
        if (def) return def;
        if (effectName.includes(".")) {
          def = getEffect(effectName.replace(".", "/"));
          if (def) return def;
        }
        if (namespace) {
          def = getEffect(`${namespace}/${effectName}`) || getEffect(`${namespace}.${effectName}`);
          if (def) return def;
        }
        return null;
      };
      return unparse(compiled, overrides, {
        customFormatter: (value, spec) => formatValue(value, spec, { enums }),
        getEffectDef: getEffectDefCallback
      });
    } catch (err) {
      console.warn("[ProgramState] Failed to generate DSL:", err);
      return this._renderer?.currentDsl || "";
    }
  }
  /**
   * Check if DSL would change the effect structure
   * @param {string} dslText - DSL to check
   * @returns {boolean} True if structure would change
   */
  wouldChangeStructure(dslText) {
    const effects2 = extractEffectsFromDsl(dslText);
    if (!effects2) return true;
    return !this._structuresMatch(this._structure, effects2);
  }
  // =========================================================================
  // Step Operations
  // =========================================================================
  /**
   * Reset step to default values
   * @param {string} stepKey - Step identifier
   */
  resetStep(stepKey) {
    const stepState = this._stepStates.get(stepKey);
    if (!stepState) return;
    const effectDef = stepState.effectDef;
    if (!effectDef?.globals) return;
    const wasSkipped = stepState.values._skip;
    const newValues = {};
    for (const [paramName, spec] of Object.entries(effectDef.globals)) {
      if (spec.default !== void 0) {
        newValues[paramName] = this._cloneValue(spec.default);
      }
    }
    if (wasSkipped) {
      newValues._skip = true;
    }
    stepState.values = newValues;
    this._applyToPipeline();
    this.emit("reset", { stepKey });
  }
  /**
   * Set skip/bypass state for an effect
   * @param {string} stepKey - Step identifier
   * @param {boolean} skip - Whether to skip
   */
  setSkip(stepKey, skip) {
    const stepState = this._stepStates.get(stepKey);
    if (!stepState) return;
    const previousValue = stepState.values._skip;
    stepState.values._skip = skip;
    this._applyToPipeline();
    this.emit("change", { stepKey, paramName: "_skip", value: skip, previousValue });
  }
  /**
   * Check if effect is skipped
   * @param {string} stepKey - Step identifier
   * @returns {boolean}
   */
  isSkipped(stepKey) {
    return this._stepStates.get(stepKey)?.values._skip === true;
  }
  /**
   * Delete a step from the program
   * @param {number} stepIndex - Global step index to delete
   * @returns {{success: boolean, newDsl?: string, deletedSurfaceName?: string, error?: string}}
   */
  deleteStep(stepIndex) {
    if (!this._renderer?.currentDsl) {
      return { success: false, error: "no DSL available" };
    }
    const currentDsl = this._renderer.currentDsl;
    let compiled;
    try {
      compiled = compile(currentDsl);
    } catch (err) {
      return { success: false, error: `DSL syntax error: ${err.message}` };
    }
    if (!compiled?.plans) {
      return { success: false, error: "compilation failed" };
    }
    const searchMatch = currentDsl.match(/^search\s+(\S.*?)$/m);
    if (searchMatch) {
      compiled.searchNamespaces = searchMatch[1].split(/\s*,\s*/);
    }
    let globalStepIndex = 0;
    let found = false;
    let deletedSurfaceName = null;
    for (let p = 0; p < compiled.plans.length; p++) {
      const plan = compiled.plans[p];
      if (!plan.chain) continue;
      for (let s = 0; s < plan.chain.length; s++) {
        if (globalStepIndex === stepIndex) {
          const deletedStep = plan.chain[s];
          if (s === 0 && deletedStep && !deletedStep.builtin) {
            const namespace = deletedStep.namespace?.namespace || deletedStep.namespace?.resolved || null;
            const def = getEffect(deletedStep.op) || (namespace ? getEffect(`${namespace}/${deletedStep.op}`) : null);
            const deletedIsStarter = !!(def && isStarterEffect({ instance: def }));
            if (deletedIsStarter) {
              if (plan.write) {
                deletedSurfaceName = typeof plan.write === "object" ? plan.write.name : plan.write;
              }
              compiled.plans.splice(p, 1);
              found = true;
              break;
            }
          }
          plan.chain.splice(s, 1);
          if (plan.chain.length === 0) {
            if (plan.write) {
              deletedSurfaceName = typeof plan.write === "object" ? plan.write.name : plan.write;
            }
            compiled.plans.splice(p, 1);
          } else {
            const hasNonWriteStep = plan.chain.some(
              (step) => !(step.builtin && step.op === "_write")
            );
            if (!hasNonWriteStep) {
              if (plan.write) {
                deletedSurfaceName = typeof plan.write === "object" ? plan.write.name : plan.write;
              }
              compiled.plans.splice(p, 1);
            }
          }
          found = true;
          break;
        }
        globalStepIndex++;
      }
      if (found) break;
    }
    if (!found) {
      return { success: false, error: "step not found" };
    }
    const newDsl = unparse(compiled, {}, {
      getEffectDef: (name, ns) => {
        let def = getEffect(name);
        if (!def && ns) {
          def = getEffect(`${ns}/${name}`) || getEffect(`${ns}.${name}`);
        }
        return def;
      }
    });
    this.fromDsl(newDsl);
    return { success: true, newDsl, deletedSurfaceName };
  }
  /**
   * Insert a step into the program
   * @param {number} afterStepIndex - Insert after this step (-1 for beginning of first chain)
   * @param {string} effectId - Effect identifier (e.g., "filter/bloom")
   * @returns {{success: boolean, newDsl?: string, newStepIndex?: number, error?: string}}
   */
  insertStep(afterStepIndex, effectId) {
    if (!this._renderer?.currentDsl) {
      return { success: false, error: "no DSL available" };
    }
    const currentDsl = this._renderer.currentDsl;
    let compiled;
    try {
      compiled = compile(currentDsl);
    } catch (err) {
      return { success: false, error: `DSL syntax error: ${err.message}` };
    }
    if (!compiled?.plans) {
      return { success: false, error: "compilation failed" };
    }
    const searchMatch = currentDsl.match(/^search\s+(\S.*?)$/m);
    if (searchMatch) {
      compiled.searchNamespaces = searchMatch[1].split(/\s*,\s*/);
    }
    const slashIndex = effectId.indexOf("/");
    const namespace = slashIndex > -1 ? effectId.substring(0, slashIndex) : null;
    const effectName = slashIndex > -1 ? effectId.substring(slashIndex + 1) : effectId;
    const effectDef = getEffect(effectId) || getEffect(effectName) || (namespace ? getEffect(`${namespace}.${effectName}`) : null);
    if (effectDef && isStarterEffect({ instance: effectDef })) {
      return { success: false, error: `Cannot insert starter effect '${effectId}' mid-chain` };
    }
    if (namespace && (!compiled.searchNamespaces || !compiled.searchNamespaces.includes(namespace))) {
      if (!compiled.searchNamespaces) {
        compiled.searchNamespaces = [];
      }
      compiled.searchNamespaces.push(namespace);
    }
    let globalStepIndex = 0;
    let targetPlanIndex = -1;
    let targetChainIndex = -1;
    for (let p = 0; p < compiled.plans.length; p++) {
      const plan = compiled.plans[p];
      if (!plan.chain) continue;
      for (let s = 0; s < plan.chain.length; s++) {
        if (globalStepIndex === afterStepIndex) {
          targetPlanIndex = p;
          targetChainIndex = s;
          break;
        }
        globalStepIndex++;
      }
      if (targetPlanIndex >= 0) break;
    }
    if (targetPlanIndex < 0 && afterStepIndex >= 0) {
      return { success: false, error: `Step index ${afterStepIndex} not found` };
    }
    if (afterStepIndex < 0) {
      targetPlanIndex = 0;
      targetChainIndex = -1;
    }
    const targetChain = compiled.plans[targetPlanIndex]?.chain;
    if (!targetChain) {
      return { success: false, error: "Target chain not found" };
    }
    let maxTemp = 0;
    for (const plan of compiled.plans) {
      if (!plan.chain) continue;
      for (const step of plan.chain) {
        if (typeof step.temp === "number" && step.temp > maxTemp) {
          maxTemp = step.temp;
        }
      }
    }
    const newStep = {
      op: effectName,
      args: {},
      temp: maxTemp + 1
    };
    if (namespace) {
      newStep.namespace = { namespace };
    }
    let insertPosition = targetChainIndex + 1;
    if (targetChain[targetChainIndex]?.builtin && targetChain[targetChainIndex]?.op === "_write") {
      insertPosition = targetChainIndex;
    }
    targetChain.splice(insertPosition, 0, newStep);
    const newDsl = unparse(compiled, {}, {
      getEffectDef: (name, ns) => {
        let def = getEffect(name);
        if (!def && ns) {
          def = getEffect(`${ns}/${name}`) || getEffect(`${ns}.${name}`);
        }
        return def;
      }
    });
    this.fromDsl(newDsl);
    let newStepIndex = 0;
    for (let p = 0; p < targetPlanIndex; p++) {
      newStepIndex += compiled.plans[p]?.chain?.length || 0;
    }
    newStepIndex += insertPosition;
    return { success: true, newDsl, newStepIndex };
  }
  // =========================================================================
  // Structure Access Methods
  // =========================================================================
  /**
   * Get effect chain structure
   * @returns {Array} Array of EffectInfo objects
   */
  getStructure() {
    return [...this._structure];
  }
  /**
   * Get the compiled program (for routing, plan indices, etc.)
   * @returns {object|null} Compiled program or null
   */
  getCompiled() {
    return this._compiled;
  }
  /**
   * Get effect definition for a step
   * @param {string} stepKey - Step identifier
   * @returns {object|null} Effect definition or null
   */
  getEffectDef(stepKey) {
    return this._stepStates.get(stepKey)?.effectDef || null;
  }
  /**
   * Get step count
   * @returns {number}
   */
  get stepCount() {
    return this._stepStates.size;
  }
  /**
   * Get all step keys
   * @returns {string[]}
   */
  getStepKeys() {
    return [...this._stepStates.keys()];
  }
  /**
   * Get all step values as a plain object keyed by stepKey
   * Used for passing to renderer.applyStepParameterValues()
   * @returns {Object<string, Object<string, any>>}
   */
  getAllStepValues() {
    const result = {};
    for (const [stepKey, stepState] of this._stepStates) {
      result[stepKey] = { ...stepState.values };
    }
    return result;
  }
  // =========================================================================
  // Routing Override Methods
  // =========================================================================
  /**
   * Set write target override for a plan
   * @param {number} planIndex - Plan index
   * @param {string} target - Target surface name
   */
  setWriteTarget(planIndex, target) {
    this._writeTargetOverrides.set(planIndex, target);
    this.emit("change", { type: "routing", key: "writeTarget", planIndex, value: target });
  }
  /**
   * Get write target override for a plan
   * @param {number} planIndex - Plan index
   * @returns {string|undefined}
   */
  getWriteTarget(planIndex) {
    return this._writeTargetOverrides.get(planIndex);
  }
  /**
   * Set write target override for a mid-chain write step
   * @param {number} stepIndex - Step index
   * @param {string} target - Target surface name
   */
  setWriteStepTarget(stepIndex, target) {
    this._writeStepTargetOverrides.set(stepIndex, target);
    this.emit("change", { type: "routing", key: "writeStepTarget", stepIndex, value: target });
  }
  /**
   * Get write target override for a mid-chain write step
   * @param {number} stepIndex - Step index
   * @returns {string|undefined}
   */
  getWriteStepTarget(stepIndex) {
    return this._writeStepTargetOverrides.get(stepIndex);
  }
  /**
   * Set read source override for a step
   * @param {number} stepIndex - Step index
   * @param {string} source - Source surface name
   */
  setReadSource(stepIndex, source) {
    this._readSourceOverrides.set(stepIndex, source);
    this.emit("change", { type: "routing", key: "readSource", stepIndex, value: source });
  }
  /**
   * Get read source override for a step
   * @param {number} stepIndex - Step index
   * @returns {string|undefined}
   */
  getReadSource(stepIndex) {
    return this._readSourceOverrides.get(stepIndex);
  }
  /**
   * Set 3D volume read override
   * @param {number} stepIndex - Step index
   * @param {string} volume - Volume name
   */
  setRead3dVolume(stepIndex, volume) {
    this._read3dVolOverrides.set(stepIndex, volume);
  }
  /**
   * Set 3D geometry read override
   * @param {number} stepIndex - Step index
   * @param {string} geometry - Geometry name
   */
  setRead3dGeometry(stepIndex, geometry) {
    this._read3dGeoOverrides.set(stepIndex, geometry);
  }
  /**
   * Set 3D volume write override
   * @param {number} stepIndex - Step index
   * @param {string} volume - Volume name
   */
  setWrite3dVolume(stepIndex, volume) {
    this._write3dVolOverrides.set(stepIndex, volume);
  }
  /**
   * Set 3D geometry write override
   * @param {number} stepIndex - Step index
   * @param {string} geometry - Geometry name
   */
  setWrite3dGeometry(stepIndex, geometry) {
    this._write3dGeoOverrides.set(stepIndex, geometry);
  }
  /**
   * Set render target override
   * @param {string} target - Target surface name
   */
  setRenderTarget(target) {
    this._renderTargetOverride = target;
    this.emit("change", { type: "routing", key: "renderTarget", value: target });
  }
  /**
   * Get render target override
   * @returns {string|null}
   */
  getRenderTarget() {
    return this._renderTargetOverride;
  }
  /**
   * Clear all routing overrides
   */
  clearRoutingOverrides() {
    this._writeTargetOverrides.clear();
    this._writeStepTargetOverrides.clear();
    this._readSourceOverrides.clear();
    this._read3dVolOverrides.clear();
    this._read3dGeoOverrides.clear();
    this._write3dVolOverrides.clear();
    this._write3dGeoOverrides.clear();
    this._renderTargetOverride = null;
  }
  // =========================================================================
  // Media Metadata
  // =========================================================================
  /**
   * Set media input metadata for a step.
   * Stores metadata only - actual resources managed by UI layer.
   * @param {number} stepIndex - Step index
   * @param {object} metadata - Media metadata
   * @param {string} metadata.type - Media type ('image', 'video', 'camera')
   * @param {string} metadata.textureId - Texture identifier
   * @param {number[]} [metadata.dimensions] - [width, height]
   * @param {string} [metadata.filename] - Original filename (for images/videos)
   */
  setMediaInput(stepIndex, metadata) {
    this._mediaInputs.set(stepIndex, metadata);
    this.emit("mediachange", { stepIndex, metadata });
  }
  /**
   * Get media input metadata for a step
   * @param {number} stepIndex - Step index
   * @returns {object|undefined} Media metadata
   */
  getMediaInput(stepIndex) {
    return this._mediaInputs.get(stepIndex);
  }
  /**
   * Remove media input metadata for a step
   * @param {number} stepIndex - Step index
   */
  removeMediaInput(stepIndex) {
    this._mediaInputs.delete(stepIndex);
    this.emit("mediachange", { stepIndex, metadata: null });
  }
  /**
   * Get all media input metadata
   * @returns {Map<number, object>}
   */
  getAllMediaInputs() {
    return new Map(this._mediaInputs);
  }
  /**
   * Set text input metadata for a step.
   * Stores text canvas state - actual canvas managed by UI layer.
   * @param {number} stepIndex - Step index
   * @param {object} metadata - Text metadata
   * @param {string} metadata.text - Text content
   * @param {string} metadata.font - Font name
   * @param {string} [metadata.fontStyle] - Font style/weight
   * @param {number} [metadata.size] - Font size
   * @param {string} [metadata.color] - Text color
   * @param {string} [metadata.justify] - Text alignment
   * @param {number[]} [metadata.dimensions] - Canvas [width, height]
   */
  setTextInput(stepIndex, metadata) {
    this._textInputs.set(stepIndex, metadata);
    this.emit("textchange", { stepIndex, metadata });
  }
  /**
   * Get text input metadata for a step
   * @param {number} stepIndex - Step index
   * @returns {object|undefined} Text metadata
   */
  getTextInput(stepIndex) {
    return this._textInputs.get(stepIndex);
  }
  /**
   * Remove text input metadata for a step
   * @param {number} stepIndex - Step index
   */
  removeTextInput(stepIndex) {
    this._textInputs.delete(stepIndex);
    this.emit("textchange", { stepIndex, metadata: null });
  }
  /**
   * Get all text input metadata
   * @returns {Map<number, object>}
   */
  getAllTextInputs() {
    return new Map(this._textInputs);
  }
  // =========================================================================
  // Pipeline Integration
  // =========================================================================
  /**
   * Set renderer reference
   * @param {object} renderer - CanvasRenderer instance
   */
  setRenderer(renderer) {
    this._renderer = renderer;
  }
  /**
   * Apply current state to pipeline uniforms
   * Called automatically after state changes
   */
  applyToPipeline() {
    this._applyToPipeline();
  }
  /**
   * Internal: Apply state to pipeline
   * @private
   */
  _applyToPipeline() {
    if (!this._renderer?.pipeline?.graph?.passes) return;
    const pipeline = this._renderer.pipeline;
    let scopedParamChanged = false;
    for (const [stepKey, stepState] of this._stepStates) {
      const match = stepKey.match(/^step_(\d+)$/);
      if (!match) continue;
      const stepIndex = parseInt(match[1], 10);
      const stepPasses = pipeline.graph.passes.filter((pass) => {
        if (!pass.id) return false;
        const passMatch = pass.id.match(/^node_(\d+)_/);
        return passMatch && parseInt(passMatch[1], 10) === stepIndex;
      });
      if (stepPasses.length === 0) continue;
      const effectDef = stepState.effectDef;
      for (const pass of stepPasses) {
        if (!pass.uniforms) continue;
        let paletteExpansion = null;
        for (const [paramName, value] of Object.entries(stepState.values)) {
          if (value === void 0 || value === null) continue;
          if (paramName.startsWith("_")) continue;
          if (value && typeof value === "object" && (value._varRef || value.type === "Oscillator" || value._ast?.type === "Oscillator" || value.type === "Midi" || value._ast?.type === "Midi" || value.type === "Audio" || value._ast?.type === "Audio")) {
            continue;
          }
          const spec = effectDef?.globals?.[paramName];
          const uniformName = spec?.uniform || paramName;
          let converted = value;
          if (this._renderer.convertParameterForUniform) {
            converted = this._renderer.convertParameterForUniform(value, spec);
          }
          if (uniformName in pass.uniforms) {
            if (uniformName === "volumeSize" && pass.inheritsVolumeSize) continue;
            pass.uniforms[uniformName] = Array.isArray(converted) ? converted.slice() : converted;
            if (pass.scopedParams && pass.scopedParams[uniformName]) {
              const scopedName = pass.scopedParams[uniformName];
              pass.uniforms[scopedName] = pass.uniforms[uniformName];
              scopedParamChanged = true;
              pipeline.broadcastChainScopedParam(pass, uniformName, scopedName);
            }
          }
          if (spec?.type === "palette") {
            paletteExpansion = expandPalette(converted);
          }
        }
        if (paletteExpansion) {
          for (const [uName, uValue] of Object.entries(paletteExpansion)) {
            if (uName in pass.uniforms) {
              pass.uniforms[uName] = Array.isArray(uValue) ? uValue.slice() : uValue;
            }
          }
        }
      }
      if (pipeline.checkAsyncRegen && stepPasses.length > 0) {
        const nodeId = stepPasses[0].nodeId;
        const effectKey = stepPasses[0].effectKey;
        if (nodeId && effectKey) {
          pipeline.checkAsyncRegen(nodeId, effectKey, stepState.values);
        }
      }
    }
    if (scopedParamChanged && pipeline.recreateTextures) {
      pipeline.recreateTextures(pipeline.collectDefaultUniforms());
    }
    if (pipeline.setUniform) {
      for (const [stepKey, stepState] of this._stepStates) {
        if ("stateSize" in stepState.values) {
          const match = stepKey.match(/^step_(\d+)$/);
          if (match) {
            pipeline.setUniform(`stateSize_node_${match[1]}`, stepState.values.stateSize);
          }
        }
      }
    }
  }
  // =========================================================================
  // Serialization
  // =========================================================================
  /**
   * Serialize full state for persistence
   * @returns {object} Serialized state
   */
  serialize() {
    const stepStates = {};
    for (const [key, state] of this._stepStates) {
      stepStates[key] = {
        effectKey: state.effectKey,
        values: { ...state.values },
        _skip: state.values._skip
      };
    }
    return {
      version: 1,
      dsl: this._renderer?.currentDsl || "",
      stepStates,
      overrides: {
        writeTargets: Object.fromEntries(this._writeTargetOverrides),
        writeStepTargets: Object.fromEntries(this._writeStepTargetOverrides),
        readSources: Object.fromEntries(this._readSourceOverrides),
        read3dVol: Object.fromEntries(this._read3dVolOverrides),
        read3dGeo: Object.fromEntries(this._read3dGeoOverrides),
        write3dVol: Object.fromEntries(this._write3dVolOverrides),
        write3dGeo: Object.fromEntries(this._write3dGeoOverrides),
        renderTarget: this._renderTargetOverride
      },
      mediaInputs: Object.fromEntries(this._mediaInputs),
      textInputs: Object.fromEntries(this._textInputs)
    };
  }
  /**
   * Deserialize state from persistence
   * @param {object} data - Serialized state
   */
  deserialize(data) {
    if (data.version !== 1) {
      console.warn("[ProgramState] Unknown serialization version:", data.version);
    }
    this._writeTargetOverrides = new Map(Object.entries(data.overrides?.writeTargets || {}));
    this._writeStepTargetOverrides = new Map(Object.entries(data.overrides?.writeStepTargets || {}));
    this._readSourceOverrides = new Map(Object.entries(data.overrides?.readSources || {}));
    this._read3dVolOverrides = new Map(Object.entries(data.overrides?.read3dVol || {}));
    this._read3dGeoOverrides = new Map(Object.entries(data.overrides?.read3dGeo || {}));
    this._write3dVolOverrides = new Map(Object.entries(data.overrides?.write3dVol || {}));
    this._write3dGeoOverrides = new Map(Object.entries(data.overrides?.write3dGeo || {}));
    this._renderTargetOverride = data.overrides?.renderTarget || null;
    this._mediaInputs = new Map(Object.entries(data.mediaInputs || {}));
    this._textInputs = new Map(Object.entries(data.textInputs || {}));
    if (data.dsl) {
      this.fromDsl(data.dsl);
    }
    for (const [key, savedState] of Object.entries(data.stepStates || {})) {
      const stepState = this._stepStates.get(key);
      if (stepState) {
        stepState.values = { ...stepState.values, ...savedState.values };
      }
    }
    this._applyToPipeline();
    this.emit("load", { structure: this._structure });
  }
  // =========================================================================
  // Validation and Helper Methods
  // =========================================================================
  /**
   * Validate and coerce a value based on parameter spec
   * @param {*} value - Value to validate
   * @param {object} spec - Parameter specification
   * @returns {*} Validated/coerced value
   * @private
   */
  _validateValue(value, spec) {
    if (!spec) return value;
    if (value && typeof value === "object" && (value.type === "Oscillator" || value._ast?.type === "Oscillator" || value.type === "Midi" || value._ast?.type === "Midi" || value.type === "Audio" || value._ast?.type === "Audio")) {
      return value;
    }
    switch (spec.type) {
      case "float":
        value = parseFloat(value);
        if (isNaN(value)) value = spec.default ?? 0;
        if (spec.min !== void 0) value = Math.max(spec.min, value);
        if (spec.max !== void 0) value = Math.min(spec.max, value);
        return value;
      case "int":
        value = parseInt(value, 10);
        if (isNaN(value)) value = spec.default ?? 0;
        if (spec.min !== void 0) value = Math.max(spec.min, value);
        if (spec.max !== void 0) value = Math.min(spec.max, value);
        return value;
      case "boolean":
        return Boolean(value);
      case "vec2":
        if (!Array.isArray(value)) return spec.default || [0, 0];
        return value.slice(0, 2).map((v) => parseFloat(v) || 0);
      case "vec3":
        if (!Array.isArray(value)) return spec.default || [0, 0, 0];
        return value.slice(0, 3).map((v) => parseFloat(v) || 0);
      case "vec4":
        if (!Array.isArray(value)) return spec.default || [0, 0, 0, 0];
        return value.slice(0, 4).map((v) => parseFloat(v) || 0);
      case "color":
        if (Array.isArray(value)) {
          return value.slice(0, 3).map((v) => parseFloat(v) || 0);
        }
        if (typeof value === "string" && value.startsWith("#")) {
          const hex = value.slice(1);
          return [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255
          ];
        }
        return spec.default || [0, 0, 0];
      default:
        return value;
    }
  }
  /**
   * Clone a value (for defaults)
   * @param {*} value - Value to clone
   * @returns {*} Cloned value
   * @private
   */
  _cloneValue(value) {
    if (Array.isArray(value)) return [...value];
    if (value && typeof value === "object") return { ...value };
    return value;
  }
  /**
   * Check if two structures match (same effects in same order)
   * @param {Array} a - First structure
   * @param {Array} b - Second structure
   * @returns {boolean} True if structures match
   * @private
   */
  _structuresMatch(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].effectKey !== b[i].effectKey) return false;
    }
    return true;
  }
  /**
   * Create an empty step state for a step key
   * @param {string} stepKey - Step identifier
   * @returns {StepState} Empty step state
   * @private
   */
  _createEmptyStepState(stepKey) {
    const match = stepKey.match(/^step_(\d+)$/);
    const stepIndex = match ? parseInt(match[1], 10) : 0;
    return {
      effectKey: "",
      effectDef: null,
      stepIndex,
      values: {}
    };
  }
  /**
   * Preserve values by occurrence for structure rebuilding
   * @returns {Map} Map of effectKey -> array of value objects
   * @private
   */
  _preserveValuesByOccurrence() {
    const preserved = /* @__PURE__ */ new Map();
    for (const [, stepState] of this._stepStates) {
      const effectKey = stepState.effectKey;
      if (!preserved.has(effectKey)) {
        preserved.set(effectKey, []);
      }
      preserved.get(effectKey).push({ ...stepState.values });
    }
    return preserved;
  }
  /**
   * Rebuild step states from new effect structure
   * @param {Array} effects - Effect info array from DSL parsing
   * @param {Map} preservedValues - Preserved values from previous structure
   * @private
   */
  _rebuildStepStates(effects2, preservedValues) {
    const newStepStates = /* @__PURE__ */ new Map();
    const occurrenceCounts = /* @__PURE__ */ new Map();
    for (const effect of effects2) {
      const stepKey = `step_${effect.stepIndex}`;
      const effectKey = effect.effectKey;
      const effectDef = getEffect(effectKey);
      const occurrence = occurrenceCounts.get(effectKey) || 0;
      occurrenceCounts.set(effectKey, occurrence + 1);
      const preservedForEffect = preservedValues.get(effectKey);
      const preservedVals = preservedForEffect?.[occurrence] || {};
      const values = {};
      if (effectDef?.globals) {
        for (const [paramName, spec] of Object.entries(effectDef.globals)) {
          if (spec.default !== void 0) {
            values[paramName] = this._cloneValue(spec.default);
          }
        }
      }
      if (effect.args) {
        for (const [paramName, value] of Object.entries(effect.args)) {
          values[paramName] = this._cloneValue(value);
        }
      }
      for (const [paramName, value] of Object.entries(preservedVals)) {
        if (effect.args && paramName in effect.args) {
          continue;
        }
        if (paramName === "_skip") {
          continue;
        }
        if (paramName.startsWith("_") || value !== void 0) {
          const dslArg = effect.args?.[paramName];
          if (dslArg && typeof dslArg === "object" && (dslArg.type === "Oscillator" || dslArg._ast?.type === "Oscillator" || dslArg.type === "Midi" || dslArg._ast?.type === "Midi" || dslArg.type === "Audio" || dslArg._ast?.type === "Audio")) {
            continue;
          }
          values[paramName] = this._cloneValue(value);
        }
      }
      newStepStates.set(stepKey, {
        effectKey,
        effectDef,
        stepIndex: effect.stepIndex,
        values
      });
    }
    this._stepStates = newStepStates;
  }
  /**
   * Update values from DSL without rebuilding structure
   * @param {Array} effects - Effect info array from DSL parsing
   * @private
   */
  _updateValuesFromDsl(effects2) {
    for (const effect of effects2) {
      const stepKey = `step_${effect.stepIndex}`;
      const stepState = this._stepStates.get(stepKey);
      if (stepState && effect.args) {
        for (const [paramName, value] of Object.entries(effect.args)) {
          const currentValue = stepState.values[paramName];
          if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
            stepState.values[paramName] = this._cloneValue(value);
          }
        }
      }
    }
  }
  /**
   * Build parameter overrides for DSL generation
   * @returns {object} Parameter overrides keyed by step index
   * @private
   */
  _buildParameterOverrides() {
    const overrides = {};
    for (const [stepKey, stepState] of this._stepStates) {
      const match = stepKey.match(/^step_(\d+)$/);
      if (!match) continue;
      const stepIndex = parseInt(match[1], 10);
      const effectInfo = this._structure[stepIndex];
      const stepOverrides = {};
      const globals = stepState.effectDef?.globals;
      for (const [paramName, value] of Object.entries(stepState.values)) {
        if (paramName.startsWith("_") && paramName !== "_skip") continue;
        const spec = globals?.[paramName];
        if (spec?.ui?.control === false) continue;
        if (spec?.ui?.control === "button") continue;
        const rawKwarg = effectInfo?.rawKwargs?.[paramName];
        const isAutomatedInDsl = rawKwarg && typeof rawKwarg === "object" && (rawKwarg.type === "Oscillator" || rawKwarg.type === "Midi" || rawKwarg.type === "Audio");
        if (isAutomatedInDsl) {
          continue;
        }
        if (value && typeof value === "object" && value._varRef) {
          stepOverrides[paramName] = { _varRef: value._varRef };
        } else {
          stepOverrides[paramName] = value;
        }
      }
      overrides[stepIndex] = stepOverrides;
    }
    return overrides;
  }
  /**
   * Apply routing overrides to compiled DSL structure
   * @param {object} compiled - Compiled DSL object
   * @private
   */
  _applyRoutingOverridesToCompiled(compiled) {
    if (!compiled?.plans) return;
    for (const [planIndex, target] of this._writeTargetOverrides) {
      const plan = compiled.plans[planIndex];
      if (plan) {
        const isOutput = target.startsWith("o");
        const ref = { kind: isOutput ? "output" : "feedback", name: target };
        plan.write = ref;
        if (plan.chain) {
          const lastStep = plan.chain[plan.chain.length - 1];
          if (lastStep?.builtin && lastStep.op === "_write" && lastStep.args) {
            lastStep.args.tex = ref;
          }
        }
      }
    }
    if (this._writeStepTargetOverrides.size > 0) {
      let globalStepIndex = 0;
      for (const plan of compiled.plans) {
        if (!plan.chain) continue;
        for (const step of plan.chain) {
          if (step.builtin && step.op === "_write" && this._writeStepTargetOverrides.has(globalStepIndex)) {
            const target = this._writeStepTargetOverrides.get(globalStepIndex);
            const isOutput = target.startsWith("o");
            step.args.tex = {
              kind: isOutput ? "output" : "feedback",
              name: target
            };
          }
          globalStepIndex++;
        }
      }
    }
    if (this._readSourceOverrides.size > 0) {
      let globalStepIndex = 0;
      for (const plan of compiled.plans) {
        if (!plan.chain) continue;
        for (const step of plan.chain) {
          if (step.builtin && step.op === "_read" && this._readSourceOverrides.has(globalStepIndex)) {
            const source = this._readSourceOverrides.get(globalStepIndex);
            const isOutput = source.startsWith("o");
            step.args.tex = {
              kind: isOutput ? "output" : "feedback",
              name: source
            };
          }
          globalStepIndex++;
        }
      }
    }
    if (this._read3dVolOverrides.size > 0 || this._read3dGeoOverrides.size > 0) {
      let globalStepIndex = 0;
      for (const plan of compiled.plans) {
        if (!plan.chain) continue;
        for (const step of plan.chain) {
          if (step.builtin && step.op === "_read3d") {
            if (this._read3dVolOverrides.has(globalStepIndex)) {
              const volName = this._read3dVolOverrides.get(globalStepIndex);
              step.args.tex3d = { kind: "vol", name: volName };
            }
            if (this._read3dGeoOverrides.has(globalStepIndex)) {
              const geoName = this._read3dGeoOverrides.get(globalStepIndex);
              step.args.geo = { kind: "geo", name: geoName };
            }
          }
          globalStepIndex++;
        }
      }
    }
    if (this._write3dVolOverrides.size > 0 || this._write3dGeoOverrides.size > 0) {
      let globalStepIndex = 0;
      for (const plan of compiled.plans) {
        if (!plan.chain) continue;
        for (const step of plan.chain) {
          if (step.builtin && step.op === "_write3d") {
            if (this._write3dVolOverrides.has(globalStepIndex)) {
              const volName = this._write3dVolOverrides.get(globalStepIndex);
              step.args.tex3d = { kind: "vol", name: volName };
            }
            if (this._write3dGeoOverrides.has(globalStepIndex)) {
              const geoName = this._write3dGeoOverrides.get(globalStepIndex);
              step.args.geo = { kind: "geo", name: geoName };
            }
          }
          globalStepIndex++;
        }
      }
    }
    if (this._renderTargetOverride) {
      if (typeof compiled.render === "string") {
        compiled.render = this._renderTargetOverride;
      } else if (compiled.render) {
        compiled.render.target = this._renderTargetOverride;
      }
    }
  }
};

// shaders/src/index.js
async function createNoisemakerPipeline(canvas, source, options = {}) {
  const width = canvas.width || 800;
  const height = canvas.height || 600;
  return createRuntime(source, {
    canvas,
    width,
    height,
    preferWebGPU: options.preferWebGPU ?? true
  });
}
var VERSION = "0.1.0";
var PHASE = 4;

// demo/shaders/lib/control-factory.js
var ControlFactory = class {
  /**
   * Create a select/dropdown control
   * @param {object} options
   * @param {Array<{value: *, label: string, data?: object}>} options.choices - Available options
   * @param {*} options.value - Initial selected value
   * @param {string} [options.className] - CSS class name
   * @returns {ControlHandle}
   */
  createSelect(options) {
    const select = document.createElement("select");
    if (options.className) select.className = options.className;
    select.name = options.name || "select";
    let selectedIndex = 0;
    options.choices.forEach((choice, i) => {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = choice.label;
      if (choice.data) {
        for (const [key, val] of Object.entries(choice.data)) {
          option.dataset[key] = typeof val === "object" ? JSON.stringify(val) : val;
        }
      }
      if (this._valuesEqual(choice.value, options.value)) {
        selectedIndex = i;
      }
      select.appendChild(option);
    });
    select.selectedIndex = selectedIndex;
    let currentChoices = options.choices;
    return {
      element: select,
      getValue: () => {
        return currentChoices[select.selectedIndex]?.value;
      },
      setValue: (v) => {
        for (let i = 0; i < currentChoices.length; i++) {
          if (this._valuesEqual(currentChoices[i].value, v)) {
            select.selectedIndex = i;
            return;
          }
        }
      },
      getSelectedData: () => {
        const opt = select.options[select.selectedIndex];
        return opt?.dataset || {};
      },
      /**
       * Update the available choices dynamically
       * @param {Array<{value: *, label: string, data?: object}>} newChoices
       */
      setChoices: (newChoices) => {
        select.innerHTML = "";
        currentChoices = newChoices;
        newChoices.forEach((choice, i) => {
          const option = document.createElement("option");
          option.value = i;
          option.textContent = choice.label;
          if (choice.data) {
            for (const [key, val] of Object.entries(choice.data)) {
              option.dataset[key] = typeof val === "object" ? JSON.stringify(val) : val;
            }
          }
          select.appendChild(option);
        });
        select.selectedIndex = 0;
      }
    };
  }
  /**
   * Create a slider/range control
   * @param {object} options
   * @param {number} options.value - Initial value
   * @param {number} options.min - Minimum value
   * @param {number} options.max - Maximum value
   * @param {number} [options.step] - Step increment
   * @param {string} [options.className] - CSS class name
   * @returns {ControlHandle}
   */
  createSlider(options) {
    const slider = document.createElement("input");
    slider.type = "range";
    if (options.className) slider.className = options.className;
    slider.min = options.min;
    slider.max = options.max;
    if (options.step !== void 0) slider.step = options.step;
    slider.value = options.value;
    return {
      element: slider,
      getValue: () => parseFloat(slider.value),
      setValue: (v) => {
        slider.value = v;
      }
    };
  }
  /**
   * Create a toggle/switch control for boolean values
   * @param {object} options
   * @param {boolean} options.value - Initial checked state
   * @param {string} [options.className] - CSS class name
   * @returns {ControlHandle}
   */
  createToggle(options) {
    const toggle = document.createElement("toggle-switch");
    toggle.checked = !!options.value;
    return {
      element: toggle,
      getValue: () => toggle.checked,
      setValue: (v) => {
        toggle.checked = !!v;
      }
    };
  }
  /**
   * Create a color picker control
   * @param {object} options
   * @param {Array<number>} options.value - RGB or RGBA array (0-1 range)
   * @param {boolean} [options.hasAlpha] - Whether to include alpha channel
   * @param {string} [options.className] - CSS class name
   * @returns {ControlHandle}
   */
  createColorPicker(options) {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    if (options.className) colorInput.className = options.className;
    const toHex = (arr) => {
      if (!Array.isArray(arr)) return "#000000";
      const r = Math.round((arr[0] || 0) * 255).toString(16).padStart(2, "0");
      const g = Math.round((arr[1] || 0) * 255).toString(16).padStart(2, "0");
      const b = Math.round((arr[2] || 0) * 255).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    };
    colorInput.value = toHex(options.value);
    let currentAlpha = Array.isArray(options.value) && options.value.length >= 4 ? options.value[3] : 1;
    return {
      element: colorInput,
      getValue: () => {
        const hex = colorInput.value;
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return options.hasAlpha ? [r, g, b, currentAlpha] : [r, g, b];
      },
      setValue: (v) => {
        colorInput.value = toHex(v);
        if (options.hasAlpha && Array.isArray(v) && v.length >= 4) {
          currentAlpha = v[3];
        }
      }
    };
  }
  /**
   * Create a 2D vector picker control
   * @param {object} options
   * @param {Array<number>} options.value - [x, y] array
   * @param {number} [options.min] - Minimum value for both axes (default: -1)
   * @param {number} [options.max] - Maximum value for both axes (default: 1)
   * @param {number} [options.step] - Step increment (default: 0.01)
   * @returns {ControlHandle}
   */
  createVector2dPicker(options) {
    const container = document.createElement("div");
    container.className = "vector-picker-fallback";
    const min = options.min ?? -1;
    const max = options.max ?? 1;
    const step = options.step ?? 0.01;
    const val = Array.isArray(options.value) ? options.value : [0, 0];
    const sliders = ["x", "y"].map((axis, i) => {
      const row = document.createElement("div");
      const label = document.createElement("span");
      label.textContent = axis + ": ";
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = val[i] || 0;
      row.appendChild(label);
      row.appendChild(slider);
      container.appendChild(row);
      return slider;
    });
    return {
      element: container,
      getValue: () => sliders.map((s) => parseFloat(s.value)),
      setValue: (v) => {
        if (Array.isArray(v)) {
          sliders.forEach((s, i) => {
            s.value = v[i] ?? 0;
          });
        }
      }
    };
  }
  /**
   * Create a 3D vector picker control
   * @param {object} options
   * @param {Array<number>} options.value - [x, y, z] array
   * @param {number} [options.min] - Minimum value for all axes (default: -1)
   * @param {number} [options.max] - Maximum value for all axes (default: 1)
   * @param {number} [options.step] - Step increment (default: 0.01)
   * @returns {ControlHandle}
   */
  createVector3dPicker(options) {
    const container = document.createElement("div");
    container.className = "vector-picker-fallback";
    const min = options.min ?? -1;
    const max = options.max ?? 1;
    const step = options.step ?? 0.01;
    const val = Array.isArray(options.value) ? options.value : [0, 0, 0];
    const sliders = ["x", "y", "z"].map((axis, i) => {
      const row = document.createElement("div");
      const label = document.createElement("span");
      label.textContent = axis + ": ";
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = min;
      slider.max = max;
      slider.step = step;
      slider.value = val[i] || 0;
      row.appendChild(label);
      row.appendChild(slider);
      container.appendChild(row);
      return slider;
    });
    return {
      element: container,
      getValue: () => sliders.map((s) => parseFloat(s.value)),
      setValue: (v) => {
        if (Array.isArray(v)) {
          sliders.forEach((s, i) => {
            s.value = v[i] ?? 0;
          });
        }
      }
    };
  }
  /**
   * Create a button control (momentary trigger)
   * @param {object} options
   * @param {string} options.label - Button text
   * @param {string} [options.className] - CSS class name
   * @param {string} [options.tooltip] - Tooltip text
   * @returns {ControlHandle}
   */
  createButton(options) {
    const button = document.createElement("button");
    button.textContent = options.label;
    if (options.className) button.className = options.className;
    if (options.tooltip) {
      button.classList.add("tooltip");
      button.dataset.title = options.tooltip;
    }
    return {
      element: button,
      getValue: () => false,
      setValue: () => {
      }
    };
  }
  /**
   * Create a text display element (for read-only values like "automatic")
   * @param {object} options
   * @param {string} options.text - Display text
   * @param {string} [options.className] - CSS class name
   * @returns {ControlHandle}
   */
  createTextDisplay(options) {
    const span = document.createElement("span");
    span.textContent = options.text;
    if (options.className) span.className = options.className;
    return {
      element: span,
      getValue: () => options.text,
      setValue: (v) => {
        span.textContent = v;
      }
    };
  }
  /**
   * Create a value display element (for showing slider values, etc.)
   * @param {object} options
   * @param {string|number} options.value - Display value
   * @param {string} [options.className] - CSS class name
   * @returns {ControlHandle}
   */
  createValueDisplay(options) {
    const span = document.createElement("span");
    if (options.className) span.className = options.className;
    span.textContent = options.value;
    return {
      element: span,
      getValue: () => span.textContent,
      setValue: (v) => {
        span.textContent = v;
      }
    };
  }
  /**
   * Helper to compare values for equality (handles objects, arrays, null)
   * @private
   */
  _valuesEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a === "object") {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }
};
var defaultControlFactory = new ControlFactory();

// demo/shaders/lib/demo-ui.js
var showSuccess = (m) => console.log(m);
var showError = (m) => console.error(m);
var showInfo = (m) => console.log(m);
function setToastProvider(provider) {
  if (provider.showSuccess) showSuccess = provider.showSuccess;
  if (provider.showError) showError = provider.showError;
  if (provider.showInfo) showInfo = provider.showInfo;
}
function camelToSpaceCase(str) {
  if (typeof str !== "string") return "";
  return str.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").toLowerCase();
}
function formatEnumName2(name) {
  const sanitized = sanitizeEnumName(name);
  if (sanitized !== null) {
    return sanitized;
  }
  return `"${name.replace(/"/g, '\\"')}"`;
}
function createEffectDefCallback(getEffect2) {
  return (effectName, namespace) => {
    let def = getEffect2(effectName);
    if (def) return def;
    if (effectName.includes(".")) {
      def = getEffect2(effectName.replace(".", "/"));
      if (def) return def;
    }
    if (namespace) {
      def = getEffect2(`${namespace}/${effectName}`) || getEffect2(`${namespace}.${effectName}`);
      if (def) return def;
    }
    return null;
  };
}
function extractEffectNamesFromDsl(dsl, manifest) {
  const effects2 = [];
  if (!dsl || typeof dsl !== "string") return effects2;
  const lines = dsl.split("\n");
  let searchNamespaces = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const statements = trimmed.split(";").map((s) => s.trim()).filter((s) => s);
    for (const stmt of statements) {
      if (stmt.startsWith("search ")) {
        searchNamespaces = stmt.slice(7).split(",").map((s) => s.trim());
        continue;
      }
      if (!stmt || stmt.startsWith("//")) continue;
      const fromPattern = /\bfrom\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
      let fromMatch;
      while ((fromMatch = fromPattern.exec(stmt)) !== null) {
        const namespace = fromMatch[1];
        const name = fromMatch[2];
        const effectId = `${namespace}/${name}`;
        if (manifest[effectId] && !effects2.find((e) => e.effectId === effectId)) {
          effects2.push({ effectId, namespace, name });
        }
      }
      const callPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*\(/g;
      let match;
      while ((match = callPattern.exec(stmt)) !== null) {
        const fullName = match[1];
        let namespace = null;
        let name = fullName;
        if (fullName.includes(".")) {
          const parts = fullName.split(".");
          namespace = parts[0];
          name = parts[1];
        }
        const builtins = ["read", "out", "vec2", "vec3", "vec4", "from"];
        if (builtins.includes(name)) continue;
        if (!namespace && searchNamespaces.length > 0) {
          for (const ns of searchNamespaces) {
            const testId = `${ns}/${name}`;
            if (manifest[testId]) {
              namespace = ns;
              break;
            }
          }
        }
        if (!namespace) {
          for (const ns of ["classicNoisedeck", "filter", "mixer", "synth"]) {
            const testId = `${ns}/${name}`;
            if (manifest[testId]) {
              namespace = ns;
              break;
            }
          }
        }
        if (namespace) {
          const effectId = `${namespace}/${name}`;
          if (!effects2.find((e) => e.effectId === effectId)) {
            effects2.push({ effectId, namespace, name });
          }
        }
      }
    }
  }
  return effects2;
}
function getBackendFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("backend");
}
function getUseBundlesFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("bundles") === "1" || params.get("bundles") === "true";
}
function getEffectFromURL() {
  const params = new URLSearchParams(window.location.search);
  const effectParam = params.get("effect");
  if (!effectParam) return null;
  const parts = effectParam.split(".");
  if (parts.length === 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return null;
}
var UIController = class {
  /**
   * Create a new UIController instance
   * @param {CanvasRenderer} renderer - The canvas renderer instance
   * @param {object} options - UI element references
   * @param {HTMLSelectElement} options.effectSelect - Effect selector element
   * @param {HTMLTextAreaElement} options.dslEditor - DSL editor element
   * @param {HTMLElement} options.controlsContainer - Effect controls container
   * @param {HTMLElement} options.statusEl - Status message element
   * @param {HTMLElement} [options.fpsCounterEl] - FPS counter display element
   * @param {HTMLDialogElement} [options.loadingDialog] - Loading dialog element
   * @param {HTMLElement} [options.loadingDialogTitle] - Loading dialog title
   * @param {HTMLElement} [options.loadingDialogStatus] - Loading dialog status
   * @param {HTMLElement} [options.loadingDialogProgress] - Loading dialog progress bar
   * @param {function} [options.onControlChange] - Callback when a control value changes
   * @param {function} [options.onEffectControlsReset] - Callback(stepIndex, effectElement, effectDef) after a effect's controls are rebuilt via reset button
   * @param {ControlFactory} [options.controlFactory] - Custom control factory for web components
   */
  constructor(renderer, options = {}) {
    this._renderer = renderer;
    this._controlFactory = options.controlFactory || defaultControlFactory;
    this._effectSelect = options.effectSelect;
    this._dslEditor = options.dslEditor;
    this._controlsContainer = options.controlsContainer;
    this._statusEl = options.statusEl;
    this._fpsCounterEl = options.fpsCounterEl;
    this._loadingDialog = options.loadingDialog;
    this._loadingDialogTitle = options.loadingDialogTitle;
    this._loadingDialogStatus = options.loadingDialogStatus;
    this._loadingDialogProgress = options.loadingDialogProgress;
    this._onControlChangeCallback = options.onControlChange || null;
    this._onRequestRecompileCallback = options.onRequestRecompile || null;
    this._onEffectControlsResetCallback = options.onEffectControlsReset || null;
    this._parameterValues = {};
    this._dependentControls = [];
    this._programState = new ProgramState({ renderer });
    this._programState.on("change", () => {
      this._onControlChangeCallback?.();
    });
    this._programState.on("recompileNeeded", () => {
      this._updateDslFromEffectParams();
      this._recompilePipeline();
    });
    this._shaderOverrides = {};
    this._parsedDslStructure = [];
    this._allEffects = [];
    this._mediaInputs = /* @__PURE__ */ new Map();
    this._mediaUpdateFrame = null;
    this._textInputs = /* @__PURE__ */ new Map();
    this._meshInputs = /* @__PURE__ */ new Map();
    this._loadingState = {
      queue: [],
      completed: 0,
      total: 0
    };
    this._boundFormatValue = (value, spec) => formatValue(value, spec, { enums: this._renderer.enums });
    this._startMediaUpdateLoop();
  }
  /** Push current step parameter values to the renderer pipeline */
  _applyStepParams() {
    this._renderer.applyStepParameterValues?.(this._programState.getAllStepValues());
  }
  // =========================================================================
  // ProgramState Access
  // =========================================================================
  /**
   * Get the ProgramState instance for decoupled state management
   * @returns {ProgramState}
   */
  get programState() {
    return this._programState;
  }
  // =========================================================================
  // Media Input Management
  // =========================================================================
  /**
   * Start the continuous media update loop
   * @private
   */
  _startMediaUpdateLoop() {
    if (this._mediaUpdateFrame) return;
    const update = () => {
      this._updateAllMediaTextures();
      this._mediaUpdateFrame = requestAnimationFrame(update);
    };
    update();
  }
  /**
   * Stop the media update loop
   * @private
   */
  _stopMediaUpdateLoop() {
    if (this._mediaUpdateFrame) {
      cancelAnimationFrame(this._mediaUpdateFrame);
      this._mediaUpdateFrame = null;
    }
  }
  /**
   * Re-upload all active media textures (e.g., after backend switch destroys GPU resources)
   */
  reuploadAllMediaTextures() {
    for (const [stepIndex, media] of this._mediaInputs) {
      if (!media.source) continue;
      this._updateMediaTexture(stepIndex);
    }
    this._applyStepParams();
  }
  /**
   * Update all media textures that need continuous updates (video/camera)
   * @private
   */
  _updateAllMediaTextures() {
    let anyUpdated = false;
    for (const [stepIndex, media] of this._mediaInputs) {
      if (!media.source) continue;
      if (media.source instanceof HTMLVideoElement) {
        if (!media.source.paused && media.source.videoWidth > 0) {
          this._updateMediaTexture(stepIndex);
          anyUpdated = true;
        }
      }
    }
    if (anyUpdated) {
      this._applyStepParams();
    }
  }
  /**
   * Update a single media texture
   * @param {number} stepIndex - Step index
   * @private
   */
  _updateMediaTexture(stepIndex) {
    const media = this._mediaInputs.get(stepIndex);
    if (!media || !media.source || !this._renderer._pipeline) return;
    const texId = media.textureId;
    const resultOrPromise = this._renderer.updateTextureFromSource(texId, media.source, { flipY: false });
    const applySize = (result) => {
      if (result.width > 0 && result.height > 0) {
        const effectKey = `step_${stepIndex}`;
        this._programState.setValue(effectKey, "imageSize", [result.width, result.height]);
      }
    };
    if (resultOrPromise && typeof resultOrPromise.then === "function") {
      resultOrPromise.then(applySize).catch(() => {
      });
    } else {
      applySize(resultOrPromise);
    }
  }
  /**
   * Create media input controls section for an effect
   * @param {number} stepIndex - Step index for this effect
   * @param {string} textureId - Texture ID (e.g., 'imageTex')
   * @param {object} effectDef - Effect definition
   * @param {boolean} skipDefaultLoad - If true, skip loading the default test image
   * @returns {HTMLElement} Media input controls container
   * @private
   */
  _createMediaInputSection(stepIndex, textureId, effectDef, skipDefaultLoad = false) {
    const section = document.createElement("div");
    section.className = "media-input-section";
    if (!this._mediaInputs.has(stepIndex)) {
      this._mediaInputs.set(stepIndex, {
        source: null,
        stream: null,
        videoEl: null,
        imageEl: null,
        textureId
      });
    }
    const sourceGroup = document.createElement("div");
    sourceGroup.className = "control-group";
    const sourceLabel = document.createElement("span");
    sourceLabel.className = "control-label";
    sourceLabel.textContent = "media source";
    sourceGroup.appendChild(sourceLabel);
    const sourceRadios = document.createElement("div");
    sourceRadios.className = "media-source-radios";
    const radioName = `media-source-${stepIndex}`;
    ["file", "camera"].forEach((type) => {
      const radioLabel = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = radioName;
      radio.value = type;
      radio.checked = type === "file";
      radioLabel.appendChild(radio);
      radioLabel.appendChild(document.createTextNode(type));
      sourceRadios.appendChild(radioLabel);
    });
    sourceGroup.appendChild(sourceRadios);
    section.appendChild(sourceGroup);
    const fileGroup = document.createElement("div");
    fileGroup.className = "control-group media-file-group";
    fileGroup.dataset.stepIndex = stepIndex;
    const fileLabel = document.createElement("span");
    fileLabel.className = "control-label";
    fileLabel.textContent = "media file";
    fileGroup.appendChild(fileLabel);
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*,video/*";
    fileInput.className = "media-file-input";
    fileInput.dataset.stepIndex = stepIndex;
    fileInput.dataset.textureId = textureId;
    fileInput.addEventListener("change", (e) => this._handleMediaFileChange(e, stepIndex));
    fileGroup.appendChild(fileInput);
    section.appendChild(fileGroup);
    const cameraGroup = document.createElement("div");
    cameraGroup.className = "control-group media-camera-group";
    cameraGroup.style.display = "none";
    cameraGroup.dataset.stepIndex = stepIndex;
    const cameraLabel = document.createElement("span");
    cameraLabel.className = "control-label";
    cameraLabel.textContent = "camera";
    cameraGroup.appendChild(cameraLabel);
    const cameraHandle = this._controlFactory.createSelect({
      choices: [{ value: "", label: "select camera..." }],
      value: "",
      className: "hf-input"
    });
    const cameraSelect = cameraHandle.element;
    cameraSelect.dataset.stepIndex = stepIndex;
    cameraGroup.appendChild(cameraSelect);
    const cameraButtons = document.createElement("div");
    cameraButtons.className = "media-camera-buttons";
    const startBtn = document.createElement("button");
    startBtn.className = "hf-action-btn";
    startBtn.textContent = "start";
    startBtn.addEventListener("click", () => this._startCamera(stepIndex, cameraHandle.getValue()));
    const stopBtn = document.createElement("button");
    stopBtn.className = "hf-action-btn";
    stopBtn.textContent = "stop";
    stopBtn.disabled = true;
    stopBtn.addEventListener("click", () => this._stopCamera(stepIndex));
    cameraButtons.appendChild(startBtn);
    cameraButtons.appendChild(stopBtn);
    cameraGroup.appendChild(cameraButtons);
    cameraGroup._startBtn = startBtn;
    cameraGroup._stopBtn = stopBtn;
    cameraGroup._select = cameraSelect;
    cameraGroup._selectHandle = cameraHandle;
    section.appendChild(cameraGroup);
    const statusGroup = document.createElement("div");
    statusGroup.className = "control-group";
    const statusLabel = document.createElement("span");
    statusLabel.className = "control-label";
    statusLabel.textContent = "status";
    statusGroup.appendChild(statusLabel);
    const statusSpan = document.createElement("span");
    statusSpan.className = "media-status";
    statusSpan.textContent = "no media loaded";
    statusSpan.dataset.stepIndex = stepIndex;
    statusGroup.appendChild(statusSpan);
    section.appendChild(statusGroup);
    const video = document.createElement("video");
    video.style.display = "none";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    section.appendChild(video);
    const image = document.createElement("img");
    image.style.display = "none";
    section.appendChild(image);
    const mediaState = this._mediaInputs.get(stepIndex);
    mediaState.videoEl = video;
    mediaState.imageEl = image;
    mediaState.statusEl = statusSpan;
    mediaState.cameraGroup = cameraGroup;
    mediaState.fileGroup = fileGroup;
    sourceRadios.addEventListener("change", (e) => {
      if (e.target.value === "camera") {
        fileGroup.style.display = "none";
        cameraGroup.style.display = "block";
        this._populateCameraList(stepIndex, cameraHandle);
      } else {
        fileGroup.style.display = "block";
        cameraGroup.style.display = "none";
        this._stopCamera(stepIndex);
        const media = this._mediaInputs.get(stepIndex);
        if (media?.imageEl?.complete && media.imageEl.naturalWidth > 0) {
          media.source = media.imageEl;
          this._updateMediaTexture(stepIndex);
          this._applyStepParams();
        }
      }
    });
    if (!skipDefaultLoad) {
      this._loadDefaultMediaImage(stepIndex);
    }
    return section;
  }
  /**
   * Create mesh input section for effects with externalMesh property.
   * Provides a URL input field and loads OBJ files.
   * @private
   * @param {number} stepIndex - Step index in the DSL program
   * @param {string} meshId - Target mesh surface ID (e.g., 'mesh0')
   * @returns {HTMLElement}
   */
  _createMeshInputSection(stepIndex, meshId, builtinMeshes) {
    const section = document.createElement("div");
    section.className = "mesh-input-section";
    if (!this._meshInputs.has(stepIndex)) {
      this._meshInputs.set(stepIndex, {
        meshId,
        loaded: false,
        vertexCount: 0
      });
    }
    if (builtinMeshes) {
      const shapeGroup = document.createElement("div");
      shapeGroup.className = "control-group";
      const shapeLabel = document.createElement("span");
      shapeLabel.className = "control-label";
      shapeLabel.textContent = "shape";
      shapeGroup.appendChild(shapeLabel);
      const select = document.createElement("select");
      select.className = "mesh-shape-select";
      const noneOption = document.createElement("option");
      noneOption.value = "";
      noneOption.textContent = "(custom file)";
      select.appendChild(noneOption);
      for (const name of Object.keys(builtinMeshes)) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      }
      select.addEventListener("change", () => {
        const shapeName = select.value;
        if (shapeName && builtinMeshes[shapeName]) {
          this._loadBuiltinMesh(stepIndex, shapeName, builtinMeshes[shapeName]);
        }
      });
      shapeGroup.appendChild(select);
      section.appendChild(shapeGroup);
    }
    const fileGroup = document.createElement("div");
    fileGroup.className = "control-group";
    const fileLabel = document.createElement("span");
    fileLabel.className = "control-label";
    fileLabel.textContent = "OBJ file";
    fileGroup.appendChild(fileLabel);
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".obj";
    fileInput.className = "mesh-file-input";
    fileInput.dataset.stepIndex = stepIndex;
    fileInput.dataset.meshId = meshId;
    fileInput.addEventListener("change", (e) => this._handleMeshFileChange(e, stepIndex));
    fileGroup.appendChild(fileInput);
    section.appendChild(fileGroup);
    const statusGroup = document.createElement("div");
    statusGroup.className = "control-group";
    const statusLabel = document.createElement("span");
    statusLabel.className = "control-label";
    statusLabel.textContent = "status";
    statusGroup.appendChild(statusLabel);
    const statusSpan = document.createElement("span");
    statusSpan.className = "mesh-status";
    statusSpan.textContent = "no mesh loaded";
    statusSpan.dataset.stepIndex = stepIndex;
    statusGroup.appendChild(statusSpan);
    section.appendChild(statusGroup);
    const meshState = this._meshInputs.get(stepIndex);
    meshState.statusEl = statusSpan;
    if (builtinMeshes) {
      const builtinNames = Object.keys(builtinMeshes);
      if (builtinNames.length > 0) {
        const defaultShape = builtinNames[0];
        const select = section.querySelector(".mesh-shape-select");
        if (select) select.value = defaultShape;
        this._loadBuiltinMesh(stepIndex, defaultShape, builtinMeshes[defaultShape]);
      }
    }
    return section;
  }
  /**
   * Handle mesh file selection
   * @private
   */
  async _handleMeshFileChange(e, stepIndex) {
    const file = e.target.files[0];
    if (!file) return;
    const meshState = this._meshInputs.get(stepIndex);
    if (!meshState) return;
    meshState.statusEl.textContent = "loading...";
    try {
      const text = await file.text();
      const result = await this._renderer.loadOBJFromString(text, meshState.meshId);
      if (result.success) {
        meshState.loaded = true;
        meshState.vertexCount = result.vertexCount;
        meshState.statusEl.textContent = `${file.name}: ${result.vertexCount} vertices`;
      } else {
        meshState.statusEl.textContent = `error: ${result.error || "unknown"}`;
      }
    } catch (err) {
      meshState.statusEl.textContent = `error: ${err.message}`;
    }
  }
  /**
   * Load a built-in mesh from a bundled OBJ file
   * @private
   */
  async _loadBuiltinMesh(stepIndex, shapeName, relativePath) {
    const meshState = this._meshInputs.get(stepIndex);
    if (!meshState) return;
    meshState.statusEl.textContent = "loading...";
    try {
      const basePath = this._renderer._basePath || "../../shaders";
      const url = `${basePath}/${relativePath}`;
      const result = await this._renderer.loadOBJFromURL(url, meshState.meshId);
      if (result.success) {
        meshState.loaded = true;
        meshState.vertexCount = result.vertexCount;
        meshState.statusEl.textContent = `${shapeName}: ${result.vertexCount} vertices`;
      } else {
        meshState.statusEl.textContent = `error: ${result.error || "unknown"}`;
      }
    } catch (err) {
      meshState.statusEl.textContent = `error: ${err.message}`;
    }
  }
  /**
   * Handle media file change
   * @private
   */
  _handleMediaFileChange(e, stepIndex) {
    const file = e.target.files[0];
    if (!file) return;
    const media = this._mediaInputs.get(stepIndex);
    if (!media) return;
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      media.videoEl.src = url;
      media.videoEl.load();
      media.videoEl.onloadedmetadata = () => {
        media.source = media.videoEl;
        media.statusEl.textContent = `video: ${media.videoEl.videoWidth}x${media.videoEl.videoHeight}`;
        media.videoEl.play();
        this._updateMediaTexture(stepIndex);
        this._applyStepParams();
      };
    } else if (file.type.startsWith("image/")) {
      media.imageEl.src = url;
      media.imageEl.onload = () => {
        media.source = media.imageEl;
        media.statusEl.textContent = `image: ${media.imageEl.naturalWidth}x${media.imageEl.naturalHeight}`;
        this._updateMediaTexture(stepIndex);
        this._applyStepParams();
      };
    }
  }
  /**
   * Populate camera list for a step
   * @private
   * @param {number} stepIndex - The step index
   * @param {object} selectHandle - The ControlHandle from createSelect
   */
  async _populateCameraList(stepIndex, selectHandle) {
    const media = this._mediaInputs.get(stepIndex);
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((track) => track.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      const choices = [{ value: "", label: "select camera..." }];
      videoDevices.forEach((device, idx) => {
        choices.push({
          value: device.deviceId,
          label: device.label || `Camera ${idx + 1}`
        });
      });
      selectHandle.setChoices(choices);
      if (media?.statusEl) {
        media.statusEl.textContent = videoDevices.length > 0 ? `${videoDevices.length} camera(s) found` : "no cameras found";
      }
    } catch (err) {
      console.error("Failed to access camera:", err);
      if (media?.statusEl) {
        media.statusEl.textContent = `camera error: ${err.message}`;
      }
      selectHandle.setChoices([{ value: "", label: "camera access denied" }]);
    }
  }
  /**
   * Start camera for a step
   * @private
   */
  async _startCamera(stepIndex, deviceId) {
    if (!deviceId) {
      const media2 = this._mediaInputs.get(stepIndex);
      if (media2?.statusEl) {
        media2.statusEl.textContent = "please select a camera";
      }
      return;
    }
    const media = this._mediaInputs.get(stepIndex);
    if (!media) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      media.stream = stream;
      media.videoEl.srcObject = stream;
      await media.videoEl.play();
      media.source = media.videoEl;
      media.statusEl.textContent = `camera: ${media.videoEl.videoWidth}x${media.videoEl.videoHeight}`;
      if (media.cameraGroup) {
        media.cameraGroup._startBtn.disabled = true;
        media.cameraGroup._stopBtn.disabled = false;
      }
      this._updateMediaTexture(stepIndex);
      this._applyStepParams();
    } catch (err) {
      console.error("Failed to start camera:", err);
      media.statusEl.textContent = `camera error: ${err.message}`;
    }
  }
  /**
   * Stop camera for a step
   * @private
   */
  _stopCamera(stepIndex) {
    const media = this._mediaInputs.get(stepIndex);
    if (!media) return;
    if (media.stream) {
      media.stream.getTracks().forEach((track) => track.stop());
      media.stream = null;
    }
    media.videoEl.srcObject = null;
    media.source = null;
    media.statusEl.textContent = "camera stopped";
    if (media.cameraGroup) {
      media.cameraGroup._startBtn.disabled = false;
      media.cameraGroup._stopBtn.disabled = true;
    }
  }
  /**
   * Stop all cameras and clean up media state
   * @param {boolean} preserveState - If true, only stop streams but keep state for restoration
   */
  stopAllMedia(preserveState = false) {
    for (const [, media] of this._mediaInputs) {
      if (media.stream) {
        media.stream.getTracks().forEach((track) => track.stop());
      }
    }
    if (!preserveState) {
      this._mediaInputs.clear();
    }
  }
  /**
   * Preserve media state keyed by occurrence for later restoration
   * @returns {Object} Map of occurrenceKey -> preserved media state
   * @private
   */
  _preserveMediaState() {
    const previousMediaByOccurrence = {};
    if (!this._parsedDslStructure || this._mediaInputs.size === 0) {
      return previousMediaByOccurrence;
    }
    const occurrenceCount = {};
    for (const effectInfo of this._parsedDslStructure) {
      const effectName = effectInfo.effectKey || effectInfo.name;
      const occurrence = occurrenceCount[effectName] || 0;
      occurrenceCount[effectName] = occurrence + 1;
      const media = this._mediaInputs.get(effectInfo.stepIndex);
      if (!media) continue;
      const occurrenceKey = `${effectName}#${occurrence}`;
      let sourceType = "file";
      if (media.cameraGroup && media.cameraGroup.style.display !== "none") {
        sourceType = "camera";
      }
      previousMediaByOccurrence[occurrenceKey] = {
        sourceType,
        // For file sources, preserve the source element and its src
        source: media.source,
        imageSrc: media.imageEl?.src || null,
        videoSrc: media.videoEl?.src || null,
        isVideo: media.source instanceof HTMLVideoElement && !media.stream,
        // For camera, preserve the selected device ID
        cameraDeviceId: media.cameraGroup?._selectHandle?.getValue() || null
      };
    }
    return previousMediaByOccurrence;
  }
  /**
   * Restore media state from preserved state
   * @param {number} stepIndex - Step index
   * @param {Object} preserved - Preserved media state
   * @private
   */
  _restoreMediaFromPreviousState(stepIndex, preserved) {
    const media = this._mediaInputs.get(stepIndex);
    if (!media || !preserved) return;
    const radioName = `media-source-${stepIndex}`;
    const radios = document.querySelectorAll(`input[name="${radioName}"]`);
    const isCameraSource = preserved.sourceType === "camera";
    for (const radio of radios) {
      radio.checked = radio.value === preserved.sourceType;
    }
    if (media.fileGroup && media.cameraGroup) {
      media.fileGroup.style.display = isCameraSource ? "none" : "block";
      media.cameraGroup.style.display = isCameraSource ? "block" : "none";
    }
    if (preserved.sourceType === "file" && preserved.source) {
      if (preserved.isVideo && preserved.videoSrc) {
        media.videoEl.src = preserved.videoSrc;
        media.videoEl.load();
        media.videoEl.onloadedmetadata = () => {
          media.source = media.videoEl;
          media.statusEl.textContent = `video: ${media.videoEl.videoWidth}x${media.videoEl.videoHeight}`;
          media.videoEl.play();
          this._updateMediaTexture(stepIndex);
          this._applyStepParams();
        };
      } else if (preserved.imageSrc) {
        const completeRestore = () => {
          media.source = media.imageEl;
          media.statusEl.textContent = `image: ${media.imageEl.naturalWidth}x${media.imageEl.naturalHeight}`;
          this._updateMediaTexture(stepIndex);
          this._applyStepParams();
        };
        media.imageEl.onload = completeRestore;
        media.imageEl.onerror = () => {
          media.statusEl.textContent = "failed to restore image";
        };
        media.imageEl.src = preserved.imageSrc;
        if (media.imageEl.complete && media.imageEl.naturalWidth > 0) {
          completeRestore();
        }
      }
    } else if (preserved.sourceType === "camera") {
      if (media.cameraGroup?._selectHandle) {
        this._populateCameraList(stepIndex, media.cameraGroup._selectHandle).then(() => {
          if (preserved.cameraDeviceId && media.cameraGroup._selectHandle) {
            media.cameraGroup._selectHandle.setValue(preserved.cameraDeviceId);
          }
        });
      }
      media.statusEl.textContent = "camera stopped (re-select to start)";
    }
  }
  /**
   * Load default test image for a step
   * @private
   */
  async _loadDefaultMediaImage(stepIndex) {
    const media = this._mediaInputs.get(stepIndex);
    if (!media) return;
    const img = new Image();
    img.onload = () => {
      media.source = img;
      media.imageEl.src = img.src;
      media.statusEl.textContent = `default: ${img.naturalWidth}x${img.naturalHeight}`;
      this._updateMediaTexture(stepIndex);
      this._applyStepParams();
    };
    img.onerror = () => {
      media.statusEl.textContent = "no media loaded";
    };
    img.src = "img/testcard.png";
  }
  // =========================================================================
  // Text Input Management
  // =========================================================================
  /**
   * Initialize text canvas for effects with externalTexture = 'textTex'
   * Reads initial values from globals in definition, syncs with effectParameterValues
   * @param {number} stepIndex - Step index for this effect
   * @param {string} effectKey - Effect key (e.g., 'step_0')
   * @param {Object} effectDef - Effect definition with globals
   * @private
   */
  _initTextCanvas(stepIndex, effectKey, effectDef) {
    const stepTextureId = `${effectDef.externalTexture}_step_${stepIndex}`;
    const canvas = document.createElement("canvas");
    canvas.style.display = "none";
    document.body.appendChild(canvas);
    const params = this._programState.getStepValues(effectKey) || {};
    this._textInputs.set(stepIndex, {
      canvas,
      textureId: stepTextureId,
      effectKey,
      textContent: params.text,
      font: params.font,
      size: params.size,
      posX: params.posX,
      posY: params.posY,
      color: params.color,
      rotation: params.rotation,
      bgColor: params.bgColor,
      bgOpacity: params.bgOpacity,
      justify: params.justify
    });
    setTimeout(() => this._renderTextToCanvas(stepIndex), 50);
  }
  /**
   * Parse hex color to RGB array (0-1 range)
   * @private
   */
  _hexToRgb(hex) {
    if (Array.isArray(hex)) {
      return hex.slice(0, 3);
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [1, 1, 1];
  }
  /**
   * Render text to canvas and upload to texture
   * @param {number} stepIndex - Step index
   * @private
   */
  _renderTextToCanvas(stepIndex) {
    const textState = this._textInputs.get(stepIndex);
    if (!textState || !this._renderer?._pipeline) return;
    const canvas = textState.canvas;
    const resolution = this._renderer._width;
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const text = String(textState.textContent || "");
    const lines = text.split("\n");
    const fontSize = Math.round(textState.size * canvas.height);
    const lineHeight = fontSize * 1.2;
    const textColor = this._hexToRgb(textState.color);
    const rotation = textState.rotation * Math.PI / 180;
    const justify = textState.justify;
    ctx.font = `${fontSize}px ${textState.font}`;
    ctx.textAlign = justify;
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(${Math.round(textColor[0] * 255)}, ${Math.round(textColor[1] * 255)}, ${Math.round(textColor[2] * 255)}, 1)`;
    const x = textState.posX * canvas.width;
    const y = textState.posY * canvas.height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = -totalHeight / 2;
    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * lineHeight;
      ctx.fillText(lines[i], 0, lineY);
    }
    ctx.restore();
    this._updateTextTexture(stepIndex);
  }
  /**
   * Update text texture from canvas
   * @param {number} stepIndex - Step index
   * @private
   */
  _updateTextTexture(stepIndex) {
    const textState = this._textInputs.get(stepIndex);
    if (!textState || !textState.canvas || !this._renderer._pipeline) return;
    const texId = textState.textureId;
    const result = this._renderer.updateTextureFromSource(texId, textState.canvas, { flipY: true });
    if (result.width > 0 && result.height > 0) {
      const effectKey = `step_${stepIndex}`;
      this._programState.setValue(effectKey, "textSize", [result.width, result.height]);
    }
  }
  /**
   * Stop all text inputs and clean up state
   */
  stopAllText() {
    this._textInputs.clear();
  }
  // =========================================================================
  // Getters
  // =========================================================================
  /** @returns {object} Current parameter values */
  get parameterValues() {
    return this._parameterValues;
  }
  /** @returns {object} Effect parameter values by step */
  get effectParameterValues() {
    return this._programState.getAllStepValues();
  }
  /** @returns {object} Shader source overrides by step index */
  get shaderOverrides() {
    return this._shaderOverrides;
  }
  /** @returns {Array} All effect placeholders */
  get allEffects() {
    return this._allEffects;
  }
  // =========================================================================
  // Status Display
  // =========================================================================
  /**
   * Show a status message
   * @param {string} message - Message to display
   * @param {string} [type='info'] - Message type (info, success, error)
   */
  showStatus(message, type = "info") {
    if (this._statusEl) {
      this._statusEl.textContent = message;
    }
    if (type === "success") {
      showSuccess(message);
    } else if (type === "error") {
      showError(message);
    } else {
      showInfo(message);
    }
  }
  /**
   * Update FPS counter display
   * @param {number} fps - Current FPS
   */
  updateFPSCounter(fps) {
    if (this._fpsCounterEl) {
      this._fpsCounterEl.textContent = `${fps} fps`;
    }
  }
  // =========================================================================
  // Loading Dialog
  // =========================================================================
  /**
   * Show the loading dialog
   * @param {string} [title='loading effect...'] - Dialog title
   */
  showLoadingDialog(title = "loading effect...") {
    if (!this._loadingDialog) return;
    if (this._loadingDialogTitle) {
      this._loadingDialogTitle.textContent = title;
    }
    if (this._loadingDialogStatus) {
      this._loadingDialogStatus.textContent = "preparing...";
    }
    if (this._loadingDialogProgress) {
      this._loadingDialogProgress.style.width = "0%";
    }
    this._loadingState = { queue: [], completed: 0, total: 0 };
    this._loadingDialog.showModal();
  }
  /**
   * Hide the loading dialog
   */
  hideLoadingDialog() {
    if (this._loadingDialog) {
      this._loadingDialog.close();
    }
  }
  /**
   * Update loading status text
   * @param {string} status - Status message
   */
  updateLoadingStatus(status) {
    if (this._loadingDialogStatus) {
      this._loadingDialogStatus.textContent = status;
    }
  }
  /**
   * Update loading progress
   */
  updateLoadingProgress() {
    if (!this._loadingDialogProgress) return;
    const progress = this._loadingState.total > 0 ? this._loadingState.completed / this._loadingState.total * 100 : 0;
    this._loadingDialogProgress.style.width = `${progress}%`;
  }
  /**
   * Add item to loading queue
   * @param {string} id - Item ID
   * @param {string} label - Item label
   */
  addToLoadingQueue(id, label) {
    this._loadingState.queue.push({ id, label, status: "pending" });
    this._loadingState.total++;
  }
  /**
   * Update loading queue item status
   * @param {string} id - Item ID
   * @param {string} status - New status
   */
  updateLoadingQueueItem(id, status) {
    const item = this._loadingState.queue.find((i) => i.id === id);
    if (item) {
      item.status = status;
      if (status === "done" || status === "error") {
        this._loadingState.completed++;
      }
      this.updateLoadingProgress();
    }
  }
  // =========================================================================
  // Effect Selector
  // =========================================================================
  /**
   * Populate the effect selector dropdown
   * @param {Array} effects - Array of effect objects with namespace, name, and optional description
   */
  populateEffectSelector(effects2) {
    if (!this._effectSelect) return;
    this._allEffects = effects2;
    if (typeof this._effectSelect.setEffects === "function") {
      this._effectSelect.setEffects(effects2);
    } else {
      this._effectSelect.innerHTML = "";
      const grouped = {};
      effects2.forEach((effect) => {
        if (!grouped[effect.namespace]) {
          grouped[effect.namespace] = [];
        }
        grouped[effect.namespace].push(effect);
      });
      const sortedNamespaces = Object.keys(grouped).sort((a, b) => {
        const aIsClassic = a.startsWith("classic");
        const bIsClassic = b.startsWith("classic");
        if (aIsClassic && !bIsClassic) return 1;
        if (!aIsClassic && bIsClassic) return -1;
        return a.localeCompare(b);
      });
      sortedNamespaces.forEach((namespace) => {
        const effectList = grouped[namespace];
        const optgroup = document.createElement("optgroup");
        optgroup.label = camelToSpaceCase(namespace);
        effectList.sort((a, b) => a.name.localeCompare(b.name)).forEach((effect) => {
          const option = document.createElement("option");
          option.value = `${namespace}/${effect.name}`;
          const effectName = camelToSpaceCase(effect.name);
          if (effect.description) {
            option.textContent = `${effectName}: ${effect.description}`;
          } else {
            option.textContent = effectName;
          }
          optgroup.appendChild(option);
        });
        this._effectSelect.appendChild(optgroup);
      });
    }
  }
  /**
   * Set the selected effect in the dropdown
   * @param {string} effectPath - Effect path (namespace/name)
   */
  setSelectedEffect(effectPath) {
    if (!this._effectSelect) return;
    if (typeof this._effectSelect.setEffects === "function") {
      this._effectSelect.value = effectPath;
    } else {
      for (let i = 0; i < this._effectSelect.options.length; i++) {
        if (this._effectSelect.options[i].value === effectPath) {
          this._effectSelect.selectedIndex = i;
          break;
        }
      }
    }
  }
  // =========================================================================
  // DSL Handling
  // =========================================================================
  /**
   * Get current DSL from editor
   * @returns {string} DSL content
   */
  getDsl() {
    return this._dslEditor ? this._dslEditor.value.trim() : "";
  }
  /**
   * Set DSL in editor
   * @param {string} dsl - DSL content
   */
  setDsl(dsl) {
    if (this._dslEditor) {
      this._dslEditor.value = dsl || "";
    }
  }
  /**
   * Format an effect call with parameters
   * @param {string} funcName - Function name
   * @param {object} kwargs - Object of parameter key-value pairs
   * @returns {string} Formatted call string
   */
  _formatEffectCall(funcName, kwargs) {
    return unparseCall({ name: funcName, kwargs, args: [] });
  }
  /**
   * Build kwargs object from effect globals and parameter values
   * @param {object} globals - Effect globals spec
   * @param {object} paramValues - Current parameter values
   * @param {function} formatValue - Value formatter function
   * @returns {object} kwargs object
   */
  _buildKwargs(globals, paramValues) {
    const kwargs = {};
    if (!globals) return kwargs;
    for (const [key, spec] of Object.entries(globals)) {
      const value = paramValues[key];
      if (value === void 0 || value === null) continue;
      if (spec.ui && spec.ui.control === false) continue;
      if (key === "_skip" && value === false) continue;
      if (spec.default !== void 0) {
        const formattedValue = this._boundFormatValue(value, spec);
        const formattedDefault = this._boundFormatValue(spec.default, spec);
        if (formattedValue === formattedDefault) continue;
      }
      kwargs[key] = value;
    }
    return kwargs;
  }
  /**
   * Build DSL source from an effect and parameter values
   * @param {object} effect - Effect object
   * @returns {string} Generated DSL
   */
  buildDslSource(effect) {
    if (!effect || !effect.instance) {
      return "";
    }
    if (effect.instance.defaultProgram) {
      return effect.instance.defaultProgram;
    }
    let searchNs = effect.namespace;
    if (effect.namespace === "render") {
      searchNs = "synth, filter, render";
    } else if (effect.namespace === "points") {
      searchNs = "synth, points, render";
    } else if (["filter", "mixer"].includes(effect.namespace)) {
      searchNs = `${effect.namespace}, synth`;
    }
    const searchDirective = searchNs ? `search ${searchNs}

` : "";
    const funcName = effect.instance.func;
    const starter = isStarterEffect(effect);
    const hasTex = hasTexSurfaceParam(effect);
    const hasExplicitTex = hasExplicitTexParam(effect);
    const { volParam, geoParam } = getVolGeoParams(effect);
    const hasVolGeo = volParam && geoParam;
    const fmtCall = (name, kwargs) => this._formatEffectCall(name, kwargs);
    if (funcName === "pointsEmit" || funcName === "pointsRender") {
      return `search points, synth, render

perlin()
  .pointsEmit()
  .physical()
  .pointsRender()
  .write(o0)

render(o0)`;
    }
    if (funcName === "pointsBillboardRender") {
      return `search points, synth, render

polygon(
  radius: 0.7,
  fgAlpha: 0.1,
  bgAlpha: 0
)
  .write(o0)

perlin(ridges: true)
  .pointsEmit(stateSize: x64)
  .physical()
  .pointsBillboardRender(
    tex: read(o0),
    pointSize: 40,
    sizeVariation: 50,
    rotationVar: 50
  )
  .write(o1)

render(o1)`;
    }
    if (funcName === "meshLoader" || funcName === "meshRender") {
      return `search render

meshLoader()
  .meshRender()
  .write(o0)

render(o0)`;
    }
    if (effect.namespace === "points") {
      const kwargs = this._buildKwargs(effect.instance.globals, this._parameterValues);
      const effectCall = fmtCall(funcName, kwargs);
      const viewModeSpec = effect.instance.globals?.viewMode;
      const viewModeDefault = viewModeSpec?.default;
      const pointsRenderArgs = viewModeDefault ? `viewMode: ${viewModeDefault}` : "";
      const pointsRenderCall = pointsRenderArgs ? `pointsRender(${pointsRenderArgs})` : "pointsRender()";
      return `search points, synth, render

perlin()
  .pointsEmit()
  .${effectCall}
  .${pointsRenderCall}
  .write(o0)

render(o0)`;
    }
    if (funcName === "loopBegin" || funcName === "loopEnd") {
      return `${searchDirective}noise(ridges: true)
  .loopBegin(alpha: 95, intensity: 95)
  .warp()
  .loopEnd()
  .write(o0)

render(o0)`;
    }
    const noiseCall = fmtCall("noise", { seed: 1, ridges: true });
    if (is3dGenerator(effect)) {
      let consumerVolumeSize = 32;
      const kwargs = {};
      if (effect.instance.globals) {
        for (const [key, spec] of Object.entries(effect.instance.globals)) {
          if (key === volParam || key === geoParam) continue;
          const value = this._parameterValues[key];
          if (value === void 0 || value === null) continue;
          if (key === "volumeSize") consumerVolumeSize = value;
          if (key === "_skip" && value === false) continue;
          if (spec.default !== void 0) {
            const formattedValue = this._boundFormatValue(value, spec);
            const formattedDefault = this._boundFormatValue(spec.default, spec);
            if (formattedValue === formattedDefault) continue;
          }
          kwargs[key] = value;
        }
      }
      if (hasVolGeo) {
        kwargs[volParam] = { type: "Read3D", tex3d: { type: "VolRef", name: "vol0" }, geo: null };
        kwargs[geoParam] = { type: "Read3D", tex3d: { type: "GeoRef", name: "geo0" }, geo: null };
        const generatorCall = fmtCall("noise3d", { volumeSize: `x${consumerVolumeSize}` });
        const effectCall2 = fmtCall(funcName, kwargs);
        return `search synth3d, filter3d, render

${generatorCall}
  .write3d(vol0, geo0)

${effectCall2}
  .render3d()
  .write(o0)

render(o0)`;
      }
      const effectCall = fmtCall(funcName, kwargs);
      return `search synth3d, filter3d, render

${effectCall}
  .render3d()
  .write(o0)

render(o0)`;
    }
    if (hasVolGeo) {
      let consumerVolumeSize = 32;
      const kwargs = {};
      if (effect.instance.globals) {
        for (const [key, spec] of Object.entries(effect.instance.globals)) {
          if (key === volParam || key === geoParam) continue;
          const value = this._parameterValues[key];
          if (value === void 0 || value === null) continue;
          if (key === "volumeSize") consumerVolumeSize = value;
          if (key === "_skip" && value === false) continue;
          if (spec.default !== void 0) {
            const formattedValue = this._boundFormatValue(value, spec);
            const formattedDefault = this._boundFormatValue(spec.default, spec);
            if (formattedValue === formattedDefault) continue;
          }
          kwargs[key] = value;
        }
      }
      kwargs[volParam] = { type: "Read3D", tex3d: { type: "VolRef", name: "vol0" }, geo: null };
      kwargs[geoParam] = { type: "Read3D", tex3d: { type: "GeoRef", name: "geo0" }, geo: null };
      const generatorCall = fmtCall("noise3d", { volumeSize: `x${consumerVolumeSize}` });
      const effectCall = fmtCall(funcName, kwargs);
      return `search synth3d, filter3d, render

${generatorCall}
  .write3d(vol0, geo0)

${effectCall}
  .render3d()
  .write(o0)

render(o0)`;
    }
    if (hasExplicitTex) {
      const kwargs = this._buildKwargs(effect.instance.globals, this._parameterValues);
      kwargs.tex = { type: "Read", surface: "o0" };
      const effectCall = fmtCall(funcName, kwargs);
      if (starter) {
        return `${searchDirective}${noiseCall}
  .write(o0)

${effectCall}
  .write(o1)

render(o1)`;
      } else {
        const noiseCall2 = fmtCall("noise", { seed: 2, ridges: true });
        return `${searchDirective}${noiseCall}
  .write(o0)

${noiseCall2}
  .${effectCall}
  .write(o1)

render(o1)`;
      }
    }
    if (starter) {
      const kwargs = this._buildKwargs(effect.instance.globals, this._parameterValues);
      if (hasTex) {
        const sourceSurface = "o0";
        const outputSurface = "o1";
        const kwargsWithTex = { tex: { type: "Read", surface: sourceSurface }, ...kwargs };
        const effectCall2 = fmtCall(funcName, kwargsWithTex);
        return `${searchDirective}${noiseCall}
  .write(${sourceSurface})

${effectCall2}
  .write(${outputSurface})

render(${outputSurface})`;
      }
      const effectCall = fmtCall(funcName, kwargs);
      return `${searchDirective}${effectCall}
  .write(o0)

render(o0)`;
    } else if (hasTex) {
      const kwargs = { tex: { type: "Read", surface: "o0" } };
      if (effect.instance.globals) {
        for (const [key, spec] of Object.entries(effect.instance.globals)) {
          if (key === "tex" && spec.type === "surface") continue;
          const value = this._parameterValues[key];
          if (value === void 0 || value === null) continue;
          if (key === "_skip" && value === false) continue;
          if (spec.default !== void 0) {
            const formattedValue = this._boundFormatValue(value, spec);
            const formattedDefault = this._boundFormatValue(spec.default, spec);
            if (formattedValue === formattedDefault) continue;
          }
          kwargs[key] = value;
        }
      }
      const effectCall = fmtCall(funcName, kwargs);
      const noiseCall2 = fmtCall("noise", { seed: 2, ridges: true });
      return `${searchDirective}${noiseCall}
  .write(o0)

${noiseCall2}
  .${effectCall}
  .write(o1)

render(o1)`;
    } else if (is3dProcessor(effect)) {
      let consumerVolumeSize = 32;
      const kwargs = {};
      if (effect.instance.globals) {
        for (const [key, spec] of Object.entries(effect.instance.globals)) {
          const value = this._parameterValues[key];
          if (value === void 0 || value === null) continue;
          if (key === "volumeSize") consumerVolumeSize = value;
          if (key === "_skip" && value === false) continue;
          if (spec.default !== void 0) {
            const formattedValue = this._boundFormatValue(value, spec);
            const formattedDefault = this._boundFormatValue(spec.default, spec);
            if (formattedValue === formattedDefault) continue;
          }
          kwargs[key] = value;
        }
      }
      const generatorCall = fmtCall("noise3d", { volumeSize: `x${consumerVolumeSize}` });
      const effectCall = fmtCall(funcName, kwargs);
      const renderSuffix = funcName === "render3d" || funcName === "renderLit3d" || funcName === "renderCubemap3d" || funcName === "renderCubemapSurface" ? "" : "\n  .render3d()";
      return `search synth3d, filter3d, render

${generatorCall}
  .${effectCall}${renderSuffix}
  .write(o0)

render(o0)`;
    } else {
      const kwargs = this._buildKwargs(effect.instance.globals, this._parameterValues);
      const effectCall = fmtCall(funcName, kwargs);
      return `${searchDirective}${noiseCall}
  .${effectCall}
  .write(o0)

render(o0)`;
    }
  }
  // =========================================================================
  // Effect Controls
  // =========================================================================
  /**
   * Load DSL and create effect controls from it
   * Parses DSL into ProgramState, then builds controls from state
   * @param {string} dsl - DSL source
   */
  loadDslAndCreateControls(dsl) {
    if (!this._controlsContainer) return;
    this._programState.fromDsl(dsl);
    this.createEffectControlsFromState();
  }
  /**
   * Create effect controls from ProgramState
   * Uses programState.getStructure() and getStepValues() instead of parsing DSL
   */
  createEffectControlsFromState() {
    if (!this._controlsContainer) return;
    const structure = this._programState.getStructure();
    const compiled = this._programState.getCompiled();
    if (!structure || structure.length === 0) {
      this.stopAllMedia();
      this.stopAllText();
      this._controlsContainer.innerHTML = "";
      this._dependentControls = [];
      this._parsedDslStructure = [];
      return;
    }
    if (!compiled?.plans) return;
    const previousMediaByOccurrence = this._preserveMediaState();
    this.stopAllMedia();
    this.stopAllText();
    this._controlsContainer.innerHTML = "";
    this._dependentControls = [];
    this._programState.clearRoutingOverrides();
    const effects2 = structure;
    this._parsedDslStructure = effects2;
    let globalStepIndex = 0;
    const stepToPlan = /* @__PURE__ */ new Map();
    for (let planIndex = 0; planIndex < compiled.plans.length; planIndex++) {
      const plan = compiled.plans[planIndex];
      if (!plan.chain) continue;
      for (let i = 0; i < plan.chain.length; i++) {
        stepToPlan.set(globalStepIndex, planIndex);
        globalStepIndex++;
      }
    }
    const midChainWriteSteps = /* @__PURE__ */ new Set();
    const stepsBeforeMidChainWrite = /* @__PURE__ */ new Set();
    for (let i = 0; i < effects2.length; i++) {
      const effectInfo = effects2[i];
      if (effectInfo.effectKey === "_write") {
        const planIndex = stepToPlan.get(effectInfo.stepIndex);
        const isLastStepInPlan = effectInfo.stepIndex === Math.max(...effects2.filter((e) => stepToPlan.get(e.stepIndex) === planIndex).map((e) => e.stepIndex));
        if (!isLastStepInPlan) {
          midChainWriteSteps.add(effectInfo.stepIndex);
          for (let j = i - 1; j >= 0; j--) {
            const prev = effects2[j];
            if (prev.effectKey !== "_read" && prev.effectKey !== "_read3d") {
              stepsBeforeMidChainWrite.add(prev.stepIndex);
              break;
            }
          }
        }
      }
    }
    let prevWasMidChainWrite = false;
    const currentOccurrenceCount = {};
    for (const effectInfo of effects2) {
      const effectName = effectInfo.effectKey || effectInfo.name;
      if (currentOccurrenceCount[effectName] === void 0) {
        currentOccurrenceCount[effectName] = 0;
      }
      if (effectInfo.effectKey === "_write") {
        currentOccurrenceCount[effectName]++;
        const planIndex = stepToPlan.get(effectInfo.stepIndex);
        const writeTarget = effectInfo.args?.tex;
        if (writeTarget) {
          const isLastStepInPlan = effectInfo.stepIndex === Math.max(...effects2.filter((e) => stepToPlan.get(e.stepIndex) === planIndex).map((e) => e.stepIndex));
          const isMidChain = !isLastStepInPlan;
          const writeEffect = this._createWriteEffect(planIndex, effectInfo.stepIndex, writeTarget, isMidChain);
          this._controlsContainer.appendChild(writeEffect);
          prevWasMidChainWrite = isMidChain;
        }
        continue;
      }
      if (effectInfo.effectKey === "_read") {
        currentOccurrenceCount[effectName]++;
        const readSource = effectInfo.args?.tex;
        if (readSource) {
          const readEffect = this._createReadEffect(effectInfo.stepIndex, readSource);
          this._controlsContainer.appendChild(readEffect);
        }
        continue;
      }
      if (effectInfo.effectKey === "_read3d") {
        const read3dSource = effectInfo.args || {};
        const read3dEffect = this._createRead3dEffect(effectInfo.stepIndex, read3dSource);
        this._controlsContainer.appendChild(read3dEffect);
        currentOccurrenceCount[effectName]++;
        continue;
      }
      if (effectInfo.effectKey === "_write3d") {
        currentOccurrenceCount[effectName]++;
        const planIndex = stepToPlan.get(effectInfo.stepIndex);
        const write3dArgs = effectInfo.args || {};
        if (write3dArgs.tex3d) {
          const isLastStepInPlan = effectInfo.stepIndex === Math.max(...effects2.filter((e) => stepToPlan.get(e.stepIndex) === planIndex).map((e) => e.stepIndex));
          const isMidChain = !isLastStepInPlan;
          const write3dEffect = this._createWrite3dEffect(planIndex, effectInfo.stepIndex, write3dArgs, isMidChain);
          this._controlsContainer.appendChild(write3dEffect);
        }
        continue;
      }
      let effectDef = getEffect(effectInfo.effectKey);
      if (!effectDef && effectInfo.namespace) {
        effectDef = getEffect(`${effectInfo.namespace}.${effectInfo.name}`);
      }
      if (!effectDef) {
        effectDef = getEffect(effectInfo.name);
      }
      if (!effectDef || !effectDef.globals) {
        currentOccurrenceCount[effectName]++;
        continue;
      }
      const effectDiv = document.createElement("div");
      effectDiv.className = "shader-effect hf-panel";
      effectDiv.dataset.stepIndex = effectInfo.stepIndex;
      effectDiv.dataset.effectName = effectInfo.name;
      if (prevWasMidChainWrite) {
        effectDiv.style.marginTop = "0";
        effectDiv.style.borderTopLeftRadius = "0";
        effectDiv.style.borderTopRightRadius = "0";
      }
      if (stepsBeforeMidChainWrite.has(effectInfo.stepIndex)) {
        effectDiv.style.marginBottom = "0";
        effectDiv.style.borderBottomLeftRadius = "0";
        effectDiv.style.borderBottomRightRadius = "0";
      }
      prevWasMidChainWrite = false;
      const titleDiv = document.createElement("div");
      titleDiv.className = "effect-title";
      const titleText = document.createElement("span");
      titleText.className = "effect-title-text";
      const formatName = (name) => name.replace(/([A-Z])/g, " $1").toLowerCase().trim();
      const formattedName = formatName(effectInfo.name);
      titleText.textContent = effectInfo.namespace ? `${effectInfo.namespace}.${formattedName}` : formattedName;
      titleDiv.appendChild(titleText);
      const spacer = document.createElement("span");
      spacer.style.flex = "1";
      titleDiv.appendChild(spacer);
      let codeBtn = null;
      if (effectDef.shaders) {
        codeBtn = document.createElement("button");
        codeBtn.className = "hf-action-btn tooltip";
        codeBtn.textContent = "code";
        codeBtn.dataset.title = "Edit shader source code";
        codeBtn.setAttribute("aria-label", "Edit shader source code");
        titleDiv.appendChild(codeBtn);
      }
      const resetBtn = document.createElement("button");
      resetBtn.className = "hf-action-btn tooltip";
      resetBtn.textContent = "reset";
      resetBtn.dataset.title = "Reset all parameters to defaults";
      resetBtn.setAttribute("aria-label", "Reset all parameters to defaults");
      resetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const effectKey2 = `step_${effectInfo.stepIndex}`;
        const wasSkipped = this._programState.getValue(effectKey2, "_skip");
        this._programState.batch(() => {
          for (const [key, spec] of Object.entries(effectDef.globals)) {
            if (spec.default !== void 0) {
              this._programState.setValue(effectKey2, key, cloneParamValue(spec.default));
            }
          }
          if (wasSkipped) {
            this._programState.setValue(effectKey2, "_skip", true);
          }
        });
        const controlsContainer = effectDiv.querySelector(`#controls-${effectInfo.stepIndex}`);
        if (controlsContainer) {
          controlsContainer.innerHTML = "";
          const grouped2 = groupGlobalsByCategory(effectDef.globals);
          const categoryNames2 = Object.keys(grouped2);
          const showCategoryLabels2 = categoryNames2.length > 1;
          for (let catIdx = 0; catIdx < categoryNames2.length; catIdx++) {
            const category = categoryNames2[catIdx];
            const items = grouped2[category];
            const categoryGroup = document.createElement("div");
            categoryGroup.className = "category-group";
            categoryGroup.dataset.category = category;
            if (showCategoryLabels2) {
              const label = document.createElement("div");
              label.className = "category-label";
              label.textContent = category;
              categoryGroup.appendChild(label);
            }
            for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
              const [key, spec] = items[itemIdx];
              const controlGroup = this._createControlGroup(
                key,
                spec,
                { ...effectInfo, args: {} },
                // Empty args forces use of defaults
                effectKey2
              );
              if (controlGroup) {
                categoryGroup.appendChild(controlGroup);
              }
            }
            controlsContainer.appendChild(categoryGroup);
          }
        }
        this._updateDslFromEffectParams();
        this.showStatus(`reset ${effectInfo.name} to defaults`, "success");
        if (this._onEffectControlsResetCallback) {
          this._onEffectControlsResetCallback(effectInfo.stepIndex, effectDiv, effectDef);
        }
      });
      titleDiv.appendChild(resetBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "hf-action-btn tooltip";
      deleteBtn.textContent = "delete";
      deleteBtn.dataset.title = "Remove this effect from the pipeline";
      deleteBtn.setAttribute("aria-label", "Remove this effect from the pipeline");
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this._deleteStepAtIndex(effectInfo.stepIndex);
      });
      titleDiv.appendChild(deleteBtn);
      const skipBtn = document.createElement("button");
      skipBtn.className = "hf-action-btn tooltip";
      skipBtn.textContent = "skip";
      skipBtn.dataset.title = "Skip this effect in the pipeline";
      skipBtn.setAttribute("aria-label", "Skip this effect in the pipeline");
      skipBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const isSkipped = effectDiv.classList.toggle("skipped");
        skipBtn.textContent = isSkipped ? "unskip" : "skip";
        skipBtn.classList.toggle("active", isSkipped);
        if (isSkipped) {
          effectDiv.classList.add("collapsed");
        } else {
          effectDiv.classList.remove("collapsed");
        }
        this._programState.setValue(effectKey, "_skip", isSkipped);
        this._updateDslFromEffectParams();
        await this._recompilePipeline();
      });
      titleDiv.appendChild(skipBtn);
      titleDiv.addEventListener("click", () => {
        if (effectDiv.classList.contains("skipped")) {
          return;
        }
        effectDiv.classList.toggle("collapsed");
      });
      if (effectInfo.args?._skip === true) {
        effectDiv.classList.add("skipped", "collapsed");
        skipBtn.textContent = "unskip";
        skipBtn.classList.add("active");
      }
      effectDiv.appendChild(titleDiv);
      const contentDiv = document.createElement("div");
      contentDiv.className = "effect-content";
      const controlsDiv = document.createElement("div");
      controlsDiv.id = `controls-${effectInfo.stepIndex}`;
      controlsDiv.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 1em 1em;";
      const effectKey = `step_${effectInfo.stepIndex}`;
      const currentEffectName = effectInfo.effectKey || effectInfo.name;
      const occurrence = currentOccurrenceCount[currentEffectName];
      currentOccurrenceCount[currentEffectName]++;
      const occurrenceKey = `${currentEffectName}#${occurrence}`;
      const grouped = groupGlobalsByCategory(effectDef.globals);
      const categoryNames = Object.keys(grouped);
      const showCategoryLabels = categoryNames.length > 1;
      const hasMultipleCategories = categoryNames.length > 1;
      const openCategories = effectDef.openCategories;
      let tagBar = null;
      if (hasMultipleCategories) {
        tagBar = document.createElement("div");
        tagBar.className = "category-tag-bar";
        controlsDiv.appendChild(tagBar);
      }
      for (let catIdx = 0; catIdx < categoryNames.length; catIdx++) {
        const category = categoryNames[catIdx];
        const items = grouped[category];
        const categoryGroup = document.createElement("div");
        categoryGroup.className = "category-group";
        categoryGroup.dataset.category = category;
        const isCategoryOpen = openCategories ? openCategories.includes(category) : catIdx === 0;
        if (hasMultipleCategories) {
          if (!isCategoryOpen) {
            categoryGroup.classList.add("collapsed");
          }
          const tag = document.createElement("span");
          tag.className = "hf-tag";
          tag.textContent = category + "\u2026";
          tag.dataset.category = category;
          if (isCategoryOpen) {
            tag.style.display = "none";
          }
          tag.addEventListener("click", () => {
            categoryGroup.classList.remove("collapsed");
            tag.style.display = "none";
            const visibleTags = tagBar.querySelectorAll('.hf-tag:not([style*="display: none"])');
            if (visibleTags.length === 0) {
              tagBar.style.display = "none";
            }
          });
          tagBar.appendChild(tag);
        }
        if (showCategoryLabels) {
          const label = document.createElement("div");
          label.className = "category-label";
          if (hasMultipleCategories) {
            const closeBtn = document.createElement("span");
            closeBtn.className = "category-close tooltip";
            closeBtn.textContent = "\u2715";
            closeBtn.dataset.title = "collapse category";
            closeBtn.setAttribute("aria-label", "collapse category");
            closeBtn.addEventListener("click", () => {
              categoryGroup.classList.add("collapsed");
              const tag = tagBar.querySelector(`[data-category="${category}"]`);
              if (tag) tag.style.display = "";
              tagBar.style.display = "";
            });
            label.appendChild(closeBtn);
          }
          const labelText = document.createElement("span");
          labelText.textContent = category;
          label.appendChild(labelText);
          categoryGroup.appendChild(label);
        }
        for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
          const [key, spec] = items[itemIdx];
          const controlGroup = this._createControlGroup(
            key,
            spec,
            effectInfo,
            effectKey
          );
          if (controlGroup) {
            categoryGroup.appendChild(controlGroup);
          }
        }
        controlsDiv.appendChild(categoryGroup);
      }
      if (effectDef.externalMesh) {
        const meshSection = this._createMeshInputSection(
          effectInfo.stepIndex,
          effectDef.externalMesh,
          effectDef.builtinMeshes
        );
        controlsDiv.appendChild(meshSection);
      }
      if (controlsDiv.children.length === 0) {
        const noControlsMsg = document.createElement("div");
        noControlsMsg.className = "no-controls-message";
        noControlsMsg.textContent = "This effect has no controls.";
        noControlsMsg.style.cssText = "grid-column: 1 / -1; color: var(--color5); font-size: 0.75rem; font-style: italic; padding: 0.5rem 0; text-align: center;";
        controlsDiv.appendChild(noControlsMsg);
      }
      contentDiv.appendChild(controlsDiv);
      if (effectDef.shaders) {
        const shaderSection = this._createShaderEditorSection(effectInfo, effectDef, codeBtn);
        contentDiv.appendChild(shaderSection);
      }
      if (effectDef.externalTexture && effectDef.externalTexture !== "textTex") {
        const stepTextureId = `${effectDef.externalTexture}_step_${effectInfo.stepIndex}`;
        const hasPreviousMediaState = !!previousMediaByOccurrence[occurrenceKey];
        const mediaSection = this._createMediaInputSection(
          effectInfo.stepIndex,
          stepTextureId,
          effectDef,
          hasPreviousMediaState
          // Skip default image load if restoring
        );
        contentDiv.appendChild(mediaSection);
        if (hasPreviousMediaState) {
          this._restoreMediaFromPreviousState(
            effectInfo.stepIndex,
            previousMediaByOccurrence[occurrenceKey]
          );
        }
      }
      if (effectDef.externalTexture === "textTex") {
        this._initTextCanvas(effectInfo.stepIndex, effectKey, effectDef);
      }
      effectDiv.appendChild(contentDiv);
      this._controlsContainer.appendChild(effectDiv);
    }
    if (compiled.render) {
      const renderEffect = this._createRenderEffect(compiled.render);
      this._controlsContainer.appendChild(renderEffect);
    }
    this._updateDependentControls();
  }
  /**
   * Check if DSL structure is compatible and apply state to pipeline
   * Returns false if structure would change (caller should rebuild controls)
   * @param {string} dsl - DSL source to check compatibility against
   * @returns {boolean} True if compatible, false if structure changed
   */
  checkStructureAndApplyState(dsl) {
    if (!this._controlsContainer || !this._parsedDslStructure) {
      return false;
    }
    if (this._programState.wouldChangeStructure(dsl)) {
      return false;
    }
    if (this._automationBindingsChanged(dsl)) {
      return false;
    }
    this._programState.fromDsl(dsl);
    this._syncControlValuesFromState();
    return true;
  }
  /**
   * Sync all UI control values from programState
   * Called after DSL is parsed to update control displays without rebuilding
   * @private
   */
  _syncControlValuesFromState() {
    if (!this._controlsContainer || !this._parsedDslStructure) return;
    for (const effectInfo of this._parsedDslStructure) {
      const stepIndex = effectInfo.stepIndex;
      const effectKey = `step_${stepIndex}`;
      const values = this._programState.getStepValues(effectKey) || {};
      const effectDiv = this._controlsContainer.querySelector(
        `.shader-effect[data-step-index="${stepIndex}"]`
      );
      if (!effectDiv) continue;
      const controlGroups = effectDiv.querySelectorAll(".control-group[data-param-key]");
      for (const controlGroup of controlGroups) {
        const paramKey = controlGroup.dataset.paramKey;
        const value = values[paramKey];
        if (value === void 0) continue;
        if (value && typeof value === "object" && (value._varRef || value.type === "Oscillator" || value._ast?.type === "Oscillator" || value.type === "Midi" || value._ast?.type === "Midi" || value.type === "Audio" || value._ast?.type === "Audio")) {
          continue;
        }
        if (controlGroup._controlHandle?.setValue) {
          controlGroup._controlHandle.setValue(value);
        }
      }
    }
    this._updateDependentControls();
  }
  /**
   * Check if automation bindings changed between current state and new DSL
   * @param {string} dsl - New DSL to check
   * @returns {boolean} True if automation status of any param changed
   * @private
   */
  _automationBindingsChanged(dsl) {
    const newEffects = extractEffectsFromDsl(dsl);
    if (!newEffects || !this._parsedDslStructure) return false;
    for (let i = 0; i < newEffects.length; i++) {
      const newEffect = newEffects[i];
      const oldEffect = this._parsedDslStructure[i];
      if (!oldEffect) continue;
      const allParams = /* @__PURE__ */ new Set([
        ...Object.keys(newEffect.args || {}),
        ...Object.keys(oldEffect.args || {})
      ]);
      for (const param of allParams) {
        const newVal = newEffect.args?.[param];
        const oldVal = oldEffect.args?.[param];
        const newIsAuto = newVal && typeof newVal === "object" && (newVal.type === "Oscillator" || newVal.type === "Midi" || newVal.type === "Audio" || newVal._ast?.type === "Oscillator" || newVal._ast?.type === "Midi" || newVal._ast?.type === "Audio");
        const oldIsAuto = oldVal && typeof oldVal === "object" && (oldVal.type === "Oscillator" || oldVal.type === "Midi" || oldVal.type === "Audio" || oldVal._ast?.type === "Oscillator" || oldVal._ast?.type === "Midi" || oldVal._ast?.type === "Audio");
        if (newIsAuto !== oldIsAuto) {
          console.log(`[_automationBindingsChanged] ${oldEffect.name}.${param}: ${oldIsAuto} -> ${newIsAuto}`);
          return true;
        }
      }
    }
    return false;
  }
  /**
   * Create a write effect for a plan
   * @private
   * @param {number} planIndex - The plan index
   * @param {number} stepIndex - The step index for this write
   * @param {object} writeTarget - The write target surface
   * @param {boolean} isMidChain - Whether this is a mid-chain write (not terminal)
   */
  _createWriteEffect(planIndex, stepIndex, writeTarget, isMidChain = false) {
    const effectDiv = document.createElement("div");
    effectDiv.className = "shader-effect hf-panel";
    effectDiv.dataset.planIndex = planIndex;
    effectDiv.dataset.stepIndex = stepIndex;
    effectDiv.dataset.effectName = "write";
    if (isMidChain) {
      effectDiv.dataset.midChain = "true";
    }
    const titleDiv = document.createElement("div");
    titleDiv.className = "effect-title";
    titleDiv.textContent = "write";
    titleDiv.addEventListener("click", () => {
      effectDiv.classList.toggle("collapsed");
    });
    effectDiv.appendChild(titleDiv);
    const contentDiv = document.createElement("div");
    contentDiv.className = "effect-content";
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;";
    const controlGroup = document.createElement("div");
    controlGroup.className = "control-group";
    const header = document.createElement("div");
    header.className = "control-header";
    const label = document.createElement("span");
    label.className = "control-label";
    label.textContent = "surface";
    header.appendChild(label);
    controlGroup.appendChild(header);
    const surfaces = [
      { value: "none", label: "none" },
      { value: "o0", label: "o0" },
      { value: "o1", label: "o1" },
      { value: "o2", label: "o2" },
      { value: "o3", label: "o3" },
      { value: "o4", label: "o4" },
      { value: "o5", label: "o5" },
      { value: "o6", label: "o6" },
      { value: "o7", label: "o7" }
    ];
    const currentTarget = typeof writeTarget === "string" ? writeTarget : writeTarget.name;
    const handle = this._controlFactory.createSelect({
      choices: surfaces,
      value: currentTarget,
      className: "hf-input"
    });
    const select = handle.element;
    select.addEventListener("change", () => {
      const val = handle.getValue();
      if (isMidChain) {
        this._programState.setWriteStepTarget(stepIndex, val);
      } else {
        this._programState.setWriteTarget(planIndex, val);
      }
      this._onControlChange();
      if (this._onRequestRecompileCallback) {
        this._onRequestRecompileCallback();
      }
    });
    controlGroup.appendChild(select);
    controlsDiv.appendChild(controlGroup);
    contentDiv.appendChild(controlsDiv);
    effectDiv.appendChild(contentDiv);
    return effectDiv;
  }
  /**
   * Create a render effect for the render directive
   * @private
   * @param {string} renderTarget - The render target surface (e.g., 'o0')
   */
  _createRenderEffect(renderTarget) {
    const effectDiv = document.createElement("div");
    effectDiv.className = "shader-effect hf-panel";
    effectDiv.dataset.effectName = "render";
    const titleDiv = document.createElement("div");
    titleDiv.className = "effect-title";
    titleDiv.textContent = "render";
    titleDiv.addEventListener("click", () => {
      effectDiv.classList.toggle("collapsed");
    });
    effectDiv.appendChild(titleDiv);
    const contentDiv = document.createElement("div");
    contentDiv.className = "effect-content";
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;";
    const controlGroup = document.createElement("div");
    controlGroup.className = "control-group";
    const header = document.createElement("div");
    header.className = "control-header";
    const label = document.createElement("span");
    label.className = "control-label";
    label.textContent = "surface";
    header.appendChild(label);
    controlGroup.appendChild(header);
    const surfaces = [
      { value: "o0", label: "o0" },
      { value: "o1", label: "o1" },
      { value: "o2", label: "o2" },
      { value: "o3", label: "o3" },
      { value: "o4", label: "o4" },
      { value: "o5", label: "o5" },
      { value: "o6", label: "o6" },
      { value: "o7", label: "o7" }
    ];
    const currentTarget = typeof renderTarget === "string" ? renderTarget : renderTarget.name;
    const handle = this._controlFactory.createSelect({
      choices: surfaces,
      value: currentTarget,
      className: "hf-input"
    });
    const select = handle.element;
    select.addEventListener("change", () => {
      this._programState.setRenderTarget(handle.getValue());
      this._onControlChange();
      if (this._onRequestRecompileCallback) {
        this._onRequestRecompileCallback();
      }
    });
    controlGroup.appendChild(select);
    controlsDiv.appendChild(controlGroup);
    contentDiv.appendChild(controlsDiv);
    effectDiv.appendChild(contentDiv);
    return effectDiv;
  }
  /**
   * Create a read effect for a step
   * @private
   * @param {number} stepIndex - The step index
   * @param {object} readSource - The read source surface
   */
  _createReadEffect(stepIndex, readSource) {
    const effectDiv = document.createElement("div");
    effectDiv.className = "shader-effect hf-panel";
    effectDiv.dataset.stepIndex = stepIndex;
    effectDiv.dataset.effectName = "read";
    const titleDiv = document.createElement("div");
    titleDiv.className = "effect-title";
    const titleText = document.createElement("span");
    titleText.className = "effect-title-text";
    titleText.textContent = "read";
    titleDiv.appendChild(titleText);
    const spacer = document.createElement("span");
    spacer.style.flex = "1";
    titleDiv.appendChild(spacer);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "hf-action-btn tooltip";
    deleteBtn.textContent = "delete";
    deleteBtn.dataset.title = "Remove this read from the pipeline";
    deleteBtn.setAttribute("aria-label", "Remove this read from the pipeline");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this._deleteStepAtIndex(stepIndex);
    });
    titleDiv.appendChild(deleteBtn);
    const skipBtn = document.createElement("button");
    skipBtn.className = "hf-action-btn tooltip";
    skipBtn.textContent = "skip";
    skipBtn.dataset.title = "Skip this read in the pipeline";
    skipBtn.setAttribute("aria-label", "Skip this read in the pipeline");
    skipBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const isSkipped = effectDiv.classList.toggle("skipped");
      skipBtn.textContent = isSkipped ? "unskip" : "skip";
      skipBtn.classList.toggle("active", isSkipped);
      if (isSkipped) {
        effectDiv.classList.add("collapsed");
      } else {
        effectDiv.classList.remove("collapsed");
      }
      await this._toggleStepSkipAtIndex(stepIndex, isSkipped);
    });
    titleDiv.appendChild(skipBtn);
    titleDiv.addEventListener("click", () => {
      if (effectDiv.classList.contains("skipped")) {
        return;
      }
      effectDiv.classList.toggle("collapsed");
    });
    effectDiv.appendChild(titleDiv);
    const contentDiv = document.createElement("div");
    contentDiv.className = "effect-content";
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;";
    const controlGroup = document.createElement("div");
    controlGroup.className = "control-group";
    const header = document.createElement("div");
    header.className = "control-header";
    const label = document.createElement("span");
    label.className = "control-label";
    label.textContent = "surface";
    header.appendChild(label);
    controlGroup.appendChild(header);
    const surfaces = [
      { value: "none", label: "none" },
      { value: "o0", label: "o0" },
      { value: "o1", label: "o1" },
      { value: "o2", label: "o2" },
      { value: "o3", label: "o3" },
      { value: "o4", label: "o4" },
      { value: "o5", label: "o5" },
      { value: "o6", label: "o6" },
      { value: "o7", label: "o7" }
    ];
    const currentSource = typeof readSource === "string" ? readSource : readSource.name;
    const handle = this._controlFactory.createSelect({
      choices: surfaces,
      value: currentSource,
      className: "hf-input"
    });
    const select = handle.element;
    select.addEventListener("change", () => {
      this._programState.setReadSource(stepIndex, handle.getValue());
      this._onControlChange();
      if (this._onRequestRecompileCallback) {
        this._onRequestRecompileCallback();
      }
    });
    controlGroup.appendChild(select);
    controlsDiv.appendChild(controlGroup);
    contentDiv.appendChild(controlsDiv);
    effectDiv.appendChild(contentDiv);
    return effectDiv;
  }
  /**
   * Create a read3d effect for a step
   * @private
   * @param {number} stepIndex - The step index
   * @param {object} read3dSource - The read3d source containing tex3d and geo
   */
  _createRead3dEffect(stepIndex, read3dSource) {
    const effectDiv = document.createElement("div");
    effectDiv.className = "shader-effect hf-panel";
    effectDiv.dataset.stepIndex = stepIndex;
    effectDiv.dataset.effectName = "read3d";
    const titleDiv = document.createElement("div");
    titleDiv.className = "effect-title";
    const titleText = document.createElement("span");
    titleText.className = "effect-title-text";
    titleText.textContent = "read3d";
    titleDiv.appendChild(titleText);
    const spacer = document.createElement("span");
    spacer.style.flex = "1";
    titleDiv.appendChild(spacer);
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "hf-action-btn tooltip";
    deleteBtn.textContent = "delete";
    deleteBtn.dataset.title = "Remove this read3d from the pipeline";
    deleteBtn.setAttribute("aria-label", "Remove this read3d from the pipeline");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this._deleteStepAtIndex(stepIndex);
    });
    titleDiv.appendChild(deleteBtn);
    const skipBtn = document.createElement("button");
    skipBtn.className = "hf-action-btn tooltip";
    skipBtn.textContent = "skip";
    skipBtn.dataset.title = "Skip this read3d in the pipeline";
    skipBtn.setAttribute("aria-label", "Skip this read3d in the pipeline");
    skipBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const isSkipped = effectDiv.classList.toggle("skipped");
      skipBtn.textContent = isSkipped ? "unskip" : "skip";
      skipBtn.classList.toggle("active", isSkipped);
      if (isSkipped) {
        effectDiv.classList.add("collapsed");
      } else {
        effectDiv.classList.remove("collapsed");
      }
      await this._toggleStepSkipAtIndex(stepIndex, isSkipped);
    });
    titleDiv.appendChild(skipBtn);
    titleDiv.addEventListener("click", () => {
      if (effectDiv.classList.contains("skipped")) {
        return;
      }
      effectDiv.classList.toggle("collapsed");
    });
    effectDiv.appendChild(titleDiv);
    const contentDiv = document.createElement("div");
    contentDiv.className = "effect-content";
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;";
    const volGroup = document.createElement("div");
    volGroup.className = "control-group";
    const volHeader = document.createElement("div");
    volHeader.className = "control-header";
    const volLabel = document.createElement("span");
    volLabel.className = "control-label";
    volLabel.textContent = "volume";
    volHeader.appendChild(volLabel);
    volGroup.appendChild(volHeader);
    const volumes = [
      { value: "none", label: "none" },
      { value: "vol0", label: "vol0" },
      { value: "vol1", label: "vol1" },
      { value: "vol2", label: "vol2" },
      { value: "vol3", label: "vol3" },
      { value: "vol4", label: "vol4" },
      { value: "vol5", label: "vol5" },
      { value: "vol6", label: "vol6" },
      { value: "vol7", label: "vol7" }
    ];
    const currentVol = read3dSource.tex3d?.name || "vol0";
    const volHandle = this._controlFactory.createSelect({
      choices: volumes,
      value: currentVol,
      className: "hf-input"
    });
    const volSelect = volHandle.element;
    volSelect.addEventListener("change", () => {
      this._programState.setRead3dVolume(stepIndex, volHandle.getValue());
      this._onControlChange();
      if (this._onRequestRecompileCallback) {
        this._onRequestRecompileCallback();
      }
    });
    volGroup.appendChild(volSelect);
    controlsDiv.appendChild(volGroup);
    const geoGroup = document.createElement("div");
    geoGroup.className = "control-group";
    const geoHeader = document.createElement("div");
    geoHeader.className = "control-header";
    const geoLabel = document.createElement("span");
    geoLabel.className = "control-label";
    geoLabel.textContent = "geometry";
    geoHeader.appendChild(geoLabel);
    geoGroup.appendChild(geoHeader);
    const geometries = [
      { value: "none", label: "none" },
      { value: "geo0", label: "geo0" },
      { value: "geo1", label: "geo1" },
      { value: "geo2", label: "geo2" },
      { value: "geo3", label: "geo3" },
      { value: "geo4", label: "geo4" },
      { value: "geo5", label: "geo5" },
      { value: "geo6", label: "geo6" },
      { value: "geo7", label: "geo7" }
    ];
    const currentGeo = read3dSource.geo?.name || "geo0";
    const geoHandle = this._controlFactory.createSelect({
      choices: geometries,
      value: currentGeo,
      className: "hf-input"
    });
    const geoSelect = geoHandle.element;
    geoSelect.addEventListener("change", () => {
      this._programState.setRead3dGeometry(stepIndex, geoHandle.getValue());
      this._onControlChange();
      if (this._onRequestRecompileCallback) {
        this._onRequestRecompileCallback();
      }
    });
    geoGroup.appendChild(geoSelect);
    controlsDiv.appendChild(geoGroup);
    contentDiv.appendChild(controlsDiv);
    effectDiv.appendChild(contentDiv);
    return effectDiv;
  }
  /**
   * Create a write3d effect for a step
   * @private
   * @param {number} planIndex - The plan index
   * @param {number} stepIndex - The step index for this write3d
   * @param {object} write3dArgs - The write3d args containing tex3d and geo
   * @param {boolean} isMidChain - Whether this is a mid-chain write3d (not terminal)
   */
  _createWrite3dEffect(planIndex, stepIndex, write3dArgs, isMidChain = false) {
    const effectDiv = document.createElement("div");
    effectDiv.className = "shader-effect hf-panel";
    effectDiv.dataset.planIndex = planIndex;
    effectDiv.dataset.stepIndex = stepIndex;
    effectDiv.dataset.effectName = "write3d";
    if (isMidChain) {
      effectDiv.dataset.midChain = "true";
    }
    const titleDiv = document.createElement("div");
    titleDiv.className = "effect-title";
    titleDiv.textContent = "write3d";
    titleDiv.addEventListener("click", () => {
      effectDiv.classList.toggle("collapsed");
    });
    effectDiv.appendChild(titleDiv);
    const contentDiv = document.createElement("div");
    contentDiv.className = "effect-content";
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;";
    const volGroup = document.createElement("div");
    volGroup.className = "control-group";
    const volHeader = document.createElement("div");
    volHeader.className = "control-header";
    const volLabel = document.createElement("span");
    volLabel.className = "control-label";
    volLabel.textContent = "volume";
    volHeader.appendChild(volLabel);
    volGroup.appendChild(volHeader);
    const volumes = [
      { value: "none", label: "none" },
      { value: "vol0", label: "vol0" },
      { value: "vol1", label: "vol1" },
      { value: "vol2", label: "vol2" },
      { value: "vol3", label: "vol3" },
      { value: "vol4", label: "vol4" },
      { value: "vol5", label: "vol5" },
      { value: "vol6", label: "vol6" },
      { value: "vol7", label: "vol7" }
    ];
    const currentVol = write3dArgs.tex3d?.name || "vol0";
    const volHandle = this._controlFactory.createSelect({
      choices: volumes,
      value: currentVol,
      className: "hf-input"
    });
    const volSelect = volHandle.element;
    volSelect.addEventListener("change", () => {
      this._programState.setWrite3dVolume(stepIndex, volHandle.getValue());
      this._onControlChange();
      if (this._onRequestRecompileCallback) {
        this._onRequestRecompileCallback();
      }
    });
    volGroup.appendChild(volSelect);
    controlsDiv.appendChild(volGroup);
    const geoGroup = document.createElement("div");
    geoGroup.className = "control-group";
    const geoHeader = document.createElement("div");
    geoHeader.className = "control-header";
    const geoLabel = document.createElement("span");
    geoLabel.className = "control-label";
    geoLabel.textContent = "geometry";
    geoHeader.appendChild(geoLabel);
    geoGroup.appendChild(geoHeader);
    const geometries = [
      { value: "none", label: "none" },
      { value: "geo0", label: "geo0" },
      { value: "geo1", label: "geo1" },
      { value: "geo2", label: "geo2" },
      { value: "geo3", label: "geo3" },
      { value: "geo4", label: "geo4" },
      { value: "geo5", label: "geo5" },
      { value: "geo6", label: "geo6" },
      { value: "geo7", label: "geo7" }
    ];
    const currentGeo = write3dArgs.geo?.name || "geo0";
    const geoHandle = this._controlFactory.createSelect({
      choices: geometries,
      value: currentGeo,
      className: "hf-input"
    });
    const geoSelect = geoHandle.element;
    geoSelect.addEventListener("change", () => {
      this._programState.setWrite3dGeometry(stepIndex, geoHandle.getValue());
      this._onControlChange();
      if (this._onRequestRecompileCallback) {
        this._onRequestRecompileCallback();
      }
    });
    geoGroup.appendChild(geoSelect);
    controlsDiv.appendChild(geoGroup);
    contentDiv.appendChild(controlsDiv);
    effectDiv.appendChild(contentDiv);
    return effectDiv;
  }
  /**
   * Delete a step from the pipeline by its global step index.
   * Extracted for reuse by effects.
   * @private
   * @param {number} targetStepIndex - The global step index to delete
   */
  async _deleteStepAtIndex(targetStepIndex) {
    const result = this._programState.deleteStep(targetStepIndex);
    if (!result.success) {
      this.showStatus(`cannot delete: ${result.error}`, "error");
      return;
    }
    if (result.deletedSurfaceName && this._renderer.pipeline) {
      this._renderer.pipeline.clearSurface(result.deletedSurfaceName);
    }
    this.setDsl(result.newDsl);
    this._renderer.currentDsl = result.newDsl;
    this.createEffectControlsFromState();
    await this._recompilePipeline();
  }
  /**
   * Toggle the skip state of a step by its global step index.
   * @private
   * @param {number} targetStepIndex - The global step index to toggle
   * @param {boolean} isSkipped - Whether the step should be skipped
   */
  async _toggleStepSkipAtIndex(targetStepIndex, isSkipped) {
    const effectKey = `step_${targetStepIndex}`;
    this._programState.setValue(effectKey, "_skip", isSkipped);
    this._updateDslFromEffectParams();
    await this._recompilePipeline();
  }
  /**
   * Create the shader editor section for an effect
   * @private
   * @param {object} effectInfo - Effect info
   * @param {object} effectDef - Effect definition
   * @param {HTMLButtonElement} toggleBtn - The code button in the title bar that toggles visibility
   */
  _createShaderEditorSection(effectInfo, effectDef, toggleBtn) {
    const section = document.createElement("div");
    section.className = "shader-editor-section";
    section.style.cssText = "display: none; margin-top: 0.75rem; padding-top: 0.75rem;";
    const programNames = Object.keys(effectDef.shaders);
    let programHandle = null;
    if (programNames.length > 1) {
      const choices = programNames.map((name) => ({ value: name, label: name }));
      programHandle = this._controlFactory.createSelect({
        choices,
        value: programNames[0],
        className: "hf-input"
      });
      const programSelect = programHandle.element;
      programSelect.style.cssText = "margin-bottom: 0.5rem;";
      section.appendChild(programSelect);
      programSelect.addEventListener("change", () => {
        this._updateShaderEditorContent(effectInfo, effectDef, programHandle.getValue(), section);
      });
    }
    const textarea = document.createElement("textarea");
    textarea.className = "shader-source-editor";
    textarea.name = "shader-source";
    textarea.spellcheck = false;
    textarea.style.cssText = "width: 100%; min-height: 200px; resize: vertical; background: color-mix(in srgb, var(--color1) 60%, transparent 40%); border: 1px solid color-mix(in srgb, var(--accent3) 25%, transparent 75%); border-radius: var(--ui-corner-radius-small); font-family: var(--hf-font-family-mono); font-size: 0.625rem; line-height: 1.4; color: var(--color5); padding: 0.5rem; box-sizing: border-box;";
    section.appendChild(textarea);
    const btnContainer = document.createElement("div");
    btnContainer.style.cssText = "display: flex; gap: 0.5rem; margin-top: 0.5rem;";
    section.appendChild(btnContainer);
    const applyBtn = document.createElement("button");
    applyBtn.textContent = "apply shader";
    applyBtn.style.cssText = "flex: 1; padding: 0.375rem 0.75rem; background: color-mix(in srgb, var(--accent3) 30%, transparent 70%); border: 1px solid color-mix(in srgb, var(--accent3) 50%, transparent 50%); border-radius: var(--ui-corner-radius-small); color: var(--color6); font-family: var(--hf-font-family); font-size: 0.6875rem; font-weight: 600; cursor: pointer;";
    btnContainer.appendChild(applyBtn);
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "reset to original";
    resetBtn.style.cssText = "flex: 1; padding: 0.375rem 0.75rem; background: transparent; border: 1px solid color-mix(in srgb, var(--accent3) 30%, transparent 70%); border-radius: var(--ui-corner-radius-small); color: var(--color5); font-family: var(--hf-font-family); font-size: 0.6875rem; font-weight: 600; cursor: pointer;";
    btnContainer.appendChild(resetBtn);
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isVisible = section.style.display !== "none";
        section.style.display = isVisible ? "none" : "block";
        toggleBtn.textContent = isVisible ? "code" : "hide";
        toggleBtn.classList.toggle("active", !isVisible);
        if (!isVisible) {
          const programName = programHandle ? programHandle.getValue() : programNames[0];
          this._updateShaderEditorContent(effectInfo, effectDef, programName, section);
        }
      });
    }
    applyBtn.addEventListener("click", () => {
      const programName = programHandle ? programHandle.getValue() : programNames[0];
      const backend = this._renderer.backend;
      const source = textarea.value;
      this._applyShaderOverride(effectInfo.stepIndex, programName, backend, source, effectDef);
    });
    resetBtn.addEventListener("click", () => {
      const programName = programNames.length > 1 ? section.querySelector("select")?.value : programNames[0];
      this._resetShaderOverride(effectInfo.stepIndex, programName);
      this._updateShaderEditorContent(effectInfo, effectDef, programName, section);
    });
    return section;
  }
  /**
   * Update the shader editor content for a specific program and backend
   * @private
   */
  _updateShaderEditorContent(effectInfo, effectDef, programName, container) {
    const textarea = container.querySelector("textarea");
    const backend = this._renderer.backend;
    const override = this._shaderOverrides[effectInfo.stepIndex]?.[programName];
    let source = "";
    if (override) {
      if (backend === "wgsl" && override.wgsl) {
        source = override.wgsl;
      } else if (override.glsl) {
        source = override.glsl;
      } else if (override.fragment) {
        source = override.fragment;
      }
    }
    if (!source) {
      const shaders = effectDef.shaders[programName];
      if (shaders) {
        if (backend === "wgsl" && shaders.wgsl) {
          source = shaders.wgsl;
        } else if (shaders.glsl) {
          source = shaders.glsl;
        } else if (shaders.fragment) {
          source = shaders.fragment;
        }
      }
    }
    textarea.value = source || "// No shader source available";
  }
  /**
   * Apply a shader override for a step
   * @private
   */
  _applyShaderOverride(stepIndex, programName, backend, source, effectDef) {
    if (!this._shaderOverrides[stepIndex]) {
      this._shaderOverrides[stepIndex] = {};
    }
    const originalShaders = effectDef.shaders[programName] || {};
    const override = { ...originalShaders };
    if (backend === "wgsl") {
      override.wgsl = source;
    } else {
      if (originalShaders.glsl) {
        override.glsl = source;
      } else if (originalShaders.fragment) {
        override.fragment = source;
      } else {
        override.glsl = source;
      }
    }
    this._shaderOverrides[stepIndex][programName] = override;
    this._recompileWithShaderOverrides();
  }
  /**
   * Reset a shader override to original
   * @private
   */
  _resetShaderOverride(stepIndex, programName) {
    if (this._shaderOverrides[stepIndex]) {
      delete this._shaderOverrides[stepIndex][programName];
      if (Object.keys(this._shaderOverrides[stepIndex]).length === 0) {
        delete this._shaderOverrides[stepIndex];
      }
    }
    this._recompileWithShaderOverrides();
  }
  /**
   * Recompile the pipeline with current shader overrides
   * @private
   */
  async _recompileWithShaderOverrides() {
    const dsl = this.getDsl();
    if (!dsl) return;
    try {
      await this._renderer.compile(dsl, {
        shaderOverrides: this._shaderOverrides
      });
      this.showStatus("shader applied", "success");
    } catch (err) {
      console.error("Shader compilation failed:", this.formatCompilationError(err));
      this.showStatus("shader error: " + this.formatCompilationError(err), "error");
    }
  }
  /**
   * Recompile the pipeline after a structural change (e.g., _skip toggle)
   * @private
   */
  async _recompilePipeline() {
    const dsl = this.getDsl();
    if (!dsl) return;
    try {
      await this._renderer.compile(dsl, {
        shaderOverrides: this._shaderOverrides
      });
      this.showStatus("pipeline updated", "success");
    } catch (err) {
      console.error("Pipeline compilation failed:", this.formatCompilationError(err));
      this.showStatus("compilation error: " + this.formatCompilationError(err), "error");
    }
  }
  /**
   * Create a control group for a parameter
   * @private
   */
  _createControlGroup(key, spec, effectInfo, effectKey) {
    if (spec.ui?.control === false || spec.ui?.hidden === true) {
      return null;
    }
    const controlGroup = document.createElement("div");
    controlGroup.className = "control-group";
    controlGroup.dataset.paramKey = key;
    const label = document.createElement("span");
    label.className = "control-label";
    label.textContent = spec.ui?.label || key;
    if (spec.ui?.hint) {
      label.classList.add("tooltip");
      label.dataset.title = spec.ui.hint;
    }
    controlGroup.appendChild(label);
    if (spec.ui?.enabledBy) {
      this._dependentControls.push({
        element: controlGroup,
        effectKey,
        paramKey: key,
        enabledBy: spec.ui.enabledBy
      });
    }
    let value;
    const preservedValue = this._programState.getValue(effectKey, key);
    if (preservedValue !== void 0) {
      value = preservedValue;
    } else if (effectInfo.args[key] !== void 0) {
      value = effectInfo.args[key];
    } else {
      value = cloneParamValue(spec.default);
    }
    const rawKwarg = effectInfo.rawKwargs?.[key];
    const automationValue = value && typeof value === "object" ? value : effectInfo.args?.[key];
    const isAutomated = automationValue && typeof automationValue === "object" && (automationValue._varRef || automationValue.type === "Oscillator" || automationValue.type === "Midi" || automationValue.type === "Audio" || automationValue._ast?.type === "Oscillator" || automationValue._ast?.type === "Midi" || automationValue._ast?.type === "Audio") || rawKwarg && typeof rawKwarg === "object" && (rawKwarg.type === "Oscillator" || rawKwarg.type === "Midi" || rawKwarg.type === "Audio");
    if (isAutomated) {
      if (rawKwarg && rawKwarg.type === "Ident") {
        this._programState.setValue(effectKey, key, { _varRef: rawKwarg.name });
      }
      const autoLabel = document.createElement("span");
      autoLabel.className = "control-value";
      autoLabel.textContent = " automatic";
      autoLabel.style.fontStyle = "italic";
      autoLabel.style.opacity = "0.7";
      controlGroup.appendChild(autoLabel);
      return controlGroup;
    }
    this._programState.setValue(effectKey, key, value);
    if (spec.ui?.control === "button") {
      this._createButtonControl(controlGroup, key, spec);
    } else if (spec.ui?.control === "checkbox" || spec.type === "boolean") {
      this._createBooleanControl(controlGroup, key, value, effectKey);
    } else if (spec.ui?.control === "color" || spec.type === "vec4") {
      this._createColorControl(controlGroup, key, value, effectKey, spec);
    } else if (spec.type === "vec2") {
      this._createVector2dControl(controlGroup, key, value, effectKey, spec);
    } else if (spec.type === "vec3") {
      this._createVector3dControl(controlGroup, key, value, effectKey, spec);
    } else if (spec.choices) {
      this._createChoicesControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.enum && spec.type === "int") {
      this._createEnumIntControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.type === "member") {
      this._createMemberControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.type === "float" || spec.type === "int") {
      this._createSliderControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.type === "surface") {
      this._createSurfaceControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.type === "volume") {
      this._createVolumeControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.type === "geometry") {
      this._createGeometryControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.type === "string") {
      this._createStringControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.type === "enum") {
      this._createEnumControl(controlGroup, key, spec, value, effectKey);
    } else if (spec.type === "color") {
      this._createHexColorControl(controlGroup, key, spec, value, effectKey);
    }
    return controlGroup;
  }
  /** @private */
  _createBooleanControl(container, key, value, effectKey) {
    const handle = this._controlFactory.createToggle({
      value: !!value
    });
    const toggle = handle.element;
    toggle.addEventListener("change", () => {
      this._programState.setValue(effectKey, key, handle.getValue());
      this._onControlChange();
    });
    container.appendChild(toggle);
    container._controlHandle = handle;
  }
  /**
   * Create a momentary button control for boolean uniforms
   * Button sets uniform to true, then resets to false after one frame
   * @private
   */
  _createButtonControl(container, key, spec) {
    const handle = this._controlFactory.createButton({
      label: spec.ui?.buttonLabel || "reset",
      className: "hf-action-btn tooltip",
      title: spec.ui?.label || key
    });
    const button = handle.element;
    button.dataset.buttonType = spec.ui?.buttonLabel || "reset";
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const pipeline = this._renderer.pipeline;
      if (!pipeline) {
        return;
      }
      const uniformName = spec.uniform || key;
      pipeline.globalUniforms[uniformName] = true;
      if (pipeline.graph && pipeline.graph.passes) {
        for (const pass of pipeline.graph.passes) {
          if (pass.uniforms) {
            pass.uniforms[uniformName] = true;
          }
        }
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            pipeline.globalUniforms[uniformName] = false;
            if (pipeline.graph && pipeline.graph.passes) {
              for (const pass of pipeline.graph.passes) {
                if (pass.uniforms) {
                  pass.uniforms[uniformName] = false;
                }
              }
            }
          });
        });
      });
    });
    container.appendChild(button);
    container._controlHandle = handle;
  }
  /** @private */
  _createChoicesControl(container, key, spec, value, effectKey) {
    for (const name of Object.keys(spec.choices)) {
      if (name.endsWith(":")) continue;
      if (name.includes(" ")) {
        console.warn(`[Noisemaker] Deprecated: spaces in enum key "${name}" for "${key}". Use camelCase instead.`);
      }
    }
    const choices = [];
    Object.entries(spec.choices).forEach(([name, val]) => {
      if (name.endsWith(":")) return;
      choices.push({
        value: val,
        label: name,
        data: { paramValue: JSON.stringify(val) }
      });
    });
    const handle = this._controlFactory.createSelect({
      choices,
      value,
      className: "hf-input"
    });
    const select = handle.element;
    select.addEventListener("change", () => {
      this._programState.setValue(effectKey, key, handle.getValue());
      this._onControlChange();
    });
    container.appendChild(select);
    container._controlHandle = handle;
  }
  /** @private */
  _createEnumIntControl(container, key, spec, value, effectKey) {
    const enumPath = spec.enum;
    const parts = enumPath.split(".");
    let node = this._renderer.enums;
    for (const part of parts) {
      if (node && node[part]) {
        node = node[part];
      } else {
        node = null;
        break;
      }
    }
    if (node && typeof node === "object") {
      const choices = [];
      Object.entries(node).forEach(([name, val]) => {
        const numVal = val && typeof val === "object" && "value" in val ? val.value : val;
        choices.push({ value: numVal, label: name });
      });
      const handle = this._controlFactory.createSelect({
        choices,
        value,
        className: "hf-input"
      });
      const select = handle.element;
      select.addEventListener("change", () => {
        this._programState.setValue(effectKey, key, parseInt(handle.getValue(), 10));
        this._onControlChange();
      });
      container.appendChild(select);
      container._controlHandle = handle;
    } else {
      const handle = this._controlFactory.createSlider({
        value,
        min: spec.min || 0,
        max: spec.max || 10,
        step: 1
      });
      const slider = handle.element;
      slider.addEventListener("change", () => {
        this._programState.setValue(effectKey, key, parseInt(handle.getValue(), 10));
        this._onControlChange();
      });
      container.appendChild(slider);
      container._controlHandle = handle;
    }
  }
  /** @private */
  _createMemberControl(container, key, spec, value, effectKey) {
    let enumPath = spec.enum || spec.enumPath;
    if (!enumPath && typeof spec.default === "string") {
      const parts = spec.default.split(".");
      if (parts.length > 1) {
        enumPath = parts.slice(0, -1).join(".");
      }
    }
    if (enumPath) {
      const parts = enumPath.split(".");
      let node = this._renderer.enums;
      for (const part of parts) {
        if (node && node[part]) {
          node = node[part];
        } else {
          node = null;
          break;
        }
      }
      if (node) {
        const choices = [];
        const enumEntries = [];
        Object.keys(node).forEach((k) => {
          const fullPath = `${enumPath}.${k}`;
          const enumEntry = node[k];
          const numericValue = enumEntry && typeof enumEntry === "object" && "value" in enumEntry ? enumEntry.value : enumEntry;
          choices.push({
            value: fullPath,
            label: k,
            data: { enumValue: numericValue }
          });
          enumEntries.push({ path: fullPath, numericValue });
        });
        let initialValue = choices[0]?.value;
        for (const entry of enumEntries) {
          if (entry.numericValue === value || entry.path === value) {
            initialValue = entry.path;
            break;
          }
        }
        this._programState.setValue(effectKey, key, initialValue);
        const handle = this._controlFactory.createSelect({
          choices,
          value: initialValue,
          className: "hf-input"
        });
        const select = handle.element;
        select.addEventListener("change", () => {
          this._programState.setValue(effectKey, key, handle.getValue());
          this._onControlChange();
        });
        container.appendChild(select);
        container._controlHandle = {
          element: select,
          getValue: handle.getValue,
          setValue: (v) => {
            for (const entry of enumEntries) {
              if (entry.numericValue === v || entry.path === v) {
                handle.setValue(entry.path);
                return;
              }
            }
            handle.setValue(v);
          }
        };
      }
    }
  }
  /** @private */
  _createSliderControl(container, key, spec, value, effectKey) {
    const isInt = spec.type === "int";
    const formatVal = (v) => isInt ? v : Number(v).toFixed(2);
    const handle = this._controlFactory.createSlider({
      value: value !== null ? value : spec.min !== void 0 ? spec.min : 0,
      min: spec.min !== void 0 ? spec.min : 0,
      max: spec.max !== void 0 ? spec.max : 100,
      step: spec.step !== void 0 ? spec.step : isInt ? 1 : 0.01,
      className: "control-slider"
    });
    const slider = handle.element;
    container.appendChild(slider);
    const hasBuiltInDisplay = slider.tagName === "SLIDER-VALUE";
    let valueDisplayHandle = null;
    if (!hasBuiltInDisplay) {
      valueDisplayHandle = this._controlFactory.createValueDisplay({
        value: value !== null ? formatVal(value) : "",
        className: "control-value"
      });
      container.appendChild(valueDisplayHandle.element);
    }
    slider.addEventListener("input", () => {
      const numVal = isInt ? parseInt(handle.getValue()) : parseFloat(handle.getValue());
      if (valueDisplayHandle) valueDisplayHandle.setValue(formatVal(numVal));
      this._programState.setValue(effectKey, key, numVal);
      this._syncTextInputsFromParams();
    });
    slider.addEventListener("change", () => {
      this._onControlChange();
    });
    container._controlHandle = {
      element: slider,
      getValue: () => isInt ? parseInt(handle.getValue()) : parseFloat(handle.getValue()),
      setValue: (v) => {
        handle.setValue(v);
        if (valueDisplayHandle) valueDisplayHandle.setValue(formatVal(v));
      }
    };
    container._valueDisplayHandle = valueDisplayHandle;
  }
  /** @private */
  _createColorControl(container, key, value, effectKey, spec) {
    const isVec4 = spec?.type === "vec4";
    let colorArray;
    if (Array.isArray(value)) {
      colorArray = value;
    } else if (typeof value === "string" && value.startsWith("#")) {
      const hex = value.slice(1);
      colorArray = [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255
      ];
    } else {
      colorArray = [0, 0, 0];
    }
    const handle = this._controlFactory.createColorPicker({
      value: colorArray,
      hasAlpha: isVec4,
      className: "control-color"
    });
    const colorInput = handle.element;
    colorInput.addEventListener("input", () => {
      const colorVal = handle.getValue();
      if (isVec4) {
        const currentVal = this._programState.getValue(effectKey, key);
        const a = Array.isArray(currentVal) && currentVal.length >= 4 && typeof currentVal[3] === "number" ? currentVal[3] : 1;
        this._programState.setValue(effectKey, key, [colorVal[0], colorVal[1], colorVal[2], a]);
      } else {
        this._programState.setValue(effectKey, key, colorVal);
      }
      this._onControlChange();
    });
    container.appendChild(colorInput);
    container._controlHandle = handle;
  }
  /**
   * Create a vector2d control for vec2 parameters.
   * @private
   */
  _createVector2dControl(container, key, value, effectKey, spec) {
    const val = Array.isArray(value) ? value : [0, 0];
    const handle = this._controlFactory.createVector2dPicker({
      value: val,
      min: spec.min,
      max: spec.max,
      step: spec.step
    });
    handle.element.addEventListener("input", () => {
      this._programState.setValue(effectKey, key, handle.getValue());
      this._onControlChange();
    });
    container.appendChild(handle.element);
    container._controlHandle = handle;
  }
  /**
   * Create a vector3d control for vec3 parameters (direction, position, etc.).
   * @private
   */
  _createVector3dControl(container, key, value, effectKey, spec) {
    const val = Array.isArray(value) ? value : [0, 0, 0];
    const handle = this._controlFactory.createVector3dPicker({
      value: val,
      min: spec.min,
      max: spec.max,
      step: spec.step
    });
    handle.element.addEventListener("input", () => {
      this._programState.setValue(effectKey, key, handle.getValue());
      this._onControlChange();
    });
    container.appendChild(handle.element);
    container._controlHandle = handle;
  }
  /** @private */
  _createSurfaceControl(container, key, spec, value, effectKey) {
    const surfaces = [
      { value: "none", label: "none" },
      { value: "o0", label: "o0" },
      { value: "o1", label: "o1" },
      { value: "o2", label: "o2" },
      { value: "o3", label: "o3" },
      { value: "o4", label: "o4" },
      { value: "o5", label: "o5" },
      { value: "o6", label: "o6" },
      { value: "o7", label: "o7" }
    ];
    let currentSurface = spec.default || "o1";
    if (value && typeof value === "object" && value.name) {
      currentSurface = value.name;
    } else if (typeof value === "string") {
      const match = value.match(/read\(([^)]+)\)|^(o[0-7])$/);
      if (match) {
        currentSurface = match[1] || match[2];
      } else if (value) {
        currentSurface = value;
      }
    }
    const handle = this._controlFactory.createSelect({
      choices: surfaces,
      value: currentSurface,
      className: "hf-input"
    });
    const select = handle.element;
    select.addEventListener("change", async () => {
      const val = handle.getValue();
      this._programState.setValue(effectKey, key, val === "none" ? "none" : `read(${val})`);
      this._updateDslFromEffectParams();
      await this._recompilePipeline();
      this._updateDependentControls();
    });
    container.appendChild(select);
    container._controlHandle = {
      element: select,
      getValue: () => {
        const val = handle.getValue();
        return val === "none" ? "none" : `read(${val})`;
      },
      setValue: (v) => {
        let surfaceId = v;
        if (typeof v === "object" && v.name) {
          surfaceId = v.name;
        } else if (typeof v === "string") {
          const match = v.match(/read\(([^)]+)\)|^(o[0-7])$/);
          if (match) surfaceId = match[1] || match[2];
        }
        handle.setValue(surfaceId || "none");
      }
    };
  }
  /** @private */
  _createVolumeControl(container, key, spec, value, effectKey) {
    const volumes = [
      { value: "none", label: "none" },
      { value: "vol0", label: "vol0" },
      { value: "vol1", label: "vol1" },
      { value: "vol2", label: "vol2" },
      { value: "vol3", label: "vol3" },
      { value: "vol4", label: "vol4" },
      { value: "vol5", label: "vol5" },
      { value: "vol6", label: "vol6" },
      { value: "vol7", label: "vol7" }
    ];
    let currentVolume = spec.default || "vol0";
    if (value && typeof value === "object" && value.name) {
      currentVolume = value.name;
    } else if (typeof value === "string") {
      const match = value.match(/^(vol[0-7])$/);
      if (match) {
        currentVolume = match[1];
      } else if (value) {
        currentVolume = value;
      }
    }
    const handle = this._controlFactory.createSelect({
      choices: volumes,
      value: currentVolume,
      className: "hf-input"
    });
    const select = handle.element;
    select.addEventListener("change", async () => {
      this._programState.setValue(effectKey, key, handle.getValue());
      this._updateDslFromEffectParams();
      await this._recompilePipeline();
    });
    container.appendChild(select);
    container._controlHandle = {
      element: select,
      getValue: handle.getValue,
      setValue: (v) => {
        let volId = v;
        if (typeof v === "object" && v.name) volId = v.name;
        handle.setValue(volId || "none");
      }
    };
  }
  /** @private */
  _createGeometryControl(container, key, spec, value, effectKey) {
    const geometries = [
      { value: "none", label: "none" },
      { value: "geo0", label: "geo0" },
      { value: "geo1", label: "geo1" },
      { value: "geo2", label: "geo2" },
      { value: "geo3", label: "geo3" },
      { value: "geo4", label: "geo4" },
      { value: "geo5", label: "geo5" },
      { value: "geo6", label: "geo6" },
      { value: "geo7", label: "geo7" }
    ];
    let currentGeometry = spec.default || "geo0";
    if (value && typeof value === "object" && value.name) {
      currentGeometry = value.name;
    } else if (typeof value === "string") {
      const match = value.match(/^(geo[0-7])$/);
      if (match) {
        currentGeometry = match[1];
      } else if (value) {
        currentGeometry = value;
      }
    }
    const handle = this._controlFactory.createSelect({
      choices: geometries,
      value: currentGeometry,
      className: "hf-input"
    });
    const select = handle.element;
    select.addEventListener("change", async () => {
      this._programState.setValue(effectKey, key, handle.getValue());
      this._updateDslFromEffectParams();
      await this._recompilePipeline();
    });
    container.appendChild(select);
    container._controlHandle = {
      element: select,
      getValue: handle.getValue,
      setValue: (v) => {
        let geoId = v;
        if (typeof v === "object" && v.name) geoId = v.name;
        handle.setValue(geoId || "none");
      }
    };
  }
  /** @private Create a text input control for string type */
  _createStringControl(container, key, spec, value, effectKey) {
    const isMultiline = spec.ui?.multiline !== false;
    const input = document.createElement(isMultiline ? "textarea" : "input");
    if (!isMultiline) input.type = "text";
    input.value = value || spec.default || "";
    if (isMultiline) input.rows = 3;
    input.style.cssText = "width: 100%; padding: 0.375rem 0.5rem; background: var(--color1); border: 1px solid var(--color3); border-radius: var(--ui-corner-radius-small); color: var(--color6); font-family: var(--hf-font-family); font-size: 0.75rem; resize: vertical;";
    input.addEventListener("input", () => {
      this._programState.setValue(effectKey, key, input.value);
      this._onControlChange();
    });
    container.appendChild(input);
    container._controlHandle = {
      element: input,
      getValue: () => input.value,
      setValue: (v) => {
        input.value = v || "";
      }
    };
  }
  /** @private Create a select control for enum type */
  _createEnumControl(container, key, spec, value, effectKey) {
    const options = spec.options || [];
    const choices = options.map((opt) => ({ value: opt, label: opt }));
    const handle = this._controlFactory.createSelect({
      choices,
      value: value || spec.default || options[0],
      className: "hf-input"
    });
    const select = handle.element;
    select.addEventListener("change", () => {
      this._programState.setValue(effectKey, key, handle.getValue());
      this._onControlChange();
    });
    container.appendChild(select);
    container._controlHandle = handle;
  }
  /** @private Create a color picker for hex color string type */
  _createHexColorControl(container, key, spec, value, effectKey) {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    let hexValue = value;
    if (Array.isArray(value)) {
      const toHex = (n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0");
      hexValue = `#${toHex(value[0])}${toHex(value[1])}${toHex(value[2])}`;
    }
    colorInput.value = hexValue || spec.default || "#ffffff";
    colorInput.style.cssText = "width: 100%; height: 2rem; padding: 0; border: 1px solid var(--color3); border-radius: var(--ui-corner-radius-small); cursor: pointer;";
    colorInput.addEventListener("input", () => {
      this._programState.setValue(effectKey, key, colorInput.value);
      this._onControlChange();
    });
    container.appendChild(colorInput);
    container._controlHandle = {
      element: colorInput,
      getValue: () => colorInput.value,
      setValue: (v) => {
        colorInput.value = v || "#ffffff";
      }
    };
  }
  /** @private Called when a control value changes */
  _onControlChange() {
    this._updateDependentControls();
    this._updateDslFromEffectParams();
    this._syncTextInputsFromParams();
    if (this._onControlChangeCallback) {
      this._onControlChangeCallback();
    }
  }
  /**
   * Sync text canvas state from programState and re-render
   * Called when any control changes - only affects text effects
   * @private
   */
  _syncTextInputsFromParams() {
    for (const [stepIndex, textState] of this._textInputs.entries()) {
      const params = this._programState.getStepValues(textState.effectKey);
      if (!params) continue;
      textState.textContent = params.text ?? textState.textContent;
      textState.font = params.font ?? textState.font;
      textState.size = params.size ?? textState.size;
      textState.posX = params.posX ?? textState.posX;
      textState.posY = params.posY ?? textState.posY;
      textState.color = params.color ?? textState.color;
      textState.rotation = params.rotation ?? textState.rotation;
      textState.bgColor = params.bgColor ?? textState.bgColor;
      textState.bgOpacity = params.bgOpacity ?? textState.bgOpacity;
      textState.justify = params.justify ?? textState.justify;
      this._renderTextToCanvas(stepIndex);
    }
  }
  /**
   * Update disabled state of dependent controls based on their enabledBy values
   * @private
   */
  _updateDependentControls() {
    for (const dep of this._dependentControls) {
      const { element, effectKey, enabledBy } = dep;
      const params = this._programState.getStepValues(effectKey);
      if (!params) continue;
      const isEnabled = this._evaluateEnableCondition(enabledBy, params);
      if (isEnabled) {
        element.classList.remove("disabled");
      } else {
        element.classList.add("disabled");
      }
    }
  }
  /**
   * Evaluate an enabledBy condition against current parameter values
   *
   * Supports multiple formats:
   * - String (legacy): "paramName" - uses _isControlEnabled for truthy check
   * - Object with conditions:
   *   - { param: "name", eq: value } - equals
   *   - { param: "name", neq: value } - not equals
   *   - { param: "name", gt: value } - greater than
   *   - { param: "name", gte: value } - greater than or equal
   *   - { param: "name", lt: value } - less than
   *   - { param: "name", lte: value } - less than or equal
   *   - { param: "name", in: [values] } - value is member of array
   *   - { param: "name", notIn: [values] } - value is not member of array
   *   - Multiple conditions in one object are AND'd together
   * - { or: [condition1, condition2, ...] } - OR multiple conditions
   * - { and: [condition1, condition2, ...] } - AND multiple conditions (explicit)
   * - { not: condition } - negate a condition
   *
   * @param {string|object} condition - The enabledBy condition
   * @param {object} params - Current parameter values
   * @returns {boolean} Whether the control should be enabled
   * @private
   */
  _evaluateEnableCondition(condition, params) {
    if (typeof condition === "string") {
      const value2 = params[condition];
      return this._isControlEnabled(value2);
    }
    if (typeof condition !== "object" || condition === null) {
      return true;
    }
    if (Array.isArray(condition.or)) {
      return condition.or.some((c) => this._evaluateEnableCondition(c, params));
    }
    if (Array.isArray(condition.and)) {
      return condition.and.every((c) => this._evaluateEnableCondition(c, params));
    }
    if (condition.not !== void 0) {
      return !this._evaluateEnableCondition(condition.not, params);
    }
    const paramName = condition.param;
    if (!paramName) {
      return true;
    }
    const value = params[paramName];
    const operators = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "notIn"];
    const hasOperator = operators.some((op) => condition[op] !== void 0);
    if (!hasOperator) {
      return this._isControlEnabled(value);
    }
    let result = true;
    if (condition.eq !== void 0) {
      result = result && this._valuesEqual(value, condition.eq);
    }
    if (condition.neq !== void 0) {
      result = result && !this._valuesEqual(value, condition.neq);
    }
    if (condition.gt !== void 0) {
      result = result && (typeof value === "number" && value > condition.gt);
    }
    if (condition.gte !== void 0) {
      result = result && (typeof value === "number" && value >= condition.gte);
    }
    if (condition.lt !== void 0) {
      result = result && (typeof value === "number" && value < condition.lt);
    }
    if (condition.lte !== void 0) {
      result = result && (typeof value === "number" && value <= condition.lte);
    }
    if (condition.in !== void 0 && Array.isArray(condition.in)) {
      result = result && condition.in.some((v) => this._valuesEqual(value, v));
    }
    if (condition.notIn !== void 0 && Array.isArray(condition.notIn)) {
      result = result && !condition.notIn.some((v) => this._valuesEqual(value, v));
    }
    return result;
  }
  /**
   * Compare two values for equality, handling different types
   * @private
   */
  _valuesEqual(a, b) {
    if (a === b) return true;
    if (a === null || a === void 0 || b === null || b === void 0) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => Math.abs(v - b[i]) < 1e-4);
    }
    if (typeof a === "number" && typeof b === "number") {
      return Math.abs(a - b) < 1e-4;
    }
    return a === b;
  }
  /**
   * Check if a control's enabler value means the dependent control should be enabled
   * Used for legacy string-based enabledBy (truthy check)
   * @private
   */
  _isControlEnabled(value) {
    if (value === void 0 || value === null) return false;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (Array.isArray(value)) {
      return value.some((v, i) => {
        if (i === 3) return false;
        return Math.abs(v - 0.5) > 0.01;
      });
    }
    if (typeof value === "string") return value.length > 0;
    return !!value;
  }
  /**
   * Update DSL from effect parameter values
   * @private
   */
  _updateDslFromEffectParams() {
    const newDsl = this._programState.toDsl();
    if (newDsl && newDsl !== this.getDsl()) {
      this.setDsl(newDsl);
      this._renderer.currentDsl = newDsl;
    }
  }
  // =========================================================================
  // Effect Selection and Pipeline Management
  // =========================================================================
  /**
   * Initialize parameter values from effect defaults
   * @param {object} effect - Effect object
   */
  initParameterValues(effect) {
    this._parameterValues = {};
    this._shaderOverrides = {};
    if (effect.instance && effect.instance.globals) {
      for (const [key, spec] of Object.entries(effect.instance.globals)) {
        if (spec.default !== void 0) {
          this._parameterValues[key] = cloneParamValue(spec.default);
        }
      }
    }
  }
  /**
   * Clear all shader overrides
   */
  clearShaderOverrides() {
    this._shaderOverrides = {};
    this._programState.clearRoutingOverrides();
  }
  /**
   * Format a compilation error for display
   * @param {Error} err - Error object
   * @param {string} [dslSource] - Optional DSL source for context
   * @returns {string} Formatted error message (short for status bar)
   */
  formatCompilationError(err, dslSource) {
    if (isDslSyntaxError(err)) {
      const source = dslSource || this.getDsl();
      if (source) {
        console.warn("DSL Syntax Error:\n" + formatDslError(source, err));
      }
    }
    if (err.code === "ERR_COMPILATION_FAILED" && Array.isArray(err.diagnostics)) {
      return err.diagnostics.filter((d) => d.severity === "error").map((d) => {
        let msg = d.message || "Unknown error";
        if (d.location) {
          msg += ` (line ${d.location.line}, col ${d.location.column})`;
        }
        return msg;
      }).join("; ") || "Unknown compilation error";
    }
    return err.message || err.detail || (typeof err === "object" ? JSON.stringify(err) : String(err));
  }
};

// demo/shaders/lib/effect-select.js
function camelToSpaceCase2(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2").toLowerCase();
}
var stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.id = "effect-select-styles";
  style.textContent = `
        effect-select {
            display: block;
            position: relative;
            font-family: var(--hf-font-family);
            width: 280px;
        }

        effect-select.open {
            z-index: 10000;
        }

        effect-select .es-trigger {
            width: 100%;
            padding: 0.25rem 0.375rem;
            padding-right: 1.5rem;
            background: color-mix(in srgb, var(--accent3) 15%, transparent 85%);
            border: 1px solid color-mix(in srgb, var(--accent3) 25%, transparent 75%);
            border-radius: var(--ui-corner-radius-small, 0.375rem);
            color: var(--color6, #d9deeb);
            font-family: var(--hf-font-family);
            font-size: 0.6875rem;
            font-weight: 560;
            outline: none;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: left;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            position: relative;
            box-sizing: border-box;
        }

        effect-select .es-trigger-name {
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--color6, #d9deeb);
        }

        effect-select .es-trigger-description {
            font-size: 0.625rem;
            font-weight: 400;
            color: var(--color5, #98a7c8);
        }

        effect-select .es-trigger::after {
            content: '\u25BC';
            position: absolute;
            right: 0.375rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.5rem;
            opacity: 0.6;
            pointer-events: none;
        }

        effect-select .es-trigger:hover {
            background: color-mix(in srgb, var(--accent3) 22%, transparent 78%);
            border-color: color-mix(in srgb, var(--accent3) 35%, transparent 65%);
        }

        effect-select .es-trigger:focus,
        effect-select.open .es-trigger {
            border-color: var(--accent3, #a5b8ff);
            background: color-mix(in srgb, var(--accent3) 25%, transparent 75%);
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent3) 25%, transparent 75%);
        }

        effect-select .es-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 0.25rem);
            left: 0;
            min-width: 100%;
            width: max-content;
            max-width: 500px;
            max-height: 400px;
            overflow-y: auto;
            overflow-x: hidden;
            background: color-mix(in srgb, var(--color2, #101522) 95%, transparent 5%);
            border: 1px solid color-mix(in srgb, var(--accent3) 35%, transparent 65%);
            border-radius: var(--ui-corner-radius-small, 0.375rem);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            z-index: 10000;
            backdrop-filter: blur(12px);
        }

        effect-select.open .es-dropdown {
            display: block;
        }

        effect-select.flip-up .es-dropdown {
            top: auto;
            bottom: calc(100% + 0.25rem);
        }

        effect-select .es-group-header {
            padding: 0.5rem 0.5rem 0.25rem;
            font-size: 0.625rem;
            font-weight: 700;
            text-transform: lowercase;
            letter-spacing: 0.05em;
            color: var(--accent3, #a5b8ff);
            background: color-mix(in srgb, var(--accent1, #141a2d) 50%, transparent 50%);
            border-bottom: 1px solid color-mix(in srgb, var(--accent3) 15%, transparent 85%);
            position: sticky;
            top: 0;
            z-index: 1;
        }

        effect-select .es-option {
            padding: 0.375rem 0.5rem;
            cursor: pointer;
            transition: background 0.1s ease;
            border-bottom: 1px solid color-mix(in srgb, var(--accent3) 8%, transparent 92%);
        }

        effect-select .es-option:last-child {
            border-bottom: none;
        }

        effect-select .es-option:hover,
        effect-select .es-option.focused {
            background: color-mix(in srgb, var(--accent3) 20%, transparent 80%);
        }

        effect-select .es-option.selected {
            background: color-mix(in srgb, var(--accent3) 30%, transparent 70%);
        }

        effect-select .es-option-name {
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--color6, #d9deeb);
        }

        effect-select .es-option-description {
            font-size: 0.625rem;
            font-weight: 400;
            color: var(--color5, #98a7c8);
        }

        /* Scrollbar styling */
        effect-select .es-dropdown::-webkit-scrollbar {
            width: 0.375rem;
        }

        effect-select .es-dropdown::-webkit-scrollbar-track {
            background: transparent;
        }

        effect-select .es-dropdown::-webkit-scrollbar-thumb {
            background: color-mix(in srgb, var(--accent3) 30%, transparent 70%);
            border-radius: 0.25rem;
        }

        effect-select .es-dropdown::-webkit-scrollbar-thumb:hover {
            background: color-mix(in srgb, var(--accent3) 50%, transparent 50%);
        }

        effect-select .es-dropdown {
            scrollbar-width: thin;
            scrollbar-color: color-mix(in srgb, var(--accent3) 30%, transparent 70%) transparent;
        }
    `;
  document.head.appendChild(style);
}
var EffectSelect = class extends HTMLElement {
  constructor() {
    super();
    this._effects = [];
    this._value = "";
    this._isOpen = false;
    this._selectedIndex = -1;
    this._focusedIndex = -1;
    this._flatOptions = [];
    this._searchString = "";
    this._searchTimeout = null;
    this._lastSearchTime = 0;
  }
  connectedCallback() {
    injectStyles();
    this._render();
    this._setupEventListeners();
  }
  static get observedAttributes() {
    return ["value"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value" && oldValue !== newValue) {
      this._value = newValue;
      this._updateDisplay();
    }
  }
  get value() {
    return this._value;
  }
  set value(val) {
    const oldValue = this._value;
    this._value = val;
    this.setAttribute("value", val);
    this._updateDisplay();
    if (oldValue !== val && this._flatOptions.some((opt) => opt.value === val)) {
      this.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  /**
   * Get the selected index (native select compatibility)
   */
  get selectedIndex() {
    return this._flatOptions.findIndex((opt) => opt.value === this._value);
  }
  set selectedIndex(idx) {
    if (idx >= 0 && idx < this._flatOptions.length) {
      this.value = this._flatOptions[idx].value;
    }
  }
  /**
   * Get options array (native select compatibility for test harness)
   * Returns an array-like object with .length and iterable options
   */
  get options() {
    return this._flatOptions.map((opt) => ({
      value: opt.value,
      text: opt.description ? `${camelToSpaceCase2(opt.name)}: ${opt.description}` : camelToSpaceCase2(opt.name),
      selected: opt.value === this._value
    }));
  }
  /**
   * Populate the selector with effects
   * @param {Array} effects - Array of { namespace, name, description? }
   */
  setEffects(effects2) {
    this._effects = effects2;
    this._buildFlatOptions();
    this._renderDropdown();
    this._updateDisplay();
  }
  _groupAndSortEffects() {
    const grouped = {};
    for (const effect of this._effects) {
      if (!grouped[effect.namespace]) {
        grouped[effect.namespace] = [];
      }
      grouped[effect.namespace].push(effect);
    }
    const sortedNamespaces = Object.keys(grouped).sort((a, b) => {
      const aIsClassic = a.startsWith("classic");
      const bIsClassic = b.startsWith("classic");
      if (aIsClassic && !bIsClassic) return 1;
      if (!aIsClassic && bIsClassic) return -1;
      return a.localeCompare(b);
    });
    return { grouped, sortedNamespaces };
  }
  _buildFlatOptions() {
    this._flatOptions = [];
    const { grouped, sortedNamespaces } = this._groupAndSortEffects();
    for (const namespace of sortedNamespaces) {
      grouped[namespace].sort((a, b) => a.name.localeCompare(b.name)).forEach((effect) => {
        this._flatOptions.push({
          value: `${namespace}/${effect.name}`,
          namespace,
          name: effect.name,
          description: effect.description || ""
        });
      });
    }
  }
  _render() {
    this.innerHTML = `
            <button class="es-trigger" tabindex="0" aria-haspopup="listbox">
                <span class="es-trigger-text">Select effect...</span>
            </button>
            <div class="es-dropdown" role="listbox"></div>
        `;
  }
  _renderDropdown() {
    const dropdown = this.querySelector(".es-dropdown");
    if (!dropdown) return;
    dropdown.innerHTML = "";
    const { grouped, sortedNamespaces } = this._groupAndSortEffects();
    sortedNamespaces.forEach((namespace) => {
      const header = document.createElement("div");
      header.className = "es-group-header";
      header.textContent = camelToSpaceCase2(namespace);
      dropdown.appendChild(header);
      grouped[namespace].sort((a, b) => a.name.localeCompare(b.name)).forEach((effect) => {
        const option = document.createElement("div");
        option.className = "es-option";
        option.dataset.value = `${namespace}/${effect.name}`;
        option.setAttribute("role", "option");
        const nameSpan = document.createElement("span");
        nameSpan.className = "es-option-name";
        nameSpan.textContent = camelToSpaceCase2(effect.name);
        option.appendChild(nameSpan);
        if (effect.description) {
          const descSpan = document.createElement("span");
          descSpan.className = "es-option-description";
          descSpan.textContent = `: ${effect.description}`;
          option.appendChild(descSpan);
        }
        dropdown.appendChild(option);
      });
    });
    this._updateSelectedOption();
  }
  _updateDisplay() {
    const trigger = this.querySelector(".es-trigger-text");
    if (!trigger) return;
    const selectedEffect = this._flatOptions.find((opt) => opt.value === this._value);
    if (selectedEffect) {
      const displayName = camelToSpaceCase2(selectedEffect.name);
      if (selectedEffect.description) {
        trigger.innerHTML = `<span class="es-trigger-name">${displayName}</span><span class="es-trigger-description">: ${selectedEffect.description}</span>`;
      } else {
        trigger.innerHTML = `<span class="es-trigger-name">${displayName}</span>`;
      }
    } else {
      trigger.textContent = "Select effect...";
    }
    this._updateSelectedOption();
  }
  _updateSelectedOption() {
    const dropdown = this.querySelector(".es-dropdown");
    if (!dropdown) return;
    dropdown.querySelectorAll(".es-option").forEach((opt) => {
      opt.classList.toggle("selected", opt.dataset.value === this._value);
    });
  }
  _setupEventListeners() {
    const trigger = this.querySelector(".es-trigger");
    const dropdown = this.querySelector(".es-dropdown");
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this._toggleDropdown();
    });
    dropdown.addEventListener("click", (e) => {
      const option = e.target.closest(".es-option");
      if (option) {
        this._selectOption(option.dataset.value);
      }
    });
    document.addEventListener("click", (e) => {
      if (!this.contains(e.target)) {
        this._closeDropdown();
      }
    });
    trigger.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (this._isOpen) {
            if (this._focusedIndex >= 0 && this._focusedIndex < this._flatOptions.length) {
              this._selectOption(this._flatOptions[this._focusedIndex].value);
            } else {
              this._closeDropdown();
            }
          } else {
            this._openDropdown();
          }
          break;
        case " ":
          e.preventDefault();
          this._openDropdown();
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!this._isOpen) {
            this._moveSelection(1);
          } else {
            this._moveFocus(1);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (!this._isOpen) {
            this._moveSelection(-1);
          } else {
            this._moveFocus(-1);
          }
          break;
        case "Escape":
          this._closeDropdown();
          break;
        case "Home":
          e.preventDefault();
          if (this._flatOptions.length > 0) {
            if (this._isOpen) {
              this._focusedIndex = 0;
              this._updateFocusedOption();
            } else {
              this._selectOption(this._flatOptions[0].value);
            }
          }
          break;
        case "End":
          e.preventDefault();
          if (this._flatOptions.length > 0) {
            if (this._isOpen) {
              this._focusedIndex = this._flatOptions.length - 1;
              this._updateFocusedOption();
            } else {
              this._selectOption(this._flatOptions[this._flatOptions.length - 1].value);
            }
          }
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this._handleTypeAhead(e.key);
          }
      }
    });
    dropdown.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this._moveFocus(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          this._moveFocus(-1);
          break;
        case "Enter":
          e.preventDefault();
          if (this._focusedIndex >= 0) {
            this._selectOption(this._flatOptions[this._focusedIndex].value);
          }
          break;
        case "Escape":
          this._closeDropdown();
          break;
        case "Home":
          e.preventDefault();
          if (this._flatOptions.length > 0) {
            this._focusedIndex = 0;
            this._updateFocusedOption();
          }
          break;
        case "End":
          e.preventDefault();
          if (this._flatOptions.length > 0) {
            this._focusedIndex = this._flatOptions.length - 1;
            this._updateFocusedOption();
          }
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this._handleTypeAhead(e.key);
          }
      }
    });
  }
  _toggleDropdown() {
    if (this._isOpen) {
      this._closeDropdown();
    } else {
      this._openDropdown();
    }
  }
  _openDropdown() {
    this._isOpen = true;
    this.classList.add("open");
    const dropdown = this.querySelector(".es-dropdown");
    const trigger = this.querySelector(".es-trigger");
    const triggerRect = trigger.getBoundingClientRect();
    const dropdownHeight = Math.min(400, this._flatOptions.length * 28 + 100);
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      this.classList.add("flip-up");
    } else {
      this.classList.remove("flip-up");
    }
    const selectedIdx = this._flatOptions.findIndex((opt) => opt.value === this._value);
    this._focusedIndex = selectedIdx >= 0 ? selectedIdx : 0;
    this._updateFocusedOption();
    const selectedOption = dropdown.querySelector(".es-option.selected");
    if (selectedOption) {
      const dropdownRect = dropdown.getBoundingClientRect();
      const optionRect = selectedOption.getBoundingClientRect();
      const optionCenter = optionRect.top + optionRect.height / 2;
      const dropdownCenter = dropdownRect.top + dropdownRect.height / 2;
      dropdown.scrollTop += optionCenter - dropdownCenter;
    }
  }
  _closeDropdown() {
    this._isOpen = false;
    this.classList.remove("open");
    this.classList.remove("flip-up");
    this._focusedIndex = -1;
    this._clearFocus();
  }
  _selectOption(value) {
    this._value = value;
    this.setAttribute("value", value);
    this._updateDisplay();
    this._closeDropdown();
    this.dispatchEvent(new CustomEvent("change", {
      bubbles: true,
      detail: { value }
    }));
  }
  _moveFocus(direction) {
    if (this._flatOptions.length === 0) return;
    this._focusedIndex += direction;
    if (this._focusedIndex < 0) this._focusedIndex = this._flatOptions.length - 1;
    if (this._focusedIndex >= this._flatOptions.length) this._focusedIndex = 0;
    this._updateFocusedOption();
  }
  /**
   * Move selection when dropdown is closed (arrow keys change value directly like native select)
   * @param {number} direction - 1 for next, -1 for previous
   */
  _moveSelection(direction) {
    if (this._flatOptions.length === 0) return;
    const currentIdx = this._flatOptions.findIndex((opt) => opt.value === this._value);
    let newIdx = currentIdx + direction;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= this._flatOptions.length) newIdx = this._flatOptions.length - 1;
    if (newIdx !== currentIdx) {
      this._selectOption(this._flatOptions[newIdx].value);
    }
  }
  _updateFocusedOption() {
    this._clearFocus();
    if (this._focusedIndex >= 0 && this._focusedIndex < this._flatOptions.length) {
      const value = this._flatOptions[this._focusedIndex].value;
      const dropdown = this.querySelector(".es-dropdown");
      const option = dropdown.querySelector(`.es-option[data-value="${CSS.escape(value)}"]`);
      if (option) {
        option.classList.add("focused");
        const dr = this.querySelector(".es-dropdown");
        if (dr) {
          const drRect = dr.getBoundingClientRect();
          const optRect = option.getBoundingClientRect();
          if (optRect.bottom > drRect.bottom) {
            dr.scrollTop += optRect.bottom - drRect.bottom;
          } else if (optRect.top < drRect.top) {
            dr.scrollTop -= drRect.top - optRect.top;
          }
        }
      }
    }
  }
  _clearFocus() {
    const dropdown = this.querySelector(".es-dropdown");
    dropdown.querySelectorAll(".es-option.focused").forEach((opt) => {
      opt.classList.remove("focused");
    });
  }
  /**
   * Handle type-ahead search like a native select element.
   * - Typing a single character jumps to the first matching option
   * - Typing quickly builds a multi-character search string
   * - Repeating the same character cycles through matching options
   * @param {string} char - The character typed
   */
  _handleTypeAhead(char) {
    const now = Date.now();
    const timeSinceLastKey = now - this._lastSearchTime;
    this._lastSearchTime = now;
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
    }
    if (timeSinceLastKey > 500) {
      this._searchString = "";
    }
    const previousSearch = this._searchString;
    this._searchString += char.toLowerCase();
    this._searchTimeout = setTimeout(() => {
      this._searchString = "";
    }, 1e3);
    const optionsWithNames = this._flatOptions.map((opt, idx) => ({
      ...opt,
      idx,
      displayName: camelToSpaceCase2(opt.name).toLowerCase()
    }));
    let matchingOptions = optionsWithNames.filter(
      (opt) => opt.displayName.startsWith(this._searchString)
    );
    if (matchingOptions.length === 0 && this._searchString.length > 1) {
      const singleCharMatches = optionsWithNames.filter(
        (opt) => opt.displayName.startsWith(char.toLowerCase())
      );
      if (singleCharMatches.length > 0) {
        this._searchString = char.toLowerCase();
        matchingOptions = singleCharMatches;
      }
    }
    const isRepeatedChar = this._searchString.length > 1 && this._searchString.split("").every((c) => c === this._searchString[0]);
    if (isRepeatedChar && previousSearch.length > 0) {
      const singleCharMatches = optionsWithNames.filter(
        (opt) => opt.displayName.startsWith(this._searchString[0])
      );
      if (singleCharMatches.length > 1) {
        const currentIdx = this._isOpen ? this._focusedIndex : this.selectedIndex;
        const currentMatchIdx = singleCharMatches.findIndex((opt) => opt.idx === currentIdx);
        const nextMatchIdx = (currentMatchIdx + 1) % singleCharMatches.length;
        const targetIdx = singleCharMatches[nextMatchIdx].idx;
        if (this._isOpen) {
          this._focusedIndex = targetIdx;
          this._updateFocusedOption();
        } else {
          this._selectOption(this._flatOptions[targetIdx].value);
        }
        return;
      }
    }
    if (matchingOptions.length > 0) {
      const targetIdx = matchingOptions[0].idx;
      if (this._isOpen) {
        this._focusedIndex = targetIdx;
        this._updateFocusedOption();
      } else {
        this._selectOption(this._flatOptions[targetIdx].value);
      }
    }
  }
};
customElements.define("effect-select", EffectSelect);

// demo/shaders/lib/toggle-switch.js
var stylesInjected2 = false;
function injectStyles2() {
  if (stylesInjected2) return;
  stylesInjected2 = true;
  const style = document.createElement("style");
  style.id = "toggle-switch-styles";
  style.textContent = `
        toggle-switch {
            display: inline-block;
            vertical-align: middle;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }

        toggle-switch[disabled] {
            cursor: not-allowed;
            opacity: 0.5;
            pointer-events: none;
        }

        toggle-switch .ts-track {
            position: relative;
            width: 2rem;
            height: 1rem;
            background: color-mix(in srgb, var(--color4, #26314f) 60%, var(--color3, #1b2538) 40%);
            border-radius: var(--ui-corner-radius-pill, 999px);
            transition: background 0.15s ease;
            box-sizing: border-box;
        }

        toggle-switch:hover .ts-track {
            background: color-mix(in srgb, var(--color4, #26314f) 75%, var(--color3, #1b2538) 25%);
        }

        toggle-switch:focus-visible {
            outline: none;
        }

        toggle-switch:focus-visible .ts-track {
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent3, #a5b8ff) 25%, transparent 75%);
        }

        toggle-switch .ts-track.ts-checked {
            background: color-mix(in srgb, var(--accent3, #a5b8ff) 35%, var(--color3, #1b2538) 65%);
        }

        toggle-switch:hover .ts-track.ts-checked {
            background: color-mix(in srgb, var(--accent3, #a5b8ff) 45%, var(--color3, #1b2538) 55%);
        }

        toggle-switch .ts-thumb {
            position: absolute;
            top: 50%;
            left: 0.125rem;
            transform: translateY(-50%);
            width: 0.75rem;
            height: 0.75rem;
            background: var(--color5, #98a7c8);
            border-radius: 50%;
            transition: left 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        toggle-switch .ts-track.ts-checked .ts-thumb {
            left: calc(100% - 0.875rem);
            background: var(--accent3, #a5b8ff);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        toggle-switch:active .ts-thumb {
            width: 0.875rem;
        }

        toggle-switch:active .ts-track.ts-checked .ts-thumb {
            left: calc(100% - 1rem);
        }
    `;
  document.head.appendChild(style);
}
var ToggleSwitch = class extends HTMLElement {
  constructor() {
    super();
    this._checked = false;
    this._disabled = false;
    this._track = null;
  }
  static get observedAttributes() {
    return ["checked", "disabled"];
  }
  connectedCallback() {
    injectStyles2();
    this._render();
    this._setupEventListeners();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "checked") {
      this._checked = newVal !== null;
    } else if (name === "disabled") {
      this._disabled = newVal !== null;
    }
    this._updateVisualState();
  }
  /** @returns {boolean} Current checked state */
  get checked() {
    return this._checked;
  }
  /** @param {boolean} val - New checked state */
  set checked(val) {
    const newVal = Boolean(val);
    if (this._checked !== newVal) {
      this._checked = newVal;
      if (newVal) {
        this.setAttribute("checked", "");
      } else {
        this.removeAttribute("checked");
      }
      this._updateVisualState();
    }
  }
  /** @returns {boolean} Current disabled state */
  get disabled() {
    return this._disabled;
  }
  /** @param {boolean} val - New disabled state */
  set disabled(val) {
    const newVal = Boolean(val);
    if (this._disabled !== newVal) {
      this._disabled = newVal;
      if (newVal) {
        this.setAttribute("disabled", "");
      } else {
        this.removeAttribute("disabled");
      }
      this._updateVisualState();
    }
  }
  /**
   * Render the component's DOM
   * @private
   */
  _render() {
    this.innerHTML = `
            <div class="ts-track" role="switch" aria-checked="false" tabindex="0">
                <div class="ts-thumb"></div>
            </div>
        `;
    this._track = this.querySelector(".ts-track");
    this._checked = this.hasAttribute("checked");
    this._disabled = this.hasAttribute("disabled");
    this._updateVisualState();
  }
  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this._track) return;
    this._track.addEventListener("click", (e) => {
      if (this._disabled) return;
      e.preventDefault();
      e.stopPropagation();
      this._toggle();
    });
    this.addEventListener("click", (e) => {
      if (this._disabled) return;
      if (e.target === this._track || this._track?.contains(e.target)) return;
      e.preventDefault();
      this._toggle();
    });
    this._track.addEventListener("keydown", (e) => {
      if (this._disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this._toggle();
      }
    });
  }
  /**
   * Toggle the checked state
   * @private
   */
  _toggle() {
    this.checked = !this._checked;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }
  /**
   * Update the visual state to match the checked property
   * @private
   */
  _updateVisualState() {
    if (!this._track) return;
    this._track.classList.toggle("ts-checked", this._checked);
    this._track.setAttribute("aria-checked", String(this._checked));
  }
};
if (!customElements.get("toggle-switch")) {
  customElements.define("toggle-switch", ToggleSwitch);
}
export {
  AudioInputManager,
  AudioState,
  BUILTIN_NAMESPACE,
  Backend,
  CanvasRenderer,
  ControlFactory,
  DEFAULT_CATEGORY,
  Effect,
  EffectSelect,
  Emitter,
  ExternalInputManager,
  IO_FUNCTIONS,
  MidiChannelState,
  MidiInputManager,
  MidiState,
  NAMESPACE_DESCRIPTIONS,
  PHASE,
  Pipeline,
  ProgramState,
  TAG_DEFINITIONS,
  ToggleSwitch,
  UIController,
  VALID_NAMESPACES,
  VALID_TAGS,
  VERSION,
  WebGL2Backend,
  WebGPUBackend,
  allocateResources,
  analyzeLiveness,
  applyParameterUpdates,
  camelToSpaceCase,
  cloneParamValue,
  compile,
  compileGraph,
  createEffectDefCallback,
  createNoisemakerPipeline,
  createPipeline,
  createRuntime,
  defaultControlFactory,
  expand,
  extractEffectNamesFromDsl,
  extractEffectsFromDsl,
  formatDslError,
  formatEnumName2 as formatEnumName,
  formatValue,
  getAllEffects,
  getBackendFromURL,
  getCategories,
  getCompatibleReplacements,
  getEffect,
  getEffectFromURL,
  getNamespaceDescription,
  getTagDefinition,
  getUniformCategory,
  getUseBundlesFromURL,
  getVolGeoParams,
  groupGlobalsByCategory,
  hasExplicitTexParam,
  hasTexSurfaceParam,
  is3dGenerator,
  is3dProcessor,
  isDslSyntaxError,
  isIOFunction,
  isStarterEffect,
  isValidIdentifier,
  isValidNamespace,
  isValidTag,
  lex,
  listSteps,
  mergeIntoEnums,
  needsInputTex3d,
  parse,
  recompile,
  registerEffect,
  registerNamespace,
  registerOp,
  registerStarterOps,
  registerValidatorHook,
  replaceEffect,
  sanitizeEnumName,
  setToastProvider,
  frozenEnums as stdEnums,
  unparse,
  unparseCall,
  unregisterEffect,
  unregisterNamespace,
  validate,
  validateTags
};
