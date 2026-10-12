document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minPolarAngle = Math.PI / 3;
controls.maxPolarAngle = Math.PI / 3;
controls.enablePan = false;

const shelters = Array.from({length: 16}, (_, i) => {
    let status = 'upcoming';
    if (i === 0) status = 'current';
    else if (i < 4) status = 'completed';
    return { id: i, status, method: '', eq: ['', ''], solution: {x: 0, y: 0} };
});

const shelterGroup = new THREE.Group();

const PATH_BASE_Y = -1.0;
const PATH_HEIGHT = 11.0;
const PATH_TURNS = 3;
const PATH_MARGIN = 0.03;
const PATH_WIDTH = 2.0;
const PATH_THICKNESS = 0.3;
const PATH_OFFSET = 0.5;

const MOUNTAIN_APEX_Y = 17;
const GRASS_COLOR_TOP = 0x6b9f35;
const GRASS_COLOR_BOTTOM = 0x3e6a1a;
const GROUND_TOP_Y = -4.5;
const SHELTER_SCALE = 1.0;
const GRASS_LIFT = 0.02;

// ------- helper per far rimpicciolire il sentiero verso la cima -------
function topTaper(t) {
    return THREE.MathUtils.clamp((t - 0.55) / 0.45, 0, 1);
}
function pathWidthAt(t) {
    return PATH_WIDTH * (1 - 0.5 * topTaper(t));
}
function pathOffsetAt(t) {
    return PATH_OFFSET * (1 - 0.5 * topTaper(t));
}

function smoothstep(x, a, b) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function findMountainMeshes() {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    const found = [];
    scene.traverse((obj) => {
        if (!obj.isMesh) return;
        if (obj.name === 'snow') return;
        box.setFromObject(obj);
        box.getCenter(center);
        box.getSize(size);
        if (size.y > 4 && box.max.y > 10 && Math.abs(center.x) < 2 && Math.abs(center.z) < 2) {
            found.push(obj);
        }
    });
    return found;
}

const mountainMeshes = findMountainMeshes();
if (mountainMeshes.length === 0) {
    console.warn('Montagna non trovata: uso il cono liscio come riferimento');
}

function mountainRadiusAt(y) {
    const localY = y - 5;
    return 12 * (12 - localY) / 24;
}

const raycaster = new THREE.Raycaster();
const normalMatrix = new THREE.Matrix3();

function sampleSurface(angle, y) {
    if (mountainMeshes.length === 0) return null;
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    raycaster.set(new THREE.Vector3(dir.x * 40, y, dir.z * 40), dir.clone().negate());
    const hit = raycaster.intersectObjects(mountainMeshes, false)[0];
    if (!hit) return null;

    let normal = null;
    if (hit.face) {
        normal = hit.face.normal.clone()
            .applyMatrix3(normalMatrix.getNormalMatrix(hit.object.matrixWorld))
            .normalize();
        normal.y = 0;
        normal = normal.lengthSq() > 1e-6 ? normal.normalize() : null;
    }
    return { radius: Math.hypot(hit.point.x, hit.point.z), normal };
}

function getPathPoint(t) {
    const y = PATH_BASE_Y + t * PATH_HEIGHT;
    const angle = t * PATH_TURNS * Math.PI * 2;
    const s = sampleSurface(angle, y);
    const radius = (s ? s.radius : mountainRadiusAt(y)) + pathOffsetAt(t);
    return {
        y, angle, radius,
        pos: new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
    };
}

function getFacing(angle, y) {
    const d = 0.12;
    const out = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const a = sampleSurface(angle - d, y);
    const b = sampleSurface(angle + d, y);
    const sum = new THREE.Vector3();
    if (a && a.normal) sum.add(a.normal);
    if (b && b.normal) sum.add(b.normal);
    return sum.lengthSq() > 1e-6 ? sum.normalize() : out;
}

// ------------------------------------------------------------------
// SENTIERO A TERRAZZE (solido pieno: terra + pendio erboso)
// ------------------------------------------------------------------
const TERRACE_WALL   = 0.95;  // altezza del muro di terra sotto il bordo
const TERRACE_BATTER = 0.70;  // quanto rientra il muro scendendo

