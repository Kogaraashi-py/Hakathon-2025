// Configuración y variables globales
let allCourses = [];
let currentRecommendations = null;

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadAllCourses();
});

// Event Listeners
function initializeEventListeners() {
    const form = document.getElementById('recommendationForm');
    if (form) {
        form.addEventListener('submit', handleRecommendationSubmit);
    }
}

// Manejo del envío del formulario de recomendaciones
async function handleRecommendationSubmit(event) {
    event.preventDefault();
    
    const formData = {
        occupation: document.getElementById('occupation').value,
        experience_level: document.getElementById('experience').value,
        interests: document.getElementById('interests').value,
        user_id: document.getElementById('userId').value || null
    };
    
    // Validación básica
    if (!formData.occupation || !formData.interests || !formData.experience_level) {
        showNotification('Por favor completa todos los campos requeridos', 'error');
        return;
    }
    
    await getRecommendations(formData);
}

// Obtener recomendaciones del servidor
async function getRecommendations(formData) {
    showLoading(true);
    hideResults();
    
    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en el servidor');
        }
        
        const data = await response.json();
        currentRecommendations = data;
        
        displayRecommendations(data);
        showNotification('¡Recomendaciones generadas exitosamente!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification(`Error al obtener recomendaciones: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Mostrar todas las categorías de cursos
async function showAllCourses() {
    showLoading(true);
    hideResults();
    
    try {
        if (allCourses.length === 0) {
            await loadAllCourses();
        }
        
        displayAllCourses(allCourses);
        showNotification('Catálogo completo cargado', 'info');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar el catálogo', 'error');
    } finally {
        showLoading(false);
    }
}

// Cargar todos los cursos desde el servidor
async function loadAllCourses() {
    try {
        const response = await fetch('/api/courses');
        if (!response.ok) {
            throw new Error('Error al cargar cursos');
        }
        allCourses = await response.json();
    } catch (error) {
        console.error('Error cargando cursos:', error);
        throw error;
    }
}

// Filtrar por categoría específica
async function filterByCategory(category) {
    showLoading(true);
    hideResults();
    
    try {
        if (allCourses.length === 0) {
            await loadAllCourses();
        }
        
        const filteredCourses = allCourses.filter(course => course.category === category);
        displayFilteredCourses(filteredCourses, category);
        showNotification(`Mostrando cursos de ${category}`, 'info');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al filtrar cursos', 'error');
    } finally {
        showLoading(false);
    }
}

// Mostrar recomendaciones
function displayRecommendations(data) {
    // Mostrar secciones relevantes
    document.getElementById('contentBasedSection').classList.remove('hidden');
    document.getElementById('collaborativeSection').classList.toggle('hidden', !data.collaborative || data.collaborative.length === 0);
    document.getElementById('catalogSection').classList.add('hidden');
    
    // Mostrar recomendaciones basadas en contenido
    if (data.content_based && data.content_based.length > 0) {
        displayCourseGrid('contentBasedResults', data.content_based, 'content');
    }
    
    // Mostrar recomendaciones colaborativas si existen
    if (data.collaborative && data.collaborative.length > 0) {
        displayCourseGrid('collaborativeResults', data.collaborative, 'collaborative');
    }
    
    showResults();
}

// Mostrar todos los cursos
function displayAllCourses(courses) {
    document.getElementById('contentBasedSection').classList.add('hidden');
    document.getElementById('collaborativeSection').classList.add('hidden');
    document.getElementById('catalogSection').classList.remove('hidden');
    
    displayCourseGrid('catalogResults', courses, 'catalog');
    showResults();
}

// Mostrar cursos filtrados por categoría
function displayFilteredCourses(courses, category) {
    document.getElementById('contentBasedSection').classList.add('hidden');
    document.getElementById('collaborativeSection').classList.add('hidden');
    document.getElementById('catalogSection').classList.remove('hidden');
    
    // Actualizar título de la sección
    const titleElement = document.querySelector('#catalogSection h3');
    titleElement.innerHTML = `📖 Cursos de ${category}`;
    
    displayCourseGrid('catalogResults', courses, 'filtered');
    showResults();
}

// Crear grid de cursos
function displayCourseGrid(containerId, courses, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!courses || courses.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">🤔</div>
                <h4 class="text-xl font-semibold text-gray-600 mb-2">No se encontraron cursos</h4>
                <p class="text-gray-500">Intenta ajustar tus criterios de búsqueda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(course => createCourseCard(course, type)).join('');
    
    // Agregar animación de entrada con delay
    const cards = container.querySelectorAll('.course-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate-slide-up');
    });
}

