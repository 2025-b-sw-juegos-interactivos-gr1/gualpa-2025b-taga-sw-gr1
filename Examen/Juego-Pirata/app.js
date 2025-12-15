const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// Variables de estado del juego
let tesoroEnMano = false;
let tesorosEntregados = 0;
let inputMap = {};
let juegoActivo = true;
let tiempoRestante = 60; // 60 segundos = 1 minuto
const OBJETIVO_TESOROS = 10;

// Referencias a objetos del juego
let pirata = null;
let tesoro = null;
let barco = null;
let zonaEntrega = null;

const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;

    // === CÁMARA Y LUZ ===
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 3,
        25,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 15;
    camera.upperRadiusLimit = 40;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2.2;

    // Luz hemisférica (sol)
    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 1.2;

    // Luz direccional para sombras
    const dirLight = new BABYLON.DirectionalLight(
        "dirLight",
        new BABYLON.Vector3(-1, -2, -1),
        scene
    );
    dirLight.intensity = 0.5;

    // === MATERIALES ===
    
    // Material para el agua (suelo)
    const matAgua = new BABYLON.StandardMaterial("matAgua", scene);
    const aguaTexture = new BABYLON.Texture("assets/textures/agua.jpg", scene);
    aguaTexture.uScale = 5;
    aguaTexture.vScale = 5;
    matAgua.diffuseTexture = aguaTexture;
    matAgua.specularColor = new BABYLON.Color3(0.5, 0.8, 1);

    // Material para la arena
    const matArena = new BABYLON.StandardMaterial("matArena", scene);
    const arenaTexture = new BABYLON.Texture("assets/textures/arena.jpeg", scene);
    arenaTexture.uScale = 3;
    arenaTexture.vScale = 3;
    matArena.diffuseTexture = arenaTexture;

    // Material para zona de entrega (semitransparente)
    const matZona = new BABYLON.StandardMaterial("matZona", scene);
    matZona.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
    matZona.alpha = 0.4;
    matZona.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0);

    // === CREAR EL SUELO (AGUA) ===
    const agua = BABYLON.MeshBuilder.CreateGround(
        "agua",
        { width: 100, height: 100 },
        scene
    );
    agua.material = matAgua;
    agua.position.y = -2.5;

    // === CREAR ISLA (ARENA) ===
    const isla = BABYLON.MeshBuilder.CreateGround(
        "isla",
        { width: 40, height: 40 },
        scene
    );
    isla.material = matArena;
    isla.position.y = -1.3;

    // === SKYBOX (CIELO) ===
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 500 }, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    
    // Cargar texturas del cielo
    const skyTextures = [
        "assets/textures/cielo/cielo_px.jpg",
        "assets/textures/cielo/cielo_py.jpg",
        "assets/textures/cielo/cielo_pz.jpg",
        "assets/textures/cielo/cielo_nx.jpg",
        "assets/textures/cielo/cielo_ny.jpg",
        "assets/textures/cielo/cielo_nz.jpg"
    ];
    
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture.CreateFromImages(
        skyTextures,
        scene
    );
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;

    // === CARGAR MODELOS 3D ===

    // Cargar PIRATA (jugador)
    console.log("Cargando pirata...");
    const pirataData = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "assets/models/",
        "pirata.glb",
        scene
    );
    pirata = pirataData.meshes[0];
    pirata.position = new BABYLON.Vector3(0, 0, 0);
    pirata.scaling = new BABYLON.Vector3(2, 2, 2);
    
    // Detener todas las animaciones del pirata
    scene.stopAllAnimations();
    if (scene.animationGroups && scene.animationGroups.length > 0) {
        scene.animationGroups.forEach(animGroup => {
            animGroup.stop();
        });
    }

    // Cargar TESORO
    console.log("Cargando tesoro...");
    const tesoroData = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "assets/models/",
        "tesoro.glb",
        scene
    );
    tesoro = tesoroData.meshes[0];
    tesoro.position = new BABYLON.Vector3(10, 0.5, 10);
    tesoro.scaling = new BABYLON.Vector3(5, 5, 5);

    // Añadir rotación al tesoro para que brille
    scene.onBeforeRenderObservable.add(() => {
        if (!tesoroEnMano) {
            tesoro.rotation.y += 0.02;
        }
    });

    // Cargar BARCO PIRATA (zona de entrega)
    console.log("Cargando barco...");
    const barcoData = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "assets/models/",
        "barco.glb",
        scene
    );
    barco = barcoData.meshes[0];
    barco.position = new BABYLON.Vector3(-22, 0, -22);
    barco.scaling = new BABYLON.Vector3(15, 15, 15);
    barco.rotation.y = Math.PI / 4;

    // Crear zona de entrega visible cerca del barco
    zonaEntrega = BABYLON.MeshBuilder.CreateCylinder(
        "zonaEntrega",
        { height: 0.2, diameter: 6 },
        scene
    );
    zonaEntrega.material = matZona;
    zonaEntrega.position = new BABYLON.Vector3(-18, 0.1, -18);

    // Cargar algunas PALMERAS decorativas
    console.log("Cargando palmeras...");
    const posicionesPalmeras = [
        { x: 15, z: 5 },
        { x: -8, z: 15 },
        { x: 12, z: -10 },
        { x: -15, z: 8 }
    ];

    for (let pos of posicionesPalmeras) {
        const palmeraData = await BABYLON.SceneLoader.ImportMeshAsync(
            "",
            "assets/models/",
            "palmera.glb",
            scene
        );
        const palmera = palmeraData.meshes[0];
        palmera.position = new BABYLON.Vector3(pos.x, 0, pos.z);
        palmera.scaling = new BABYLON.Vector3(2.5, 2.5, 2.5);
    }

    console.log("¡Todos los modelos cargados!");

    // === MANEJO DE INPUT ===
    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyDownTrigger,
            function (evt) {
                inputMap[evt.sourceEvent.key.toLowerCase()] = true;
            }
        )
    );

    scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyUpTrigger,
            function (evt) {
                inputMap[evt.sourceEvent.key.toLowerCase()] = false;
            }
        )
    );

    // === LÓGICA DE RECOGER / ENTREGAR ===
    scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            if (kbInfo.event.key === " " && juegoActivo) {
                // BARRA ESPACIADORA

                if (!tesoroEnMano) {
                    // LÓGICA PARA RECOGER
                    let dist = BABYLON.Vector3.Distance(
                        pirata.position,
                        tesoro.position
                    );

                    if (dist < 5) {
                        console.log("¡Tesoro recogido! 💰");
                        tesoro.parent = pirata;
                        tesoro.position = new BABYLON.Vector3(0, 3, 0);
                        tesoro.rotation = BABYLON.Vector3.Zero();
                        tesoroEnMano = true;
                        actualizarUI();
                    }
                } else {
                    // LÓGICA PARA ENTREGAR
                    let dist = BABYLON.Vector3.Distance(
                        pirata.position,
                        barco.position
                    );

                    if (dist < 8) {
                        console.log("¡Tesoro entregado al barco! 🏴‍☠️");
                        tesoro.parent = null;
                        
                        // Crear nuevo tesoro en posición aleatoria
                        const randomX = Math.random() * 30 - 15;
                        const randomZ = Math.random() * 30 - 15;
                        tesoro.position = new BABYLON.Vector3(randomX, 0.5, randomZ);
                        tesoro.rotation = BABYLON.Vector3.Zero();
                        
                        tesoroEnMano = false;
                        tesorosEntregados++;
                        actualizarUI();

                        // Verificar si ganó
                        if (tesorosEntregados >= OBJETIVO_TESOROS) {
                            finalizarJuego(true);
                        }
                    }
                }
            }
        }
    });

    // === MOVIMIENTO DEL PIRATA ===
    const velocidad = 0.3;
    scene.onBeforeRenderObservable.add(() => {
        if (!juegoActivo) return; // No mover si el juego terminó

        let moviendo = false;
        let direccion = new BABYLON.Vector3(0, 0, 0);

        if (inputMap["w"]) {
            direccion.z += 1;
            moviendo = true;
        }
        if (inputMap["s"]) {
            direccion.z -= 1;
            moviendo = true;
        }
        if (inputMap["a"]) {
            direccion.x -= 1;
            moviendo = true;
        }
        if (inputMap["d"]) {
            direccion.x += 1;
            moviendo = true;
        }

        if (moviendo && pirata) {
            // Normalizar dirección
            if (direccion.length() > 0) {
                direccion.normalize();
            }

            // Mover pirata
            pirata.position.x += direccion.x * velocidad;
            pirata.position.z += direccion.z * velocidad;

            // Limitar movimiento a la isla
            const limiteIsla = 18;
            pirata.position.x = Math.max(
                -limiteIsla,
                Math.min(limiteIsla, pirata.position.x)
            );
            pirata.position.z = Math.max(
                -limiteIsla,
                Math.min(limiteIsla, pirata.position.z)
            );
        }

        // Hacer que la cámara siga al pirata
        if (pirata) {
            camera.target = pirata.position;
        }
    });

    return scene;
};

