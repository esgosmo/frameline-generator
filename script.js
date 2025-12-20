// ==========================================
// 1. REFERENCIAS UI (INTERFAZ)
// ==========================================
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const btnDownload = document.getElementById('downloadBtn');

// Textos informativos
const textoOpacidad = document.getElementById('opacityValue');
const textoEscala = document.getElementById('scaleValue');

// Menús Desplegables
const menuResoluciones = document.getElementById('resolutionSelect');
const menuAspecto = document.getElementById('aspectSelect');
const cajaAspecto = document.getElementById('aspectGroup'); // Caja oculta
const menuSecAspect = document.getElementById('secAspectSelect');

// Paneles Avanzados
const btnAdvanced = document.getElementById('advancedBtn');
const groupAdvanced = document.getElementById('advancedGroup');
const arrow = document.getElementById('arrow');
const secFrameControls = document.getElementById('secFrameControls');

// ==========================================
// 2. REFERENCIAS DATOS (INPUTS)
// ==========================================
// Usamos una función segura para no romper si falta algún ID
const getEl = (id) => document.getElementById(id);

const inputs = {
    w: getEl('width'),
    h: getEl('height'),
    aspect: getEl('aspect'),
    scale: getEl('scaleInput'),
    opacity: getEl('opacity'),
    
    // Advanced
    color: getEl('lineColor'),
    thickness: getEl('thickness'),
    safeActionOn: getEl('safeActionToggle'),
    safeActionVal: getEl('safeActionVal'),
    safeTitleOn: getEl('safeTitleToggle'),
    safeTitleVal: getEl('safeTitleVal'),

    // Second Frameline
    secOn: getEl('secFrameOn'),
    secAspect: getEl('secFrameAspect'),
    secColor: getEl('secFrameColor'),
    secFit: getEl('secFrameFit'),
    showLabels: getEl('showLabelsToggle'), 
    showResLabels: getEl('showResLabelsToggle'),
    showCanvasRes: getEl('showCanvasResToggle'),
    
    // Radios de escala
    scaleFit: getEl('scaleFit'),
    scaleFill: getEl('scaleFill'),
    scaleCrop: getEl('scaleCrop'),

    // NUEVOS (Posición X/Y):
    posXInput: getEl('posXInput'),
    posYInput: getEl('posYInput'),

    // NUEVO: Sliders móviles
    posXSlider: getEl('posXSlider'),
    posYSlider: getEl('posYSlider')
};

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let resolucionesData = [];
let currentViewMode = 'root'; 
let userImage = null;        
let lastThickness = 2;        
let isFullGateMode = false; 

// ==========================================
// CARGADOR DE DATOS EXTERNOS (JSON)
// ==========================================

async function cargarDatosExternos() {
    try {
        const resResponse = await fetch('resolutions.json');
        resolucionesData = await resResponse.json(); 

        renderResolutionMenu(); 

        const aspResponse = await fetch('aspects.json');
        const aspData = await aspResponse.json();
        llenarSelectSimple('aspectSelect', aspData);
        llenarSelectSimple('secAspectSelect', aspData);

        // --- DEFAULTS ---
        if (inputs.aspect) inputs.aspect.value = "2.38695";

        const aspectSelect = document.getElementById('aspectSelect');
        if (aspectSelect) {
            if (aspectSelect.querySelector('option[value="2.38695"]')) {
                aspectSelect.value = "2.38695";
            } else if (aspectSelect.querySelector('option[value="2.39"]')) {
                aspectSelect.value = "2.39";
            } else {
                aspectSelect.value = "custom";
            }
        }

        if (inputs.showLabels) inputs.showLabels.checked = true;
        if (inputs.showResLabels) inputs.showResLabels.checked = true;

        const secSelect = document.getElementById('secAspectSelect');
        if (secSelect && secSelect.querySelector('option[value="9:16"]')) {
            secSelect.value = "9:16";
        }
        if (inputs.secAspect) inputs.secAspect.value = "9:16";

        requestDraw();
        activarBotonHD();

    } catch (error) {
        console.error("Error loading JSONs:", error);
    }
}

// =========================================================
// 🔥 HYBRID MENU LOGIC
// =========================================================
function renderResolutionMenu() {
    const resSelect = document.getElementById('resolutionSelect');
    if (!resSelect) return;

    const valorPrevio = resSelect.value;
    resSelect.innerHTML = '';

    if (currentViewMode === 'root') {
        resSelect.add(new Option("Custom / Manual", "custom"));
        resolucionesData.forEach((grupo, index) => {
            const nombre = grupo.category;
            const items = grupo.items;
            const optgroup = document.createElement('optgroup');
            optgroup.label = nombre;
            
            const mostrarTodo = nombre.includes("Broadcast") || nombre.includes("DCI")
             || nombre.includes("Social Media") || nombre.includes("RED")
             || nombre.includes("Blackmagic");
            
            let itemsAMostrar = items;
            let hayBotonVerMas = false;

            if (!mostrarTodo && items.length > 3) {
                itemsAMostrar = items.filter(i => {
                    const t = i.type ? i.type.toLowerCase() : '';
                    return t !== 'header' && t !== 'separator' && !i.name.includes('▼');
                }).slice(0, 3);
                hayBotonVerMas = true;
            }

            itemsAMostrar.forEach(item => {
                const opt = document.createElement('option');
                opt.text = item.name;
                opt.value = item.value;
                optgroup.appendChild(opt);
            });

            if (hayBotonVerMas) {
                const optMore = document.createElement('option');
                optMore.text = `↳ See all ${nombre} ...`;
                optMore.value = `NAV_FOLDER_${index}`;
                optMore.style.fontWeight = "bold";
                optMore.style.color = "#007bff"; 
                optgroup.appendChild(optMore);
            }
            resSelect.appendChild(optgroup);
        });
    } else {
        const optBack = document.createElement('option');
        optBack.text = "⬅ \u00A0 Back to main menu";
        optBack.value = "NAV_BACK";
        optBack.style.fontWeight = "bold";
        optBack.style.backgroundColor = "#444";
        optBack.style.color = "#fff";
        resSelect.add(optBack);

        const titulo = resolucionesData[currentViewMode].category;
        const optSep = new Option(`── ${titulo} (Complete list) ──`, "");
        optSep.disabled = true;
        resSelect.add(optSep);

        const items = resolucionesData[currentViewMode].items;
        const tieneHeaders = items.some(i => (i.type && i.type.toLowerCase() === 'header') || i.name.includes('▼'));
        let renderizar = !tieneHeaders; 

        items.forEach(item => {
            const esHeader = (item.type && item.type.toLowerCase() === 'header') || item.name.includes('▼');
            if (!renderizar) {
                if (esHeader) renderizar = true;
                else return;
            }

            const opt = document.createElement('option');
            if (esHeader) {
                opt.text = item.name;
                opt.disabled = true; 
                opt.style.fontWeight = "bold";
                opt.style.color = "#aaa";
            } else if (item.type === 'separator') {
                opt.text = "──────";
                opt.disabled = true;
                opt.style.textAlign = "center";
            } else {
                opt.text = item.name;
                opt.value = item.value;
            }
            resSelect.add(opt);
        });
    }

    // LÓGICA DE SELECCIÓN
    if (valorPrevio && valorPrevio.startsWith('NAV_FOLDER_')) {
        for (let i = 0; i < resSelect.options.length; i++) {
            const opt = resSelect.options[i];
             if (opt.value && opt.value !== 'NAV_BACK' && !opt.disabled ) {
                resSelect.selectedIndex = i;
                setTimeout(() => { resSelect.dispatchEvent(new Event('change')); }, 10);
                break; 
            }
        }
    } else if (valorPrevio && !valorPrevio.startsWith('NAV_')) {
        for (let i = 0; i < resSelect.options.length; i++) {
            if (resSelect.options[i].value === valorPrevio) {
                resSelect.selectedIndex = i;
                break;
            }
        }
    }
    if (currentViewMode === 'root' && resSelect.value === 'custom') {
          resSelect.value = "1920,1080"; 
           setTimeout(() => resSelect.dispatchEvent(new Event('change')), 10);
    }
}

