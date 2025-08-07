export function renderChart(data, selectedXColumn = null, selectedYColumn = null, chartType = 'auto') {
  const ctx = document.getElementById('chartCanvas').getContext('2d');

  // Clear any existing chart
  if (window.chartInstance) {
    window.chartInstance.destroy();
  }

  if (!data || data.length === 0) {
    ctx.fillStyle = '#374151';
    ctx.font = '16px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('Tidak ada data untuk ditampilkan', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  // Analyze data structure
  const dataAnalysis = analyzeDataStructure(data);
  
  // Auto-select columns if not provided
  const xColumn = selectedXColumn || dataAnalysis.bestXColumn;
  const yColumn = selectedYColumn || dataAnalysis.bestYColumn;
  
  // Auto-determine chart type if not specified
  let finalChartType = chartType;
  if (chartType === 'auto') {
    finalChartType = determineChartType(data, xColumn, yColumn, dataAnalysis);
  }

  // Render the appropriate chart
  switch (finalChartType) {
    case 'line':
      renderLineChart(ctx, data, xColumn, yColumn);
      break;
    case 'bar':
      renderBarChart(ctx, data, xColumn, yColumn);
      break;
    case 'pie':
      renderPieChart(ctx, data, xColumn, yColumn);
      break;
    default:
      renderBarChart(ctx, data, xColumn, yColumn);
  }
}

function analyzeDataStructure(data) {
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  
  const analysis = {
    columns: columns,
    numericalColumns: [],
    categoricalColumns: [],
    dateColumns: [],
    idColumns: [],
    bestXColumn: null,
    bestYColumn: null
  };

  // Analyze each column
  columns.forEach(col => {
    const colLower = col.toLowerCase();
    const sampleValues = data.slice(0, Math.min(10, data.length)).map(row => row[col]);
    
    // Check if it's an ID column (skip for visualization)
    if (colLower.includes('id') || colLower === '_id') {
      analysis.idColumns.push(col);
      return;
    }
    
    // Check if it's a date/year column
    if (colLower.includes('tahun') || colLower.includes('year') || colLower.includes('tanggal')) {
      analysis.dateColumns.push(col);
      return;
    }
    
    // Check if it's numerical
    const numericalValues = sampleValues.filter(val => {
      const num = parseFloat(val);
      return !isNaN(num) && isFinite(num) && val !== null && val !== '';
    });
    
    if (numericalValues.length >= sampleValues.length * 0.7) { // 70% of values are numerical
      analysis.numericalColumns.push({
        name: col,
        hasDecimals: numericalValues.some(val => parseFloat(val) % 1 !== 0),
        range: {
          min: Math.min(...numericalValues.map(v => parseFloat(v))),
          max: Math.max(...numericalValues.map(v => parseFloat(v)))
        }
      });
    } else {
      analysis.categoricalColumns.push(col);
    }
  });

  // Determine best X and Y columns
  analysis.bestXColumn = determineBestXColumn(analysis);
  analysis.bestYColumn = determineBestYColumn(analysis);

  return analysis;
}

function determineBestXColumn(analysis) {
  // Priority: Date/Year columns first, then categorical, then numerical
  if (analysis.dateColumns.length > 0) {
    return analysis.dateColumns[0];
  }
  
  if (analysis.categoricalColumns.length > 0) {
    // Prefer region-related columns
    const regionCol = analysis.categoricalColumns.find(col => 
      col.toLowerCase().includes('kabupaten') || 
      col.toLowerCase().includes('kota') ||
      col.toLowerCase().includes('wilayah') ||
      col.toLowerCase().includes('nama')
    );
    return regionCol || analysis.categoricalColumns[0];
  }
  
  return analysis.numericalColumns[0]?.name || analysis.columns[0];
}

function determineBestYColumn(analysis) {
  // Priority: Numerical columns first
  if (analysis.numericalColumns.length > 0) {
    // Prefer columns that are not IDs and have meaningful ranges
    const meaningfulCol = analysis.numericalColumns.find(col => 
      !col.name.toLowerCase().includes('id') &&
      (col.range.max - col.range.min) > 0
    );
    return meaningfulCol?.name || analysis.numericalColumns[0].name;
  }
  
  // Fallback to counting categorical data
  return analysis.categoricalColumns[0] || analysis.columns[1] || analysis.columns[0];
}

function determineChartType(data, xColumn, yColumn, analysis) {
  const xIsDate = analysis.dateColumns.includes(xColumn);
  const xIsCategorical = analysis.categoricalColumns.includes(xColumn);
  const yIsNumerical = analysis.numericalColumns.some(col => col.name === yColumn);
  
  // Time series data -> Line chart
  if (xIsDate && yIsNumerical) {
    return 'line';
  }
  
  // Regional/categorical data with numerical values
  if (xIsCategorical && yIsNumerical) {
    const uniqueCategories = [...new Set(data.map(row => row[xColumn]))];
    // Use pie chart for regional data with reasonable number of categories
    if (uniqueCategories.length <= 8 && 
        (xColumn.toLowerCase().includes('kabupaten') || 
         xColumn.toLowerCase().includes('kota') || 
         xColumn.toLowerCase().includes('wilayah'))) {
      return 'pie';
    }
    return 'bar';
  }
  
  // Categorical vs categorical -> Bar chart (count)
  if (xIsCategorical) {
    return 'bar';
  }
  
  // Default fallback
  return 'bar';
}

function renderLineChart(ctx, data, xColumn, yColumn) {
  // Process data for line chart
  const processedData = processDataForChart(data, xColumn, yColumn, 'line');
  
  window.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: processedData.labels,
      datasets: [{
        label: `${yColumn} berdasarkan ${xColumn}`,
        data: processedData.values,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: getChartOptions('line', xColumn, yColumn)
  });
}

function renderBarChart(ctx, data, xColumn, yColumn) {
  const processedData = processDataForChart(data, xColumn, yColumn, 'bar');
  
  window.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: processedData.labels,
      datasets: [{
        label: `${yColumn} berdasarkan ${xColumn}`,
        data: processedData.values,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: getChartOptions('bar', xColumn, yColumn)
  });
}

function renderPieChart(ctx, data, xColumn, yColumn) {
  const processedData = processDataForChart(data, xColumn, yColumn, 'pie');
  const colors = generateColors(processedData.labels.length);

  window.chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: processedData.labels,
      datasets: [{
        data: processedData.values,
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 2,
      }]
    },
    options: getChartOptions('pie', xColumn, yColumn)
  });
}

