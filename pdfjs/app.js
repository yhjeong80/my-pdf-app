// Full viewer with thumbnails + search using PDF.js via CDN
(function(){
  const urlParams = new URLSearchParams(location.search);
  const fileParam = urlParams.get('file') || '../your.pdf';

  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const pageNumInput = document.getElementById('page-num');
  const pageCountSpan = document.getElementById('page-count');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const fitWidthBtn = document.getElementById('fit-width');
  const zoomSpan = document.getElementById('zoom');
  const status = document.getElementById('status');
  const sidebar = document.getElementById('sidebar');
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');

  const searchInput = document.getElementById('search-input');
  const searchPrevBtn = document.getElementById('search-prev');
  const searchNextBtn = document.getElementById('search-next');
  const thumbs = document.getElementById('thumbs');

  let pdfDoc = null, pageNum = 1, scale = 1.0, rendering = false, pending = null;
  let pageTexts = []; // cache text per page
  let searchHits = []; // list of page numbers containing the term
  let hitIndex = -1;

  const toast = (t)=>{ status.textContent = t; status.classList.add('show'); setTimeout(()=>status.classList.remove('show'), 900); };

  const renderPage = num => {
    rendering = true;
    pdfDoc.getPage(num).then(page => {
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      const renderContext = { canvasContext: ctx, viewport, transform: [dpr, 0, 0, dpr, 0, 0] };
      const renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        rendering = false;
        if (pending !== null) { renderPage(pending); pending = null; }
      });
      pageNumInput.value = num;
      zoomSpan.textContent = Math.round(scale*100) + '%';
    });
  };

  const queueRenderPage = num => {
    if (rendering) pending = num; else renderPage(num);
  };

  const showPage = n => {
    if (n < 1 || n > pdfDoc.numPages) return;
    pageNum = n;
    queueRenderPage(pageNum);
    document.querySelectorAll('.thumb.active').forEach(e=>e.classList.remove('active'));
    const active = document.querySelector(`.thumb[data-page="${n}"]`);
    if (active) { active.classList.add('active'); active.scrollIntoView({block:'nearest'}); }
  };

  const fitWidth = () => {
    const container = document.getElementById('viewer-wrap');
    const w = container.clientWidth - 16;
    pdfDoc.getPage(pageNum).then(page => {
      const v = page.getViewport({ scale: 1 });
      scale = Math.max(0.2, Math.min(5, w / v.width));
      queueRenderPage(pageNum);
    });
  };

  // Build thumbnails
  const buildThumbnails = () => {
    thumbs.innerHTML = '';
    for (let i=1; i<=pdfDoc.numPages; i++) {
      const c = document.createElement('div');
      c.className = 'thumb'; c.dataset.page = String(i);
      const tcanvas = document.createElement('canvas');
      const label = document.createElement('div'); label.className='label'; label.textContent = i + ' 페이지';
      c.appendChild(tcanvas); c.appendChild(label);
      thumbs.appendChild(c);

      pdfDoc.getPage(i).then(page=>{
        const scale = 0.2;
        const v = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        tcanvas.width = v.width * dpr;
        tcanvas.height = v.height * dpr;
        tcanvas.style.width = (v.width) + 'px';
        tcanvas.style.height = (v.height) + 'px';
        const tctx = tcanvas.getContext('2d');
        page.render({ canvasContext: tctx, viewport: v, transform: [dpr,0,0,dpr,0,0] });
      });

      c.addEventListener('click', ()=> showPage(i));
    }
  };

  // Preload text content for search (lazy)
  const ensurePageText = (n) => {
    if (pageTexts[n]) return Promise.resolve(pageTexts[n]);
    return pdfDoc.getPage(n).then(p => p.getTextContent()).then(tc => {
      pageTexts[n] = tc.items.map(i=>i.str).join(' ');
      return pageTexts[n];
    });
  };

  const doSearch = async (term, forward=true) => {
    if (!term) return;
    if (!searchHits.length) {
      // build hits list
      searchHits = [];
      for (let i=1;i<=pdfDoc.numPages;i++){
        const txt = await ensurePageText(i);
        if (txt.toLowerCase().includes(term.toLowerCase())) searchHits.push(i);
      }
      hitIndex = -1;
      if (!searchHits.length) { toast('검색 결과 없음'); return; }
    }
    if (forward) hitIndex = (hitIndex + 1) % searchHits.length;
    else hitIndex = (hitIndex - 1 + searchHits.length) % searchHits.length;
    const target = searchHits[hitIndex];
    showPage(target);
    toast(`${searchHits.indexOf(target)+1}/${searchHits.length} 결과 · ${target}페이지`);
  };

  // Load PDF
  pdfjsLib.getDocument(fileParam).promise.then(pdf => {
    pdfDoc = pdf;
    pageCountSpan.textContent = pdfDoc.numPages;
    buildThumbnails();
    if (location.hash.includes('zoom=page-width')) fitWidth(); else renderPage(pageNum);
  }).catch(err => {
    console.error('PDF load error:', err);
    document.getElementById('viewer-wrap').innerHTML = '<div style="padding:1rem;color:#c00">PDF를 불러올 수 없습니다.<br>'+String(err)+'</div>';
  });

  // Controls
  prevBtn.addEventListener('click', () => showPage(pageNum - 1));
  nextBtn.addEventListener('click', () => showPage(pageNum + 1));
  pageNumInput.addEventListener('change', () => showPage(parseInt(pageNumInput.value || '1',10)));
  zoomInBtn.addEventListener('click', () => { scale = Math.min(scale * 1.2, 5); queueRenderPage(pageNum); });
  zoomOutBtn.addEventListener('click', () => { scale = Math.max(scale / 1.2, 0.2); queueRenderPage(pageNum); });
  fitWidthBtn.addEventListener('click', fitWidth);
  toggleSidebarBtn.addEventListener('click', ()=> sidebar.classList.toggle('hidden'));

  searchNextBtn.addEventListener('click', ()=> doSearch(searchInput.value, true));
  searchPrevBtn.addEventListener('click', ()=> doSearch(searchInput.value, false));
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(searchInput.value, true); });

  window.addEventListener('resize', () => {
    if (location.hash.includes('zoom=page-width')) fitWidth();
  });
})();