function llenarSelectSimple(id, datos) {
    const select = document.getElementById(id);
    if (!select) return;
    const custom = select.querySelector('option[value="custom"]');
    select.innerHTML = '';
    if(custom) select.appendChild(custom);
    datos.forEach(grupo => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = grupo.group; 
        grupo.options.forEach(op => {
            const opt = document.createElement('option');
            opt.innerText = op.name;
            opt.value = op.value;
            optgroup.appendChild(opt);
        });
        select.appendChild(optgroup);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosExternos();
    aplicarModoMobile();
});


// ==========================================
// LISTENER DEL MENÚ DE RESOLUCIÓN
// ==========================================
if (menuResoluciones) {
    menuResoluciones.addEventListener('change', () => {
        const val = menuResoluciones.value;
        if (val.startsWith('NAV_FOLDER_')) {
            const index = parseInt(val.replace('NAV_FOLDER_', ''));
            currentViewMode = index; 
            renderResolutionMenu(); 
            return;
        }
        if (val === 'NAV_BACK') {
            currentViewMode = 'root'; 
            renderResolutionMenu();
            if (menuResoluciones.querySelector('option[value="1920,1080"]')) {
                menuResoluciones.value = "1920,1080";
                menuResoluciones.dispatchEvent(new Event('change'));
                setTimeout(() => { activarBotonHD(); }, 50);
            }
            return;
        }
        if (val === 'custom' || val === '') return;

        const [nW, nH] = val.split(',').map(Number);
        if(inputs.w) inputs.w.value = nW;
        if(inputs.h) inputs.h.value = nH;

        autoAdjustThickness(nW); 
        
        if (isFullGateMode && nH > 0) {
            const newNativeAspect = nW / nH;
            if(inputs.aspect) inputs.aspect.value = parseFloat(newNativeAspect.toFixed(5));
            if(menuAspecto) menuAspecto.value = 'custom';
        } 

        const contenedorRes = document.getElementById('resBtnContainer');
        if (contenedorRes) {
            contenedorRes.querySelectorAll('button.active').forEach(b => b.classList.remove('active'));
        }
        
        flashInput(inputs.w);
        flashInput(inputs.h);
        if (isFullGateMode) flashInput(inputs.aspect);
        
        requestDraw();
    });
}


// ==========================================
// DRAG & DROP & IMAGE LOADER 
// ==========================================
const dropZone = document.querySelector('.upload-zone');
const fileInput = document.getElementById('imageLoader');

if (dropZone && fileInput) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); dropZone.classList.remove('drag-over'); 
        const files = e.dataTransfer.files;
        if (files.length > 0) { fileInput.files = files; const event = new Event('change'); fileInput.dispatchEvent(event); }
    });
}

// ==========================================
// CARGADOR DE IMÁGENES OPTIMIZADO
// ==========================================
const imageLoader = document.getElementById('imageLoader');
const imageOptionsPanel = document.getElementById('imageOptionsPanel');
const showImageToggle = document.getElementById('showImageToggle');
const sizeWarning = document.getElementById('sizeWarning'); 
let currentObjectUrl = null;

if (imageLoader) {
    imageLoader.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);

        let fileName = file.name;
        if (fileName.toLowerCase().includes('temp') || fileName.length > 50) {
             const ext = fileName.split('.').pop();
             fileName = ext ? `Image_Loaded.${ext}` : "Image_Loaded";
        }

        const isTiff = fileName.toLowerCase().endsWith('.tiff') || fileName.toLowerCase().endsWith('.tif');
        const isValid = file.type.startsWith('image/') || isTiff;

        if (!isValid) { 
            alert("⚠️ Format not supported.\nPlease use JPG, PNG or TIFF."); 
            imageLoader.value = ""; 
            return; 
        }

        const zone = document.querySelector('.upload-zone');
        const textSpan = zone ? zone.querySelector('.upload-text') : null;
        if (zone && textSpan) {
            textSpan.innerText = "⏳ Processing..."; 
            zone.classList.add('has-file'); 
            zone.style.borderColor = "#ffcc00"; 
        }

        const limitBytes = 20 * 1024 * 1024; 
        let isHeavyFile = (file.size > limitBytes);
        if(sizeWarning) {
            sizeWarning.classList.add('hidden');
            if (isHeavyFile) { 
                sizeWarning.innerText = "⚠️ Large file size (>20MB). Processing..."; 
                sizeWarning.classList.remove('hidden'); 
            }
        }

        setTimeout(() => {
            if (isTiff) {
                procesarTiff(file, (url) => finalizarCarga(url, isHeavyFile, zone, textSpan));
            } else {
                const objectUrl = URL.createObjectURL(file);
                finalizarCarga(objectUrl, isHeavyFile, zone, textSpan);
            }
        }, 50);
    });
}

