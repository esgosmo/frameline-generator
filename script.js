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
    
    // Radios de escala
    scaleFit: getEl('scaleFit'),
    scaleFill: getEl('scaleFill'),
    scaleCrop: getEl('scaleCrop')
    scaleFill: getEl('scaleFill'),
    scaleCrop: getEl('scaleCrop')
};

// ==========================================
// CARGADOR DE DATOS EXTERNOS (JSON)
// ==========================================
let resolucionesData = [];
let currentViewMode = 'root'; // Variable para controlar la navegación de carpetas

async function cargarDatosExternos() {
    try {
        // 1. Cargar JSON Resoluciones
        const resResponse = await fetch('resolutions.json');
        resolucionesData = await resResponse.json(); 

        // 2. Renderizar Menú Híbrido
        renderResolutionMenu(); // Ya no lleva 'all'

        // 3. Cargar Aspectos
        const aspResponse = await fetch('aspects.json');
        const aspData = await aspResponse.json();
        llenarSelectSimple('aspectSelect', aspData);
        llenarSelectSimple('secAspectSelect', aspData);

        // FORZAR 2.39 POR DEFECTO
        const aspectSelect = document.getElementById('aspectSelect');
        if (aspectSelect && aspectSelect.querySelector('option[value="2.39"]')) {
            aspectSelect.value = "2.39";
        } else if (aspectSelect && aspectSelect.querySelector('option[value="2.38695"]')) {
            aspectSelect.value = "2.38695";
        }

        // FORZAR 9:16 EN EL SECUNDARIO
        const secSelect = document.getElementById('secAspectSelect');
        if (secSelect && secSelect.querySelector('option[value="9:16"]')) {
            secSelect.value = "9:16";
        }

    } catch (error) {
        console.error("Error loading JSONs:", error);
    }
}

