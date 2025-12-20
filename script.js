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

    // NUEVOS (Solo los inputs):
    posXInput: getEl('posXInput'),
    posYInput: getEl('posYInput')
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

/// ==========================================
// CARGADOR DE IMÁGENES OPTIMIZADO (ANTI-CRASH)
// ==========================================

// Variables Imagen
const imageLoader = document.getElementById('imageLoader');
const imageOptionsPanel = document.getElementById('imageOptionsPanel');
const showImageToggle = document.getElementById('showImageToggle');
const sizeWarning = document.getElementById('sizeWarning'); 

// Variable global para limpiar memoria
let currentObjectUrl = null;

if (imageLoader) {
    imageLoader.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Limpieza inicial
        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);

        // 2. Validaciones de nombre
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

        // 3. UI: Feedback inmediato "Procesando..."
        const zone = document.querySelector('.upload-zone');
        const textSpan = zone ? zone.querySelector('.upload-text') : null;
        if (zone && textSpan) {
            textSpan.innerText = "⏳ Processing..."; 
            zone.classList.add('has-file'); 
            zone.style.borderColor = "#ffcc00"; // Amarillo
        }

        // 4. Advertencia inicial de peso (MB)
        const limitBytes = 20 * 1024 * 1024; // 20MB
        let isHeavyFile = (file.size > limitBytes);
        if(sizeWarning) {
            sizeWarning.classList.add('hidden');
            if (isHeavyFile) { 
                sizeWarning.innerText = "⚠️ Large file size (>20MB). Processing..."; 
                sizeWarning.classList.remove('hidden'); 
            }
        }

        // 5. Ejecución diferida (setTimeout) para que la UI se actualice antes de congelarse
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

