// Mozilla PDF.js Worker Configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let currentScale = 1.0;
let pageRenderedStatus = {}; // Tracks kaunsa page render ho chuka hai
let pageViewports = {}; // Standard heights and widths

const viewportContainer = document.querySelector('.pdf-viewport');
const zoomSlider = document.getElementById('zoomSlider');
const zoomVal = document.getElementById('zoomVal');
const pageInput = document.getElementById('pageNumberInput');
const totalPagesSpan = document.getElementById('totalPages');

/**
 * Main PDF Load Function (Continuous Virtual Layout)
 */
async function renderPDFFile(arrayBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDoc = await loadingTask.promise;

    totalPagesSpan.textContent = pdfDoc.numPages;
    pageInput.max = pdfDoc.numPages;

    // Reset Container & Tracking
    viewportContainer.innerHTML = '';
    pageRenderedStatus = {};
    pageViewports = {};

    // Get First Page to estimate default dimensions
    const firstPage = await pdfDoc.getPage(1);
    const sampleViewport = firstPage.getViewport({ scale: currentScale });

    // 1. Create Lightweight Skeleton DIV Placeholders for ALL pages
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      createPageWrapper(pageNum, sampleViewport.width, sampleViewport.height);
    }

    // 2. Setup Intersection Observer (Lazy Loading Engine)
    setupIntersectionObserver();

    // 3. Setup Scroll Sync for Page Input UI
    setupScrollPageTracker();

  } catch (error) {
    console.error("PDF Continuous Virtual Render Error:", error);
  }
}

/**
 * Empty Skeleton DOM Elements Banayein
 */
function createPageWrapper(pageNum, width, height) {
  const wrapper = document.createElement('div');
  wrapper.id = `page-container-${pageNum}`;
  wrapper.className = 'pdf-page-wrapper';
  wrapper.setAttribute('data-page-number', pageNum);
  wrapper.style.width = `${width}px`;
  wrapper.style.minHeight = `${height}px`;
  wrapper.style.position = 'relative';
  wrapper.style.marginBottom = '25px';

  // Placeholder Canvas
  const canvas = document.createElement('canvas');
  canvas.id = `canvas-page-${pageNum}`;
  canvas.width = width;
  canvas.height = height;

  wrapper.appendChild(canvas);
  viewportContainer.appendChild(wrapper);
}

/**
 * Intersection Observer: Jab page screen par dikhne lage tabhi render karo
 */
function setupIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
        if (!pageRenderedStatus[pageNum]) {
          pageRenderedStatus[pageNum] = true; // Mark as rendering/rendered
          renderSingleCanvas(pageNum);
        }
      }
    });
  }, {
    root: viewportContainer,
    rootMargin: '300px 0px 300px 0px', // Pre-render 300px before scrolling into view
    threshold: 0.1
  });

  document.querySelectorAll('.pdf-page-wrapper').forEach(wrapper => {
    observer.observe(wrapper);
  });
}

/**
 * Single Canvas Render Logic
 */
async function renderSingleCanvas(pageNum) {
  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentScale });

    const canvas = document.getElementById(`canvas-page-${pageNum}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const wrapper = document.getElementById(`page-container-${pageNum}`);
    if (wrapper) {
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.minHeight = `${viewport.height}px`;
    }

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    await page.render(renderContext).promise;
  } catch (err) {
    console.error(`Error rendering page ${pageNum}:`, err);
  }
}

/**
 * Scroll par Page Number Input Box Update Karna
 */
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
  });
}

// Jump to specific page via Page Input Box
pageInput.addEventListener('change', (e) => {
  const pageNum = parseInt(e.target.value);
  if (pdfDoc && pageNum >= 1 && pageNum <= pdfDoc.numPages) {
    const targetWrapper = document.getElementById(`page-container-${pageNum}`);
    if (targetWrapper) {
      targetWrapper.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

// Next / Previous Buttons Scroll Support
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

// Real-time Zoom Slider Logic (Continuous View)
zoomSlider.addEventListener('input', (e) => {
  const zoomPercent = e.target.value;
  zoomVal.textContent = `${zoomPercent}%`;
  currentScale = zoomPercent / 100;

  if (pdfDoc) {
    pageRenderedStatus = {}; // Reset render status
    const currentScrollPage = pageInput.value;

    // Re-render all wrappers with new dimensions
    pdfDoc.getPage(1).then(page => {
      const sampleViewport = page.getViewport({ scale: currentScale });
      document.querySelectorAll('.pdf-page-wrapper').forEach(wrapper => {
        const pageNum = wrapper.getAttribute('data-page-number');
        wrapper.style.width = `${sampleViewport.width}px`;
        wrapper.style.minHeight = `${sampleViewport.height}px`;

        const canvas = document.getElementById(`canvas-page-${pageNum}`);
        if (canvas) {
          canvas.width = sampleViewport.width;
          canvas.height = sampleViewport.height;
        }
      });

      // Scroll to current visible page and trigger re-observe
      const targetWrapper = document.getElementById(`page-container-${currentScrollPage}`);
      if (targetWrapper) targetWrapper.scrollIntoView();
      setupIntersectionObserver();
    });
  }
});