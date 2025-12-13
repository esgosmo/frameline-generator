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
    showLabels: getEl('showLabelsToggle'), // NUEVO: Referencia al checkbox de etiquetas
    showResLabels: getEl('showResLabelsToggle'),
    // NUEVO: Referencias a los radios
    scaleFit: getEl('scaleFit'),
    scaleFill: getEl('scaleFill'),
    scaleCrop: getEl('scaleCrop')
    scaleFill: getEl('scaleFill'),
    scaleCrop: getEl('scaleCrop')
};

// ==========================================
// CARGADOR DE DATOS EXTERNOS (JSON)
// ==========================================
// Variable global para guardar los datos crudos y no volver a pedir el JSON
let resolucionesData = [];
let currentViewMode = 'root';

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

        // 🔥 NUEVO: FORZAR 2.39 POR DEFECTO
        const aspectSelect = document.getElementById('aspectSelect');
        // Usamos el valor exacto que pusiste en tu JSON (probablemente "2.39" o "2.38695")
        if (aspectSelect && aspectSelect.querySelector('option[value="2.39"]')) {
            aspectSelect.value = "2.39";
        } else if (aspectSelect && aspectSelect.querySelector('option[value="2.38695"]')) {
             // Por si usaste la versión precisa en el JSON
            aspectSelect.value = "2.38695";
        }

        // 🔥 NUEVO: FORZAR 9:16 EN EL SECUNDARIO
        const secSelect = document.getElementById('secAspectSelect');
        if (secSelect && secSelect.querySelector('option[value="9:16"]')) {
            secSelect.value = "9:16";
        }

    } catch (error) {
        console.error("Error loading JSONs:", error);
    }
}

