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

    stars.rotation.y += 0.0005;
    stars.rotation.x += 0.0002;
    renderer.render(scene, camera);
}function animate() {
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