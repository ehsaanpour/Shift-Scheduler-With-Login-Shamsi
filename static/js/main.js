/**
 * Shift Scheduler - Main JavaScript
 */

// Define Persian month names globally or within DOMContentLoaded
const PERSIAN_MONTH_NAMES = [
    "", // Index 0 is unused
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", 
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];
// Define Persian day names (optional, but useful for display)
const PERSIAN_DAY_NAMES = [
    "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"
];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Shift Scheduler loaded!');
    
    // Initialize year and month dropdowns using Jalali calendar
    initJalaliYearDropdown(); 
    initJalaliMonthDropdown();
    
    // Load engineers on page load
    loadEngineers(); // This will trigger generateCalendars after loading
    
    // Event listeners
    setupEventListeners();
});

// Initialize year dropdown based on current Jalali year
function initJalaliYearDropdown() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) return;

    // Get current Gregorian date
    const currentGregorianDate = new Date();
    // Convert to Jalali
    const currentJalaliDate = jalaali.toJalaali(currentGregorianDate);
    const currentJalaliYear = currentJalaliDate.jy;

    yearSelect.innerHTML = ''; // Clear existing options if any
    
    // Populate with Jalali years (e.g., current year ± 5 years)
    for (let year = currentJalaliYear - 5; year <= currentJalaliYear + 5; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year; // Display Jalali year
        if (year === currentJalaliYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
}

// Initialize month dropdown with Persian month names
function initJalaliMonthDropdown() {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;

    // Get current Jalali month
    const currentJalaliMonth = jalaali.toJalaali(new Date()).jm;

    monthSelect.innerHTML = ''; // Clear existing options

    PERSIAN_MONTH_NAMES.forEach((name, index) => {
        if (index === 0) return; // Skip the empty first element
        const option = document.createElement('option');
        option.value = index; // Month number (1-12)
        option.textContent = name; // Persian month name
        if (index === currentJalaliMonth) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    });
}

// Variables to store pattern data
let currentPattern = {};
let currentPatternWorkplace = '';

// Set up event listeners for interactive elements
function setupEventListeners() {
    // Save engineer button
    const saveEngineerBtn = document.getElementById('btnSaveEngineer');
    if (saveEngineerBtn) {
        saveEngineerBtn.addEventListener('click', saveEngineer);
    }
    
    // Save schedule button
    const saveScheduleBtn = document.getElementById('btnSaveSchedule');
    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', saveSchedule);
    }
    
    // Generate Excel button
    const generateBtn = document.getElementById('btnGenerate');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateExcel);
    }
    
    // Auto-Assign Engineers button
    const autoAssignBtn = document.getElementById('btnAutoAssign');
    if (autoAssignBtn) {
        autoAssignBtn.addEventListener('click', autoAssignEngineers);
    }
    
    // Import Pattern buttons
    const importPatternBtns = document.querySelectorAll('.import-pattern-btn');
    importPatternBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const workplace = this.dataset.workplace;
            openImportPatternModal(workplace);
        });
    });
    
    // Pattern file input change
    const patternFileInput = document.getElementById('patternFile');
    if (patternFileInput) {
        patternFileInput.addEventListener('change', function() {
            const previewBtn = document.getElementById('btnPreviewPattern');
            const applyBtn = document.getElementById('btnApplyPattern');
            
            if (this.files.length > 0) {
                previewBtn.disabled = false;
            } else {
                previewBtn.disabled = true;
                applyBtn.disabled = true;
                
                // Hide preview
                const previewSection = document.getElementById('patternPreview');
                previewSection.classList.add('d-none');
            }
        });
    }
    
    // Preview Pattern button
    const previewPatternBtn = document.getElementById('btnPreviewPattern');
    if (previewPatternBtn) {
        previewPatternBtn.addEventListener('click', previewPattern);
    }
    
    // Apply Pattern button
    const applyPatternBtn = document.getElementById('btnApplyPattern');
    if (applyPatternBtn) {
        applyPatternBtn.addEventListener('click', applyPattern);
    }
    
    // Month and year select
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect && yearSelect) {
        monthSelect.addEventListener('change', generateCalendars);
        yearSelect.addEventListener('change', generateCalendars);
    }
    
    // Save limitations button
    const saveLimitationsBtn = document.getElementById('btnSaveLimitations');
    if (saveLimitationsBtn) {
        saveLimitationsBtn.addEventListener('click', window.saveLimitations);
    }
}