// B. Renderizar el Menú de Resoluciones (VISTA HÍBRIDA: TOP 3 + VER MÁS)
function renderResolutionMenu() {
    const resSelect = document.getElementById('resolutionSelect');
    if (!resSelect) return;

    // Guardar selección previa
    const valorPrevio = resSelect.value;
    resSelect.innerHTML = '';

    // ===============================================
    // VISTA PRINCIPAL (ROOT) - "TOP 3"
    // ===============================================
    if (currentViewMode === 'root') {
        
        // Opción base
        resSelect.add(new Option("Custom / Manual", "custom"));

        resolucionesData.forEach((grupo, index) => {
            const nombre = grupo.category;
            const items = grupo.items;
            
            // Crear grupo visual
            const optgroup = document.createElement('optgroup');
            optgroup.label = nombre;
            
            // --- REGLA: Broadcast/DCI siempre completos. El resto, Top 3. ---
            const mostrarTodo = nombre.includes("Broadcast") || nombre.includes("DCI");
            
            let itemsAMostrar = items;
            let hayBotonVerMas = false;

            // Si la lista es larga (>3) y NO es estándar, cortamos.
            if (!mostrarTodo && items.length > 3) {
                itemsAMostrar = items.slice(0, 3); 
                hayBotonVerMas = true;
            }

            // Pintar items
            itemsAMostrar.forEach(item => {
                if (item.type !== 'header' && item.type !== 'separator') {
                    const opt = document.createElement('option');
                    opt.text = item.name;
                    opt.value = item.value;
                    optgroup.appendChild(opt);
                }
            });

            // Botón "Ver todas..."
            if (hayBotonVerMas) {
                const optMore = document.createElement('option');
                optMore.text = `↳ Ver todas las de ${nombre} ...`;
                optMore.value = `NAV_FOLDER_${index}`;
                optMore.style.fontWeight = "bold";
                optMore.style.color = "#007bff"; 
                optgroup.appendChild(optMore);
            }

            resSelect.appendChild(optgroup);
        });
    } 

    // ===============================================
    // VISTA DE CARPETA (FULL)
    // ===============================================
    else {
        // Botón Volver
        const optBack = document.createElement('option');
        optBack.text = "⬅ \u00A0 VOLVER AL MENÚ PRINCIPAL";
        optBack.value = "NAV_BACK";
        optBack.style.fontWeight = "bold";
        optBack.style.backgroundColor = "#444";
        optBack.style.color = "#fff";
        resSelect.add(optBack);

        // Título
        const titulo = resolucionesData[currentViewMode].category;
        const optSep = new Option(`── ${titulo} (Lista Completa) ──`, "");
        optSep.disabled = true;
        resSelect.add(optSep);

        // Lista Completa
        const items = resolucionesData[currentViewMode].items;
        items.forEach(item => {
            const opt = document.createElement('option');
            if (item.type === 'header') {
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

    // Mantener selección visual si no es navegación
    if (!valorPrevio.startsWith('NAV_')) {
        if (Array.from(resSelect.options).some(o => o.value === valorPrevio)) {
            resSelect.value = valorPrevio;
        }
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
// LÓGICA DE DRAG & DROP 
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

// 2. Referencias al HTML
const imageLoader = document.getElementById('imageLoader');
const imageOptionsPanel = document.getElementById('imageOptionsPanel');
const showImageToggle = document.getElementById('showImageToggle');

// ==========================================
// 3. LÓGICA DE CARGA BLINDADA (PERFORMANCE 6K+ & TIFF)
// ==========================================
const sizeWarning = document.getElementById('sizeWarning'); 

if (imageLoader) {
    // Variable para limpiar memoria cuando cambiamos de foto
    let currentObjectUrl = null;

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
    
    // Hide panel and warning
    if (imageOptionsPanel) imageOptionsPanel.classList.add('hidden');
    if (sizeWarning) {
        sizeWarning.classList.add('hidden');
        sizeWarning.innerText = ""; // Reset text
    }

    // ======================================================
    // 🔥 NUEVO: RESETEAR LA UI DEL DROPZONE
    // ======================================================
    const zone = document.querySelector('.upload-zone');
    // Buscamos el span del texto dentro de la zona
    const textSpan = zone ? zone.querySelector('.upload-text') : null;

    if (zone && textSpan) {
        // A. Restaurar texto original
        textSpan.innerText = "Choose or drop image"; 
        
        // B. Quitar clases y estilos de "archivo cargado"
        zone.classList.remove('has-file'); 
        zone.style.borderColor = ""; // Quitar el borde azul forzado
    }
    // ======================================================
    
    draw();
}

// Listeners
if (showImageToggle) showImageToggle.addEventListener('change', requestDraw);
if (inputs.scaleFit) inputs.scaleFit.addEventListener('change', requestDraw);
if (inputs.scaleFill) inputs.scaleFill.addEventListener('change', requestDraw);
if (inputs.scaleCrop) inputs.scaleCrop.addEventListener('change', requestDraw);
// 5. Lógica para el ojito (Show/Hide)
if (showImageToggle) {
    showImageToggle.addEventListener('change', draw);
}

// ==========================================
// 3. HELPERS VISUALES
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

// ==========================================
// OPTIMIZACIÓN DE RENDIMIENTO (SEMÁFORO)
// ==========================================
let isTicking = false;

function requestDraw() {
    if (!isTicking) {
        window.requestAnimationFrame(() => {
            draw();
            isTicking = false;
        });
        isTicking = true;
    }
}

function obtenerRatioTexto(w, h) {
    // 1. Cálculo decimal básico
    const ratio = w / h;

    // ---------------------------------------------------------
    // A. EXCEPCIONES VIP (Cine & Redes Sociales)
    // ---------------------------------------------------------

    // --- Cine ---
    if (Math.abs(ratio - (5/3)) < 0.02) return "1.66";  // Europeo
    if (Math.abs(ratio - (9/16)) < 0.02) return "9:16"; 
    if (Math.abs(ratio - 2.40) < 0.01) return "2.40"; 
    if (Math.abs(ratio - 2.39) < 0.01) return "2.39";  // Scope Moderno
    if (Math.abs(ratio - 2.35) < 0.02) return "2.35";  // Scope Viejo
    if (Math.abs(ratio - 1.85) < 0.02) return "1.85";  // Flat / Americano
    if (Math.abs(ratio - 1.37) < 0.02) return "1.37";  // Academy
    if (Math.abs(ratio - 1.43) < 0.02) return "1.43";  // IMAX

    // --- Redes Sociales / Verticales (NUEVO) ---
    // 9:16 (Stories/TikTok) = 0.5625
    if (Math.abs(ratio - 0.5625) < 0.01) return "9:16"; 
    
    // 4:5 (Instagram Portrait) = 0.8
    if (Math.abs(ratio - 0.8) < 0.01) return "4:5"; 

    // --- Fotografía / Monitores ---
    if (Math.abs(ratio - 1.6) < 0.01) return "1.60"; // 16:10
    if (Math.abs(ratio - 1.5) < 0.01) return "1.50"; // 3:2

    // ---------------------------------------------------------
    // B. CÁLCULO DE FRACCIÓN (Para 16:9, 4:3, 1:1, etc.)
    // ---------------------------------------------------------
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(w, h);
    
    const num = w / divisor;
    const den = h / divisor;

    // ---------------------------------------------------------
    // C. LA REGLA DE LIMPIEZA (¡Aquí está el truco!)
    // ---------------------------------------------------------
    // Si los números de la fracción son pequeños (ej: 16 y 9), es un estándar bonito.
    // Si son gigantes (ej: 1577 y 1080), es "basura matemática", así que mejor mostramos decimales.
    
    if (num <= 20 && den <= 20) {
        return `${num}:${den}`; // Devuelve "16:9", "4:3", "1:1"
    } else {
        return ratio.toFixed(2); // Devuelve "1.46", "2.00", "0.85"
    }
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

// Función para apagar botones en un contenedor específico
function clearActiveButtons(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (container) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => btn.classList.remove('active'));
    }
}

// --- FUNCIÓN PARA LIMPIAR TEXTO DEL HUD ---
function getCleanLabel(val) {
    if (!val) return "";
    
    // 1. Si es formato "16:9", lo devolvemos tal cual
    if (val.toString().includes(':')) return val;

    // 2. Si es número, lo convertimos a Float
    const num = parseFloat(val);
    
    // 3. Detectar estándares conocidos (opcional, para forzar exactitud)
    // Si está muy cerca de 2.39, escribimos "2.39" a la fuerza
    if (Math.abs(num - 2.39) < 0.01) return "2.39";
    if (Math.abs(num - 1.85) < 0.01) return "1.85";
    if (Math.abs(num - 1.66) < 0.01) return "1.66";
    if (Math.abs(num - 2.0) < 0.01) return "2.0";
    if (Math.abs(num - 1.0) < 0.01) return "1.0";
    if (Math.abs(num - 1.33) < 0.02) return "1.33"; // Cubre 1.33333

    // 4. Para cualquier otro caso, cortar a 2 decimales
    // parseFloat elimina ceros innecesarios (ej: "2.50" -> 2.5)
    return parseFloat(num.toFixed(2)).toString();
}

// --- FUNCIÓN DE GROSOR ADAPTATIVO (INTELIGENTE) ---
function autoAdjustThickness(width) {
    if (!inputs.thickness) return;
    
    const w = parseInt(width);
    
    // 1. Calculamos cuál DEBERÍA ser el grosor ideal
    const idealThickness = (w > 3500) ? 6 : 2; // 6px para 4K+, 2px para HD
    
    // 2. Revisamos el estado actual
    const currentVal = parseInt(inputs.thickness.value) || 0;

    if (currentVal === 0) {
        // CASO A: ESTÁ APAGADO (OFF)
        // No tocamos el input (lo dejamos en 0 para que siga invisible).
        // Solo actualizamos la memoria, para que si le das "ON", aparezca con el grosor correcto.
        lastThickness = idealThickness;
    } else {
        // CASO B: ESTÁ PRENDIDO (ON)
        // Actualizamos el input directamente para que se vea el cambio.
        inputs.thickness.value = idealThickness;
        lastThickness = idealThickness;
    }
}

// ==========================================
// 4. FUNCIÓN DRAW 
// ==========================================
function draw() {
    if (!inputs.w || !inputs.h) return;

    // A. LEER VALORES
    const rawW = Math.max(1, Math.abs(parseInt(inputs.w.value) || 1920));
    const rawH = Math.max(1, Math.abs(parseInt(inputs.h.value) || 1080));
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
    if (rawThick > 10) {
        rawThick = 10;
        if(inputs.thickness) inputs.thickness.value = 10; // Reescribe el input para que el usuario vea el cambio
    }
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
        // Lo voy a quitar, prefiero la precisión matemática
        // if (height % 2 !== 0) height--;
    }

    // B. CANVAS
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const screenAspect = width / height;

  // --- DIBUJAR IMAGEN DE FONDO (CON LÓGICA FIT / FILL) ---
    const mostrarImagen = !showImageToggle || showImageToggle.checked;
    
    if (userImage && mostrarImagen) {
        try {
            // 1. Detectar qué modo eligió el usuario
            // Si el radio "Fill" está marcado, usamos modo 'max', si no, 'min'.
            const isFill = inputs.scaleFill && inputs.scaleFill.checked;
            // Si es Crop, la imagen SIEMPRE debe comportarse como Fill (cubrir todo)
            const shouldUseFillLogic = isFill || isCropMode;
            
            // 2. Calcular la proporción de escalado (Scale Ratio)
            // Calculamos cuánto hay que estirar el ancho y el alto
            const ratioW = width / userImage.width;
            const ratioH = height / userImage.height;
            
            let renderRatio;

          if (shouldUseFillLogic) {
                // En modo Crop o Fill, usamos Max para cubrir todo el área
                renderRatio = Math.max(ratioW, ratioH);
            } else {
                // En modo Fit, usamos Min para ver la imagen entera
                renderRatio = Math.min(ratioW, ratioH);
            }

            // 3. Calcular nuevas dimensiones finales
            const newW = userImage.width * renderRatio;
            const newH = userImage.height * renderRatio;

            // 4. Centrar la imagen matemáticamente
            const posX = (width - newW) / 2;
            const posY = (height - newH) / 2;

            // 5. Dibujar
            ctx.drawImage(userImage, posX, posY, newW, newH);

        } catch (e) { console.error(e); }
    }
    // -------------------------------------------------------

   // D. CÁLCULO DE GEOMETRÍA (Matemática Pixel-Perfect)
    let visibleW, visibleH;
    let offsetX, offsetY; // Declaramos aquí para usarlas fuera

    if (isCropMode) {
        // 🔥 CORRECCIÓN DEFINITIVA PARA CROP:
        // En modo Crop, el "Visible Area" ES el canvas entero.
        // Forzamos que coincidan exactamente para evitar líneas de 1px.
        visibleW = width;
        visibleH = height;
        
        // Cero márgenes, porque no hay barras negras
        offsetX = 0;
        offsetY = 0;
    } 
    else {
        // --- LÓGICA ESTÁNDAR (FIT / FILL) ---
        
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
    // Voy a comentarlas, prefiero la precisión matemática
    //if (visibleW % 2 !== 0) visibleW--;
    // if (visibleH % 2 !== 0) visibleH--;

    // 4. Calcular Matte (Barras) con enteros
    // Math.floor asegura que no queden medios píxeles sueltos
    const barHeight = Math.floor((height - visibleH) / 2);
    const barWidth = Math.floor((width - visibleW) / 2);
    offsetX = barWidth;
    offsetY = barHeight;
     }

// E. MATTE
    // 🔥 CAMBIO: Solo dibujamos las barras negras si NO estamos en modo Crop.
    // En modo Crop, el borde del canvas es el límite natural.
    if (!isCropMode) {
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        
        // Barra Superior
        ctx.fillRect(0, 0, width, offsetY); 
        // Barra Inferior
        ctx.fillRect(0, height - offsetY, width, offsetY); 
        // Barra Izquierda
        ctx.fillRect(0, offsetY, offsetX, visibleH); 
        // Barra Derecha
        ctx.fillRect(width - offsetX, offsetY, offsetX, visibleH); 
    }

    // F. FRAMELINE 1 (Principal)
    if (mainThickness > 0) {
        if (inputs.color) ctx.strokeStyle = inputs.color.value;
        ctx.lineWidth = mainThickness; 
        ctx.setLineDash([]); 
        ctx.beginPath();
        // TRUCO DE NITIDEZ: 
        // Si el grosor es impar (1, 3, 5...), desplazamos 0.5px para que caiga en el centro del pixel.
        // Si es par (2, 4...), no desplazamos.
        const sharpOffset = (mainThickness % 2 !== 0) ? 0.5 : 0;
        ctx.rect(offsetX - mainOffset, offsetY - mainOffset, visibleW + (mainOffset * 2), visibleH + (mainOffset * 2));
        ctx.stroke();
    }

    // G. FRAMELINE 2 (Secundario)
    // Definimos variables para usarlas luego en el texto
    let secX = 0, secY = 0, secW = 0, secH = 0;
    let drawSec = false;

    if (inputs.secOn && inputs.secOn.checked && secThickness > 0) {
        drawSec = true;
        const secAspect = getAspectRatio(inputs.secAspect ? inputs.secAspect.value : 1.77);
        const fitInside = inputs.secFit && inputs.secFit.checked;

        if (fitInside) {
            const mainFrameAspect = visibleW / visibleH;
            if (secAspect > mainFrameAspect) {
                secW = visibleW; secH = visibleW / secAspect;
            } else {
                secH = visibleH; secW = visibleH * secAspect;
            }
        } else {
            if (secAspect > screenAspect) {
                secW = width; secH = width / secAspect;
            } else {
                secH = height; secW = height * secAspect;
            }
            secW = secW * scaleFactor;
        }

       // 2. 🔥 CORRECCIÓN: REDONDEAR Y FORZAR PARES (Igual que Main Frame)
       
        secW = Math.round(secW);
        secH = Math.round(secH);

        // Voy a comentarlas, prefiero la precisión matemática
       // if (secW % 2 !== 0) secW--; // Si es 1215 -> 1214
       // if (secH % 2 !== 0) secH--; // Si es impar -> par

        // 3. CALCULAR POSICIÓN
        secX = (width - secW) / 2;
        secY = (height - secH) / 2;

        if(inputs.secColor) ctx.strokeStyle = inputs.secColor.value;
        ctx.lineWidth = secThickness; 
        ctx.setLineDash([10, 5]); 
        ctx.beginPath();
        ctx.rect(secX, secY, secW, secH);
        ctx.stroke();
    }

    // H. SAFE AREAS
    if (safeThickness > 0) {
        const drawSafe = (pct, dashed) => {
            const p = pct / 100;
            const sW = visibleW * p;
            const sH = visibleH * p;
            const sX = (width - sW) / 2;
            const sY = (height - sH) / 2;
            ctx.lineWidth = safeThickness;
            if(inputs.color) ctx.strokeStyle = inputs.color.value;
            ctx.setLineDash(dashed ? [5, 5] : []); 
            ctx.beginPath();
            ctx.rect(sX, sY, sW, sH);
            ctx.stroke();
        };
        if (inputs.safeActionOn && inputs.safeActionOn.checked) 
            drawSafe(parseFloat(inputs.safeActionVal.value)||93, false);
        if (inputs.safeTitleOn && inputs.safeTitleOn.checked) 
            drawSafe(parseFloat(inputs.safeTitleVal.value)||90, true);
    }

 // ===============================================
    // I. LABELS (HUD INTELIGENTE + TEXTO LIMPIO)
    // ===============================================
    
    const showAspect = inputs.showLabels && inputs.showLabels.checked;
    const showRes = inputs.showResLabels && inputs.showResLabels.checked;

    if (showAspect || showRes) {
        // 1. Configuración de Fuente
        const fontSize = Math.max(12, Math.round(width / 80)); 
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textBaseline = "top";
        const padding = 10; 
        const lineHeight = fontSize + 6; 

        // --- A. DIBUJAR MAIN FRAMELINE TEXT ---
        if (mainThickness > 0) {
            ctx.fillStyle = inputs.color.value;
            
          // CAMBIO AQUÍ: Usamos getCleanLabel para limpiar el número feo
           // const txtAsp = inputs.aspect ? getCleanLabel(inputs.aspect.value) : "";
           const txtAsp = obtenerRatioTexto(Math.round(visibleW), Math.round(visibleH));
            const txtRes = `${Math.round(visibleW)} x ${Math.round(visibleH)}`;
            
            // Check colisión horizontal
            const wAsp = ctx.measureText(txtAsp).width;
            const wRes = ctx.measureText(txtRes).width;
            const isTightHoriz = (wAsp + wRes + (padding * 4)) > visibleW;

            // 1. Aspecto Main
            if (showAspect) {
                ctx.textAlign = "left";
                ctx.fillText(txtAsp, offsetX + padding, offsetY + padding);
            }
            // 2. Resolución Main
            if (showRes) {
                if (isTightHoriz && showAspect) {
                    ctx.textAlign = "left";
                    ctx.fillText(txtRes, offsetX + padding, offsetY + padding + lineHeight);
                } else {
                    ctx.textAlign = showAspect ? "right" : "left";
                    const posX = showAspect ? (offsetX + visibleW - padding) : (offsetX + padding);
                    ctx.fillText(txtRes, posX, offsetY + padding);
                }
            }
       //}

        // --- B. DIBUJAR SECONDARY FRAMELINE TEXT ---
        if (drawSec && inputs.secAspect) {
            ctx.fillStyle = inputs.secColor.value;

            // CAMBIO AQUÍ: Usamos getCleanLabel también
           // const txtSecAsp = getCleanLabel(inputs.secAspect.value);
           const txtSecAsp = obtenerRatioTexto(Math.round(secW), Math.round(secH));
            const txtSecRes = `${Math.round(secW)} x ${Math.round(secH)}`;


            // --- LÓGICA DE ANTICOLISIÓN VERTICAL ---
            let textY = secY + padding;
            const verticalGap = Math.abs(offsetY - secY);
            if (verticalGap < (lineHeight * 1.5)) {
                textY += lineHeight; 
            }

            // Check colisión horizontal interna
            const wSecAsp = ctx.measureText(txtSecAsp).width;
            const wSecRes = ctx.measureText(txtSecRes).width;
            const isSecTight = (wSecAsp + wSecRes + (padding * 4)) > secW;

            // 1. Aspecto Secundario
            if (showAspect) {
                ctx.textAlign = "left";
                ctx.fillText(txtSecAsp, secX + padding, textY);
            }

            // 2. Resolución Secundaria
            if (showRes) {
                if (isSecTight && showAspect) {
                    ctx.textAlign = "left";
                    ctx.fillText(txtSecRes, secX + padding, textY + lineHeight);
                } else {
                    ctx.textAlign = showAspect ? "right" : "left";
                    const posX = showAspect ? (secX + secW - padding) : (secX + padding);
                    ctx.fillText(txtSecRes, posX, textY);
                }
            }
        }
    }
    }

// ==========================================
// 5. EVENTOS (CONEXIONES SEGURAS)
// ==========================================

// Conectar TODOS los inputs que existan
Object.values(inputs).forEach(input => {
    if (input) {
        input.addEventListener('input', requestDraw);
        input.addEventListener('change', requestDraw); // Importante para checkboxes y selects
        
        // Flechas teclado
     if (input.type === 'text') {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    
                    // 1. Calcular Matemática
                    let val = getAspectRatio(input.value);
                    val += (e.key === 'ArrowUp' ? 0.01 : -0.01);
                    if (val < 0.01) val = 0.01;
                    
                    // 2. Asignar valor
                    input.value = val.toFixed(2);
                    
                    // --- NUEVO: PARTE VISUAL QUE FALTABA ---
                    
                    // A. Si es el input principal de aspecto
                    if (input === inputs.aspect) {
                        // Cambiar menú a Custom
                        if (menuAspecto) menuAspecto.value = 'custom';

                        // --- CAMBIO AQUÍ ---
                        // En lugar de buscar en el grupo, buscamos en todo el documento
                        // pero específicamente los botones de aspect ratio que estén activos.
                        // (Asumiendo que solo hay unos botones con la función setAspect)
                        const botonesActivos = document.querySelectorAll('.presets-mini button.active');
                        
                        botonesActivos.forEach(b => {
                            // Verificación extra: solo apagar si NO es de opacidad o resolución
                            // (O simplemente apagar todo si no te importa)
                            b.classList.remove('active');
                });
                    }
                    // ---------------------------------------

                    requestDraw();
                }
            });
        }
    }
});

// ==========================================
// LÓGICA DEL MENÚ DE RESOLUCIÓN
// ==========================================
// ==========================================
// LÓGICA DEL MENÚ DE RESOLUCIÓN (NAVEGACIÓN)
// ==========================================
if (menuResoluciones) {
    menuResoluciones.addEventListener('change', () => {
        const val = menuResoluciones.value;

        // A. SI ELIGE UNA CARPETA ("Ver más...")
        if (val.startsWith('NAV_FOLDER_')) {
            const index = parseInt(val.replace('NAV_FOLDER_', ''));
            currentViewMode = index; // Entrar a la carpeta
            renderResolutionMenu(); // Redibujar
            
            // Auto-seleccionar el primer item real para UX
            if (menuResoluciones.options.length > 2) {
                menuResoluciones.selectedIndex = 2;
                menuResoluciones.dispatchEvent(new Event('change'));
            }
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

        // C. SELECCIÓN NORMAL (Resolución)
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
// LÓGICA DEL MENÚ DE ASPECTO (FRAMELINE)
// ==========================================
if (menuAspecto) {
    menuAspecto.addEventListener('change', () => {
        // 1. Mostrar caja oculta (si aplica)
        if (cajaAspecto) cajaAspecto.classList.remove('hidden');
        
        const val = menuAspecto.value;
        if (val === 'custom' || val === '') return;
        
        // 2. Poner el valor en el input
        if(inputs.aspect) inputs.aspect.value = val;

        // 3. APAGAR BOTONES (Limpieza)
        const contenedorBotones = document.getElementById('aspectBtnContainer');
        if (contenedorBotones) {
            const botonesPrendidos = contenedorBotones.querySelectorAll('button.active');
            botonesPrendidos.forEach(btn => btn.classList.remove('active'));
        }

        // ======================================================
        // 🔥 CORRECCIÓN AQUÍ: AUTO-ON FORZADO
        // ======================================================
        const currentThick = parseInt(inputs.thickness ? inputs.thickness.value : 0) || 0;
        
        if (currentThick === 0) {
            // A. Calculamos el grosor ideal manualmente
            const currentW = parseInt(inputs.w.value) || 1920;
            const idealThickness = (currentW > 3500) ? 6 : 2;

            // B. ¡OBLIGAMOS AL INPUT A CAMBIAR! (Esto faltaba)
            inputs.thickness.value = idealThickness;
            
            // C. Actualizamos la variable global de memoria
            if (typeof lastThickness !== 'undefined') lastThickness = idealThickness;

            // D. Actualizamos el botón visual del Ojito
            if (typeof updateQuickBtnState === 'function') {
                updateQuickBtnState();
            }
        }
        // ======================================================
        
        // 4. Redibujar
        flashInput(inputs.aspect);
        
        // Usamos requestDraw si ya implementaste la optimización, si no, usa draw()
        if (typeof requestDraw === 'function') requestDraw(); else draw();
    });
}

// ==========================================
// LÓGICA DEL MENÚ DE 2nd ASPECTO (NUEVO)
// ==========================================
if (menuSecAspect) {
    menuSecAspect.addEventListener('change', () => {
        const val = menuSecAspect.value;
        
        // Si es custom, no tocamos el input manual
        if (val === 'custom') return;

        // Actualizamos el input manual del segundo frame
        if (inputs.secAspect) {
            inputs.secAspect.value = val;
            flashInput(inputs.secAspect);
        }
        
        requestDraw();
    });
}

// SINCRONIZACIÓN INVERSA (Si escribes manual -> Menú a Custom)
if (inputs.secAspect) {
    inputs.secAspect.addEventListener('input', () => {
        if (menuSecAspect) menuSecAspect.value = 'custom';
        draw(); // Aseguramos que se redibuje al escribir
    });
}

// ==========================================
// SINCRONIZACIÓN MANUAL (CORREGIDA)
// ==========================================

// 1. Si cambias ANCHO (Width)
if (inputs.w) {
    inputs.w.addEventListener('input', () => {
        // Cambiar menú a Custom
        if (menuResoluciones) menuResoluciones.value = 'custom';
        // Apagar botones azules de Resolución
        clearActiveButtons('.presets'); 
    });
}

// 2. Si cambias ALTO (Height)
if (inputs.h) {
    inputs.h.addEventListener('input', () => {
        if (menuResoluciones) menuResoluciones.value = 'custom';
        clearActiveButtons('.presets');
    });
}

// --- SINCRONIZACIÓN MANUAL DE ASPECTO ---
if (inputs.aspect) {
    inputs.aspect.addEventListener('input', () => {
        
        // 1. Forzar el menú de arriba a "Custom"
        if (menuAspecto) menuAspecto.value = 'custom';

        // 2. APAGAR LOS BOTONES (Aquí está la solución)
        const contenedorBotones = document.getElementById('aspectBtnContainer');
        
        if (contenedorBotones) {
            // Buscamos cualquier botón azul dentro del contenedor
            const botonesPrendidos = contenedorBotones.querySelectorAll('button.active');
            
            // Los apagamos todos
            botonesPrendidos.forEach(btn => btn.classList.remove('active'));
        }
    });
}

// 4. Si cambias OPACIDAD
if (inputs.opacity) {
    inputs.opacity.addEventListener('input', () => {
        // Apagar botones azules de opacidad
        // Asumiendo que el slider y los botones están en el mismo input-group o cerca
        // Buscaremos el contenedor que tenga los botones de opacidad
        const parent = inputs.opacity.parentElement;
        if(parent) {
             const btns = parent.querySelectorAll('.presets-mini button');
             btns.forEach(b => b.classList.remove('active'));
        }
    });
}


// Toggles de UI
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

// ==========================================
// LÓGICA BOTÓN INFO / FEEDBACK
// ==========================================
const btnInfo = document.getElementById('infoBtn');
const panelInfo = document.getElementById('infoPanel');
const arrowInfo = document.getElementById('infoArrow');

if (btnInfo) {
    btnInfo.addEventListener('click', () => {
        panelInfo.classList.toggle('hidden');
        
        // Cambiar flechita y borde
        const isHidden = panelInfo.classList.contains('hidden');
        arrowInfo.innerText = isHidden ? "▼" : "▲";
        
        // Truco visual: Si está abierto, quitamos el borde de abajo del botón para que se una al panel
        btnInfo.style.borderBottom = isHidden ? "1px solid #444" : "none";
    });
}


// ==========================================
// 6. FUNCIONES GLOBALES (PRESETS)
// ==========================================
window.setPreset = function(w, h, btn) {
    if(inputs.w) inputs.w.value = w;
    if(inputs.h) inputs.h.value = h;
    // --- NUEVO: AJUSTAR GROSOR AUTOMÁTICAMENTE ---
    autoAdjustThickness(w);
    // ------
    const key = `${w},${h}`;
    if(menuResoluciones) {
        menuResoluciones.value = key;
        if(menuResoluciones.value !== key) menuResoluciones.value = 'custom';
    }
    flashInput(inputs.w); 
    flashInput(inputs.h);
    highlightButton(btn); requestDraw();
}

window.setAspect = function(val, btn) {
    if(cajaAspecto) cajaAspecto.classList.remove('hidden');
    if(inputs.aspect) inputs.aspect.value = val;
    if(menuAspecto) {
        menuAspecto.value = val;
        if(menuAspecto.value != val) menuAspecto.value = 'custom';
    }
    
// ======================================================
    // 🔥 CORRECCIÓN: AUTO-ON FORZADO (Igual que en el menú)
    // ======================================================
    const currentThick = parseInt(inputs.thickness ? inputs.thickness.value : 0) || 0;

    if (currentThick === 0) {
        // A. Calculamos grosor ideal (6px para 4K, 2px para HD)
        const currentW = parseInt(inputs.w.value) || 1920;
        const idealThickness = (currentW > 3500) ? 6 : 2;

        // B. ¡OBLIGAMOS AL INPUT A CAMBIAR!
        if (inputs.thickness) inputs.thickness.value = idealThickness;

        // C. Actualizamos memoria global
        if (typeof lastThickness !== 'undefined') lastThickness = idealThickness;

        // D. Prendemos el botón visual del ojito
        if (typeof updateQuickBtnState === 'function') {
            updateQuickBtnState();
        }
    }
    // ======================================================

    flashInput(inputs.aspect); highlightButton(btn); requestDraw();
}

window.setOpacity = function(val, btn) {
    if(inputs.opacity) inputs.opacity.value = val;
    flashInput(inputs.opacity); highlightButton(btn); requestDraw();
}

// ==========================================
// 8. DESCARGA INTELIGENTE (CORREGIDA)
// ==========================================
btnDownload.addEventListener('click', () => {
    // 1. Obtener datos actuales
    const w = parseInt(inputs.w.value) || 1920;
    const h = parseInt(inputs.h.value) || 1080;
    const asp = inputs.aspect ? inputs.aspect.value.replace(':','-') : 'ratio';

    // Nuevo - Detectar si es Crop
    const isCropMode = inputs.scaleCrop && inputs.scaleCrop.checked;
    
    // 2. Detectar si estamos en "Modo Foto" (JPG)
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);

    // Creamos el elemento de descarga
    const a = document.createElement('a');

    // =========================================================
    // RUTA A: MODO CROP (Prioridad Máxima)
    // =========================================================
    if (isCropMode) {
        // En modo Crop, el canvas YA tiene el tamaño recortado físicamente.
        // No dibujamos marca de agua.
        
        // Usamos PNG para máxima calidad en el recorte, o JPG 100%
        // Si hay foto, mejor JPG high quality para que no pese 50MB
        const type = hasPhoto ? 'image/jpeg' : 'image/png';
        const quality = hasPhoto ? 1.0 : undefined;
        const ext = hasPhoto ? 'jpg' : 'png';

        a.href = canvas.toDataURL(type, quality);
        a.download = `Frameline_${w}x${h}_${asp}_cropped.${ext}`;
    }
    
    // =========================================================
    // RUTA B: MODO PREVIEW (Foto + Barras Negras)
    // =========================================================
    else if (hasPhoto) {
        // Aquí SÍ dibujamos marca de agua porque es un preview
        
        ctx.save(); 
        
        // Configuración de Marca de Agua
        const fontSize = Math.max(10, Math.round(w * 0.012)); 
        const margin = fontSize; 

        ctx.font = `500 ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; 
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 4;
        
        ctx.fillText("frameline-generator.com", w - margin, h - margin);
        
        ctx.restore(); 

        // Generar JPG
        a.href = canvas.toDataURL('image/jpeg', 0.9);
        a.download = `Frameline_${w}x${h}_${asp}_preview.jpg`;

        // Borrar marca de agua visualmente (Redibujar rápido)
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
        gtag('event', 'download_file', {
            'event_category': 'Engagement',
            'event_label': isCropMode ? 'Crop' : (hasPhoto ? 'Preview' : 'Template')
        });
    }

    // Ejecutar descarga
    a.click();
});

// ==========================================
// LOGICA DE VISIBILIDAD RÁPIDA (QUICK TOGGLE)
// ==========================================
const quickFrameBtn = document.getElementById('quickFrameBtn');
const quickFrameText = document.getElementById('quickFrameText');

if (quickFrameBtn && inputs.thickness) {
    
    // Función para actualizar el estado visual del botón
    function updateQuickBtnState() {
        const currentThick = parseInt(inputs.thickness.value) || 0;
        if (currentThick > 0) {
            // Está visible
            quickFrameBtn.style.color = "#007bff"; // Azul (Activo)
            quickFrameBtn.querySelector('span').innerText = "⍉";
            quickFrameText.innerText = "On";
            lastThickness = currentThick; // Guardamos el valor
        } else {
            // Está oculto
            quickFrameBtn.style.color = "#666"; // Gris (Apagado)
            quickFrameBtn.querySelector('span').innerText = "⍉";
            quickFrameText.innerText = "Off";
        }
    }

    // Evento Click
    quickFrameBtn.addEventListener('click', () => {
        const currentThick = parseInt(inputs.thickness.value) || 0;

        if (currentThick > 0) {
            // APAGAR
            lastThickness = currentThick;
            inputs.thickness.value = 0;
        } else {
            // PRENDER (Restaurar valor anterior o usar 2 por defecto)
            inputs.thickness.value = lastThickness > 0 ? lastThickness : 2;
        }
        
        updateQuickBtnState();
        draw();
    });

    // Sincronización: Si cambias el grosor en Advanced, actualizamos este botón también
    inputs.thickness.addEventListener('input', updateQuickBtnState);
    
    // Inicializar estado visual al cargar
    updateQuickBtnState();
}

// Dibujo inicial
draw();

// ==========================================
// LÓGICA DE RESET TOTAL (CORREGIDA)
// ==========================================
const resetBtn = document.getElementById('resetAllBtn');

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      //  if(!confirm("Reset all settings to default?")) return;

        // 1. Restaurar Valores Numéricos
        if(inputs.w) inputs.w.value = 1920;
        if(inputs.h) inputs.h.value = 1080;
        if(inputs.aspect) inputs.aspect.value = 2.38695;
        
        if(inputs.opacity) inputs.opacity.value = 0;
        if(textoOpacidad) textoOpacidad.innerText = "100%";
        if(inputs.scale) inputs.scale.value = 100;
        if(textoEscala) textoEscala.innerText = "100%";

        // A. Color Principal (Verde)
        if(inputs.color) inputs.color.value = "#00ff00";

        if(inputs.thickness) inputs.thickness.value = 2;

        // C. Color Secundario (Rojo)
        // Buscamos el elemento directamente para asegurar
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

        // Resetear flechas de paneles
        const arrowEl = document.getElementById('arrow');
        if(arrowEl) arrowEl.innerText = "▼";
        const infoArrow = document.getElementById('infoArrow');
        if(infoArrow) infoArrow.innerText = "▼";

        // Limpiar imagen
        if (typeof removeImage === "function") removeImage();

        // 3. Resetear Menús
        currentViewMode = 'root'; // Volver a la raíz
        renderResolutionMenu();   // Redibujar menú
        if(menuResoluciones) menuResoluciones.value = "1920,1080"; 
        if(menuAspecto) menuAspecto.value = "2.38695";
        if(menuSecAspect) menuSecAspect.value = "9:16";
        if (inputs.secAspect) inputs.secAspect.value = "9:16";

        // 4. Limpiar Botones Azules (Resolución y Aspecto)
        const clearContainer = (id) => {
            const cont = document.getElementById(id);
            if(cont) {
                const btns = cont.querySelectorAll('button.active');
                btns.forEach(b => b.classList.remove('active'));
            }
        };
        
        clearContainer('resBtnContainer');    // Reset Resolución
        clearContainer('aspectBtnContainer'); // Reset Aspecto
        clearContainer('opacityBtnContainer');
        // 5. Restaurar Toggle "On/Off"
        const qBtn = document.getElementById('quickFrameBtn');
        const qTxt = document.getElementById('quickFrameText');
        if(qBtn) {
             qBtn.style.color = "#007bff"; 
             qBtn.querySelector('span').innerText = "⍉";
             if(qTxt) qTxt.innerText = "On";
        }

        // 6. Dibujar
        flashInput(inputs.w);
        flashInput(inputs.h);
        requestDraw();
    });
}

// RASTREO DE DONACIONES
const donationBtns = document.querySelectorAll('.coffee-btn, .paypal-btn');

donationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (typeof gtag === 'function') {
            gtag('event', 'click_donation', {
                'event_category': 'Monetization',
                'event_label': btn.innerText // Dirá si fue PayPal o Coffee
            });
        }
    });
});

// ==========================================
// AUTO-AJUSTE PARA MÓVILES (Force Fit on Mobile)
// ==========================================
function aplicarModoMobile() {
    // Detectamos si el ancho de pantalla es menor a 768px (celulares y tablets verticales)
    const esCelular = window.innerWidth < 768;

    if (esCelular) {
        // Referencias a tus botones de radio (Fit / Fill)
        const fitRadio = document.getElementById('scaleFit');
        const fillRadio = document.getElementById('scaleFill');

        if (fitRadio && fillRadio) {
            // Forzamos la selección de "Fit" (Ajustar)
            fitRadio.checked = true;
            fillRadio.checked = false;
            
            console.log("Modo móvil detectado: Ajustando imagen a Fit.");
        }
    }
}

// Ejecutamos esto apenas carga la página
document.addEventListener('DOMContentLoaded', () => {
    aplicarModoMobile();
    // Si ya tienes una llamada a draw() al inicio, esto asegurará que arranque bien
    if (typeof draw === 'function') draw(); 
});
