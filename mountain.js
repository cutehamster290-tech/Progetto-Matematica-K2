function createMountain() {
    const t = THREE;

    const montainGeo = new t.ConeGeometry(12, 24, 5);
    // verde chiaro, in tono con l'erba (prima era 0x4b5d50, verde scuro)
    const montainMat = new t.MeshStandardMaterial({ color: 0x5e8f2c, flatShading: true });
    const montain = new t.Mesh(montainGeo, montainMat);
    montain.position.set(0, 5, 0);
    montain.name = 'rock';

    // Neve ridotta e posizionata solo sulla punta
    const snowGeo = new t.ConeGeometry(2.8, 5, 5);
    const snowMat = new t.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const snow = new t.Mesh(snowGeo, snowMat);
    snow.position.set(0, 9.5, 0);
    snow.name = 'snow';   // <-- nome per escluderla dal raycast

    montain.add(snow);

    return montain;
}