function finalizarCarga(blobUrl, isHeavyFile, zone, textSpan) {
    if (currentObjectUrl && currentObjectUrl !== blobUrl) {
        URL.revokeObjectURL(currentObjectUrl);
    }
    currentObjectUrl = blobUrl;

    const tempImg = new Image();
    
    tempImg.onload = () => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const MAX_SAFE_SIZE = isMobile ? 6500 : 12000;
        let wasResized = false; 

        if (tempImg.width > MAX_SAFE_SIZE || tempImg.height > MAX_SAFE_SIZE) {
            try {
                const scale = Math.min(MAX_SAFE_SIZE / tempImg.width, MAX_SAFE_SIZE / tempImg.height);
                const newW = Math.round(tempImg.width * scale);
                const newH = Math.round(tempImg.height * scale);

                const offCanvas = document.createElement('canvas');
                offCanvas.width = newW;
                offCanvas.height = newH;
                const ctx = offCanvas.getContext('2d');
                ctx.drawImage(tempImg, 0, 0, newW, newH);

                const optimizedUrl = offCanvas.toDataURL('image/jpeg', 0.90);
                const optimizedImg = new Image();
                
                optimizedImg.onload = () => {
                    aplicarImagenAlSistema(optimizedImg, isHeavyFile, true, zone, textSpan);
                    tempImg.onload = null;
                    tempImg.onerror = null;
                    tempImg.src = ""; 
                    offCanvas.width = 1; 
                };

                optimizedImg.onerror = () => {
                    aplicarImagenAlSistema(tempImg, isHeavyFile, false, zone, textSpan);
                };
                optimizedImg.src = optimizedUrl;
                wasResized = true;

            } catch (err) {
                aplicarImagenAlSistema(tempImg, isHeavyFile, false, zone, textSpan);
            }

        } else {
            aplicarImagenAlSistema(tempImg, isHeavyFile, false, zone, textSpan);
        }
    };

    tempImg.onerror = () => { 
        alert("Error loading image data."); 
        resetUploadZone(zone, textSpan);
        if(window.removeImage) window.removeImage();
    };
    tempImg.src = blobUrl;
}

function aplicarImagenAlSistema(img, isHeavyFile, wasResized, zone, textSpan) {
    userImage = img; 

    if (zone && textSpan) {
        textSpan.innerText = "Image Loaded"; 
        zone.style.borderColor = "#007bff"; 
    }

    if (sizeWarning) {
        sizeWarning.classList.add('hidden'); 
        if (wasResized) {
            sizeWarning.innerText = "ℹ️ Image optimized for performance.";
            sizeWarning.classList.remove('hidden');
        } else if (img.width > 6000 || img.height > 6000) {
            const msg = isHeavyFile 
                ? "⚠️ Large file & resolution (>6K). Performance may lag." 
                : "⚠️ Large resolution (>6K). Performance may lag.";
            sizeWarning.innerText = msg;
            sizeWarning.classList.remove('hidden');
        } else if (isHeavyFile) {
            sizeWarning.innerText = "⚠️ Large file size (>20MB).";
            sizeWarning.classList.remove('hidden');
        }
    }

    if (imageOptionsPanel) imageOptionsPanel.classList.remove('hidden');

    if(inputs.w) inputs.w.value = img.width;
    if(inputs.h) inputs.h.value = img.height;
    if (typeof autoAdjustThickness === "function") autoAdjustThickness(img.width);

    if (typeof currentViewMode !== 'undefined' && currentViewMode !== 'root') {
        currentViewMode = 'root';
        if (typeof renderResolutionMenu === 'function') renderResolutionMenu();
    }
    
    if (typeof savedLabelName !== 'undefined') savedLabelName = "";
    if(menuResoluciones) menuResoluciones.value = 'custom';

    const clearContainer = (id) => { const cont = document.getElementById(id); if(cont) cont.querySelectorAll('button.active').forEach(b => b.classList.remove('active')); };
    clearContainer('resBtnContainer');
    
    flashInput(inputs.w); 
    flashInput(inputs.h);
    if (typeof aplicarModoMobile === 'function') aplicarModoMobile();
    requestDraw(); 
}

function procesarTiff(file, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            if (typeof UTIF === 'undefined') throw new Error("UTIF missing");
            const buffer = event.target.result;
            const ifds = UTIF.decode(buffer);
            UTIF.decodeImage(buffer, ifds[0]);
            const rgba = UTIF.toRGBA8(ifds[0]); 
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = ifds[0].width; tempCanvas.height = ifds[0].height;
            const tempCtx = tempCanvas.getContext('2d');
            const imageData = tempCtx.createImageData(ifds[0].width, ifds[0].height);
            imageData.data.set(rgba);
            tempCtx.putImageData(imageData, 0, 0);
            tempCanvas.toBlob((blob) => { 
                const tiffUrl = URL.createObjectURL(blob); 
                callback(tiffUrl); 
            }, 'image/png');
        } catch (err) { 
            console.error(err); 
            alert("Error processing TIFF."); 
            if(window.removeImage) window.removeImage(); 
        }
    };
    reader.readAsArrayBuffer(file);
}

function resetUploadZone(zone, textSpan) {
    if (zone && textSpan) {
        textSpan.innerText = "Choose or drop image";
        zone.classList.remove('has-file');
        zone.style.borderColor = "";
    }
    if (imageLoader) imageLoader.value = "";
}

window.removeImage = function() {
    userImage = null;
    if(imageLoader) imageLoader.value = "";
    if (imageOptionsPanel) imageOptionsPanel.classList.add('hidden');
    if (sizeWarning) { sizeWarning.classList.add('hidden'); sizeWarning.innerText = ""; }
    const zone = document.querySelector('.upload-zone');
    const textSpan = zone ? zone.querySelector('.upload-text') : null;
    resetUploadZone(zone, textSpan);
    draw();
}

if (showImageToggle) showImageToggle.addEventListener('change', requestDraw);
if (inputs.scaleFit) inputs.scaleFit.addEventListener('change', requestDraw);
if (inputs.scaleFill) inputs.scaleFill.addEventListener('change', requestDraw);
if (inputs.scaleCrop) inputs.scaleCrop.addEventListener('change', requestDraw);


// ==========================================
// HELPERS
// ==========================================
function flashInput(element) {
    if (!element) return;
    element.classList.add('highlight-change');
    setTimeout(() => { element.classList.remove('highlight-change'); }, 500);
}

function highlightButton(clickedBtn) {
    if (!clickedBtn) return;
    const siblings = clickedBtn.parentElement.querySelectorAll('button');
    siblings.forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
}

let isTicking = false;
function requestDraw() {
    if (!isTicking) {
        window.requestAnimationFrame(() => { draw(); isTicking = false; });
        isTicking = true;
    }
}

function obtenerRatioTexto(w, h) {
    const ratio = w / h;
    if (Math.abs(ratio - (5/3)) < 0.02) return "1.66"; 
    if (Math.abs(ratio - (9/16)) < 0.02) return "9:16"; 
    if (Math.abs(ratio - 2.40) < 0.01) return "2.40"; 
    if (Math.abs(ratio - 2.39) < 0.01) return "2.39";
    if (Math.abs(ratio - 2.35) < 0.02) return "2.35";
    if (Math.abs(ratio - 1.85) < 0.02) return "1.85";
    if (Math.abs(ratio - 1.37) < 0.02) return "1.37";
    if (Math.abs(ratio - 1.43) < 0.02) return "1.43";
    if (Math.abs(ratio - 0.5625) < 0.01) return "9:16"; 
    if (Math.abs(ratio - 0.8) < 0.01) return "4:5"; 
    if (Math.abs(ratio - 1.6) < 0.01) return "1.60";
    if (Math.abs(ratio - 1.5) < 0.01) return "1.50";

    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(w, h);
    const num = w / divisor;
    const den = h / divisor;
    
    if (num <= 20 && den <= 20) return `${num}:${den}`;
    else return ratio.toFixed(2);
}

