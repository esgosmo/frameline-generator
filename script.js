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
    scaleCrop: getEl('scaleCrop'),
    scaleCrop: getEl('scaleCrop')
};

// ==========================================
// CARGADOR DE DATOS EXTERNOS (JSON)
// ==========================================
// Variable global para guardar los datos crudos y no volver a pedir el JSON
let resolucionesData = [];

async function cargarDatosExternos() {
    try {
        // 1. Cargar JSON
        const resResponse = await fetch('resolutions.json');
        resolucionesData = await resResponse.json(); // Guardamos en global

        // 2. Inicializar Filtro de Marcas
        initBrandFilter();

        // 3. Inicializar Menú de Resoluciones (Carga inicial: Todo o Default)
        renderResolutionMenu('all');

        // 4. Cargar Aspectos (Esto sigue igual)
        const aspResponse = await fetch('aspects.json');
        const aspData = await aspResponse.json();
        llenarSelectSimple('aspectSelect', aspData);
        llenarSelectSimple('secAspectSelect', aspData);

    } catch (error) {
        console.error("Error loading JSONs:", error);
    }
}

// A. Llenar el Filtro de Marcas
function initBrandFilter() {
    const brandSelect = document.getElementById('brandFilter');
    if (!brandSelect) return;

    // Limpiar (dejar solo 'Show All')
    brandSelect.innerHTML = '<option value="all">All</option>';

    resolucionesData.forEach((grupo, index) => {
        const opt = document.createElement('option');
        opt.value = index; // Usamos el índice del array como ID
        opt.innerText = grupo.category;
        brandSelect.appendChild(opt);
    });

    // Evento: Cuando cambias la marca...
    brandSelect.addEventListener('change', (e) => {
        renderResolutionMenu(e.target.value);
    });
}

// B. Renderizar el Menú de Resoluciones según el Filtro
function renderResolutionMenu(filterValue) {
    const resSelect = document.getElementById('resolutionSelect');
    if (!resSelect) return;

    // Guardar valor actual por si queremos mantenerlo (opcional)
    // const oldValue = resSelect.value;

    resSelect.innerHTML = '<option value="custom">Custom / Manual</option>';

    // Lógica de filtrado
    let gruposAMostrar = [];

    if (filterValue === 'all') {
        // Mostrar TODOS los grupos
        gruposAMostrar = resolucionesData;
    } else {
        // Mostrar SOLO el grupo seleccionado (ej. ARRI)
        // filterValue es el índice que pusimos en el option
        gruposAMostrar = [resolucionesData[filterValue]];
    }

    // Construir el HTML
    gruposAMostrar.forEach(grupo => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = grupo.category;

        grupo.items.forEach(item => {
            const opt = document.createElement('option');
            opt.innerText = item.name;
            opt.value = item.value;
            optgroup.appendChild(opt);
        });

        resSelect.appendChild(optgroup);
    });

if (resSelect.querySelector('option[value="1920,1080"]')) {
        resSelect.value = "1920,1080";
    }

}



// Función auxiliar para los Aspectos (que no tienen filtro)
function llenarSelectSimple(id, datos) {
    const select = document.getElementById(id);
    if (!select) return;
    const custom = select.querySelector('option[value="custom"]');
    select.innerHTML = '';
    if(custom) select.appendChild(custom);

    datos.forEach(grupo => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = grupo.group; // Nota: en aspects.json usaste "group", en res usé "category". Ajusta según tu JSON.
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
    
    // ... aquí va tu llamada a aplicarModoMobile() y draw() ...
});



// ==========================================
// CARGADOR DE DATOS EXTERNOS (JSON)
// ==========================================
const dropZone = document.querySelector('.upload-zone');
const fileInput = document.getElementById('imageLoader');

if (dropZone && fileInput) {

    // 1. Cuando entras o mueves el archivo sobre la zona
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // OBLIGATORIO: Evita que el navegador abra la foto
        dropZone.classList.add('drag-over'); // Activa el estilo visual
    });

    // 2. Cuando te sales de la zona sin soltar
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over'); // Quita el estilo
    });

    // 3. Cuando SUELTAS el archivo
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); // OBLIGATORIO
        dropZone.classList.remove('drag-over'); // Quita el estilo
        
        // A. Obtener los archivos soltados
        const files = e.dataTransfer.files;

        if (files.length > 0) {
            // B. EL TRUCO MAESTRO:
            // Asignamos los archivos soltados al input invisible
            fileInput.files = files; 

            // C. Disparamos manualmente el evento "change"
            // Esto hace que tu código anterior crea que el usuario hizo clic y seleccionó
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    });
}


