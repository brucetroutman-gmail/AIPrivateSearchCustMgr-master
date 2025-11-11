// Safe DOM manipulation utilities to prevent XSS

export function safeSetOptions(selectElement, options) {
  // Clear existing options safely
  while (selectElement.firstChild) {
    selectElement.removeChild(selectElement.firstChild);
  }
  
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value || opt;
    option.textContent = opt.text || opt;
    if (opt.selected) option.selected = true;
    selectElement.appendChild(option);
  });
}

export function safeSetContent(element, content) {
  element.textContent = content;
}

export function safeCreateTable(headers, rows) {
  const table = document.createElement('table');
  table.className = 'score-table';
  
  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  
  // Create body
  const tbody = document.createElement('tbody');
  rows.forEach(rowData => {
    const row = document.createElement('tr');
    rowData.forEach(cellData => {
      const td = document.createElement('td');
      td.textContent = cellData;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  
  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

export function safeCreateErrorOption(selectElement, message) {
  while (selectElement.firstChild) {
    selectElement.removeChild(selectElement.firstChild);
  }
  
  const option = document.createElement('option');
  option.value = '';
  option.textContent = message;
  selectElement.appendChild(option);
}