function getAspectRatio(inputValue) {
    if (!inputValue) return 2.39;
    let raw = inputValue.toString();
    if (raw.includes(':')) {
        const parts = raw.split(':');
        return parts[1] != 0 ? parts[0] / parts[1] : 1.77;
    }
    const val = parseFloat(raw);
    return (isNaN(val) || val <= 0) ? 2.39 : val;
}

function clearActiveButtons(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (container) {
        container.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    }
}

function autoAdjustThickness(width) {
    if (!inputs.thickness) return;
    let val = width !== undefined ? width : (inputs.w ? inputs.w.value : 0);
    const w = parseInt(val) || 0;
    const idealThickness = (w > 3500) ? 6 : 2; 
    const currentVal = parseInt(inputs.thickness.value) || 0;
    
    if (currentVal === 0) lastThickness = idealThickness;
    else { inputs.thickness.value = idealThickness; lastThickness = idealThickness; }
}

function activarBotonHD() {
    const container = document.getElementById('resBtnContainer');
    if (!container) return;
    const btns = container.querySelectorAll('button');
    btns.forEach(b => b.classList.remove('active'));
    btns.forEach(btn => {
        const txt = btn.innerText.trim(); 
        if (txt === 'HD' || (txt.includes('HD') && !txt.includes('UHD')) || txt.includes('1920')) {
            btn.classList.add('active');
        }
    });
}

function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mimeString});
}

