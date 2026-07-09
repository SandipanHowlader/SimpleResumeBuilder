/* =========================================================
   1. GLOBAL VARIABLES & UTILITIES
   ========================================================= */
const staticFields = [
    'name', 'fname', 'mname', 'dob', 'sex', 'blood', 
    'address', 'contact', 'email', 'caste', 'religion', 'nationality', 'marital',
    'date', 'copyright', 'watermark', 'qr'
];

const fieldsToCapitalize = ['name', 'fname', 'mname', 'religion', 'caste', 'nationality'];

let academicData = [];
let customFields = [];
let socialData = []; 
let workData = []; 
let projectData = []; 
let saveTimeout;
let currentZoom = 1;

let sectionOrder = ['work', 'projects', 'academic', 'skills', 'other'];
const sectionMeta = {
    'work': { defaultTitle: 'Professional Experience', icon: 'fa-briefcase' },
    'projects': { defaultTitle: 'Projects', icon: 'fa-code' },
    'academic': { defaultTitle: 'Academic Qualification', icon: 'fa-graduation-cap' },
    'skills': { defaultTitle: 'Professional Skills', icon: 'fa-star' },
    'other': { defaultTitle: 'Other Details', icon: 'fa-folder-open' }
};

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
    return `${baseName}_StrongResume.${extension}`;
}

function parseMarkdown(text) {
    if(!text) return "";
    let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); 
    html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--accent-color); text-decoration:none;">$1</a>');
    html = html.replace(/^[-*]\s+(.*)$/gm, '&nbsp;&nbsp;&bull; $1'); 
    html = html.replace(/\n/g, '<br>'); 
    return html;
}

function renderPillString(commaStr) {
    if(!commaStr) return "";
    const arr = commaStr.split(',').map(s => s.trim()).filter(s => s !== '');
    if(arr.length === 0) return "";
    return `<div class="skills-output-container" style="margin-bottom:0;">` + arr.map(s => `<span class="skill-pill">${s}</span>`).join('') + `</div>`;
}

/* =========================================================
   2. INITIALIZATION
   ========================================================= */
window.onload = () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) splash.classList.add('fade-out');
        showToast("Welcome to StrongResume by Sandipan!", "fa-hand-sparkles");
    }, 800);

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
    const savedIconToggle = localStorage.getItem('doc_icons') !== 'false';
    const savedTimelineToggle = localStorage.getItem('doc_timeline') !== 'false';
    const savedSpacing = localStorage.getItem('doc_spacing');
    const savedFontSize = localStorage.getItem('doc_font_size');
    const savedMargin = localStorage.getItem('doc_margin');
    const savedShape = localStorage.getItem('doc_photo_shape');
    const savedPaperSize = localStorage.getItem('doc_paper_size');
    const savedPaperTexture = localStorage.getItem('doc_paper_texture');
    const savedDocTitle = localStorage.getItem('doc_title'); 
    
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

    const iconTog = document.getElementById('icon-toggle');
    if (iconTog && savedIconToggle !== null) iconTog.checked = savedIconToggle;

    const timelineTog = document.getElementById('timeline-toggle');
    if (timelineTog && savedTimelineToggle !== null) timelineTog.checked = savedTimelineToggle;

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

    const paperTextureEl = document.getElementById('paper-texture');
    if (paperTextureEl && savedPaperTexture) paperTextureEl.value = savedPaperTexture;

    const titleSel = document.getElementById('doc-title-selector');
    if (titleSel && savedDocTitle) titleSel.value = savedDocTitle;

    setupSignaturePad();
    setupSpyEngine();
    
    loadProfileData(); 
    applySettings(); 
    setupDropzone();
};