// --- LÓGICA DE OPTIMIZACIÓN Y REDIMENSIONADO CORREGIDA ---
function finalizarCarga(blobUrl, isHeavyFile, zone, textSpan) {
    if (currentObjectUrl && currentObjectUrl !== blobUrl) {
        URL.revokeObjectURL(currentObjectUrl);
    }
    currentObjectUrl = blobUrl;

    const tempImg = new Image();
    
    tempImg.onload = () => {
        // DETECCIÓN DE DISPOSITIVO
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const MAX_SAFE_SIZE = isMobile ? 6500 : 12000;
        
        let wasResized = false; 

        if (tempImg.width > MAX_SAFE_SIZE || tempImg.height > MAX_SAFE_SIZE) {
            
            try {
                // Cálculo de escala
                const scale = Math.min(MAX_SAFE_SIZE / tempImg.width, MAX_SAFE_SIZE / tempImg.height);
                const newW = Math.round(tempImg.width * scale);
                const newH = Math.round(tempImg.height * scale);

                console.log(`⚠️ Optimization: Resizing from ${tempImg.width}x${tempImg.height} to ${newW}x${newH}`);

                const offCanvas = document.createElement('canvas');
                offCanvas.width = newW;
                offCanvas.height = newH;
                const ctx = offCanvas.getContext('2d');
                ctx.drawImage(tempImg, 0, 0, newW, newH);

                // Conversión a JPG
                const optimizedUrl = offCanvas.toDataURL('image/jpeg', 0.90);
                const optimizedImg = new Image();
                
                optimizedImg.onload = () => {
                    // Aplicamos la imagen nueva
                    aplicarImagenAlSistema(optimizedImg, isHeavyFile, true, zone, textSpan);
                    
                    // 🔥 CORRECCIÓN CRÍTICA AQUÍ 🔥
                    // Desactivamos los listeners de la imagen original antes de borrarla
                    // para evitar que salte el alert("Error loading") por error.
                    tempImg.onload = null;
                    tempImg.onerror = null;
                    
                    // Ahora sí limpiamos memoria seguro
                    tempImg.src = ""; 
                    offCanvas.width = 1; 
                };

                optimizedImg.onerror = () => {
                    // Si falla la optimizada, usamos la original como fallback
                    console.warn("Optimization failed, using original.");
                    aplicarImagenAlSistema(tempImg, isHeavyFile, false, zone, textSpan);
                };

                optimizedImg.src = optimizedUrl;
                wasResized = true;

            } catch (err) {
                // Si algo falla en el proceso de canvas (memoria llena), usamos la original
                console.error("Resize error:", err);
                aplicarImagenAlSistema(tempImg, isHeavyFile, false, zone, textSpan);
            }

        } else {
            // Imagen segura, usamos la original
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

// --- APLICAR IMAGEN Y CONFIGURAR UI ---
function aplicarImagenAlSistema(img, isHeavyFile, wasResized, zone, textSpan) {
    userImage = img; // Asignación Global

    // Feedback Visual Final
    if (zone && textSpan) {
        textSpan.innerText = "Image Loaded"; 
        zone.style.borderColor = "#007bff"; // Azul
    }

    // Manejo de Advertencias (Smart Warning)
    if (sizeWarning) {
        sizeWarning.classList.add('hidden'); 
        
        if (wasResized) {
            // Caso: Celular optimizado
            sizeWarning.innerText = "ℹ️ Image optimized for performance.";
            sizeWarning.classList.remove('hidden');
        } 
        else if (img.width > 6000 || img.height > 6000) {
            // Caso: Desktop con imagen gigante (sin recortar)
            const msg = isHeavyFile 
                ? "⚠️ Large file & resolution (>6K). Performance may lag." 
                : "⚠️ Large resolution (>6K). Performance may lag.";
            sizeWarning.innerText = msg;
            sizeWarning.classList.remove('hidden');
        }
        else if (isHeavyFile) {
            // Caso: Archivo pesado pero resolución normal
            sizeWarning.innerText = "⚠️ Large file size (>20MB).";
            sizeWarning.classList.remove('hidden');
        }
    }

    // Mostrar panel
    if (imageOptionsPanel) imageOptionsPanel.classList.remove('hidden');

    // Configurar Inputs
    if(inputs.w) inputs.w.value = img.width;
    if(inputs.h) inputs.h.value = img.height;
    if (typeof autoAdjustThickness === "function") autoAdjustThickness(img.width);

    // Lógica de Menús y Carpetas (Resetear si estamos dentro de Arri/Red/etc)
    if (typeof currentViewMode !== 'undefined' && currentViewMode !== 'root') {
        currentViewMode = 'root';
        if (typeof renderResolutionMenu === 'function') renderResolutionMenu();
    }
    
    // Limpiar selección anterior
    if (typeof savedLabelName !== 'undefined') savedLabelName = "";
    if(menuResoluciones) menuResoluciones.value = 'custom';

    const clearContainer = (id) => { const cont = document.getElementById(id); if(cont) cont.querySelectorAll('button.active').forEach(b => b.classList.remove('active')); };
    clearContainer('resBtnContainer');
    
    // Efectos y Dibujado
    flashInput(inputs.w); 
    flashInput(inputs.h);
    if (typeof aplicarModoMobile === 'function') aplicarModoMobile();
    
    if(typeof requestDraw === 'function') requestDraw(); 
    else draw();
}

// --- HELPER PARA TIFF ---
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

// --- RESET UI HELPER ---
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
    
    // CORRECCIÓN: Si 'width' viene vacío (undefined), leemos el input.
    let val = width !== undefined ? width : (inputs.w ? inputs.w.value : 0);
    
    const w = parseInt(val) || 0;
    
    // Lógica original
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
// 4. FUNCIÓN DRAW (CORREGIDA: LÍMITES 8K DCI + MENSAJES DINÁMICOS)
// ==========================================
function draw() {
    if (!inputs.w || !inputs.h) return;

    // 1. Obtener dimensiones ORIGINALES
    let logicW = Math.max(1, Math.abs(parseInt(inputs.w.value) || 1920));
    let logicH = Math.max(1, Math.abs(parseInt(inputs.h.value) || 1080));

    // 2. LÓGICA DE "CROP"
    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    const targetAspect = getAspectRatio(inputs.aspect ? inputs.aspect.value : 2.39);

    if (isCropMode) {
        logicH = Math.round(logicW / targetAspect);
    }

    // 3. SEGURIDAD MÓVIL (AJUSTADA)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);

    // --- DEFINICIÓN DE LÍMITES ---
    // 8K UHD = ~33.1 MP
    // 8K DCI = ~35.4 MP
    // URSA 17K = ~141 MP
    
    // CASO A (CON FOTO): Subimos el límite a 36 MP.
    // Esto permite que el 8K DCI pase LIMPIO sin advertencias.
    // Todo lo que sea mayor a 8K DCI (ej: 12K, 17K) activará la protección.
    
    // CASO B (SOLO LÍNEAS): Límite 150 MP.
    // Esto soporta la URSA 17K completa.
    
    const PIXEL_LIMIT = hasPhoto ? 36000000 : 150000000; 
    
    const currentPixels = logicW * logicH;
    
    // Variables finales
    let finalW = logicW;
    let finalH = logicH;

    const warningEl = document.getElementById('sizeWarning');

    if (isMobile && currentPixels > PIXEL_LIMIT) {
        
        // --- MENSAJERÍA INTELIGENTE ---
        // Ya no dice "17K" siempre. Detecta qué tan grande es la locura.
        let msg = "";
        const isExtreme = logicW > 12000; // Si el ancho es mayor a 12K, es "Extremo"

        if (hasPhoto) {
            if (isExtreme) {
                msg = "⛔ <strong>Mobile Safety:</strong> Extreme Res (12K/17K) with image capped at 8K.";
            } else {
                msg = "⛔ <strong>Mobile Safety:</strong> Resolution >8K DCI capped for stability.";
            }
        } else {
            msg = "⛔ <strong>Mobile Safety:</strong> Canvas exceeds device limit. Capped.";
        }

        if (warningEl) {
            warningEl.innerHTML = msg;
            warningEl.classList.remove('hidden');
            warningEl.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
            warningEl.style.borderColor = "#ff4444";
            warningEl.style.color = "#ff8888";
        }

        const safetyScale = Math.sqrt(PIXEL_LIMIT / currentPixels);
        finalW = Math.round(logicW * safetyScale);
        finalH = Math.round(logicH * safetyScale);

    } else {
        // Limpiamos warning SOLO si era el de seguridad móvil
        if (warningEl && warningEl.innerText.includes("Mobile Safety")) {
            warningEl.classList.add('hidden');
        }
    }

    // 4. CONFIGURAR CANVAS
    if (canvas.width !== finalW) canvas.width = finalW;
    if (canvas.height !== finalH) canvas.height = finalH;
    
    ctx.clearRect(0, 0, finalW, finalH);
    const screenAspect = finalW / finalH;

    // 5. DIBUJAR IMAGEN
    if (hasPhoto) {
        try {
            const isFill = inputs.scaleFill && inputs.scaleFill.checked;
            const shouldUseFillLogic = isFill || isCropMode;
            
            const ratioW = finalW / userImage.width;
            const ratioH = finalH / userImage.height;
            
            let renderRatio;
            if (shouldUseFillLogic) renderRatio = Math.max(ratioW, ratioH);
            else renderRatio = Math.min(ratioW, ratioH);

            const newImgW = userImage.width * renderRatio;
            const newImgH = userImage.height * renderRatio;
            
            const posX = (finalW - newImgW) / 2;
            const posY = (finalH - newImgH) / 2;
            
            ctx.drawImage(userImage, posX, posY, newImgW, newImgH);
            
        } catch (e) { console.error("Draw image error:", e); }
    }

 // 6. CÁLCULO ZONA VISIBLE (Frameline + Posición)
    let visibleW, visibleH, baseX, baseY;
    // ... (código de escala existente) ...
    const scaleFactor = scaleVal / 100;
    if (textoEscala) textoEscala.innerText = scaleVal + "%";

    // --- LÓGICA DE POSICIÓN TIPO DAVINCI ---
    // Leemos los valores numéricos directamente (default 0)
    // Usamos parseFloat para aceptar decimales
    const moveXPercent = inputs.posXInput ? parseFloat(inputs.posXInput.value) || 0 : 0;
    const moveYPercent = inputs.posYInput ? parseFloat(inputs.posYInput.value) || 0 : 0;

    // Convertimos el porcentaje ingresado a píxeles reales
    // NOTA: Puedes ajustar si este valor es % del canvas total o % del frame visible.
    // Por ahora, lo mantengo como % del canvas total para movimientos amplios.
    const shiftX = Math.round((finalW * moveXPercent) / 100);
    const shiftY = Math.round((finalH * moveYPercent) / 100);

    if (isCropMode) {
        // ... (igual que antes) ...
        visibleW = finalW; visibleH = finalH; baseX = 0; baseY = 0;
    } else {
        // ... (cálculo de visibleW/H igual que antes) ...
        if (targetAspect > screenAspect) { 
            visibleW = finalW; visibleH = finalW / targetAspect; 
        } else { 
            visibleH = finalH; visibleW = finalH * targetAspect; 
        }
        visibleW = Math.round(visibleW * scaleFactor);
        visibleH = Math.round(visibleH * scaleFactor);
        
        // Calculamos el centro y SUMAMOS el SHIFT
        baseX = Math.floor((finalW - visibleW) / 2) + shiftX; 
        baseY = Math.floor((finalH - visibleH) / 2) + shiftY;
    }

    // Coordenadas finales de dibujo
    const drawX = baseX;
    const drawY = baseY;

// 7. MATTE (CORREGIDO PARA SOPORTAR POSICIÓN X/Y)
    if (!isCropMode) {
        // Obtenemos la opacidad del input
        const opacityVal = inputs.opacity ? inputs.opacity.value : 0; 
        // Convertimos 0-100 a 0.0-1.0 para el rgba
        const alpha = opacityVal / 100;
        
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

        // Dibujamos 4 rectángulos alrededor del cuadro (usando drawX y drawY)
        
        // A. Barra Superior
        if (drawY > 0) ctx.fillRect(0, 0, finalW, drawY);
        
        // B. Barra Inferior
        const bottomY = drawY + visibleH;
        if (bottomY < finalH) ctx.fillRect(0, bottomY, finalW, finalH - bottomY);

        // C. Barra Izquierda
        if (drawX > 0) ctx.fillRect(0, drawY, drawX, visibleH);
        
        // D. Barra Derecha
        const rightX = drawX + visibleW;
        if (rightX < finalW) ctx.fillRect(rightX, drawY, finalW - rightX, visibleH);
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
        // 🔥 USAMOS LAS NUEVAS COORDENADAS
        ctx.rect(drawX - mainOffset, drawY - mainOffset, visibleW + (mainOffset * 2), visibleH + (mainOffset * 2));
        ctx.stroke();
    }

    // 9. LÍNEA SECUNDARIA
    let secX = 0, secY = 0, secW = 0, secH = 0;
    let drawSec = false;

    if (inputs.secOn && inputs.secOn.checked && mainThickness > 0) {
        drawSec = true;
        const secAspect = getAspectRatio(inputs.secAspect ? inputs.secAspect.value : 1.77);
        const fitInside = inputs.secFit && inputs.secFit.checked;

        if (fitInside) {
            const mainFrameAspect = visibleW / visibleH;
            if (secAspect > mainFrameAspect) { secW = visibleW; secH = visibleW / secAspect; } 
            else { secH = visibleH; secW = visibleH * secAspect; }
        } else {
            if (secAspect > screenAspect) { secW = finalW; secH = finalW / secAspect; } 
            else { secH = finalH; secW = finalH * secAspect; }
            if (!isCropMode) {
                secW = secW * scaleFactor;
                secH = secW / secAspect;
            }
        }
        secW = Math.round(secW); secH = Math.round(secH);
        // Sumamos shiftX y shiftY para que siga al cuadro principal
        secX = Math.floor((finalW - secW) / 2) + shiftX; 
        secY = Math.floor((finalH - secH) / 2) + shiftY;

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
            const sX = (finalW - sW) / 2; const sY = (finalH - sH) / 2;
            ctx.lineWidth = safeThickness;
            if(inputs.color) ctx.strokeStyle = inputs.color.value;
            ctx.setLineDash(dashed ? [5, 5] : []); ctx.beginPath();
            ctx.rect(sX, sY, sW, sH); ctx.stroke();
        };
        if (inputs.safeActionOn && inputs.safeActionOn.checked) drawSafe(parseFloat(inputs.safeActionVal.value)||93, false);
        if (inputs.safeTitleOn && inputs.safeTitleOn.checked) drawSafe(parseFloat(inputs.safeTitleVal.value)||90, true);
    }

// 11. ETIQUETAS (Actualizado para seguir la Posición X/Y)
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
            const txtRes = `${Math.round(visibleW)} x ${Math.round(visibleH)}`;
            
            // 🔥 CAMBIO CLAVE: Usamos drawX y drawY en lugar de offsetX/offsetY
            
            if (showAspect) { 
                ctx.textAlign = "left"; 
                // Antes: offsetX + padding
                // Ahora: drawX + padding
                ctx.fillText(txtAsp, drawX + padding, drawY + padding); 
            }
            
            if (showRes) {
                ctx.textAlign = showAspect ? "right" : "left"; 
                
                // Calculamos la X
                const posX = showAspect ? (drawX + visibleW - padding) : (drawX + padding);
                
                // Calculamos la Y (si hay aspecto, misma línea; si no, abajo)
                const posY = showAspect ? (drawY + padding) : (drawY + padding + lineHeight); 
                
                ctx.fillText(txtRes, posX, posY);
            }
       }

       // Etiquetas del cuadro secundario (este usa secX/secY, que se calculan aparte)
       if (drawSec && inputs.secAspect) {
            ctx.fillStyle = inputs.secColor.value;
            const txtSecAsp = obtenerRatioTexto(Math.round(secW), Math.round(secH));
            ctx.textAlign = "left";
            if (showAspect) ctx.fillText(txtSecAsp, secX + padding, secY + padding);
       }
    }

    // 12. CANVAS LABEL
    if (inputs.showCanvasRes && inputs.showCanvasRes.checked) {
        const fontSize = Math.max(12, Math.round(finalW / 80)); 
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = inputs.color ? inputs.color.value : '#00FF00';
        ctx.textAlign = "left"; ctx.textBaseline = "bottom";

        let finalText = "";
        const isCustom = !menuResoluciones || menuResoluciones.value === 'custom';
        if (!isCustom && menuResoluciones.selectedIndex >= 0) {
            const rawText = menuResoluciones.options[menuResoluciones.selectedIndex].text;
            finalText = rawText.replace(/\s*\(.*?\)\s*$/, '').trim();
            if (!finalText) finalText = `${finalW} x ${finalH}`;
        } else {
            finalText = `Custom: ${logicW} x ${logicH}`; 
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

// --- Eventos de Posición ---
if(inputs.posXInput) {
    // Usamos 'input' para que se actualice mientras escriben o arrastran
    inputs.posXInput.addEventListener('input', requestDraw);
}
if(inputs.posYInput) {
    inputs.posYInput.addEventListener('input', requestDraw);
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
// DESCARGAR PNG (CORREGIDO Y ROBUSTO)
// ==========================================
btnDownload.addEventListener('click', async () => {
    // 1. Obtener valores actuales
    const w = parseInt(inputs.w.value) || 1920;
    const h = parseInt(inputs.h.value) || 1080;
    
    let asp = "ratio";
    if (inputs.aspect) {
        // Reemplazar caracteres no permitidos en nombres de archivo
        asp = inputs.aspect.value.replace(':', '-').replace('.', '_'); 
    }

    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    // Verifica si hay una imagen cargada Y si el toggle de "Mostrar Imagen" está activo
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);

    // 2. Generar el DataURL (La imagen en código)
    let fileName, dataUrl, mimeType;

    if (isCropMode) {
        // --- MODO CROP ---
        // Si hay foto usamos JPG (menos peso), si no, PNG (transparencia)
        mimeType = hasPhoto ? 'image/jpeg' : 'image/png';
        const quality = hasPhoto ? 0.9 : undefined; // Calidad 90% si es JPG
        
        // 🔥 AQUÍ ESTABA EL ERROR ANTES: No guardábamos dataUrl
        dataUrl = canvas.toDataURL(mimeType, quality);
        
        const ext = hasPhoto ? 'jpg' : 'png';
        fileName = `Frameline_${w}x${h}_${asp}_cropped.${ext}`;
        
    } else if (hasPhoto) {
        // --- MODO PREVIEW (Foto pero sin recortar canvas) ---
        // Dibujamos marca de agua temporal solo para la descarga
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

        // Redibujamos rápido para quitar la marca de agua de la pantalla del usuario
        setTimeout(() => { if(typeof requestDraw === 'function') requestDraw(); else draw(); }, 0); 

    } else {
        // --- MODO SOLO LÍNEAS (TEMPLATE) ---
        mimeType = 'image/png';
        dataUrl = canvas.toDataURL(mimeType);
        fileName = `Frameline_${w}x${h}_${asp}.png`;
    }

    // Analytics (Opcional)
    if (typeof gtag === 'function') { 
        gtag('event', 'download_file', { 
            'event_category': 'Engagement', 
            'event_label': isCropMode ? 'Crop' : (hasPhoto ? 'Preview' : 'Template') 
        }); 
    }

    // ===============================================
    // 3. INTENTAR COMPARTIR (MÓVIL) O DESCARGAR (PC)
    // ===============================================
    
    // Detectamos si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let shareSuccess = false;

    // Solo intentamos compartir si es móvil y el navegador lo permite
    if (isMobile && navigator.canShare && navigator.share) {
        try {
            const blob = dataURItoBlob(dataUrl);
            const file = new File([blob], fileName, { type: mimeType });
            
            // Verificamos si el archivo es compartible (algunos navegadores rechazan archivos muy grandes)
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Frameline Generator',
                    text: 'Created with frameline-generator.com'
                });
                shareSuccess = true; // ¡Éxito!
            }
        } catch (error) {
            console.log('Share skipped or canceled:', error);
            // Si falla compartir (ej. usuario cancela), no hacemos nada más, 
            // porque el menú ya se abrió.
            // PERO si el error es técnico, el fallback de abajo asegura la descarga.
            if (error.name !== 'AbortError') {
                 shareSuccess = false; 
            } else {
                return; // Si el usuario canceló voluntariamente, no forzamos descarga.
            }
        }
    }

    // 4. FALLBACK: DESCARGA CLÁSICA
    // Se ejecuta si estamos en PC, O si falló el compartir en Móvil
    if (!shareSuccess) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a); 
        a.click();
        document.body.removeChild(a);
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
        // NUEVO: Resetear inputs numéricos a 0.0
        if(inputs.posXInput) inputs.posXInput.value = "0.0";
        if(inputs.posYInput) inputs.posYInput.value = "0.0";
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

// ==========================================
// 🔥 DAVINCI STYLE SCRUBBING LOGIC
// ==========================================

function makeScrubbable(input) {
    if (!input) return;

    let isDragging = false;
    let startX = 0;
    let startValue = 0;
    
    // Sensibilidad: Cuánto cambia el número por cada píxel movido.
    // 0.1 es preciso, 0.5 es rápido. DaVinci usa algo intermedio.
    const sensitivity = 0.2; 

    input.addEventListener('mousedown', function(e) {
        // Solo activamos con clic izquierdo
        if (e.button !== 0) return;

        isDragging = true;
        startX = e.clientX;
        startValue = parseFloat(input.value) || 0;

        // Añadimos clase al body para mantener el cursor <-> en toda la pantalla
        document.body.classList.add('is-scrubbing');
        
        // Evitamos que el navegador intente seleccionar texto
        // e.preventDefault(); // OJO: Si activas esto, a veces cuesta hacer clic para escribir. 
        // Mejor dejamos que el foco ocurra si no hay movimiento.
    });

    // Escuchamos el movimiento en TODO el documento (por si te sales del input)
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        e.preventDefault(); // Aquí sí prevenimos selecciones raras

        const currentX = e.clientX;
        const deltaX = currentX - startX;
        
        // Si el movimiento es muy pequeño, no hacemos nada (para permitir clic simple y escribir)
        if (Math.abs(deltaX) < 2) return;

        // Calculamos nuevo valor
        let newValue = startValue + (deltaX * sensitivity);

        // Respetamos Min/Max si existen en el HTML
        if (input.min) newValue = Math.max(parseFloat(input.min), newValue);
        if (input.max) newValue = Math.min(parseFloat(input.max), newValue);

        // Redondeamos a 1 decimal (puedes cambiar a 0 o 2 según gusto)
        input.value = newValue.toFixed(1);

        // Disparamos el evento para que tu draw() se entere
        // Usamos 'input' en lugar de 'change' para tiempo real
        input.dispatchEvent(new Event('input'));
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            document.body.classList.remove('is-scrubbing');
        }
    });
}

// --- ACTIVAR SCRUBBING EN TUS INPUTS ---
// Llama a la función para tus inputs de posición
if (inputs.posXInput) makeScrubbable(inputs.posXInput);
if (inputs.posYInput) makeScrubbable(inputs.posYInput);

// Opcional: También podrías aplicarlo al grosor o escala si quisieras
// if (inputs.scale) makeScrubbable(inputs.scale);
