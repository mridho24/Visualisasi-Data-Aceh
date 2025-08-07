import { datasets } from './datasetConfig.js';
import { fetchDataset } from './clientService.js';

const listContainer = document.getElementById('dataset-list');
const searchInput = document.getElementById('search-input');
let hoveredIndex = null;
let allCards = [];
let searchPlaceholders = [
  'Cari dataset berdasarkan judul atau deskripsi...',
  'Contoh: Jumlah Dayah',
  'Contoh: Angka Partisipasi Kasar',
  'Contoh: Alat Uji dan Kalibrasi',
  'Ketik untuk mencari data Aceh...'
];
let currentPlaceholderIndex = 0;

// Create shooting stars
function createShootingStars() {
  for (let i = 0; i < 5; i++) {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    star.style.left = Math.random() * 100 + 'vw';
    star.style.top = Math.random() * 100 + 'vh';
    star.style.animationDelay = Math.random() * 3 + 's';
    star.style.animationDuration = (Math.random() * 2 + 3) + 's';
    document.body.appendChild(star);
    
    // Remove star after animation
    setTimeout(() => {
      if (document.body.contains(star)) {
        document.body.removeChild(star);
      }
    }, 5000);
  }
}

// Create shooting stars periodically
setInterval(createShootingStars, 2000);
createShootingStars(); // Initial stars

// Clear loading message
listContainer.innerHTML = '';

// Setup search functionality
setupSearch();

// Create hover background element
const hoverBackground = document.createElement('div');
hoverBackground.className = 'hover-background';
listContainer.appendChild(hoverBackground);

// Create cards for each dataset
datasets.forEach(async (dataset, index) => {
  try {
    // Create card element immediately
    const cardElement = createCardElement(dataset, index);
    listContainer.appendChild(cardElement);
    allCards.push({ element: cardElement, dataset: dataset });
    
    // Fetch preview data
    const data = await fetchDataset(dataset.resource_id, 3);
    
    // Update card with preview data
    updateCardWithData(cardElement, data);
    
  } catch (error) {
    console.error(`Error loading dataset ${dataset.id}:`, error);
    const cardElement = listContainer.children[index + 1]; // +1 because of hover background
    if (cardElement) {
      const previewDiv = cardElement.querySelector('.card-preview');
      previewDiv.innerHTML = '<div class="error">Gagal memuat preview data</div>';
    }
  }
});

function setupSearch() {
  const placeholderElement = document.querySelector('.placeholder-text');
  let placeholderInterval;
  
  // Initialize first placeholder
  placeholderElement.textContent = searchPlaceholders[0];
  placeholderElement.style.opacity = '1';
  
  // Function to update placeholder
  function updatePlaceholder() {
    if (searchInput.value === '' && document.activeElement !== searchInput) {
      // Fade out
      placeholderElement.style.opacity = '0';
      
      setTimeout(() => {
        // Change text
        currentPlaceholderIndex = (currentPlaceholderIndex + 1) % searchPlaceholders.length;
        placeholderElement.textContent = searchPlaceholders[currentPlaceholderIndex];
        
        // Fade in
        placeholderElement.style.opacity = '1';
      }, 300);
    }
  }
  
  // Start placeholder rotation
  placeholderInterval = setInterval(updatePlaceholder, 3000);
  
  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    // Update class based on input value
    if (e.target.value !== '') {
      searchInput.classList.add('has-value');
    } else {
      searchInput.classList.remove('has-value');
    }
    
    filterCards(query);
  });
  
  // Hide placeholder when focused
  searchInput.addEventListener('focus', () => {
    placeholderElement.style.opacity = '0';
  });
  
  // Show placeholder when not focused and empty
  searchInput.addEventListener('blur', () => {
    if (searchInput.value === '') {
      searchInput.classList.remove('has-value');
      setTimeout(() => {
        placeholderElement.style.opacity = '1';
      }, 100);
    }
  });
  
  // Clear interval on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(placeholderInterval);
  });
}

