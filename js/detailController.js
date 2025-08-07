import { datasets } from './datasetConfig.js';
import { fetchDataset } from './clientService.js';
import { renderChart, getAvailableColumns, calculateStatistics, generateInterpretation } from './chartHandler.js';

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

const dataset = datasets.find(d => d.id === id);
let currentData = null;
let selectedChartType = 'auto';

if (!dataset) {
  document.body.innerHTML = '<div class="container"><p class="error">Dataset tidak ditemukan.</p></div>';
} else {
  document.getElementById('dataset-title').textContent = dataset.title;
  document.getElementById('dataset-description').textContent = dataset.description;

  fetchDataset(dataset.resource_id).then(data => {
    currentData = data;
    renderTable(data);
    initializeChartControls(data);
  }).catch(error => {
    console.error('Error fetching dataset:', error);
    document.getElementById('table-body').innerHTML = 
      '<tr><td colspan="100%" class="error">Gagal memuat data</td></tr>';
  });
}

function renderTable(data) {
  const tableHead = document.getElementById('table-head');
  const tableBody = document.getElementById('table-body');

  if (data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="100%" class="error">Tidak ada data</td></tr>';
    return;
  }

  const headers = Object.keys(data[0]);
  tableHead.innerHTML = `<tr>${headers.map(k => `<th>${k}</th>`).join('')}</tr>`;
  tableBody.innerHTML = data.map(row =>
    `<tr>${headers.map(key => `<td>${row[key] || '-'}</td>`).join('')}</tr>`
  ).join('');
}

function initializeChartControls(data) {
  // Initialize chart type buttons
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      selectedChartType = this.dataset.type;
      
      // Auto-update chart if data is available and columns are selected
      const xColumn = document.getElementById('xColumnSelect').value;
      const yColumn = document.getElementById('yColumnSelect').value;
      if (currentData && xColumn && yColumn) {
        renderChart(currentData, xColumn, yColumn, selectedChartType);
        updateStatistics(currentData, xColumn, yColumn, selectedChartType);
      }
    });
  });

  // Auto-update chart when column selection changes
  document.getElementById('xColumnSelect').addEventListener('change', function() {
    const yColumn = document.getElementById('yColumnSelect').value;
    if (currentData && this.value && yColumn) {
      renderChart(currentData, this.value, yColumn, selectedChartType);
      updateStatistics(currentData, this.value, yColumn, selectedChartType);
    }
  });

  document.getElementById('yColumnSelect').addEventListener('change', function() {
    const xColumn = document.getElementById('xColumnSelect').value;
    if (currentData && xColumn && this.value) {
      renderChart(currentData, xColumn, this.value, selectedChartType);
      updateStatistics(currentData, xColumn, this.value, selectedChartType);
    }
  });

  // Populate column selectors
  populateColumnSelectors(data);
  
  // Render initial chart with auto settings
  setTimeout(() => {
    const availableColumns = getAvailableColumns(data);
    if (availableColumns.recommendedX && availableColumns.recommendedY) {
      renderChart(data, availableColumns.recommendedX, availableColumns.recommendedY, 'auto');
      updateStatistics(data, availableColumns.recommendedX, availableColumns.recommendedY, 'auto');
    } else {
      renderChart(data);
      // Show basic stats even without chart
      updateBasicStatistics(data);
    }
  }, 100);
}

function populateColumnSelectors(data) {
  if (!data || data.length === 0) return;
  
  const availableColumns = getAvailableColumns(data);
  
  const xSelect = document.getElementById('xColumnSelect');
  const ySelect = document.getElementById('yColumnSelect');
  
  // Clear existing options
  xSelect.innerHTML = '<option value="">Pilih kolom untuk sumbu X...</option>';
  ySelect.innerHTML = '<option value="">Pilih kolom untuk sumbu Y...</option>';
  
  // Populate X column options
  availableColumns.xColumns.forEach(col => {
    const option = document.createElement('option');
    option.value = col;
    option.textContent = col;
    if (col === availableColumns.recommendedX) {
      option.textContent += ' (Direkomendasikan)';
      option.selected = true;
    }
    xSelect.appendChild(option);
  });
  
  // Populate Y column options
  availableColumns.yColumns.forEach(col => {
    const option = document.createElement('option');
    option.value = col;
    option.textContent = col;
    if (col === availableColumns.recommendedY) {
      option.textContent += ' (Direkomendasikan)';
      option.selected = true;
    }
    ySelect.appendChild(option);
  });
}