function processDataForChart(data, xColumn, yColumn, chartType) {
  const analysis = analyzeDataStructure(data);
  const yIsNumerical = analysis.numericalColumns.some(col => col.name === yColumn);
  
  if (yIsNumerical) {
    // Aggregate numerical data
    const aggregatedData = {};
    
    data.forEach(row => {
      const xValue = row[xColumn] || 'Tidak Diketahui';
      const yValue = parseFloat(row[yColumn]) || 0;
      
      if (aggregatedData[xValue]) {
        aggregatedData[xValue] += yValue;
      } else {
        aggregatedData[xValue] = yValue;
      }
    });
    
    const labels = Object.keys(aggregatedData);
    const values = Object.values(aggregatedData);
    
    // Sort by X value if it's date/year
    if (analysis.dateColumns.includes(xColumn)) {
      const sorted = labels.map((label, index) => ({ label, value: values[index] }))
        .sort((a, b) => a.label.localeCompare(b.label));
      
      return {
        labels: sorted.map(item => item.label),
        values: sorted.map(item => item.value)
      };
    }
    
    return { labels, values };
  } else {
    // Count categorical data
    const countData = {};
    
    data.forEach(row => {
      const xValue = row[xColumn] || 'Tidak Diketahui';
      countData[xValue] = (countData[xValue] || 0) + 1;
    });
    
    const labels = Object.keys(countData);
    const values = Object.values(countData);
    
    return { labels, values };
  }
}