// Load engineers from API
function loadEngineers() {
    console.log('Attempting to load engineers from server...');
    
    fetch('/api/engineers')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Successfully loaded ${data.length} engineers from server`);
            
            // Ensure each engineer has a limitations property
            window.engineers = data.map(eng => {
                // Ensure limitations are properly structured with string keys
                const formattedLimitations = {};
                if (eng.limitations) {
                    Object.keys(eng.limitations).forEach(day => {
                        // Ensure day is stored as string
                        formattedLimitations[String(day)] = eng.limitations[day];
                    });
                }
                
                return {
                    ...eng,
                    limitations: formattedLimitations
                };
            });
            
            console.log('Processed engineers with formatted limitations:', window.engineers);
            updateEngineersList();
            generateCalendars();
        })
        .catch(error => {
            console.error('Error loading engineers:', error);
            showAlert(`Failed to load engineers: ${error.message}. Please refresh the page.`, 'danger');
        });
}

// Update the engineers list in the UI
function updateEngineersList() {
    const engineersList = document.getElementById('engineersList');
    if (!engineersList) return;
    
    engineersList.innerHTML = '';
    
    if (!window.engineers || window.engineers.length === 0) {
        engineersList.innerHTML = '<div class="alert alert-info">No engineers added yet.</div>';
        return;
    }
    
    window.engineers.forEach(eng => {
        const card = document.createElement('div');
        card.classList.add('card', 'mb-2');
        
        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body', 'p-2');
        
        const nameRow = document.createElement('div');
        nameRow.classList.add('d-flex', 'justify-content-between', 'align-items-center');
        
        const name = document.createElement('h6');
        name.classList.add('mb-1');
        name.textContent = eng.name;
        
        const actions = document.createElement('div');
        
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'me-1');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.addEventListener('click', () => editEngineer(eng));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => deleteEngineer(eng.name));
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        nameRow.appendChild(name);
        nameRow.appendChild(actions);
        
        const workplaces = document.createElement('small');
        workplaces.classList.add('text-muted');
        workplaces.textContent = `Workplaces: ${eng.workplaces.join(', ')}`;
        
        cardBody.appendChild(nameRow);
        cardBody.appendChild(workplaces);
        
        card.appendChild(cardBody);
        engineersList.appendChild(card);
    });
}

// Edit engineer
function editEngineer(engineer) {
    const nameInput = document.getElementById('engineerName');
    if (!nameInput) return;
    
    nameInput.value = engineer.name;
    
    // Uncheck all workplaces
    document.querySelectorAll('.workplace-check').forEach(check => {
        check.checked = false;
    });
    
    // Check relevant workplaces
    engineer.workplaces.forEach(workplace => {
        const checkId = `check-${workplace.replace(/\s+/g, '-').toLowerCase()}`;
        const checkbox = document.getElementById(checkId);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addEngineerModal'));
    modal.show();
}

// Save engineer
function saveEngineer() {
    const nameInput = document.getElementById('engineerName');
    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    if (!name) {
        showAlert('Please enter engineer name', 'warning');
        return;
    }
    
    const workplaces = [];
    document.querySelectorAll('.workplace-check:checked').forEach(check => {
        workplaces.push(check.value);
    });
    
    if (workplaces.length === 0) {
        showAlert('Please select at least one workplace', 'warning');
        return;
    }
    
    // Find existing engineer to preserve limitations and shift limits
    let existingLimitations = {};
    let minShifts = 10;
    let maxShifts = 30;
    
    if (window.engineers) {
        const existingEngineer = window.engineers.find(eng => eng.name === name);
        if (existingEngineer) {
            console.log(`Found existing engineer: ${name}`, existingEngineer);
            
            if (existingEngineer.limitations) {
                existingLimitations = existingEngineer.limitations;
            }
            if (existingEngineer.minShifts) {
                minShifts = existingEngineer.minShifts;
            }
            if (existingEngineer.maxShifts) {
                maxShifts = existingEngineer.maxShifts;
            }
        } else {
            console.log(`Adding new engineer: ${name}`);
        }
    }
    
    // Create payload
    const payload = {
        name,
        workplaces,
        limitations: existingLimitations,
        minShifts: minShifts,
        maxShifts: maxShifts
    };
    
    console.log('Saving engineer with payload:', payload);
    
    // Show loading state
    const saveBtn = document.getElementById('btnSaveEngineer');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    fetch('/api/engineers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log('Engineer saved successfully');
            
            // Reset form
            document.getElementById('engineerForm').reset();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEngineerModal'));
            modal.hide();
            
            // Show success message
            showAlert('Engineer saved successfully!', 'success');
            
            // Reload engineers
            console.log('Reloading engineers after successful save');
            loadEngineers();
        } else {
            throw new Error(`Server returned error status: ${data.status}`);
        }
    })
    .catch(error => {
        console.error('Error saving engineer:', error);
        showAlert(`Failed to save engineer: ${error.message}. Please try again.`, 'danger');
    })
    .finally(() => {
        // Reset button state
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    });
}

// Delete engineer
function deleteEngineer(name) {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
        fetch(`/api/engineers/${name}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showAlert(`Engineer "${name}" deleted successfully`, 'success');
                loadEngineers();
            }
        })
        .catch(error => {
            console.error('Error deleting engineer:', error);
            showAlert('Failed to delete engineer. Please try again.', 'danger');
        });
    }
}

