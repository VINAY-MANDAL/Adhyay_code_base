// IndexedDB Engine for Full Offline PDF Storage
const PDFStore = {
  dbName: 'AdhyayPDFDB',
  init: function() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('pdfs', { keyPath: 'name' });
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e);
    });
  },
  savePDF: async function(name, buffer) {
    try {
      const db = await this.init();
      const tx = db.transaction('pdfs', 'readwrite');
      tx.objectStore('pdfs').put({ name, buffer });
    } catch (err) {
      console.error("PDF IndexedDB me save nahi ho saki:", err);
    }
  },
  getPDF: async function(name) {
    try {
      const db = await this.init();
      return new Promise((resolve) => {
        const tx = db.transaction('pdfs', 'readonly');
        const req = tx.objectStore('pdfs').get(name);
        req.onsuccess = () => resolve(req.result ? req.result.buffer : null);
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      return null;
    }
  },
  deletePDF: async function(name) {
    try {
      const db = await this.init();
      const tx = db.transaction('pdfs', 'readwrite');
      tx.objectStore('pdfs').delete(name);
    } catch (err) {
      console.error("PDF delete nahi ho saki:", err);
    }
  }
};

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

// LocalStorage Helper with Trash Management
const AdhyayStorage = {
  getFiles: () => JSON.parse(localStorage.getItem('adhyay_recent_pdfs') || '[]'),
  getTrash: () => JSON.parse(localStorage.getItem('adhyay_trash_pdfs') || '[]'),
  
  saveFile: (fileData) => {
    let files = AdhyayStorage.getFiles();
    const existingIndex = files.findIndex(f => f.name === fileData.name);
    
    if (existingIndex > -1) {
      files[existingIndex] = { ...files[existingIndex], ...fileData };
    } else {
      files.unshift(fileData);
    }
    
    localStorage.setItem('adhyay_recent_pdfs', JSON.stringify(files.slice(0, 10)));
    renderAllViews();
  },

  toggleFavorite: (fileName) => {
    let files = AdhyayStorage.getFiles();
    const item = files.find(f => f.name === fileName);
    if (item) {
      item.isFavorite = !item.isFavorite;
      localStorage.setItem('adhyay_recent_pdfs', JSON.stringify(files));
      renderAllViews();
    }
  },

  moveToTrash: async (fileName) => {
    let files = AdhyayStorage.getFiles();
    const fileToTrash = files.find(f => f.name === fileName);
    
    if (fileToTrash) {
      files = files.filter(f => f.name !== fileName);
      localStorage.setItem('adhyay_recent_pdfs', JSON.stringify(files));
      
      let trash = AdhyayStorage.getTrash();
      trash.unshift(fileToTrash);
      localStorage.setItem('adhyay_trash_pdfs', JSON.stringify(trash));
    }
    renderAllViews();
  },

  restoreFromTrash: (fileName) => {
    let trash = AdhyayStorage.getTrash();
    const fileToRestore = trash.find(f => f.name === fileName);
    
    if (fileToRestore) {
      trash = trash.filter(f => f.name !== fileName);
      localStorage.setItem('adhyay_trash_pdfs', JSON.stringify(trash));
      
      let files = AdhyayStorage.getFiles();
      files.unshift(fileToRestore);
      localStorage.setItem('adhyay_recent_pdfs', JSON.stringify(files));
    }
    renderAllViews();
  },

  permanentDelete: async (fileName) => {
    let trash = AdhyayStorage.getTrash();
    trash = trash.filter(f => f.name !== fileName);
    localStorage.setItem('adhyay_trash_pdfs', JSON.stringify(trash));
    
    await PDFStore.deletePDF(fileName);
    renderAllViews();
  }
};

// Open PDF
async function openPDFFromStorage(fileData) {
  const buffer = await PDFStore.getPDF(fileData.name);
  if (buffer) {
    switchToReaderView();
    renderPDFFile(buffer, fileData.name);
    const pageInput = document.getElementById('pageNumberInput');
    if (pageInput) pageInput.value = fileData.currentPage || 1;
  } else {
    alert(`"${fileData.name}" database me nahi mili. Kripya PDF upload button se ise dubara select karein.`);
  }
}

// View Controller (Switching between Home, Library, Favorites, Trash, Settings, Reader)
function switchView(viewName) {
  const views = ['dashboardView', 'readerView', 'libraryView', 'favoritesView', 'sharedView', 'trashView', 'settingsView'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const mainLayout = document.querySelector('.main-layout');
  if (mainLayout) {
    mainLayout.classList.toggle('sidebar-collapsed', viewName === 'reader');
  }

  const targetView = document.getElementById(viewName + 'View');
  if (targetView) {
    targetView.classList.remove('hidden');
  }

  document.querySelectorAll('.menu-item, .nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  renderAllViews();
}

function switchToReaderView() {
  switchView('reader');
}

function switchToDashboardView() {
  switchView('dashboard');
}

// Reusable Card Generator
function createPDFCard(file) {
  const card = document.createElement('div');
  card.className = 'pdf-card';
  if (file.coverImg) card.style.backgroundImage = `url(${file.coverImg})`;

  card.innerHTML = `
    <div class="card-top-bar">
      <span class="badge">${file.progress || 0}%</span>
      <div class="card-actions-wrapper">
        <button class="star-btn ${file.isFavorite ? 'active' : ''}">
          <i class="fa-${file.isFavorite ? 'solid' : 'regular'} fa-star"></i>
        </button>
        <div class="menu-dropdown-container">
          <button class="three-dots-btn"><i class="fa-solid fa-ellipsis-vertical"></i></button>
          <div class="dropdown-menu hidden">
            <button class="delete-pdf-btn"><i class="fa-solid fa-trash"></i> move to trash</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card-footer">
      <h4>${file.name}</h4>
      <p>Page ${file.currentPage || 1} / ${file.totalPages || '?'}</p>
    </div>
  `;

  const threeDotsBtn = card.querySelector('.three-dots-btn');
  const dropdownMenu = card.querySelector('.dropdown-menu');
  const deleteBtn = card.querySelector('.delete-pdf-btn');
  const starBtn = card.querySelector('.star-btn');

  starBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    AdhyayStorage.toggleFavorite(file.name);
  });

  threeDotsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
    dropdownMenu.classList.toggle('hidden');
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    AdhyayStorage.moveToTrash(file.name);
  });

  card.addEventListener('click', () => openPDFFromStorage(file));
  return card;
}