function createTerraceMesh() {
    const steps = 720;
    const ROWS = 9;                 // 0-2 terra, 3-8 pendio erboso
    const SLOPE_ROWS = ROWS - 3;
    const turnDrop = PATH_HEIGHT / PATH_TURNS;
    const BLEND = 0.04;
    const tStart = -PATH_MARGIN;
    const tEnd = 1 + PATH_MARGIN;

    const positions = [];
    const colors = [];
    const indices = [];

    const dirtTop    = new THREE.Color(0x9b8560);
    const dirtBottom = new THREE.Color(0x6d5638);
    const grassTop   = new THREE.Color(GRASS_COLOR_TOP);
    const grassBottom= new THREE.Color(GRASS_COLOR_BOTTOM);
    const col = new THREE.Color();

    const pushVertex = (r, yy, c, s) => {
        positions.push(c * r, yy, s * r);
        colors.push(col.r, col.g, col.b);
    };

    for (let i = 0; i <= steps; i++) {
        const t = tStart + (tEnd - tStart) * (i / steps);
        const { y, angle, radius } = getPathPoint(t);
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const halfW = pathWidthAt(t) / 2;
        const rIn  = radius - halfW;      // dentro la montagna
        const rOut = radius + halfW;      // bordo esterno del sentiero

        const shrink = pathWidthAt(t) / PATH_WIDTH;
        const wallH  = TERRACE_WALL   * shrink;
        const batter = TERRACE_BATTER * shrink;

        const f = THREE.MathUtils.clamp(
            (t - 1 / PATH_TURNS + PATH_MARGIN) / BLEND, 0, 1);
        const lowY = GROUND_TOP_Y + (y - turnDrop - GROUND_TOP_Y) * f;

        const wallBotY = y - wallH;
        const wallBotR = rOut - batter;

        const shade = 1 + 0.05 * Math.sin(angle * 6 + y * 1.3);

        // 0 - bordo interno, sepolto nella montagna
        col.copy(dirtTop).multiplyScalar(shade);
        pushVertex(rIn, y, c, s);

        // 1 - bordo esterno della superficie calpestabile
        col.copy(dirtTop).multiplyScalar(shade * 0.97);
        pushVertex(rOut, y, c, s);

        // 2 - piede del muro di terra
        col.copy(dirtBottom).multiplyScalar(shade);
        pushVertex(wallBotR, wallBotY, c, s);

        // 3..8 - pendio erboso che scende al terrapieno inferiore
        for (let j = 3; j < ROWS; j++) {
            const v = (j - 2) / SLOPE_ROWS;
            let ry = wallBotY + (lowY - wallBotY) * v;
            if (j === ROWS - 1) ry = Math.max(ry, lowY + 0.05);

            const surf = sampleSurface(angle, ry);
            const baseR = (surf ? surf.radius : mountainRadiusAt(ry)) + GRASS_LIFT;

            const w  = smoothstep(v, 0, 0.32);
            const rr = wallBotR + (baseR - wallBotR) * w;

            col.copy(grassTop).lerp(grassBottom, v).multiplyScalar(shade);
            pushVertex(rr, ry, c, s);
        }

        if (i < steps) {
            const a = i * ROWS;
            const b = a + ROWS;
            for (let j = 0; j < ROWS - 1; j++) {
                indices.push(a + j, b + j, a + j + 1,
                             a + j + 1, b + j, b + j + 1);
            }
        }
    }

    // tappi alle estremità della spirale: il terrapieno diventa un solido chiuso
    const firstCol = 0;
    const lastCol  = steps * ROWS;
    for (let j = 0; j < ROWS - 2; j++) {
        indices.push(firstCol, firstCol + j + 1, firstCol + j + 2);
        indices.push(lastCol,  lastCol  + j + 2, lastCol  + j + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
}

shelterGroup.add(createTerraceMesh());

// Piattaforma sommitale: un disco di terra che "chiude" la spirale,
// così l'ultimo rifugio non sembra sospeso nel vuoto.
function createSummitPlatform() {
    const top = getPathPoint(1);
    const r = pathWidthAt(1) * 1.6;
    const geo = new THREE.CylinderGeometry(r, r * 1.15, PATH_THICKNESS, 20);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8c7853, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(top.pos.x * 0.55, top.y - PATH_THICKNESS / 2, top.pos.z * 0.55);
    return mesh;
}
shelterGroup.add(createSummitPlatform());

function getShelterColor(status) {
    switch (status) {
        case 'current': return 0xff2222;
        case 'completed': return 0x808080;
        case 'upcoming': return 0x2ecc71;
        default: return 0xffffff;
    }
}

function createShelterMesh(status) {
    const group = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true });
    const addBox = (w, h, d, x, y, z, color) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
        m.position.set(x, y, z);
        group.add(m);
        return m;
    };

    const STONE = 0x8d8b84;
    const WOOD = 0x6e4b2e;
    const DARK_WOOD = 0x3b2a1a;
    const LIT = 0xffe9a0;

    addBox(1.5, 0.32, 0.9, 0, 0.16, 0, STONE);
    addBox(1.5, 0.3, 0.8, 0, 0.47, 0, WOOD);

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-0.65, 0);
    roofShape.lineTo(0.65, 0);
    roofShape.lineTo(0, 0.38);
    roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1.8, bevelEnabled: false });
    roofGeo.translate(0, 0, -0.9);
    const roof = new THREE.Mesh(roofGeo, mat(getShelterColor(status)));
    roof.rotation.y = Math.PI / 2;
    roof.position.y = 0.62;
    group.add(roof);

    addBox(0.24, 0.26, 0.04, 0, 0.13, 0.46, DARK_WOOD);
    addBox(0.4, 0.05, 0.14, 0, 0.025, 0.52, STONE);

    [-0.5, 0.5].forEach((x) => {
        addBox(0.26, 0.18, 0.02, x, 0.18, 0.455, DARK_WOOD);
        addBox(0.2, 0.12, 0.03, x, 0.18, 0.46, LIT);
    });
    [-0.5, 0, 0.5].forEach((x) => {
        addBox(0.22, 0.17, 0.02, x, 0.47, 0.405, DARK_WOOD);
        addBox(0.16, 0.11, 0.03, x, 0.47, 0.41, LIT);
    });

    addBox(1.4, 0.04, 0.22, 0, 0.34, 0.56, WOOD);
    addBox(1.4, 0.03, 0.03, 0, 0.46, 0.66, WOOD);
    [-0.65, -0.325, 0, 0.325, 0.65].forEach((x) => {
        addBox(0.025, 0.12, 0.025, x, 0.4, 0.66, WOOD);
    });
    [-0.65, 0.65].forEach((x) => {
        addBox(0.04, 0.34, 0.04, x, 0.17, 0.66, DARK_WOOD);
    });

    addBox(0.14, 0.4, 0.14, 0.5, 0.92, -0.1, 0x555555);
    addBox(0.025, 0.4, 0.025, -0.8, 1.17, 0, DARK_WOOD);
    addBox(0.22, 0.13, 0.015, -0.68, 1.3, 0, getShelterColor(status));

    return group;
}

