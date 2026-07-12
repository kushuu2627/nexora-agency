/* ============================================================
   NEXORA — Living Digital Universe
   Three.js persistent world + GSAP ScrollTrigger choreography
   ============================================================ */

(() => {
  "use strict";

  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     0. LENIS SMOOTH SCROLL
     ============================================================ */

  const lenis = new Lenis({
    duration: reduceMotion ? 0.1 : 1.15,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  /* ============================================================
     1. THREE.JS SETUP
     ============================================================ */

  const canvas = document.getElementById("universe");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x050506, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050506, 0.045);

  const camera = new THREE.PerspectiveCamera(
    52,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 0, 18);

  // Lighting — sparse, volumetric feel via point lights + fog
  const keyLight = new THREE.PointLight(0x6c7cff, 6, 60, 2);
  keyLight.position.set(6, 4, 10);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xc9a227, 0, 50, 2); // ramps up only at finale
  rimLight.position.set(-6, -3, 6);
  scene.add(rimLight);

  const ambient = new THREE.AmbientLight(0x1a1c24, 1.2);
  scene.add(ambient);

  /* ============================================================
     2. PARTICLE UNIVERSE — shared geometry, morphing targets
     ============================================================ */

  const COUNT = window.innerWidth < 720 ? 3200 : 6400;

  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);

  const colorIvory = new THREE.Color(0xece8df);
  const colorAurora = new THREE.Color(0x6c7cff);
  const colorGold = new THREE.Color(0xc9a227);
  const colorSilver = new THREE.Color(0x8b90a0);

  function fillColor(arr, i, c) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }

  // ---- Shape generators (each returns Float32Array of COUNT*3) ----

  function shapeNebula() {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 9 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const jitter = (Math.random() - 0.5) * 3;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta) + jitter;
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7 + jitter * 0.5;
      arr[i * 3 + 2] = r * Math.cos(phi) + jitter;
    }
    return arr;
  }

  function shapeRing(quarterEmphasis) {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT;
      const angle = t * Math.PI * 2 * 3 + Math.sin(i * 0.01) * 0.3;
      const radius = 7 + Math.sin(t * Math.PI * 8) * 1.2 + (Math.random() - 0.5) * 0.6;
      const height = Math.sin(angle * 2 + t * 10) * 2.2 + (Math.random() - 0.5) * 0.8;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = height;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }

  function shapeHelix() {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT;
      const angle = t * Math.PI * 2 * 6;
      const radius = 5 + (Math.random() - 0.5) * 0.7;
      const y = (t - 0.5) * 22;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }

  function shapeTwinPlanes() {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const w = (Math.random() - 0.5) * 8;
      const h = (Math.random() - 0.5) * 5;
      arr[i * 3] = side * 6 + w * 0.5;
      arr[i * 3 + 1] = h;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2 - 2;
    }
    return arr;
  }

  function shapeCalmSphere() {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 6 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }

  function shapeThreeNodes() {
    const arr = new Float32Array(COUNT * 3);
    const centers = [
      [-7, 1, 0],
      [7, 1, 0],
      [0, -6, 0],
    ];
    for (let i = 0; i < COUNT; i++) {
      const c = centers[i % 3];
      const r = Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = c[0] + r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = c[1] + r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = c[2] + r * Math.cos(phi);
    }
    return arr;
  }

  function shapeSparseField() {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 34;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    return arr;
  }

  function shapeSingularity() {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = Math.random() * 0.15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }

  function shapeWordmark() {
    const arr = new Float32Array(COUNT * 3);
    const cw = 900, ch = 220;
    const off = document.createElement("canvas");
    off.width = cw; off.height = ch;
    const ctx = off.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#fff";
    ctx.font = "600 150px Fraunces, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NEXORA", cw / 2, ch / 2 + 10);
    const img = ctx.getImageData(0, 0, cw, ch).data;

    const points = [];
    const step = 3;
    for (let y = 0; y < ch; y += step) {
      for (let x = 0; x < cw; x += step) {
        const idx = (y * cw + x) * 4;
        if (img[idx] > 128) {
          points.push([(x - cw / 2) / 22, -(y - ch / 2) / 22]);
        }
      }
    }

    for (let i = 0; i < COUNT; i++) {
      if (points.length === 0) {
        arr[i * 3] = 0; arr[i * 3 + 1] = 0; arr[i * 3 + 2] = 0;
        continue;
      }
      const p = points[i % points.length];
      arr[i * 3] = p[0] + (Math.random() - 0.5) * 0.06;
      arr[i * 3 + 1] = p[1] + (Math.random() - 0.5) * 0.06;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return arr;
  }

  // Sequence of target shapes, one per section (9 sections)
  const shapes = [
    shapeNebula(),        // 0 awakening
    shapeRing(),          // 1 services
    shapeHelix(),         // 2 process
    shapeTwinPlanes(),    // 3 work
    shapeCalmSphere(),    // 4 promise
    shapeThreeNodes(),    // 5 founders
    shapeSparseField(),   // 6 philosophy
    shapeSingularity(),   // 7 collapse
    shapeWordmark(),      // 8 finale
  ];

  // Initialize live buffer at shape 0
  positions.set(shapes[0]);
  for (let i = 0; i < COUNT; i++) {
    fillColor(colors, i, colorIvory);
    sizes[i] = 0.05 + Math.random() * 0.06;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, particleMaterial);
  scene.add(particles);

  // Glowing core (singularity / finale point)
  const coreGeo = new THREE.SphereGeometry(0.12, 24, 24);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xc9a227, transparent: true, opacity: 0 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  scene.add(core);

  /* ============================================================
     3. SCROLL-DRIVEN MASTER TIMELINE
     ============================================================ */

  const sectionIds = [
    "awakening", "services", "process", "work",
    "promise", "founders", "philosophy", "collapse", "finale",
  ];
  const NUM = sectionIds.length;

  // Camera waypoints: [x, y, z] position + lookAt per section
  const camPos = [
    [0, 0, 18],
    [3, 0.5, 13],
    [0, 2, 15],
    [0, 0, 16],
    [0, 0, 12],
    [0, 0.5, 14],
    [2, 1, 20],
    [0, 0, 6],
    [0, 0, 9],
  ];
  const camLook = [
    [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0],
    [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0],
  ];

  // How long (in viewport-heights) each section stays pinned while its
  // own internal reveal plays out. Text-dense acts get more runway so
  // scrolling never outruns reading; short beats stay brief.
  const pinLengths = {
    awakening: 3.0,
    services: 2.6,
    process: 1.6,
    work: 2.1,
    promise: 1.8,
    founders: 2.3,
    philosophy: 1.8,
    collapse: 1.0,
    finale: 2.4,
  };

  // Shared state describing where the universe currently sits between
  // two adjacent shapes/camera positions. Updated by each section's
  // own pinned ScrollTrigger, so it naturally matches variable pin
  // lengths instead of assuming equal section heights.
  const universeState = { from: 0, to: 0, t: 0 };

  ScrollTrigger.create({
    trigger: "#scroll-content",
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      const fill = document.getElementById("progressFill");
      if (fill) fill.style.height = `${self.progress * 100}%`;
    },
  });

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpV3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  // Particles recede while a section's text is being read, and come
  // forward again during the transformations between sections — this
  // is what keeps copy legible without ever hiding the universe.
  const sectionOpacity = {
    awakening: 0.85,
    services: 0.4,
    process: 0.5,
    work: 0.35,
    promise: 0.35,
    founders: 0.4,
    philosophy: 0.35,
    collapse: 0.85,
    finale: 0.55,
  };
  let currentParticleOpacity = sectionOpacity.awakening;

  function updateUniverse() {
    const { from, to, t } = universeState;
    const smooth = t * t * (3 - 2 * t); // smoothstep

    // Morph particle positions between shapes[from] and shapes[to]
    const fromShape = shapes[from];
    const toShape = shapes[to];
    const posAttr = geometry.attributes.position.array;
    for (let i = 0; i < COUNT * 3; i++) {
      posAttr[i] = lerp(fromShape[i], toShape[i], smooth);
    }
    geometry.attributes.position.needsUpdate = true;

    // Camera choreography
    const cFrom = camPos[from], cTo = camPos[to];
    const lFrom = camLook[from], lTo = camLook[to];
    const cp = lerpV3(cFrom, cTo, smooth);
    const lp = lerpV3(lFrom, lTo, smooth);
    tmpPos.set(cp[0], cp[1], cp[2]);
    tmpLook.set(lp[0], lp[1], lp[2]);
    camera.position.lerp(tmpPos, 0.12);
    camera.lookAt(tmpLook);

    // Color shifts: aurora emphasis mid-journey, gold near the close
    const collapseIdx = sectionIds.indexOf("collapse");
    const nearEnd = to >= collapseIdx ? smooth : 0;
    const colorAttr = geometry.attributes.color.array;
    const mixColor = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      if (to >= collapseIdx) {
        mixColor.copy(colorIvory).lerp(colorGold, nearEnd);
      } else if (to >= 1 && to <= 4) {
        mixColor.copy(colorIvory).lerp(colorAurora, 0.35 + 0.15 * Math.sin(i));
      } else {
        mixColor.copy(colorIvory).lerp(colorSilver, 0.2);
      }
      colorAttr[i * 3] = mixColor.r;
      colorAttr[i * 3 + 1] = mixColor.g;
      colorAttr[i * 3 + 2] = mixColor.b;
    }
    geometry.attributes.color.needsUpdate = true;

    // Core glow: fades in through collapse and holds bright at finale
    if (to >= collapseIdx) {
      const cT = to > collapseIdx ? 1 : smooth;
      coreMat.opacity = cT;
      core.scale.setScalar(1 + cT * 2);
      rimLight.intensity = cT * 8;
    } else {
      coreMat.opacity = 0;
      rimLight.intensity = 0;
    }

    // Fog thins slightly as the journey progresses
    scene.fog.density = 0.045 - to * 0.002;

    // Settle particle opacity toward the current section's target
    const targetOpacity = sectionOpacity[sectionIds[to]] ?? 0.7;
    currentParticleOpacity = lerp(currentParticleOpacity, targetOpacity, 0.05);
    particleMaterial.opacity = currentParticleOpacity;
  }

  /* ============================================================
     4. AMBIENT IDLE MOTION (independent of scroll)
     ============================================================ */

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    if (!reduceMotion) {
      particles.rotation.y = elapsed * 0.02;
      keyLight.position.x = 6 + Math.sin(elapsed * 0.3) * 2;
      keyLight.position.y = 4 + Math.cos(elapsed * 0.25) * 1.5;
    }

    updateUniverse();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ============================================================
     5. DOM TEXT REVEALS — per-section ScrollTrigger timelines
     ============================================================ */

  /* ============================================================
     5. DOM TEXT REVEALS — pinned per-section timelines
     ------------------------------------------------------------
     Each act pins in place for a deliberate scroll duration (see
     pinLengths above) while its own timeline plays: fade in, hold
     for reading, fade out. This is what keeps copy legible no
     matter how fast someone scrolls — the section simply doesn't
     advance until its beat is done. The same trigger also reports
     progress into universeState, so the universe's morph and the
     text on screen are always perfectly in sync.
     ============================================================ */

  function pinSection(id, index, build, onProgress) {
    const el = document.getElementById(id);
    if (!el) return null;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top top",
        end: () => `+=${window.innerHeight * pinLengths[id]}`,
        scrub: 0.6,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (index === 0) {
            universeState.from = 0; universeState.to = 0; universeState.t = 0;
          } else {
            universeState.from = index - 1;
            universeState.to = index;
            universeState.t = self.progress;
          }
          if (onProgress) onProgress(self.progress);
        },
      },
    });
    build(tl);
    return tl;
  }

  // ---- 1. Awakening ----
  pinSection("awakening", 0, (tl) => {
    tl.fromTo(".scroll-hint", { opacity: 0 }, { opacity: 1, duration: 0.4 })
      .to(".scroll-hint", { opacity: 0, duration: 0.3 }, "+=0.3");

    gsap.utils.toArray("#awakening .statement").forEach((el) => {
      tl.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, "+=0.1")
        .to(el, { opacity: 1, duration: 1.5 })
        .to(el, { opacity: 0, y: -20, duration: 0.5 });
    });

    tl.fromTo(".wordmark", { opacity: 0, y: 60, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 1 }, "+=0.2")
      .to(".wordmark", { opacity: 1, duration: 1.2 });
  });

  // ---- 2. Services ----
  pinSection("services", 1, (tl) => {
    gsap.utils.toArray(".service-stage").forEach((el) => {
      tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 })
        .to(el, { opacity: 1, duration: 1.4 })
        .to(el, { opacity: 0, y: -24, duration: 0.4 });
    });
  });

  // ---- 3. Process ----
  const processSteps = gsap.utils.toArray(".process-step");
  pinSection("process", 2, () => {}, (progress) => {
    const stepIdx = Math.min(processSteps.length - 1, Math.floor(progress * processSteps.length));
    processSteps.forEach((s, j) => s.classList.toggle("is-active", j === stepIdx));
  });

  // ---- 4. Selected Work ----
  pinSection("work", 3, (tl) => {
    gsap.utils.toArray(".work-piece").forEach((el) => {
      tl.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6 })
        .to(el, { opacity: 1, duration: 1.6 })
        .to(el, { opacity: 0, y: -30, duration: 0.4 });
    });
  });

  // ---- 5. Promise ----
  pinSection("promise", 4, (tl) => {
    gsap.utils.toArray(".promise-line").forEach((el) => {
      tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 })
        .to(el, { opacity: 1, duration: 1.3 })
        .to(el, { opacity: 0, y: -18, duration: 0.4 });
    });
  });

  // ---- 6. Founders ----
  pinSection("founders", 5, (tl) => {
    gsap.utils.toArray(".founder").forEach((el) => {
      tl.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 })
        .to(el, { opacity: 1, duration: 1.1 })
        .to(el, { opacity: 0, y: -20, duration: 0.4 });
    });
    gsap.utils.toArray(".merge-line").forEach((el) => {
      tl.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, "+=0.1")
        .to(el, { opacity: 1, duration: 1.2 });
    });
  });

  // ---- 7. Philosophy ----
  pinSection("philosophy", 6, (tl) => {
    gsap.utils.toArray(".phil-line").forEach((el) => {
      tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6 })
        .to(el, { opacity: 1, duration: 1.5 })
        .to(el, { opacity: 0, y: -18, duration: 0.4 });
    });
  });

  // ---- 8. Collapse ----
  pinSection("collapse", 7, (tl) => {
    tl.fromTo(".collapse-word", { opacity: 0, letterSpacing: "0.1em" },
      { opacity: 1, letterSpacing: "0.3em", duration: 1 })
      .to(".collapse-word", { opacity: 1, duration: 1 });
  });

  // ---- 9. Finale — a deliberate crescendo ----
  const finaleMarkEl = document.getElementById("finaleMark");
  pinSection("finale", 8, (tl) => {
    tl.fromTo(".finale-eyebrow", { opacity: 0 }, { opacity: 1, duration: 0.5 })
      .fromTo(finaleMarkEl, { opacity: 0, scale: 0.82, letterSpacing: "0.02em" },
        { opacity: 1, scale: 1, letterSpacing: "0.05em", duration: 0.9 }, "+=0.1")
      .fromTo("#finaleDivider", { width: "0%", opacity: 0 },
        { width: "140px", opacity: 0.7, duration: 0.5 }, "+=0.1")
      .fromTo(".finale-line", { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.4 }, "+=0.1")
      .to({}, { duration: 0.6 })
      .fromTo(".finale-actions", { opacity: 0 }, { opacity: 1, duration: 0.5 })
      .fromTo(".finale-social", { opacity: 0 }, { opacity: 1, duration: 0.4 }, "+=0.1")
      .fromTo(".finale-footer", { opacity: 0 }, { opacity: 1, duration: 0.4 }, "+=0.1")
      .to({}, { duration: 0.8 });
  }, (progress) => {
    finaleMarkEl.classList.toggle("is-lit", progress > 0.18);
  });

  /* ============================================================
     6. NAV VISIBILITY + PROGRESS
     ============================================================ */

  ScrollTrigger.create({
    trigger: "#scroll-content",
    start: "5% top",
    end: "bottom bottom",
    onEnter: () => document.querySelector(".nav").classList.add("is-visible"),
    onLeaveBack: () => document.querySelector(".nav").classList.remove("is-visible"),
  });

  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute("href"));
      if (target) lenis.scrollTo(target, { duration: 1.6 });
    });
  });

  /* ============================================================
     7. LOADER
     ============================================================ */

  window.addEventListener("load", () => {
    const fill = document.getElementById("loaderFill");
    const loader = document.getElementById("loader");
    gsap.to(fill, {
      width: "100%",
      duration: 1.4,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.delayedCall(0.3, () => {
          loader.classList.add("is-hidden");
          document.body.style.overflow = "";
        });
      },
    });
  });

  /* ============================================================
     8. CURSOR
     ============================================================ */

  const cursor = document.getElementById("cursor");
  window.addEventListener("pointermove", (e) => {
    gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.35, ease: "power3.out" });
  });
  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
  });

  // Magnetic pull on the finale's primary actions — a small tactile
  // nudge toward the cursor, released with an elastic snap-back.
  if (!reduceMotion) {
    document.querySelectorAll(".finale-actions .btn").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        gsap.to(btn, { x: x * 0.25, y: y * 0.4, duration: 0.4, ease: "power2.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* ============================================================
     9. CONTACT MODAL
     ============================================================ */

  const modal = document.getElementById("contactModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalEyebrow = document.getElementById("modalEyebrow");
  const modalForm = document.getElementById("modalForm");
  const modalSuccess = document.getElementById("modalSuccess");

  const modalCopy = {
    project: { eyebrow: "START A PROJECT", title: "Tell us what you're building." },
    call: { eyebrow: "BOOK A CALL", title: "Find a time that works for you." },
    talk: { eyebrow: "LET'S TALK", title: "Share a few details and we'll reach out." },
    contact: { eyebrow: "CONTACT US", title: "Reach out — we read every message." },
  };

  function openModal(kind) {
    const copy = modalCopy[kind] || modalCopy.project;
    modalEyebrow.textContent = copy.eyebrow;
    modalTitle.textContent = copy.title;
    modalForm.classList.remove("is-hidden");
    modalSuccess.classList.remove("is-visible");
    modalForm.reset();
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-cta]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.cta));
  });
  document.querySelectorAll("[data-demo]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal("project");
      modalTitle.textContent = "Live demos are shared privately — leave your details.";
    });
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  modalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    modalForm.classList.add("is-hidden");
    modalSuccess.classList.add("is-visible");
  });

  /* ============================================================
     10. INITIAL LOCK (prevent scroll flash before load)
     ============================================================ */

  document.body.style.overflow = "hidden";
  gsap.delayedCall(0.05, () => { document.body.style.overflow = ""; });

})();
