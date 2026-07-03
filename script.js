/* =========================================================
   1. GLOBAL VARIABLES & UTILITIES
   ========================================================= */
const staticFields = [
    'name', 'fname', 'mname', 'dob', 'sex', 'blood', 
    'address', 'contact', 'email', 'caste', 'religion', 'nationality', 'marital',
    'work', 'hobbies', 'lang', 'date', 'copyright', 'watermark', 'qr'
];

// Sanitize Inputs: Capitalize Names naturally
const fieldsToCapitalize = ['name', 'fname', 'mname', 'religion', 'caste', 'nationality'];

let academicData = [];
let customFields = [];
let saveTimeout;
let currentZoom = 1;

let profiles = { "Default": {} };
let currentProfile = "Default";
let baseImageObj = new Image();

let isDrawing = false;
let sigCtx;
let sigCanvas;

function generateId() { return Math.random().toString(36).substr(2, 9); }

function showToast(message, icon = "fa-circle-info") {
    const container = document.getElementById('toast-container');
    if (!container) return; 
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function triggerSaveIndicator() {
    const status = document.getElementById('save-status');
    if (!status) return; 
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
    const formatEl = document.getElementById('date-format-selector');
    const format = formatEl ? formatEl.value : 'formal';
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const day = d.getDate();
    const year = d.getFullYear();
    const month = d.getMonth();
    
    if (format === 'standard') {
        const padDay = day < 10 ? '0'+day : day;
        const padMonth = month < 9 ? '0'+(month+1) : (month+1);
        return `${padDay}/${padMonth}/${year}`;
    } else if (format === 'us') {
        return `${months[month]} ${day < 10 ? '0'+day : day}, ${year}`;
    } else {
        const suffix = (day % 10 == 1 && day != 11) ? 'st' : (day % 10 == 2 && day != 12) ? 'nd' : (day % 10 == 3 && day != 13) ? 'rd' : 'th';
        return `${day}${suffix} ${months[month]} ${year}`;
    }
}

function getExportFilename(extension) {
    const nameInput = document.getElementById('in-name');
    let baseName = (nameInput && nameInput.value.trim() !== '') ? nameInput.value.trim().replace(/\s+/g, '_') : currentProfile.replace(/\s+/g, '_');
    return `${baseName}_BioData.${extension}`;
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

    const savedProfiles = localStorage.getItem('biodata_profiles');
    if(savedProfiles) profiles = JSON.parse(savedProfiles);
    const lastProfile = localStorage.getItem('biodata_active_profile');
    if(lastProfile && profiles[lastProfile]) currentProfile = lastProfile;

    updateProfileDropdown();

    const savedTemplate = localStorage.getItem('doc_template');
    const savedFont = localStorage.getItem('doc_font');
    const savedColor = localStorage.getItem('doc_color');
    const savedBorder = localStorage.getItem('doc_border') === 'true';
    const savedWatermark = localStorage.getItem('doc_watermark');
    const savedPageBreaks = localStorage.getItem('doc_pagebreaks') === 'true';
    const savedSpacing = localStorage.getItem('doc_spacing');
    const savedFontSize = localStorage.getItem('doc_font_size');
    const savedMargin = localStorage.getItem('doc_margin');
    const savedShape = localStorage.getItem('doc_photo_shape');
    const savedPaperSize = localStorage.getItem('doc_paper_size');
    
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

    const spacingEl = document.getElementById('doc-spacing');
    if (spacingEl && savedSpacing) spacingEl.value = savedSpacing;

    const fontSizeEl = document.getElementById('doc-font-size');
    if (fontSizeEl && savedFontSize) fontSizeEl.value = savedFontSize;

    const marginEl = document.getElementById('doc-margin');
    if (marginEl && savedMargin) marginEl.value = savedMargin;

    const shapeEl = document.getElementById('photo-shape');
    if (shapeEl && savedShape) shapeEl.value = savedShape;

    const paperSizeEl = document.getElementById('paper-size-selector');
    if (paperSizeEl && savedPaperSize) paperSizeEl.value = savedPaperSize;

    setupSignaturePad();
    setupSpyEngine();
    applySettings(); 
    loadProfileData();
    setupDropzone();
};

/* =========================================================
   3. SPY ENGINE (Live Focus Highlight)
   ========================================================= */
function setupSpyEngine() {
    staticFields.forEach(field => {
        const inputEl = document.getElementById(`in-${field}`);
        const outEl = document.getElementById(`out-${field}`);
        if(inputEl && outEl) {
            inputEl.addEventListener('focus', () => {
                document.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));
                outEl.classList.add('highlight-element');
            });
            inputEl.addEventListener('blur', () => outEl.classList.remove('highlight-element'));
        }
    });
}