// Render Systems
function renderAllViews() {
  renderDashboardUI();
  renderLibraryUI();
  renderFavoritesUI();
  renderSharedUI();
  renderTrashUI();
}

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
    grid.appendChild(createPDFCard(file));

    // Recent Files Row
    const row = document.createElement('div');
    row.className = 'file-row';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <div class="file-info">
        <i class="fa-solid fa-file-pdf" style="color:var(--accent-color); font-size: 22px;"></i>
        <div>
          <h5>${file.name}</h5>
          <p>Total Pages: ${file.totalPages || '?'}</p>
        </div>
      </div>
      <div class="row-right-side" style="display: flex; align-items: center; gap: 15px;">
        <span class="progress-text">${file.progress || 0}%</span>
        <div class="menu-dropdown-container">
          <button class="three-dots-btn"><i class="fa-solid fa-ellipsis-vertical"></i></button>
          <div class="dropdown-menu hidden">
            <button class="delete-pdf-btn"><i class="fa-solid fa-trash"></i> move to trash</button>
          </div>
        </div>
      </div>
    `;

    const rowDotsBtn = row.querySelector('.three-dots-btn');
    const rowDropdown = row.querySelector('.dropdown-menu');
    const rowDeleteBtn = row.querySelector('.delete-pdf-btn');

    rowDotsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
      rowDropdown.classList.toggle('hidden');
    });

    rowDeleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      AdhyayStorage.moveToTrash(file.name);
    });

    row.addEventListener('click', () => openPDFFromStorage(file));
    list.appendChild(row);
  });
}

function renderLibraryUI() {
  const grid = document.getElementById('libraryGrid');
  if (!grid) return;
  const files = AdhyayStorage.getFiles();
  grid.innerHTML = '';

  if (files.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);">Library khali hai.</p>`;
    return;
  }
  files.forEach(file => grid.appendChild(createPDFCard(file)));
}

function renderFavoritesUI() {
  const grid = document.getElementById('favoritesGrid');
  if (!grid) return;
  const files = AdhyayStorage.getFiles().filter(f => f.isFavorite);
  grid.innerHTML = '';

  if (files.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);">Koi Favorite PDF nahi mili. Star ⭐ icon daba kar add karein.</p>`;
    return;
  }
  files.forEach(file => grid.appendChild(createPDFCard(file)));
}

