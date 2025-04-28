/**
 * Static Shift Handler - Handles shift-related functionality without relying on main.js
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add our event listeners - keeping it simple and focused
    setupClearAllShiftsButton();
});

/**
 * Set up the clear all shifts button with minimal functionality
 */
function setupClearAllShiftsButton() {
    const clearAllShiftsBtn = document.getElementById('btnClearShifts');
    if (clearAllShiftsBtn) {
        // Replace existing click handler with a simpler one
        clearAllShiftsBtn.addEventListener('click', function(event) {
            handleStaticClearAllShifts();
        });
    }
}

/**
 * Custom implementation to handle clearing all shifts - completely isolated
 */
function handleStaticClearAllShifts() {
    if (confirm('Are you sure you want to clear all shifts? This action cannot be undone.')) {
        console.log("[STATIC HANDLER] Clearing all shifts and highlights");
        
        // Clear all select values first
        document.querySelectorAll('.engineer-select').forEach(select => {
            select.value = '';
            select.classList.remove('three-shifts-warning', 'consecutive-days-warning');
        });
        
        // Get current month and year for saving
        const month = parseInt(document.getElementById('monthSelect').value);
        const year = parseInt(document.getElementById('yearSelect').value);
        
        // Build an empty workplaces object with the proper structure
        // Extract all unique workplaces from the select elements
        const workplaceSet = new Set();
        document.querySelectorAll('.engineer-select').forEach(select => {
            workplaceSet.add(select.dataset.workplace);
        });
        
        // Create an empty object for each workplace
        const emptyWorkplaces = {};
        workplaceSet.forEach(workplace => {
            emptyWorkplaces[workplace] = {};
        });
        
        console.log('[STATIC HANDLER] Clearing schedule with properly structured empty data:', emptyWorkplaces);
        
        // Simple API request to clear schedule with proper structure
        fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                year: year,
                month: month,
                workplaces: emptyWorkplaces
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('All shifts have been cleared successfully.');
                
                // Force reload the schedule to ensure UI is in sync with the server
                if (typeof loadScheduleStatic === 'function') {
                    loadScheduleStatic(year, month);
                } else if (typeof loadSchedule === 'function') {
                    loadSchedule(year, month);
                }
            }
        })
        .catch(error => {
            console.error('[STATIC HANDLER] Error clearing shifts:', error);
            alert('Failed to clear shifts. Please try again.');
        });
    }
}

function setupShiftHighlighting() {
    // Add change event listener to all engineer selects for highlighting
    const engineerSelects = document.querySelectorAll('.engineer-select');
    
    engineerSelects.forEach(select => {
        select.addEventListener('change', function() {
            // Only call the highlighting if the function exists
            if (typeof highlightChallengingShiftPatterns === 'function') {
                const year = parseInt(document.getElementById('yearSelect').value);
                const month = parseInt(document.getElementById('monthSelect').value);
                
                // Use a short timeout to allow the UI to update
                setTimeout(() => {
                    highlightChallengingShiftPatterns(year, month);
                }, 100);
            }
        });
    });
}

function setupSaveScheduleButton() {
    const saveScheduleBtn = document.getElementById('btnSaveSchedule');
    if (saveScheduleBtn) {
        // Add our own event listener with higher priority
        saveScheduleBtn.addEventListener('click', function(event) {
            // Prevent default behavior and stop propagation
            event.preventDefault();
            event.stopPropagation();
            
            handleStaticSaveSchedule();
            
            // Prevent further handling
            return false;
        }, true); // Use capturing phase to ensure this runs first
    }
}

/**
 * Set up the auto-assign button to ensure highlighting works after auto-assignment
 */