/* =========================================================
   4. E-SIGNATURE PAD ENGINE (POINTER FIX)
   ========================================================= */
function setupSignaturePad() {
    sigCanvas = document.getElementById('sig-canvas');
    if(!sigCanvas) return;
    
    sigCtx = sigCanvas.getContext('2d');
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = 'round';
    updateSignatureColor();

    const getPos = (e) => {
        const rect = sigCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Exact coordinate mapping regardless of CSS scaling
        const scaleX = sigCanvas.width / rect.width;
        const scaleY = sigCanvas.height / rect.height;
        
        return { 
            x: (clientX - rect.left) * scaleX, 
            y: (clientY - rect.top) * scaleY 
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        sigCtx.beginPath();
        sigCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        sigCtx.lineTo(pos.x, pos.y);
        sigCtx.stroke();
    };

    const stopDraw = () => {
        if(isDrawing) {
            isDrawing = false;
            saveSignature();
        }
    };

    sigCanvas.addEventListener('mousedown', startDraw);
    sigCanvas.addEventListener('mousemove', draw);
    sigCanvas.addEventListener('mouseup', stopDraw);
    sigCanvas.addEventListener('mouseout', stopDraw);

    sigCanvas.addEventListener('touchstart', startDraw, {passive: false});
    sigCanvas.addEventListener('touchmove', draw, {passive: false});
    sigCanvas.addEventListener('touchend', stopDraw);
}

function updateSignatureColor() {
    if(sigCtx) {
        const colorEl = document.getElementById('sig-color');
        sigCtx.strokeStyle = colorEl ? colorEl.value : '#000000';
    }
}

function clearSignature() {
    if(!sigCtx) return;
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    const outSig = document.getElementById('out-signature');
    if(outSig) outSig.style.display = 'none';
    profiles[currentProfile].signatureData = null;
    localStorage.setItem('biodata_profiles', JSON.stringify(profiles));
    showToast("Signature cleared", "fa-eraser");
}

function saveSignature() {
    const dataURL = sigCanvas.toDataURL('image/png');
    const outSig = document.getElementById('out-signature');
    if(outSig) {
        outSig.src = dataURL;
        outSig.style.display = 'block';
    }
    profiles[currentProfile].signatureData = dataURL;
    localStorage.setItem('biodata_profiles', JSON.stringify(profiles));
    triggerSaveIndicator();
}

/* =========================================================
   5. PROFILE MANAGER
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
                const scale = document.getElementById('filter-scale');
                if (bright) bright.value = data.photoFilters?.bright || 100;
                if (contrast) contrast.value = data.photoFilters?.contrast || 100;
                if (scale) scale.value = data.photoFilters?.scale || 100;
                processCanvasImage();
            };
        } else {
            resetPhotoStudio();
        }

        if(data.signatureData) {
            const outSig = document.getElementById('out-signature');
            if(outSig) {
                outSig.src = data.signatureData;
                outSig.style.display = 'block';
            }
            if(sigCtx) {
                const img = new Image();
                img.onload = () => {
                    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
                    sigCtx.drawImage(img, 0, 0);
                };
                img.src = data.signatureData;
            }
        } else {
            if(sigCtx) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
            const outSig = document.getElementById('out-signature');
            if(outSig) outSig.style.display = 'none';
        }

    } else {
        academicData = defaultAcademic();
        customFields = [];
        resetPhotoStudio();
        if(sigCtx) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        const outSig = document.getElementById('out-signature');
        if(outSig) outSig.style.display = 'none';
        
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
        { id: generateId(), exam: "10th", board: "", stream: "", year: "", perc: "" },
        { id: generateId(), exam: "12th", board: "", stream: "", year: "", perc: "" },
        { id: generateId(), exam: "Graduation", board: "", stream: "", year: "", perc: "" }
    ];
}

/* =========================================================
   6. DYNAMIC DATA ENGINES 
   ========================================================= */
function renderAcademicEditor() {
    const container = document.getElementById('academic-container');
    if (!container) return;
    container.innerHTML = '';
    academicData.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'dynamic-row';
        rowDiv.innerHTML = `
            <input type="text" placeholder="Exam" value="${row.exam}" oninput="updateAcademic('${row.id}', 'exam', this.value)" onfocus="document.getElementById('section-academic').classList.add('highlight-element')" onblur="document.getElementById('section-academic').classList.remove('highlight-element')">
            <input type="text" placeholder="Board / Uni" value="${row.board}" oninput="updateAcademic('${row.id}', 'board', this.value)" onfocus="document.getElementById('section-academic').classList.add('highlight-element')" onblur="document.getElementById('section-academic').classList.remove('highlight-element')">
            <input type="text" placeholder="Stream/Subject(s)" value="${row.stream || ''}" oninput="updateAcademic('${row.id}', 'stream', this.value)" onfocus="document.getElementById('section-academic').classList.add('highlight-element')" onblur="document.getElementById('section-academic').classList.remove('highlight-element')">
            <input type="text" placeholder="Year" value="${row.year}" oninput="updateAcademic('${row.id}', 'year', this.value)" onfocus="document.getElementById('section-academic').classList.add('highlight-element')" onblur="document.getElementById('section-academic').classList.remove('highlight-element')">
            <input type="text" placeholder="Percentage" value="${row.perc}" oninput="updateAcademic('${row.id}', 'perc', this.value)" onfocus="document.getElementById('section-academic').classList.add('highlight-element')" onblur="document.getElementById('section-academic').classList.remove('highlight-element')">
            <div class="row-actions">
                <button class="btn-sort" onclick="moveAcademic('${row.id}', -1)" ${index===0?'disabled':''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn-sort" onclick="moveAcademic('${row.id}', 1)" ${index===academicData.length-1?'disabled':''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="btn-remove" onclick="removeAcademicRow('${row.id}')" title="Delete"><i class="fa-solid fa-xmark"></i></button>
            </div>
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
        tr.innerHTML = `<td>${row.exam}</td><td>${row.board}</td><td>${row.stream || ''}</td><td>${row.year}</td><td>${row.perc}</td>`;
        previewBody.appendChild(tr);
    });
}

function addAcademicRow() { academicData.push({ id: generateId(), exam: "", board: "", stream: "", year: "", perc: "" }); renderAcademicEditor(); updateData(); }
function removeAcademicRow(id) { academicData = academicData.filter(row => row.id !== id); renderAcademicEditor(); updateData(); }
function updateAcademic(id, field, value) { const row = academicData.find(r => r.id === id); if(row) row[field] = value; updateData(); renderAcademicPreview(); }

function moveAcademic(id, direction) {
    const index = academicData.findIndex(r => r.id === id);
    if(index < 0) return;
    const newIndex = index + direction;
    if(newIndex < 0 || newIndex >= academicData.length) return;
    const temp = academicData[index];
    academicData[index] = academicData[newIndex];
    academicData[newIndex] = temp;
    renderAcademicEditor();
    updateData();
}

function renderCustomEditor() {
    const container = document.getElementById('custom-fields-container');
    if (!container) return;
    container.innerHTML = '';
    customFields.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'custom-row';
        rowDiv.innerHTML = `
            <input type="text" placeholder="Label (e.g. LinkedIn)" value="${row.label}" oninput="updateCustom('${row.id}', 'label', this.value)">
            <input type="text" placeholder="Value" value="${row.value}" oninput="updateCustom('${row.id}', 'value', this.value)">
            <div class="row-actions">
                <button class="btn-sort" onclick="moveCustom('${row.id}', -1)" ${index===0?'disabled':''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn-sort" onclick="moveCustom('${row.id}', 1)" ${index===customFields.length-1?'disabled':''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="btn-remove" onclick="removeCustomField('${row.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
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
        const safeVal = row.value.replace(/^[-*]\s+/gm, '• ');
        tr.innerHTML = `<td class="label">${row.label}</td><td class="colon">:</td><td class="value">${safeVal}</td>`;
        previewBody.appendChild(tr);
    });
}

function addCustomField() { customFields.push({ id: generateId(), label: "", value: "" }); renderCustomEditor(); updateData(); }
function removeCustomField(id) { customFields = customFields.filter(row => row.id !== id); renderCustomEditor(); updateData(); }
function updateCustom(id, field, value) { const row = customFields.find(r => r.id === id); if(row) row[field] = value; updateData(); renderCustomPreview(); }
function moveCustom(id, direction) {
    const index = customFields.findIndex(r => r.id === id);
    if(index < 0) return;
    const newIndex = index + direction;
    if(newIndex < 0 || newIndex >= customFields.length) return;
    const temp = customFields[index];
    customFields[index] = customFields[newIndex];
    customFields[newIndex] = temp;
    renderCustomEditor();
    updateData();
}

/* =========================================================
   7. CANVAS PHOTO STUDIO (WITH ADVANCED CROP & SCALE)
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
        const scale = document.getElementById('filter-scale');

        if (editorControls) editorControls.style.display = 'block';
        if (statusText) statusText.innerText = "Click to Change Photo";
        if (dropzone) dropzone.style.padding = '0.5rem';
        if (bright) bright.value = 100;
        if (contrast) contrast.value = 100;
        if (scale) scale.value = 100;
        
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
    const scaleEl = document.getElementById('filter-scale');
    const photoOutEl = document.getElementById('out-photo');
    
    if (!canvas || !photoOutEl) return;
    
    const ctx = canvas.getContext('2d');
    const b = brightEl ? brightEl.value : 100;
    const c = contrastEl ? contrastEl.value : 100;
    const s = scaleEl ? (scaleEl.value / 100) : 1;
    
    // Set a strict internal resolution for high-quality export rendering
    canvas.width = 300; 
    canvas.height = 300;
    
    // Mathematical center-cropping & scaling logic
    const imgAspect = baseImageObj.width / baseImageObj.height;
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;

    if (imgAspect > 1) { drawWidth = canvas.height * imgAspect; } 
    else { drawHeight = canvas.width / imgAspect; }

    drawWidth *= s;
    drawHeight *= s;

    const x = (canvas.width - drawWidth) / 2;
    const y = (canvas.height - drawHeight) / 2;
    
    ctx.filter = `brightness(${b}%) contrast(${c}%)`;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImageObj, x, y, drawWidth, drawHeight);
    
    const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    photoOutEl.innerHTML = `<img src="${finalDataUrl}" alt="Passport Photo">`;
    photoOutEl.style.border = "none";
    
    profiles[currentProfile].photoFilters = { bright: b, contrast: c, scale: s * 100 };
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
    if (photoOutEl) { photoOutEl.innerHTML = '<span>Photo</span>'; photoOutEl.style.border = ""; }
}

/* =========================================================
   8. UI LOGIC & QUICK COLORS
   ========================================================= */
function setPresetColor(hex) {
    const picker = document.getElementById('theme-color');
    if(picker) {
        picker.value = hex;
        applySettings();
    }
}

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
   9. CORE DATA BINDING 
   ========================================================= */
function updateData() {
    let dataObj = profiles[currentProfile] || {};
    dataObj.academic = academicData;
    dataObj.custom = customFields;
    let filledCount = 0;

    // Advanced Formatting Engine
    staticFields.forEach(field => {
        const inputElement = document.getElementById(`in-${field}`);
        const outputElement = document.getElementById(`out-${field}`);
        
        if (inputElement && outputElement) {
            let val = inputElement.value;
            
            // Cleanup double spaces
            val = val.replace(/\s{2,}/g, ' ');

            if (fieldsToCapitalize.includes(field) && val) val = toTitleCase(val);
            
            dataObj[field] = val; 
            if (val.trim() !== '' && field !== 'copyright' && field !== 'watermark' && field !== 'qr') filledCount++;

            if(inputElement.tagName === 'TEXTAREA') {
                val = val.replace(/^[-*]\s+/gm, '• ');
            }

            if (inputElement.type === 'date' && val) outputElement.innerText = formatSmartDate(val);
            else outputElement.innerText = val;
        }
    });

    const watermarkInput = document.getElementById('in-watermark');
    const watermarkOutput = document.getElementById('out-watermark');
    if (watermarkInput && watermarkOutput) watermarkOutput.innerText = watermarkInput.value;
    
    const qrInput = document.getElementById('in-qr');
    const qrBox = document.getElementById('out-qrcode');
    if(qrInput && qrBox) {
        qrBox.innerHTML = '';
        if(qrInput.value.trim() !== '') {
            new QRCode(qrBox, { text: qrInput.value, width: 75, height: 75, colorDark : "#000000", colorLight : "#ffffff" });
            qrBox.style.display = 'block';
        } else {
            qrBox.style.display = 'none';
        }
    }

    const mainTitle = document.getElementById('doc-main-title');
    const docName = document.getElementById('in-name');
    const tSel = document.getElementById('template-selector');
    
    if(mainTitle && docName && tSel) {
        if(tSel.value === 'layout-split' && docName.value.trim() !== '') {
            mainTitle.innerText = docName.value;
            mainTitle.style.borderBottom = 'none';
        } else {
            mainTitle.innerText = "BIO-DATA";
            mainTitle.style.borderBottom = '';
        }
    }

    const activeFields = staticFields.length - 3; 
    const progressPercent = Math.round((filledCount / activeFields) * 100);
    document.querySelectorAll('.progress-fill').forEach(bar => bar.style.width = `${progressPercent}%`);
    document.querySelectorAll('[id^="progress-text"]').forEach(txt => txt.innerText = `${progressPercent}%`);

    profiles[currentProfile] = dataObj;
    localStorage.setItem('biodata_profiles', JSON.stringify(profiles));
    triggerSaveIndicator();
}

function applySettings() {
    const templateEl = document.getElementById('template-selector');
    const fontEl = document.getElementById('font-selector');
    const colorEl = document.getElementById('theme-color');
    const borderEl = document.getElementById('border-toggle');
    const watermarkEl = document.getElementById('watermark-toggle');
    const pageBreakEl = document.getElementById('page-break-toggle');
    const spacingEl = document.getElementById('doc-spacing');
    const fontSizeEl = document.getElementById('doc-font-size');
    const marginEl = document.getElementById('doc-margin');
    const shapeEl = document.getElementById('photo-shape');
    const paperSizeEl = document.getElementById('paper-size-selector');
    
    const paper = document.getElementById('resume-document');
    const hexLabel = document.getElementById('color-hex');

    const templateValue = templateEl ? templateEl.value : 'layout-classic';
    const fontValue = fontEl ? fontEl.value : "'Inter', sans-serif";
    const colorValue = colorEl ? colorEl.value : '#2563eb';
    const spacingValue = spacingEl ? spacingEl.value : '6';
    const fontSizeValue = fontSizeEl ? fontSizeEl.value : '15';
    const marginValue = marginEl ? marginEl.value : '40';
    const shapeValue = shapeEl ? shapeEl.value : '0%';
    const paperSizeValue = paperSizeEl ? paperSizeEl.value : 'A4';
    
    const hasBorder = borderEl ? borderEl.checked : false;
    const hasWatermark = watermarkEl ? watermarkEl.checked : true;
    const hasPageBreaks = pageBreakEl ? pageBreakEl.checked : false;
    
    if (paper) {
        // Reset classes
        paper.className = `resume-paper ${templateValue}`;
        if(paperSizeValue === 'US-Letter') paper.classList.add('page-letter');
        else paper.classList.add('page-a4');
        
        if(hasBorder) paper.classList.add('has-border');
        if(hasWatermark) paper.classList.add('has-watermark');
        if(hasPageBreaks) paper.classList.add('show-page-breaks');
        paper.style.fontFamily = fontValue;
        
        document.documentElement.style.setProperty('--doc-spacing', `${spacingValue}px`);
        document.documentElement.style.setProperty('--doc-font-size', `${fontSizeValue}px`);
        document.documentElement.style.setProperty('--doc-margin', `${marginValue}px`);
        document.documentElement.style.setProperty('--photo-radius', shapeValue);
    }
    
    document.documentElement.style.setProperty('--accent-color', colorValue);
    if(hexLabel) hexLabel.innerText = colorValue.toUpperCase();
    
    updateData();

    localStorage.setItem('doc_template', templateValue);
    localStorage.setItem('doc_font', fontValue);
    localStorage.setItem('doc_color', colorValue);
    localStorage.setItem('doc_spacing', spacingValue);
    localStorage.setItem('doc_font_size', fontSizeValue);
    localStorage.setItem('doc_margin', marginValue);
    localStorage.setItem('doc_photo_shape', shapeValue);
    localStorage.setItem('doc_paper_size', paperSizeValue);
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
   10. EXPORT ENGINE
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
    
    document.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));
    if(wasPageBreak && paper) paper.classList.remove('show-page-breaks');
    
    const originalTitle = document.title;
    document.title = getExportFilename('pdf').replace('.pdf', ''); 

    setTimeout(() => { 
        window.print(); 
        document.title = originalTitle;
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
    
    document.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));
    
    const pageBreakTog = document.getElementById('page-break-toggle');
    const wasPageBreak = pageBreakTog ? pageBreakTog.checked : false;
    if(wasPageBreak) paper.classList.remove('show-page-breaks');

    setTimeout(() => {
        const originalBoxShadow = paper.style.boxShadow;
        paper.style.boxShadow = 'none'; 
        
        html2canvas(paper, { scale: 3, useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            link.download = getExportFilename('png');
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
        docClone.querySelectorAll('.highlight-element').forEach(el => el.classList.remove('highlight-element'));
        
        const qrEl = docClone.querySelector('.qr-box');
        if(qrEl) qrEl.remove();
        
        const sigLine = docClone.querySelector('.signature-line');
        const sigImg = docClone.querySelector('.out-signature-img');
        if(sigLine && sigImg && sigImg.style.display !== 'none') {
            sigLine.style.display = 'none'; 
        }

        const resumeContent = docClone.innerHTML;
        
        const fontEl = document.getElementById('font-selector');
        const colorEl = document.getElementById('theme-color');
        const borderEl = document.getElementById('border-toggle');
        const spacingEl = document.getElementById('doc-spacing');
        const fontSizeEl = document.getElementById('doc-font-size');
        const shapeEl = document.getElementById('photo-shape');
        
        const currentFont = fontEl ? fontEl.value.replace(/'/g, "") : "Arial, sans-serif";
        const themeColor = colorEl ? colorEl.value : "#000000";
        const hasBorder = borderEl ? borderEl.checked : false;
        const spacing = spacingEl ? spacingEl.value : "6";
        const fontSize = fontSizeEl ? fontSizeEl.value : "15";
        const shape = shapeEl ? shapeEl.value : "0%";
        
        let borderCSS = hasBorder ? `border: 4px double ${themeColor}; padding: 20px;` : "";

        const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Professional Bio-Data</title>
        <style>
            body { font-family: ${currentFont}, Arial, sans-serif; color: #000; padding: 20px; }
            .doc-border-wrap { ${borderCSS} }
            .doc-accent-strip, .doc-watermark, .split-only { display: none; }
            .doc-header { text-align: center; margin-bottom: 20px; position: relative;}
            .header-content h1 { font-size: 24pt; color: ${themeColor}; border-bottom: 2px solid ${themeColor}; margin: 0; display: inline-block; padding-bottom: 5px;}
            .photo-box { position: absolute; right: 0; top: 0; width: 100px; height: 130px; border: 2px solid ${themeColor}; text-align: center; line-height: 130px; color: ${themeColor}; font-weight: bold; border-radius: ${shape}; overflow: hidden;}
            .photo-box img { width: 100px; height: 130px; }
            table { width: 100%; border-collapse: collapse; font-size: ${fontSize}px; margin-bottom: 20px;}
            .bio-layout-table td { padding: ${spacing}px 0; vertical-align: top; border-bottom: 1px dashed #ccc;}
            .label { width: 180px; font-weight: bold; }
            .colon { width: 20px; text-align: center; font-weight: bold; }
            .fw-bold { font-weight: bold; }
            .doc-color-text { color: ${themeColor}; font-size: calc(${fontSize}px + 2px);}
            .doc-section-title { margin-top: 20px; margin-bottom: 10px; font-size: 14pt; font-weight: bold; color: ${themeColor}; border-left: 4px solid ${themeColor}; padding-left: 10px; background: #f9f9f9;}
            
            .academic-table, .academic-table th, .academic-table td { border: 1px solid #000; }
            .academic-table th { background-color: ${themeColor}; color: #fff; padding: 8px; text-align: center;}
            .academic-table td { padding: 8px; text-align: center; }
            
            .footer-signatures { margin-top: 50px; font-size: 12pt; }
            .signature-box { float: right; width: 150px; text-align: center; position: relative; }
            .out-signature-img { width: 140px; height: 50px; margin-bottom: 5px;}
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
        downloadLink.download = getExportFilename('doc');
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showToast("Word Document Downloaded!", "fa-check");
    }, 300);
}
