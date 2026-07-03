/* =========================================================
   1. GLOBAL VARIABLES & UTILITIES
   ========================================================= */
const staticFields = [
    'name', 'fname', 'mname', 'dob', 'sex', 'blood', 
    'address', 'contact', 'email', 'caste', 'religion', 'nationality', 'marital',
    'work', 'hobbies', 'lang', 'date', 'copyright', 'watermark'
];

const fieldsToCapitalize = ['name', 'fname', 'mname', 'religion', 'caste', 'nationality'];

let academicData = [];
let customFields = [];
let saveTimeout;
let currentZoom = 1;

let profiles = { "Default": {} };
let currentProfile = "Default";
let baseImageObj = new Image();

function generateId() { return Math.random().toString(36).substr(2, 9); }

function showToast(message, icon = "fa-circle-info") {
    const container = document.getElementById('toast-container');
    if (!container) return; // Null-safe
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function triggerSaveIndicator() {
    const status = document.getElementById('save-status');
    if (!status) return; // Null-safe
    status.classList.add('show');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => { status.classList.remove('show'); }, 2000);
}

function toTitleCase(str) { 
    return str.replace(/\w\S*/g, function(txt) { 
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); 
    }); 
}

function formatSmartDate(dateStr) {
    if(!dateStr) return "";
    const d = new Date(dateStr);
    if(isNaN(d)) return dateStr;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const day = d.getDate();
    const suffix = (day % 10 == 1 && day != 11) ? 'st' : (day % 10 == 2 && day != 12) ? 'nd' : (day % 10 == 3 && day != 13) ? 'rd' : 'th';
    return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* =========================================================
   2. INITIALIZATION
   ========================================================= */
window.onload = () => {
    if (window.innerWidth <= 900) document.body.setAttribute('data-active-tab', 'editor');

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    }

    // Load Profiles
    const savedProfiles = localStorage.getItem('biodata_profiles');
    if(savedProfiles) profiles = JSON.parse(savedProfiles);
    const lastProfile = localStorage.getItem('biodata_active_profile');
    if(lastProfile && profiles[lastProfile]) currentProfile = lastProfile;

    updateProfileDropdown();

    // Load global settings securely (NULL-SAFE)
    const savedTemplate = localStorage.getItem('doc_template');
    const savedFont = localStorage.getItem('doc_font');
    const savedColor = localStorage.getItem('doc_color');
    const savedBorder = localStorage.getItem('doc_border') === 'true';
    const savedWatermark = localStorage.getItem('doc_watermark');
    const savedPageBreaks = localStorage.getItem('doc_pagebreaks') === 'true';
    
    const templateSel = document.getElementById('template-selector');
    if (templateSel && savedTemplate) templateSel.value = savedTemplate;
    
    const fontSel = document.getElementById('font-selector');
    if (fontSel && savedFont) fontSel.value = savedFont;
    
    const colorSel = document.getElementById('theme-color');
    if (colorSel && savedColor) colorSel.value = savedColor;
    
    const watermarkTog = document.getElementById('watermark-toggle');
    if (watermarkTog && savedWatermark !== null) watermarkTog.checked = (savedWatermark === 'true');
    
    const borderTog = document.getElementById('border-toggle');
    if (borderTog) borderTog.checked = savedBorder;
    
    const pageBreakTog = document.getElementById('page-break-toggle');
    if (pageBreakTog) pageBreakTog.checked = savedPageBreaks;
    
    applySettings(); 
    loadProfileData();
    setupDropzone();
};

/* =========================================================
   3. PROFILE MANAGER
   ========================================================= */
function updateProfileDropdown() {
    const sel = document.getElementById('profile-selector');
    if (!sel) return;
    sel.innerHTML = '';
    for(let p in profiles) {
        const opt = document.createElement('option');
        opt.value = p; opt.innerText = p;
        if(p === currentProfile) opt.selected = true;
        sel.appendChild(opt);
    }
}

function createNewProfile() {
    const name = prompt("Enter a name for the new profile (e.g. 'IT Resume'):");
    if(name && name.trim() !== '') {
        if(profiles[name]) return showToast("Profile name already exists!", "fa-xmark");
        profiles[name] = {};
        currentProfile = name;
        updateProfileDropdown();
        loadProfileData();
        showToast("Profile created!", "fa-check");
    }
}

function switchProfile() {
    const sel = document.getElementById('profile-selector');
    if(sel) currentProfile = sel.value;
    loadProfileData();
    showToast(`Switched to ${currentProfile}`, "fa-user-check");
}