// Generate calendar tables for all workplaces
function generateCalendars() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect) return; // Ensure selects exist
    
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    
    console.log(`Generating calendar for Jalali Year: ${year}, Month: ${month} (${PERSIAN_MONTH_NAMES[month]})`);
    
    // Validate Jalali date before proceeding
    if (!jalaali.isValidJalaaliDate(year, month, 1)) {
        console.error(`Invalid Jalali date selected: ${year}-${month}-1`);
        showAlert('Invalid Jalali date selected. Please check year and month.', 'danger');
        // Optionally clear the schedule area or show an error message in the UI
        document.querySelectorAll('[id^="schedule-"]').forEach(container => {
            container.innerHTML = '<div class="alert alert-danger">Invalid Jalali date selected.</div>';
        });
        return;
    }

    // Get number of days in the Jalali month
    const daysInMonth = jalaali.jalaaliMonthLength(year, month);
    console.log(`Days in month: ${daysInMonth}`);
    
    // Get the Gregorian date for the 1st of the Jalali month to find the starting weekday
    const firstDayGregorian = jalaali.toGregorian(year, month, 1);
    const firstDayDateObject = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd);
    let startingDayOfWeek = firstDayDateObject.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    
    // Adjust so that Saturday (Persian start of week) is 0
    startingDayOfWeek = (startingDayOfWeek + 1) % 7; // 0=Sat, 1=Sun, ..., 6=Fri
    console.log(`Starting day of week (0=Sat): ${startingDayOfWeek}`);

    // Get the list of workplaces from the tabs
    const workplaces = Array.from(document.querySelectorAll('#workplaceTabs .nav-link')).map(tab => tab.textContent.trim());
    
    // For each workplace, generate the table
    document.querySelectorAll('[id^="schedule-"]').forEach(container => {
        const workplaceId = container.id.replace('schedule-', '');
        // Convert ID back to name (assuming names don't have special chars other than space)
        const workplaceName = workplaceId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); 
        
        // Create table
        const table = document.createElement('table');
        table.className = 'table table-bordered schedule-table'; // Add a class for potential styling
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Day', 'Shift 1', 'Shift 2', 'Shift 3'];
        
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.className = 'text-center'; // Center headers
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        for (let day = 1; day <= daysInMonth; day++) {
            // Get Gregorian date for this specific Jalali day to check weekend
            const currentGregorian = jalaali.toGregorian(year, month, day);
            const currentDayDateObject = new Date(currentGregorian.gy, currentGregorian.gm - 1, currentGregorian.gd);
            const currentDayOfWeek = currentDayDateObject.getDay(); // 0=Sun, 6=Sat
            
            // Determine weekend based on Gregorian (Sat/Sun) - Adjust if needed for Fri/Sat
            const isWeekend = (currentDayOfWeek === 6 || currentDayOfWeek === 0); // Original: Sat/Sun
            // const isFriday = (currentDayOfWeek === 5); // Alternative: Friday only
            
            const row = document.createElement('tr');
            if (isWeekend) {
                row.classList.add('table-light'); // Style weekends lightly
            }
            
            // Day column
            const dayCell = document.createElement('td');
            dayCell.className = 'fw-bold'; // Make day bold
            // Display just the day number (and potentially Persian day name)
            const persianDayIndex = (currentDayOfWeek + 1) % 7; // Calculate Persian index (0=Sat)
            dayCell.textContent = `${day} (${PERSIAN_DAY_NAMES[persianDayIndex]})`; // e.g., "1 (شنبه)"
            row.appendChild(dayCell);
            
            // Shift columns
            for (let shift = 1; shift <= 3; shift++) {
                const cell = document.createElement('td');
                
                const select = document.createElement('select');
                select.className = 'form-select form-select-sm engineer-select'; // Use smaller selects
                select.dataset.day = day;
                select.dataset.shift = `shift${shift}`;
                select.dataset.workplace = workplaceName;
                
                // Add change event handler (keep existing logic)
                select.addEventListener('change', function() { 
                    // Delay highlighting to ensure all changes are processed
                    setTimeout(() => {
                        // Make sure to pass the JALALI year/month here!
                        highlightChallengingShiftPatterns(year, month);
                    }, 100);
                });
                
                // Empty option
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = '---'; // Shorter placeholder
                select.appendChild(emptyOption);
                
                // Filter engineers who can work in this workplace
                if (window.engineers) { // Ensure engineers are loaded
                    window.engineers.filter(eng => eng.workplaces.includes(workplaceName))
                        .forEach(eng => {
                            const option = document.createElement('option');
                            option.value = eng.name;
                            option.textContent = eng.name;
                            select.appendChild(option);
                        });
                }
                
                cell.appendChild(select);
                row.appendChild(cell);
            }
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);
        container.innerHTML = ''; // Clear previous table
        container.appendChild(table);
    });
    
    // Load schedule data for this Jalali month/year
    loadSchedule(year, month);
}