function getChartOptions(chartType, xColumn, yColumn) {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: chartType === 'pie' ? 'right' : 'top',
        labels: {
          color: '#374151',
          font: {
            size: 12,
            family: 'Segoe UI, sans-serif',
            weight: '500'
          },
          padding: chartType === 'pie' ? 15 : 20,
          usePointStyle: chartType === 'pie',
          pointStyle: chartType === 'pie' ? 'circle' : undefined
        }
      }
    }
  };

  if (chartType === 'pie') {
    baseOptions.plugins.tooltip = {
      callbacks: {
        label: function(context) {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((context.parsed / total) * 100).toFixed(1);
          return `${context.label}: ${context.parsed} (${percentage}%)`;
        }
      }
    };
  } else {
    baseOptions.scales = {
      y: { 
        beginAtZero: true,
        title: {
          display: true,
          text: yColumn,
          color: '#374151',
          font: {
            size: 12,
            weight: '600'
          }
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
          lineWidth: 1
        },
        ticks: {
          color: '#4b5563',
          font: {
            size: 11,
            weight: '500'
          }
        }
      },
      x: {
        title: {
          display: true,
          text: xColumn,
          color: '#374151',
          font: {
            size: 12,
            weight: '600'
          }
        },
        grid: {
          color: chartType === 'bar' ? 'transparent' : 'rgba(148, 163, 184, 0.1)',
          lineWidth: 1
        },
        ticks: {
          color: '#4b5563',
          font: {
            size: 11,
            weight: '500'
          },
          maxRotation: 45
        }
      }
    };
  }

  return baseOptions;
}

function generateColors(count) {
  const baseColors = [
    'rgba(59, 130, 246, 0.8)',   // Blue
    'rgba(16, 185, 129, 0.8)',   // Green
    'rgba(245, 158, 11, 0.8)',   // Yellow
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(139, 92, 246, 0.8)',   // Purple
    'rgba(236, 72, 153, 0.8)',   // Pink
    'rgba(14, 165, 233, 0.8)',   // Sky
    'rgba(34, 197, 94, 0.8)',    // Emerald
  ];

  const borderColors = baseColors.map(color => color.replace('0.8', '1'));

  const background = [];
  const border = [];

  for (let i = 0; i < count; i++) {
    background.push(baseColors[i % baseColors.length]);
    border.push(borderColors[i % borderColors.length]);
  }

  return { background, border };
}

// Helper function to get available columns for selection
export function getAvailableColumns(data) {
  if (!data || data.length === 0) return { xColumns: [], yColumns: [] };
  
  const analysis = analyzeDataStructure(data);
  
  return {
    xColumns: [
      ...analysis.dateColumns,
      ...analysis.categoricalColumns,
      ...analysis.numericalColumns.map(col => col.name)
    ].filter(col => !analysis.idColumns.includes(col)),
    yColumns: [
      ...analysis.numericalColumns.map(col => col.name),
      ...analysis.categoricalColumns
    ].filter(col => !analysis.idColumns.includes(col)),
    recommendedX: analysis.bestXColumn,
    recommendedY: analysis.bestYColumn
  };
}

// Helper function to calculate statistics
export function calculateStatistics(data, xColumn, yColumn, chartType) {
  if (!data || data.length === 0) return null;
  
  const analysis = analyzeDataStructure(data);
  const yIsNumerical = analysis.numericalColumns.some(col => col.name === yColumn);
  
  // Ensure we have a valid chart type
  let finalChartType = chartType;
  if (chartType === 'auto') {
    finalChartType = determineChartType(data, xColumn, yColumn, analysis);
  }
  
  const stats = {
    totalRecords: data.length,
    totalColumns: Object.keys(data[0]).length,
    chartType: finalChartType,
    yColumn: yColumn,
    xColumn: xColumn
  };
  
  if (yIsNumerical) {
    // Calculate numerical statistics
    const values = data.map(row => parseFloat(row[yColumn]) || 0).filter(val => !isNaN(val));
    
    stats.maxValue = Math.max(...values);
    stats.minValue = Math.min(...values);
    stats.avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    stats.sumValue = values.reduce((sum, val) => sum + val, 0);
    stats.dataRange = stats.maxValue - stats.minValue;
    
    // Find top category
    const categoryData = {};
    data.forEach(row => {
      const xValue = row[xColumn] || 'Tidak Diketahui';
      const yValue = parseFloat(row[yColumn]) || 0;
      if (categoryData[xValue]) {
        categoryData[xValue] += yValue;
      } else {
        categoryData[xValue] = yValue;
      }
    });
    
    const sortedCategories = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
    stats.topCategory = sortedCategories[0] ? `${sortedCategories[0][0]} (${formatNumber(sortedCategories[0][1])})` : '-';
    stats.categoryCount = Object.keys(categoryData).length;
    
  } else {
    // Calculate categorical statistics
    const categoryData = {};
    data.forEach(row => {
      const xValue = row[xColumn] || 'Tidak Diketahui';
      categoryData[xValue] = (categoryData[xValue] || 0) + 1;
    });
    
    const values = Object.values(categoryData);
    const sortedCategories = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
    
    stats.maxValue = Math.max(...values);
    stats.minValue = Math.min(...values);
    stats.avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    stats.sumValue = data.length;
    stats.dataRange = stats.maxValue - stats.minValue;
    stats.topCategory = sortedCategories[0] ? `${sortedCategories[0][0]} (${sortedCategories[0][1]} data)` : '-';
    stats.categoryCount = Object.keys(categoryData).length;
  }
  
  return stats;
}

