// Mozilla PDF.js Worker Configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let currentScale = 1.0;
let currentPage = 1;
let pageRendering = false;
let pageNumPending = null;

// UI DOM Elements
const canvas = document.getElementById('pdfCanvas');
const annotCanvas = document.getElementById('annotationCanvas');
const ctx = canvas.getContext('2d');
const zoomSlider = document.getElementById('zoomSlider');
const zoomVal = document.getElementById('zoomVal');
const pageInput = document.getElementById('pageNumberInput');
const totalPagesSpan = document.getElementById('totalPages');

/**
 * Main PDF Load Function (Instant Load for Heavy PDFs)
 */
async function renderPDFFile(arrayBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDoc = await loadingTask.promise;

    // Set Total Pages in UI
    totalPagesSpan.textContent = pdfDoc.numPages;
    pageInput.max = pdfDoc.numPages;
    currentPage = 1;

    // Render First Page Instantly
    renderPage(currentPage);
  } catch (error) {
    console.error("PDF Render Error:", error);
  }
}

/**
 * Single Page Fast Render Logic
 */
async function renderPage(num) {
  pageRendering = true;
  pageInput.value = num;

  const page = await pdfDoc.getPage(num);
  
  // Calculate Fit-To-Screen Scale automatically if scale is default
  const viewport = page.getViewport({ scale: currentScale });

  // Resize Canvases
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  annotCanvas.height = viewport.height;
  annotCanvas.width = viewport.width;

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };

  const renderTask = page.render(renderContext);

  try {
    await renderTask.promise;
    pageRendering = false;

    if (pageNumPending !== null) {
      renderPage(pageNumPending);
      pageNumPending = null;
    }
  } catch (err) {
    console.error("Page Render Error:", err);
  }
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

// Next / Previous Navigation Controls
document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage <= 1) return;
  currentPage--;
  queueRenderPage(currentPage);
});

document.getElementById('nextPage').addEventListener('click', () => {
  if (pdfDoc && currentPage >= pdfDoc.numPages) return;
  currentPage++;
  queueRenderPage(currentPage);
});

// Jump to specific page via input box
pageInput.addEventListener('change', (e) => {
  const val = parseInt(e.target.value);
  if (pdfDoc && val >= 1 && val <= pdfDoc.numPages) {
    currentPage = val;
    queueRenderPage(currentPage);
  }
});

// Real-time Responsive Zoom Slider Logic
zoomSlider.addEventListener('input', (e) => {
  const zoomPercent = e.target.value;
  zoomVal.textContent = `${zoomPercent}%`;
  currentScale = zoomPercent / 100;
  
  if (pdfDoc) {
    queueRenderPage(currentPage);
  }
});