// Load schedule from API
function loadSchedule(year, month) {
    fetch(`/api/schedule?year=${year}&month=${month}`)
        .then(response => response.json())
        .then(data => {
            // First, always reset all selects and remove highlights
            document.querySelectorAll('.engineer-select').forEach(select => {
                select.value = '';
                select.classList.remove('three-shifts-warning', 'consecutive-days-warning');
            });
            
            // Update in-memory schedule
            window.currentSchedule = data || {};
            console.log('Loaded schedule:', window.currentSchedule);
            
            // Check if the schedule is empty or missing
            const isEmpty = !data || Object.keys(data).length === 0;
            
            if (!isEmpty) {
                // Only populate selects if we have data
                document.querySelectorAll('.engineer-select').forEach(select => {
                    const workplace = select.dataset.workplace;
                    const day = select.dataset.day;
                    const shift = select.dataset.shift;
                    
                    if (data[workplace] && 
                        data[workplace][day] && 
                        data[workplace][day][shift]) {
                        select.value = data[workplace][day][shift];
                    }
                });
                
                // Apply highlighting only if we have data
                if (typeof highlightChallengingShiftPatterns === 'function') {
                    highlightChallengingShiftPatterns(year, month);
                }
            }
        })
        .catch(error => {
            console.error('Error loading schedule:', error);
            showAlert('Failed to load schedule data.', 'danger');
        });
}

// Save schedule
function saveSchedule() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect) return;
    
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    
    // Collect schedule data
    const workplaces = {};
    
    document.querySelectorAll('.engineer-select').forEach(select => {
        if (select.value) {
            const workplace = select.dataset.workplace;
            const day = select.dataset.day;
            const shift = select.dataset.shift;
            
            if (!workplaces[workplace]) {
                workplaces[workplace] = {};
            }
            
            if (!workplaces[workplace][day]) {
                workplaces[workplace][day] = {};
            }
            
            workplaces[workplace][day][shift] = select.value;
        }
    });
    
    fetch('/api/schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            year,
            month,
            workplaces
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showAlert('Schedule saved successfully!', 'success');
            loadSchedule(year, month);
        }
    })
    .catch(error => {
        console.error('Error saving schedule:', error);
        showAlert('Failed to save schedule. Please try again.', 'danger');
    });
}

// Generate Excel files
function generateExcel() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect) return;
    
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-card">
            <div class="d-flex align-items-center">
                <div class="spinner-border text-primary me-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div>
                    <h5 class="mb-0">Generating Excel Files</h5>
                    <small>Please wait, this may take a few moments...</small>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    // Use setTimeout to prevent UI freezing
    setTimeout(() => {
        fetch('/api/generate_excel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                year,
                month
            })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('No schedule data found for the selected period. Please save your schedule first.');
                }
                throw new Error('Failed to generate Excel files');
            }
            return response.json();
        })
        .then(data => {
            // Remove loading indicator
            document.body.removeChild(loadingDiv);
            
            if (data.status === 'success') {
                const downloadList = document.getElementById('downloadList');
                if (!downloadList) return;
                
                downloadList.innerHTML = '';
                
                data.files.forEach(file => {
                    const li = document.createElement('li');
                    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                    
                    const fileName = document.createElement('span');
                    fileName.textContent = file;
                    
                    const downloadLink = document.createElement('a');
                    downloadLink.href = `/api/download/${file}`;
                    downloadLink.classList.add('btn', 'btn-sm', 'btn-outline-primary');
                    downloadLink.innerHTML = '<i class="fas fa-download me-1"></i> Download';
                    downloadLink.download = file;
                    
                    li.appendChild(fileName);
                    li.appendChild(downloadLink);
                    downloadList.appendChild(li);
                });
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('excelGeneratedModal'));
                modal.show();
            }
        })
        .catch(error => {
            // Remove loading indicator
            if (document.body.contains(loadingDiv)) {
                document.body.removeChild(loadingDiv);
            }
            
            console.error('Error generating Excel files:', error);
            showAlert('Failed to generate Excel files. Please make sure you have saved the schedule.', 'danger');
        });
    }, 50); // Small delay to allow the UI to update
}