window.showTable = function() {
  document.getElementById('table-view').style.display = 'block';
  document.getElementById('chart-view').style.display = 'none';
  
  // Update button states
  document.getElementById('table-btn').classList.add('active');
  document.getElementById('chart-btn').classList.remove('active');
};

window.showChart = function() {
  document.getElementById('table-view').style.display = 'none';
  document.getElementById('chart-view').style.display = 'block';
  
  // Update button states
  document.getElementById('table-btn').classList.remove('active');
  document.getElementById('chart-btn').classList.add('active');
  
  // Re-render chart when switching to chart view
  if (currentData) {
    const xColumn = document.getElementById('xColumnSelect').value;
    const yColumn = document.getElementById('yColumnSelect').value;
    
    if (xColumn && yColumn) {
      renderChart(currentData, xColumn, yColumn, selectedChartType);
      updateStatistics(currentData, xColumn, yColumn, selectedChartType);
    } else {
      renderChart(currentData);
      updateBasicStatistics(currentData);
    }
  }
};

window.updateChart = function() {
  if (!currentData) {
    alert('Data tidak tersedia. Silakan muat data terlebih dahulu.');
    return;
  }

  const xColumn = document.getElementById('xColumnSelect').value;
  const yColumn = document.getElementById('yColumnSelect').value;

  if (!xColumn || !yColumn) {
    alert('Silakan pilih kolom untuk sumbu X dan Y.');
    return;
  }

  // Call the chart rendering function
  renderChart(currentData, xColumn, yColumn, selectedChartType);
  
  // Update statistics
  updateStatistics(currentData, xColumn, yColumn, selectedChartType);
  
  // Show feedback
  const updateBtn = document.querySelector('.update-btn');
  const originalHTML = updateBtn.innerHTML;
  updateBtn.innerHTML = `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
    Chart Updated!
  `;
  updateBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  
  setTimeout(() => {
    updateBtn.innerHTML = originalHTML;
    updateBtn.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  }, 1500);
};

// Function to update statistics display
function updateStatistics(data, xColumn, yColumn, chartType) {
  const stats = calculateStatistics(data, xColumn, yColumn, chartType);
  
  if (!stats) return;
  
  // Update basic stats
  document.getElementById('total-records').textContent = stats.totalRecords.toLocaleString('id-ID');
  document.getElementById('total-columns').textContent = stats.totalColumns;
  document.getElementById('current-chart-type').textContent = stats.chartType.charAt(0).toUpperCase() + stats.chartType.slice(1);
  
  // Update Y-axis stats
  document.getElementById('y-column-name').textContent = yColumn;
  document.getElementById('max-value').textContent = formatNumber(stats.maxValue);
  document.getElementById('min-value').textContent = formatNumber(stats.minValue);
  document.getElementById('avg-value').textContent = formatNumber(stats.avgValue);
  document.getElementById('sum-value').textContent = formatNumber(stats.sumValue);
  
  // Update distribution stats
  document.getElementById('top-category').textContent = stats.topCategory;
  document.getElementById('category-count').textContent = stats.categoryCount;
  document.getElementById('data-range').textContent = formatNumber(stats.dataRange);
  
  // Update interpretation
  const interpretation = generateInterpretation(stats, data, xColumn, yColumn);
  document.getElementById('chart-interpretation').innerHTML = interpretation;
}

// Function to update basic statistics when no chart is rendered
function updateBasicStatistics(data) {
  if (!data || data.length === 0) return;
  
  document.getElementById('total-records').textContent = data.length.toLocaleString('id-ID');
  document.getElementById('total-columns').textContent = Object.keys(data[0]).length;
  document.getElementById('current-chart-type').textContent = 'Belum dipilih';
  
  // Reset other stats
  document.getElementById('y-column-name').textContent = '-';
  document.getElementById('max-value').textContent = '-';
  document.getElementById('min-value').textContent = '-';
  document.getElementById('avg-value').textContent = '-';
  document.getElementById('sum-value').textContent = '-';
  document.getElementById('top-category').textContent = '-';
  document.getElementById('category-count').textContent = '-';
  document.getElementById('data-range').textContent = '-';
  
  document.getElementById('chart-interpretation').innerHTML = 
    `Dataset ini memiliki <span class="insight-highlight">${data.length} record data</span> dengan ${Object.keys(data[0]).length} kolom. Pilih kolom untuk sumbu X dan Y serta jenis chart untuk melihat analisis dan interpretasi data yang lebih detail.`;
}

// Helper function to format numbers for display
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  
  if (num % 1 === 0) {
    // Integer
    return new Intl.NumberFormat('id-ID').format(num);
  } else {
    // Decimal
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }
}