function setupAutoAssignButton() {
    const autoAssignBtn = document.getElementById('btnAutoAssign');
    if (autoAssignBtn) {
        autoAssignBtn.addEventListener('change', function(event) {
            // This event will fire when the change event bubbles up from the select elements
            // that were changed by the auto-assign function
            console.log("[STATIC HANDLER] Detected auto-assign change event");
            
            // Apply highlighting after a short delay
            setTimeout(() => {
                const year = parseInt(document.getElementById('yearSelect').value);
                const month = parseInt(document.getElementById('monthSelect').value);
                
                if (typeof highlightChallengingShiftPatterns === 'function') {
                    console.log("[STATIC HANDLER] Running highlighting after auto-assign");
                    highlightChallengingShiftPatterns(year, month);
                }
            }, 500);
        }, true);
        
        // Set up MutationObserver to watch for changes to the select elements
        // caused by the auto-assign function
        const observer = new MutationObserver((mutations) => {
            let valueChanged = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'value' && 
                    mutation.target.classList.contains('engineer-select')) {
                    valueChanged = true;
                }
            });
            
            if (valueChanged) {
                console.log("[STATIC HANDLER] Detected auto-assign mutation");
                
                // Apply highlighting after a short delay
                setTimeout(() => {
                    const year = parseInt(document.getElementById('yearSelect').value);
                    const month = parseInt(document.getElementById('monthSelect').value);
                    
                    if (typeof highlightChallengingShiftPatterns === 'function') {
                        console.log("[STATIC HANDLER] Running highlighting after auto-assign mutation");
                        highlightChallengingShiftPatterns(year, month);
                    }
                }, 500);
            }
        });
        
        // Observe all engineer-select elements for changes to their value attribute
        document.querySelectorAll('.engineer-select').forEach(select => {
            observer.observe(select, { attributes: true, attributeFilter: ['value'] });
        });
        
        // Add a click event handler that will run after the original handler finishes
        autoAssignBtn.addEventListener('click', function(event) {
            // Apply highlighting after auto-assign is done
            setTimeout(() => {
                console.log("[STATIC HANDLER] Running highlighting 2 seconds after auto-assign click");
                const year = parseInt(document.getElementById('yearSelect').value);
                const month = parseInt(document.getElementById('monthSelect').value);
                
                if (typeof highlightChallengingShiftPatterns === 'function') {
                    highlightChallengingShiftPatterns(year, month);
                }
            }, 2000);
        });
    }
}

/**
 * Custom implementation to handle saving schedule - completely isolated from main.js
 */
function handleStaticSaveSchedule() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    
    // Get the list of workplaces from the DOM
    const workplacesList = Array.from(document.querySelectorAll('.engineer-select'))
        .map(s => s.dataset.workplace)
        .filter((v, i, a) => a.indexOf(v) === i);
    
    console.log("[STATIC HANDLER] Detected workplaces for save:", workplacesList);
    
    // Initialize workplaces structure with empty objects for all workplaces
    const workplaces = {};
    workplacesList.forEach(workplace => {
        workplaces[workplace] = {};
    });
    
    // Check if we have any selected engineers at all
    let hasAnyAssignments = false;
    
    // Collect non-empty schedule data from all select elements
    document.querySelectorAll('.engineer-select').forEach(select => {
        if (select.value) {
            hasAnyAssignments = true;
            
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
    
    console.log('[STATIC HANDLER] Saving schedule with data:', workplaces);
    console.log('[STATIC HANDLER] Has assignments:', hasAnyAssignments);
    
    // Save the schedule to the server
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
            alert('Schedule saved successfully!');
            
            // If we have any assignments, reload the schedule
            // Otherwise, ensure all fields stay empty
            if (hasAnyAssignments) {
                console.log('[STATIC HANDLER] Schedule has assignments, reloading');
                loadScheduleStatic(year, month);
            } else {
                console.log('[STATIC HANDLER] Empty schedule, keeping all fields empty');
                // Just ensure all fields are still empty and highlights are removed
                document.querySelectorAll('.engineer-select').forEach(select => {
                    select.value = '';
                    select.classList.remove('three-shifts-warning', 'consecutive-days-warning');
                });
            }
            
            // Call highlighting after a short delay
            setTimeout(() => {
                if (typeof highlightChallengingShiftPatterns === 'function') {
                    highlightChallengingShiftPatterns(year, month);
                }
            }, 300);
        }
    })
    .catch(error => {
        console.error('[STATIC HANDLER] Error saving schedule:', error);
        alert('Failed to save schedule. Please try again.');
    });
}

/**
 * Static implementation of loading schedule
 */