function renderTrashUI() {
  const list = document.getElementById('trashList');
  if (!list) return;
  const trashFiles = AdhyayStorage.getTrash();
  list.innerHTML = '';

  if (trashFiles.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);">Trash khali hai.</p>`;
    return;
  }

  trashFiles.forEach(file => {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
      <div class="file-info">
        <i class="fa-solid fa-file-pdf" style="color:var(--text-muted); font-size: 22px;"></i>
        <div>
          <h5>${file.name}</h5>
          <p>Trash Item</p>
        </div>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn-primary-sm restore-btn"><i class="fa-solid fa-rotate-left"></i> Restore</button>
        <button class="btn-danger-sm perm-delete-btn"><i class="fa-solid fa-trash"></i> Delete Permanent</button>
      </div>
    `;

    row.querySelector('.restore-btn').addEventListener('click', () => AdhyayStorage.restoreFromTrash(file.name));
    row.querySelector('.perm-delete-btn').addEventListener('click', () => {
      if (confirm(`Aap "${file.name}" ko hamesha ke liye delete karna chahte hain?`)) {
        AdhyayStorage.permanentDelete(file.name);
      }
    });

    list.appendChild(row);
  });
}

function renderSharedUI() {
  const grid = document.getElementById('sharedGrid');
  if (!grid) return;
  grid.innerHTML = '';

  grid.innerHTML = `
    <div class="empty-state" style="grid-column: 1/-1;">
      <i class="fa-solid fa-share-nodes"></i>
      <h3>Koi Shared File Nahi Hai</h3>
      <p>Aapke sath share ki gayi PDFs yahan dikhai dengi.</p>
    </div>
  `;
}

// Close Dropdowns on Click Outside
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
});

// Main Initialization Event
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage('hi');

  // File Upload Logic
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('pdfFileInput');

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async function(e) {
          const arrayBuffer = e.target.result;
          await PDFStore.savePDF(file.name, arrayBuffer);
          AdhyayStorage.saveFile({
            name: file.name,
            currentPage: 1,
            totalPages: 1,
            progress: 0,
            isFavorite: false
          });
          switchToReaderView();
          renderPDFFile(arrayBuffer, file.name);
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }

  // Sidebar Buttons Binding
  const sidebarItems = document.querySelectorAll('.sidebar .menu-item');
  sidebarItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      if (index === 0) switchView('dashboard');
      else if (index === 1) switchView('library');
      else if (index === 2) switchView('favorites');
      else if (index === 3) switchView('shared');
      else if (index === 4) switchView('trash');
    });
  });

  // Top Nav Buttons Binding
  const topNavBtns = document.querySelectorAll('.top-nav .nav-btn');
  topNavBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      topNavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (index === 0) switchView('dashboard');
      else if (index === 1) switchView('library');
      else if (index === 2) switchView('favorites');
      else if (index === 3) switchView('shared');
    });
  });

  // Settings Button Binding (Footer Sidebar)
  const settingsBtn = document.querySelector('.sidebar-footer .menu-item');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => switchView('settings'));
  }

  // Theme Switcher
  const themeBtn = document.getElementById('themeToggleBtn');
  const toggleThemeSetting = document.getElementById('toggleThemeSetting');
  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    if (themeBtn) themeBtn.querySelector('i').className = nextTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  };

  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  if (toggleThemeSetting) toggleThemeSetting.addEventListener('click', toggleTheme);

  // Settings Page Inputs
  const settingNameInput = document.getElementById('settingNameInput');
  if (settingNameInput) {
    settingNameInput.value = localStorage.getItem('adhyay_user_name') || '';
    settingNameInput.addEventListener('change', (e) => {
      localStorage.setItem('adhyay_user_name', e.target.value.trim());
      updateUserUI(e.target.value.trim());
    });
  }

  const clearAllBtn = document.getElementById('clearAllDataBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (confirm("Kya aap saara reset karna chahte hain? Sabhi saved PDFs delete ho jayengi.")) {
        localStorage.clear();
        indexedDB.deleteDatabase('AdhyayPDFDB');
        location.reload();
      }
    });
  }

  // Greeting Setup
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

  renderAllViews();
});