/* =========================================================
   3. SPY ENGINE & PAGE OVERFLOW HUD
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

function checkPageOverflow() {
    const paper = document.getElementById('resume-document');
    const hud = document.getElementById('page-overflow-hud');
    const pageBreakTog = document.getElementById('page-break-toggle');
    if(!paper || !hud) return;
    
    if(pageBreakTog && !pageBreakTog.checked) {
        hud.classList.remove('show');
        return;
    }

    const limit = paper.classList.contains('page-letter') ? 1054 : 1122;
    const isOverflowing = paper.scrollHeight > limit + 10; 
    
    if(isOverflowing) {
        const pages = Math.ceil(paper.scrollHeight / limit);
        hud.innerHTML = `<i class="fa-solid fa-file-lines"></i> <span>Document: ${pages} Pages</span>`;
        hud.classList.add('info');
        hud.classList.remove('warning');
        hud.classList.add('show');
    } else {
        hud.innerHTML = `<i class="fa-solid fa-file-circle-check"></i> <span>1 Page Perfect</span>`;
        hud.classList.remove('info');
        hud.classList.remove('warning');
        hud.classList.add('show');
    }
}

/* =========================================================
   4. E-SIGNATURE PAD ENGINE 
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
        const scaleX = sigCanvas.width / rect.width;
        const scaleY = sigCanvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
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
        
        if(data.sectionOrder && data.sectionOrder.length === 5) {
            sectionOrder = data.sectionOrder;
        } else {
            sectionOrder = ['work', 'projects', 'academic', 'skills', 'other'];
        }
        renderOutlineEditor();

        academicData = data.academic && Array.isArray(data.academic) ? data.academic : defaultAcademic();
        customFields = data.custom && Array.isArray(data.custom) ? data.custom : [];
        socialData = data.social && Array.isArray(data.social) ? data.social : [];
        workData = data.work && Array.isArray(data.work) ? data.work : []; 
        projectData = data.projects && Array.isArray(data.projects) ? data.projects : []; 
        
        const skillsEl = document.getElementById('in-skills');
        const hobbiesEl = document.getElementById('in-hobbies');
        const langEl = document.getElementById('in-lang');
        
        if(skillsEl && data.skillsStr !== undefined) skillsEl.value = data.skillsStr;
        if(hobbiesEl && data.hobbiesStr !== undefined) hobbiesEl.value = data.hobbiesStr;
        if(langEl && data.langStr !== undefined) langEl.value = data.langStr;
        
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
                const bw = document.getElementById('filter-bw');
                
                if (bright) bright.value = data.photoFilters?.bright || 100;
                if (contrast) contrast.value = data.photoFilters?.contrast || 100;
                if (scale) scale.value = data.photoFilters?.scale || 100;
                if (bw) bw.checked = data.photoFilters?.bw || false;
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
        sectionOrder = ['work', 'projects', 'academic', 'skills', 'other'];
        renderOutlineEditor();

        academicData = defaultAcademic();
        customFields = [];
        socialData = [];
        workData = [];
        projectData = [];
        resetPhotoStudio();
        if(sigCtx) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        const outSig = document.getElementById('out-signature');
        if(outSig) outSig.style.display = 'none';
        
        const watermarkEl = document.getElementById('in-watermark');
        const copyrightEl = document.getElementById('in-copyright');
        const skillsEl = document.getElementById('in-skills');
        const hobbiesEl = document.getElementById('in-hobbies');
        const langEl = document.getElementById('in-lang');
        
        if (watermarkEl) watermarkEl.value = "StrongResume";
        if (copyrightEl) copyrightEl.value = "© 2026 StrongResume by Sandipan";
        if (skillsEl) skillsEl.value = "";
        if (hobbiesEl) hobbiesEl.value = "";
        if (langEl) langEl.value = "";
    }
    
    renderAcademicEditor();
    renderCustomEditor();
    renderSocialEditor(); 
    renderWorkEditor();
    renderProjectEditor();
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
   6. DYNAMIC DATA ENGINES & REORDERING
   ========================================================= */

function renderOutlineEditor() {
    const container = document.getElementById('outline-container');
    if(!container) return;
    container.innerHTML = '';
    
    container.innerHTML += `
        <div class="outline-row fixed-row">
            <span class="outline-label"><i class="fa-solid fa-user"></i> Personal Details (Fixed Top)</span>
        </div>
    `;
    
    sectionOrder.forEach((sec, index) => {
        const meta = sectionMeta[sec];
        const val = profiles[currentProfile]?.customTitles?.[sec] || '';
        
        const rowDiv = document.createElement('div');
        rowDiv.className = 'outline-row';
        rowDiv.innerHTML = `
            <span class="outline-label"><i class="fa-solid ${meta.icon}"></i> ${meta.defaultTitle}</span>
            <div class="row-actions">
                <button class="btn-sort" onclick="moveSection('${sec}', -1)" ${index===0?'disabled':''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn-sort" onclick="moveSection('${sec}', 1)" ${index===sectionOrder.length-1?'disabled':''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
            </div>
        `;
        container.appendChild(rowDiv);
    });
}

function moveSection(secId, dir) {
    const index = sectionOrder.indexOf(secId);
    if(index < 0) return;
    const newIndex = index + dir;
    if(newIndex < 0 || newIndex >= sectionOrder.length) return;
    
    const temp = sectionOrder[index];
    sectionOrder[index] = sectionOrder[newIndex];
    sectionOrder[newIndex] = temp;
    
    if(!profiles[currentProfile]) profiles[currentProfile] = {};
    profiles[currentProfile].sectionOrder = sectionOrder;
    
    renderOutlineEditor();
    updateData(); 
}

