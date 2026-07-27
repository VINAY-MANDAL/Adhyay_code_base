// pdf_viewer.js - Updated with Canvas Drawing Engine
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let currentScale = 1.0;
let pageRenderedStatus = {};
let currentFileName = "";
let currentCoverDataUrl = "";

// Tool State Management
let currentTool = 'select'; // 'select', 'pencil', 'marker', 'eraser'
let currentColor = '#E5A93C';
let isDrawing = false;

const viewportContainer = document.querySelector('.pdf-viewport');
const zoomSlider = document.getElementById('zoomSlider');
const zoomVal = document.getElementById('zoomVal');
const pageInput = document.getElementById('pageNumberInput');
const totalPagesSpan = document.getElementById('totalPages');

// Tool Selection Handlers
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const id = btn.id;
    if (id === 'toolSelect') currentTool = 'select';
    if (id === 'toolPencil') currentTool = 'pencil';
    if (id === 'toolMarker') currentTool = 'marker';
    if (id === 'toolEraser') currentTool = 'eraser';

    if (['toolSelect', 'toolPencil', 'toolMarker', 'toolEraser'].includes(id)) {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  });
});

document.getElementById('strokeColor')?.addEventListener('input', (e) => {
  currentColor = e.target.value;
});

async function renderPDFFile(arrayBuffer, fileName = "Document.pdf") {
  try {
    currentFileName = fileName;
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDoc = await loadingTask.promise;

    totalPagesSpan.textContent = pdfDoc.numPages;
    pageInput.max = pdfDoc.numPages;

    const firstPage = await pdfDoc.getPage(1);
    const sampleViewport = firstPage.getViewport({ scale: currentScale });
    
    const tempCanvas = document.createElement('canvas');
    const coverViewport = firstPage.getViewport({ scale: 0.5 });
    tempCanvas.width = coverViewport.width;
    tempCanvas.height = coverViewport.height;
    
    await firstPage.render({
      canvasContext: tempCanvas.getContext('2d'),
      viewport: coverViewport
    }).promise;

    currentCoverDataUrl = tempCanvas.toDataURL('image/jpeg');
    updatePDFProgress(1);

    viewportContainer.innerHTML = '';
    pageRenderedStatus = {};
    
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      createPageWrapper(pageNum, sampleViewport.width, sampleViewport.height);
    }

    setupIntersectionObserver();
    setupScrollPageTracker();

  } catch (error) {
    console.error("PDF Render Error:", error);
  }
}

function createPageWrapper(pageNum, width, height) {
  const wrapper = document.createElement('div');
  wrapper.id = `page-container-${pageNum}`;
  wrapper.className = 'pdf-page-wrapper';
  wrapper.setAttribute('data-page-number', pageNum);
  wrapper.style.width = `${width}px`;
  wrapper.style.minHeight = `${height}px`;
  wrapper.style.position = 'relative';
  wrapper.style.marginBottom = '25px';

  // PDF Page Canvas
  const canvas = document.createElement('canvas');
  canvas.id = `canvas-page-${pageNum}`;
  canvas.width = width;
  canvas.height = height;

  // Drawing Canvas Layer
  const drawCanvas = document.createElement('canvas');
  drawCanvas.className = 'drawing-layer';
  drawCanvas.id = `draw-layer-${pageNum}`;
  drawCanvas.width = width;
  drawCanvas.height = height;

  wrapper.appendChild(canvas);
  wrapper.appendChild(drawCanvas);
  viewportContainer.appendChild(wrapper);

  attachDrawingEvents(drawCanvas);
}

function attachDrawingEvents(canvas) {
  const ctx = canvas.getContext('2d');
  let lastX = 0;
  let lastY = 0;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDraw(e) {
    if (currentTool === 'select') return;
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
  }

  function draw(e) {
    if (!isDrawing || currentTool === 'select') return;
    e.preventDefault();
    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2 * currentScale;
      ctx.globalAlpha = 1.0;
    } else if (currentTool === 'marker') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 18 * currentScale;
      ctx.globalAlpha = 0.35; // Soft highlight effect
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 25 * currentScale;
    }

    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDraw() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', startDraw);
  canvas.addEventListener('touchmove', draw);
  canvas.addEventListener('touchend', stopDraw);
}

function setupIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
        if (!pageRenderedStatus[pageNum]) {
          pageRenderedStatus[pageNum] = true;
          renderSingleCanvas(pageNum);
        }
      }
    });
  }, {
    root: viewportContainer,
    rootMargin: '300px 0px 300px 0px',
    threshold: 0.1
  });

  document.querySelectorAll('.pdf-page-wrapper').forEach(wrapper => {
    observer.observe(wrapper);
  });
}

async function renderSingleCanvas(pageNum) {
  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentScale });

    const canvas = document.getElementById(`canvas-page-${pageNum}`);
    const drawCanvas = document.getElementById(`draw-layer-${pageNum}`);
    if (!canvas || !drawCanvas) return;

    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    drawCanvas.height = viewport.height;
    drawCanvas.width = viewport.width;

    const wrapper = document.getElementById(`page-container-${pageNum}`);
    if (wrapper) {
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.minHeight = `${viewport.height}px`;
    }

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
  } catch (err) {
    console.error(`Error rendering page ${pageNum}:`, err);
  }
}

function updatePDFProgress(currentPage) {
  if (!pdfDoc || typeof AdhyayStorage === 'undefined') return;
  const totalPages = pdfDoc.numPages;
  const progressPercent = Math.round((currentPage / totalPages) * 100);

  AdhyayStorage.saveFile({
    name: currentFileName,
    currentPage: currentPage,
    totalPages: totalPages,
    progress: progressPercent,
    coverImg: currentCoverDataUrl
  });
}

function setupScrollPageTracker() {
  viewportContainer.addEventListener('scroll', () => {
    const wrappers = document.querySelectorAll('.pdf-page-wrapper');
    let currentVisiblePage = 1;

    wrappers.forEach(wrapper => {
      const rect = wrapper.getBoundingClientRect();
      const containerRect = viewportContainer.getBoundingClientRect();
      
      if (rect.top <= containerRect.top + 200 && rect.bottom >= containerRect.top) {
        currentVisiblePage = wrapper.getAttribute('data-page-number');
      }
    });

    pageInput.value = currentVisiblePage;
    updatePDFProgress(currentVisiblePage);
  });
}

pageInput.addEventListener('change', (e) => {
  const pageNum = parseInt(e.target.value);
  if (pdfDoc && pageNum >= 1 && pageNum <= pdfDoc.numPages) {
    const targetWrapper = document.getElementById(`page-container-${pageNum}`);
    if (targetWrapper) targetWrapper.scrollIntoView({ behavior: 'smooth' });
  }
});

document.getElementById('prevPage').addEventListener('click', () => {
  const current = parseInt(pageInput.value);
  if (current > 1) {
    const target = document.getElementById(`page-container-${current - 1}`);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  const current = parseInt(pageInput.value);
  if (pdfDoc && current < pdfDoc.numPages) {
    const target = document.getElementById(`page-container-${current + 1}`);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }
});

zoomSlider.addEventListener('input', (e) => {
  const zoomPercent = e.target.value;
  zoomVal.textContent = `${zoomPercent}%`;
  currentScale = zoomPercent / 100;

  if (pdfDoc) {
    pageRenderedStatus = {};
    const currentScrollPage = pageInput.value;

    pdfDoc.getPage(1).then(page => {
      const sampleViewport = page.getViewport({ scale: currentScale });
      document.querySelectorAll('.pdf-page-wrapper').forEach(wrapper => {
        const pageNum = wrapper.getAttribute('data-page-number');
        wrapper.style.width = `${sampleViewport.width}px`;
        wrapper.style.minHeight = `${sampleViewport.height}px`;

        const canvas = document.getElementById(`canvas-page-${pageNum}`);
        const drawCanvas = document.getElementById(`draw-layer-${pageNum}`);
        if (canvas) {
          canvas.width = sampleViewport.width;
          canvas.height = sampleViewport.height;
        }
        if (drawCanvas) {
          drawCanvas.width = sampleViewport.width;
          drawCanvas.height = sampleViewport.height;
        }
      });

      const targetWrapper = document.getElementById(`page-container-${currentScrollPage}`);
      if (targetWrapper) targetWrapper.scrollIntoView();
      setupIntersectionObserver();
    });
  }
});