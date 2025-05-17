// In js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // Elementi DOM principali
    const loadingStatus = document.getElementById('loading-status');
    const errorMessageElement = document.getElementById('error-message');
    const resultsBody = document.getElementById('results-body');
    const searchInput = document.getElementById('search-input');
    const searchButtonMain = document.getElementById('search-button-main'); 
    const applyFiltersButton = document.getElementById('apply-filters-button');
    const toggleFilterDropdownBtn = document.getElementById('toggle-filter-dropdown-btn');
    const filterOptionsDropdown = document.getElementById('filter-options-dropdown');
    const activeFiltersContainer = document.getElementById('active-filters-container');
    const resetAllFiltersButton = document.getElementById('reset-all-filters-button');
    
    // Elementi Info Risultati
    const currentRowsSpan = document.getElementById('current-rows');
    const totalRowsHeaderSpan = document.getElementById('total-rows-header'); 
    const totalRowsFooterSpan = document.getElementById('total-rows-footer'); 
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages'); 
    const paginationTotalPagesSpan = document.getElementById('pagination-total-pages');

    // Elementi Paginazione
    const firstPageButton = document.getElementById('first-page-button');
    const prevPageButton = document.getElementById('prev-page-button');
    const nextPageButton = document.getElementById('next-page-button');
    const lastPageButton = document.getElementById('last-page-button');
    const pageInput = document.getElementById('page-input');
    const rowsPerPageSelect = document.getElementById('rows-per-page');

    // Elemento per ordinamento
    const headerImporto = document.getElementById('header-importo');

    const dbUrl = 'busto_pagamenti.db '; 
    let db = null; 
    let currentQueryState = { 
        searchTerm: '',
        activeFilters: {}, 
        currentPage: 1,
        rowsPerPage: parseInt(rowsPerPageSelect.value, 10),
        totalRows: 0,
        totalPages: 1,
        orderByField: 'DataMandato', 
        orderByDirection: 'DESC'     
    };

    const COLUMNS_TO_SELECT = ['Anno', 'DataMandato', 'Beneficiario', 'ImportoEuro', 'DescrizioneMandato', 'NumeroMandato'];
    const COLUMNS_STRING = COLUMNS_TO_SELECT.join(', ');

    // --- FUNZIONE PER AGGIORNARE L'INTERFACCIA DELLE FRECCE DI ORDINAMENTO ---
    function updateSortArrows() {
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        if (currentQueryState.orderByField === 'ImportoEuro' && headerImporto) {
            if (currentQueryState.orderByDirection === 'ASC') {
                headerImporto.classList.add('sort-asc');
            } else if (currentQueryState.orderByDirection === 'DESC') {
                headerImporto.classList.add('sort-desc');
            }
        }
        // Aggiungere logica per altri header ordinabili se necessario
    }
    
    // --- GESTIONE VISIBILITÀ PULSANTI FILTRO ---
    function updateActionButtonsVisibility() {
        const hasActiveFiltersWithOptions = Object.values(currentQueryState.activeFilters).some(
            filter => filter.value !== null && (typeof filter.value === 'string' ? filter.value.trim() !== '' : true)
        );
        const hasGeneralSearchTerm = searchInput.value.trim() !== '';

        applyFiltersButton.style.display = hasActiveFiltersWithOptions ? 'inline-block' : 'none';
        resetAllFiltersButton.style.display = (Object.keys(currentQueryState.activeFilters).length > 0 || hasGeneralSearchTerm) ? 'inline-block' : 'none';
    }

    function addFilter(filterType, filterLabel) {
        if (currentQueryState.activeFilters[filterType]) return;

        let operatorOptionsHtml = '';
        let inputType = 'text';
        let inputPlaceholder = 'Valore...';
        let inputStep = ''; 

        if (filterType === 'year') {
            operatorOptionsHtml = `<option value="equals" selected>uguale a</option>
                                   <option value="greater_than">maggiore di</option>
                                   <option value="less_than">minore di</option>`;
            inputType = 'number';
            inputPlaceholder = 'Es. 2023';
        } else if (filterType === 'beneficiary' || filterType === 'description') {
            operatorOptionsHtml = `<option value="contains" selected>contiene</option>
                                   <option value="equals">uguale a</option>
                                   <option value="starts_with">inizia con</option>
                                   <option value="ends_with">finisce con</option>`;
            inputPlaceholder = 'Testo...';
        } else if (filterType === 'amount') {
             operatorOptionsHtml = `<option value="equals" selected>uguale a</option>
                                   <option value="greater_than">maggiore di</option>
                                   <option value="less_than">minore di</option>
                                   <option value="not_equals">diverso da</option>`;
            inputType = 'number';
            inputPlaceholder = 'Es. 123.45';
            inputStep = '0.01';
        }

        const filterIdPrefix = `${filterType}-filter`;
        const filterHtml = `
            <div class="active-filter-item" data-filter-type="${filterType}">
                <button class="filter-name-tag" data-remove-filter="${filterType}" title="Rimuovi filtro ${filterLabel}">
                    <span class="remove-icon">×</span> ${filterLabel}
                </button>
                <select class="filter-operator-select" id="${filterIdPrefix}-operator">
                    ${operatorOptionsHtml}
                </select>
                <input type="${inputType}" class="filter-value-input" id="${filterIdPrefix}-value" 
                       placeholder="${inputPlaceholder}" ${inputStep ? `step="${inputStep}"` : ''}>
            </div>
        `;
        activeFiltersContainer.insertAdjacentHTML('beforeend', filterHtml);
        currentQueryState.activeFilters[filterType] = { 
            value: null,
            operator: document.getElementById(`${filterIdPrefix}-operator`).value 
        };
        
        const valueInput = document.getElementById(`${filterIdPrefix}-value`);
        const operatorSelect = document.getElementById(`${filterIdPrefix}-operator`);

        const handleFilterInputChange = () => {
            let val = valueInput.value.trim();
            if (valueInput.type === 'number') {
                val = val ? parseFloat(val) : null;
                if (isNaN(val)) val = null;
            }
            currentQueryState.activeFilters[filterType].value = val;
            currentQueryState.activeFilters[filterType].operator = operatorSelect.value;
            updateActionButtonsVisibility();
        };

        valueInput.addEventListener('input', handleFilterInputChange);
        operatorSelect.addEventListener('change', handleFilterInputChange);
        
        valueInput.addEventListener('keypress', e => { 
            if (e.key === 'Enter') {
                e.preventDefault();
                triggerSearchExecution(); 
            }
        });
        valueInput.focus();
        
        const dropdownOption = filterOptionsDropdown.querySelector(`a[data-filter-type="${filterType}"]`);
        if (dropdownOption) dropdownOption.classList.add('disabled');
        filterOptionsDropdown.style.display = 'none';
        updateActionButtonsVisibility();
    }

    function removeFilter(filterType) {
        const filterItem = activeFiltersContainer.querySelector(`.active-filter-item[data-filter-type="${filterType}"]`);
        if (filterItem) filterItem.remove();
        delete currentQueryState.activeFilters[filterType];
        const dropdownOption = filterOptionsDropdown.querySelector(`a[data-filter-type="${filterType}"]`);
        if (dropdownOption) dropdownOption.classList.remove('disabled');
        updateActionButtonsVisibility();
        // Non si esegue la ricerca automaticamente, l'utente deve premere Applica/Cerca o Invio
    }

    function resetAllFilters() {
        searchInput.value = ''; 
        currentQueryState.searchTerm = '';
        Object.keys(currentQueryState.activeFilters).forEach(filterType => {
            const filterItem = activeFiltersContainer.querySelector(`.active-filter-item[data-filter-type="${filterType}"]`);
            if (filterItem) filterItem.remove();
            const dropdownOption = filterOptionsDropdown.querySelector(`a[data-filter-type="${filterType}"]`);
            if (dropdownOption) dropdownOption.classList.remove('disabled');
        });
        currentQueryState.activeFilters = {};
        updateActionButtonsVisibility();
        triggerSearchExecution(); // Dopo il reset, mostra tutti i risultati
    }
    
    function triggerSearchExecution() {
        currentQueryState.currentPage = 1;
        fetchDataAndDisplay();
    }

    // --- Event Listeners ---
    toggleFilterDropdownBtn.addEventListener('click', () => {
        filterOptionsDropdown.style.display = filterOptionsDropdown.style.display === 'none' ? 'block' : 'none';
    });

    filterOptionsDropdown.addEventListener('click', (event) => {
        event.preventDefault();
        const target = event.target.closest('a[data-filter-type]');
        if (target && !target.classList.contains('disabled')) {
            addFilter(target.dataset.filterType, target.dataset.filterLabel || target.textContent);
        }
    });

    activeFiltersContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button[data-remove-filter]');
        if (target) removeFilter(target.dataset.removeFilter);
    });
    
    resetAllFiltersButton.addEventListener('click', resetAllFilters);
    applyFiltersButton.addEventListener('click', triggerSearchExecution);
    searchButtonMain.addEventListener('click', triggerSearchExecution);

    searchInput.addEventListener('input', updateActionButtonsVisibility);
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            triggerSearchExecution();
        }
    });

    document.addEventListener('click', function(event) {
         if (!toggleFilterDropdownBtn.contains(event.target) && !filterOptionsDropdown.contains(event.target) && filterOptionsDropdown.style.display === 'block') {
            filterOptionsDropdown.style.display = 'none';
        }
    });

    // --- CARICAMENTO DB E LOGICA DATI ---
    async function loadAndInitializeDb() {
        try {
            loadingStatus.textContent = 'Caricamento libreria SQLite (sql.js)...';
            const SQL = await initSqlJs({ locateFile: file => `js/lib/${file}` });
            loadingStatus.textContent = `Download database (${dbUrl})...`;
            const response = await fetch(dbUrl);
            if (!response.ok) throw new Error(`Errore HTTP ${response.status} nel download.`);
            const arrayBuffer = await response.arrayBuffer();
            loadingStatus.textContent = 'Caricamento database in memoria...';
            db = new SQL.Database(new Uint8Array(arrayBuffer));
            loadingStatus.textContent = 'Database caricato!';
            
            await fetchDataAndDisplay(); 
            updateActionButtonsVisibility();
            updateSortArrows();

            if(headerImporto) {
                headerImporto.addEventListener('click', () => {
                    if (currentQueryState.orderByField === 'ImportoEuro') {
                        currentQueryState.orderByDirection = currentQueryState.orderByDirection === 'ASC' ? 'DESC' : 'ASC';
                    } else {
                        currentQueryState.orderByField = 'ImportoEuro';
                        currentQueryState.orderByDirection = 'DESC'; 
                    }
                    triggerSearchExecution();
                });
            }

            rowsPerPageSelect.addEventListener('change', (event) => {
                currentQueryState.rowsPerPage = parseInt(event.target.value, 10);
                triggerSearchExecution();
            });
            pageInput.addEventListener('change', () => {
                let newPage = parseInt(pageInput.value, 10);
                goToPage(newPage, true);
            });
            pageInput.addEventListener('keypress', e => { if (e.key === 'Enter') pageInput.dispatchEvent(new Event('change'));});
            firstPageButton.addEventListener('click', () => goToPage(1));
            prevPageButton.addEventListener('click', () => goToPage(currentQueryState.currentPage - 1));
            nextPageButton.addEventListener('click', () => goToPage(currentQueryState.currentPage + 1));
            lastPageButton.addEventListener('click', () => goToPage(currentQueryState.totalPages));

        } catch (error) {
            console.error('Errore inizializzazione DB:', error);
            loadingStatus.style.display = 'none';
            errorMessageElement.textContent = `ERRORE CRITICO: ${error.message}. Controlla la console.`;
            errorMessageElement.style.display = 'block';
        }
    }
    
    function goToPage(pageNumber, fromInputChange = false) {
        let newPage = parseInt(pageNumber, 10);
        if (isNaN(newPage)) {
            pageInput.value = currentQueryState.currentPage;
            return;
        }
        if (newPage < 1) newPage = 1;
        
        if (currentQueryState.totalPages > 0 && newPage > currentQueryState.totalPages) {
             newPage = currentQueryState.totalPages;
        } else if (currentQueryState.totalPages === 0 && newPage > 1) { // Se non ci sono pagine totali (0 risultati)
            newPage = 1;
        }
        
        if (newPage !== currentQueryState.currentPage || fromInputChange) {
            currentQueryState.currentPage = newPage;
            pageInput.value = newPage; 
            fetchDataAndDisplay();
        } else if (fromInputChange) {
             pageInput.value = currentQueryState.currentPage;
        }
    }

    async function fetchDataAndDisplay() {
        if (!db) return;
        loadingStatus.textContent = 'Recupero dati...';
        loadingStatus.style.display = 'block';
        errorMessageElement.style.display = 'none';

        currentQueryState.searchTerm = searchInput.value.trim();
        
        for (const filterType in currentQueryState.activeFilters) {
            const valueInput = document.getElementById(`${filterType}-filter-value`);
            const operatorSelect = document.getElementById(`${filterType}-filter-operator`);
            if (valueInput && operatorSelect) {
                let val = valueInput.value.trim();
                if (valueInput.type === 'number') {
                    val = val ? parseFloat(val) : null; 
                    if (isNaN(val)) val = null;
                }
                currentQueryState.activeFilters[filterType].value = val;
                currentQueryState.activeFilters[filterType].operator = operatorSelect.value;
            }
        }

        let params = [];
        let whereClauses = [];

        if (currentQueryState.searchTerm) {
            whereClauses.push("(Beneficiario LIKE ? OR DescrizioneMandato LIKE ? OR Anno LIKE ? OR CAST(NumeroMandato AS TEXT) LIKE ?)");
            const searchTermLike = `%${currentQueryState.searchTerm}%`;
            params.push(searchTermLike, searchTermLike, searchTermLike, searchTermLike);
        }

        for (const filterType in currentQueryState.activeFilters) {
            const filter = currentQueryState.activeFilters[filterType];
             if (filter.value !== null && (typeof filter.value === 'string' ? filter.value !== '' : true) ) {
                let fieldName = '';
                let valueToUse = filter.value;

                if (filterType === 'year') fieldName = 'Anno';
                else if (filterType === 'beneficiary') fieldName = 'Beneficiario';
                else if (filterType === 'description') fieldName = 'DescrizioneMandato';
                else if (filterType === 'amount') fieldName = 'ImportoEuro';

                if (fieldName) {
                    let operatorSql = '=';
                    switch (filter.operator) {
                        case 'equals': operatorSql = '='; break;
                        case 'not_equals': operatorSql = '!='; break;
                        case 'greater_than': operatorSql = '>'; break;
                        case 'less_than': operatorSql = '<'; break;
                        case 'contains': operatorSql = 'LIKE'; valueToUse = `%${filter.value}%`; break;
                        case 'starts_with': operatorSql = 'LIKE'; valueToUse = `${filter.value}%`; break;
                        case 'ends_with': operatorSql = 'LIKE'; valueToUse = `%${filter.value}`; break;
                    }
                    whereClauses.push(`${fieldName} ${operatorSql} ?`);
                    params.push(valueToUse);
                }
            }
        }
        
        let countQuery = "SELECT COUNT(*) as total FROM pagamenti";
        if (whereClauses.length > 0) countQuery += " WHERE " + whereClauses.join(" AND ");
        
        try { 
            const countResult = db.exec(countQuery, params);
            currentQueryState.totalRows = (countResult.length > 0 && countResult[0].values.length > 0) ? countResult[0].values[0][0] : 0;
        } catch(e) {
             console.error("Errore query conteggio:", e); currentQueryState.totalRows = 0; 
             errorMessageElement.textContent = `Errore nel conteggio: ${e.message}`; errorMessageElement.style.display = 'block';
        }
        
        currentQueryState.totalPages = Math.ceil(currentQueryState.totalRows / currentQueryState.rowsPerPage) || 1;
        
        if (currentQueryState.currentPage > currentQueryState.totalPages && currentQueryState.totalPages > 0) {
            currentQueryState.currentPage = currentQueryState.totalPages;
        } else if (currentQueryState.currentPage > 1 && currentQueryState.totalPages === 0) { // Se 0 pagine totali, resetta a pagina 1
            currentQueryState.currentPage = 1;
        }
        if (currentQueryState.currentPage < 1) { // Assicura che la pagina non sia mai < 1
            currentQueryState.currentPage = 1;
        }


        let dataQuery = `SELECT ${COLUMNS_STRING} FROM pagamenti`;
        if (whereClauses.length > 0) dataQuery += " WHERE " + whereClauses.join(" AND ");
        dataQuery += ` ORDER BY ${currentQueryState.orderByField} ${currentQueryState.orderByDirection}`;
        if (currentQueryState.orderByField !== 'NumeroMandato') { 
            dataQuery += `, NumeroMandato DESC`; 
        }

        const offset = (currentQueryState.currentPage - 1) * currentQueryState.rowsPerPage;
        dataQuery += ` LIMIT ? OFFSET ?;`;
        let dataParams = [...params]; 
        dataParams.push(currentQueryState.rowsPerPage); dataParams.push(offset);

        resultsBody.innerHTML = ''; 
        let displayedRowCount = 0;
        try { 
            const dataResults = db.exec(dataQuery, dataParams);
            if (dataResults.length > 0 && dataResults[0].values.length > 0) {
                const columnNames = dataResults[0].columns;
                dataResults[0].values.forEach(valueRow => {
                    const row = {};
                    columnNames.forEach((colName, index) => { row[colName] = valueRow[index]; });
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${row.Anno !== undefined && row.Anno !== null ? row.Anno : ''}</td>
                        <td>${row.DataMandato ? new Date(row.DataMandato).toLocaleDateString('it-IT') : ''}</td>
                        <td>${row.Beneficiario || ''}</td>
                        <td>${row.ImportoEuro !== undefined && row.ImportoEuro !== null ? parseFloat(row.ImportoEuro).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : ''}</td>
                        <td>${row.DescrizioneMandato || ''}</td>
                        <td>${row.NumeroMandato !== undefined && row.NumeroMandato !== null ? row.NumeroMandato : ''}</td>
                    `;
                    resultsBody.appendChild(tr);
                    displayedRowCount++;
                });
            }
        } catch(e) {
             console.error("Errore query dati:", e);
             errorMessageElement.textContent = `Errore nel recupero dati: ${e.message}`;
             errorMessageElement.style.display = 'block';
        }

        updatePaginationInfo(displayedRowCount);
        loadingStatus.style.display = 'none'; 
        updateActionButtonsVisibility();
        updateSortArrows();
    }

    function updatePaginationInfo(displayedRows) {
        totalRowsHeaderSpan.textContent = currentQueryState.totalRows.toLocaleString('it-IT');
        totalRowsFooterSpan.textContent = currentQueryState.totalRows.toLocaleString('it-IT');
        currentRowsSpan.textContent = displayedRows.toLocaleString('it-IT');
        currentPageSpan.textContent = currentQueryState.currentPage.toLocaleString('it-IT');
        totalPagesSpan.textContent = currentQueryState.totalPages.toLocaleString('it-IT');
        paginationTotalPagesSpan.textContent = currentQueryState.totalPages.toLocaleString('it-IT');
        pageInput.value = currentQueryState.currentPage;
        pageInput.max = currentQueryState.totalPages > 0 ? currentQueryState.totalPages : 1;

        const noResults = currentQueryState.totalRows === 0;
        firstPageButton.disabled = currentQueryState.currentPage === 1 || noResults;
        prevPageButton.disabled = currentQueryState.currentPage === 1 || noResults;
        nextPageButton.disabled = currentQueryState.currentPage === currentQueryState.totalPages || noResults;
        lastPageButton.disabled = currentQueryState.currentPage === currentQueryState.totalPages || noResults;
        pageInput.disabled = currentQueryState.totalPages <= 1; // Disabilita se 1 o 0 pagine
    }

    loadAndInitializeDb();
});