// Helper function to generate interpretation
export function generateInterpretation(stats, data, xColumn, yColumn) {
  if (!stats) return "Tidak ada data untuk dianalisis.";
  
  const analysis = analyzeDataStructure(data);
  const yIsNumerical = analysis.numericalColumns.some(col => col.name === yColumn);
  
  let interpretation = "";
  
  // Basic dataset info
  interpretation += `Dataset ini memiliki <span class="insight-highlight">${stats.totalRecords} record data</span> dengan ${stats.totalColumns} kolom. `;
  
  // Chart type explanation
  switch(stats.chartType) {
    case 'bar':
      interpretation += `Visualisasi menggunakan <strong>Bar Chart</strong> yang cocok untuk membandingkan nilai antar kategori. `;
      break;
    case 'line':
      interpretation += `Visualisasi menggunakan <strong>Line Chart</strong> yang cocok untuk menampilkan tren data dari waktu ke waktu. `;
      break;
    case 'pie':
      interpretation += `Visualisasi menggunakan <strong>Pie Chart</strong> yang cocok untuk menampilkan proporsi data. `;
      break;
  }
  
  if (yIsNumerical) {
    // Numerical data interpretation
    interpretation += `<br><br><strong>Analisis Statistik:</strong><br>`;
    interpretation += `• Nilai tertinggi: <span class="trend-positive">${formatNumber(stats.maxValue)}</span><br>`;
    interpretation += `• Nilai terendah: <span class="trend-negative">${formatNumber(stats.minValue)}</span><br>`;
    interpretation += `• Rata-rata: <span class="trend-neutral">${formatNumber(stats.avgValue)}</span><br>`;
    interpretation += `• Total keseluruhan: <span class="insight-highlight">${formatNumber(stats.sumValue)}</span><br>`;
    
    // Distribution analysis
    const variance = stats.dataRange / stats.avgValue;
    if (variance > 2) {
      interpretation += `<br>Data menunjukkan <strong>variasi yang tinggi</strong> dengan rentang ${formatNumber(stats.dataRange)}, menandakan adanya perbedaan signifikan antar kategori.`;
    } else if (variance < 0.5) {
      interpretation += `<br>Data menunjukkan <strong>distribusi yang merata</strong> dengan rentang ${formatNumber(stats.dataRange)}, menandakan konsistensi yang baik antar kategori.`;
    } else {
      interpretation += `<br>Data menunjukkan <strong>variasi yang moderat</strong> dengan rentang ${formatNumber(stats.dataRange)}.`;
    }
    
  } else {
    // Categorical data interpretation
    interpretation += `<br><br><strong>Analisis Distribusi:</strong><br>`;
    interpretation += `• Kategori terbanyak: <span class="insight-highlight">${stats.topCategory}</span><br>`;
    interpretation += `• Total kategori: ${stats.categoryCount}<br>`;
    interpretation += `• Rata-rata per kategori: ${formatNumber(stats.avgValue)} data<br>`;
  }
  
  // Top category insight
  interpretation += `<br><strong>Insight Utama:</strong> ${stats.topCategory.split(' (')[0]} adalah kategori dengan nilai/jumlah tertinggi dalam dataset ini.`;
  
  return interpretation;
}

// Helper function to format numbers
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