// --- WORK EXPERIENCE ENGINE ---
function renderWorkEditor() {
    const container = document.getElementById('work-container');
    if (!container) return;
    container.innerHTML = '';
    
    const sectionWrapper = document.getElementById('section-work');
    if(workData.length === 0) {
        if(sectionWrapper) sectionWrapper.style.display = 'none';
    } else {
        if(sectionWrapper) sectionWrapper.style.display = 'block';
    }

    workData.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'nested-card';
        rowDiv.innerHTML = `
            <div class="nested-card-header">
                <span>Experience</span>
                <div class="nested-actions">
                    <button onclick="moveWork('${row.id}', -1)" ${index===0?'disabled':''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                    <button onclick="moveWork('${row.id}', 1)" ${index===workData.length-1?'disabled':''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                    <button onclick="duplicateWork('${row.id}')" title="Copy"><i class="fa-solid fa-copy"></i></button>
                    <button onclick="removeWorkRow('${row.id}')" title="Delete" style="color: #ef4444;"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="nested-input" style="margin-bottom: 10px;">
                <label>Job Title</label>
                <input type="text" placeholder="Senior product designer" value="${row.title}" oninput="updateWork('${row.id}', 'title', this.value)" onfocus="document.getElementById('section-work').classList.add('highlight-element')" onblur="document.getElementById('section-work').classList.remove('highlight-element')">
            </div>
            <div class="nested-grid">
                <div class="nested-input">
                    <label>Company</label>
                    <input type="text" placeholder="Google" value="${row.company}" oninput="updateWork('${row.id}', 'company', this.value)" onfocus="document.getElementById('section-work').classList.add('highlight-element')" onblur="document.getElementById('section-work').classList.remove('highlight-element')">
                </div>
                <div class="nested-input">
                    <label>Location</label>
                    <input type="text" placeholder="Bengaluru" value="${row.location}" oninput="updateWork('${row.id}', 'location', this.value)" onfocus="document.getElementById('section-work').classList.add('highlight-element')" onblur="document.getElementById('section-work').classList.remove('highlight-element')">
                </div>
            </div>
            <div class="nested-grid">
                <div class="nested-input">
                    <label>Start Date</label>
                    <input type="text" placeholder="Jan 2020" value="${row.startDate}" oninput="updateWork('${row.id}', 'startDate', this.value)" onfocus="document.getElementById('section-work').classList.add('highlight-element')" onblur="document.getElementById('section-work').classList.remove('highlight-element')">
                </div>
                <div class="nested-input">
                    <label>End Date</label>
                    <input type="text" placeholder="Feb 2024" value="${row.endDate}" oninput="updateWork('${row.id}', 'endDate', this.value)" onfocus="document.getElementById('section-work').classList.add('highlight-element')" onblur="document.getElementById('section-work').classList.remove('highlight-element')">
                </div>
            </div>
            <div class="nested-input">
                <label>Highlights (One Per Line, Links auto-detected)</label>
                <textarea placeholder="Highlights (one per line)" oninput="updateWork('${row.id}', 'desc', this.value)" onfocus="document.getElementById('section-work').classList.add('highlight-element')" onblur="document.getElementById('section-work').classList.remove('highlight-element')">${row.desc}</textarea>
            </div>
        `;
        container.appendChild(rowDiv);
    });
    renderWorkPreview();
}