// ==========================================
// LÓGICA DE CARGA DE IMAGEN 
// ==========================================

// 1. Variable Global (Tiene que estar afuera de las funciones)
let userImage = null;
let lastThickness = 2;
const imageLoader = document.getElementById('imageLoader');
const imageOptionsPanel = document.getElementById('imageOptionsPanel');
const showImageToggle = document.getElementById('showImageToggle');

// ==========================================
// 3. LÓGICA DE CARGA BLINDADA (PERFORMANCE 6K+ & TIFF)
// ==========================================
const sizeWarning = document.getElementById('sizeWarning'); 

if (imageLoader) {
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limpiar memoria anterior si existía
        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);

        // ------------------------------------------------
        // 1. VALIDACIÓN Y NOMBRE
        // ------------------------------------------------
        let fileName = file.name;
        const fileType = file.type.toLowerCase();
        
        // Corrección de nombre "temp"
        // Si el nombre parece basura temporal, intentamos limpiarlo o dejarlo genérico
        if (fileName.toLowerCase().includes('temp') || fileName.length > 50) {
             // Intentar sacar extensión
             const ext = fileName.split('.').pop();
             if(ext) fileName = `Image_Loaded.${ext}`;
             else fileName = "Image_Loaded";
        }

        const isValid = fileType.startsWith('image/') || 
                        fileName.toLowerCase().endsWith('.tiff') || 
                        fileName.toLowerCase().endsWith('.tif');

        if (!isValid) {
            alert("⚠️ Format not supported.\nPlease use JPG, PNG or TIFF.");
            imageLoader.value = ""; 
            return; 
        }

        // ------------------------------------------------
        // 2. ACTUALIZAR UI (Inmediato)
        // ------------------------------------------------
        const zone = document.querySelector('.upload-zone');
        const textSpan = zone ? zone.querySelector('.upload-text') : null;

      if (zone && textSpan) {
            // ❌ ANTES (Borradas las líneas que calculaban el nombre):
            // let displayName = fileName;
            // if (displayName.length > 25) displayName = ...
            // textSpan.innerText = displayName;

            // ✅ AHORA (Mensaje fijo):
            textSpan.innerText = "Image Loaded"; 
            
            // Mantenemos el estilo visual de "activo"
            zone.classList.add('has-file'); 
            zone.style.borderColor = "#007bff"; 
        }

        // ------------------------------------------------
        // 3. AVISOS DE PESO / RESOLUCIÓN
        // ------------------------------------------------
        const limitBytes = 20 * 1024 * 1024; // 20MB
        let isHeavyFile = (file.size > limitBytes);
        
        // Reset warning state
        if(sizeWarning) {
            sizeWarning.classList.add('hidden');
            if (isHeavyFile) {
                sizeWarning.innerText = "⚠️ Large file size (>20MB)";
                sizeWarning.classList.remove('hidden');
            }
        }

        // ------------------------------------------------
        // 4. FUNCIÓN MAESTRA DE PROCESAMIENTO
        // ------------------------------------------------
        const finalizarCarga = (blobUrl) => {
            currentObjectUrl = blobUrl; // Guardar referencia
            const img = new Image();
            
            img.onload = () => {
                userImage = img;
                
                // Reset Pan
                if (typeof imgPanX !== 'undefined') { imgPanX = 0; imgPanY = 0; }

                // Detectar Resolución Extrema (> 6K)
                const limitRes = 6000; 
                if (img.width > limitRes || img.height > limitRes) {
                    if (sizeWarning) {
                        const msg = isHeavyFile 
                            ? "⚠️ Large file & large resolution (>6K) Performance may lag."
                            : "⚠️ Large resolution (>6K). Performance may lag.";
                        sizeWarning.innerText = msg;
                        sizeWarning.classList.remove('hidden');
                    }
                }

                // Activar Interfaz
                if (imageOptionsPanel) imageOptionsPanel.classList.remove('hidden');
                if(inputs.w) inputs.w.value = img.width;
                if(inputs.h) inputs.h.value = img.height;
                
                if (typeof autoAdjustThickness === "function") autoAdjustThickness(img.width);
                if(menuResoluciones) menuResoluciones.value = 'custom';
                
                // Limpiar botones azules
                const clearContainer = (id) => {
                    const cont = document.getElementById(id);
                    if(cont) cont.querySelectorAll('button.active').forEach(b => b.classList.remove('active'));
                };
                clearContainer('resBtnContainer');
                
                flashInput(inputs.w);
                flashInput(inputs.h);
                
                // Forzar Fit en móviles
                if (typeof aplicarModoMobile === 'function') aplicarModoMobile();

                // Dibujar
                if(typeof requestDraw === 'function') requestDraw(); else draw();
            };

            img.onerror = () => {
                alert("Error loading image data. The file might be corrupted.");
                if(window.removeImage) window.removeImage();
            };

            img.src = blobUrl;
        };

        // ------------------------------------------------
        // 5. RUTAS DE CARGA (Aquí está la optimización)
        // ------------------------------------------------
        const isTiff = fileName.toLowerCase().endsWith('.tiff') || fileName.toLowerCase().endsWith('.tif');

        if (isTiff) {
            // --- RUTA TIFF (Lenta pero necesaria) ---
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    if (typeof UTIF === 'undefined') throw new Error("UTIF library missing");
                    
                    const buffer = event.target.result;
                    const ifds = UTIF.decode(buffer);
                    UTIF.decodeImage(buffer, ifds[0]);
                    const rgba = UTIF.toRGBA8(ifds[0]); 
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = ifds[0].width;
                    tempCanvas.height = ifds[0].height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    const imageData = tempCtx.createImageData(ifds[0].width, ifds[0].height);
                    imageData.data.set(rgba);
                    tempCtx.putImageData(imageData, 0, 0);
                    
                    // OPTIMIZACIÓN: Usar toBlob en lugar de toDataURL para ahorrar RAM
                    tempCanvas.toBlob((blob) => {
                        const tiffUrl = URL.createObjectURL(blob);
                        finalizarCarga(tiffUrl);
                    }, 'image/png');

                } catch (err) {
                    console.error(err);
                    alert("Error processing TIFF file.");
                    if(window.removeImage) window.removeImage();
                }
            };
            reader.readAsArrayBuffer(file);

        } else {
            // --- RUTA JPG/PNG (TURBO MODE) ---
            // 🔥 No usamos FileReader. Usamos ObjectURL directo.
            // Esto carga 8K instantáneo sin leer bytes.
            const objectUrl = URL.createObjectURL(file);
            finalizarCarga(objectUrl);
        }
    });
}