function loadScheduleStatic(year, month) {
    console.log(`[STATIC HANDLER] Loading schedule for ${year}-${month}`);
    
    fetch(`/api/schedule?year=${year}&month=${month}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const schedule = data.schedule;
                
                // Clear all selects first
                document.querySelectorAll('.engineer-select').forEach(select => {
                    select.value = '';
                    select.classList.remove('three-shifts-warning', 'consecutive-days-warning');
                });
                
                // Populate the schedule selects
                for (const workplace in schedule) {
                    for (const day in schedule[workplace]) {
                        for (const shift in schedule[workplace][day]) {
                            const engineer = schedule[workplace][day][shift];
                            const selectId = `select-${workplace}-${day}-${shift}`;
                            const select = document.getElementById(selectId);
                            if (select) {
                                select.value = engineer;
                            }
                        }
                    }
                }
                
                console.log('[STATIC HANDLER] Schedule loaded successfully');
                
                // Call highlighting after a short delay if the function exists
                setTimeout(() => {
                    if (typeof highlightChallengingShiftPatterns === 'function') {
                        highlightChallengingShiftPatterns(year, month);
                    }
                }, 300);
            }
        })
        .catch(error => {
            console.error('[STATIC HANDLER] Error loading schedule:', error);
        });
}

/**
 * Override buttons in the auto-assign summary modal
 */
function handleAutoAssignModalButtons() {
    // Check if the modal exists
    const modal = document.getElementById('assignmentSummaryModal');
    if (!modal) return;
    
    // Find the Save Schedule button in the modal
    const saveBtn = modal.querySelector('button[onclick="saveSchedule()"]');
    if (saveBtn) {
        console.log("[STATIC HANDLER] Found and overriding Save Schedule button in auto-assign modal");
        // Replace the onclick handler with our custom function
        saveBtn.removeAttribute('onclick');
        saveBtn.addEventListener('click', function(event) {
            // Close the modal
            bootstrap.Modal.getInstance(modal).hide();
            // Use our static handler instead
            handleStaticSaveSchedule();
        });
    }
    
    // Find the Clear All button in the modal
    const clearBtn = modal.querySelector('button[onclick="clearAllShifts()"]');
    if (clearBtn) {
        console.log("[STATIC HANDLER] Found and overriding Clear All button in auto-assign modal");
        // Replace the onclick handler with our custom function
        clearBtn.removeAttribute('onclick');
        clearBtn.addEventListener('click', function(event) {
            // Close the modal
            bootstrap.Modal.getInstance(modal).hide();
            // Use our static handler instead
            handleStaticClearAllShifts();
        });
    }
}

// Use MutationObserver to watch for the auto-assign summary modal being added to the DOM
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check each added node
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.id === 'assignmentSummaryModal') {
                        console.log("[STATIC HANDLER] Detected auto-assign modal being added to DOM");
                        // Override the buttons in the modal
                        handleAutoAssignModalButtons();
                    } else if (node.nodeType === Node.ELEMENT_NODE && node.querySelector) {
                        // Check if any children are the modal
                        const modal = node.querySelector('#assignmentSummaryModal');
                        if (modal) {
                            console.log("[STATIC HANDLER] Detected auto-assign modal within added DOM node");
                            // Override the buttons in the modal
                            handleAutoAssignModalButtons();
                        }
                    }
                });
            }
        });
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also check for the modal periodically since it might already exist or get added in a way the observer doesn't catch
    const checkModalInterval = setInterval(() => {
        if (document.getElementById('assignmentSummaryModal')) {
            console.log("[STATIC HANDLER] Found auto-assign modal during interval check");
            handleAutoAssignModalButtons();
            
            // Clear the interval after finding the modal
            clearInterval(checkModalInterval);
        }
    }, 1000);
    
    // Stop checking after 20 seconds
    setTimeout(() => {
        clearInterval(checkModalInterval);
    }, 20000);
});

/**
 * Enhanced auto-assign function with better highlighting
 */
function enhanceAutoAssignProcess() {
    // Check if original autoAssignEngineers exists in the global scope
    if (typeof window.autoAssignEngineers !== 'function') return;
    
    // Store reference to the original function
    const originalAutoAssign = window.autoAssignEngineers;
    
    // Override with our enhanced version
    window.autoAssignEngineers = function() {
        console.log("[STATIC HANDLER] Running enhanced auto-assign");
        
        // Call the original function
        originalAutoAssign.apply(this, arguments);
        
        // Run our highlighting after delays to ensure it applies after all batches are processed
        const delays = [1000, 2000, 3000, 5000, 8000];
        
        delays.forEach(delay => {
            setTimeout(() => {
                console.log(`[STATIC HANDLER] Applying highlighting after auto-assign with ${delay}ms delay`);
                const year = parseInt(document.getElementById('yearSelect').value);
                const month = parseInt(document.getElementById('monthSelect').value);
                
                if (typeof highlightChallengingShiftPatterns === 'function') {
                    highlightChallengingShiftPatterns(year, month);
                }
            }, delay);
        });
    };
    
    console.log("[STATIC HANDLER] Successfully enhanced auto-assign process");
} 