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
    scaleCrop: getEl('scaleCrop')
};

// ==========================================
// VARIABLES GLOBALES (Todo junto aquí arriba)
// ==========================================
let resolucionesData = [];
let currentViewMode = 'root'; // Variable para controlar la navegación de carpetas
let userImage = null;        
let lastThickness = 2;       
let isFullGateMode = false; // Variable para saber si estamos en modo MAX 

// ==========================================
// CARGADOR DE DATOS EXTERNOS (JSON)
// ==========================================

async function cargarDatosExternos() {
    try {
        // 1. Cargar JSON Resoluciones
        const resResponse = await fetch('resolutions.json');
        resolucionesData = await resResponse.json(); 

        // 2. Renderizar Menú Híbrido
        renderResolutionMenu(); 

        // 3. Cargar Aspectos
        const aspResponse = await fetch('aspects.json');
        const aspData = await aspResponse.json();
        llenarSelectSimple('aspectSelect', aspData);
        llenarSelectSimple('secAspectSelect', aspData);

        // --- CONFIGURACIÓN INICIAL (DEFAULTS) ---

        // A. FORZAR EL VALOR MATEMÁTICO (Esto es lo importante para que se vea el frameline)
        if (inputs.aspect) inputs.aspect.value = "2.38695";

        // B. Sincronizar el Dropdown visualmente
        const aspectSelect = document.getElementById('aspectSelect');
        if (aspectSelect) {
            // Intentamos seleccionar el option que tenga ese valor
            if (aspectSelect.querySelector('option[value="2.38695"]')) {
                aspectSelect.value = "2.38695";
            } else if (aspectSelect.querySelector('option[value="2.39"]')) {
                aspectSelect.value = "2.39";
            } else {
                aspectSelect.value = "custom";
            }
        }

        // C. Activar los Labels (Textos)
        if (inputs.showLabels) inputs.showLabels.checked = true;
        if (inputs.showResLabels) inputs.showResLabels.checked = true;

        // D. Forzar 9:16 en secundario
        const secSelect = document.getElementById('secAspectSelect');
        if (secSelect && secSelect.querySelector('option[value="9:16"]')) {
            secSelect.value = "9:16";
        }
        if (inputs.secAspect) inputs.secAspect.value = "9:16";

        // 🔥 E. DIBUJAR FINAL (Obligatorio para que aparezca al cargar)
        if (typeof requestDraw === 'function') requestDraw();
        else draw();

        activarBotonHD();

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
            //Voy a poner las categorías que aún no he completado, pero la idea es
            // que solo sea Broadcast y DCI los que no se expandan.
            const mostrarTodo = nombre.includes("Broadcast") || nombre.includes("DCI")
             || nombre.includes("Social Media") || nombre.includes("RED")
             || nombre.includes("Blackmagic");
            
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
// 🔥 LISTENER DEL MENÚ DE RESOLUCIÓN (USANDO VARIABLE GLOBAL)
// ==========================================
if (menuResoluciones) {
    menuResoluciones.addEventListener('change', () => {
        const val = menuResoluciones.value;

        // A. GESTIÓN DE NAVEGACIÓN
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
                // 2. 🔥 SOLUCIÓN: setTimeout
                // Esperamos 50ms a que termine la limpieza y ENTONCES prendemos el botón.
                setTimeout(() => {
                    activarBotonHD();
                }, 50);
            }
            return;
        }
        if (val === 'custom' || val === '') return;

        // B. CAMBIAR RESOLUCIÓN
        const [nW, nH] = val.split(',').map(Number);
        if(inputs.w) inputs.w.value = nW;
        if(inputs.h) inputs.h.value = nH;

        autoAdjustThickness(nW); 
        
        // C. APLICAR LÓGICA DE ASPECTO SEGÚN LA VARIABLE
        // Si la bandera está encendida, forzamos el nuevo aspecto nativo.
        if (isFullGateMode && nH > 0) {
            const newNativeAspect = nW / nH;
            if(inputs.aspect) inputs.aspect.value = parseFloat(newNativeAspect.toFixed(5));
            if(menuAspecto) menuAspecto.value = 'custom';
        } 
        // Si isFullGateMode es false, NO tocamos el aspecto (se queda en 1.85, 2.39, etc.)

        // D. LIMPIEZA VISUAL
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

// Variables Imagen
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
                // --- CORRECCIÓN ---
                // Si estamos dentro de una carpeta (ej. Arri), volvemos al menú principal
                // porque dentro de Arri NO existe la opción 'custom'.
                if (typeof currentViewMode !== 'undefined' && currentViewMode !== 'root') {
                    currentViewMode = 'root';
                    renderResolutionMenu();
                }
                
                // Borramos cualquier nombre "fantasma" que tuviéramos guardado
                if (typeof savedLabelName !== 'undefined') savedLabelName = "";

                // Ahora sí, seleccionamos Custom (que ya existe porque volvimos a root)
                if(menuResoluciones) menuResoluciones.value = 'custom';
                // ------------------
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

function activarBotonHD() {
    const container = document.getElementById('resBtnContainer');
    if (!container) return;
    
    // 1. Apagar todos primero
    const btns = container.querySelectorAll('button');
    btns.forEach(b => b.classList.remove('active'));

    // 2. Buscar SOLAMENTE el botón de HD (excluyendo UHD)
    btns.forEach(btn => {
        const txt = btn.innerText.trim(); // Limpia espacios
        
        // La lógica: 
        // - Si es exactamente "HD"
        // - O si contiene "HD" PERO NO contiene "UHD"
        // - O si contiene "1920" (por si cambias el texto)
        if (txt === 'HD' || (txt.includes('HD') && !txt.includes('UHD')) || txt.includes('1920')) {
            btn.classList.add('active');
        }
    });
}

// Convierte DataURL a Archivo (Blob) para poder compartirlo
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

    // ===============================================
    // 🔥 NUEVO: CANVAS NAME / LABEL (Corregido)
    // ===============================================
    if (inputs.showCanvasRes && inputs.showCanvasRes.checked) {
        const fontSize = Math.max(12, Math.round(width / 80)); 
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = inputs.color ? inputs.color.value : '#00FF00';
        
        ctx.textAlign = "left"; 
        ctx.textBaseline = "bottom";

        // 1. Obtener el texto base
        let finalText = "";
        
        // Verificamos si el menú existe y si NO está en 'custom'
        // (Si menuResoluciones.value es 'custom', significa que el usuario movió los sliders manualmente)
        const isCustom = !menuResoluciones || menuResoluciones.value === 'custom';

        if (!isCustom && menuResoluciones.selectedIndex >= 0) {
            // A. Es un Preset: Obtenemos el nombre del dropdown
            const rawText = menuResoluciones.options[menuResoluciones.selectedIndex].text;
            
            // B. LIMPIEZA: Usamos una expresión regular (Regex) para borrar 
            // cualquier cosa que esté entre paréntesis al final, incluyendo el espacio antes.
            // Ej: "Arri Alexa (3200x1800)" -> "Arri Alexa"
            finalText = rawText.replace(/\s*\(.*?\)\s*$/, '').trim();
            
            // Seguridad: Si por alguna razón el texto queda vacío, poner la resolución
            if (!finalText) finalText = `${width} x ${height}`;
            
        } else {
            // C. Es Custom: Mostramos solo números
            finalText = `Custom: ${width} x ${height}`;
        }

        const padding = Math.max(10, width * 0.02);

        // Sombra y Borde (Stroke) para legibilidad máxima
        ctx.lineWidth = fontSize * 0.12; // Grosor proporcional a la letra
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)"; // Borde negro casi opaco
        ctx.strokeText(finalText, padding, height - padding); 
        
        // Relleno de color
        ctx.fillText(finalText, padding, height - padding);
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

// =========================================================
// Global Presets (INTELIGENTE: Detecta si estabas en Full o Crop)
// =========================================================
window.setPreset = function(w, h, btn) {
    // 1. Guardar estado ANTES de cambiar
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

    // 2. Si estaba en Full, recalculamos aspecto para la nueva resolución
    if (estabaEnFull && h > 0) {
        const newNative = w / h;
        if(inputs.aspect) inputs.aspect.value = parseFloat(newNative.toFixed(5));
        if(menuAspecto) menuAspecto.value = 'custom';
        // Limpiamos botones visuales
        const btnContainer = document.getElementById('aspectBtnContainer');
        if (btnContainer) btnContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    }

    flashInput(inputs.w); flashInput(inputs.h); 
    if(estabaEnFull) flashInput(inputs.aspect); 
    highlightButton(btn); 
    requestDraw();
}

// Botones de Aspecto (1.85, 2.39, 4:3) -> APAGAN EL MODO FULL
window.setAspect = function(val, btn) {
    isFullGateMode = false; // <-- Importante: Apagamos la bandera Full

    if(cajaAspecto) cajaAspecto.classList.remove('hidden');
    let finalVal = val;
    if (val === '4:3') finalVal = (4/3).toFixed(5);
    
    if(inputs.aspect) inputs.aspect.value = finalVal;
    if(menuAspecto) { menuAspecto.value = val; if(menuAspecto.value != val) menuAspecto.value = 'custom'; }

    // Auto-thickness logic (resumida)
    const currentThick = parseInt(inputs.thickness ? inputs.thickness.value : 0) || 0;
    if (currentThick === 0) {
        const currentW = parseInt(inputs.w.value) || 1920;
        if (inputs.thickness) inputs.thickness.value = (currentW > 3500) ? 6 : 2;
        if (typeof updateQuickBtnState === 'function') updateQuickBtnState();
    }
    flashInput(inputs.aspect); 
    requestDraw();
}

// Botón MAX / FULL -> ENCIENDE EL MODO FULL
window.setFullGate = function(btn) {
    const w = parseFloat(inputs.w.value);
    const h = parseFloat(inputs.h.value);
    
    if (h > 0) {
        isFullGateMode = true; // <-- Importante: Encendemos la bandera Full

        if(cajaAspecto) cajaAspecto.classList.remove('hidden');

        const nativeAspect = w / h;
        if(inputs.aspect) {
            inputs.aspect.value = parseFloat(nativeAspect.toFixed(5));
        }
        if(menuAspecto) menuAspecto.value = 'custom';
        
        flashInput(inputs.aspect);
        // AGREGADO: Forzamos el encendido visual inmediato del botón
        highlightButton(btn);
        requestDraw();
    }
}

// Botones de Opacidad 
window.setOpacity = function(val, btn) {
    if(inputs.opacity) inputs.opacity.value = val;
    flashInput(inputs.opacity); highlightButton(btn); requestDraw();
}

// ==========================================
// DESCARGAR PNG 
// ==========================================
btnDownload.addEventListener('click', async () =>   {
    const w = parseInt(inputs.w.value) || 1920;
    const h = parseInt(inputs.h.value) || 1080;
    let asp = "ratio";
    if (inputs.aspect) asp = inputs.aspect.value.replace(':', '-').replace('.', '_'); 
    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);
    const a = document.createElement('a');

    // Determinamos nombre y tipo
    let fileName, dataUrl;

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

        dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        fileName = `Frameline_${w}x${h}_${asp}_preview.jpg`;

        setTimeout(() => { if(typeof requestDraw === 'function') requestDraw(); else draw(); }, 0); 
    } else {
        dataUrl = canvas.toDataURL('image/png');
        fileName = `Frameline_${w}x${h}_${asp}.png`;
    }
    if (typeof gtag === 'function') { gtag('event', 'download_file', { 'event_category': 'Engagement', 'event_label': isCropMode ? 'Crop' : (hasPhoto ? 'Preview' : 'Template') }); }
    a.click();

    // ===============================================
    // 🔥 LÓGICA INTELIGENTE: COMPARTIR O DESCARGAR
    // ===============================================
    
    // Convertimos la DataURL a un objeto File real
    const blob = dataURItoBlob(dataUrl);
    const file = new File([blob], fileName, { type: blob.type });

    // Detectamos si es un dispositivo móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // SOLO compartimos si es Móvil Y el navegador lo soporta.
    // En Desktop (aunque soporte compartir) preferimos descargar directo.
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Frameline Generator',
                text: 'Created with frameline-generator.com'
            });
            mostrarFeedbackExito(btnDownload);
        } catch (error) {
            // Si el usuario cancela en el celular, no pasa nada.
            console.log('Share canceled', error);
        }
    } else {
        // --- MODO COMPUTADORA (Descarga Directa) ---
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a); // Fix para Firefox a veces
        a.click();
        document.body.removeChild(a);
        mostrarFeedbackExito(btnDownload);
    }

    // ===============================================
    // 🔥 NUEVO: FEEDBACK VISUAL (BOTE DE ÉXITO) LO DEJÉ AQUÍ COMENTADO POR SI ALGÚN DÍA QUIERO PONERLO OTRA VEZ O MEJORARLO.
    // ===============================================
    
    // 1. Guardamos el texto original para no perderlo
    // (Usamos un atributo data para seguridad, o una variable local)
    /*
    const originalText = btnDownload.innerText; 
    const originalColor = btnDownload.style.backgroundColor;

    // 2. Cambiamos el estado a "ÉXITO"
    
    btnDownload.innerText = "Downloaded!";
    btnDownload.style.backgroundColor = "#28a745"; // Verde Éxito
    btnDownload.style.borderColor = "#28a745";
    btnDownload.style.color = "#fff";
    btnDownload.style.transition = "all 0.3s ease"; // Suavizado
    
    // Opcional: Desactivar botón momentáneamente para evitar doble clic
    btnDownload.disabled = true;
    btnDownload.style.cursor = "default";

    // 3. Regresamos a la normalidad después de 2 segundos (2000 ms)
    setTimeout(() => {
        btnDownload.innerText = "Download PNG"; // O usa 'originalText' si prefieres
        btnDownload.style.backgroundColor = ""; // Regresa al color del CSS
        btnDownload.style.borderColor = "";
        btnDownload.style.color = "";
        btnDownload.disabled = false;
        btnDownload.style.cursor = "pointer";
    }, 2000);
    */
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

