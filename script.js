let unlocked = false;

function checkPassword() {
    const input = document.getElementById('pwd').value.trim();
    const correct = '2025';
    if(input === correct) {
        document.getElementById('password-screen').style.display='none';
        unlocked = true;
        initScene();
    } else {
        alert('Incorrect password.');
    }
}

function updateCountdown() {
    const weddingDate = new Date('2025-06-07T00:00:00');
    const now = new Date();
    const diff = weddingDate - now;
    if(diff <= 0) {
        document.getElementById('countdown').innerText = "The wedding day is here!";
        return;
    }
    const days = Math.floor(diff/(1000*60*60*24));
    const hours = Math.floor((diff%(1000*60*60*24))/(1000*60*60));
    const mins = Math.floor((diff%(1000*60*60))/ (1000*60));
    document.getElementById('countdown').innerText = `Countdown: ${days} days, ${hours} hrs, ${mins} min`;
}

async function fetchWeather() {
    const lat = 34.6145; 
    const lon = -120.1469; 
    const apiKey = 'YOUR_OPENWEATHER_API_KEY';
    try {
        const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`);
        if(!resp.ok) throw new Error('Weather fetch failed');
        const data = await resp.json();
        const desc = data.weather[0].description;
        const temp = Math.round(data.main.temp);
        document.getElementById('weather-info').innerText = `Santa Ynez Weather:\n${desc}, ${temp}°F`;
    } catch(e) {
        document.getElementById('weather-info').innerText = "Weather data unavailable.";
    }
}

let scene, camera, renderer;
let panels = [];
let lastTime = 0;
let mouseDown = false;
let startX = 0;
let startY = 0;
let targetRotationX = 0;
let targetRotationY = 0;
let rotationX = 0;
let rotationY = 0;
let panelTextures = [];

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,100);
    camera.position.set(0, 1.5, 5);
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff,0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff,0.5);
    dirLight.position.set(5,10,5);
    scene.add(dirLight);

    const loader = new THREE.TextureLoader();
    const bgTexture = loader.load('textures/background.jpg');
    scene.background = bgTexture;

    const gloader = new THREE.GLTFLoader();

gloader.load(
    // Path to the .gltf file
    'models/vineyard.gltf',
    function (gltf) {
        const vineyard = gltf.scene;

        // Scale and position the model (adjust as needed)
        vineyard.scale.set(0.5, 0.5, 0.5);
        vineyard.position.set(0, -0.5, -2);

        // Add the model to the scene
        scene.add(vineyard);
    },
    undefined,
    function (error) {
        console.error('An error occurred loading the GLTF model:', error);
    }
);

    createPanels();
    animate();

    document.getElementById('overlay').style.display='block';
    document.getElementById('instructions').style.display='block';

    updateCountdown();
    setInterval(updateCountdown, 60000);
    fetchWeather();

    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function createPanels() {
    const panelIds = ['panel-itinerary','panel-lodging','panel-attire','panel-location'];
    const panelPositions = [
        {x:-2, y:1.5, z:-3},
        {x:2, y:1.2, z:-2},
        {x:-1, y:2.0, z:-5},
        {x:1.5, y:1.0, z:-4}
    ];

    panelIds.forEach(id=>document.getElementById(id).classList.add('visible'));

    Promise.all(panelIds.map(id=>renderPanelToTexture(id))).then(textures=>{
        for(let i=0;i<textures.length;i++){
            const tex = textures[i];
            const mat = new THREE.MeshBasicMaterial({map: tex, transparent:true});
            const geo = new THREE.PlaneGeometry(1.5,1);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(panelPositions[i].x, panelPositions[i].y, panelPositions[i].z);
            scene.add(mesh);
            panels.push(mesh);
        }
    });
}

function renderPanelToTexture(panelId) {
    return new Promise((resolve)=>{
        const panelEl = document.getElementById(panelId);
        html2canvas(panelEl, {backgroundColor:null}).then(canvas=>{
            const tex = new THREE.CanvasTexture(canvas);
            resolve(tex);
        });
    });
}

function onResize() {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(e) {
    mouseDown = true;
    startX = e.clientX;
    startY = e.clientY;
}

function onMouseMove(e) {
    if(mouseDown) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
        startX = e.clientX;
        startY = e.clientY;
    }
}

function onMouseUp() {
    mouseDown = false;
}

function animate(time) {
    requestAnimationFrame(animate);
    const delta = time - lastTime;
    lastTime = time;

    rotationX += (targetRotationX - rotationX)*0.1;
    rotationY += (targetRotationY - rotationY)*0.1;

    rotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotationX));

    camera.position.x = Math.sin(rotationY)*5;
    camera.position.z = Math.cos(rotationY)*5;
    camera.position.y = 1.5 + rotationX;
    camera.lookAt(0,1.5,0);

    renderer.render(scene,camera);
}
