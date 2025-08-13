// script/quiz_modal.js  (versión corregida)
(function(){
  const modal = document.getElementById('recQuizModal');
  const steps = Array.from(document.querySelectorAll('.rec-step'));
  let cur = 0;

  window.openRecommendationQuiz = function() {
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      showStep(0);
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeRecommendationQuiz = function() {
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  };

  const prevBtn = document.getElementById('recPrevBtn');
  const nextBtn = document.getElementById('recNextBtn');
  const submitBtn = document.getElementById('recSubmitBtn');
  const form = document.getElementById('recQuizForm');

  function showStep(i) {
    cur = i;
    steps.forEach((s, idx) => {
      if (idx === i) {
        s.classList.remove('hidden');
      } else {
        s.classList.add('hidden');
      }
    });
    
    if (prevBtn) prevBtn.style.display = i === 0 ? 'none' : 'inline-block';
    if (nextBtn) nextBtn.style.display = i === steps.length - 1 ? 'none' : 'inline-block';
    if (submitBtn) submitBtn.classList.toggle('hidden', i !== steps.length - 1);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      showStep(Math.max(0, cur - 1));
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (cur === 0) {
        const v = document.getElementById('q_text_query')?.value?.trim();
        if (!v) {
          showToast('Recomendado: escribe al menos una palabra clave para mejores resultados.');
        }
      }
      showStep(Math.min(steps.length - 1, cur + 1));
    });
  }

  // Event listener para el botón submit
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const answers = collectAnswers();
      saveAnswers(answers);

      try {
        showToast('Enviando respuestas al servidor...', 3000);
        const resp = await fetch('/api/quiz-result', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(answers),
          credentials: 'same-origin'
        });

        // Depuración: siempre volcar info a consola
        console.log('[quiz] fetch /api/quiz-result status=', resp.status);

        if (!resp.ok) {
          // intenta obtener detalle JSON si existe
          let text;
          try { 
            text = await resp.text(); 
          } catch(e) { 
            text = '(no body)'; 
          }
          showToast('Error del servidor. Revisa la consola.', 4000);
          console.error('Server error /api/quiz-result', resp.status, text);
          return;
        }

        const data = await resp.json();
        console.log('[quiz] server response:', data);

        // Guardar en memoria (simulación de persistencia para demo)
        const recommendations = data.recommendations || [];
        
        showToast('Listo — mostrando recomendaciones...', 1200);
        closeRecommendationQuiz();

        // Asegurar contenedor y render inmediato
        ensureRecommendationsContainer();
        renderRecommendationsIfPresent(recommendations);
        
        // Llevar foco/scroll a la sección de recomendaciones (al final de la página)
        setTimeout(() => {
          window.location.hash = '#recommendations';
          const container = document.getElementById('recommendations');
          if (container) {
            // Scroll al final de la página donde está la sección
            const offsetTop = container.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({
              top: offsetTop,
              behavior: 'smooth'
            });
          }
        }, 800);

      } catch (err) {
        console.error('[quiz] network error', err);
        showToast('Error de red al enviar respuestas.', 4000);
        
        // Fallback: mostrar recomendaciones de ejemplo si hay error de red
        const mockRecommendations = generateMockRecommendations(answers);
        ensureRecommendationsContainer();
        renderRecommendationsIfPresent(mockRecommendations);
        closeRecommendationQuiz();
        setTimeout(() => {
          window.location.hash = '#recommendations';
          const container = document.getElementById('recommendations');
          if (container) {
            container.scrollIntoView({behavior: 'smooth', block: 'start'});
          }
        }, 300);
      }
    });
  }

  function collectAnswers() {
    const data = {};
    data.text_query = (document.getElementById('q_text_query')?.value || '').trim();
    data.interests = Array.from(form?.querySelectorAll('input[name="interests"]:checked') || []).map(i => i.value);
    data.level = (document.getElementById('q_level')?.value || 'beginner');
    data.time_per_week = Number(document.getElementById('q_time_per_week')?.value || 0);
    data.preferred_language = (document.getElementById('q_preferred_language')?.value || 'no_importa');
    data.budget = (document.getElementById('q_budget')?.value || 'no_importa');
    data.learning_style = (form?.querySelector('input[name="learning_style"]:checked') || {value: 'hands_on'}).value;
    data.wants_certificate = (form?.querySelector('input[name="wants_certificate"]:checked') || {value: 'no'}).value;
    data.timestamp = new Date().toISOString();
    return data;
  }

  function saveAnswers(answers) {
    // Para demo, solo guardamos en memoria
    window._lastQuizAnswers = answers;
    console.log('Quiz answers saved:', answers);
  }

  function showToast(msg, ms = 2500) {
    const tcont = document.getElementById('recToast');
    if (!tcont) {
      alert(msg);
      return;
    }
    
    tcont.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'px-4 py-2 rounded bg-black/80 text-white shadow-lg';
    el.textContent = msg;
    tcont.appendChild(el);
    tcont.classList.remove('hidden');
    
    setTimeout(() => {
      tcont.classList.add('hidden');
      tcont.innerHTML = '';
    }, ms);
  }

  // Usar el contenedor existente en el HTML
  function ensureRecommendationsContainer() {
    let container = document.getElementById('recommendations');
    if (!container) {
      // Fallback: crear si no existe (pero normalmente ya está en el HTML)
      container = document.createElement('section');
      container.id = 'recommendations';
      container.className = 'w-full max-w-5xl mx-auto my-8 px-4';
      document.body.appendChild(container);
      console.warn('Contenedor de recomendaciones no encontrado, creando uno nuevo');
    }
    // Asegurar que esté visible
    container.style.display = 'block';
    return container;
  }

  function renderRecommendationsIfPresent(recs) {
    const container = ensureRecommendationsContainer();
    
    if (!recs || !recs.length) {
      container.innerHTML = `
        <div class="bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">
          <div class="text-center">
            <h3 class="text-2xl font-bold text-white mb-4">🤔 No hay recomendaciones disponibles</h3>
            <p class="text-gray-400 mb-6">Intenta completar el cuestionario nuevamente o verifica tu conexión.</p>
            <button onclick="openRecommendationQuiz()" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all">
              🔄 Hacer quiz nuevamente
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Galería fija estilo más sólido y menos flotante
    container.innerHTML = `
      <div class="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
        <!-- Header de la galería -->
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-2xl font-bold text-white mb-1">🎯 Tus Cursos Recomendados</h3>
              <p class="text-purple-100">${recs.length} cursos seleccionados para ti</p>
            </div>
            <button onclick="openRecommendationQuiz()" class="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-all">
              🔄 Nuevo Quiz
            </button>
          </div>
        </div>
        
        <!-- Grid de cursos -->
        <div class="p-6">
          <div id="recList" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
        </div>
      </div>
    `;

    const recList = document.getElementById('recList');
    recList.innerHTML = '';
    
    recs.forEach((r, index) => {
      const el = document.createElement('div');
      el.className = 'bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500 transition-all duration-300 overflow-hidden group cursor-pointer';
      el.onclick = () => window.open(r.link || '#', '_blank', 'noopener,noreferrer');
      
      el.innerHTML = `
        <!-- Imagen/Icono del curso -->
        <div class="relative h-32 bg-gradient-to-br ${getGradientForIndex(index)} flex items-center justify-center">
          <span class="text-3xl text-white drop-shadow-lg">${getIconForCourse(r.curso || r.title)}</span>
          <div class="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-1">
            <span class="text-white text-xs font-medium">${r.score ? Number(r.score).toFixed(1) : '✨'}</span>
          </div>
        </div>
        
        <!-- Contenido del curso -->
        <div class="p-4 space-y-3">
          <h4 class="text-white font-semibold text-sm leading-tight group-hover:text-purple-400 transition-colors">
            ${(r.curso || r.title || 'Curso Recomendado').length > 50 ? 
              (r.curso || r.title || 'Curso Recomendado').substring(0, 50) + '...' : 
              (r.curso || r.title || 'Curso Recomendado')}
          </h4>
          
          <p class="text-gray-400 text-xs leading-relaxed">
            ${(r.descripcion || r.description || 'Descripción no disponible').substring(0, 80)}${(r.descripcion || r.description || '').length > 80 ? '...' : ''}
          </p>
          
          <!-- Footer de la card -->
          <div class="flex items-center justify-between pt-2 border-t border-gray-700">
            <div class="flex items-center space-x-1">
              <span class="text-yellow-400 text-xs">⭐</span>
              <span class="text-gray-300 text-xs">${(Math.random() * 0.4 + 4.5).toFixed(1)}</span>
            </div>
            <span class="text-purple-400 text-xs font-medium group-hover:underline">Ver →</span>
          </div>
          
          ${r.platform ? `<div class="absolute bottom-2 left-2 bg-purple-600/20 text-purple-300 px-2 py-1 rounded text-xs">${r.platform}</div>` : ''}
        </div>
      `;
      
      recList.appendChild(el);
    });
    
    // Guardar las recomendaciones para acceso posterior
    window._lastRecommendations = recs;
  }

  // Función para generar recomendaciones de ejemplo en caso de error
  function generateMockRecommendations(answers) {
    const mockCourses = [
      {
        curso: "Python para Principiantes",
        descripcion: "Aprende Python desde cero con ejemplos prácticos y proyectos reales.",
        link: "https://www.udemy.com/course/python-bootcamp/",
        score: 0.95,
        platform: "Udemy"
      },
      {
        curso: "Desarrollo Web Full Stack",
        descripcion: "Domina HTML, CSS, JavaScript, React y Node.js para crear aplicaciones completas.",
        link: "https://www.udemy.com/course/the-complete-web-development-bootcamp/",
        score: 0.92,
        platform: "Udemy"
      },
      {
        curso: "Machine Learning con Python",
        descripcion: "Introducción práctica al aprendizaje automático usando Python y scikit-learn.",
        link: "https://www.coursera.org/learn/machine-learning-python",
        score: 0.88,
        platform: "Coursera"
      }
    ];

    // Filtrar basado en las respuestas del usuario
    return mockCourses.filter(course => {
      if (answers.text_query) {
        const query = answers.text_query.toLowerCase();
        return course.curso.toLowerCase().includes(query) || 
               course.descripcion.toLowerCase().includes(query);
      }
      return true;
    }).slice(0, 3);
  }

  // Función para obtener gradientes basados en el índice
  function getGradientForIndex(index) {
    const gradients = [
      'from-purple-400 via-pink-500 to-red-500',
      'from-blue-400 via-purple-500 to-pink-500',
      'from-green-400 via-blue-500 to-purple-500',
      'from-yellow-400 via-orange-500 to-red-500',
      'from-pink-400 via-purple-500 to-indigo-500',
      'from-teal-400 via-cyan-500 to-blue-500'
    ];
    return gradients[index % gradients.length];
  }

  // Función para obtener iconos basados en el título del curso
  function getIconForCourse(title) {
    if (!title) return '📚';
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('python')) return '🐍';
    if (titleLower.includes('web') || titleLower.includes('html') || titleLower.includes('css')) return '🌐';
    if (titleLower.includes('react') || titleLower.includes('javascript')) return '⚛️';
    if (titleLower.includes('machine learning') || titleLower.includes('ai') || titleLower.includes('ml')) return '🤖';
    if (titleLower.includes('data') || titleLower.includes('analytics')) return '📊';
    if (titleLower.includes('cloud') || titleLower.includes('aws') || titleLower.includes('azure')) return '☁️';
    if (titleLower.includes('mobile') || titleLower.includes('android') || titleLower.includes('ios')) return '📱';
    if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux')) return '🎨';
    
    return '📚';
  }

  // Renderizar cuando cambie el hash a #recommendations
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#recommendations') {
      const lastRecommendations = window._lastRecommendations;
      if (lastRecommendations && lastRecommendations.length) {
        renderRecommendationsIfPresent(lastRecommendations);
      }
    }
  });

  // También al cargar la página
  window.addEventListener('load', () => {
    if (window.location.hash === '#recommendations') {
      const lastRecommendations = window._lastRecommendations;
      if (lastRecommendations && lastRecommendations.length) {
        renderRecommendationsIfPresent(lastRecommendations);
      }
    }
  });

  // Exponer funciones públicas
  window._recQuiz = {
    open: window.openRecommendationQuiz,
    close: window.closeRecommendationQuiz,
    collect: collectAnswers
  };

})();