function renderWorkPreview() {
    const previewBody = document.getElementById('out-work-body');
    if (!previewBody) return;
    previewBody.innerHTML = '';
    
    const iconTog = document.getElementById('icon-toggle');
    const useIcons = iconTog ? iconTog.checked : true;

    workData.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'work-preview-item';
        
        let dateStr = row.startDate || '';
        if(row.startDate && row.endDate) dateStr += ` - ${row.endDate}`;
        else if (row.endDate) dateStr = row.endDate;

        let metaStr = row.location || '';
        if (metaStr && dateStr) metaStr += ` | ${dateStr}`;
        else if (dateStr) metaStr = dateStr;

        let compStr = row.company ? ` &mdash; ${row.company}` : '';

        const lines = row.desc.split('\n').filter(line => line.trim() !== '');
        let bulletHTML = '';
        if(lines.length > 0) {
            const listItems = lines.map(line => `<li>${parseMarkdown(line.replace(/^[-*]\s*/, ''))}</li>`).join('');
            bulletHTML = `<ul class="doc-bullets">${listItems}</ul>`;
        }

        rowDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 2px;">
                <div style="font-weight:700; font-size: calc(var(--doc-font-size) + 1px); color: #1e293b;">${row.title}<span style="font-weight:400;">${compStr}</span></div>
            </div>
            ${metaStr ? `<div style="font-size: calc(var(--doc-font-size) - 2px); color: #64748b; margin-bottom: 6px;">${metaStr}</div>` : ''}
            ${bulletHTML}
        `;
        previewBody.appendChild(rowDiv);
    });
}

function addWorkRow() { workData.push({ id: generateId(), title: "", company: "", location: "", startDate: "", endDate: "", desc: "" }); renderWorkEditor(); updateData(); }
function removeWorkRow(id) { workData = workData.filter(row => row.id !== id); renderWorkEditor(); updateData(); }
function updateWork(id, field, value) { const row = workData.find(r => r.id === id); if(row) row[field] = value; updateData(); renderWorkPreview(); }
function moveWork(id, direction) {
    const index = workData.findIndex(r => r.id === id);
    if(index < 0) return;
    const newIndex = index + direction;
    if(newIndex < 0 || newIndex >= workData.length) return;
    const temp = workData[index];
    workData[index] = workData[newIndex];
    workData[newIndex] = temp;
    renderWorkEditor();
    updateData();
}
function duplicateWork(id) {
    const row = workData.find(r => r.id === id);
    if(row) {
        workData.push({...row, id: generateId()});
        renderWorkEditor();
        updateData();
    }
}

// --- PROJECTS ENGINE ---
function renderProjectEditor() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    container.innerHTML = '';
    
    const sectionWrapper = document.getElementById('section-projects');
    if(projectData.length === 0) {
        if(sectionWrapper) sectionWrapper.style.display = 'none';
    } else {
        if(sectionWrapper) sectionWrapper.style.display = 'block';
    }

    projectData.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'nested-card';
        rowDiv.innerHTML = `
            <div class="nested-card-header">
                <span>Project</span>
                <div class="nested-actions">
                    <button onclick="moveProject('${row.id}', -1)" ${index===0?'disabled':''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                    <button onclick="moveProject('${row.id}', 1)" ${index===projectData.length-1?'disabled':''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                    <button onclick="duplicateProject('${row.id}')" title="Copy"><i class="fa-solid fa-copy"></i></button>
                    <button onclick="removeProjectRow('${row.id}')" title="Delete" style="color: #ef4444;"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="nested-input" style="margin-bottom: 10px;">
                <label>Project Name</label>
                <input type="text" placeholder="Enter project name" value="${row.name}" oninput="updateProject('${row.id}', 'name', this.value)" onfocus="document.getElementById('section-projects').classList.add('highlight-element')" onblur="document.getElementById('section-projects').classList.remove('highlight-element')">
            </div>
            <div class="nested-grid">
                <div class="nested-input">
                    <label>Tech / Tools</label>
                    <input type="text" placeholder="Enter tech/tools" value="${row.tech}" oninput="updateProject('${row.id}', 'tech', this.value)" onfocus="document.getElementById('section-projects').classList.add('highlight-element')" onblur="document.getElementById('section-projects').classList.remove('highlight-element')">
                </div>
                <div class="nested-input">
                    <label>Link</label>
                    <input type="text" placeholder="github.com/you/repo" value="${row.link}" oninput="updateProject('${row.id}', 'link', this.value)" onfocus="document.getElementById('section-projects').classList.add('highlight-element')" onblur="document.getElementById('section-projects').classList.remove('highlight-element')">
                </div>
            </div>
            <div class="nested-input">
                <label>Description</label>
                <textarea placeholder="Description" oninput="updateProject('${row.id}', 'desc', this.value)" onfocus="document.getElementById('section-projects').classList.add('highlight-element')" onblur="document.getElementById('section-projects').classList.remove('highlight-element')">${row.desc}</textarea>
            </div>
        `;
        container.appendChild(rowDiv);
    });
    renderProjectPreview();
}

function renderProjectPreview() {
    const previewBody = document.getElementById('out-projects-body');
    if (!previewBody) return;
    previewBody.innerHTML = '';
    
    projectData.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'project-preview-item';
        
        let titleHTML = `<strong>${row.name}</strong>`;
        if(row.link && row.link.trim() !== '') {
            titleHTML += ` &nbsp;<a href="${row.link.startsWith('http') ? row.link : 'https://'+row.link}" target="_blank" style="color:var(--accent-color); text-decoration:none;"><i class="fa-solid fa-link" style="font-size:0.8rem;"></i></a>`;
        }

        const descHTML = row.desc ? `<div style="font-size: calc(var(--doc-font-size) - 1px); line-height: 1.6; color: #1e293b; margin-top:4px;">${parseMarkdown(row.desc)}</div>` : '';

        rowDiv.innerHTML = `
            <div style="font-size: calc(var(--doc-font-size) + 1px); color: #1e293b; margin-bottom: 2px;">${titleHTML}</div>
            ${row.tech ? `<div style="font-size: calc(var(--doc-font-size) - 2px); color: #64748b; font-weight: 500;">${row.tech}</div>` : ''}
            ${descHTML}
        `;
        previewBody.appendChild(rowDiv);
    });
}

function addProjectRow() { projectData.push({ id: generateId(), name: "", tech: "", link: "", desc: "" }); renderProjectEditor(); updateData(); }
function removeProjectRow(id) { projectData = projectData.filter(row => row.id !== id); renderProjectEditor(); updateData(); }
function updateProject(id, field, value) { const row = projectData.find(r => r.id === id); if(row) row[field] = value; updateData(); renderProjectPreview(); }
function moveProject(id, direction) {
    const index = projectData.findIndex(r => r.id === id);
    if(index < 0) return;
    const newIndex = index + direction;
    if(newIndex < 0 || newIndex >= projectData.length) return;
    const temp = projectData[index];
    projectData[index] = projectData[newIndex];
    projectData[newIndex] = temp;
    renderProjectEditor();
    updateData();
}
function duplicateProject(id) {
    const row = projectData.find(r => r.id === id);
    if(row) {
        projectData.push({...row, id: generateId()});
        renderProjectEditor();
        updateData();
    }
}

// --- SOCIAL LINKS ENGINE ---
function renderSocialEditor() {
    const container = document.getElementById('social-container');
    if (!container) return;
    container.innerHTML = '';
    socialData.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'social-row';
        rowDiv.innerHTML = `
            <input type="text" placeholder="Platform (e.g. LinkedIn)" value="${row.label}" oninput="updateSocial('${row.id}', 'label', this.value)">
            <input type="text" placeholder="URL or Handle" value="${row.value}" oninput="updateSocial('${row.id}', 'value', this.value)">
            <div class="row-actions">
                <button class="btn-sort" onclick="moveSocial('${row.id}', -1)" ${index===0?'disabled':''} title="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn-sort" onclick="moveSocial('${row.id}', 1)" ${index===socialData.length-1?'disabled':''} title="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="btn-remove" onclick="removeSocialRow('${row.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;
        container.appendChild(rowDiv);
    });
    renderSocialPreview();
}

function renderSocialPreview() {
    const previewBody = document.getElementById('out-social-body');
    if (!previewBody) return;
    previewBody.innerHTML = '';

    socialData.forEach(row => {
        const tr = document.createElement('tr');
        
        let iconClass = "doc-icon-globe"; 
        const labelLower = row.label.toLowerCase();
        const valLower = row.value.toLowerCase();
        
        if (labelLower.includes('linkedin') || valLower.includes('linkedin')) iconClass = "doc-icon-linkedin";
        else if (labelLower.includes('github') || valLower.includes('github')) iconClass = "doc-icon-github";
        else if (labelLower.includes('twitter') || labelLower.includes('x') || valLower.includes('twitter')) iconClass = "doc-icon-twitter";
        else if (labelLower.includes('facebook') || valLower.includes('facebook')) iconClass = "doc-icon-facebook";

        let displayVal = row.value;
        if(displayVal.trim() !== '') {
            let href = displayVal.startsWith('http') ? displayVal : 'https://' + displayVal;
            displayVal = `<a href="${href}" target="_blank" style="color: inherit; text-decoration: none;">${row.value}</a>`;
        }

        tr.innerHTML = `<td class="label ${iconClass}">${row.label}</td><td class="colon">:</td><td class="value">${displayVal}</td>`;
        previewBody.appendChild(tr);
    });
}

function addSocialRow() { socialData.push({ id: generateId(), label: "", value: "" }); renderSocialEditor(); updateData(); }
function removeSocialRow(id) { socialData = socialData.filter(row => row.id !== id); renderSocialEditor(); updateData(); }
function updateSocial(id, field, value) { const row = socialData.find(r => r.id === id); if(row) row[field] = value; updateData(); renderSocialPreview(); }
function moveSocial(id, direction) {
    const index = socialData.findIndex(r => r.id === id);
    if(index < 0) return;
    const newIndex = index + direction;
    if(newIndex < 0 || newIndex >= socialData.length) return;
    const temp = socialData[index];
    socialData[index] = socialData[newIndex];
    socialData[newIndex] = temp;
    renderSocialEditor();
    updateData();
}

// --- ACADEMIC ENGINE ---
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
            <input type="text" placeholder="GPA/%" value="${row.perc}" oninput="updateAcademic('${row.id}', 'perc', this.value)" onfocus="document.getElementById('section-academic').classList.add('highlight-element')" onblur="document.getElementById('section-academic').classList.remove('highlight-element')">
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
    const previewBodyTable = document.getElementById('out-academic-body');
    const previewBodyTimeline = document.getElementById('out-academic-timeline');
    
    if (previewBodyTable) {
        previewBodyTable.innerHTML = '';
        academicData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.exam}</td><td>${row.board}</td><td>${row.stream || ''}</td><td>${row.year}</td><td>${row.perc}</td>`;
            previewBodyTable.appendChild(tr);
        });
    }
    
    if(previewBodyTimeline) {
        previewBodyTimeline.innerHTML = '';
        academicData.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'work-preview-item';
            
            let metaStr = row.board || '';
            if (metaStr && row.stream) metaStr += ` | ${row.stream}`;
            else if (row.stream) metaStr = row.stream;
            
            rowDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 2px;">
                    <div style="font-weight:700; font-size: calc(var(--doc-font-size) + 1px); color: #1e293b;">${row.exam}</div>
                    <div style="font-size: calc(var(--doc-font-size) - 2px); color: #64748b; font-weight: 600;">${row.year}</div>
                </div>
                ${metaStr ? `<div style="font-size: calc(var(--doc-font-size) - 1px); color: #334155; margin-bottom: 4px;">${metaStr}</div>` : ''}
                ${row.perc ? `<div style="font-size: calc(var(--doc-font-size) - 2px); font-weight:600; color: var(--accent-color);">Score: ${row.perc}</div>` : ''}
            `;
            previewBodyTimeline.appendChild(rowDiv);
        });
    }
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

