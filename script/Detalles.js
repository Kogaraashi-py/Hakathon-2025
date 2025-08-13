// Dataset de ejemplo (puedes reemplazar esto con tu archivo JSON)
const dataset = {
    "recomendados": [
        {
            "nombre": "JavaScript Moderno - ES6+",
            "descripcion": "Aprende las características más recientes de JavaScript incluyendo ES6, ES7, ES8 y más. Domina async/await, destructuring, arrow functions y módulos.",
            "link": "https://ejemplo.com/javascript-moderno"
        },
        {
            "nombre": "React para Principiantes",
            "descripcion": "Curso completo de React desde cero. Aprende componentes, hooks, estado, props y crea aplicaciones web modernas y dinámicas.",
            "link": "https://ejemplo.com/react-principiantes"
        },
        {
            "nombre": "Node.js y Express",
            "descripcion": "Desarrolla APIs RESTful y aplicaciones backend robustas con Node.js y Express. Incluye autenticación, bases de datos y despliegue.",
            "link": "https://ejemplo.com/nodejs-express"
        },
        {
            "nombre": "Python para Data Science",
            "descripcion": "Domina Python para análisis de datos con pandas, numpy, matplotlib y seaborn. Incluye machine learning básico con scikit-learn.",
            "link": "https://ejemplo.com/python-datascience"
        },
        {
            "nombre": "CSS Grid y Flexbox",
            "descripcion": "Maestría completa en layouts modernos con CSS. Aprende Grid, Flexbox y técnicas avanzadas de diseño responsive.",
            "link": "https://ejemplo.com/css-grid-flexbox"
        },
        {
            "nombre": "Vue.js 3 Composition API",
            "descripcion": "Framework progresivo de JavaScript. Aprende Vue 3, Composition API, Vuex, Vue Router y crea SPAs profesionales.",
            "link": "https://ejemplo.com/vuejs-3"
        },
        {
            "nombre": "Docker y Containerización",
            "descripcion": "Aprende a containerizar aplicaciones con Docker. Incluye Docker Compose, orquestación básica y mejores prácticas.",
            "link": "https://ejemplo.com/docker-containers"
        },
        {
            "nombre": "MongoDB y Bases de Datos NoSQL",
            "descripcion": "Base de datos NoSQL más popular. Aprende modelado de datos, agregaciones, indexación y integración con aplicaciones.",
            "link": "https://ejemplo.com/mongodb-nosql"
        }
    ]
};

// Almacenar calificaciones en memoria (en una app real usarías una base de datos)
let calificaciones = {};

// Función para crear las estrellas
function crearEstrellas(cursoId, calificacionActual = 0) {
    let estrellas = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= calificacionActual ? 'filled' : 'empty';
        estrellas += `
            <svg class="star ${filled} w-6 h-6 inline-block" 
                    data-curso="${cursoId}" 
                    data-rating="${i}" 
                    fill="currentColor" 
                    viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
        `;
    }
    return estrellas;
}

