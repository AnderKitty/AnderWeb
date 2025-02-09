// Crear escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Configurar renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '-1';
document.body.insertBefore(renderer.domElement, document.body.firstChild);

// Posicionar cámara
camera.position.z = 50;

// Crear textura con glow
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Clase para los meteoros
class Meteor {
    constructor() {
        this.positions = [];
        this.maxTrailLength = 30;
        this.speed = Math.random() * 1 + 1;
        
        // Posición inicial en la esquina superior derecha
        this.x = Math.random() * 200 + 200;  // Entre 200 y 400 (derecha)
        this.y = Math.random() * 200 + 200;  // Entre 200 y 400 (arriba)
        this.z = Math.random() * 600 - 300;  // Profundidad aleatoria
        
        // Color aleatorio pastel
        const colors = [
            [1, 0.95, 0.6],    // Amarillo suave
            [1, 0.8, 0.9],     // Rosa pastel
            [0.7, 0.9, 1],     // Celeste suave
            [0.85, 0.7, 1],    // Violeta pastel
            [1, 0.6, 0.8]      // Rosa intenso
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        // Actualizar posición en diagonal
        this.y -= this.speed * 1.2;    // Movimiento hacia abajo más rápido
        this.x -= this.speed * 1.0;    // Movimiento hacia la izquierda más pronunciado
        
        // Agregar nueva posición al trail
        this.positions.unshift(new THREE.Vector3(this.x, this.y, this.z));
        
        // Mantener el largo del trail
        if (this.positions.length > this.maxTrailLength) {
            this.positions.pop();
        }
        
        // Reiniciar cuando sale de la pantalla
        if (this.y < -300 || this.x < -300) {
            this.reset();
        }
    }

    reset() {
        // Resetear a la esquina superior derecha
        this.x = Math.random() * 200 + 200;
        this.y = Math.random() * 200 + 200;
        this.z = Math.random() * 600 - 300;
        this.positions = [];
    }
}

// Crear meteoros
const meteors = [];
const numMeteors = 30;
for (let i = 0; i < numMeteors; i++) {
    meteors.push(new Meteor());
}

// Crear líneas para los trails
const trailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 1.0,    // Aumentado a máxima opacidad
    linewidth: 10    // Aumentado significativamente
});

// Crear estrellas de fondo
function createStars() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];

    for (let i = 0; i < 2000; i++) {
        vertices.push(
            Math.random() * 600 - 300,
            Math.random() * 600 - 300,
            Math.random() * 600 - 300
        );

        const random = Math.random();
        if (random < 0.15) {
            colors.push(1, 0.95, 0.6);
        } else if (random < 0.3) {
            colors.push(1, 0.8, 0.9);
        } else if (random < 0.45) {
            colors.push(0.7, 0.9, 1);
        } else if (random < 0.6) {
            colors.push(0.85, 0.7, 1);
        } else if (random < 0.75) {
            colors.push(1, 0.6, 0.8);
        } else {
            colors.push(0.9, 0.9, 1);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 8,
        map: createGlowTexture(),
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    return new THREE.Points(geometry, material);
}

const stars = createStars();
scene.add(stars);

// Crear planeta low poly
function createPlanet() {
    const planetGroup = new THREE.Group();
    
    // Crear el cuerpo de Saturno
    const geometry = new THREE.IcosahedronGeometry(30, 1);
    const material = new THREE.MeshPhongMaterial({
        color: 0xE4B784, // Color beige-dorado más realista de Saturno
        flatShading: true,
        shininess: 0.5,
        emissive: 0x996515, // Añade un sutil brillo dorado
        emissiveIntensity: 0.2
    });
    const planet = new THREE.Mesh(geometry, material);
    
    // Crear los anillos con material que brille por ambos lados
    const ringGeometry = new THREE.RingGeometry(45, 75, 64); // Ajustados para centrar mejor
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xC8B17C, // Color más dorado para los anillos
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    
    // Rotar los anillos para que se vean en perspectiva
    ring.rotation.x = Math.PI / 3;
    
    // Centrar mejor el planeta dentro de los anillos
    planet.position.set(0, 0, 0);
    ring.position.set(0, 0, 0);
    
    // Agrupar planeta y anillos
    planetGroup.add(planet);
    planetGroup.add(ring);
    
    // Posicionar el grupo completo
    planetGroup.position.set(-100, -50, -100);
    
    return planetGroup;
}

// Agregar iluminación para el planeta
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);

// Crear y agregar planeta a la escena
const planet = createPlanet();
scene.add(planet);

// Animación
function animate() {
    requestAnimationFrame(animate);
    
    meteors.forEach(meteor => {
        meteor.update();
        
        if (meteor.positions.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(meteor.positions);
            const colors = [];
            
            for (let i = 0; i < meteor.positions.length; i++) {
                const alpha = 1 - (i / meteor.positions.length);
                colors.push(
                    meteor.color[0] * alpha,
                    meteor.color[1] * alpha,
                    meteor.color[2] * alpha
                );
            }
            
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            const trail = new THREE.Line(geometry, trailMaterial);
            scene.add(trail);
            
            // Eliminar el trail inmediatamente después de renderizar
            requestAnimationFrame(() => {
                scene.remove(trail);
                geometry.dispose();
            });
        }
    });

    // Rotar Saturno y sus anillos
    planet.rotation.y += 0.002;
    planet.rotation.x += 0.001;

    stars.rotation.y += 0.0005;
    stars.rotation.x += 0.0002;
    renderer.render(scene, camera);
}

// Manejar resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Iniciar animación
animate();