function filterCards(query) {
  let visibleCount = 0;
  
  // Remove existing search results message
  const existingMessage = document.querySelector('.search-results-count');
  const existingNoResults = document.querySelector('.no-results');
  if (existingMessage) {
    existingMessage.remove();
  }
  if (existingNoResults) {
    existingNoResults.remove();
  }
  
  allCards.forEach(({ element, dataset }) => {
    const title = dataset.title.toLowerCase();
    const description = dataset.description.toLowerCase();
    
    if (query === '' || title.includes(query) || description.includes(query)) {
      element.style.display = 'flex';
      visibleCount++;
    } else {
      element.style.display = 'none';
    }
  });
  
  // Show search results count or no results message
  if (query !== '') {
    const message = document.createElement('div');
    
    if (visibleCount > 0) {
      message.className = 'search-results-count';
      message.textContent = `Menampilkan ${visibleCount} dataset yang cocok dengan "${query}"`;
    } else {
      message.className = 'no-results';
      message.innerHTML = `
        <div class="no-results-content">
          <div class="no-results-icon">
            <svg class="empty-paper-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="10" width="70" height="90" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
              <rect x="25" y="20" width="60" height="2" rx="1" fill="#cbd5e1"/>
              <rect x="25" y="30" width="50" height="2" rx="1" fill="#cbd5e1"/>
              <rect x="25" y="40" width="45" height="2" rx="1" fill="#cbd5e1"/>
              <rect x="25" y="50" width="55" height="2" rx="1" fill="#cbd5e1"/>
              <rect x="25" y="60" width="40" height="2" rx="1" fill="#cbd5e1"/>
              <circle cx="75" cy="75" r="15" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4,4"/>
              <line x1="68" y1="75" x2="82" y2="75" stroke="#94a3b8" stroke-width="2"/>
            </svg>
          </div>
          <div class="no-results-text">Yah Data yang kamu cari tidak ada</div>
          <div class="no-results-suggestion">Coba kata kunci lain seperti "Dayah", "Partisipasi", atau "RMC" dan yang lainnya.</div>
        </div>
      `;
    }
    
    listContainer.insertBefore(message, listContainer.firstChild.nextSibling);
  }
}

function createCardElement(dataset, index) {
  const cardDiv = document.createElement('div');
  cardDiv.className = 'card';
  cardDiv.setAttribute('data-index', index);
  cardDiv.innerHTML = `
    <h2 class="card-title">${dataset.title}</h2>
    <p class="card-description">${dataset.description}</p>
    <div class="card-preview">
      <div class="loading">Memuat preview...</div>
    </div>
    <a href="detail.html?id=${dataset.id}" class="card-button">
      Lihat Detail
    </a>
  `;
  
  // Add hover handlers for Aceternity-style effect
  cardDiv.addEventListener('mouseenter', (e) => {
    hoveredIndex = index;
    updateHoverBackground(cardDiv);
  });
  
  cardDiv.addEventListener('mouseleave', (e) => {
    hoveredIndex = null;
    hideHoverBackground();
  });
  
  // Add click handler for the entire card
  cardDiv.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A') {
      window.location.href = `detail.html?id=${dataset.id}`;
    }
  });
  
  return cardDiv;
}

function updateHoverBackground(cardElement) {
  const hoverBackground = document.querySelector('.hover-background');
  const rect = cardElement.getBoundingClientRect();
  const containerRect = listContainer.getBoundingClientRect();
  
  hoverBackground.style.display = 'block';
  hoverBackground.style.left = (rect.left - containerRect.left) + 'px';
  hoverBackground.style.top = (rect.top - containerRect.top) + 'px';
  hoverBackground.style.width = rect.width + 'px';
  hoverBackground.style.height = rect.height + 'px';
  hoverBackground.style.opacity = '1';
}

function hideHoverBackground() {
  const hoverBackground = document.querySelector('.hover-background');
  hoverBackground.style.opacity = '0';
}

function updateCardWithData(cardElement, data) {
  const previewDiv = cardElement.querySelector('.card-preview');
  
  if (!data || data.length === 0) {
    previewDiv.innerHTML = '<div class="error">Tidak ada data preview</div>';
    return;
  }
  
  const keys = Object.keys(data[0]);
  const limitedKeys = keys.slice(0, 3); // Show max 3 columns for better fit
  
  const tableHTML = `
    <table class="preview-table">
      <thead>
        <tr>${limitedKeys.map(key => `<th>${truncateText(key, 12)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.slice(0, 2).map(row => `
          <tr>${limitedKeys.map(key => `<td>${truncateText(row[key], 12)}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  previewDiv.innerHTML = tableHTML;
}

function truncateText(text, maxLength) {
  if (!text) return '-';
  const str = String(text);
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}