// Clear Function
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

// Listeners
if (showImageToggle) showImageToggle.addEventListener('change', draw);
if (inputs.scaleFit) inputs.scaleFit.addEventListener('change', draw);
if (inputs.scaleFill) inputs.scaleFill.addEventListener('change', draw);
// 5. Lógica para el ojito (Show/Hide)
if (showImageToggle) {
    showImageToggle.addEventListener('change', draw);
}

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

    // A. LEER VALORES
    const width = Math.max(1, Math.abs(parseInt(inputs.w.value) || 1920));
    const height = Math.max(1, Math.abs(parseInt(inputs.h.value) || 1080));
    const targetAspect = getAspectRatio(inputs.aspect ? inputs.aspect.value : 2.39);

    // --- ESCALA ---
    let scaleVal = inputs.scale ? parseInt(inputs.scale.value) : 100;
    if (isNaN(scaleVal)) scaleVal = 100;
    const scaleFactor = scaleVal / 100;
    if (textoEscala) textoEscala.innerText = scaleVal + "%";

    // --- OPACIDAD ---
    let opacityVal = inputs.opacity ? parseInt(inputs.opacity.value) : 100;
    if (isNaN(opacityVal)) opacityVal = 100;
    const opacity = opacityVal / 100;
    if (textoOpacidad) textoOpacidad.innerText = opacityVal + "%";

    // --- GROSOR ---
    let rawThick = parseInt(inputs.thickness ? inputs.thickness.value : 2);
    if (isNaN(rawThick)) rawThick = 2;
    if (rawThick > 10) { rawThick = 10; if(inputs.thickness) inputs.thickness.value = 10; }
    const mainThickness = Math.max(0, rawThick);
    const mainOffset = mainThickness / 2;
    const secThickness = mainThickness; 
    let safeThickness = 0;
     if (mainThickness > 0) safeThickness = Math.max(1, Math.round(mainThickness / 2));

    