// Reset Total (CONFIGURADO PARA INICIAR CON FRAMELINES VISIBLES)
const resetBtn = document.getElementById('resetAllBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        // 1. Resolución HD
        if(inputs.w) inputs.w.value = 1920;
        if(inputs.h) inputs.h.value = 1080;
        
        // 2. Aspecto Scope (2.39)
        if(inputs.aspect) inputs.aspect.value = "2.38695"; 
        
        // 3. Labels ACTIVADOS
        if(inputs.showLabels) inputs.showLabels.checked = true;
        if(inputs.showResLabels) inputs.showResLabels.checked = true;

        // Resto de valores default
        if(inputs.opacity) inputs.opacity.value = 0;
        if(textoOpacidad) textoOpacidad.innerText = "100%";
        if(inputs.scale) inputs.scale.value = 100;
        if(textoEscala) textoEscala.innerText = "100%";
        if(inputs.color) inputs.color.value = "#00ff00";
        if(inputs.thickness) inputs.thickness.value = 2;
        const secColorInput = document.getElementById('secFrameColor');
        if (secColorInput) secColorInput.value = "#0000FF";
        
        isFullGateMode = false; // Apagar modo full al resetear

        // Ocultar paneles
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

        // Resetear Menú Resolución
        currentViewMode = 'root';
        renderResolutionMenu();
        if(menuResoluciones) menuResoluciones.value = "1920,1080"; 
        
        // Resetear Dropdowns de Aspecto
        if(menuAspecto) menuAspecto.value = "2.38695";
        if(menuSecAspect) menuSecAspect.value = "9:16";
        if (inputs.secAspect) inputs.secAspect.value = "9:16";

        // Limpiar botones UI
        const clearContainer = (id) => { const cont = document.getElementById(id); if(cont) cont.querySelectorAll('button.active').forEach(b => b.classList.remove('active')); };
        clearContainer('resBtnContainer'); clearContainer('aspectBtnContainer'); clearContainer('opacityBtnContainer');

        activarBotonHD();
        
        const qBtn = document.getElementById('quickFrameBtn');
        const qTxt = document.getElementById('quickFrameText');
        if(qBtn) { qBtn.style.color = "#007bff"; qBtn.querySelector('span').innerText = "⍉"; if(qTxt) qTxt.innerText = "On"; }
        
        // Dibujar
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

        // 1. Si estamos en modo MAX/FULL (Variable explícita)
        if (txt.includes('max') || txt.includes('full') || txt.includes('canvas') || txt.includes('open')) {
            if (isFullGateMode) btn.classList.add('active');
        }
        // 2. Si NO estamos en modo Max (Botones numéricos)
        else if (!isFullGateMode) {
            if (txt.includes('2.39') && (Math.abs(currentAsp - 2.38695) < epsilon || Math.abs(currentAsp - 2.39) < epsilon)) {
                btn.classList.add('active');
            }
            else if (txt.includes('1.85') && Math.abs(currentAsp - 1.85) < epsilon) {
                btn.classList.add('active');
            }
            else if (txt.includes('4:3') && Math.abs(currentAsp - (4/3)) < epsilon) {
                btn.classList.add('active'); // Esto arregla el 4:3
            }
        }
    });
}

// ==========================================
// 6. LÓGICA DE PRIVACY POLICY Y DISCLAIMER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const privacyBtn = document.getElementById('openPrivacy');
    const disclaimerBtn = document.getElementById('openDisclaimer'); // <--- Agregamos esto aquí
    const privacyModal = document.getElementById('privacyModal');
    const closePrivacy = document.getElementById('closePrivacy');

    // Verificamos que el modal y el botón de cerrar existan para evitar errores
    if (privacyModal && closePrivacy) {

        // 1. Abrir con botón Privacy
        if (privacyBtn) {
            privacyBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                privacyModal.classList.remove('hidden');
            });
        }

        // 2. Abrir con botón Disclaimer (NUEVO)
        if (disclaimerBtn) {
            disclaimerBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                // AQUÍ ESTABA EL ERROR: Usamos 'privacyModal', no 'modal'
                privacyModal.classList.remove('hidden'); 
            });
        }
        
        // 3. Cerrar con la X
        closePrivacy.addEventListener('click', () => {
            privacyModal.classList.add('hidden');
        });

        // 4. Cerrar picando fuera
        privacyModal.addEventListener('click', (e) => {
            if (e.target === privacyModal) {
                privacyModal.classList.add('hidden');
            }
        });
    }
});
