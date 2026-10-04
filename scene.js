const t = THREE;
const { innerWidth, innerHeight } = window;

const scene = new t.Scene();
scene.background = new t.Color(0x87CEEB);

const camera = new t.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(30, 20, 50);
camera.lookAt(0, 0, 0);

const renderer = new t.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);

const ambientLight = new t.AmbientLight(0xffffff, 0.4);
const sunLight = new t.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(10, 20, 10);

const groundGeo = new t.CylinderGeometry(20, 22, 2, 8);
const groundMat = new t.MeshStandardMaterial({ color: 0x3a5f0b, flatShading: true });
const ground = new t.Mesh(groundGeo, groundMat);
ground.position.set(0, -5.5, 0);

const montain = createMountain();

const snowCount = 400;
const snowGeo = new t.BufferGeometry();
const snowCoords = new Float32Array(snowCount * 3);
for (let i = 0; i < snowCount * 3; i += 3) {
    snowCoords[i] = (Math.random() - 0.5) * 60;
    snowCoords[i + 1] = Math.random() * 40;
    snowCoords[i + 2] = (Math.random() - 0.5) * 60;
}
snowGeo.setAttribute('position', new t.BufferAttribute(snowCoords, 3));
const snowParticles = new t.Points(snowGeo, new t.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.8 }));
scene.add(snowParticles);

scene.add(ground);
scene.add(montain);
scene.add(sunLight);
scene.add(ambientLight);

spawnTrees(20);
scene.add(createCloud(-8, 14, 5));
scene.add(createCloud(10, 16, -4))

function createTree(x, z) {
    const treeGroup = new t.Group();
    const trunk = new t.Mesh(new t.CylinderGeometry(0.3, 0.5, 2, 5), new t.MeshStandardMaterial({ color: 0x5c4033 }));
    trunk.position.y = 1

    const leaves = new t.Mesh(new t.ConeGeometry(2, 5, 5), new t.MeshStandardMaterial({color: 0x1e4620, flatShading: true}));
    leaves.position.y = 3.5

    treeGroup.add(trunk, leaves);
    treeGroup.position.set(x, -4.5, z);
    
    return treeGroup;
}

function createCloud(x, y, z) {
    const cloudGroup = new t.Group();
    const mat = new t.MeshStandardMaterial({color: 0xffffff, flatShading: true, transparent: true, opacity: 0.85});

    for (let i = 0; i < 4; i++) {
        const part = new t.Mesh(new t.DodecahedronGeometry(1.5 + Math.random() * 0.5), mat);
        part.position.set(i * 1.2, Math.random() * 0.5, Math.random() * 0.5);
        cloudGroup.add(part);
    }

    cloudGroup.position.set(x, y, z);
    return cloudGroup;
}

function spawnTrees(count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 12.5 + Math.random() * 4.5;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        scene.add(createTree(x, z));
    }
}