shelters.forEach((shelter, index) => {
    const itemGroup = new THREE.Group();

    const shelterMesh = createShelterMesh(shelter.status);
    shelterMesh.position.y = -0.03;

    const t = index / (shelters.length - 1);

    const shrink = THREE.MathUtils.clamp(pathWidthAt(t) / PATH_WIDTH, 0.55, 1);
    shelterMesh.scale.setScalar(SHELTER_SCALE * shrink);

    itemGroup.add(shelterMesh);

    const { pos, angle, y } = getPathPoint(t);
    itemGroup.position.copy(pos);
    itemGroup.lookAt(pos.clone().add(getFacing(angle, y)));

    const before = getPathPoint(Math.max(t - 0.01, -PATH_MARGIN)).pos;
    const after  = getPathPoint(Math.min(t + 0.01, 1 + PATH_MARGIN)).pos;
    const run = Math.hypot(after.x - before.x, after.z - before.z);
    itemGroup.rotateZ(-Math.atan2(after.y - before.y, run));

    itemGroup.traverse((child) => {
        child.userData = { shelterId: shelter.id };
    });

    shelterGroup.add(itemGroup);
});

scene.add(shelterGroup);

animate();
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    const positions = snowParticles.geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.1;
        if (positions[i] < -5) positions[i] = 35;
    }
    snowParticles.geometry.attributes.position.needsUpdate = true;
    controls.update();
}