// =====================================================
    // 🔥 LÓGICA DE CROP (Aquí definimos width/height finales)
    // =====================================================
    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;

     // Definimos las dimensiones finales (width y height que usará el canvas)
    let width = rawW;
    let height = rawH;

    if (isCropMode) {
        // ...pero si es CROP, calculamos la altura exacta matemática
        height = Math.round(width / targetAspect);
        
        // Regla de Video: Siempre números pares para evitar problemas de códec
        if (height % 2 !== 0) height--;
    }

    // B. CANVAS
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const screenAspect = width / height;

    const mostrarImagen = !showImageToggle || showImageToggle.checked;
    
    if (userImage && mostrarImagen) {
        try {
            const isFill = inputs.scaleFill && inputs.scaleFill.checked;
            
            // 2. Calcular la proporción de escalado (Scale Ratio)
            // Calculamos cuánto hay que estirar el ancho y el alto
            const ratioW = width / userImage.width;
            const ratioH = height / userImage.height;
            let renderRatio;

            if (isFill) {
                // FILL: Usamos el ratio MAYOR (Math.max)
                // Esto hace que la imagen crezca hasta cubrir todo el hueco (recortando lo que sobre)
                renderRatio = Math.max(ratioW, ratioH);
            } else {
                // FIT: Usamos el ratio MENOR (Math.min)
                // Esto hace que la imagen se detenga en cuanto toque un borde (dejando negro lo demás)
                renderRatio = Math.min(ratioW, ratioH);
            }

           // 3. Calcular nuevas dimensiones finales
            // 🔥 CORRECCIÓN 1: Usamos Math.ceil (Redondear arriba) para evitar huecos de sub-pixel
            let newW = Math.ceil(userImage.width * renderRatio);
            let newH = Math.ceil(userImage.height * renderRatio);

            // =========================================================
            // 🔥 SOLUCIÓN DEFINITIVA: SANGRADO (BLEED)
            // =========================================================
            if (shouldUseFillLogic) {
               // Si la imagen es casi del mismo tamaño que el canvas (diferencia menor a 2px),
                // la estiramos forzosamente +2px para "matar" cualquier línea verde o blanca en los bordes.
                if (Math.abs(newW - width) < 2) newW = width + 2;
                if (Math.abs(newH - height) < 2) newH = height + 2;
                
                // Seguridad adicional: NUNCA permitir que sea menor al canvas
                if (newW < width) newW = width + 1;
                if (newH < height) newH = height + 1;
            }
             

            // 4. Centrar la imagen matemáticamente
            const posX = (width - newW) / 2;
            const posY = (height - newH) / 2;
            ctx.drawImage(userImage, posX, posY, newW, newH);
        } catch (e) { console.error(e); }
    }

    let visibleW, visibleH;

    // 1. Calcular tamaño base
    if (targetAspect > screenAspect) {
        visibleW = width;
        visibleH = width / targetAspect;
    } else {
        visibleH = height;
        visibleW = height * targetAspect;
    }

    // 2. Aplicar Escala y REDONDEAR (Vital para evitar bordes borrosos)
    // Math.round fuerza al pixel entero más cercano
    visibleW = Math.round(visibleW * scaleFactor);
    visibleH = Math.round(visibleH * scaleFactor);

    // 3. Asegurar que sean números pares (Opcional, ayuda al centrado perfecto)
    if (visibleW % 2 !== 0) visibleW--;
    if (visibleH % 2 !== 0) visibleH--;

    // 4. Calcular Matte (Barras) con enteros
    // Math.floor asegura que no queden medios píxeles sueltos
    const barHeight = Math.floor((height - visibleH) / 2);
    const barWidth = Math.floor((width - visibleW) / 2);
    offsetX = barWidth;
    offsetY = barHeight;
     }

    // E. MATTE
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(0, 0, width, offsetY); 
    ctx.fillRect(0, height - offsetY, width, offsetY); 
    ctx.fillRect(0, offsetY, offsetX, visibleH); 
    ctx.fillRect(width - offsetX, offsetY, offsetX, visibleH); 

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

       // 2. 🔥 CORRECCIÓN: REDONDEAR Y FORZAR PARES (Igual que Main Frame)
        secW = Math.round(secW);
        secH = Math.round(secH);

        if (secW % 2 !== 0) secW--; // Si es 1215 -> 1214
        if (secH % 2 !== 0) secH--; // Si es impar -> par

        // 3. CALCULAR POSICIÓN
        secX = (width - secW) / 2;
        secY = (height - secH) / 2;

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

        // --- A. DIBUJAR MAIN FRAMELINE TEXT ---
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
       //}

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

