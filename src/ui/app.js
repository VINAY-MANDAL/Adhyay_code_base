// Native C++ Core Module Loader (Electron Bridge)
// const { PDFEngine } = require('./build/Release/adhyay_core.node');
// const engine = new PDFEngine();

// i18n Translation Dictionary
const translations = {
  en: {
    nav_home: "Home",
    nav_library: "Library",
    nav_favorites: "Favorites",
    nav_shared: "Shared",
    upload_pdf: "Upload PDF",
    continue_reading: "Continue reading",
    recent_files: "Recent files",
    search_placeholder: "Search your files..."
  },
  hi: {
    nav_home: "Home",
    nav_library: "Library",
    nav_favorites: "Favorites",
    nav_shared: "Shared",
    upload_pdf: "Upload PDF",
    continue_reading: "Continue reading",
    recent_files: "Recent files",
    search_placeholder: "Apni files khoje..."
  }
};

let currentLang = 'hi';

function applyLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang][key]) el.placeholder = translations[lang][key];
  });
}

// Theme Switcher Logic
const themeBtn = document.getElementById('themeToggleBtn');
themeBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  themeBtn.querySelector('i').className = nextTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
});

// Dynamic Card Background Colors
document.querySelectorAll('.pdf-card').forEach(card => {
  const bg = card.getAttribute('data-bg');
  if (bg) card.style.backgroundColor = bg;
});

// Canvas Annotation Engine
class AnnotationEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.mode = 'pencil'; // pencil, marker, eraser
    this.color = '#E5A93C';
    this.lineWidth = 3;

    this.initEvents();
  }

  setMode(mode) { this.mode = mode; }
  setColor(color) { this.color = color; }
  setWidth(width) { this.lineWidth = width; }

  initEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
  }

  startDrawing(e) {
    this.isDrawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(e.offsetX, e.offsetY);
  }

  draw(e) {
    if (!this.isDrawing) return;

    if (this.mode === 'eraser') {
      this.ctx.clearRect(e.offsetX - 10, e.offsetY - 10, 20, 20);
    } else {
      this.ctx.strokeStyle = this.mode === 'marker' ? this.color + '80' : this.color; // Translucent for marker
      this.ctx.lineWidth = this.mode === 'marker' ? this.lineWidth * 4 : this.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineTo(e.offsetX, e.offsetY);
      this.ctx.stroke();
    }
  }

  stopDrawing() {
    this.isDrawing = false;
  }
}

// Initialize System
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage('hi');
  const annotator = new AnnotationEngine('annotationCanvas');

  // Bind tools
  document.getElementById('toolPencil').onclick = () => annotator.setMode('pencil');
  document.getElementById('toolMarker').onclick = () => annotator.setMode('marker');
  document.getElementById('toolEraser').onclick = () => annotator.setMode('eraser');
  document.getElementById('strokeColor').onchange = (e) => annotator.setColor(e.target.value);
  document.getElementById('strokeWidth').oninput = (e) => annotator.setWidth(e.target.value);
});


document.addEventListener('DOMContentLoaded', () => {
  // 1. DYNAMIC USER NAME & GREETING SYSTEM
  const modal = document.getElementById('nameModal');
  const nameInput = document.getElementById('usernameInput');
  const saveBtn = document.getElementById('saveNameBtn');
  const greeting = document.getElementById('userGreeting');
  const avatar = document.getElementById('userAvatar');

  // Check LocalStorage
  const savedName = localStorage.getItem('adhyay_user_name');

  if (!savedName) {
    modal.classList.remove('hidden');
  } else {
    modal.style.display = 'none';
    updateUserUI(savedName);
  }

  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) {
      localStorage.setItem('adhyay_user_name', name);
      updateUserUI(name);
      modal.style.display = 'none';
    }
  });

  function updateUserUI(name) {
    greeting.textContent = `Namaste, ${name}`;
    // Generate Initials (e.g., Gemini -> GE / G)
    const initials = name.substring(0, 2).toUpperCase();
    if(avatar) avatar.textContent = initials;
  }

  // 2. NATIVE FILE PICKER & PDF OPENING SYSTEM
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('pdfFileInput');
  const dashboardView = document.getElementById('dashboardView');
  const readerView = document.getElementById('readerView');

  // Trigger File Input Click
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle File Selection
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      console.log('Opening PDF File:', file.name, file.path);

      // Hide Dashboard, Show PDF Viewer View
      dashboardView.classList.add('hidden');
      readerView.classList.remove('hidden');

      // Call PDF Canvas Render function
      loadPDFToCanvas(file);
    }
  });

  function loadPDFToCanvas(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;


    //call pdf.js engine functionm from pdf_viewer.js
      renderPDFFile(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  }
});