// ==========================================
// 4. FUNCIÓN DRAW (LÓGICA DE RE-ENCUADRE REAL)
// ==========================================
function draw() {
    if (!inputs.w || !inputs.h) return;

    // 1. DIMENSIONES BASE (El Canvas "Virtual" Completo)
    let baseW = Math.max(1, Math.abs(parseInt(inputs.w.value) || 1920));
    let baseH = Math.max(1, Math.abs(parseInt(inputs.h.value) || 1080));

    // 2. SEGURIDAD MÓVIL (Aplicada a las dimensiones base)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);
    const PIXEL_LIMIT = hasPhoto ? 36000000 : 150000000; 
    const currentPixels = baseW * baseH;
    
    // Warning Element
    const warningEl = document.getElementById('sizeWarning');

    if (isMobile && currentPixels > PIXEL_LIMIT) {
        // ... (Tu lógica de mensajes de seguridad igual que antes) ...
        let msg = "";
        const isExtreme = baseW > 12000; 
        if (hasPhoto) {
            msg = isExtreme ? "⛔ <strong>Mobile Safety:</strong> Extreme Res (12K/17K) capped." 
                            : "⛔ <strong>Mobile Safety:</strong> Res >8K capped.";
        } else {
            msg = "⛔ <strong>Mobile Safety:</strong> Canvas capped.";
        }
        if (warningEl) {
            warningEl.innerHTML = msg;
            warningEl.classList.remove('hidden');
            warningEl.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
            warningEl.style.borderColor = "#ff4444";
            warningEl.style.color = "#ff8888";
        }
        // Reducimos las dimensiones Base
        const safetyScale = Math.sqrt(PIXEL_LIMIT / currentPixels);
        baseW = Math.round(baseW * safetyScale);
        baseH = Math.round(baseH * safetyScale);
    } else {
        if (warningEl && warningEl.innerText.includes("Mobile Safety")) warningEl.classList.add('hidden');
    }

    // 3. CÁLCULO DEL FRAMELINE "VIRTUAL" (Dónde estaría el cuadro en el canvas completo)
    // Esto lo calculamos SIEMPRE, estemos en crop o no.
    const targetAspect = getAspectRatio(inputs.aspect ? inputs.aspect.value : 2.39);
    const screenAspect = baseW / baseH;
    
    // A. Tamaño del cuadro (según aspecto)
    let frameW, frameH;
    if (targetAspect > screenAspect) { 
        frameW = baseW; 
        frameH = baseW / targetAspect; 
    } else { 
        frameH = baseH; 
        frameW = baseH * targetAspect; 
    }

    // B. Aplicar Escala (Zoom)
    let scaleVal = inputs.scale ? parseInt(inputs.scale.value) : 100;
    if (isNaN(scaleVal)) scaleVal = 100;
    const scaleFactor = scaleVal / 100;
    if (textoEscala) textoEscala.innerText = scaleVal + "%";
    
    frameW = Math.round(frameW * scaleFactor);
    frameH = Math.round(frameH * scaleFactor);

    // C. Aplicar Posición (Shift X/Y)
    const moveXPercent = inputs.posXInput ? parseFloat(inputs.posXInput.value) || 0 : 0;
    const moveYPercent = inputs.posYInput ? parseFloat(inputs.posYInput.value) || 0 : 0;
    
    const shiftX = Math.round((baseW * moveXPercent) / 100);
    const shiftY = Math.round((baseH * moveYPercent) / 100);

    // D. Coordenadas VIRTUALES del cuadro (Top-Left relativo al canvas base)
    const virtualFrameX = Math.floor((baseW - frameW) / 2) + shiftX;
    const virtualFrameY = Math.floor((baseH - frameH) / 2) + shiftY;


    // 4. DETERMINAR TAMAÑO FINAL DEL CANVAS (Crop vs Full)
    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    
    let finalW, finalH;     // Tamaño real del <canvas>
    let globalOffsetX, globalOffsetY; // Cuánto moveremos el "mundo" al dibujar

    if (isCropMode) {
        // MODO CROP: El canvas adopta el tamaño exacto del Frameline
        finalW = frameW;
        finalH = frameH;
        
        // Offset Mágico: Movemos todo hacia atrás para que el cuadro quede en 0,0
        globalOffsetX = -virtualFrameX;
        globalOffsetY = -virtualFrameY;
    } else {
        // MODO FULL: El canvas es la resolución base
        finalW = baseW;
        finalH = baseH;
        globalOffsetX = 0;
        globalOffsetY = 0;
    }

    // Aplicar tamaño al elemento HTML
    if (canvas.width !== finalW) canvas.width = finalW;
    if (canvas.height !== finalH) canvas.height = finalH;
    
    // Limpiar (en Crop mode limpiamos el frame, en full limpiamos todo)
    ctx.clearRect(0, 0, finalW, finalH);


    // 5. DIBUJAR IMAGEN (Con el offset aplicado)
    if (hasPhoto) {
        try {
            const isFill = inputs.scaleFill && inputs.scaleFill.checked;
            // En modo Crop, solemos querer que la imagen llene el encuadre si no hay scale, 
            // pero si hay scale/pos, respetamos la geometría base.
            const shouldUseFillLogic = isFill; 
            
            const ratioW = baseW / userImage.width;
            const ratioH = baseH / userImage.height;
            
            let renderRatio;
            if (shouldUseFillLogic) renderRatio = Math.max(ratioW, ratioH);
            else renderRatio = Math.min(ratioW, ratioH); // Scale to Fit logic

            const newImgW = userImage.width * renderRatio;
            const newImgH = userImage.height * renderRatio;
            
            // Calculamos dónde iría la imagen en el canvas BASE
            const baseImgX = (baseW - newImgW) / 2;
            const baseImgY = (baseH - newImgH) / 2;
            
            // Dibujamos aplicando el Offset Global (que será 0 en Full, o negativo en Crop)
            ctx.drawImage(userImage, baseImgX + globalOffsetX, baseImgY + globalOffsetY, newImgW, newImgH);

        } catch (e) { console.error("Draw image error:", e); }
    }


    // 6. COORDENADAS DE DIBUJO (Frameline visible)
    // En Full: Serán virtualFrameX/Y.
    // En Crop: Serán (virtualFrameX - virtualFrameX) = 0. ¡Matemática pura!
    const drawX = virtualFrameX + globalOffsetX;
    const drawY = virtualFrameY + globalOffsetY;
    
    // Usamos frameW y frameH que ya calculamos arriba
    const visibleW = frameW;
    const visibleH = frameH;


    // 7. MATTE (Barras Negras)
    if (!isCropMode) {
        const opacityVal = inputs.opacity ? inputs.opacity.value : 0; 
        const alpha = opacityVal / 100;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

        // Barras inteligentes usando drawX/Y
        if (drawY > 0) ctx.fillRect(0, 0, finalW, drawY); // Top
        const bottomY = drawY + visibleH;
        if (bottomY < finalH) ctx.fillRect(0, bottomY, finalW, finalH - bottomY); // Bottom
        if (drawX > 0) ctx.fillRect(0, drawY, drawX, visibleH); // Left
        const rightX = drawX + visibleW;
        if (rightX < finalW) ctx.fillRect(rightX, drawY, finalW - rightX, visibleH); // Right
    }

    // 8. LÍNEAS PRINCIPALES
    let rawThick = parseInt(inputs.thickness ? inputs.thickness.value : 2);
    if (isNaN(rawThick)) rawThick = 2;
    if (rawThick > 10) { rawThick = 10; if(inputs.thickness) inputs.thickness.value = 10; }
    
    const mainThickness = Math.max(0, rawThick);
    const mainOffset = mainThickness / 2;
    
    if (mainThickness > 0) {
        if (inputs.color) ctx.strokeStyle = inputs.color.value;
        ctx.lineWidth = mainThickness; 
        ctx.setLineDash([]); 
        ctx.beginPath();
        // Dibujamos el rectángulo
        ctx.rect(drawX - mainOffset, drawY - mainOffset, visibleW + (mainOffset * 2), visibleH + (mainOffset * 2));
        ctx.stroke();
    }

    // 9. LÍNEA SECUNDARIA (Sigue al cuadro principal)
    let secX = 0, secY = 0, secW = 0, secH = 0;
    let drawSec = false;

    if (inputs.secOn && inputs.secOn.checked && mainThickness > 0) {
        drawSec = true;
        const secAspect = getAspectRatio(inputs.secAspect ? inputs.secAspect.value : 1.77);
        const fitInside = inputs.secFit && inputs.secFit.checked;

        if (fitInside) {
            // Ajustar dentro del cuadro visible
            const mainFrameAspect = visibleW / visibleH;
            if (secAspect > mainFrameAspect) { secW = visibleW; secH = visibleW / secAspect; } 
            else { secH = visibleH; secW = visibleH * secAspect; }
        } else {
            // Ajustar al canvas BASE
            if (secAspect > screenAspect) { secW = baseW; secH = baseW / secAspect; } 
            else { secH = baseH; secW = baseH * secAspect; }
            if (!isCropMode) {
                secW = secW * scaleFactor;
                secH = secW / secAspect;
            }
        }
        secW = Math.round(secW); secH = Math.round(secH);
        
        // Coordenadas: Centro del canvas base + Shift + Offset Global
        const secBaseX = Math.floor((baseW - secW) / 2) + shiftX;
        const secBaseY = Math.floor((baseH - secH) / 2) + shiftY;
        
        secX = secBaseX + globalOffsetX;
        secY = secBaseY + globalOffsetY;

        if(inputs.secColor) ctx.strokeStyle = inputs.secColor.value;
        ctx.lineWidth = mainThickness; ctx.setLineDash([10, 5]); ctx.beginPath();
        ctx.rect(secX, secY, secW, secH); ctx.stroke();
    }

    // 10. SAFE AREAS
    let safeThickness = (mainThickness > 0) ? Math.max(1, Math.round(mainThickness / 2)) : 0;
    if (safeThickness > 0) {
        const drawSafe = (pct, dashed) => {
            const p = pct / 100;
            const sW = visibleW * p; const sH = visibleH * p;
            // Centrado dentro del cuadro visible (drawX/Y)
            const sX = drawX + (visibleW - sW) / 2; 
            const sY = drawY + (visibleH - sH) / 2;
            
            ctx.lineWidth = safeThickness;
            if(inputs.color) ctx.strokeStyle = inputs.color.value;
            ctx.setLineDash(dashed ? [5, 5] : []); ctx.beginPath();
            ctx.rect(sX, sY, sW, sH); ctx.stroke();
        };
        if (inputs.safeActionOn && inputs.safeActionOn.checked) drawSafe(parseFloat(inputs.safeActionVal.value)||93, false);
        if (inputs.safeTitleOn && inputs.safeTitleOn.checked) drawSafe(parseFloat(inputs.safeTitleVal.value)||90, true);
    }

    // 11. ETIQUETAS
    const showAspect = inputs.showLabels && inputs.showLabels.checked;
    const showRes = inputs.showResLabels && inputs.showResLabels.checked;

    if (showAspect || showRes) {
        const fontSize = Math.max(12, Math.round(finalW / 80)); 
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textBaseline = "top";
        const padding = 10; 
        const lineHeight = fontSize + 6; 

        if (mainThickness > 0) {
            ctx.fillStyle = inputs.color.value;
            const txtAsp = obtenerRatioTexto(Math.round(visibleW), Math.round(visibleH));
            // Si es Crop, mostramos la resolución final del archivo. Si no, la del cuadro.
            const txtRes = `${Math.round(visibleW)} x ${Math.round(visibleH)}`;
            
            if (showAspect) { 
                ctx.textAlign = "left"; 
                ctx.fillText(txtAsp, drawX + padding, drawY + padding); 
            }
            if (showRes) {
                ctx.textAlign = showAspect ? "right" : "left"; 
                const posX = showAspect ? (drawX + visibleW - padding) : (drawX + padding);
                const posY = showAspect ? (drawY + padding) : (drawY + padding + lineHeight); 
                ctx.fillText(txtRes, posX, posY);
            }
       }
       if (drawSec && inputs.secAspect) {
            ctx.fillStyle = inputs.secColor.value;
            const txtSecAsp = obtenerRatioTexto(Math.round(secW), Math.round(secH));
            ctx.textAlign = "left";
            if (showAspect) ctx.fillText(txtSecAsp, secX + padding, secY + padding);
       }
    }

    // 12. CANVAS LABEL (Resolución Total del Archivo)
    if (inputs.showCanvasRes && inputs.showCanvasRes.checked) {
        const fontSize = Math.max(12, Math.round(finalW / 80)); 
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = inputs.color ? inputs.color.value : '#00FF00';
        ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        let finalText = "";
        
        // En modo Crop, el "Canvas" es el recorte.
        if (isCropMode) {
            finalText = `Crop: ${finalW} x ${finalH}`;
        } else {
            const isCustom = !menuResoluciones || menuResoluciones.value === 'custom';
            if (!isCustom && menuResoluciones.selectedIndex >= 0) {
                const rawText = menuResoluciones.options[menuResoluciones.selectedIndex].text;
                finalText = rawText.replace(/\s*\(.*?\)\s*$/, '').trim();
                if (!finalText) finalText = `${finalW} x ${finalH}`;
            } else {
                finalText = `Canvas: ${finalW} x ${finalH}`; 
            }
        }

        const padding = Math.max(10, finalW * 0.02);
        ctx.lineWidth = fontSize * 0.12; 
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)"; 
        ctx.strokeText(finalText, padding, finalH - padding); 
        ctx.fillText(finalText, padding, finalH - padding);
    }
    
    updateAspectButtonsVisuals();
}

