// Translation Dictionary
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
    if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang] && translations[lang][key]) el.placeholder = translations[lang][key];
  });
}

// LocalStorage Helper
const AdhyayStorage = {
  getFiles: () => JSON.parse(localStorage.getItem('adhyay_recent_pdfs') || '[]'),
  
  saveFile: (fileData) => {
    let files = AdhyayStorage.getFiles();
    const existingIndex = files.findIndex(f => f.name === fileData.name);
    
    if (existingIndex > -1) {
      files[existingIndex] = { ...files[existingIndex], ...fileData };
    } else {
      files.unshift(fileData);
    }
    
    localStorage.setItem('adhyay_recent_pdfs', JSON.stringify(files.slice(0, 10)));
    renderDashboardUI();
  },

  toggleFavorite: (fileName) => {
    let files = AdhyayStorage.getFiles();
    const item = files.find(f => f.name === fileName);
    if (item) {
      item.isFavorite = !item.isFavorite;
      localStorage.setItem('adhyay_recent_pdfs', JSON.stringify(files));
      renderDashboardUI();
    }
  }
};

// View Controllers
function switchToReaderView() {
  const dashboardView = document.getElementById('dashboardView');
  const readerView = document.getElementById('readerView');

  if (dashboardView && readerView) {
    dashboardView.classList.add('hidden');
    readerView.classList.remove('hidden');
  }
}

function switchToDashboardView() {
  const dashboardView = document.getElementById('dashboardView');
  const readerView = document.getElementById('readerView');

  if (dashboardView && readerView) {
    readerView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    renderDashboardUI();
  }
}

function openPDFFromStorage(fileData) {
  switchToReaderView();
  const pageInput = document.getElementById('pageNumberInput');
  if (pageInput) pageInput.value = fileData.currentPage || 1;
}

// Render Home Dashboard
function renderDashboardUI() {
  const grid = document.getElementById('continueReadingGrid');
  const list = document.getElementById('recentFilesList');
  const files = AdhyayStorage.getFiles();

  if (!grid || !list) return;

  grid.innerHTML = '';
  list.innerHTML = '';

  if (files.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1;">Koi PDF nahi mili. Upload PDF button se add karein!</p>`;
    return;
  }

  files.forEach(file => {
    // Grid Card
    const card = document.createElement('div');
    card.className = 'pdf-card';
    if (file.coverImg) card.style.backgroundImage = `url(${file.coverImg})`;

    card.innerHTML = `
      <div class="card-top-bar">
        <span class="badge">${file.progress}%</span>
        <button class="star-btn ${file.isFavorite ? 'active' : ''}" data-name="${file.name}">
          <i class="fa-${file.isFavorite ? 'solid' : 'regular'} fa-star"></i>
        </button>
      </div>
      <div class="card-footer">
        <h4>${file.name}</h4>
        <p>Panna ${file.currentPage} / ${file.totalPages}</p>
      </div>
    `;

    const starBtn = card.querySelector('.star-btn');
    if (starBtn) {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AdhyayStorage.toggleFavorite(file.name);
      });
    }

    card.addEventListener('click', () => openPDFFromStorage(file));
    grid.appendChild(card);

    // List Row
    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <div class="file-info">
        <i class="fa-solid fa-file-pdf" style="color:var(--accent-color); font-size: 22px;"></i>
        <div>
          <h5>${file.name}</h5>
          <p>Total Pages: ${file.totalPages}</p>
        </div>
      </div>
      <span class="progress-text">${file.progress}%</span>
    `;

    row.addEventListener('click', () => openPDFFromStorage(file));
    list.appendChild(row);
  });
}

// Event Setup
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage('hi');

  // Home Navigation Buttons
  const navHome = document.getElementById('navHomeBtn');
  const sideHome = document.getElementById('sideHomeBtn');
  if (navHome) navHome.addEventListener('click', switchToDashboardView);
  if (sideHome) sideHome.addEventListener('click', switchToDashboardView);

  // Theme Switcher
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      themeBtn.querySelector('i').className = nextTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    });
  }

  // User Greeting Setup
  const modal = document.getElementById('nameModal');
  const nameInput = document.getElementById('usernameInput');
  const saveBtn = document.getElementById('saveNameBtn');
  const greeting = document.getElementById('userGreeting');
  const avatar = document.getElementById('userAvatar');

  const savedName = localStorage.getItem('adhyay_user_name');
  if (!savedName) {
    if (modal) modal.classList.remove('hidden');
  } else {
    if (modal) modal.classList.add('hidden');
    updateUserUI(savedName);
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (name) {
        localStorage.setItem('adhyay_user_name', name);
        updateUserUI(name);
        if (modal) modal.classList.add('hidden');
      }
    });
  }

  function updateUserUI(name) {
    if (greeting) greeting.textContent = `Namaste, ${name}`;
    if (avatar) avatar.textContent = name.substring(0, 2).toUpperCase();
  }

  // Upload Logic
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('pdfFileInput');

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file && file.type === 'application/pdf') {
        switchToReaderView();

        const reader = new FileReader();
        reader.onload = function(e) {
          renderPDFFile(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }

  renderDashboardUI();
});