// === FUNCIÓN PARA ACTUALIZAR UI ===
function actualizarUI() {
    const statusDiv = document.getElementById("status");
    const scoreDiv = document.getElementById("score");
    const timerDiv = document.getElementById("timer");

    if (tesoroEnMano) {
        statusDiv.textContent = "Estado: ¡Lleva el tesoro al barco! 🏴‍☠️";
    } else {
        statusDiv.textContent = "Estado: Busca el tesoro 💰";
    }

    scoreDiv.textContent = `Tesoros entregados: ${tesorosEntregados}/${OBJETIVO_TESOROS}`;

    // Actualizar timer
    const minutos = Math.floor(tiempoRestante / 60);
    const segundos = tiempoRestante % 60;
    timerDiv.textContent = `Tiempo: ${minutos}:${segundos.toString().padStart(2, '0')}`;

    // Cambiar color del timer cuando queda poco tiempo
    if (tiempoRestante <= 10) {
        timerDiv.style.color = "#FF0000";
        timerDiv.style.fontSize = "24px";
    } else if (tiempoRestante <= 30) {
        timerDiv.style.color = "#FFA500";
    }
}

// === FUNCIÓN PARA FINALIZAR EL JUEGO ===
function finalizarJuego(gano) {
    juegoActivo = false;
    
    const gameOverDiv = document.getElementById("gameOver");
    const titleDiv = document.getElementById("gameOverTitle");
    const messageDiv = document.getElementById("gameOverMessage");
    const scoreDiv = document.getElementById("finalScore");

    if (gano) {
        titleDiv.textContent = "🏆 ¡VICTORIA! 🏆";
        titleDiv.style.color = "#FFD700";
        messageDiv.textContent = "¡Eres un verdadero pirata! Has completado la misión.";
        scoreDiv.textContent = `✨ ${tesorosEntregados}/${OBJETIVO_TESOROS} tesoros en ${60 - tiempoRestante} segundos ✨`;
    } else {
        titleDiv.textContent = "⏰ ¡TIEMPO AGOTADO! ⏰";
        titleDiv.style.color = "#FF4444";
        messageDiv.textContent = "Se acabó el tiempo. ¡Inténtalo de nuevo!";
        scoreDiv.textContent = `Tesoros conseguidos: ${tesorosEntregados}/${OBJETIVO_TESOROS}`;
    }

    gameOverDiv.style.display = "block";
}

// === TEMPORIZADOR DEL JUEGO ===
function iniciarTemporizador() {
    const intervalo = setInterval(() => {
        if (!juegoActivo) {
            clearInterval(intervalo);
            return;
        }

        tiempoRestante--;
        actualizarUI();

        if (tiempoRestante <= 0) {
            clearInterval(intervalo);
            finalizarJuego(false);
        }
    }, 1000);
}

// === INICIAR EL JUEGO ===
createScene().then((scene) => {
    engine.runRenderLoop(function () {
        scene.render();
    });

    window.addEventListener("resize", function () {
        engine.resize();
    });

    actualizarUI();
    iniciarTemporizador(); // Iniciar el contador de tiempo
});