// ==========================================
// 5. EVENTOS RESTANTES
// ==========================================
Object.values(inputs).forEach(input => {
    if (input) {
        input.addEventListener('input', requestDraw);
        input.addEventListener('change', requestDraw);
        if (input.type === 'text') {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    let val = getAspectRatio(input.value);
                    val += (e.key === 'ArrowUp' ? 0.01 : -0.01);
                    if (val < 0.01) val = 0.01;
                    input.value = val.toFixed(2);
                    if (input === inputs.aspect) {
                        if (menuAspecto) menuAspecto.value = 'custom';
                        const botonesActivos = document.querySelectorAll('.presets-mini button.active');
                        botonesActivos.forEach(b => b.classList.remove('active'));
                    }
                    requestDraw();
                }
            });
        }
    }
});

if (menuAspecto) {
    menuAspecto.addEventListener('change', () => {
        if (cajaAspecto) cajaAspecto.classList.remove('hidden');
        const val = menuAspecto.value;
        if (val === 'custom' || val === '') return;
        if(inputs.aspect) inputs.aspect.value = val;
        const contenedorBotones = document.getElementById('aspectBtnContainer');
        if (contenedorBotones) {
            const botonesPrendidos = contenedorBotones.querySelectorAll('button.active');
            botonesPrendidos.forEach(btn => btn.classList.remove('active'));
        }
        const currentThick = parseInt(inputs.thickness ? inputs.thickness.value : 0) || 0;
        if (currentThick === 0) {
            const currentW = parseInt(inputs.w.value) || 1920;
            const idealThickness = (currentW > 3500) ? 6 : 2;
            if (inputs.thickness) inputs.thickness.value = idealThickness;
            if (typeof lastThickness !== 'undefined') lastThickness = idealThickness;
            if (typeof updateQuickBtnState === 'function') updateQuickBtnState();
        }
        flashInput(inputs.aspect); requestDraw();
    });
}

if (menuSecAspect) {
    menuSecAspect.addEventListener('change', () => {
        const val = menuSecAspect.value;
        if (val === 'custom') return;
        if (inputs.secAspect) { inputs.secAspect.value = val; flashInput(inputs.secAspect); }
        requestDraw();
    });
}
if (inputs.secAspect) {
    inputs.secAspect.addEventListener('input', () => {
        if (menuSecAspect) menuSecAspect.value = 'custom';
        draw(); 
    });
}

if (inputs.w) { inputs.w.addEventListener('input', () => { if (menuResoluciones) menuResoluciones.value = 'custom'; clearActiveButtons('.presets'); autoAdjustThickness(); }); }
if (inputs.h) { inputs.h.addEventListener('input', () => { if (menuResoluciones) menuResoluciones.value = 'custom'; clearActiveButtons('.presets'); }); }
if (inputs.aspect) {
    inputs.aspect.addEventListener('input', () => {
        if (menuAspecto) menuAspecto.value = 'custom';
        const contenedorBotones = document.getElementById('aspectBtnContainer');
        if (contenedorBotones) contenedorBotones.querySelectorAll('button.active').forEach(btn => btn.classList.remove('active'));
    });
}
if (inputs.opacity) {
    inputs.opacity.addEventListener('input', () => {
        const parent = inputs.opacity.parentElement;
        if(parent) parent.querySelectorAll('.presets-mini button').forEach(b => b.classList.remove('active'));
    });
}

if (btnAdvanced) {
    btnAdvanced.addEventListener('click', () => {
        groupAdvanced.classList.toggle('hidden');
        const isHidden = groupAdvanced.classList.contains('hidden');
        arrow.innerText = isHidden ? "▼" : "▲";
        btnAdvanced.style.borderBottom = isHidden ? "1px solid #444" : "none";
    });
}
if (inputs.secOn) {
    inputs.secOn.addEventListener('change', () => {
        if (inputs.secOn.checked) secFrameControls.classList.remove('hidden');
        else secFrameControls.classList.add('hidden');
        draw();
    });
}
const btnInfo = document.getElementById('infoBtn');
const panelInfo = document.getElementById('infoPanel');
const arrowInfo = document.getElementById('infoArrow');
if (btnInfo) {
    btnInfo.addEventListener('click', () => {
        panelInfo.classList.toggle('hidden');
        const isHidden = panelInfo.classList.contains('hidden');
        arrowInfo.innerText = isHidden ? "▼" : "▲";
        btnInfo.style.borderBottom = isHidden ? "1px solid #444" : "none";
    });
}

if(inputs.posXInput) { inputs.posXInput.addEventListener('input', requestDraw); }
if(inputs.posYInput) { inputs.posYInput.addEventListener('input', requestDraw); }

window.setPreset = function(w, h, btn) {
    const estabaEnFull = isFullGateMode;
    if(inputs.w) inputs.w.value = w;
    if(inputs.h) inputs.h.value = h;
    autoAdjustThickness(w);
    if (currentViewMode !== 'root') {
        currentViewMode = 'root';
        renderResolutionMenu();
    }
    const key = `${w},${h}`;
    if(menuResoluciones) { 
        menuResoluciones.value = key; 
        if(menuResoluciones.value !== key) menuResoluciones.value = 'custom'; 
    }
    if (estabaEnFull && h > 0) {
        const newNative = w / h;
        if(inputs.aspect) inputs.aspect.value = parseFloat(newNative.toFixed(5));
        if(menuAspecto) menuAspecto.value = 'custom';
        const btnContainer = document.getElementById('aspectBtnContainer');
        if (btnContainer) btnContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    }
    flashInput(inputs.w); flashInput(inputs.h); 
    if(estabaEnFull) flashInput(inputs.aspect); 
    highlightButton(btn); 
    requestDraw();
}