// Show alert message
function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to page
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 5000);
    }
}

// Auto-assign engineers to shifts
function autoAssignEngineers() {
    // Get month and year for the schedule
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect) return;
    
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    
    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // If no engineers, show message
    if (!window.engineers || window.engineers.length === 0) {
        showAlert('Please add engineers before auto-assigning shifts.', 'warning');
        return;
    }
    
    // Show confirmation dialog
    if (!confirm('This will automatically assign engineers to all empty shifts based on their workplace eligibility and limitations. Continue?')) {
        return;
    }
    
    // Debug engineers data
    console.log('Engineers before auto-assignment:', JSON.stringify(window.engineers));
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-card">
            <div class="d-flex align-items-center">
                <div class="spinner-border text-primary me-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div>
                    <h5 class="mb-0">Assigning Engineers</h5>
                    <small>Please wait, this may take a few moments...</small>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    // Track engineer assignments to distribute workload evenly
    const engineerAssignments = {};
    window.engineers.forEach(eng => {
        engineerAssignments[eng.name] = 0;
    });
    
    console.log("Starting auto-assignment with engineers:", window.engineers);
    
    // Prepare workplace elements and data for batch processing
    const workplaceElements = Array.from(document.querySelectorAll('[id^="schedule-"]'));
    const workplaceData = workplaceElements.map(workplaceElem => {
        const workplaceId = workplaceElem.id.replace('schedule-', '');
        const workplaceName = workplaceId.split('-').map(part => 
            part.charAt(0).toUpperCase() + part.slice(1)
        ).join(' ');
        
        // Filter engineers who can work in this workplace
        const eligibleEngineers = window.engineers.filter(eng => 
            eng.workplaces && eng.workplaces.includes(workplaceName)
        );
        
        console.log(`Workplace: ${workplaceName}, Eligible Engineers: ${eligibleEngineers.map(e => e.name).join(', ')}`);
        
        return {
            element: workplaceElem,
            name: workplaceName,
            eligible: eligibleEngineers
        };
    }).filter(wp => wp.eligible.length > 0);
    
    // Break processing into chunks to prevent browser freezing
    const batchSize = 5; // Process 5 days at a time
    let currentWorkplaceIndex = 0;
    let currentDay = 1;
    let totalAssignments = 0;
    
    function processBatch() {
        // If we've processed all workplaces, show results
        if (currentWorkplaceIndex >= workplaceData.length) {
            // Remove loading indicator
            document.body.removeChild(loadingDiv);
            
            // Show results
            showAssignmentResults(engineerAssignments);
            return;
        }
        
        const workplace = workplaceData[currentWorkplaceIndex];
        const startDay = currentDay;
        const endDay = Math.min(startDay + batchSize - 1, daysInMonth);
        
        console.log(`Processing workplace: ${workplace.name}, days ${startDay}-${endDay}`);
        
        for (let day = startDay; day <= endDay; day++) {
            for (let shift = 1; shift <= 3; shift++) {
                // Find the select element for this workplace, day, and shift
                const selectElem = workplace.element.querySelector(
                    `select[data-day="${day}"][data-shift="shift${shift}"][data-workplace="${workplace.name}"]`
                );
                
                // If select is not found or already has a value, skip
                if (!selectElem || selectElem.value !== '') {
                    continue;
                }
                
                const dayStr = String(day);
                const shiftKey = `shift${shift}`;
                
                // Filter eligible engineers considering their limitations
                const availableEngineers = workplace.eligible.filter(eng => {
                    // Debug individual engineer limitations
                    console.log(`Checking engineer ${eng.name} for ${workplace.name}, day ${day}, ${shiftKey}`);
                    console.log(`Engineer limitations:`, eng.limitations);
                    
                    // Check if the engineer has limitations for this day and shift
                    let hasLimitation = false;
                    
                    if (eng.limitations) {
                        // Check limitations with day as string (e.g., "1", "2", etc.)
                        if (eng.limitations[dayStr] && 
                            Array.isArray(eng.limitations[dayStr]) && 
                            eng.limitations[dayStr].includes(shiftKey)) {
                            hasLimitation = true;
                        }
                        
                        // Also check with day as number (for backward compatibility)
                        if (eng.limitations[day] && 
                            Array.isArray(eng.limitations[day]) && 
                            eng.limitations[day].includes(shiftKey)) {
                            hasLimitation = true;
                        }
                    }
                    
                    // Check if the engineer has reached their maximum shifts
                    const maxShifts = eng.maxShifts || 30;
                    if (engineerAssignments[eng.name] >= maxShifts) {
                        console.log(`Engineer ${eng.name} has reached maximum shifts (${maxShifts})`);
                        hasLimitation = true;
                    }
                    
                    if (hasLimitation) {
                        console.log(`Engineer ${eng.name} has limitation for day ${day}, ${shiftKey}`);
                    } else {
                        console.log(`Engineer ${eng.name} is available for day ${day}, ${shiftKey}`);
                    }
                    
                    return !hasLimitation;
                });
                
                console.log(`Available engineers for ${workplace.name}, day ${day}, ${shiftKey}:`, 
                    availableEngineers.map(e => e.name).join(', '));
                
                // If no available engineers after filtering by limitations, skip
                if (availableEngineers.length === 0) {
                    console.log(`No available engineers for ${workplace.name}, day ${day}, ${shiftKey}`);
                    continue;
                }
                
                // Sort engineers by priority:
                // 1. Engineers below minimum shifts requirement
                // 2. Engineers with fewest assignments
                const sortedEngineers = [...availableEngineers].sort((a, b) => {
                    const aMin = a.minShifts || 10;
                    const bMin = b.minShifts || 10;
                    
                    // If one engineer is below minimum and the other isn't, prioritize the one below minimum
                    const aIsBelowMin = engineerAssignments[a.name] < aMin;
                    const bIsBelowMin = engineerAssignments[b.name] < bMin;
                    
                    if (aIsBelowMin && !bIsBelowMin) return -1;
                    if (!aIsBelowMin && bIsBelowMin) return 1;
                    
                    // If both are below or above minimum, sort by number of assignments
                    return engineerAssignments[a.name] - engineerAssignments[b.name];
                });
                
                // Assign the engineer with highest priority
                if (sortedEngineers.length > 0) {
                    const assignedEngineer = sortedEngineers[0];
                    selectElem.value = assignedEngineer.name;
                    engineerAssignments[assignedEngineer.name]++;
                    totalAssignments++;
                    console.log(`Assigned ${assignedEngineer.name} to ${workplace.name}, day ${day}, ${shiftKey}`);
                }
            }
        }
        
        // Update progress for next batch
        currentDay = endDay + 1;
        if (currentDay > daysInMonth) {
            currentDay = 1;
            currentWorkplaceIndex++;
        }
        
        // Process next batch asynchronously
        setTimeout(processBatch, 0);
    }
    
    // Start batch processing
    setTimeout(processBatch, 0);
}

