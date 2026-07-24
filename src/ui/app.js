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