function deleteProfile() {
    if(Object.keys(profiles).length <= 1) return showToast("Cannot delete the only profile.", "fa-triangle-exclamation");
    if(confirm(`Delete profile '${currentProfile}'?`)) {
        delete profiles[currentProfile];
        currentProfile = Object.keys(profiles)[0];
        updateProfileDropdown();
        loadProfileData();
        showToast("Profile deleted", "fa-check");
    }
}

function loadProfileData() {
    const data = profiles[currentProfile];
    
    // Reset Form First
    staticFields.forEach(field => {
        const el = document.getElementById(`in-${field}`);
        if(el) el.value = '';
    });
    
    document.querySelectorAll('.visibility-toggle').forEach(btn => {
        btn.classList.remove('hidden');
        const targetMatch = btn.getAttribute('onclick').match(/'([^']+)'/);
        if(targetMatch && document.getElementById(targetMatch[1])) {
            document.getElementById(targetMatch[1]).classList.remove('hide-in-doc');
        }
    });

    // Populate Data
    if (Object.keys(data).length > 0) {
        staticFields.forEach(field => {
            const el = document.getElementById(`in-${field}`);
            if (el && data[field] !== undefined) el.value = data[field];
        });
        academicData = data.academic && data.academic.length > 0 ? data.academic : defaultAcademic();
        customFields = data.custom || [];
        
        if(data.visibility) {
            for (let id in data.visibility) {
                if (!data.visibility[id]) {
                    const btn = document.querySelector(`button[onclick*="'${id}'"]`);
                    if(btn) toggleVisibility(id, btn, false);
                }
            }
        }

        // Restore Photo safely
        if(data.photoData) {
            baseImageObj.src = data.photoData;
            const editorControls = document.getElementById('image-editor-controls');
            const statusText = document.getElementById('photo-status-text');
            const dropzone = document.getElementById('photo-dropzone');
            
            if (editorControls) editorControls.style.display = 'block';
            if (statusText) statusText.innerText = "Click to Change Photo";
            if (dropzone) dropzone.style.padding = '0.5rem';
            
            baseImageObj.onload = () => {
                const bright = document.getElementById('filter-bright');
                const contrast = document.getElementById('filter-contrast');
                if (bright) bright.value = data.photoFilters?.bright || 100;
                if (contrast) contrast.value = data.photoFilters?.contrast || 100;
                processCanvasImage();
            };
        } else {
            resetPhotoStudio();
        }
    } else {
        academicData = defaultAcademic();
        customFields = [];
        resetPhotoStudio();
        const watermarkEl = document.getElementById('in-watermark');
        const copyrightEl = document.getElementById('in-copyright');
        if (watermarkEl) watermarkEl.value = "";
        if (copyrightEl) copyrightEl.value = "";
    }
    
    renderAcademicEditor();
    renderCustomEditor();
    updateData();
    localStorage.setItem('biodata_active_profile', currentProfile);
}

function defaultAcademic() {
    return [
        { id: generateId(), exam: "10th", board: "", year: "", perc: "" },
        { id: generateId(), exam: "12th", board: "", year: "", perc: "" },
        { id: generateId(), exam: "B.A / Degree", board: "", year: "", perc: "" }
    ];
}

/* =========================================================
   4. DYNAMIC DATA ENGINES
   ========================================================= */
function renderAcademicEditor() {
    const container = document.getElementById('academic-container');
    if (!container) return;
    container.innerHTML = '';
    academicData.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'dynamic-row';
        rowDiv.innerHTML = `
            <input type="text" placeholder="Exam" value="${row.exam}" oninput="updateAcademic('${row.id}', 'exam', this.value)">
            <input type="text" placeholder="Board / Uni" value="${row.board}" oninput="updateAcademic('${row.id}', 'board', this.value)">
            <input type="text" placeholder="Year" value="${row.year}" oninput="updateAcademic('${row.id}', 'year', this.value)">
            <input type="text" placeholder="Percentage" value="${row.perc}" oninput="updateAcademic('${row.id}', 'perc', this.value)">
            <button class="btn-remove" onclick="removeAcademicRow('${row.id}')"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(rowDiv);
    });
    renderAcademicPreview();
}

function renderAcademicPreview() {
    const previewBody = document.getElementById('out-academic-body');
    if (!previewBody) return;
    previewBody.innerHTML = '';
    academicData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.exam}</td><td>${row.board}</td><td>${row.year}</td><td>${row.perc}</td>`;
        previewBody.appendChild(tr);
    });
}