// Show assignment results in modal
function showAssignmentResults(engineerAssignments) {
    // Verify we have assignment data to display
    console.log("Engineer Assignments:", engineerAssignments);
    
    // Calculate total assignments
    const totalAssignments = Object.values(engineerAssignments).reduce((sum, count) => sum + count, 0);
    
    // Filter only engineers that were assigned (count > 0)
    const assignedEngineers = Object.entries(engineerAssignments)
        .filter(([_, count]) => count > 0);
    
    console.log("Filtered Assigned Engineers:", assignedEngineers);
    console.log("Total Assignments:", totalAssignments);
    
    // Run highlighting before showing the modal to ensure patterns are identified
    try {
        const year = parseInt(document.getElementById('yearSelect').value);
        const month = parseInt(document.getElementById('monthSelect').value);
        if (typeof highlightChallengingShiftPatterns === 'function') {
            console.log("Applying highlighting after auto-assign");
            highlightChallengingShiftPatterns(year, month);
        }
    } catch (error) {
        console.error("Error applying highlighting:", error);
    }
    
    // Show success message with count
    if (totalAssignments > 0) {
        showAlert(`Successfully assigned ${totalAssignments} shifts to ${assignedEngineers.length} engineers!`, 'success');
    } else {
        showAlert('No shifts could be assigned. This may be due to limitations or workplace eligibility issues.', 'warning');
    }
    
    // Create table rows for each engineer
    const tableRows = assignedEngineers
        .sort((a, b) => b[1] - a[1]) // Sort by count (highest first)
        .map(([name, count]) => {
            return `
                <tr>
                    <td>${name}</td>
                    <td>${count}</td>
                </tr>
            `;
        }).join('');
    
    // Create table with assignment data
    const tableContent = assignedEngineers.length > 0 
        ? `
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>Engineer</th>
                            <th>Assigned Shifts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `
        : `<div class="alert alert-warning">
            <p><strong>No shifts were assigned.</strong></p>
            <p>Possible reasons:</p>
            <ul>
                <li>Engineers have too many limitations set for this month</li>
                <li>Engineers are not assigned to the required workplaces</li>
                <li>All shifts are already filled</li>
            </ul>
            <p>Try adjusting engineer limitations or workplace assignments and try again.</p>
          </div>`;
    
    // Show detailed modal with assignments
    const summaryContent = `
        <h5>Assignment Summary</h5>
        <p>Engineers have been assigned to shifts based on their workplace eligibility and limitations.</p>
        ${tableContent}
        ${totalAssignments > 0 ? `
        <div class="alert alert-warning mt-3">
            <i class="fas fa-exclamation-triangle me-2"></i> Remember to save the schedule to persist these assignments!
        </div>
        ` : ''}
    `;
    
    // Update modal content or create new modal
    const existingModal = document.getElementById('assignmentSummaryModal');
    if (existingModal) {
        // Update existing modal
        const modalBody = existingModal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = summaryContent;
        }
        
        // Simplify footer to only include Close button
        const modalFooter = existingModal.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="btnSaveAfterAssign">
                    <i class="fas fa-save me-1"></i> Save Schedule
                </button>
            `;
            
            // Add event listener to the Save Schedule button in the modal
            setTimeout(() => {
                const saveButton = document.getElementById('btnSaveAfterAssign');
                if (saveButton) {
                    saveButton.addEventListener('click', function() {
                        // Close the modal first
                        bootstrap.Modal.getInstance(existingModal).hide();
                        // Then save the schedule
                        saveSchedule();
                    });
                }
            }, 100);
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(existingModal);
        modal.show();
    } else {
        // Create a new modal
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'assignmentSummaryModal';
        modalDiv.tabIndex = -1;
        modalDiv.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title"><i class="fas fa-magic me-2"></i>Auto-Assignment Complete</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${summaryContent}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="btnSaveAfterAssign">
                            <i class="fas fa-save me-1"></i> Save Schedule
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalDiv);
        
        // Show the modal
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();
        
        // Add event listener to the Save Schedule button in the modal
        setTimeout(() => {
            const saveButton = document.getElementById('btnSaveAfterAssign');
            if (saveButton) {
                saveButton.addEventListener('click', function() {
                    // Close the modal first
                    modal.hide();
                    // Then save the schedule
                    saveSchedule();
                });
            }
        }, 100);
    }
}

// Open the Import Pattern modal
function openImportPatternModal(workplace) {
    // Store the current workplace
    currentPatternWorkplace = workplace;
    
    // Update modal title
    const workplaceNameElement = document.getElementById('patternWorkplaceName');
    if (workplaceNameElement) {
        workplaceNameElement.textContent = workplace;
    }
    
    // Reset form
    const patternForm = document.getElementById('patternUploadForm');
    if (patternForm) {
        patternForm.reset();
    }
    
    // Reset buttons
    const previewBtn = document.getElementById('btnPreviewPattern');
    const applyBtn = document.getElementById('btnApplyPattern');
    if (previewBtn) previewBtn.disabled = true;
    if (applyBtn) applyBtn.disabled = true;
    
    // Hide preview
    const previewSection = document.getElementById('patternPreview');
    if (previewSection) {
        previewSection.classList.add('d-none');
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('importPatternModal'));
    modal.show();
}

// Preview the pattern from uploaded Excel file
function previewPattern() {
    const fileInput = document.getElementById('patternFile');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showAlert('Please select an Excel file first.', 'warning');
        return;
    }
    
    // Show loading state
    const previewBtn = document.getElementById('btnPreviewPattern');
    const originalText = previewBtn.innerHTML;
    previewBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    previewBtn.disabled = true;
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    fetch('/api/pattern/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error uploading file. Server returned ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Store the pattern
            currentPattern = data.pattern;
            
            // Generate preview
            generatePatternPreview(data.pattern);
            
            // Enable apply button
            const applyBtn = document.getElementById('btnApplyPattern');
            applyBtn.disabled = false;
        } else {
            throw new Error('Failed to process pattern file');
        }
    })
    .catch(error => {
        console.error('Error processing pattern file:', error);
        showAlert('Failed to process pattern file: ' + error.message, 'danger');
    })
    .finally(() => {
        // Reset button state
        previewBtn.innerHTML = originalText;
        previewBtn.disabled = false;
    });
}

// Generate a preview of the pattern data
function generatePatternPreview(pattern) {
    const previewSection = document.getElementById('patternPreview');
    const previewTable = document.getElementById('patternPreviewTable');
    
    if (!previewSection || !previewTable) return;
    
    // Clear previous preview
    const tbody = previewTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Get current month and year to display correct day labels
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    
    // Create rows for each day
    Object.keys(pattern).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
        const date = new Date(year, month - 1, parseInt(day));
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayLabel = `${day} - ${dayOfWeek}`;
        
        const row = document.createElement('tr');
        
        // Day column
        const dayCell = document.createElement('td');
        dayCell.textContent = dayLabel;
        row.appendChild(dayCell);
        
        // Shift columns
        for (let shift = 1; shift <= 3; shift++) {
            const shiftKey = `shift${shift}`;
            const cell = document.createElement('td');
            cell.textContent = pattern[day][shiftKey] || '—';
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    });
    
    // Show the preview section
    previewSection.classList.remove('d-none');
}

// Apply the pattern to the schedule
function applyPattern() {
    if (!currentPattern || !currentPatternWorkplace) {
        showAlert('No pattern data available to apply.', 'warning');
        return;
    }
    
    // Get checkbox values
    const overrideExisting = document.getElementById('overrideExisting').checked;
    const respectLimitations = document.getElementById('respectLimitations').checked;
    
    // Show loading state
    const applyBtn = document.getElementById('btnApplyPattern');
    const originalText = applyBtn.innerHTML;
    applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Applying...';
    applyBtn.disabled = true;
    
    // Find the workplace tab content
    const workplaceId = currentPatternWorkplace.replace(/\s+/g, '-').toLowerCase();
    const workplaceElement = document.getElementById(`schedule-${workplaceId}`);
    
    if (!workplaceElement) {
        showAlert(`Could not find schedule for ${currentPatternWorkplace}`, 'danger');
        applyBtn.innerHTML = originalText;
        applyBtn.disabled = false;
        return;
    }
    
    // Count assignments
    let appliedCount = 0;
    let skippedDueToLimitations = 0;
    let skippedDueToExisting = 0;
    
    // For each day in the pattern
    Object.keys(currentPattern).forEach(day => {
        // For each shift in the day
        Object.keys(currentPattern[day]).forEach(shift => {
            const engineerName = currentPattern[day][shift];
            
            // Skip if no engineer assigned in pattern
            if (!engineerName) return;
            
            // Find the select element for this day and shift
            const selectElem = workplaceElement.querySelector(
                `select[data-day="${day}"][data-shift="${shift}"][data-workplace="${currentPatternWorkplace}"]`
            );
            
            if (!selectElem) return;
            
            // Check if there's already an assignment
            if (selectElem.value && !overrideExisting) {
                skippedDueToExisting++;
                return;
            }
            
            // Find engineer in options
            let engineerOption = null;
            for (let i = 0; i < selectElem.options.length; i++) {
                if (selectElem.options[i].textContent === engineerName) {
                    engineerOption = selectElem.options[i];
                    break;
                }
            }
            
            // Skip if engineer not found
            if (!engineerOption) return;
            
            // Check limitations if required
            if (respectLimitations) {
                // Find the engineer object
                const engineer = window.engineers.find(eng => eng.name === engineerName);
                
                // Skip if engineer not found
                if (!engineer) return;
                
                // Check if the engineer has limitations for this day and shift
                if (engineer.limitations && 
                    (engineer.limitations[day] || engineer.limitations[`${day}`]) &&
                    ((engineer.limitations[day] && engineer.limitations[day].includes(shift)) ||
                     (engineer.limitations[`${day}`] && engineer.limitations[`${day}`].includes(shift)))) {
                    skippedDueToLimitations++;
                    return;
                }
            }
            
            // Apply the assignment
            selectElem.value = engineerOption.value;
            appliedCount++;
        });
    });
    
    // --- Trigger highlight update after applying pattern ---
    const year = parseInt(document.getElementById('yearSelect').value);
    const month = parseInt(document.getElementById('monthSelect').value);
    if (typeof highlightChallengingShiftPatterns === 'function') {
        // Use setTimeout to allow the browser to update the DOM first
        setTimeout(() => {
            highlightChallengingShiftPatterns(year, month);
            console.log('Highlighting triggered after pattern apply.');
        }, 100); 
    }
    // --- End highlight update ---

    // Show results
    const message = `Applied ${appliedCount} assignments from the pattern.` +
        (skippedDueToLimitations > 0 ? ` Skipped ${skippedDueToLimitations} due to limitations.` : '') +
        (skippedDueToExisting > 0 ? ` Skipped ${skippedDueToExisting} due to existing assignments.` : '');
    
    showAlert(message, 'success');
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('importPatternModal')).hide();
    
    // Reset button state
    applyBtn.innerHTML = originalText;
    applyBtn.disabled = false;
}

// Make functions available globally
window.autoAssignEngineers = autoAssignEngineers;
window.saveSchedule = saveSchedule;
window.openImportPatternModal = openImportPatternModal;
window.previewPattern = previewPattern;
window.applyPattern = applyPattern;