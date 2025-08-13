// script/quiz_modal.js  (versión parcheada)
(function(){
  const modal = document.getElementById('recQuizModal');
  const steps = Array.from(document.querySelectorAll('.rec-step'));
  let cur = 0;

  window.openRecommendationQuiz = function() {
    modal && modal.classList.remove('hidden'); modal && modal.classList.add('flex');
    showStep(0);
    document.body.style.overflow = 'hidden';
  };

  window.closeRecommendationQuiz = function() {
    modal && modal.classList.add('hidden'); modal && modal.classList.remove('flex');
    document.body.style.overflow = '';
  };

  const prevBtn = document.getElementById('recPrevBtn');
  const nextBtn = document.getElementById('recNextBtn');
  const submitBtn = document.getElementById('recSubmitBtn');
  const form = document.getElementById('recQuizForm');

  function showStep(i) {
    cur = i;
    steps.forEach((s, idx) => idx === i ? s.classList.remove('hidden') : s.classList.add('hidden'));
    if (prevBtn) prevBtn.style.display = i === 0 ? 'none' : 'inline-block';
    if (nextBtn) nextBtn.style.display = i === steps.length - 1 ? 'none' : 'inline-block';
    if (submitBtn) submitBtn.classList.toggle('hidden', i !== steps.length - 1);
  }
  if (prevBtn) prevBtn.addEventListener('click', ()=> showStep(Math.max(0, cur - 1)));
  if (nextBtn) nextBtn.addEventListener('click', ()=> {
    if (cur === 0) {
      const v = document.getElementById('q_text_query')?.value?.trim();
      if (!v) showToast('Recomendado: escribe al menos una palabra clave para mejores resultados.');
    }
    showStep(Math.min(steps.length - 1, cur + 1));
  });

  // Garantía: si faltan elementos, no rompe; añade logs para depurar
  submitBtn && submitBtn.addEventListener('click', async ()=> {
    const answers = collectAnswers();
    saveAnswers(answers);

    try {
      showToast('Enviando respuestas al servidor...', 3000);
      const resp = await fetch('/api/quiz-result', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(answers),
        credentials: 'same-origin'
      });

      // Depuración: siempre volcar info a consola
      console.log('[quiz] fetch /api/quiz-result status=', resp.status);

      if (!resp.ok) {
        // intenta obtener detalle JSON si existe
        let text;
        try { text = await resp.text(); } catch(e){ text = '(no body)'; }
        showToast('Error del servidor. Revisa la consola.', 4000);
        console.error('Server error /api/quiz-result', resp.status, text);
        return;
      }

      const data = await resp.json();
      console.log('[quiz] server response:', data);

      // Guardar en localStorage (para persistencia)
      localStorage.setItem('rec_recommendations', JSON.stringify(data.recommendations || []));
      localStorage.setItem('rec_quiz_last', JSON.stringify(answers));
      showToast('Listo — mostrando recomendaciones...', 1200);
      closeRecommendationQuiz();

      // Asegurar contenedor y render inmediato (no depender de load)
      ensureRecommendationsContainer();
      renderRecommendationsIfPresent(data.recommendations || []);
      // Llevar foco/scroll a la sección de recomendaciones
      setTimeout(()=> {
        window.location.hash = '#recommendations';
        const c = document.getElementById('recommendations');
        if (c) c.scrollIntoView({behavior:'smooth', block:'start'});
      }, 300);

    } catch (err) {
      console.error('[quiz] network error', err);
      showToast('Error de red al enviar respuestas.', 4000);
    }
  });

  function collectAnswers() {
    const data = {};
    data.text_query = (document.getElementById('q_text_query')?.value || '').trim();
    data.interests = Array.from(form?.querySelectorAll('input[name="interests"]:checked') || []).map(i=>i.value);
    data.level = (document.getElementById('q_level')?.value || 'beginner');
    data.time_per_week = Number(document.getElementById('q_time_per_week')?.value || 0);
    data.preferred_language = (document.getElementById('q_preferred_language')?.value || 'no_importa');
    data.budget = (document.getElementById('q_budget')?.value || 'no_importa');
    data.learning_style = (form?.querySelector('input[name="learning_style"]:checked') || {value:'hands_on'}).value;
    data.wants_certificate = (form?.querySelector('input[name="wants_certificate"]:checked') || {value:'no'}).value;
    data.timestamp = new Date().toISOString();
    return data;
  }

  function saveAnswers(answers) {
    const key = 'rec_quiz_response_v1';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    prev.push(answers);
    localStorage.setItem(key, JSON.stringify(prev));
  }

  function showToast(msg, ms=2500) {
    const tcont = document.getElementById('recToast');
    if (!tcont) return alert(msg);
    tcont.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'px-4 py-2 rounded bg-black/80 text-white shadow-lg';
    el.textContent = msg;
    tcont.appendChild(el);
    tcont.classList.remove('hidden');
    setTimeout(()=> { tcont.classList.add('hidden'); tcont.innerHTML = ''; }, ms);
  }

  // crea el contenedor si no existe (fallback automático)
  function ensureRecommendationsContainer(){
    let container = document.getElementById('recommendations');
    if (!container) {
      container = document.createElement('section');
      container.id = 'recommendations';
      container.className = 'w-full max-w-5xl mx-auto my-8 px-4';
      // opcional: estilo básico para que se vea
      container.innerHTML = '';
      document.body.appendChild(container);
    }
    return container;
  }

  function renderRecommendationsIfPresent(recs){
    const container = ensureRecommendationsContainer();
    container.innerHTML = `<div class="p-6 bg-white/80 rounded-xl shadow-lg"><h3 class="text-xl font-bold mb-4">Recomendaciones personalizadas</h3><div id="recList" class="grid gap-4"></div></div>`;
    const recList = document.getElementById('recList');
    if (!recs || !recs.length) { recList.innerHTML = `<p class="text-gray-600">No hay recomendaciones.</p>`; return; }
    recList.innerHTML = '';
    recs.forEach(r => {
      const el = document.createElement('div');
      el.className = 'p-4 bg-white rounded-lg shadow-sm';
      el.innerHTML = `<a href="${r.link || '#'}" target="_blank" rel="noopener" class="block"><h4 class="text-lg font-semibold mb-1">${r.curso || r.title || 'Sin título'}</h4></a><p class="text-sm text-gray-700 mb-2">${(r.descripcion||'').slice(0,200)}${(r.descripcion||'').length>200?'...':''}</p><div class="flex items-center justify-between"><a href="${r.link || '#'}" target="_blank" class="text-indigo-600 font-medium">Ver curso</a><span class="text-xs text-gray-500">Score: ${r.score ? Number(r.score).toFixed(3) : '-'}</span></div>`;
      recList.appendChild(el);
    });
  }

  // Renderizar también cuando cambie el hash a #recommendations
  window.addEventListener('hashchange', ()=> {
    if (window.location.hash === '#recommendations') {
      const recs = JSON.parse(localStorage.getItem('rec_recommendations') || '[]');
      renderRecommendationsIfPresent(recs);
    }
  });

  // También al cargar la página (si la hash ya está)
  window.addEventListener('load', ()=> {
    if (window.location.hash === '#recommendations') {
      const recs = JSON.parse(localStorage.getItem('rec_recommendations') || '[]');
      if (recs.length) renderRecommendationsIfPresent(recs);
    }
  });

  window._recQuiz = { open: window.openRecommendationQuiz, close: window.closeRecommendationQuiz, collect: collectAnswers };

})();
