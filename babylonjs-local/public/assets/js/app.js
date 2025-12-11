window.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('renderCanvas');
    var engine = new BABYLON.Engine(canvas, true);

    var createScene = function () {
        var scene = new BABYLON.Scene(engine);

        var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -15), scene);
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(canvas, true);

        var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.9;

        // Textura de madera para la caja
        var woodMat = new BABYLON.StandardMaterial("woodMat", scene);
        woodMat.diffuseTexture = new BABYLON.Texture("./assets/textures/madera.jpg", scene);

        var box = BABYLON.MeshBuilder.CreateBox("box", {size: 2}, scene);
        box.position = new BABYLON.Vector3(-4, 1, 0);
        box.material = woodMat;

        // Textura de mármol para la esfera
        var marbleMat = new BABYLON.StandardMaterial("marbleMat", scene);
        marbleMat.diffuseTexture = new BABYLON.Texture("./assets/textures/marmol.jpg", scene);

        var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 2}, scene);
        sphere.position = new BABYLON.Vector3(-1.5, 1, 0);
        sphere.material = marbleMat;

        // Textura metálica para el cilindro
        var metalMat = new BABYLON.StandardMaterial("metalMat", scene);
        metalMat.diffuseTexture = new BABYLON.Texture("./assets/textures/metal.jpg", scene);

        var cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", {height: 2, diameter: 1.5}, scene);
        cylinder.position = new BABYLON.Vector3(1.5, 1, 0);
        cylinder.material = metalMat;

        // Textura de ladrillo para el torus
        var brickMat = new BABYLON.StandardMaterial("brickMat", scene);
        brickMat.diffuseTexture = new BABYLON.Texture("./assets/textures/ladrillo.jpg", scene);

        var torus = BABYLON.MeshBuilder.CreateTorus("torus", {diameter: 2, thickness: 0.5}, scene);
        torus.position = new BABYLON.Vector3(4, 1, 0);
        torus.material = brickMat;

        // Textura de césped para el suelo
        var groundMat = new BABYLON.StandardMaterial("groundMat", scene);
        groundMat.diffuseTexture = new BABYLON.Texture("./assets/textures/cesped.jpg", scene);

        var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 12, height: 12}, scene);
        ground.material = groundMat;

        BABYLON.SceneLoader.ImportMeshAsync(null, "./assets/models/", "Yeti.gltf", scene).then((result) => {
        const meshes = result.meshes;
        if (meshes && meshes.length) {
            meshes[0].scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
            console.log('Yeti cargado desde assets/models/Yeti.gltf');
        }
        }).catch((err) => {
            console.error('No se pudo cargar el modelo Yeti desde assets/models/Yeti.gltf:', err);
        });

        return scene;
    };

    var scene = createScene();
    engine.runRenderLoop(function () {
        scene.render();
    });

    window.addEventListener('resize', function () {
        engine.resize();
    });
});
 