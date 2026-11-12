/* LuccAlfa Immobiliare — hero3d.js
   L'intro come un piccolo film in 3D vero (WebGL, three.js), guidato dallo scorrimento:
   1 · i tetti di Lucca e il titolo; al primo scorrimento il punto dopo «Mura» prende vita: batte, diventa arancio, salta;
   2 · al culmine del salto il punto si apre nell'omino (l'agente LuccAlfa, in giacca arancio), che cade verso i tetti;
   3 · un banco di nuvole sale e copre tutto: dietro, la scena passa a Piazza dell'Anfiteatro vista dall'alto, che si srotola;
   4 · l'omino esce dalle nuvole, cade in piazza, si accuccia all'impatto, saluta, cammina mentre la vista ruota, poi salta via;
   5 · si sale: la piazza si ritira dentro il simbolo LuccAlfa, sotto compare il nome, le nuvole passano e la nebbia diventa la pagina.
   Lo scorrimento fa da regia; battiti, cadute e assestamenti sono fisica in tempo reale.
   La foto a 360° (pubblico dominio, Wikimedia Commons, "Piazza Anfiteatro Lucca 360", H005, 2009) è una fascia
   cilindrica: copre da 8° sotto a 35° sopra l'orizzonte. Il cielo più in alto e il selciato più vicino sono ricostruiti qui.
   Se WebGL manca o qualcosa va storto si toglie la classe "h3d" e torna l'intro in CSS. */
const root = document.documentElement;
if (root.classList.contains("h3d")) start().catch((e) => { console.warn("hero3d:", e); root.classList.remove("h3d", "h3d-on", "h3d-dark"); });

