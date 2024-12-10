// Inicializar el efecto tilt
VanillaTilt.init(document.querySelectorAll(".card"), {
    max: 17,
    speed: 400, 
    glare: true,
    "max-glare": 0.3,
    scale: 1.05
});

// Añadir efecto hover suave a las cards
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.querySelectorAll('img, h2, h3, p').forEach(element => {
            element.style.transform = 'translateZ(50px)';
        });
    });

    card.addEventListener('mouseleave', () => {
        card.querySelectorAll('img, h2, h3, p').forEach(element => {
            element.style.transform = 'translateZ(0px)';
        });
    });
});