// =========================================================
// 🔥 HYBRID MENU LOGIC (TOP 3 + FOLDER VIEW)
// =========================================================
function renderResolutionMenu() {
    const resSelect = document.getElementById('resolutionSelect');
    if (!resSelect) return;

    // 1. Guardar selección previa
    const valorPrevio = resSelect.value;
    
    // Limpiar menú
    resSelect.innerHTML = '';

    // --- VISTA PRINCIPAL (ROOT) ---
    if (currentViewMode === 'root') {
        
        resSelect.add(new Option("Custom / Manual", "custom"));

        resolucionesData.forEach((grupo, index) => {
            const nombre = grupo.category;
            const items = grupo.items;
            
            const optgroup = document.createElement('optgroup');
            optgroup.label = nombre;
            
            // Regla: Broadcast y DCI muestran todo. El resto solo Top 3.
            const mostrarTodo = nombre.includes("Broadcast") || nombre.includes("DCI") || nombre.includes("Social Media");
            
            let itemsAMostrar = items;
            let hayBotonVerMas = false;

            if (!mostrarTodo && items.length > 3) {
                // Filtro para el ROOT: Quitamos headers y separadores para la vista previa
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
    } 

    // --- VISTA DE CARPETA (FULL LIST) ---
    else {
        // 1. Botón Back
        const optBack = document.createElement('option');
        optBack.text = "⬅ \u00A0 Back to main menu";
        optBack.value = "NAV_BACK";
        optBack.style.fontWeight = "bold";
        optBack.style.backgroundColor = "#444";
        optBack.style.color = "#fff";
        resSelect.add(optBack);

        // 2. Título de la Categoría
        const titulo = resolucionesData[currentViewMode].category;
        const optSep = new Option(`── ${titulo} (Complete list) ──`, "");
        optSep.disabled = true;
        resSelect.add(optSep);

        // 3. Renderizado con FILTRO INTELIGENTE
        const items = resolucionesData[currentViewMode].items;
        
        // Detectamos si esta lista tiene Headers (buscando 'type: header' O el símbolo '▼')
        // Esto es crucial para que funcione en Arri.
        const tieneHeaders = items.some(i => 
            (i.type && i.type.toLowerCase() === 'header') || i.name.includes('▼')
        );
        
        // Si tiene headers, bloqueamos el renderizado hasta encontrar el primero.
        // Esto elimina los duplicados "Top 3" que están al inicio del JSON.
        let renderizar = !tieneHeaders; 

        items.forEach(item => {
            const esHeader = (item.type && item.type.toLowerCase() === 'header') || item.name.includes('▼');

            // Lógica del filtro:
            if (!renderizar) {
                if (esHeader) {
                    renderizar = true; // ¡Header encontrado! Empezamos a dibujar.
                } else {
                    return; // Saltamos este ítem (es un duplicado del top 3)
                }
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

    // =========================================================
    // 🎯 LÓGICA DE SELECCIÓN (SELECTION LOGIC)
    // =========================================================

    // CASO 1: Acabamos de entrar a una carpeta ("See all...")
    if (valorPrevio && valorPrevio.startsWith('NAV_FOLDER_')) {
        
        for (let i = 0; i < resSelect.options.length; i++) {
            const opt = resSelect.options[i];
            
            // Buscamos la primera opción VÁLIDA (Ni Back, ni Header, ni vacía)
             if (opt.value && opt.value !== 'NAV_BACK' && !opt.disabled ) {
                
                resSelect.selectedIndex = i;

                // Forzamos actualización de inputs (Ancho/Alto)
                setTimeout(() => {
                    resSelect.dispatchEvent(new Event('change'));
                }, 10);
                
                break; 
            }
        }
    }
    
    // CASO 2: Navegación normal (mantener selección si existe)
    else if (valorPrevio && !valorPrevio.startsWith('NAV_')) {
        let existe = false;
        for (let i = 0; i < resSelect.options.length; i++) {
            if (resSelect.options[i].value === valorPrevio) {
                resSelect.selectedIndex = i;
                existe = true;
                break;
            }
        }
    }
    
    // CASO 3: Fallback para Root
    // Si estamos en el menú principal y está seleccionado "Custom" (o nada útil), forzamos HD.
    if (currentViewMode === 'root' && resSelect.value === 'custom') {
          resSelect.value = "1920,1080"; 
          // Opcional: si quieres asegurar que los inputs cambien a 1920x1080 visualmente:
           setTimeout(() => resSelect.dispatchEvent(new Event('change')), 10);
    }
}

// Función auxiliar para Aspectos
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

// 🔥 EJECUTAR AL INICIO
document.addEventListener('DOMContentLoaded', () => {
    cargarDatosExternos();
    aplicarModoMobile();
});


// ==========================================
// 🔥 LISTENER DEL MENÚ DE RESOLUCIÓN (CORREGIDO)
// ==========================================
if (menuResoluciones) {
    menuResoluciones.addEventListener('change', () => {
        const val = menuResoluciones.value;

        // A. SI ELIGE UNA CARPETA ("Ver más...")
        if (val.startsWith('NAV_FOLDER_')) {
            const index = parseInt(val.replace('NAV_FOLDER_', ''));
            currentViewMode = index; // Entrar a la carpeta
            renderResolutionMenu(); // Redibujar
            return;
        }

        // B. SI ELIGE VOLVER
        if (val === 'NAV_BACK') {
            currentViewMode = 'root'; // Volver al inicio
            renderResolutionMenu();
            // Intentar volver a HD
            if (menuResoluciones.querySelector('option[value="1920,1080"]')) {
                menuResoluciones.value = "1920,1080";
                menuResoluciones.dispatchEvent(new Event('change'));
            }
            return;
        }

        // C. SELECCIÓN NORMAL
        if (val === 'custom' || val === '') return;

        const [nW, nH] = val.split(',');
        if(inputs.w) inputs.w.value = nW;
        if(inputs.h) inputs.h.value = nH;

        autoAdjustThickness(nW); 
        
        // Limpiar botones azules
        const contenedorRes = document.getElementById('resBtnContainer');
        if (contenedorRes) {
            contenedorRes.querySelectorAll('button.active').forEach(b => b.classList.remove('active'));
        }
        
        flashInput(inputs.w);
        flashInput(inputs.h);
        requestDraw();
    });
}


// ==========================================
// DRAG & DROP & IMAGE LOADER (Sin Cambios)
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

// Variables Imagen
let userImage = null;
let lastThickness = 2;
const imageLoader = document.getElementById('imageLoader');
const imageOptionsPanel = document.getElementById('imageOptionsPanel');
const showImageToggle = document.getElementById('showImageToggle');
const sizeWarning = document.getElementById('sizeWarning'); 

if (imageLoader) {
    let currentObjectUrl = null;
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);

        let fileName = file.name;
        if (fileName.toLowerCase().includes('temp') || fileName.length > 50) {
             const ext = fileName.split('.').pop();
             fileName = ext ? `Image_Loaded.${ext}` : "Image_Loaded";
        }

        const isValid = file.type.startsWith('image/') || fileName.toLowerCase().endsWith('.tiff') || fileName.toLowerCase().endsWith('.tif');
        if (!isValid) { alert("⚠️ Format not supported.\nPlease use JPG, PNG or TIFF."); imageLoader.value = ""; return; }

        const zone = document.querySelector('.upload-zone');
        const textSpan = zone ? zone.querySelector('.upload-text') : null;
        if (zone && textSpan) {
            textSpan.innerText = "Image Loaded"; 
            zone.classList.add('has-file'); 
            zone.style.borderColor = "#007bff"; 
        }

        const limitBytes = 20 * 1024 * 1024;
        let isHeavyFile = (file.size > limitBytes);
        if(sizeWarning) {
            sizeWarning.classList.add('hidden');
            if (isHeavyFile) { sizeWarning.innerText = "⚠️ Large file size (>20MB)"; sizeWarning.classList.remove('hidden'); }
        }

        const finalizarCarga = (blobUrl) => {
            currentObjectUrl = blobUrl;
            const img = new Image();
            img.onload = () => {
                userImage = img;
                const limitRes = 6000; 
                if (img.width > limitRes || img.height > limitRes) {
                    if (sizeWarning) {
                        const msg = isHeavyFile ? "⚠️ Large file & large resolution (>6K) Performance may lag." : "⚠️ Large resolution (>6K). Performance may lag.";
                        sizeWarning.innerText = msg;
                        sizeWarning.classList.remove('hidden');
                    }
                }
                if (imageOptionsPanel) imageOptionsPanel.classList.remove('hidden');
                if(inputs.w) inputs.w.value = img.width;
                if(inputs.h) inputs.h.value = img.height;
                if (typeof autoAdjustThickness === "function") autoAdjustThickness(img.width);
                if(menuResoluciones) menuResoluciones.value = 'custom';
                const clearContainer = (id) => { const cont = document.getElementById(id); if(cont) cont.querySelectorAll('button.active').forEach(b => b.classList.remove('active')); };
                clearContainer('resBtnContainer');
                flashInput(inputs.w); flashInput(inputs.h);
                if (typeof aplicarModoMobile === 'function') aplicarModoMobile();
                if(typeof requestDraw === 'function') requestDraw(); else draw();
            };
            img.onerror = () => { alert("Error loading image."); if(window.removeImage) window.removeImage(); };
            img.src = blobUrl;
        };

        const isTiff = fileName.toLowerCase().endsWith('.tiff') || fileName.toLowerCase().endsWith('.tif');
        if (isTiff) {
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
                    tempCanvas.toBlob((blob) => { const tiffUrl = URL.createObjectURL(blob); finalizarCarga(tiffUrl); }, 'image/png');
                } catch (err) { console.error(err); alert("Error processing TIFF."); if(window.removeImage) window.removeImage(); }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const objectUrl = URL.createObjectURL(file);
            finalizarCarga(objectUrl);
        }
    });
}

window.removeImage = function() {
    userImage = null;
    if(imageLoader) imageLoader.value = "";
    if (imageOptionsPanel) imageOptionsPanel.classList.add('hidden');
    if (sizeWarning) { sizeWarning.classList.add('hidden'); sizeWarning.innerText = ""; }
    const zone = document.querySelector('.upload-zone');
    const textSpan = zone ? zone.querySelector('.upload-text') : null;
    if (zone && textSpan) {
        textSpan.innerText = "Choose or drop image"; 
        zone.classList.remove('has-file'); zone.style.borderColor = ""; 
    }
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
    const w = parseInt(width);
    const idealThickness = (w > 3500) ? 6 : 2; 
    const currentVal = parseInt(inputs.thickness.value) || 0;
    if (currentVal === 0) lastThickness = idealThickness;
    else { inputs.thickness.value = idealThickness; lastThickness = idealThickness; }
}

// ==========================================
// 4. FUNCIÓN DRAW (PRINCIPAL)
// ==========================================
function draw() {
    if (!inputs.w || !inputs.h) return;

    const rawW = Math.max(1, Math.abs(parseInt(inputs.w.value) || 1920));
    const rawH = Math.max(1, Math.abs(parseInt(inputs.h.value) || 1080));
    const targetAspect = getAspectRatio(inputs.aspect ? inputs.aspect.value : 2.39);

    let scaleVal = inputs.scale ? parseInt(inputs.scale.value) : 100;
    if (isNaN(scaleVal)) scaleVal = 100;
    const scaleFactor = scaleVal / 100;
    if (textoEscala) textoEscala.innerText = scaleVal + "%";

    let opacityVal = inputs.opacity ? parseInt(inputs.opacity.value) : 100;
    if (isNaN(opacityVal)) opacityVal = 100;
    const opacity = opacityVal / 100;
    if (textoOpacidad) textoOpacidad.innerText = opacityVal + "%";

    let rawThick = parseInt(inputs.thickness ? inputs.thickness.value : 2);
    if (isNaN(rawThick)) rawThick = 2;
    if (rawThick > 10) { rawThick = 10; if(inputs.thickness) inputs.thickness.value = 10; }
    const mainThickness = Math.max(0, rawThick);
    const mainOffset = mainThickness / 2;
    const secThickness = mainThickness; 
    let safeThickness = 0;
    if (mainThickness > 0) safeThickness = Math.max(1, Math.round(mainThickness / 2));

    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    let width = rawW;
    let height = rawH;

    if (isCropMode) {
        height = Math.round(width / targetAspect);
    }

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const screenAspect = width / height;

    const mostrarImagen = !showImageToggle || showImageToggle.checked;
    
    if (userImage && mostrarImagen) {
        try {
            const isFill = inputs.scaleFill && inputs.scaleFill.checked;
            const shouldUseFillLogic = isFill || isCropMode;
            const ratioW = width / userImage.width;
            const ratioH = height / userImage.height;
            let renderRatio;
            if (shouldUseFillLogic) renderRatio = Math.max(ratioW, ratioH);
            else renderRatio = Math.min(ratioW, ratioH);

            const newW = userImage.width * renderRatio;
            const newH = userImage.height * renderRatio;
            const posX = (width - newW) / 2;
            const posY = (height - newH) / 2;
            ctx.drawImage(userImage, posX, posY, newW, newH);
        } catch (e) { console.error(e); }
    }

    let visibleW, visibleH;
    let offsetX, offsetY;

    if (isCropMode) {
        visibleW = width; visibleH = height; offsetX = 0; offsetY = 0;
    } else {
        if (targetAspect > screenAspect) { visibleW = width; visibleH = width / targetAspect; } 
        else { visibleH = height; visibleW = height * targetAspect; }
        visibleW = Math.round(visibleW * scaleFactor);
        visibleH = Math.round(visibleH * scaleFactor);
        const barHeight = Math.floor((height - visibleH) / 2);
        const barWidth = Math.floor((width - visibleW) / 2);
        offsetX = barWidth; offsetY = barHeight;
    }

    if (!isCropMode) {
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.fillRect(0, 0, width, offsetY); 
        ctx.fillRect(0, height - offsetY, width, offsetY); 
        ctx.fillRect(0, offsetY, offsetX, visibleH); 
        ctx.fillRect(width - offsetX, offsetY, offsetX, visibleH); 
    }

    // MAIN FRAMELINE
    if (mainThickness > 0) {
        if (inputs.color) ctx.strokeStyle = inputs.color.value;
        ctx.lineWidth = mainThickness; ctx.setLineDash([]); ctx.beginPath();
        ctx.rect(offsetX - mainOffset, offsetY - mainOffset, visibleW + (mainOffset * 2), visibleH + (mainOffset * 2));
        ctx.stroke();
    }

    // SECONDARY FRAMELINE
    let secX = 0, secY = 0, secW = 0, secH = 0;
    let drawSec = false;

    if (inputs.secOn && inputs.secOn.checked && secThickness > 0) {
        drawSec = true;
        const secAspect = getAspectRatio(inputs.secAspect ? inputs.secAspect.value : 1.77);
        const fitInside = inputs.secFit && inputs.secFit.checked;

        if (fitInside) {
            const mainFrameAspect = visibleW / visibleH;
            if (secAspect > mainFrameAspect) { secW = visibleW; secH = visibleW / secAspect; } 
            else { secH = visibleH; secW = visibleH * secAspect; }
        } else {
            if (secAspect > screenAspect) { secW = width; secH = width / secAspect; } 
            else { secH = height; secW = height * secAspect; }
            secW = secW * scaleFactor;
        }
        secW = Math.round(secW); secH = Math.round(secH);
        secX = (width - secW) / 2; secY = (height - secH) / 2;

        if(inputs.secColor) ctx.strokeStyle = inputs.secColor.value;
        ctx.lineWidth = secThickness; ctx.setLineDash([10, 5]); ctx.beginPath();
        ctx.rect(secX, secY, secW, secH);
        ctx.stroke();
    }

    // SAFE AREAS
    if (safeThickness > 0) {
        const drawSafe = (pct, dashed) => {
            const p = pct / 100;
            const sW = visibleW * p; const sH = visibleH * p;
            const sX = (width - sW) / 2; const sY = (height - sH) / 2;
            ctx.lineWidth = safeThickness;
            if(inputs.color) ctx.strokeStyle = inputs.color.value;
            ctx.setLineDash(dashed ? [5, 5] : []); ctx.beginPath();
            ctx.rect(sX, sY, sW, sH); ctx.stroke();
        };
        if (inputs.safeActionOn && inputs.safeActionOn.checked) drawSafe(parseFloat(inputs.safeActionVal.value)||93, false);
        if (inputs.safeTitleOn && inputs.safeTitleOn.checked) drawSafe(parseFloat(inputs.safeTitleVal.value)||90, true);
    }

    // LABELS
    const showAspect = inputs.showLabels && inputs.showLabels.checked;
    const showRes = inputs.showResLabels && inputs.showResLabels.checked;

    if (showAspect || showRes) {
        const fontSize = Math.max(12, Math.round(width / 80)); 
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textBaseline = "top";
        const padding = 10; 
        const lineHeight = fontSize + 6; 

        if (mainThickness > 0) {
            ctx.fillStyle = inputs.color.value;
            const txtAsp = obtenerRatioTexto(Math.round(visibleW), Math.round(visibleH));
            const txtRes = `${Math.round(visibleW)} x ${Math.round(visibleH)}`;
            const wAsp = ctx.measureText(txtAsp).width; const wRes = ctx.measureText(txtRes).width;
            const isTightHoriz = (wAsp + wRes + (padding * 4)) > visibleW;

            if (showAspect) { ctx.textAlign = "left"; ctx.fillText(txtAsp, offsetX + padding, offsetY + padding); }
            if (showRes) {
                if (isTightHoriz && showAspect) { ctx.textAlign = "left"; ctx.fillText(txtRes, offsetX + padding, offsetY + padding + lineHeight); } 
                else { ctx.textAlign = showAspect ? "right" : "left"; const posX = showAspect ? (offsetX + visibleW - padding) : (offsetX + padding); ctx.fillText(txtRes, posX, offsetY + padding); }
            }
       }

        // --- B. DIBUJAR SECONDARY FRAMELINE TEXT ---
        if (drawSec && inputs.secAspect) {
            ctx.fillStyle = inputs.secColor.value;
            const txtSecAsp = obtenerRatioTexto(Math.round(secW), Math.round(secH));
            const txtSecRes = `${Math.round(secW)} x ${Math.round(secH)}`;
            let textY = secY + padding;
            const verticalGap = Math.abs(offsetY - secY);
            if (verticalGap < (lineHeight * 1.5)) textY += lineHeight; 
            const wSecAsp = ctx.measureText(txtSecAsp).width; const wSecRes = ctx.measureText(txtSecRes).width;
            const isSecTight = (wSecAsp + wSecRes + (padding * 4)) > secW;

            if (showAspect) { ctx.textAlign = "left"; ctx.fillText(txtSecAsp, secX + padding, textY); }
            if (showRes) {
                if (isSecTight && showAspect) { ctx.textAlign = "left"; ctx.fillText(txtSecRes, secX + padding, textY + lineHeight); } 
                else { ctx.textAlign = showAspect ? "right" : "left"; const posX = showAspect ? (secX + secW - padding) : (secX + padding); ctx.fillText(txtSecRes, posX, textY); }
            }
        }
    }
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

// Listener Aspecto
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

// Listener SecAspect
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

// Sincronización Manual W/H
if (inputs.w) { inputs.w.addEventListener('input', () => { if (menuResoluciones) menuResoluciones.value = 'custom'; clearActiveButtons('.presets'); }); }
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

// Toggles
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

// Global Presets
window.setPreset = function(w, h, btn) {
    if(inputs.w) inputs.w.value = w;
    if(inputs.h) inputs.h.value = h;
    autoAdjustThickness(w);
    const key = `${w},${h}`;
    if(menuResoluciones) { menuResoluciones.value = key; if(menuResoluciones.value !== key) menuResoluciones.value = 'custom'; }
    flashInput(inputs.w); flashInput(inputs.h); highlightButton(btn); requestDraw();
}
window.setAspect = function(val, btn) {
    if(cajaAspecto) cajaAspecto.classList.remove('hidden');
    if(inputs.aspect) inputs.aspect.value = val;
    if(menuAspecto) { menuAspecto.value = val; if(menuAspecto.value != val) menuAspecto.value = 'custom'; }
    const currentThick = parseInt(inputs.thickness ? inputs.thickness.value : 0) || 0;
    if (currentThick === 0) {
        const currentW = parseInt(inputs.w.value) || 1920;
        const idealThickness = (currentW > 3500) ? 6 : 2;
        if (inputs.thickness) inputs.thickness.value = idealThickness;
        if (typeof lastThickness !== 'undefined') lastThickness = idealThickness;
        if (typeof updateQuickBtnState === 'function') updateQuickBtnState();
    }
    flashInput(inputs.aspect); highlightButton(btn); requestDraw();
}
window.setOpacity = function(val, btn) {
    if(inputs.opacity) inputs.opacity.value = val;
    flashInput(inputs.opacity); highlightButton(btn); requestDraw();
}

// Descarga
btnDownload.addEventListener('click', () => {
    const w = parseInt(inputs.w.value) || 1920;
    const h = parseInt(inputs.h.value) || 1080;
    let asp = "ratio";
    if (inputs.aspect) asp = inputs.aspect.value.replace(':', '-').replace('.', '_'); 
    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);

    // Creamos el elemento de descarga
    const a = document.createElement('a');

    if (isCropMode) {
        const type = hasPhoto ? 'image/jpeg' : 'image/png';
        const quality = hasPhoto ? 1.0 : undefined;
        const ext = hasPhoto ? 'jpg' : 'png';
        a.href = canvas.toDataURL(type, quality);
        a.download = `Frameline_${w}x${h}_${asp}_cropped.${ext}`;
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
        a.href = canvas.toDataURL('image/jpeg', 0.9);
        a.download = `Frameline_${w}x${h}_${asp}_preview.jpg`;
        setTimeout(() => { if(typeof requestDraw === 'function') requestDraw(); else draw(); }, 0); 
    } else {
        a.href = canvas.toDataURL('image/png');
        a.download = `Frameline_${w}x${h}_${asp}.png`;
    }
    if (typeof gtag === 'function') { gtag('event', 'download_file', { 'event_category': 'Engagement', 'event_label': isCropMode ? 'Crop' : (hasPhoto ? 'Preview' : 'Template') }); }
    a.click();
});

// Quick Toggle
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

// Reset Total (CORREGIDO PARA NAVEGACIÓN)
const resetBtn = document.getElementById('resetAllBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        if(inputs.w) inputs.w.value = 1920;
        if(inputs.h) inputs.h.value = 1080;
        if(inputs.aspect) inputs.aspect.value = 2.38695;
        if(inputs.opacity) inputs.opacity.value = 0;
        if(textoOpacidad) textoOpacidad.innerText = "100%";
        if(inputs.scale) inputs.scale.value = 100;
        if(textoEscala) textoEscala.innerText = "100%";
        if(inputs.color) inputs.color.value = "#00ff00";
        if(inputs.thickness) inputs.thickness.value = 2;
        const secColorInput = document.getElementById('secFrameColor');
        if (secColorInput) secColorInput.value = "#0000FF";
        
        const hideById = (id) => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); };
        const uncheckById = (id) => { const el = document.getElementById(id); if (el) el.checked = false; };
        hideById('aspectGroup'); hideById('secFrameControls'); hideById('advancedGroup'); hideById('infoPanel');
        
        uncheckById('secFrameOn'); uncheckById('safeActionToggle'); uncheckById('safeTitleToggle');
        if(inputs.safeActionVal) inputs.safeActionVal.value = 93;
        if(inputs.safeTitleVal) inputs.safeTitleVal.value = 90;
        uncheckById('showLabelsToggle'); uncheckById('showResLabelsToggle');
        uncheckById('secFrameFit'); uncheckById('scaleFill');
        const fitRadio = document.getElementById('scaleFit'); if(fitRadio) fitRadio.checked = true;

        const arrowEl = document.getElementById('arrow'); if(arrowEl) arrowEl.innerText = "▼";
        const infoArrow = document.getElementById('infoArrow'); if(infoArrow) infoArrow.innerText = "▼";
        if (typeof removeImage === "function") removeImage();

        // RESETEAR MENÚS Y NAVEGACIÓN
        currentViewMode = 'root';
        renderResolutionMenu();
        if(menuResoluciones) menuResoluciones.value = "1920,1080"; 
        
        if(menuAspecto) menuAspecto.value = "2.38695";
        if(menuSecAspect) menuSecAspect.value = "9:16";
        if (inputs.secAspect) inputs.secAspect.value = "9:16";

        const clearContainer = (id) => { const cont = document.getElementById(id); if(cont) cont.querySelectorAll('button.active').forEach(b => b.classList.remove('active')); };
        clearContainer('resBtnContainer'); clearContainer('aspectBtnContainer'); clearContainer('opacityBtnContainer');
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