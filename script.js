const fields = [
    'name', 'fname', 'mname', 'dob', 'sex', 'blood', 
    'address', 'contact', 'caste', 'religion', 'nationality', 'marital',
    '10-board', '10-year', '10-perc',
    '12-board', '12-year', '12-perc',
    'deg-board', 'deg-year', 'deg-perc',
    'work', 'hobbies', 'lang', 'date', 'copyright'
];

function showToast(message, icon = "fa-circle-info") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// FAILSAFE MOBILE TABS
function switchTab(tabName) {
    // 1. Update Buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // 2. Update Body State (CSS handles visibility)
    document.body.setAttribute('data-active-tab', tabName);

    // 3. Special handling for Export tab
    if (tabName === 'export') {
        setTimeout(() => {
            document.getElementById('export-panel').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
}

// Reset tabs if resized to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
        document.body.removeAttribute('data-active-tab'); 
    } else if (!document.body.hasAttribute('data-active-tab')) {
        document.body.setAttribute('data-active-tab', 'editor');
    }
});


function toTitleCase(str) { return str.replace(/\w\S*/g, function(txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); }); }
const fieldsToCapitalize = ['name', 'fname', 'mname', 'religion', 'caste', 'nationality'];

function updateData() {
    const dataToSave = {};
    let filledCount = 0;

    fields.forEach(field => {
        const inputElement = document.getElementById(`in-${field}`);
        const outputElement = document.getElementById(`out-${field}`);
        
        if (inputElement && outputElement) {
            let val = inputElement.value;
            if (fieldsToCapitalize.includes(field) && val) val = toTitleCase(val);
            
            dataToSave[field] = val;
            if (val.trim() !== '' && field !== 'copyright') filledCount++;

            if (inputElement.type === 'date' && val) {
                const dateParts = val.split('-');
                outputElement.innerText = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            } else {
                outputElement.innerText = val;
            }
        }
    });

    const activeFields = fields.length - 1; 
    const progressPercent = Math.round((filledCount / activeFields) * 100);
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;
    document.getElementById('progress-text').innerText = `${progressPercent}%`;

    localStorage.setItem('biodata_draft', JSON.stringify(dataToSave));
}

// APPLY DYNAMIC THEME & FONTS
function applySettings() {
    const fontValue = document.getElementById('font-selector').value;
    const colorValue = document.getElementById('theme-color').value;
    const hasBorder = document.getElementById('border-toggle').checked;
    
    // Set Document Font
    document.getElementById('resume-document').style.fontFamily = fontValue;
    
    // HUGE UPGRADE: Apply color to the ENTIRE APP UI root
    document.documentElement.style.setProperty('--accent-color', colorValue);
    
    // Update Hex code text
    document.getElementById('color-hex').innerText = colorValue.toUpperCase();
    
    // Toggle Document Border
    const paper = document.getElementById('resume-document');
    hasBorder ? paper.classList.add('has-border') : paper.classList.remove('has-border');

    // Save choices
    localStorage.setItem('doc_font', fontValue);
    localStorage.setItem('doc_color', colorValue);
    localStorage.setItem('doc_border', hasBorder);
}

window.onload = () => {
    // Force correct tab layout on load based on screen size
    if (window.innerWidth <= 900) document.body.setAttribute('data-active-tab', 'editor');

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-icon').className = 'fa-solid fa-sun';
    }

    const savedFont = localStorage.getItem('doc_font');
    const savedColor = localStorage.getItem('doc_color');
    const savedBorder = localStorage.getItem('doc_border') === 'true';
    
    if (savedFont) document.getElementById('font-selector').value = savedFont;
    if (savedColor) document.getElementById('theme-color').value = savedColor;
    document.getElementById('border-toggle').checked = savedBorder;
    applySettings(); 

    const savedData = localStorage.getItem('biodata_draft');
    if (savedData) {
        const data = JSON.parse(savedData);
        fields.forEach(field => {
            const inputElement = document.getElementById(`in-${field}`);
            if (inputElement && data[field]) { inputElement.value = data[field]; }
        });
        updateData();
    } else {
        updateData();
    }
};

function clearForm() {
    if (confirm("Clear all text from the form?")) {
        fields.forEach(field => {
            const el = document.getElementById(`in-${field}`);
            if (el && field !== 'copyright') el.value = '';
        });
        localStorage.removeItem('biodata_draft');
        updateData();
        showToast("Form cleared successfully", "fa-check");
    }
}

function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
        icon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        icon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'light');
    }
}

function uploadPhoto(event) {
    const photoBox = document.getElementById('out-photo');
    const file = event.target.files[0];
    if (file) {
        photoBox.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Passport Photo">`;
        photoBox.style.border = "none";
        showToast("Photo uploaded successfully", "fa-check");
    }
}

// --- EXPORT FUNCTIONS ---
function downloadPDF() {
    showToast("Preparing HD PDF...", "fa-spinner fa-spin");
    setTimeout(() => { window.print(); }, 500); 
}

function downloadImage() {
    showToast("Generating High-Res Image...", "fa-spinner fa-spin");
    
    // Safely force DOM render on mobile before capturing
    const isMobile = window.innerWidth <= 900;
    if(isMobile) document.body.setAttribute('data-active-tab', 'preview');

    setTimeout(() => {
        const element = document.getElementById('resume-document');
        const originalBoxShadow = element.style.boxShadow;
        element.style.boxShadow = 'none'; 
        
        html2canvas(element, { scale: 3, useCORS: true }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Bio_Data.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            element.style.boxShadow = originalBoxShadow;
            
            if(isMobile) document.body.setAttribute('data-active-tab', 'export');
            showToast("Image Downloaded!", "fa-check");
        });
    }, 400);
}

function downloadWord() {
    showToast("Bundling Word Document...", "fa-spinner fa-spin");
    
    setTimeout(() => {
        const resumeContent = document.getElementById('resume-document').innerHTML;
        const currentFont = document.getElementById('font-selector').value.replace(/'/g, "");
        const themeColor = document.getElementById('theme-color').value;
        const hasBorder = document.getElementById('border-toggle').checked;
        
        let borderCSS = "";
        if(hasBorder) { borderCSS = `border: 4px double ${themeColor}; padding: 20px;`; }

        const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Colorful Bio-Data</title>
        <style>
            body { font-family: ${currentFont}, Arial, sans-serif; color: #000; padding: 20px; }
            .doc-border-wrap { ${borderCSS} }
            .doc-accent-strip { display: none; }
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
        downloadLink.download = 'Bio_Data.doc';
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showToast("Word Document Downloaded!", "fa-check");
    }, 300);
}
