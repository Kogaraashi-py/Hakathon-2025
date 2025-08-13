class SENARecommendationApp {
        constructor() {
            this.interests = [];
            this.apiBase = "C:\Users\kevin\Downloads\iar_6_dataset_2_recomendador.csv";
            this.init();
        }

        init() {
            this.setupEventListeners();
            this.checkSystemStatus();
            this.loadRegions();
        }

        setupEventListeners() {
            // Form submission
            document.getElementById('recommendation-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.searchRecommendations();
            });

            // Interests input
            const interestsInput = document.getElementById('interests-input');
            interestsInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addInterest(e.target.value);
                    e.target.value = '';
                }
            });

            interestsInput.addEventListener('blur', (e) => {
                if (e.target.value.trim()) {
                    this.addInterest(e.target.value);
                    e.target.value = '';
                }
            });

            // Buttons
            document.getElementById('new-search-btn').addEventListener('click', () => {
                this.resetForm();
            });

            document.getElementById('retry-btn').addEventListener('click', () => {
                this.hideError();
                this.checkSystemStatus();
            });
        }

        async checkSystemStatus() {
            try {
                const response = await fetch(`${this.apiBase}/api/status`);
                const data = await response.json();
                
                const indicator = document.getElementById('status-indicator');
                if (data.status === 'ok') {
                    indicator.innerHTML = `
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="text-sm text-green-600">Sistema listo (${data.total_courses} cursos)</span>
                    `;
                } else {
                    throw new Error('Sistema no disponible');
                }
            } catch (error) {
                const indicator = document.getElementById('status-indicator');
                indicator.innerHTML = `
                    <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span class="text-sm text-red-600">Sistema no disponible</span>
                `;
                console.error('Error checking status:', error);
            }
        }

        async loadRegions() {
            try {
                const response = await fetch(`${this.apiBase}/api/regions`);
                const data = await response.json();
                
                const select = document.getElementById('region-select');
                data.regions.forEach(region => {
                    const option = document.createElement('option');
                    option.value = region;
                    option.textContent = region;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading regions:', error);
            }
        }

        addInterest(text) {
            const interests = text.split(',').map(i => i.trim()).filter(i => i);
            
            interests.forEach(interest => {
                if (!this.interests.includes(interest) && interest.length > 2) {
                    this.interests.push(interest);
                    this.renderInterestTag(interest);
                }
            });
        }

        renderInterestTag(interest) {
            const tagsContainer = document.getElementById('interests-tags');
            
            const tag = document.createElement('span');
            tag.className = 'bg-sena-blue text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2 animate-fade-in';
            tag.innerHTML = `
                <span>${interest}</span>
                <button onclick="this.parentElement.remove(); app.removeInterest('${interest}')" class="ml-2 text-white hover:text-red-200">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            tagsContainer.appendChild(tag);
        }

        removeInterest(interest) {
            this.interests = this.interests.filter(i => i !== interest);
        }

        async searchRecommendations() {
            if (this.interests.length === 0) {
                this.showError('Por favor, agrega al menos un interés para buscar recomendaciones.');
                return;
            }

            this.showLoading();

            try {
                const region = document.getElementById('region-select').value;
                const numRecommendations = parseInt(document.getElementById('num-recommendations').value);

                const requestData = {
                    interests: this.interests,
                    region: region || null,
                    num_recommendations: numRecommendations
                };

                const response = await fetch(`${this.apiBase}/api/recommend`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    this.showResults(data.recommendations);
                } else {
                    throw new Error(data.error || 'Error desconocido');
                }

            } catch (error) {
                console.error('Search error:', error);
                this.showError(`Error al buscar recomendaciones: ${error.message}`);
            }
        }

        showLoading() {
            document.getElementById('loading-section').classList.remove('hidden');
            document.getElementById('results-section').classList.add('hidden');
            document.getElementById('error-section').classList.add('hidden');
            document.getElementById('search-btn').disabled = true;
        }

        hideLoading() {
            document.getElementById('loading-section').classList.add('hidden');
            document.getElementById('search-btn').disabled = false;
        }

        showResults(recommendations) {
            this.hideLoading();
            
            const resultsSection = document.getElementById('results-section');
            const container = document.getElementById('recommendations-container');
            const countElement = document.getElementById('results-count');
            
            // Update count
            countElement.textContent = `${recommendations.length} resultado${recommendations.length !== 1 ? 's' : ''}`;
            
            // Clear previous results
            container.innerHTML = '';
            
            if (recommendations.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-search text-gray-400 text-3xl"></i>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-600 mb-2">No se encontraron cursos</h3>
                        <p class="text-gray-500">Intenta con otros intereses o amplía la búsqueda sin filtro de región</p>
                    </div>
                `;
            } else {
                recommendations.forEach((rec, index) => {
                    const courseCard = this.createCourseCard(rec, index + 1);
                    container.appendChild(courseCard);
                });
            }
            
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }

        createCourseCard(recommendation, position) {
            const course = recommendation.course;
            const similarity = (recommendation.similarity * 100).toFixed(1);
            
            const card = document.createElement('div');
            card.className = 'bg-gradient-to-r from-white to-blue-50 rounded-xl p-6 border-l-4 border-sena-orange hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1';
            
            // Determine similarity color
            let similarityColor = 'text-red-500';
            if (similarity >= 70) similarityColor = 'text-green-500';
            else if (similarity >= 50) similarityColor = 'text-yellow-500';
            
            // Create description preview
            let description = course.description || 'Descripción no disponible';
            if (description.length > 200) {
                description = description.substring(0, 200) + '...';
            }

            card.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-sena-blue text-white rounded-full flex items-center justify-center font-bold text-lg">
                            ${position}
                        </div>
                        <div>
                            <span class="text-sm text-gray-500">Coincidencia</span>
                            <div class="font-bold ${similarityColor}">${similarity}%</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="bg-sena-green text-white text-xs px-2 py-1 rounded-full">
                            ${course.area || 'Sin categoría'}
                        </span>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h4 class="text-xl font-bold text-gray-800 mb-2 leading-tight">
                        <i class="fas fa-book text-sena-orange mr-2"></i>
                        ${course.name || 'Curso sin nombre'}
                    </h4>
                    <p class="text-gray-600 leading-relaxed">${description}</p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-4 text-sm">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-map-marker-alt text-sena-green"></i>
                        <span class="text-gray-700">
                            <strong>Región:</strong> ${course.region || 'No especificada'}
                        </span>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-clock text-sena-orange"></i>
                        <span class="text-gray-700">
                            <strong>Duración:</strong> ${course.duration || 'No especificada'}
                        </span>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-graduation-cap text-sena-blue"></i>
                        <span class="text-gray-700">
                            <strong>Nivel:</strong> ${course.level || 'No especificado'}
                        </span>
                    </div>
                </div>
                
                <div class="mt-6 pt-4 border-t border-gray-200">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">
                            <i class="fas fa-lightbulb mr-1"></i>
                            Recomendado para tus intereses
                        </div>
                        <button 
                            onclick="app.showCourseDetails(${recommendation.index})"
                            class="bg-sena-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200"
                        >
                            <i class="fas fa-info-circle mr-1"></i>
                            Ver detalles
                        </button>
                    </div>
                </div>
            `;
            
            return card;
        }

        async showCourseDetails(courseIndex) {
            try {
                const response = await fetch(`${this.apiBase}/api/course/${courseIndex}`);
                const data = await response.json();
                
                if (data.course) {
                    this.showModal(data.course);
                }
            } catch (error) {
                console.error('Error loading course details:', error);
                this.showError('Error al cargar detalles del curso');
            }
        }

        showModal(course) {
            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in';
            
            modal.innerHTML = `
                <div class="bg-white rounded-2xl max-w-2xl w-full max-h-90vh overflow-y-auto animate-slide-up">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-2xl font-bold text-gray-800">Detalles del Curso</h3>
                            <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <h4 class="font-bold text-lg text-sena-blue mb-2">
                                    <i class="fas fa-book mr-2"></i>
                                    ${course.name || 'Curso sin nombre'}
                                </h4>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Descripción:</label>
                                <p class="text-gray-600 leading-relaxed">${course.description || 'No disponible'}</p>
                            </div>
                            
                            <div class="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                                        <i class="fas fa-tag text-sena-green mr-1"></i>
                                        Área:
                                    </label>
                                    <p class="text-gray-600">${course.area || 'No especificada'}</p>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                                        <i class="fas fa-map-marker-alt text-sena-orange mr-1"></i>
                                        Región:
                                    </label>
                                    <p class="text-gray-600">${course.region || 'No especificada'}</p>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                                        <i class="fas fa-clock text-sena-blue mr-1"></i>
                                        Duración:
                                    </label>
                                    <p class="text-gray-600">${course.duration || 'No especificada'}</p>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                                        <i class="fas fa-graduation-cap text-sena-green mr-1"></i>
                                        Nivel:
                                    </label>
                                    <p class="text-gray-600">${course.level || 'No especificado'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-8 flex justify-end space-x-4">
                            <button 
                                onclick="this.closest('.fixed').remove()" 
                                class="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors duration-200"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close modal when clicking overlay
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        showError(message) {
            this.hideLoading();
            
            const errorSection = document.getElementById('error-section');
            const errorMessage = document.getElementById('error-message');
            
            errorMessage.textContent = message;
            errorSection.classList.remove('hidden');
            errorSection.scrollIntoView({ behavior: 'smooth' });
        }

        hideError() {
            document.getElementById('error-section').classList.add('hidden');
        }

        resetForm() {
            this.interests = [];
            document.getElementById('interests-tags').innerHTML = '';
            document.getElementById('interests-input').value = '';
            document.getElementById('region-select').value = '';
            document.getElementById('num-recommendations').value = '5';
            
            document.getElementById('results-section').classList.add('hidden');
            document.getElementById('error-section').classList.add('hidden');
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Initialize app
    const app = new SENARecommendationApp();

    // Add some sample interests for demo
    setTimeout(() => {
        const sampleInterests = ['programación', 'tecnología'];
        sampleInterests.forEach(interest => {
            app.addInterest(interest);
        });
    }, 1000);