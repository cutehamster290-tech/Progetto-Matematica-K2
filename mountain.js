function createMountain() {
    const t = THREE;

    const montainGeo = new t.ConeGeometry(12, 24, 5);
    const montainMat = new t.MeshStandardMaterial({ color: 0x4b5d50, flatShading: true });
    const montain = new t.Mesh(montainGeo, montainMat);
    montain.position.set(0, 5, 0);

    const snowGeo = new t.ConeGeometry(5.1, 9, 5);
    const snowMat = new t.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const snow = new t.Mesh(snowGeo, snowMat);
    snow.position.set(0, 7.5, 0);

    const shoulderGeo = new t.ConeGeometry(7, 14, 4);
    const shoulder = new t.Mesh(shoulderGeo, montainMat);
    shoulder.position.set(-5, -5, 2);
    shoulder.rotation.z = 0.2;

    montain.add(shoulder);
    montain.add(snow);

    return montain;
}