// Función para crear un card de curso
function crearCardCurso(curso, index) {
    const cursoId = `curso-${index}`;
    const calificacionActual = calificaciones[cursoId] || 0;
    
    return `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden card-hover" data-rating="${calificacionActual}">
            <div class="p-6">
                <!-- Header del curso -->
                <div class="mb-4">
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${curso.nombre}</h3>
                    <div class="flex items-center justify-between mb-3">
                        <div class="rating-container">
                            ${crearEstrellas(cursoId, calificacionActual)}
                        </div>
                        ${calificacionActual > 0 ? `<span class="text-sm text-gray-500">(${calificacionActual}/5)</span>` : '<span class="text-sm text-gray-400">Sin calificar</span>'}
                    </div>
                </div>
                
                <!-- Descripción -->
                <p class="text-gray-600 text-sm mb-6 line-clamp-3">${curso.descripcion}</p>
                
                <!-- Acciones -->
                <div class="flex gap-3">
                    <a href="${curso.link}" 
                        target="_blank"
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg transition-colors font-medium">
                        Ver Curso
                    </a>
                    <button onclick="limpiarCalificacion('${cursoId}')" 
                            class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm">
                        Reset
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Función para renderizar todos los cursos
function renderizarCursos(cursosFiltrados = dataset.recomendados) {
    const container = document.getElementById('cursosContainer');
    container.innerHTML = cursosFiltrados.map((curso, index) => crearCardCurso(curso, index)).join('');
    
    // Agregar event listeners para las estrellas
    document.querySelectorAll('.star').forEach(estrella => {
        estrella.addEventListener('click', function() {
            const cursoId = this.dataset.curso;
            const rating = parseInt(this.dataset.rating);
            calificarCurso(cursoId, rating);
        });
        
        // Efecto hover para las estrellas
        estrella.addEventListener('mouseenter', function() {
            const cursoId = this.dataset.curso;
            const rating = parseInt(this.dataset.rating);
            mostrarPreviewCalificacion(cursoId, rating);
        });
    });
    
    // Event listener para restaurar las estrellas originales cuando el mouse sale
    document.querySelectorAll('.rating-container').forEach(container => {
        container.addEventListener('mouseleave', function() {
            const estrellas = container.querySelectorAll('.star');
            const cursoId = estrellas[0].dataset.curso;
            const calificacionActual = calificaciones[cursoId] || 0;
            actualizarEstrellas(cursoId, calificacionActual);
        });
    });
    
    actualizarEstadisticas();
}

// Función para mostrar preview de calificación
function mostrarPreviewCalificacion(cursoId, rating) {
    actualizarEstrellas(cursoId, rating);
}

// Función para actualizar las estrellas visualmente
function actualizarEstrellas(cursoId, rating) {
    const estrellas = document.querySelectorAll(`[data-curso="${cursoId}"]`);
    estrellas.forEach((estrella, index) => {
        if (index + 1 <= rating) {
            estrella.classList.remove('empty');
            estrella.classList.add('filled');
        } else {
            estrella.classList.remove('filled');
            estrella.classList.add('empty');
        }
    });
}

// Función para calificar un curso
function calificarCurso(cursoId, rating) {
    calificaciones[cursoId] = rating;
    actualizarEstrellas(cursoId, rating);
    
    // Actualizar el texto de calificación
    const card = document.querySelector(`[data-curso="${cursoId}"]`).closest('.card-hover');
    const ratingText = card.querySelector('.rating-container').nextElementSibling;
    ratingText.textContent = `(${rating}/5)`;
    ratingText.classList.remove('text-gray-400');
    ratingText.classList.add('text-gray-500');
    
    // Actualizar el data-rating del card para filtros
    card.setAttribute('data-rating', rating);
    
    actualizarEstadisticas();
}

// Función para limpiar calificación
function limpiarCalificacion(cursoId) {
    delete calificaciones[cursoId];
    actualizarEstrellas(cursoId, 0);
    
    // Actualizar el texto de calificación
    const card = document.querySelector(`[data-curso="${cursoId}"]`).closest('.card-hover');
    const ratingText = card.querySelector('.rating-container').nextElementSibling;
    ratingText.textContent = 'Sin calificar';
    ratingText.classList.remove('text-gray-500');
    ratingText.classList.add('text-gray-400');
    
    // Actualizar el data-rating del card
    card.setAttribute('data-rating', '0');
    
    actualizarEstadisticas();
}

// Función para actualizar estadísticas
function actualizarEstadisticas() {
    const totalCursos = dataset.recomendados.length;
    const cursosCalificados = Object.keys(calificaciones).length;
    const sumaCalificaciones = Object.values(calificaciones).reduce((sum, rating) => sum + rating, 0);
    const promedioCalificacion = cursosCalificados > 0 ? (sumaCalificaciones / cursosCalificados).toFixed(1) : 0;
    
    document.getElementById('totalCursos').textContent = totalCursos;
    document.getElementById('cursosCalificados').textContent = cursosCalificados;
    document.getElementById('promedioCalificacion').textContent = promedioCalificacion;
}

// Función para filtrar cursos
function filtrarCursos() {
    const filtroRating = document.getElementById('ratingFilter').value;
    
    if (!filtroRating) {
        renderizarCursos();
        return;
    }
    
    const minRating = parseInt(filtroRating);
    const cards = document.querySelectorAll('.card-hover');
    
    cards.forEach(card => {
        const cardRating = parseInt(card.getAttribute('data-rating'));
        if (cardRating >= minRating) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Event listeners
document.getElementById('ratingFilter').addEventListener('change', filtrarCursos);
document.getElementById('resetFilter').addEventListener('click', () => {
    document.getElementById('ratingFilter').value = '';
    renderizarCursos();
});

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    renderizarCursos();
});