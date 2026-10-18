function createMountain() {
    const t = THREE;

    const montainGeo = new t.ConeGeometry(12, 24, 5);
    const montainMat = new t.MeshStandardMaterial({ color: 0x5e8f2c, flatShading: true });
    const montain = new t.Mesh(montainGeo, montainMat);
    montain.position.set(0, 5, 0);
    montain.name = 'rock';

    const snowGeo = new t.ConeGeometry(2.8, 5, 5);
    const snowMat = new t.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const snow = new t.Mesh(snowGeo, snowMat);
    snow.position.set(0, 9.5, 0);
    snow.name = 'snow';

    montain.add(snow);

    return montain;
}