// ==========================================
// 8. DESCARGA INTELIGENTE (MARCA DE AGUA ABAJO A LA DERECHA)
// ==========================================
btnDownload.addEventListener('click', () => {
    const w = parseInt(inputs.w.value) || 1920;
    const h = parseInt(inputs.h.value) || 1080;
    const asp = inputs.aspect ? inputs.aspect.value.replace(':','-') : 'ratio';

    // Nuevo - Detectar si es Crop
    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    
    // 2. Detectar si estamos en "Modo Foto" (JPG)
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);

    // Creamos el elemento de descarga
    const a = document.createElement('a');

    if (hasPhoto) {
        // --- CASO A: CON FOTO (JPG) -> LLEVA MARCA DE AGUA ---
        
        // 1. DIBUJAR LA MARCA DE AGUA (Temporalmente)
        ctx.save(); // Guardar estado actual del canvas
        
        // Configuración Sutil (Dinámica según el tamaño de la imagen)
        const fontSize = Math.max(10, Math.round(w * 0.012)); // 1.5% del ancho
        const margin = fontSize; // Margen proporcional al tamaño de letra

        ctx.font = `500 ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // Blanco al 50%
        
        // 🔥 CAMBIO CLAVE 1: Alineación a la derecha
        ctx.textAlign = "right";
        // 🔥 CAMBIO CLAVE 2: Línea base abajo
        ctx.textBaseline = "bottom";
        
        // Sombra suave para legibilidad
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 4;
        
        // 🔥 CAMBIO CLAVE 3: Coordenadas (Ancho total menos margen, Alto total menos margen)
        ctx.fillText("frameline-generator.com", w - margin, h - margin);
        ctx.restore(); 
        a.href = canvas.toDataURL('image/jpeg', 0.9);
        a.download = `Frameline_${w}x${h}_${asp}_preview.jpg`;

        // 3. LIMPIEZA INMEDIATA
        // Volvemos a llamar a draw() (o requestDraw si usaste la optimización)
        // para borrar la marca de la pantalla del usuario.
        setTimeout(() => {
             if(typeof requestDraw === 'function') requestDraw(); else draw();
        }, 0); 

    } else {
        // ... (CASO B: PNG o CROP MODE) -> SIN MARCA ...
        // Al ser Crop Mode, el canvas YA tiene el tamaño recortado gracias al draw()
        // así que solo lo descargamos tal cual.
        
        const ext = hasPhoto ? 'jpg' : 'png'; // Si es crop con foto, mejor jpg
        const type = hasPhoto ? 'image/jpeg' : 'image/png';
        const quality = hasPhoto ? 0.9 : undefined;

        a.href = canvas.toDataURL(type, quality);
        a.download = `Frameline_${w}x${h}_${asp}_cropped.${ext}`;
    }

    // --- TRACKING ---
    if (typeof gtag === 'function') {
        gtag('event', 'download_png', {
            'event_category': 'Engagement',
            'event_label': `Resolution: ${w}x${h}`
        });
    }

    // 4. Descargar
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
        
        // 2. Ocultar Paneles y Checkboxes
        const hideById = (id) => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        };
        const uncheckById = (id) => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        };

        

        // --- AQUÍ ESTÁ EL CAMBIO QUE PEDISTE ---
        hideById('aspectGroup'); // Oculta Manual Ratio y Frameline Scale
        hideById('secFrameControls'); // Oculta opciones secundarias
        hideById('advancedGroup'); // Oculta Advanced
        hideById('infoPanel'); // Oculta Info
        // ---------------------------------------

        uncheckById('secFrameOn');
        uncheckById('safeActionToggle');
        uncheckById('safeTitleToggle');
        if(inputs.safeActionVal) inputs.safeActionVal.value = 93; // Volver a 93%
        if(inputs.safeTitleVal) inputs.safeTitleVal.value = 90;   // Volver a 90%
        uncheckById('showLabelsToggle');
        uncheckById('showResLabelsToggle');
        uncheckById('secFrameFit');
        uncheckById('scaleFill');
        const fitRadio = document.getElementById('scaleFit');
        if(fitRadio) fitRadio.checked = true;

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