// --- CUSTOM FIELDS ENGINE ---
function renderCustomEditor() {
    const container = document.getElementById('custom-fields-container');
    if (!container) return;
    container.innerHTML = '';
    customFields.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'custom-row';
        rowDiv.innerHTML = `
            <input type="text" placeholder="Label" value="${row.label}" oninput="updateCustom('${row.id}', 'label', this.value)">
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
        const formattedVal = parseMarkdown(row.value);
        tr.innerHTML = `<td class="label">${row.label}</td><td class="colon">:</td><td class="value">${formattedVal}</td>`;
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
   7. CANVAS PHOTO STUDIO
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
        const bw = document.getElementById('filter-bw');

        if (editorControls) editorControls.style.display = 'block';
        if (statusText) statusText.innerText = "Click to Change Photo";
        if (dropzone) dropzone.style.padding = '0.5rem';
        
        if (bright) bright.value = 100;
        if (contrast) contrast.value = 100;
        if (scale) scale.value = 100;
        if (bw) bw.checked = false;
        
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
    const bwEl = document.getElementById('filter-bw');
    const photoOutEl = document.getElementById('out-photo');
    
    if (!canvas || !photoOutEl) return;
    
    const ctx = canvas.getContext('2d');
    const b = brightEl ? brightEl.value : 100;
    const c = contrastEl ? contrastEl.value : 100;
    const s = scaleEl ? (scaleEl.value / 100) : 1;
    const isBW = bwEl ? bwEl.checked : false;
    
    canvas.width = 300; 
    canvas.height = 300;
    
    const imgAspect = baseImageObj.width / baseImageObj.height;
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;

    if (imgAspect > 1) { drawWidth = canvas.height * imgAspect; } 
    else { drawHeight = canvas.width / imgAspect; }

    drawWidth *= s;
    drawHeight *= s;

    const x = (canvas.width - drawWidth) / 2;
    const y = (canvas.height - drawHeight) / 2;
    
    let filterString = `brightness(${b}%) contrast(${c}%)`;
    if(isBW) filterString += ` grayscale(100%)`;
    
    ctx.filter = filterString;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImageObj, x, y, drawWidth, drawHeight);
    
    const finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    photoOutEl.innerHTML = `<img src="${finalDataUrl}" alt="Passport Photo">`;
    photoOutEl.style.border = "none";
    
    profiles[currentProfile].photoFilters = { bright: b, contrast: c, scale: s * 100, bw: isBW };
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
    if (statusText) statusText.innerText = "Drag & Drop or Click to Upload";
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
    dataObj.social = socialData; 
    dataObj.work = workData; 
    dataObj.projects = projectData;
    let filledCount = 0;

    staticFields.forEach(field => {
        const inputElement = document.getElementById(`in-${field}`);
        const outputElement = document.getElementById(`out-${field}`);
        
        if (inputElement) {
            let val = inputElement.value;
            
            if (inputElement.type !== 'url' && inputElement.tagName !== 'TEXTAREA') {
                val = val.replace(/ {2,}/g, ' '); 
            }

            if (fieldsToCapitalize.includes(field) && val) val = toTitleCase(val);
            
            dataObj[field] = val; 
            if (val.trim() !== '' && field !== 'copyright' && field !== 'watermark' && field !== 'qr') filledCount++;

            if(outputElement) {
                let displayVal = val;
                if(inputElement.tagName === 'TEXTAREA') {
                    outputElement.innerHTML = parseMarkdown(displayVal);
                } else if (inputElement.type === 'date' && displayVal) {
                    outputElement.innerText = formatSmartDate(displayVal);
                } else {
                    outputElement.innerText = displayVal;
                }
            }
        }
    });
    
    const skillsInput = document.getElementById('in-skills');
    const hobbiesInput = document.getElementById('in-hobbies');
    const langInput = document.getElementById('in-lang');
    
    if(skillsInput) dataObj.skillsStr = skillsInput.value;
    if(hobbiesInput) dataObj.hobbiesStr = hobbiesInput.value;
    if(langInput) dataObj.langStr = langInput.value;

    const outSkills = document.getElementById('out-skills-body');
    const outSkillsLeft = document.getElementById('out-skills-body-left');
    const outHobbies = document.getElementById('out-hobbies');
    const outLang = document.getElementById('out-lang');
    
    if(outSkills) outSkills.innerHTML = renderPillString(dataObj.skillsStr);
    if(outSkillsLeft) outSkillsLeft.innerHTML = renderPillString(dataObj.skillsStr);
    
    if(outHobbies) {
        if(dataObj.hobbiesStr && dataObj.hobbiesStr.includes(',')) {
            outHobbies.innerHTML = renderPillString(dataObj.hobbiesStr);
        } else {
            outHobbies.innerHTML = parseMarkdown(dataObj.hobbiesStr);
        }
    }
    
    if(outLang) {
        if(dataObj.langStr && dataObj.langStr.includes(',')) {
            outLang.innerHTML = renderPillString(dataObj.langStr);
        } else {
            outLang.innerHTML = dataObj.langStr;
        }
    }

    const watermarkInput = document.getElementById('in-watermark');
    const watermarkOutput = document.getElementById('out-watermark');
    if (watermarkInput && watermarkOutput) watermarkOutput.innerText = watermarkInput.value;
    
    const qrInput = document.getElementById('in-qr');
    const qrBox = document.getElementById('out-qrcode');
    if(qrInput && qrBox) {
        qrBox.innerHTML = '';
        if(qrInput.value.trim() !== '') {
            new QRCode(qrBox, { text: qrInput.value.trim(), width: 75, height: 75, colorDark : "#000000", colorLight : "#ffffff" });
            qrBox.style.display = 'block';
        } else {
            qrBox.style.display = 'none';
        }
    }

    const tPersonal = document.getElementById('in-title-personal');
    const tAcademic = document.getElementById('in-title-academic');
    const tWork = document.getElementById('in-title-work');
    const tPr = document.getElementById('in-title-projects');
    const tSkills = document.getElementById('in-title-skills');
    const tOther = document.getElementById('in-title-other');
    
    if(tPersonal && tAcademic && tWork && tPr && tSkills && tOther) {
        dataObj.customTitles = {
            personal: tPersonal.value,
            academic: tAcademic.value,
            work: tWork.value,
            projects: tPr.value,
            skills: tSkills.value,
            other: tOther.value
        };
        
        const outP = document.getElementById('out-title-personal');
        const outA = document.getElementById('out-title-academic');
        const outW = document.getElementById('out-title-work');
        const outPr = document.getElementById('out-title-projects');
        const outS = document.getElementById('out-title-skills');
        const outSLeft = document.getElementById('out-title-skills-left');
        const outO = document.getElementById('out-title-other');
        
        if(outP) outP.innerText = tPersonal.value.trim() !== '' ? tPersonal.value : 'Personal Details';
        if(outA) outA.innerText = tAcademic.value.trim() !== '' ? tAcademic.value : 'Academic Qualification';
        if(outW) outW.innerText = tWork.value.trim() !== '' ? tWork.value : 'Professional Experience';
        if(outPr) outPr.innerText = tPr.value.trim() !== '' ? tPr.value : 'Projects';
        if(outS) outS.innerText = tSkills.value.trim() !== '' ? tSkills.value : 'Professional Skills';
        if(outSLeft) outSLeft.innerText = tSkills.value.trim() !== '' ? tSkills.value : 'Skills';
        if(outO) outO.innerText = tOther.value.trim() !== '' ? tOther.value : 'Other Details';
    }

    const mainTitle = document.getElementById('doc-main-title');
    const docName = document.getElementById('in-name');
    const titleSel = document.getElementById('doc-title-selector');
    
    if(mainTitle && docName && titleSel) {
        let titleVal = titleSel.value;
        if(titleVal === 'NAME') {
            mainTitle.innerText = docName.value.trim() !== '' ? docName.value : "RESUME";
            mainTitle.style.borderBottom = 'none';
        } else {
            mainTitle.innerText = titleVal;
            mainTitle.style.borderBottom = '';
        }
    }

    const previewContainer = document.getElementById('reorderable-sections-container');
    if(previewContainer) {
        sectionOrder.forEach(secId => {
            const el = document.getElementById(`section-${secId}`);
            if(el) previewContainer.appendChild(el);
        });
    }

    const activeFields = staticFields.length - 3; 
    const progressPercent = Math.round((filledCount / activeFields) * 100);
    document.querySelectorAll('.progress-fill').forEach(bar => bar.style.width = `${progressPercent}%`);
    document.querySelectorAll('[id^="progress-text"]').forEach(txt => txt.innerText = `${progressPercent}%`);

    profiles[currentProfile] = dataObj;
    localStorage.setItem('biodata_profiles', JSON.stringify(profiles));
    
    triggerSaveIndicator();
    checkPageOverflow(); 
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
    const titleSel = document.getElementById('doc-title-selector');
    const textureEl = document.getElementById('paper-texture');
    const iconEl = document.getElementById('icon-toggle');
    const timelineEl = document.getElementById('timeline-toggle');
    
    const paper = document.getElementById('resume-document');
    const hexLabel = document.getElementById('color-hex');

    const templateValue = templateEl ? templateEl.value : 'layout-classic';
    const fontValue = fontEl ? fontEl.value : "font-modern";
    const colorValue = colorEl ? colorEl.value : '#2563eb';
    const spacingValue = spacingEl ? spacingEl.value : '6';
    const fontSizeValue = fontSizeEl ? fontSizeEl.value : '15';
    const marginValue = marginEl ? marginEl.value : '40';
    const shapeValue = shapeEl ? shapeEl.value : '0%';
    const paperSizeValue = paperSizeEl ? paperSizeEl.value : 'A4';
    const textureValue = textureEl ? textureEl.value : 'paper-white';
    const titleValue = titleSel ? titleSel.value : 'BIO-DATA';
    
    const hasBorder = borderEl ? borderEl.checked : false;
    const hasWatermark = watermarkEl ? watermarkEl.checked : true;
    const hasPageBreaks = pageBreakEl ? pageBreakEl.checked : false;
    const useIcons = iconEl ? iconEl.checked : true;
    const useTimeline = timelineEl ? timelineEl.checked : true;
    
    if (paper) {
        paper.className = `resume-paper ${templateValue} ${fontValue} ${textureValue}`;
        if(paperSizeValue === 'US-Letter') paper.classList.add('page-letter');
        else paper.classList.add('page-a4');
        
        if(hasBorder) paper.classList.add('has-border');
        if(hasWatermark) paper.classList.add('has-watermark');
        if(hasPageBreaks) paper.classList.add('show-page-breaks');
        if(useIcons) paper.classList.add('use-icons');
        if(useTimeline) paper.classList.add('use-timeline');
        
        document.documentElement.style.setProperty('--doc-spacing', `${spacingValue}px`);
        document.documentElement.style.setProperty('--doc-font-size', `${fontSizeValue}px`);
        document.documentElement.style.setProperty('--doc-margin', `${marginValue}px`);
        document.documentElement.style.setProperty('--photo-radius', shapeValue);
        
        const acTable = document.getElementById('out-academic-table');
        const acTimeline = document.getElementById('out-academic-timeline');
        if(acTable && acTimeline) {
            if(useTimeline) {
                acTable.style.display = 'none';
                acTimeline.style.display = 'flex';
            } else {
                acTable.style.display = 'table';
                acTimeline.style.display = 'none';
            }
        }
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
    localStorage.setItem('doc_paper_texture', textureValue);
    localStorage.setItem('doc_title', titleValue);
    localStorage.setItem('doc_border', hasBorder);
    localStorage.setItem('doc_watermark', hasWatermark);
    localStorage.setItem('doc_pagebreaks', hasPageBreaks);
    localStorage.setItem('doc_icons', useIcons);
    localStorage.setItem('doc_timeline', useTimeline);
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
    link.download = "StrongResume_Backup.json";
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
        
        docClone.querySelectorAll('i.fa-solid, i.fa-regular, i.fa-brands').forEach(el => el.remove());
        
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
        const timelineTog = document.getElementById('timeline-toggle');
        
        const currentFont = fontEl ? fontEl.value.replace(/'/g, "") : "Arial, sans-serif";
        const themeColor = colorEl ? colorEl.value : "#000000";
        const hasBorder = borderEl ? borderEl.checked : false;
        const spacing = spacingEl ? spacingEl.value : "6";
        const fontSize = fontSizeEl ? fontSizeEl.value : "15";
        const shape = shapeEl ? shapeEl.value : "0%";
        const hasTimeline = timelineTog ? timelineTog.checked : true;
        
        let borderCSS = hasBorder ? `border: 4px double ${themeColor}; padding: 20px;` : "";

        const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Professional Resume</title>
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
            
            ${hasTimeline ? `
            .work-preview-item, .project-preview-item { border-left: 2px solid #ccc; padding-left: 15px; margin-bottom: 15px; }
            ` : ''}

            .doc-bullets { margin: 0; padding-left: 20px; }
            .doc-bullets li { margin-bottom: 4px; }
            .skill-pill { border: 1px solid #ccc; padding: 2px 8px; margin-right: 5px; border-radius: 12px; display: inline-block; background: #f9f9f9;}
            
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