// Crear tarjeta de curso individual
function createCourseCard(course, type) {
    const categoryColors = {
        'Energía': 'from-green-500 to-emerald-600',
        'IA': 'from-blue-500 to-indigo-600',
        'Tecnología': 'from-purple-500 to-violet-600'
    };
    
    const levelIcons = {
        'Principiante': '🌱',
        'Intermedio': '🚀',
        'Avanzado': '⭐'
    };
    
    const categoryColor = categoryColors[course.category] || 'from-gray-500 to-gray-600';
    const levelIcon = levelIcons[course.level] || '📚';
    
    // Información específica según el tipo
    let scoreInfo = '';
    let scoreClass = '';
    
    if (type === 'content' && course.similarity_score !== undefined) {
        const percentage = Math.round(course.similarity_score * 100);
        scoreInfo = `
            <div class="flex items-center space-x-2 text-sm">
                <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span class="text-purple-700 font-semibold">Similitud: ${percentage}%</span>
            </div>
        `;
        scoreClass = 'border-l-4 border-purple-500';
    } else if (type === 'collaborative' && course.predicted_rating !== undefined) {
        const stars = '★'.repeat(Math.round(course.predicted_rating));
        scoreInfo = `
            <div class="flex items-center space-x-2 text-sm">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-green-700 font-semibold">Predicción: ${course.predicted_rating}/5</span>
            </div>
        `;
        scoreClass = 'border-l-4 border-green-500';
    }
    
    return `
        <div class="course-card bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${scoreClass}">
            <!-- Header con gradiente -->
            <div class="bg-gradient-to-r ${categoryColor} p-4 text-white">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">${course.category}</span>
                    <div class="flex items-center space-x-1">
                        <span class="text-yellow-300">⭐</span>
                        <span class="text-sm font-bold">${course.rating}</span>
                    </div>
                </div>
                <h4 class="font-bold text-lg leading-tight">${course.title}</h4>
            </div>
            
            <!-- Contenido -->
            <div class="p-6 space-y-4">
                <!-- Meta información -->
                <div class="flex flex-wrap gap-2">
                    <span class="inline-flex items-center space-x-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                        <span>${levelIcon}</span>
                        <span>${course.level}</span>
                    </span>
                    <span class="inline-flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                        <span>⏱️</span>
                        <span>${course.duration_hours}h</span>
                    </span>
                </div>
                
                <!-- Descripción -->
                <p class="text-gray-600 text-sm leading-relaxed line-clamp-3">${course.description}</p>
                
                <!-- Habilidades -->
                ${course.skills ? `
                    <div class="space-y-2">
                        <h5 class="text-xs font-semibold text-gray-700 uppercase tracking-wider">Habilidades</h5>
                        <div class="flex flex-wrap gap-1">
                            ${course.skills.split(', ').slice(0, 3).map(skill => 
                                `<span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">${skill.trim()}</span>`
                            ).join('')}
                            ${course.skills.split(', ').length > 3 ? '<span class="text-gray-500 text-xs">...</span>' : ''}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Score información -->
                ${scoreInfo}
            </div>
            
            <!-- Footer con acción -->
            <div class="px-6 pb-6">
                <button onclick="showCourseDetails(${course.course_id})" 
                        class="w-full bg-gradient-to-r ${categoryColor} text-white py-3 rounded-lg font-semibold hover:opacity-90 transform hover:scale-105 transition-all duration-200">
                    Ver Detalles
                </button>
            </div>
        </div>
    `;
}

// Mostrar detalles del curso
function showCourseDetails(courseId) {
    const course = allCourses.find(c => c.course_id === courseId) || 
                   (currentRecommendations?.content_based?.find(c => c.course_id === courseId)) ||
                   (currentRecommendations?.collaborative?.find(c => c.course_id === courseId));
    
    if (!course) {
        showNotification('No se pudo cargar la información del curso', 'error');
        return;
    }
    
    // Crear modal con detalles
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="closeModal(event)">
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="p-8">
                    <div class="flex justify-between items-start mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 pr-4">${course.title}</h2>
                        <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                    </div>
                    
                    <div class="space-y-6">
                        <div class="flex flex-wrap gap-3">
                            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                ${course.category}
                            </span>
                            <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                ${course.level}
                            </span>
                            <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                ${course.duration_hours} horas
                            </span>
                            <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                ⭐ ${course.rating}
                            </span>
                        </div>
                        
                        <div>
                            <h3 class="font-semibold text-gray-800 mb-2">Descripción</h3>
                            <p class="text-gray-600 leading-relaxed">${course.description}</p>
                        </div>
                        
                        ${course.skills ? `
                            <div>
                                <h3 class="font-semibold text-gray-800 mb-3">Habilidades que desarrollarás</h3>
                                <div class="flex flex-wrap gap-2">
                                    ${course.skills.split(', ').map(skill => 
                                        `<span class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">${skill.trim()}</span>`
                                    ).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="pt-4 border-t">
                            <button onclick="enrollCourse(${course.course_id})" 
                                    class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200">
                                📚 Inscribirse al Curso
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Cerrar modal
function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
        modal.remove();
    }
}

// Simular inscripción a curso
function enrollCourse(courseId) {
    showNotification('¡Funcionalidad de inscripción próximamente!', 'info');
    closeModal();
}

// Utilidades para mostrar/ocultar elementos
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

function showResults() {
    const results = document.getElementById('results');
    if (results) {
        results.classList.remove('hidden');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function hideResults() {
    const results = document.getElementById('results');
    if (results) {
        results.classList.add('hidden');
    }
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    const icons = {
        success: '✓',
        error: '✗',
        info: 'ℹ',
        warning: '⚠'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <span class="text-xl">${icons[type]}</span>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Utility para truncar texto
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Agregar estilos CSS adicionales al cargar
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .course-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .course-card:hover {
            transform: translateY(-8px);
        }
        
        @media (prefers-reduced-motion: reduce) {
            .course-card:hover {
                transform: none;
            }
        }
    `;
    document.head.appendChild(style);
    
});