window.setAspect = function(val, btn) {
    isFullGateMode = false; 
    if(cajaAspecto) cajaAspecto.classList.remove('hidden');
    let finalVal = val;
    if (val === '4:3') finalVal = (4/3).toFixed(5);
    if(inputs.aspect) inputs.aspect.value = finalVal;
    if(menuAspecto) { menuAspecto.value = val; if(menuAspecto.value != val) menuAspecto.value = 'custom'; }
    const currentThick = parseInt(inputs.thickness ? inputs.thickness.value : 0) || 0;
    if (currentThick === 0) {
        const currentW = parseInt(inputs.w.value) || 1920;
        if (inputs.thickness) inputs.thickness.value = (currentW > 3500) ? 6 : 2;
        if (typeof updateQuickBtnState === 'function') updateQuickBtnState();
    }
    flashInput(inputs.aspect); 
    requestDraw();
}

window.setFullGate = function(btn) {
    const w = parseFloat(inputs.w.value);
    const h = parseFloat(inputs.h.value);
    if (h > 0) {
        isFullGateMode = true; 
        if(cajaAspecto) cajaAspecto.classList.remove('hidden');
        const nativeAspect = w / h;
        if(inputs.aspect) inputs.aspect.value = parseFloat(nativeAspect.toFixed(5));
        if(menuAspecto) menuAspecto.value = 'custom';
        flashInput(inputs.aspect);
        highlightButton(btn);
        requestDraw();
    }
}

window.setOpacity = function(val, btn) {
    if(inputs.opacity) inputs.opacity.value = val;
    flashInput(inputs.opacity); highlightButton(btn); requestDraw();
}