async function start() {
  const $ = (s) => document.querySelector(s);
  const intro = $(".intro"), stage = $(".intro__stage"), canvas = $(".h3d__canvas"), heroImg = $(".hero__pic img"), title = $(".hero__title");
  if (!intro || !stage || !canvas || !heroImg) throw new Error("markup");
  if (document.readyState !== "complete") await new Promise((ok) => addEventListener("load", ok, { once: true }));   // prima la pagina (foto, caratteri), poi il 3D
  const THREE = await import("./assets/vendor/three.min.js");
  if (!heroImg.complete || !heroImg.naturalWidth) await new Promise((ok, no) => { heroImg.addEventListener("load", ok, { once: true }); heroImg.addEventListener("error", no, { once: true }); });

  /* ───── utilità ───── */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lin = (a, b, x) => clamp((x - a) / (b - a));
  const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const rad = THREE.MathUtils.degToRad;
  class Spring {
    constructor(x = 0, k = 120, c = 14) { this.x = x; this.v = 0; this.k = k; this.c = c; }
    step(target, dt) { this.v += ((target - this.x) * this.k - this.v * this.c) * dt; this.x += this.v * dt; return this.x; }
  }

  /* ───── la regia ─────
     P (0…1) è tutto lo scorrimento dell'intro. Fino a PF scorre il film (p, da 0 a 1); dopo, il finale col simbolo (q, da 0 a 1). */
  const PF = 0.634;
  const T = {
    wake: [0.02, 0.06], jump: [0.06, 0.125], pop: 0.12, fall: [0.15, 0.36], title: [0.11, 0.22],
    bank: [0.2, 0.52], swap: 0.36, unroll: [0.36, 0.55], drop: 0.5,
    hello: [0.565, 0.61], walk: [0.62, 0.84], bye: [0.85, 0.888], leap: 0.9,
  };
  // la piazza: la fascia della foto (v = V0 + tan(elevazione) · VK), il settore che si percorre, il sole
  const V0 = 491 / 2813, VK = 3287 / 2813, CAM_H = 1.6, PITCH = 0.06;
  const YAW0 = (0.215 - 0.5) * Math.PI * 2, YAW1 = (0.4 - 0.5) * Math.PI * 2;
  const SUN_AZ = (0.21 - 0.5) * Math.PI * 2, SUN_EL = 1.05;
  const SUN = new THREE.Vector3(Math.sin(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL), -Math.cos(SUN_AZ) * Math.cos(SUN_EL));
  const FOCUS = new THREE.Vector2(0.5, 0.42);                  // verso dove si stringe la foto dei tetti mentre l'omino cade

  /* ───── renderer: la tela è trasparente solo nel finale, quando la piazza resta dentro il simbolo ───── */
  const phone = matchMedia("(max-width: 899px)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.75 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  if (renderer.capabilities.maxTextureSize < 8192) throw new Error("texture");   // la foto a 360° non ci starebbe: resta l'intro in CSS
  canvas.addEventListener("webglcontextlost", () => root.classList.remove("h3d", "h3d-on", "h3d-dark"));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  camera.rotation.order = "YXZ";
  const FULL = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }";

  /* ───── fondo: la foto dei tetti oppure la piazza a 360°, in un solo passaggio a tutto schermo ───── */
  // la stessa immagine che il browser ha scelto per l'hero (è già in cache), letta a piena risoluzione
  const photoTex = new THREE.Texture();
  photoTex.colorSpace = THREE.NoColorSpace; photoTex.generateMipmaps = false; photoTex.minFilter = THREE.LinearFilter; photoTex.flipY = false;
  let photoSrc = "";
  const loadPhoto = async () => {
    const src = heroImg.currentSrc || heroImg.src; if (!src || src === photoSrc) return; photoSrc = src;
    const bitmap = await createImageBitmap(await (await fetch(src)).blob(), { imageOrientation: "flipY" });
    if (photoTex.image && photoTex.image.close) { photoTex.image.close(); photoTex.dispose(); }   // misure diverse: la texture va ricreata
    photoTex.image = bitmap; photoTex.needsUpdate = true; U.uPhotoAspect.value = bitmap.width / bitmap.height;
  };
  const U = {
    tPhoto: { value: photoTex }, tPano: { value: null }, uPhotoAspect: { value: 1.5 },
    uAspect: { value: 1 }, uT: { value: FOCUS }, uZoom: { value: 1 }, uBlur: { value: 0 }, uScene: { value: 0 },
    uF: { value: new THREE.Vector3(0, 0, -1) }, uR: { value: new THREE.Vector3(1, 0, 0) }, uU: { value: new THREE.Vector3(0, 1, 0) },
    uScale: { value: 1 }, uD: { value: 0 }, uWash: { value: 0 }, uV0: { value: V0 }, uVk: { value: VK }, uCamH: { value: CAM_H },
  };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, depthTest: false, depthWrite: false, vertexShader: FULL,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D tPhoto, tPano;
      uniform float uPhotoAspect, uAspect, uZoom, uBlur, uScene, uScale, uD, uWash, uV0, uVk, uCamH;
      uniform vec2 uT; uniform vec3 uF, uR, uU;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
      // come object-fit: cover con object-position: 50% 70%
      vec2 cover(vec2 s){
        if (uAspect > uPhotoAspect) { float fh = uPhotoAspect / uAspect; return vec2(s.x, 1.0 - ((1.0 - fh) * 0.7 + (1.0 - s.y) * fh)); }
        float fw = uAspect / uPhotoAspect; return vec2((1.0 - fw) * 0.5 + s.x * fw, s.y);
      }
      // durante la caduta la foto si avvicina e si allunga; i tre colori si allungano un po' diversamente, come in un obiettivo
      vec3 photo(vec2 s){
        vec2 d = s - uT;
        vec3 c = texture2D(tPhoto, cover(uT + d / uZoom)).rgb;
        if (uBlur > 0.001) {
          vec3 acc = vec3(0.0), ws = vec3(0.0);
          for (int i = 0; i < 12; i++) {
            float f = float(i) / 11.0, z = uZoom * (1.0 + uBlur * f);
            vec3 w = vec3(1.0 - 0.85 * f, 1.0 - 1.1 * abs(f - 0.5), 0.15 + 0.85 * f);
            acc += texture2D(tPhoto, cover(uT + d / z)).rgb * w; ws += w;
          }
          c = acc / ws;
        }
        return c;
      }
      // proiezione che va con continuità dal "piccolo pianeta" (uD = 1) alla prospettiva normale (uD = 0)
      vec3 pano(vec2 ndc){
        vec2 q = ndc * vec2(uAspect, 1.0) * uScale;
        float rho = length(q), s = rho / (uD + 1.0);
        float c = (-s * s * uD + sqrt(1.0 + s * s * (1.0 - uD * uD))) / (1.0 + s * s);
        float sn = sqrt(max(0.0, 1.0 - c * c));
        vec2 e = rho > 1e-5 ? q / rho : vec2(0.0);
        vec3 d = normalize(c * uF + sn * (e.x * uR + e.y * uU));
        float u = atan(d.x, -d.z) / 6.28318530718 + 0.5;
        float t = d.y / max(length(d.xz), 1e-4);          // tangente dell'elevazione: la fascia è cilindrica
        float v = uV0 + t * uVk;
        float ub = fract(u + 0.5) - 0.5;                   // derivate senza il salto della cucitura
        float dux = abs(dFdx(u)) < abs(dFdx(ub)) ? dFdx(u) : dFdx(ub);
        float duy = abs(dFdy(u)) < abs(dFdy(ub)) ? dFdy(u) : dFdy(ub);
        float vc = clamp(v, 0.003, 0.997);
        vec3 col = textureGrad(tPano, vec2(u, vc), vec2(dux, dFdx(vc)), vec2(duy, dFdy(vc))).rgb;
        // sopra la fascia: il cielo continua, più profondo verso lo zenit
        if (v > 0.95) {
          vec3 sk = textureLod(tPano, vec2(u, 0.985), 6.5).rgb;
          sk = mix(sk, vec3(0.20, 0.42, 0.78), smoothstep(0.0, 3.0, t - (1.0 - uV0) / uVk) * 0.8);
          col = mix(col, sk, smoothstep(0.95, 1.0, v));
        }
        // sotto la fascia: il selciato della piazza, in lastre, nella tinta delle ultime righe della foto
        if (v < 0.05) {
          vec3 base = mix(vec3(0.70, 0.692, 0.697), textureLod(tPano, vec2(u, 0.014), 7.5).rgb, 0.45);
          vec2 P = uCamH * d.xz / max(-d.y, 1e-3);
          float fw = max(fwidth(P.x) / 0.9, fwidth(P.y) / 0.45);
          vec2 g = P / vec2(0.9, 0.45); g.x += 0.5 * mod(floor(g.y), 2.0);
          vec2 cell = floor(g), f = fract(g);
          float edge = min(min(f.x, 1.0 - f.x) * 2.0, min(f.y, 1.0 - f.y));
          float joint = (1.0 - smoothstep(0.012, 0.03 + fw * 1.5, edge)) * clamp(1.0 - fw * 2.2, 0.0, 1.0);
          float tone = mix(1.0, 0.972 + 0.056 * hash(cell), clamp(1.0 - fw * 1.4, 0.0, 1.0));
          vec3 gr = base * tone * (1.0 - 0.12 * joint) * (0.955 + 0.09 * noise(P * 2.3)) * (0.985 + 0.03 * noise(P * 37.0));
          col = mix(gr, col, smoothstep(0.0, 0.05, v));
        }
        return col;
      }
      void main(){
        vec2 s = vUv; vec3 col;
        if (uScene < 0.5) col = photo(s);
        else {
          col = pano(s * 2.0 - 1.0);
          float vg = length((s - 0.5) * vec2(min(uAspect, 1.4), 1.0));
          col *= 1.0 - 0.2 * smoothstep(0.5, 1.05, vg);
          col = mix(col, vec3(0.93, 0.92, 0.9), uWash * 0.34 * smoothstep(0.5, 0.05, s.y));   // un velo chiaro dietro le frasi
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  bg.frustumCulled = false; bg.renderOrder = -100; scene.add(bg);
  await loadPhoto();
  heroImg.addEventListener("load", () => { loadPhoto().catch(() => {}); });   // se il browser passa a un formato più grande

  /* ───── il finale: tutto quel che è disegnato viene moltiplicato per la sagoma del simbolo ───── */
  const maskU = { tMask: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uSize: { value: 4000 }, uOut: { value: 1 } };
  const maskMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: maskU, depthTest: false, depthWrite: false, transparent: true, vertexShader: FULL,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.SrcAlphaFactor,
    fragmentShader: `
      precision highp float; varying vec2 vUv; uniform sampler2D tMask; uniform vec2 uRes; uniform float uSize, uOut;
      void main(){
        vec2 uv = (vUv - 0.5) * uRes / vec2(uSize, uSize / 1.263) + 0.5;
        float m = (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) ? texture2D(tMask, uv).a : 0.0;
        gl_FragColor = vec4(0.0, 0.0, 0.0, max(m, uOut));
      }`,
  }));
  maskMesh.frustumCulled = false; maskMesh.renderOrder = 1000; maskMesh.visible = false; scene.add(maskMesh);
  const symbol = new Image();
  const symbolReady = new Promise((ok) => { symbol.onload = ok; symbol.onerror = ok; symbol.src = "assets/simbolo.svg"; });
  const symbolCanvas = (w, h, fill) => {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const cx = cv.getContext("2d");
    cx.drawImage(symbol, 0, 0, w, h); if (fill) { cx.globalCompositeOperation = "source-in"; cx.fillStyle = fill; cx.fillRect(0, 0, w, h); }
    return cv;
  };
  symbolReady.then(() => { if (!symbol.naturalWidth) return; const t = new THREE.CanvasTexture(symbolCanvas(2048, 1622)); t.anisotropy = 4; maskU.tMask.value = t; });

  /* ───── luci ───── */
  const hemi = new THREE.HemisphereLight(0xe6effa, 0xa3948a, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 4; sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 30 }); sun.shadow.camera.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight(0xd6e6ff, 1.2); rim.position.set(6, 3, -5);   // un filo di controluce stacca l'omino dalla foto
  scene.add(sun, sun.target, rim);
  new THREE.TextureLoader().load("assets/img/anfiteatro-360-env.jpg", (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(t).texture; scene.environmentIntensity = 0.8; t.dispose(); pm.dispose();
  });

  /* ───── la foto a 360°: più grande dove la scheda grafica lo permette ───── */
  let panoReady = false;
  const big = !phone && renderer.capabilities.maxTextureSize >= 16384;
  const panoUrl = `assets/img/anfiteatro-360-${big ? 12288 : 8192}.webp`;
  const usePano = (t) => {
    t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true; renderer.initTexture(t); U.tPano.value = t; panoReady = true;
  };
  const giveUp = () => { console.warn("hero3d: foto a 360° non caricata"); root.classList.remove("h3d", "h3d-on", "h3d-dark"); };
  const viaImage = () => new THREE.TextureLoader().load(panoUrl, usePano, undefined, giveUp);          // immagine normale: la texture resta capovolta come vuole WebGL
  if (typeof createImageBitmap === "function") {
    const bmp = new THREE.ImageBitmapLoader(); bmp.setOptions({ imageOrientation: "flipY" });
    bmp.load(panoUrl, (bitmap) => { const t = new THREE.Texture(bitmap); t.flipY = false; usePano(t); }, undefined, viaImage);
  } else viaImage();

  /* ───── l'omino: l'agente LuccAlfa. Proporzioni da adulto stilizzato (cinque teste e mezza), giacca arancio con camicia e
     cravatta, pantaloni scuri, maniche che escono dalle spalle della giacca, un viso sobrio. Misure da terra, in metri. ───── */
  const H = 1.72, HIP = 0.93, WAIST = 0.98, SHO = 1.365, HEAD_Y = 1.565, COM = 0.98;
  const HR = new THREE.Vector3(0.128, 0.155, 0.136);                             // i tre raggi della testa
  const cloth = { roughness: 0.8, sheen: 0.6, sheenRoughness: 0.5 };
  const matJacket = new THREE.MeshPhysicalMaterial({ color: 0xffffff, ...cloth, sheenColor: 0xffc08a });
  const matSleeve = new THREE.MeshPhysicalMaterial({ color: 0xf68622, ...cloth, sheenColor: 0xffc08a });
  const matTrouser = new THREE.MeshPhysicalMaterial({ color: 0x24211e, ...cloth, sheenColor: 0x6a6660 });
  const matShirt = new THREE.MeshPhysicalMaterial({ color: 0xf7f1e6, roughness: 0.7, sheen: 0.3, sheenColor: 0xffffff });
  const matSkin = new THREE.MeshPhysicalMaterial({ color: 0xf0d6bb, roughness: 0.55, sheen: 0.5, sheenRoughness: 0.5, sheenColor: 0xffe6d0 });
  const matHair = new THREE.MeshPhysicalMaterial({ color: 0x2c221c, roughness: 0.55, sheen: 0.6, sheenColor: 0x7a6558 });
  const matShoe = new THREE.MeshPhysicalMaterial({ color: 0x1a1512, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const matInk = new THREE.MeshPhysicalMaterial({ color: 0x1b1512, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const matGlint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };
  const ball = (m, sx, sy, sz, seg = 28) => { const o = mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.72)), m); o.scale.set(sx, sy ?? sx, sz ?? sx); return o; };
  const peg = new THREE.Group(), swing = new THREE.Group(), body = new THREE.Group(), squash = new THREE.Group(), chest = new THREE.Group();
  peg.add(swing); swing.add(body); body.add(squash); squash.add(chest);
  chest.position.y = WAIST;                                                      // il busto si piega dalla vita
  // la giacca: sezioni ellittiche lungo l'altezza (orlo, vita, petto, spalle, colletto), con una pelle disegnata sopra
  const loft = (prof, rings, radial) => {
    const pts = new THREE.CatmullRomCurve3(prof.map((p) => new THREE.Vector3(p[1], p[0], p[2])), false, "centripetal").getPoints(rings - 1);
    const y0 = prof[0][0], y1 = prof[prof.length - 1][0], n = rings * (radial + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
    pts.forEach((p, i) => { for (let j = 0; j <= radial; j++) { const a = (j / radial - 0.5) * Math.PI * 2, k = i * (radial + 1) + j; pos[k * 3] = p.x * Math.sin(a); pos[k * 3 + 1] = p.y - WAIST; pos[k * 3 + 2] = p.z * Math.cos(a); uv[k * 2] = j / radial; uv[k * 2 + 1] = (p.y - y0) / (y1 - y0); } });
    for (let i = 0; i < rings - 1; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const nr = g.attributes.normal;              // la cucitura sta sulla schiena: le due file di vertici condividono la normale
    for (let i = 0; i < rings; i++) { const a = i * (radial + 1), b = a + radial, x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); }
    return g;
  };
  const JY0 = 0.875, JY1 = 1.462;
  const jacketCv = document.createElement("canvas"); jacketCv.width = jacketCv.height = 1024;
  const jacketTex = new THREE.CanvasTexture(jacketCv); jacketTex.colorSpace = THREE.SRGBColorSpace; jacketTex.anisotropy = 8;
  { const N = 1024, c = jacketCv.getContext("2d"), X = (u) => u * N, Y = (v) => (1 - v) * N, top = 1, apex = 0.47, hw = 0.062, dark = "rgba(150,66,8,0.75)";
    c.fillStyle = "#f68622"; c.fillRect(0, 0, N, N);
    const g = c.createLinearGradient(0, Y(0.2), 0, Y(0)); g.addColorStop(0, "rgba(150,66,8,0)"); g.addColorStop(1, "rgba(150,66,8,0.3)"); c.fillStyle = g; c.fillRect(0, Y(0.2), N, N - Y(0.2));
    // la camicia: una V dal colletto a metà petto, con la cravatta verde persiana
    c.fillStyle = "#f7f1e6"; c.beginPath(); c.moveTo(X(0.5 - hw), Y(top)); c.lineTo(X(0.5 + hw), Y(top)); c.lineTo(X(0.5), Y(apex)); c.closePath(); c.fill();
    c.fillStyle = "#2f4a3a"; c.beginPath(); c.moveTo(X(0.486), Y(0.985)); c.lineTo(X(0.514), Y(0.985)); c.lineTo(X(0.509), Y(0.935)); c.lineTo(X(0.521), Y(0.63)); c.lineTo(X(0.5), Y(0.54)); c.lineTo(X(0.479), Y(0.63)); c.lineTo(X(0.491), Y(0.935)); c.closePath(); c.fill();
    // i baveri, con la tacca; poi la chiusura, i bottoni, le tasche
    c.lineJoin = "round"; c.lineCap = "round";
    for (const s of [-1, 1]) {
      c.fillStyle = "#ea7c1a"; c.beginPath(); c.moveTo(X(0.5 + s * hw), Y(top)); c.lineTo(X(0.5 + s * (hw + 0.05)), Y(top)); c.lineTo(X(0.5 + s * (hw + 0.06)), Y(0.83)); c.lineTo(X(0.5 + s * (hw * 0.75 + 0.03)), Y(0.8));
      c.lineTo(X(0.5 + s * 0.013), Y(apex - 0.035)); c.lineTo(X(0.5), Y(apex)); c.closePath(); c.fill(); c.strokeStyle = dark; c.lineWidth = 3.5; c.stroke();
      c.lineWidth = 3; c.beginPath(); c.moveTo(X(0.5 + s * 0.075), Y(0.2)); c.lineTo(X(0.5 + s * 0.15), Y(0.205)); c.stroke();
    }
    c.strokeStyle = dark; c.lineWidth = 3; c.beginPath(); c.moveTo(X(0.5), Y(apex)); c.lineTo(X(0.506), Y(0)); c.stroke();
    c.fillStyle = "#8a4610"; for (const v of [0.4, 0.27]) { c.beginPath(); c.arc(X(0.514), Y(v), 8, 0, 7); c.fill(); }
    // il simbolo LuccAlfa appuntato sul petto
    symbolReady.then(() => { if (!symbol.naturalWidth) return; c.drawImage(symbolCanvas(76, 60, "#fbf3e6"), X(0.5 + 0.068), Y(0.76)); jacketTex.needsUpdate = true; });
  }
  matJacket.map = jacketTex;
  const jacket = mesh(loft([[JY0, 0.158, 0.112], [0.95, 0.166, 0.119], [1.07, 0.15, 0.108], [1.2, 0.168, 0.118], [1.3, 0.19, 0.124], [1.385, 0.2, 0.115], [1.425, 0.165, 0.098], [1.45, 0.09, 0.072], [JY1, 0.056, 0.056]], 44, 48), matJacket);
  const neck = mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.1, 24), matSkin); neck.position.y = 1.455 - WAIST;
  const collar = mesh(new THREE.TorusGeometry(0.057, 0.017, 12, 36), matShirt); collar.rotation.x = Math.PI / 2 + 0.16; collar.position.set(0, 1.452 - WAIST, 0.004);
  chest.add(jacket, neck, collar);
  const pelvis = ball(matTrouser, 0.152, 0.115, 0.112); pelvis.position.y = HIP; squash.add(pelvis);
  // testa: viso sobrio (occhi piccoli, sopracciglia, naso appena accennato, un sorriso sottile), capelli corti
  const head = new THREE.Group(); head.position.y = HEAD_Y - WAIST; chest.add(head);
  { const skull = ball(matSkin, HR.x, HR.y, HR.z, 56); head.add(skull); }
  // appoggia un elemento sulla superficie della testa: azimut e elevazione in radianti, orientato come la superficie
  const onHead = (obj, az, el, lift = 0) => {
    const p = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiply(HR);
    const n = new THREE.Vector3(p.x / (HR.x * HR.x), p.y / (HR.y * HR.y), p.z / (HR.z * HR.z)).normalize();
    obj.position.copy(p).addScaledVector(n, lift); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); return obj;
  };
  const eyes = [-1, 1].map((s) => {
    const g = onHead(new THREE.Group(), s * 0.31, -0.03, 0.001), open = new THREE.Group();
    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), matInk); iris.scale.set(0.0125, 0.0165, 0.007);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.0033, 8, 6), matGlint); gl.position.set(0.004, 0.007, 0.006);
    open.add(iris, gl);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0036, 8, 20, Math.PI * 0.86), matInk); arc.rotation.z = Math.PI * 0.07; arc.position.set(0, -0.005, 0.003); arc.visible = false;   // occhio che sorride
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0042, 0.024, 4, 10), matHair); brow.rotation.z = Math.PI / 2 + s * 0.1; brow.position.set(s * 0.002, 0.036, 0.002);
    g.add(open, arc, brow); head.add(g); return { g, open, arc, brow, home: g.position.clone() };
  });
  { const nose = ball(matSkin, 0.013, 0.016, 0.014, 16); onHead(nose, 0, -0.2, -0.003); head.add(nose);
    for (const s of [-1, 1]) { const ear = ball(matSkin, 0.016, 0.03, 0.022, 16); ear.position.set(s * HR.x * 0.985, -0.012, -0.008); head.add(ear); } }
  const mouth = onHead(new THREE.Group(), 0, -0.47, 0.001); head.add(mouth);
  const ARC = Math.PI * 0.52, MR = 0.03, A0 = Math.PI + (Math.PI - ARC) / 2;
  const smile = new THREE.Group();
  { const sm = new THREE.Mesh(new THREE.TorusGeometry(MR, 0.0042, 8, 24, ARC), matHair); sm.rotation.z = A0; smile.add(sm);
    [0, 1].forEach((k) => { const a = A0 + k * ARC, c = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 8, 6), matHair); c.position.set(Math.cos(a) * MR, Math.sin(a) * MR, 0); smile.add(c); });
    smile.position.y = MR * 0.8; }
  const oMouth = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), matHair); oMouth.scale.set(0.012, 0.016, 0.006);
  mouth.add(smile, oMouth);
  { // capelli corti: un guscio appena più grande del cranio e spostato un filo indietro, così il viso ne esce da solo
    // e l'attaccatura segue la fronte e le tempie; un ciuffo basso, pettinato di lato, rompe la simmetria
    const shell = mesh(new THREE.SphereGeometry(1, 56, 36, 0, Math.PI * 2, 0, Math.PI * 0.62), matHair); shell.scale.set(HR.x * 1.055, HR.y * 1.055, HR.z * 1.055); shell.position.set(0, 0.012, -0.012);
    const tuft = ball(matHair, 0.082, 0.03, 0.05, 24); tuft.position.set(0.022, 0.108, 0.082); tuft.rotation.set(0.62, 0, -0.26);
    head.add(shell, tuft); }
  // arti: uno scheletro di due segmenti dà spalla, gomito e polso; sopra ci si tende una manica (o una gamba di pantalone) con la piega arrotondata
  const bone = (x, y, L1, L2) => { const up = new THREE.Object3D(), low = new THREE.Object3D(); up.position.set(x, y, 0); return { up, low, L1, L2 }; };
  const armL = bone(0.178, SHO - WAIST, 0.27, 0.245), armR = bone(-0.178, SHO - WAIST, 0.27, 0.245);
  const legL = bone(0.085, HIP, 0.43, 0.415), legR = bone(-0.085, HIP, 0.43, 0.415);
  const RINGS = 16, RAD = 16;
  const hose = (parent, bn, r0, rm, r1, mat, end) => {
    const n = RINGS * (RAD + 1), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), idx = [];
    for (let i = 0; i < RINGS - 1; i++) for (let j = 0; j < RAD; j++) { const a = i * (RAD + 1) + j, b = a + RAD + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setIndex(idx);
    const m = mesh(g, mat); m.frustumCulled = false; parent.add(m, end);
    return { bn, r0, rm, r1, pos, nor, g, end };
  };
  const hand = () => { const h = new THREE.Group(), palm = ball(matSkin, 0.037, 0.052, 0.03, 20), cuff = mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 20), matShirt); palm.position.y = -0.04; cuff.position.y = 0.002; h.add(palm, cuff); return h; };
  const shoe = () => { const h = new THREE.Group(), s = ball(matShoe, 0.056, 0.046, 0.122, 24); s.position.set(0, -0.03, 0.046); h.add(s); return h; };
  for (const a of [armL, armR]) { const cap = ball(matSleeve, 0.063, 0.063, 0.063, 20); cap.position.copy(a.up.position); chest.add(cap); }   // la spalla: la manica nasce dentro la giacca
  const hoses = [hose(chest, armL, 0.061, 0.051, 0.045, matSleeve, hand()), hose(chest, armR, 0.061, 0.051, 0.045, matSleeve, hand()),
    hose(squash, legL, 0.082, 0.065, 0.052, matTrouser, shoe()), hose(squash, legR, 0.082, 0.065, 0.052, matTrouser, shoe())];
  const vS = new THREE.Vector3(), vE = new THREE.Vector3(), vH = new THREE.Vector3(), vA = new THREE.Vector3(), vB2 = new THREE.Vector3(), vT = new THREE.Vector3(), vN = new THREE.Vector3(), vB = new THREE.Vector3(), vP = new THREE.Vector3(), qq = new THREE.Quaternion(), mm = new THREE.Matrix4();
  const bend = (h) => {
    const { up, low, L1, L2 } = h.bn, R1 = Math.min(0.45 * L1, 0.1), R2 = Math.min(0.45 * L2, 0.1), LT = L1 + L2;
    vS.copy(up.position); vE.set(0, -L1, 0).applyQuaternion(up.quaternion).add(vS);
    qq.copy(up.quaternion).multiply(low.quaternion); vH.set(0, -L2, 0).applyQuaternion(qq).add(vE);
    vA.copy(vS).sub(vE).multiplyScalar(R1 / L1).add(vE); vB2.copy(vH).sub(vE).multiplyScalar(R2 / L2).add(vE);   // dove comincia e dove finisce la piega del gomito
    let k = 0;
    for (let i = 0; i < RINGS; i++) {
      let f;                                              // a che punto della lunghezza si è, per assottigliare il tubo
      if (i < 5) { const u = i / 5; vP.lerpVectors(vS, vA, u); vT.subVectors(vE, vS); f = (u * (L1 - R1)) / LT; }
      else if (i <= 10) { const u = (i - 5) / 5, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        vP.set(a * vA.x + b * vE.x + c * vB2.x, a * vA.y + b * vE.y + c * vB2.y, a * vA.z + b * vE.z + c * vB2.z);
        vT.set((1 - u) * (vE.x - vA.x) + u * (vB2.x - vE.x), (1 - u) * (vE.y - vA.y) + u * (vB2.y - vE.y), (1 - u) * (vE.z - vA.z) + u * (vB2.z - vE.z)); f = (L1 - R1 + u * (R1 + R2)) / LT; }
      else { const u = (i - 10) / 5; vP.lerpVectors(vB2, vH, u); vT.subVectors(vH, vE); f = (L1 + R2 + u * (L2 - R2)) / LT; }
      vT.normalize();
      if (i === 0) { vN.set(0, 0, 1).addScaledVector(vT, -vT.z); if (vN.lengthSq() < 1e-3) vN.set(1, 0, 0).addScaledVector(vT, -vT.x); } else vN.addScaledVector(vT, -vN.dot(vT));
      vN.normalize(); vB.crossVectors(vT, vN);
      const fe = L1 / LT, r = f < fe ? lerp(h.r0, h.rm, f / fe) : lerp(h.rm, h.r1, (f - fe) / (1 - fe));
      for (let j = 0; j <= RAD; j++) {
        const an = (j / RAD) * Math.PI * 2, cs = Math.cos(an), sn = Math.sin(an), nx = cs * vN.x + sn * vB.x, ny = cs * vN.y + sn * vB.y, nz = cs * vN.z + sn * vB.z;
        h.pos[k] = vP.x + r * nx; h.pos[k + 1] = vP.y + r * ny; h.pos[k + 2] = vP.z + r * nz; h.nor[k] = nx; h.nor[k + 1] = ny; h.nor[k + 2] = nz; k += 3;
      }
    }
    h.g.attributes.position.needsUpdate = true; h.g.attributes.normal.needsUpdate = true;
    // la mano o la scarpa in fondo, orientata come l'ultimo tratto
    vP.copy(vT).negate(); vB.crossVectors(vP, vN); mm.makeBasis(vB, vP, vN);
    h.end.quaternion.setFromRotationMatrix(mm); h.end.position.copy(vH);
  };
  scene.add(peg);

  // pose ed espressioni: ogni valore passa da una molla, così i cambi si assestano da soli
  const J = {}; ["aLz", "aRz", "aLx", "aRx", "eL", "eR", "lLx", "lRx", "kL", "kR", "lz", "hx", "hy", "hz", "by", "sq", "cr", "lean", "oh", "joy", "born", "shake"].forEach((k) => { J[k] = new Spring(0, 90, 13); });
  J.sq.x = 1; J.sq.k = 240; J.sq.c = 11; J.by.k = 40; J.by.c = 10; J.cr.k = 130; J.cr.c = 12; J.hy.k = 60; J.hx.k = 60; J.aLz.x = J.aRz.x = 0.13;
  J.oh.k = J.joy.k = 160; J.oh.c = J.joy.c = 20; J.born.k = 150; J.born.c = 13; J.shake.k = 320; J.shake.c = 15;
  const pose = {}, FREE = { by: 1, shake: 1, born: 1 };
  const stepPose = (dt) => { for (const k in J) if (!FREE[k]) J[k].step(pose[k] ?? (k === "sq" ? 1 : 0), dt); };
  const setLimbs = (c, wave, t) => {
    armL.up.rotation.set(-J.aLx.x, 0, J.aLz.x); armR.up.rotation.set(-J.aRx.x, 0, -J.aRz.x);
    armL.low.rotation.set(-J.eL.x, 0, 0); armR.low.rotation.set(-J.eR.x, 0, (-Math.sin(t * 8) * 0.38 - 0.55) * wave);
    legL.up.rotation.set(-J.lLx.x - c, 0, J.lz.x); legR.up.rotation.set(-J.lRx.x - c, 0, -J.lz.x);
    legL.low.rotation.set(J.kL.x + 2 * c, 0, 0); legR.low.rotation.set(J.kR.x + 2 * c, 0, 0);
    hoses.forEach(bend);
    head.rotation.set(J.hx.x, J.hy.x, J.hz.x);
    const sq = clamp(J.sq.x, 0.6, 1.3); squash.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  };
  // la faccia: battito di ciglia, occhi che sorridono, bocca tonda per lo stupore; gli occhi seguono un punto
  const face = (t, lookX, lookY) => {
    const blink = (t % 3.9 < 0.12 || (t + 1.7) % 9.3 < 0.11) ? 0.1 : 1, oh = clamp(J.oh.x), joy = clamp(J.joy.x);
    eyes.forEach((e) => {
      const happy = joy > 0.5; e.arc.visible = happy; e.open.visible = !happy;
      e.open.scale.set(1 + oh * 0.1, lerp(e.open.scale.y, blink * (1 + oh * 0.16), 0.45), 1);
      e.g.position.set(e.home.x + lookX * 0.006, e.home.y + lookY * 0.005, e.home.z); e.brow.position.y = 0.036 + oh * 0.008 + joy * 0.004;
    });
    smile.scale.setScalar(clamp(1 - oh * 1.4) * (1 + joy * 0.3)); smile.visible = smile.scale.x > 0.02;
    oMouth.visible = oh > 0.05; oMouth.scale.set(0.012 * oh, 0.016 * oh, 0.006);
  };

  /* ───── oggetti di scena ───── */
  // il punto del titolo che prende vita, e le scintille quando si apre nell'omino
  const dotMat = new THREE.MeshPhysicalMaterial({ color: 0x16130f, roughness: 0.5, clearcoat: 0.3 });
  const dotBall = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), dotMat); dotBall.visible = false; scene.add(dotBall);
  const INK = new THREE.Color(0x16130f), ORANGE = new THREE.Color(0xf68622);
  const softTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const c = cv.getContext("2d"), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,0.45)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const sprites = (n, color) => Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color, transparent: true, opacity: 0, depthWrite: false })); s.visible = false; scene.add(s); return { s, a: (i / n) * Math.PI * 2 + Math.random() * 0.5, v: 0.6 + Math.random() * 0.7 }; });
  const sparks = sprites(12, 0xffb060), spark = { t: -9, x: 0, y: 0, z: 0 };
  // in piazza: il selciato invisibile che riceve l'ombra vera, un'ombra di contatto, gli sbuffi di polvere dell'atterraggio
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.36 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uO: { value: 0.4 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec2 vUv; uniform float uO; void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(0.07, 0.05, 0.03, a * a * uO); }",
  }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.01; contact.renderOrder = -5; scene.add(contact);
  const puffs = sprites(10, 0xd9d2c6), puff = { t: -9, x: 0, z: 0 };

  /* ───── misure che dipendono dallo schermo ───── */
  const HH = 10 * Math.tan(rad(15));                        // mezza altezza del piano dell'hero (camera a 10, apertura 30°)
  let W = 1, Hpx = 1, aspect = 1, hw = HH, unit = 1, S0 = 0.84, fov = 46, ringR = 6, logoBig = 4000, logoSmall = 300, bankH = 3000;
  const resize = () => {
    W = stage.clientWidth; Hpx = stage.clientHeight; if (!W || !Hpx) return;
    aspect = W / Hpx; hw = HH * aspect; U.uAspect.value = aspect; maskU.uRes.value.set(W, Hpx);
    renderer.setSize(W, Hpx, false); camera.aspect = aspect;
    unit = clamp(aspect, 0.62, 1); S0 = 0.84 * unit;
    // in piazza: l'apertura si adatta perché in larghezza si vedano al più ~72°, e l'omino resta con i piedi in vista
    fov = clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(rad(36)) / aspect)), 34, 78);
    ringR = clamp(CAM_H / Math.tan(Math.max(0.12, rad(fov / 2) - PITCH - 0.07)), aspect < 0.8 ? 5.2 : 4.2, 6.4);   // sugli schermi alti sta più lontano, così non copre le frasi
    logoBig = 3.6 * Math.max(W, Hpx); logoSmall = Math.min(0.4 * Math.min(W, Hpx), 340);
    bankH = 2 * Math.max(0.6067 * innerWidth, 0.6 * Hpx) + 1.5 * Hpx;          // come nel CSS: due lembi di nebbia e in mezzo il pieno
  };
  resize(); addEventListener("resize", resize);

  /* ───── puntatore ───── */
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  /* ───── il punto dopo «Mura»: dov'è sullo schermo, quanto è grande ─────
     Si prende il riquadro dell'ultimo carattere del titolo e, dentro, l'inchiostro vero del glifo (con un contesto 2D).
     Il carattere viene chiuso in uno <span> per poterlo spegnere quando al suo posto c'è la pallina 3D. */
  const dot = { x: 0, y: 0, r: 4, ok: false, el: null, isDot: false };
  const meas = document.createElement("canvas").getContext("2d");
  const lastText = (n) => { for (let c = n.lastChild; c; c = c.previousSibling) { if (c.nodeType === 3 && c.textContent.trim()) return c; if (c.nodeType === 1) { const t = lastText(c); if (t) return t; } } return null; };
  const findDot = () => {
    dot.ok = false; if (!title) return;
    if (!dot.el || !dot.el.isConnected) {
      const tn = lastText(title); if (!tn) return;
      const i = tn.textContent.replace(/\s+$/, "").length - 1; if (i < 0) return;
      const tail = tn.splitText(i); tail.splitText(1);
      const sp = document.createElement("span"); sp.className = "h3d__dot"; tail.replaceWith(sp); sp.append(tail); dot.el = sp;
    }
    const ch = dot.el.textContent;
    // posizione nel layout, senza trasformazioni: così non conta se il titolo sta ancora entrando o già uscendo
    let left = 0, top = 0, e = dot.el; while (e && e !== stage) { left += e.offsetLeft; top += e.offsetTop; e = e.offsetParent; }
    let rc = { left, top, height: dot.el.offsetHeight };
    if (!e) { const b = dot.el.getBoundingClientRect(), st = stage.getBoundingClientRect(); rc = { left: b.left - st.left, top: b.top - st.top, height: b.height }; }
    if (!rc.height) return;
    const cs = getComputedStyle(dot.el), fs = parseFloat(cs.fontSize);
    meas.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const m = meas.measureText(ch), desc = m.fontBoundingBoxDescent ?? fs * 0.25, asc = m.fontBoundingBoxAscent ?? fs * 0.9;
    const base = rc.top + (rc.height - (asc + desc)) / 2 + asc;                 // la linea di base dentro il riquadro
    const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    dot.x = rc.left - m.actualBoundingBoxLeft + w / 2; dot.y = base - m.actualBoundingBoxAscent + h / 2;
    dot.r = Math.max(2, Math.min(w, h) / 2); dot.isDot = ch === "."; dot.ok = true;
  };

  /* ───── i livelli HTML guidati dallo stesso avanzamento: titolo, banco di nuvole, frasi, cielo, nome, nebbia ───── */
  const copy = $(".hero__copy"), cta = $(".hero__cta"), mist = $(".intro__mist"), mistA = $(".intro__mist-a"), mistB = $(".intro__mist-b");
  const cloud1 = $(".sky__cloud--1"), cloud2 = $(".sky__cloud--2"), front = $(".sky__front"), nameEl = $(".intro__name");
  const bank = $(".h3d__bank"), wisps = [...document.querySelectorAll(".h3d__wisp")];
  const caps = [...document.querySelectorAll(".h3d__cap")];
  const capRange = [[0.555, 0.6, 0.675, 0.705], [0.73, 0.775, 0.835, 0.86]];
  // le frasi entrano parola per parola, ognuna dalla sua riga; se cambia la lingua si ricompongono
  const splitCap = (el) => {
    const words = el.textContent.trim().split(/\s+/); el.textContent = "";
    words.forEach((w, i) => { const o = document.createElement("span"), s = document.createElement("span"); o.className = "h3d__w"; s.textContent = w; o.append(s); el.append(o); if (i < words.length - 1) el.append(" "); });
    el._w = [...el.querySelectorAll(".h3d__w > span")]; el._k = "";
  };
  caps.forEach((el) => { splitCap(el); new MutationObserver(() => { if (!el.querySelector(".h3d__w")) splitCap(el); }).observe(el, { childList: true }); });
  const setFade = (el, o, y, blur) => { if (!el) return; const k = o.toFixed(3) + "|" + y.toFixed(1) + "|" + blur.toFixed(1); if (k === el._f) return; el._f = k; el.style.opacity = o.toFixed(3); el.style.transform = y ? `translate3d(0,${y.toFixed(2)}px,0)` : ""; el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : ""; el.style.visibility = o < 0.004 ? "hidden" : "visible"; };
  const key = (a, b, x) => lerp(a, b, x).toFixed(3);
  // il banco di nuvole: sale dal basso, copre tutto, prosegue verso l'alto e scopre la piazza; quattro nuvole vere lo precedono, più veloci
  let lastK = -1;
  const clouds = (k) => {
    if (k === lastK) return; lastK = k;
    if (bank) { bank.style.transform = `translate3d(0,${lerp(Hpx * 1.02, -bankH, k).toFixed(1)}px,0)`; bank.style.visibility = k <= 0 || k >= 1 ? "hidden" : "visible"; }
    wisps.forEach((el, i) => { const a = lin(i * 0.045, 0.4 + i * 0.07, k), sc = lerp(1, 1.22 + i * 0.08, a); el.style.transform = `translate3d(0,${key(112, -120 - i * 14, a)}vh,0) scale(${(i > 1 ? -sc : sc).toFixed(3)},${sc.toFixed(3)})`; el.style.visibility = a <= 0 || a >= 1 ? "hidden" : "visible"; });
  };
  let lastQ = -1;
  const finale = (q) => {
    if (q === lastQ) return; lastQ = q;
    // le nuvole scendono perché si sale; un banco di cumuli viene incontro; la nebbia chiude e diventa la pagina
    if (cloud1) cloud1.style.transform = `translate3d(0,${key(-14, 58, q)}vh,0) scale(${key(0.94, 1.16, q)})`;
    if (cloud2) cloud2.style.transform = `translate3d(0,${key(-4, 80, q)}vh,0) scale(${key(1, 1.2, q)})`;
    if (front) {
      const a = lin(0.6, 0.657, q), b = lin(0.657, 0.857, q), c = lin(0.857, 1, q);
      front.style.opacity = a.toFixed(3);
      front.style.transform = `translate3d(0,${(lerp(lerp(lerp(80, 58, a), 8, b), -28, c)).toFixed(2)}%,0) scale(${(lerp(lerp(lerp(1, 1.05, a), 1.6, b), 2.3, c)).toFixed(3)})`;
    }
    if (nameEl) { const n = ss(0.43, 0.54, q); nameEl.style.opacity = n.toFixed(3); nameEl.style.transform = `translate3d(0,${((1 - n) * 24).toFixed(1)}px,0)`; }
    if (mist) mist.style.transform = `translate3d(0,${key(100, -112, lin(0.743, 1, q))}%,0)`;
    if (mistB) mistB.style.transform = `translate3d(${key(-4, 6, q)}vw,0,0)`;
    if (mistA) mistA.style.transform = `translate3d(${key(5, -7, q)}vw,${key(6, 0, q)}%,0)`;
  };

  /* ───── stato ───── */
  const qs = new URLSearchParams(location.search), toP = (p) => p * PF, toPq = (q) => PF + q * (1 - PF);
  // per le prove: ?p=0.5 ferma il film in un punto, ?q=0.5 ferma il finale; __h3d(0.5), __h3d.q(0.5), __h3d.step(60) fanno lo stesso dalla console
  let forcedP = qs.get("q") != null ? toPq(+qs.get("q")) : qs.get("p") != null ? toP(+qs.get("p")) : null;
  const dbg = window.__h3d = Object.assign((p) => { forcedP = p == null ? null : toP(+p); }, { q: (q) => { forcedP = toPq(+q); }, ring: 0, fov: 0, pitch: 0,
    state: () => ({ P, p: Math.min(P / PF, 1), q: clamp((P - PF) / (1 - PF)), time, dot: { x: dot.x, y: dot.y, r: dot.r, ok: dot.ok, isDot: dot.isDot }, drop: { ...drop }, leap: { ...leap }, born: J.born.x }),
    step: (n = 60, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt); renderer.render(scene, camera); } });
  let pT = 0, P = forcedP != null ? forcedP : 0, last = performance.now(), time = 0, frames = 0, visible = true, raf = 0, shown = false, wasDark = false, wasPop = false, dotOff = false, psiPrev = 0;
  const drop = { on: false, y: 0, vy: 0, rest: false }, leap = { on: false, t: 0, y: 0, vy: 0 };
  const apex = new THREE.Vector3(), tmp = new THREE.Vector3();

  const tick = (dt) => {
    time += dt; frames++;
    // avanzamento: lo scorrimento, ammorbidito perché il film non vada mai a scatti
    if (forcedP == null) { const span = intro.offsetHeight - innerHeight; pT = span > 0 ? clamp(-intro.getBoundingClientRect().top / span) : 0; } else pT = forcedP;
    if (!panoReady) pT = Math.min(pT, toP(0.3));
    P += (pT - P) * (1 - Math.exp(-dt * 7)); if (Math.abs(pT - P) < 0.00002) P = pT;
    const p = Math.min(P / PF, 1), q = clamp((P - PF) / (1 - PF));
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 4)); ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 4));

    /* testi */
    const tOut = ss(T.title[0], T.title[1], p);
    setFade(copy, 1 - tOut, -tOut * Hpx * 0.08, tOut * 10); setFade(cta, 1 - ss(0.03, 0.1, p), 0, 0);
    let wash = 0;
    caps.forEach((el, i) => {
      const r = capRange[i], tin = lin(r[0], r[1], p), out = ss(r[2], r[3], p), k = tin.toFixed(3) + out.toFixed(3);
      wash = Math.max(wash, ss(r[0], r[1], p) * (1 - out));
      if (k === el._k) return; el._k = k;
      el.style.opacity = (1 - out).toFixed(3); el.style.visibility = tin <= 0 || out >= 1 ? "hidden" : "visible";
      el.style.filter = out > 0.02 ? `blur(${(out * 8).toFixed(1)}px)` : ""; el.style.transform = out > 0 ? `translate3d(0,${(-out * 22).toFixed(1)}px,0)` : "";
      el._w.forEach((wd, j, a) => { const e = 1 - Math.pow(1 - clamp(tin * 1.7 - (j / a.length) * 0.7), 3); wd.style.transform = `translate3d(0,${((1 - e) * 110).toFixed(1)}%,0)`; });
    });
    U.uWash.value = wash;
    clouds(lin(T.bank[0], T.bank[1], p)); finale(q);

    /* la vista sulla piazza */
    const street = p >= T.swap;
    const un = io(lin(T.unroll[0], T.unroll[1], p)), w = io(lin(T.walk[0], T.walk[1], p)), up = io(lin(0, 0.5, q));
    // nel finale si sale: la vista si alza verso i tetti, si allarga un poco e continua a girare piano
    const fovQ = (dbg.fov || fov) * (1 + 0.2 * up), tanH = Math.tan(rad(fovQ / 2));
    const yawBase = YAW0 + (1 - un) * 1.9 + (YAW1 - YAW0) * w + 0.22 * q - time * 0.02 * (1 - un);
    const yaw = yawBase + ptr.sx * 0.08 * un, pitch = lerp(-Math.PI / 2, PITCH, un) + 0.27 * up - ptr.sy * 0.03 * un + J.shake.step(0, dt) + dbg.pitch;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    U.uF.value.set(Math.sin(yaw) * cp, sp, -Math.cos(yaw) * cp); U.uR.value.set(Math.cos(yaw), 0, Math.sin(yaw)); U.uU.value.crossVectors(U.uR.value, U.uF.value);
    U.uD.value = 1 - ss(0.25, 1, un); U.uScale.value = lerp(3.3, tanH, un); U.uScene.value = street ? 1 : 0;
    // il simbolo: da enorme a logo, mentre tutto quel che resta fuori svanisce nel cielo
    const out = 1 - ss(0.03, 0.24, q);
    maskMesh.visible = q > 0.0005 && !!maskU.tMask.value; maskU.uOut.value = out;
    maskU.uSize.value = Math.exp(lerp(Math.log(logoBig), Math.log(logoSmall), ss(0, 0.46, q)));
    const dark = p > 0.47 && out > 0.5; if (dark !== wasDark) { wasDark = dark; root.classList.toggle("h3d-dark", dark); }   // sopra la piazza la barra diventa chiara

    if (!street) {
      /* ═══ TETTI: il punto dopo «Mura» prende vita, salta, si apre nell'omino, che cade verso le nuvole ═══ */
      camera.fov = 30; camera.position.set(0, 0, 10); camera.rotation.set(0, 0, 0); camera.updateProjectionMatrix();
      sun.castShadow = false; sun.position.set(-4, 6, 9); sun.target.position.set(0, 0, 0); sun.intensity = 2.3; hemi.intensity = 1.1; rim.intensity = 1.2;
      ground.visible = false; contact.visible = false; drop.on = false; leap.on = false; leap.y = 0; puffs.forEach((u) => { u.s.visible = false; });
      if (p < 0.04 && (frames % 6 === 0 || !dot.ok)) findDot();
      const wake = lin(T.wake[0], T.wake[1], p), jump = lin(T.jump[0], T.jump[1], p), pop = lin(T.pop, T.pop + 0.04, p), fall = lin(T.fall[0], T.fall[1], p), fe = Math.pow(fall, 1.7);
      const zoomK = ss(T.jump[1], T.fall[1], p); U.uZoom.value = 1 + 0.55 * zoomK * zoomK; U.uBlur.value = 0.26 * ss(T.fall[0], T.fall[1], p);
      // il punto, nelle coordinate della scena
      const live = dot.ok && p > T.wake[0], dwx = (dot.x / W * 2 - 1) * hw, dwy = (1 - dot.y / Hpx * 2) * HH, dwr = (dot.r / Hpx) * 2 * HH;
      if (dot.el && dot.isDot && live !== dotOff) { dotOff = live; dot.el.style.opacity = live ? "0" : ""; }
      apex.set(dwx * 0.7, Math.min(dwy + 0.3 * HH, 0.44 * HH), 1);
      const born = clamp(J.born.step(pop > 0 ? 1 : 0, dt), 0, 1.3);
      // la pallina: batte e saltella sul posto mentre diventa arancio, poi salta fino al culmine e lì si apre
      const beat = Math.abs(Math.sin(time * 6.5)) * wake * (1 - jump), rise = Math.sin(jump * Math.PI * 0.5), br = lerp(dwr, 0.15 * S0, ss(0, 1, jump)) * (1 + 0.3 * beat);
      dotBall.visible = live && born < 0.75;
      dotBall.position.set(lerp(dwx, apex.x, jump * jump * (3 - 2 * jump)), lerp(dwy, apex.y, rise) + beat * dwr * 1.4, lerp(0, apex.z, jump));
      const stretch = 1 + 0.35 * Math.sin(jump * Math.PI) - 0.18 * beat, shrink = clamp(1 - born * 1.3);
      dotBall.scale.set(br * shrink / Math.sqrt(stretch), br * shrink * stretch, br * shrink / Math.sqrt(stretch));
      dotMat.color.copy(INK).lerp(ORANGE, ss(0.15, 1, wake));
      if (pop > 0 && !wasPop) { spark.t = time; spark.x = apex.x; spark.y = apex.y; spark.z = apex.z; } wasPop = pop > 0;
      const st = (time - spark.t) / 0.6;
      sparks.forEach((u) => { u.s.visible = st >= 0 && st < 1 && live; if (!u.s.visible) return; const e = 1 - (1 - st) * (1 - st), d = (0.1 + u.v * e * 0.55) * S0;
        u.s.position.set(spark.x + Math.cos(u.a) * d, spark.y + Math.sin(u.a) * d, spark.z); u.s.scale.setScalar((0.1 + e * 0.1) * S0); u.s.material.opacity = 0.9 * Math.pow(1 - st, 1.5); });
      // l'omino: nasce raccolto, si distende, poi cade a braccia larghe, sempre più lontano
      peg.visible = born > 0.02;
      peg.position.set(lerp(apex.x, dwx * 0.2, fe) + Math.sin(time * 1.6) * 0.05 * fall, lerp(apex.y, -0.55 * HH, fe), lerp(apex.z, -5, fe));
      peg.scale.setScalar(S0 * born); body.position.y = -COM;                      // ruota attorno alla vita
      swing.rotation.set(0.22 * fall, 0, Math.sin(time * 1.25) * 0.24 * fall + (1 - clamp(born)) * 0.6);
      body.rotation.set(0, J.by.step(Math.sin(time * 0.9) * 0.3 * fall, dt), 0);
      const tuck = 1 - ss(T.pop + 0.015, T.fall[0] + 0.04, p), sky = ss(T.fall[0], T.fall[0] + 0.06, p), fl = Math.sin(time * 9.5), fl2 = Math.sin(time * 8.3 + 1.7);
      pose.lLx = tuck * 1.25 + sky * (0.1 + fl * 0.08); pose.lRx = tuck * 1.25 + sky * (-0.15 + fl2 * 0.08);
      pose.kL = tuck * 2.0 + sky * (0.75 + fl2 * 0.12); pose.kR = tuck * 2.0 + sky * (0.45 + fl * 0.12);
      pose.aLx = tuck * 0.9; pose.aRx = tuck * 0.9; pose.eL = tuck * 1.6 + sky * 0.35; pose.eR = tuck * 1.6 + sky * 0.35;
      pose.aLz = lerp(0.13, 2.25 + fl * 0.1, sky) * (1 - tuck) + tuck * 0.2; pose.aRz = lerp(0.13, 2.25 + fl2 * 0.1, sky) * (1 - tuck) + tuck * 0.2;
      pose.lz = sky * 0.22; pose.hx = tuck * 0.5 - sky * 0.15; pose.hy = 0; pose.hz = 0; pose.sq = 1; pose.cr = 0; pose.lean = 0;
      pose.oh = sky; pose.joy = pop > 0 && sky < 0.5 ? 1 : 0;
      stepPose(dt);
      chest.rotation.set(tuck * 0.35, 0, 0); squash.position.y = 0; squash.rotation.z = 0;
      setLimbs(0, 0, time); face(time, ptr.sx * 0.5, -ptr.sy * 0.5);
    } else {
      /* ═══ PIAZZA: la camera è al centro della foto a 360°; l'omino esce dalle nuvole, cade, cammina in cerchio, poi salta via ═══ */
      camera.fov = fovQ; camera.position.set(0, CAM_H, 0); camera.rotation.set(pitch, -yaw, 0); camera.updateProjectionMatrix();
      dotBall.visible = false; sparks.forEach((u) => { u.s.visible = false; }); J.born.x = 1; J.born.v = 0; wasPop = true;
      sun.intensity = 2.9; hemi.intensity = 1.3; rim.intensity = 0;
      const R = dbg.ring || ringR;
      // la caduta è vera (gravità, rimbalzo, accucciata) e parte quando lo scorrimento arriva al punto giusto
      if (p >= T.drop) { if (!drop.on) { drop.on = true; drop.y = 6.5; drop.vy = -1; drop.rest = false; } } else if (p < T.drop - 0.012) { drop.on = false; leap.on = false; leap.y = 0; }
      const psi = YAW0 + (YAW1 - YAW0) * w + lerp(0.13, 0.2, w) * (aspect < 0.8 ? 0.3 : 1);
      const px = R * Math.sin(psi), pz = -R * Math.cos(psi);
      if (drop.on && !drop.rest) {
        drop.vy -= 24 * dt; drop.y += drop.vy * dt;
        if (drop.y <= 0) {
          drop.y = 0; const hit = -drop.vy;
          if (hit > 2.4) {
            drop.vy = hit * 0.15; J.sq.v -= hit * 0.2; J.cr.v += hit * 0.4; J.aLz.v += hit * 0.4; J.aRz.v += hit * 0.4; J.hx.v += hit * 0.2; J.shake.v -= Math.min(hit, 14) * 0.02;
            if (hit > 6) { puff.t = time; puff.x = px; puff.z = pz; }
          } else { drop.vy = 0; drop.rest = true; }
        }
      }
      // l'uscita: si accuccia e salta via verso il cielo; tornando indietro ricade
      if (p >= T.leap && drop.rest && !leap.on) { leap.on = true; leap.t = 0; leap.vy = 0; leap.y = 0; }
      if (leap.on) {
        if (p < T.leap - 0.01) { leap.on = false; drop.y = Math.min(leap.y, 7); drop.vy = 0; drop.rest = drop.y <= 0; leap.y = 0; }
        else { leap.t += dt; if (leap.t > 0.3) { if (leap.vy === 0) { leap.vy = 8.5; J.sq.v += 3; } leap.vy = Math.min(leap.vy + 24 * dt, 30); leap.y = Math.min(leap.y + leap.vy * dt, 40); } }
      }
      const prep = leap.on && leap.vy === 0 ? clamp(leap.t / 0.3) : 0, fly = leap.on && leap.vy > 0 ? 1 : 0;
      const here = drop.on && leap.y < 30, y = drop.y + leap.y, air = fly ? 0 : clamp(y / 1.5);
      peg.visible = here; ground.visible = here; contact.visible = here; sun.castShadow = here;
      peg.position.set(px, y, pz); peg.scale.setScalar(1); swing.rotation.set(0, 0, 0); body.position.y = 0;
      const speed = clamp(Math.abs(psi - psiPrev) * R / dt, 0, 4); psiPrev = psi;       // quanto sta camminando davvero, in m/s
      const walking = ss(T.walk[0], T.walk[0] + 0.02, p) * (1 - ss(T.walk[1] - 0.02, T.walk[1], p));
      const faceCam = Math.atan2(-px, -pz), faceWalk = Math.atan2(Math.cos(psi), Math.sin(psi)), turn = wrap(faceWalk - faceCam);
      body.rotation.set(0, J.by.step(faceCam + turn * walking * 0.84, dt), 0);
      const ph = R * (psi - YAW0) * 4.7, sw = Math.sin(ph), cw = Math.cos(ph);
      const wave = (ss(T.hello[0], T.hello[0] + 0.015, p) * (1 - ss(T.hello[1] - 0.015, T.hello[1], p)) + ss(T.bye[0], T.bye[0] + 0.012, p) * (1 - ss(T.bye[1] - 0.01, T.bye[1], p))) * (1 - air) * (1 - fly), calm = (1 - walking) * (1 - air) * (1 - fly);
      pose.lLx = walking * sw * 0.5 + air * 0.2; pose.lRx = -walking * sw * 0.5 - air * 0.1;
      pose.kL = walking * Math.max(0, -cw) * 0.95 + air * 0.7; pose.kR = walking * Math.max(0, cw) * 0.95 + air * 0.4;
      pose.aLx = -walking * sw * 0.42 - prep * 0.5; pose.aRx = (walking * sw * 0.42 - prep * 0.5) * (1 - wave);
      pose.aLz = 0.13 + air * 1.9 + fly * 2.75 + calm * Math.sin(time * 1.9) * 0.012; pose.aRz = lerp(0.13 + air * 1.9 + fly * 2.75, 2.45, wave);
      pose.eL = walking * (0.3 + Math.max(0, -sw) * 0.3) + air * 0.3; pose.eR = (walking * (0.3 + Math.max(0, sw) * 0.3) + air * 0.3) * (1 - wave) + wave * 0.35;
      pose.lz = air * 0.2; pose.hz = wave * 0.1; pose.hx = air * -0.25 + walking * 0.04 + prep * 0.25 - fly * 0.35;
      pose.hy = calm * (1 - wave) * (Math.sin(time * 0.6) * 0.35 + ptr.sx * 0.25) - walking * turn * 0.3;
      pose.sq = 1 + air * 0.04 + calm * Math.sin(time * 1.9) * 0.008; pose.cr = walking * 0.05 + prep * 0.8; pose.lean = walking * (0.04 + speed * 0.03) + prep * 0.3;
      pose.oh = air > 0.15 ? 1 : 0; pose.joy = wave > 0.5 || fly ? 1 : 0;
      stepPose(dt);
      const c = clamp(J.cr.x, -0.1, 1.1);
      chest.rotation.set(J.lean.x + c * 0.3, walking * sw * 0.1, 0);
      squash.position.y = -0.845 * (1 - Math.cos(c)) + walking * Math.abs(cw) * 0.028; squash.rotation.z = walking * sw * 0.025;
      setLimbs(c, wave, time); face(time, calm * ptr.sx, -calm * ptr.sy * 0.6 + fly);
      sun.position.copy(SUN).multiplyScalar(12).add(peg.position); sun.target.position.copy(peg.position);
      contact.position.set(px, 0.012, pz); contact.scale.setScalar(0.85 + y * 0.25); contact.material.uniforms.uO.value = 0.5 / (1 + y * 1.4);
      ground.material.opacity = 0.36 * clamp(1.4 - y * 0.2);
      const pt = (time - puff.t) / 0.8;
      puffs.forEach((u) => {
        u.s.visible = pt >= 0 && pt < 1 && here; if (!u.s.visible) return;
        const e = 1 - (1 - pt) * (1 - pt), d = 0.3 + u.v * e * 1.0;
        u.s.position.set(puff.x + Math.cos(u.a) * d, 0.12 + e * 0.32 * u.v, puff.z + Math.sin(u.a) * d); u.s.scale.setScalar(0.35 + e * 0.75); u.s.material.opacity = 0.5 * Math.pow(1 - pt, 1.6);
      });
    }
  };

  const frame = (now) => {
    raf = visible ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000)); last = now;
    tick(dt); renderer.render(scene, camera);
    if (!shown) { shown = true; root.classList.add("h3d-on"); }
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }, { rootMargin: "10% 0px" }).observe(intro);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } });
  raf = requestAnimationFrame(frame);
}