function addAcademicRow() { academicData.push({ id: generateId(), exam: "", board: "", year: "", perc: "" }); renderAcademicEditor(); updateData(); }
function removeAcademicRow(id) { academicData = academicData.filter(row => row.id !== id); renderAcademicEditor(); updateData(); }
function updateAcademic(id, field, value) { 
    const row = academicData.find(r => r.id === id); 
    if(row) row[field] = value; 
    updateData(); 
    renderAcademicPreview(); 
}

function renderCustomEditor() {
    const container = document.getElementById('custom-fields-container');
    if (!container) return;
    container.innerHTML = '';
    customFields.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'custom-row';
        rowDiv.innerHTML = `
            <input type="text" placeholder="Label (e.g. LinkedIn)" value="${row.label}" oninput="updateCustom('${row.id}', 'label', this.value)">
            <input type="text" placeholder="Value" value="${row.value}" oninput="updateCustom('${row.id}', 'value', this.value)">
            <button class="btn-remove" onclick="removeCustomField('${row.id}')"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(rowDiv);
    });
    renderCustomPreview();
}

function renderCustomPreview() {
    document.querySelectorAll('.custom-preview-row').forEach(el => el.remove());
    const previewBody = document.getElementById('out-custom-body');
    if (!previewBody) return;
    customFields.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'custom-preview-row';
        tr.innerHTML = `<td class="label">${row.label}</td><td class="colon">:</td><td class="value">${row.value}</td>`;
        previewBody.appendChild(tr);
    });
}

function addCustomField() { customFields.push({ id: generateId(), label: "", value: "" }); renderCustomEditor(); updateData(); }
function removeCustomField(id) { customFields = customFields.filter(row => row.id !== id); renderCustomEditor(); updateData(); }
function updateCustom(id, field, value) { 
    const row = customFields.find(r => r.id === id); 
    if(row) row[field] = value; 
    updateData(); 
    renderCustomPreview(); 
}

/* =========================================================
   5. CANVAS PHOTO STUDIO
   ========================================================= */
function setupDropzone() {
    const dropzone = document.getElementById('photo-dropzone');
    if (!dropzone) return;
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    ['dragleave', 'dragend'].forEach(type => { dropzone.addEventListener(type, () => dropzone.classList.remove('dragover')); });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault(); dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handlePhotoFile(e.dataTransfer.files[0]);
    });
}

function uploadPhoto(event) { if(event.target.files.length) handlePhotoFile(event.target.files[0]); }

function handlePhotoFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        baseImageObj.src = e.target.result;
        profiles[currentProfile].photoData = e.target.result; 
        
        const editorControls = document.getElementById('image-editor-controls');
        const statusText = document.getElementById('photo-status-text');
        const dropzone = document.getElementById('photo-dropzone');
        const bright = document.getElementById('filter-bright');
        const contrast = document.getElementById('filter-contrast');

        if (editorControls) editorControls.style.display = 'block';
        if (statusText) statusText.innerText = "Click to Change Photo";
        if (dropzone) dropzone.style.padding = '0.5rem';
        if (bright) bright.value = 100;
        if (contrast) contrast.value = 100;
        
        baseImageObj.onload = processCanvasImage;
        showToast("Photo loaded into Studio", "fa-camera-retro");
    };
    reader.readAsDataURL(file);
}

function processCanvasImage() {
    if(!baseImageObj.src) return;
    
    const canvas = document.getElementById('photo-canvas');
    const brightEl = document.getElementById('filter-bright');
    const contrastEl = document.getElementById('filter-contrast');
    const photoOutEl = document.getElementById('out-photo');
    
    if (!canvas || !photoOutEl) return;
    
    const ctx = canvas.getContext('2d');
    const b = brightEl ? brightEl.value : 100;
    const c = contrastEl ? contrastEl.value : 100;
    
    canvas.width = baseImageObj.width;
    canvas.height = baseImageObj.height;
    
    ctx.filter = `brightness(${b}%) contrast(${c}%)`;
    ctx.drawImage(baseImageObj, 0, 0, canvas.width, canvas.height);
    
    const finalDataUrl = canvas.toDataURL('image/png');
    photoOutEl.innerHTML = `<img src="${finalDataUrl}" alt="Passport Photo">`;
    photoOutEl.style.border = "none";
    
    profiles[currentProfile].photoFilters = { bright: b, contrast: c };
    localStorage.setItem('biodata_profiles', JSON.stringify(profiles));
}

function resetPhotoStudio() {
    baseImageObj.src = '';
    const editorControls = document.getElementById('image-editor-controls');
    const dropzone = document.getElementById('photo-dropzone');
    const statusText = document.getElementById('photo-status-text');
    const photoOutEl = document.getElementById('out-photo');

    if (editorControls) editorControls.style.display = 'none';
    if (dropzone) dropzone.style.padding = '1.5rem';
    if (statusText) statusText.innerText = "Drag & Drop or Click to Upload Photo";
    if (photoOutEl) {
        photoOutEl.innerHTML = '<span>Photo</span>';
        photoOutEl.style.border = "";
    }
}

/* =========================================================
   6. UI & VISIBILITY LOGIC
   ========================================================= */
function toggleVisibility(targetId, btn, doSave = true) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    const isHidden = targetElement.classList.toggle('hide-in-doc');
    isHidden ? btn.classList.add('hidden') : btn.classList.remove('hidden');

    if(doSave) {
        if(!profiles[currentProfile].visibility) profiles[currentProfile].visibility = {};
        profiles[currentProfile].visibility[targetId] = !isHidden;
        localStorage.setItem('biodata_profiles', JSON.stringify(profiles));
        triggerSaveIndicator();
    }
}

function zoomDoc(action) {
    const paper = document.getElementById('resume-document');
    const text = document.getElementById('zoom-level-text');
    if (!paper || !text) return;

    if (action === 'in' && currentZoom < 1.5) currentZoom += 0.1;
    else if (action === 'out' && currentZoom > 0.5) currentZoom -= 0.1;
    else if (action === 'reset') currentZoom = 1;
    paper.style.transform = `scale(${currentZoom})`;
    text.innerText = `${Math.round(currentZoom * 100)}%`;
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');
    
    document.body.setAttribute('data-active-tab', tabName);
    if (tabName === 'export') {
        setTimeout(() => { 
            const expPanel = document.getElementById('export-panel');
            if(expPanel) expPanel.scrollIntoView({ behavior: 'smooth' }); 
        }, 100);
    }
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 900) { document.body.removeAttribute('data-active-tab'); } 
    else if (!document.body.hasAttribute('data-active-tab')) { document.body.setAttribute('data-active-tab', 'editor'); }
});

function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
        if(icon) icon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        if(icon) icon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'light');
    }
}

/* =========================================================
   7. CORE DATA & SETTINGS BINDING
   ========================================================= */
function updateData() {
    let dataObj = profiles[currentProfile] || {};
    dataObj.academic = academicData;
    dataObj.custom = customFields;
    let filledCount = 0;

    staticFields.forEach(field => {
        const inputElement = document.getElementById(`in-${field}`);
        const outputElement = document.getElementById(`out-${field}`);
        
        if (inputElement && outputElement) {
            let val = inputElement.value;
            if (fieldsToCapitalize.includes(field) && val) val = toTitleCase(val);
            
            dataObj[field] = val; 
            if (val.trim() !== '' && field !== 'copyright' && field !== 'watermark') filledCount++;

            if (inputElement.type === 'date' && val) outputElement.innerText = formatSmartDate(val);
            else outputElement.innerText = val;
        }
    });

    const watermarkInput = document.getElementById('in-watermark');
    const watermarkOutput = document.getElementById('out-watermark');
    if (watermarkInput && watermarkOutput) {
        watermarkOutput.innerText = watermarkInput.value;
    }

    const activeFields = staticFields.length - 2; 
    const progressPercent = Math.round((filledCount / activeFields) * 100);
    
    document.querySelectorAll('.progress-fill').forEach(bar => bar.style.width = `${progressPercent}%`);
    document.querySelectorAll('[id^="progress-text"]').forEach(txt => txt.innerText = `${progressPercent}%`);

    profiles[currentProfile] = dataObj;
    localStorage.setItem('biodata_profiles', JSON.stringify(profiles));
    triggerSaveIndicator();
}

function applySettings() {
    // 1. Gather all inputs safely
    const templateEl = document.getElementById('template-selector');
    const fontEl = document.getElementById('font-selector');
    const colorEl = document.getElementById('theme-color');
    const borderEl = document.getElementById('border-toggle');
    const watermarkEl = document.getElementById('watermark-toggle');
    const pageBreakEl = document.getElementById('page-break-toggle');
    const paper = document.getElementById('resume-document');
    const hexLabel = document.getElementById('color-hex');

    // 2. Fallbacks if elements are missing
    const templateValue = templateEl ? templateEl.value : 'layout-classic';
    const fontValue = fontEl ? fontEl.value : "'Inter', sans-serif";
    const colorValue = colorEl ? colorEl.value : '#2563eb';
    const hasBorder = borderEl ? borderEl.checked : false;
    const hasWatermark = watermarkEl ? watermarkEl.checked : true;
    const hasPageBreaks = pageBreakEl ? pageBreakEl.checked : false;
    
    // 3. Apply to document
    if (paper) {
        paper.className = `resume-paper ${templateValue}`;
        if(hasBorder) paper.classList.add('has-border');
        if(hasWatermark) paper.classList.add('has-watermark');
        if(hasPageBreaks) paper.classList.add('show-page-breaks');
        paper.style.fontFamily = fontValue;
    }
    
    document.documentElement.style.setProperty('--accent-color', colorValue);
    if(hexLabel) hexLabel.innerText = colorValue.toUpperCase();

    // 4. Save to localStorage
    localStorage.setItem('doc_template', templateValue);
    localStorage.setItem('doc_font', fontValue);
    localStorage.setItem('doc_color', colorValue);
    localStorage.setItem('doc_border', hasBorder);
    localStorage.setItem('doc_watermark', hasWatermark);
    localStorage.setItem('doc_pagebreaks', hasPageBreaks);
}

function clearForm() {
    if (confirm("Clear all text from this profile?")) {
        profiles[currentProfile] = {};
        loadProfileData();
        showToast("Profile cleared", "fa-check");
    }
}

/* =========================================================
   8. EXPORT ENGINE
   ========================================================= */
function backupData() {
    const data = localStorage.getItem('biodata_profiles');
    if(!data) return showToast("No data to backup!", "fa-triangle-exclamation");
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "BioData_Pro_Backup.json";
    link.click();
    showToast("Backup saved!", "fa-cloud-arrow-down");
}

function restoreData(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            profiles = JSON.parse(e.target.result);
            localStorage.setItem('biodata_profiles', JSON.stringify(profiles));
            currentProfile = Object.keys(profiles)[0];
            updateProfileDropdown();
            loadProfileData();
            showToast("Database Restored!", "fa-cloud-arrow-up");
        } catch(err) { showToast("Invalid backup file", "fa-xmark"); }
    };
    reader.readAsText(file);
}

function validateForm() {
    const name = document.getElementById('in-name');
    const contact = document.getElementById('in-contact');
    let isValid = true;
    
    if(name && !name.value.trim()) { name.classList.add('input-error'); setTimeout(() => name.classList.remove('input-error'), 500); isValid = false; }
    if(contact && !contact.value.trim()) { contact.classList.add('input-error'); setTimeout(() => contact.classList.remove('input-error'), 500); isValid = false; }
    
    if(!isValid) {
        showToast("Please fill out Name and Contact No.", "fa-triangle-exclamation");
        if(window.innerWidth <= 900) switchTab('editor');
    }
    return isValid;
}

function resetZoomForExport() { 
    const paper = document.getElementById('resume-document');
    if(paper) paper.style.transform = `scale(1)`; 
}

function restoreZoomAfterExport() { 
    const paper = document.getElementById('resume-document');
    if(paper) paper.style.transform = `scale(${currentZoom})`; 
}

function downloadPDF() {
    if(!validateForm()) return;
    showToast("Preparing HD PDF...", "fa-spinner fa-spin");
    resetZoomForExport();
    
    const pageBreakTog = document.getElementById('page-break-toggle');
    const wasPageBreak = pageBreakTog ? pageBreakTog.checked : false;
    const paper = document.getElementById('resume-document');
    
    if(wasPageBreak && paper) paper.classList.remove('show-page-breaks');

    setTimeout(() => { 
        window.print(); 
        restoreZoomAfterExport(); 
        if(wasPageBreak && paper) paper.classList.add('show-page-breaks');
    }, 500); 
}

function downloadImage() {
    if(!validateForm()) return;
    showToast("Generating High-Res Image...", "fa-spinner fa-spin");
    const isMobile = window.innerWidth <= 900;
    if(isMobile) document.body.setAttribute('data-active-tab', 'preview');
    resetZoomForExport();
    
    const paper = document.getElementById('resume-document');
    if(!paper) return;
    
    const pageBreakTog = document.getElementById('page-break-toggle');
    const wasPageBreak = pageBreakTog ? pageBreakTog.checked : false;
    if(wasPageBreak) paper.classList.remove('show-page-breaks');

    setTimeout(() => {
        const originalBoxShadow = paper.style.boxShadow;
        paper.style.boxShadow = 'none'; 
        
        html2canvas(paper, { scale: 3, useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${currentProfile.replace(/\s+/g, '_')}_BioData.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            paper.style.boxShadow = originalBoxShadow;
            
            restoreZoomAfterExport();
            if(wasPageBreak) paper.classList.add('show-page-breaks');
            if(isMobile) document.body.setAttribute('data-active-tab', 'export');
            showToast("Image Downloaded!", "fa-check");
        });
    }, 400);
}

function downloadWord() {
    if(!validateForm()) return;
    showToast("Bundling Word Document...", "fa-spinner fa-spin");
    
    setTimeout(() => {
        const paper = document.getElementById('resume-document');
        if(!paper) return;

        const docClone = paper.cloneNode(true);
        docClone.querySelectorAll('.hide-in-doc').forEach(el => el.remove());
        
        const resumeContent = docClone.innerHTML;
        
        const fontEl = document.getElementById('font-selector');
        const colorEl = document.getElementById('theme-color');
        const borderEl = document.getElementById('border-toggle');
        
        const currentFont = fontEl ? fontEl.value.replace(/'/g, "") : "Arial, sans-serif";
        const themeColor = colorEl ? colorEl.value : "#000000";
        const hasBorder = borderEl ? borderEl.checked : false;
        
        let borderCSS = hasBorder ? `border: 4px double ${themeColor}; padding: 20px;` : "";

        const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Professional Bio-Data</title>
        <style>
            body { font-family: ${currentFont}, Arial, sans-serif; color: #000; padding: 20px; }
            .doc-border-wrap { ${borderCSS} }
            .doc-accent-strip, .doc-watermark { display: none; }
            .doc-header { text-align: center; margin-bottom: 20px; position: relative;}
            .header-content h1 { font-size: 24pt; color: ${themeColor}; border-bottom: 2px solid ${themeColor}; margin: 0; display: inline-block; padding-bottom: 5px;}
            .photo-box { position: absolute; right: 0; top: 0; width: 100px; height: 130px; border: 2px solid ${themeColor}; text-align: center; line-height: 130px; color: ${themeColor}; font-weight: bold;}
            .photo-box img { width: 100px; height: 130px; }
            table { width: 100%; border-collapse: collapse; font-size: 12pt; margin-bottom: 20px;}
            .bio-layout-table td { padding: 6px 0; vertical-align: top; border-bottom: 1px dashed #ccc;}
            .label { width: 180px; font-weight: bold; }
            .colon { width: 20px; text-align: center; font-weight: bold; }
            .fw-bold { font-weight: bold; }
            .doc-color-text { color: ${themeColor}; font-size: 16pt;}
            .doc-section-title { margin-top: 20px; margin-bottom: 10px; font-size: 14pt; font-weight: bold; color: ${themeColor}; border-left: 4px solid ${themeColor}; padding-left: 10px; background: #f9f9f9;}
            
            .academic-table, .academic-table th, .academic-table td { border: 1px solid #000; }
            .academic-table th { background-color: ${themeColor}; color: #fff; padding: 8px; text-align: center;}
            .academic-table td { padding: 8px; text-align: center; }
            
            .footer-signatures { margin-top: 50px; font-size: 12pt; }
            .signature-box { float: right; width: 150px; text-align: center; }
            .signature-line { border-top: 1px solid #000; padding-top: 5px; margin-bottom: 5px; width: 100%; height: 1px;}
            .date-box { float: left; }
            .document-copyright { text-align: center; font-size: 9pt; color: #666; margin-top: 50px; border-top: 1px solid #ccc; padding-top: 10px; clear: both;}
        </style>
        </head><body>`;
        
        const postHtml = "</body></html>";
        const html = preHtml + resumeContent + postHtml;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        const downloadLink = document.createElement("a");
        document.body.appendChild(downloadLink);
        downloadLink.href = url;
        downloadLink.download = `${currentProfile.replace(/\s+/g, '_')}_BioData.doc`;
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showToast("Word Document Downloaded!", "fa-check");
    }, 300);
}