btnDownload.addEventListener('click', async () => {
    const w = parseInt(inputs.w.value) || 1920;
    const h = parseInt(inputs.h.value) || 1080;
    let asp = "ratio";
    if (inputs.aspect) {
        asp = inputs.aspect.value.replace(':', '-').replace('.', '_'); 
    }
    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);
    let fileName, dataUrl, mimeType;

    if (isCropMode) {
        mimeType = hasPhoto ? 'image/jpeg' : 'image/png';
        const quality = hasPhoto ? 0.9 : undefined; 
        dataUrl = canvas.toDataURL(mimeType, quality);
        const ext = hasPhoto ? 'jpg' : 'png';
        fileName = `Frameline_${w}x${h}_${asp}_cropped.${ext}`;
    } else if (hasPhoto) {
        ctx.save(); 
        const fontSize = Math.max(10, Math.round(w * 0.012)); 
        const margin = fontSize; 
        ctx.font = `500 ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; 
        ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)"; ctx.shadowBlur = 4;
        ctx.fillText("frameline-generator.com", w - margin, h - margin);
        ctx.restore(); 
        mimeType = 'image/jpeg';
        dataUrl = canvas.toDataURL(mimeType, 0.9);
        fileName = `Frameline_${w}x${h}_${asp}_preview.jpg`;
        setTimeout(() => { if(typeof requestDraw === 'function') requestDraw(); else draw(); }, 0); 
    } else {
        mimeType = 'image/png';
        dataUrl = canvas.toDataURL(mimeType);
        fileName = `Frameline_${w}x${h}_${asp}.png`;
    }

    if (typeof gtag === 'function') { 
        gtag('event', 'download_file', { 
            'event_category': 'Engagement', 
            'event_label': isCropMode ? 'Crop' : (hasPhoto ? 'Preview' : 'Template') 
        }); 
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let shareSuccess = false;

    if (isMobile && navigator.canShare && navigator.share) {
        try {
            const blob = dataURItoBlob(dataUrl);
            const file = new File([blob], fileName, { type: mimeType });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Frameline Generator',
                    text: 'Created with frameline-generator.com'
                });
                shareSuccess = true;
            }
        } catch (error) {
            console.log('Share skipped or canceled:', error);
            if (error.name !== 'AbortError') shareSuccess = false; 
            else return; 
        }
    }

    if (!shareSuccess) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a); 
        a.click();
        document.body.removeChild(a);
    }
});

const quickFrameBtn = document.getElementById('quickFrameBtn');
const quickFrameText = document.getElementById('quickFrameText');
if (quickFrameBtn && inputs.thickness) {
    function updateQuickBtnState() {
        const currentThick = parseInt(inputs.thickness.value) || 0;
        if (currentThick > 0) {
            quickFrameBtn.style.color = "#007bff"; quickFrameBtn.querySelector('span').innerText = "⍉"; quickFrameText.innerText = "On";
            lastThickness = currentThick;
        } else {
            quickFrameBtn.style.color = "#666"; quickFrameBtn.querySelector('span').innerText = "⍉"; quickFrameText.innerText = "Off";
        }
    }
    quickFrameBtn.addEventListener('click', () => {
        const currentThick = parseInt(inputs.thickness.value) || 0;
        if (currentThick > 0) { lastThickness = currentThick; inputs.thickness.value = 0; } 
        else { inputs.thickness.value = lastThickness > 0 ? lastThickness : 2; }
        updateQuickBtnState(); draw();
    });
    inputs.thickness.addEventListener('input', updateQuickBtnState);
    updateQuickBtnState();
}

draw();

const resetBtn = document.getElementById('resetAllBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if(inputs.w) inputs.w.value = 1920;
        if(inputs.h) inputs.h.value = 1080;
        if(inputs.aspect) inputs.aspect.value = "2.38695"; 
        if(inputs.showLabels) inputs.showLabels.checked = true;
        if(inputs.showResLabels) inputs.showResLabels.checked = true;
        if(inputs.opacity) inputs.opacity.value = 0;
        if(textoOpacidad) textoOpacidad.innerText = "100%";
        if(inputs.scale) inputs.scale.value = 100;
        if(textoEscala) textoEscala.innerText = "100%";
        if(inputs.posXInput) inputs.posXInput.value = "0.0";
        if(inputs.posYInput) inputs.posYInput.value = "0.0";
        // NUEVO: Resetear sliders visuales también
        if(inputs.posXSlider) inputs.posXSlider.value = 0;
        if(inputs.posYSlider) inputs.posYSlider.value = 0;
        if(inputs.color) inputs.color.value = "#00ff00";
        if(inputs.thickness) inputs.thickness.value = 2;
        const secColorInput = document.getElementById('secFrameColor');
        if (secColorInput) secColorInput.value = "#0000FF";
        isFullGateMode = false; 

        const hideById = (id) => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); };
        const uncheckById = (id) => { const el = document.getElementById(id); if (el) el.checked = false; };
        
        hideById('aspectGroup'); hideById('secFrameControls'); hideById('advancedGroup'); hideById('infoPanel');
        uncheckById('secFrameOn'); 
        uncheckById('safeActionToggle'); 
        uncheckById('safeTitleToggle');
        uncheckById('showCanvasResToggle');
        uncheckById('secFrameFit'); 
        uncheckById('scaleFill');
        const fitRadio = document.getElementById('scaleFit'); if(fitRadio) fitRadio.checked = true;

        if(inputs.safeActionVal) inputs.safeActionVal.value = 93;
        if(inputs.safeTitleVal) inputs.safeTitleVal.value = 90;

        const arrowEl = document.getElementById('arrow'); if(arrowEl) arrowEl.innerText = "▼";
        const infoArrow = document.getElementById('infoArrow'); if(infoArrow) infoArrow.innerText = "▼";
        if (typeof removeImage === "function") removeImage();

        currentViewMode = 'root';
        renderResolutionMenu();
        if(menuResoluciones) menuResoluciones.value = "1920,1080"; 
        
        if(menuAspecto) menuAspecto.value = "2.38695";
        if(menuSecAspect) menuSecAspect.value = "9:16";
        if (inputs.secAspect) inputs.secAspect.value = "9:16";

        const clearContainer = (id) => { const cont = document.getElementById(id); if(cont) cont.querySelectorAll('button.active').forEach(b => b.classList.remove('active')); };
        clearContainer('resBtnContainer'); clearContainer('aspectBtnContainer'); clearContainer('opacityBtnContainer');
        activarBotonHD();
        
        const qBtn = document.getElementById('quickFrameBtn');
        const qTxt = document.getElementById('quickFrameText');
        if(qBtn) { qBtn.style.color = "#007bff"; qBtn.querySelector('span').innerText = "⍉"; if(qTxt) qTxt.innerText = "On"; }
        flashInput(inputs.w); flashInput(inputs.h); requestDraw();
    });
}

const donationBtns = document.querySelectorAll('.coffee-btn, .paypal-btn');
donationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (typeof gtag === 'function') { gtag('event', 'click_donation', { 'event_category': 'Monetization', 'event_label': btn.innerText }); }
    });
});

function aplicarModoMobile() {
    const esCelular = window.innerWidth < 768;
    if (esCelular) {
        const fitRadio = document.getElementById('scaleFit');
        const fillRadio = document.getElementById('scaleFill');
        if (fitRadio && fillRadio) { fitRadio.checked = true; fillRadio.checked = false; }
    }
}

function updateAspectButtonsVisuals() {
    const btnContainer = document.getElementById('aspectBtnContainer');
    if (!btnContainer) return;
    const currentAsp = parseFloat(inputs.aspect.value) || 0;
    const epsilon = 0.015; 
    const buttons = btnContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons.forEach(btn => {
        const txt = btn.innerText.toLowerCase();
        if (txt.includes('max') || txt.includes('full') || txt.includes('canvas') || txt.includes('open')) {
            if (isFullGateMode) btn.classList.add('active');
        } else if (!isFullGateMode) {
            if (txt.includes('2.39') && (Math.abs(currentAsp - 2.38695) < epsilon || Math.abs(currentAsp - 2.39) < epsilon)) {
                btn.classList.add('active');
            } else if (txt.includes('1.85') && Math.abs(currentAsp - 1.85) < epsilon) {
                btn.classList.add('active');
            } else if (txt.includes('4:3') && Math.abs(currentAsp - (4/3)) < epsilon) {
                btn.classList.add('active'); 
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const privacyBtn = document.getElementById('openPrivacy');
    const disclaimerBtn = document.getElementById('openDisclaimer'); 
    const privacyModal = document.getElementById('privacyModal');
    const closePrivacy = document.getElementById('closePrivacy');

    if (privacyModal && closePrivacy) {
        if (privacyBtn) {
            privacyBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                privacyModal.classList.remove('hidden');
            });
        }
        if (disclaimerBtn) {
            disclaimerBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                privacyModal.classList.remove('hidden'); 
            });
        }
        closePrivacy.addEventListener('click', () => {
            privacyModal.classList.add('hidden');
        });
        privacyModal.addEventListener('click', (e) => {
            if (e.target === privacyModal) {
                privacyModal.classList.add('hidden');
            }
        });
    }
});

// ==========================================
// 🔥 DAVINCI STYLE SCRUBBING LOGIC
// ==========================================
function makeScrubbable(input) {
    if (!input) return;
    let isDragging = false;
    let startX = 0;
    let startValue = 0;
    const sensitivity = 0.2; 
    input.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        isDragging = true;
        startX = e.clientX;
        startValue = parseFloat(input.value) || 0;
        document.body.classList.add('is-scrubbing');
    });
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault(); 
        const currentX = e.clientX;
        const deltaX = currentX - startX;
        if (Math.abs(deltaX) < 2) return;
        let newValue = startValue + (deltaX * sensitivity);
        if (input.min) newValue = Math.max(parseFloat(input.min), newValue);
        if (input.max) newValue = Math.min(parseFloat(input.max), newValue);
        input.value = newValue.toFixed(1);
        input.dispatchEvent(new Event('input'));
    });
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            document.body.classList.remove('is-scrubbing');
        }
    });
}

if (inputs.posXInput) makeScrubbable(inputs.posXInput);
if (inputs.posYInput) makeScrubbable(inputs.posYInput);

// ==========================================
// 📱 MOBILE SLIDERS SYNC
// ==========================================
function bindInputAndSlider(input, slider) {
    if(!input || !slider) return;

    // 1. Si muevo el Slider (Móvil) -> Actualiza Número y Dibuja
    slider.addEventListener('input', () => {
        input.value = slider.value;
        // Disparamos evento input manual para activar el requestDraw del input
        input.dispatchEvent(new Event('input')); 
    });

    // 2. Si cambio el Número (PC/Móvil) -> Mueve el Slider silenciosamente
    input.addEventListener('input', () => {
        slider.value = input.value;
    });
}

// Conectamos X y Y
bindInputAndSlider(inputs.posXInput, inputs.posXSlider);
bindInputAndSlider(inputs.posYInput, inputs.posYSlider);

// ==========================================
// RESET DE POSICIÓN (Mini Reset)
// ==========================================
const btnResetPos = document.getElementById('resetPosBtn');

if (btnResetPos) {
    btnResetPos.addEventListener('click', () => {
        // 1. Resetear Inputs Numéricos
        if (inputs.posXInput) inputs.posXInput.value = "0.0";
        if (inputs.posYInput) inputs.posYInput.value = "0.0";

        // 2. Resetear Sliders (Móvil)
        if (inputs.posXSlider) inputs.posXSlider.value = 0;
        if (inputs.posYSlider) inputs.posYSlider.value = 0;

        // 3. Dibujar
        requestDraw();
    });
}