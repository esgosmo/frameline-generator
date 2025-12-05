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
    scaleFill: getEl('scaleFill')
};

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
// 3. IMAGE LOADING LOGIC (WITH SIZE & RES WARNING)
// ==========================================
const sizeWarning = document.getElementById('sizeWarning'); 

if (imageLoader) {
    imageLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // ------------------------------------------------
        // 1. DETECT FILE SIZE (> 20MB)
        // ------------------------------------------------
        const limitBytes = 20 * 1024 * 1024; // 20MB
        let isHeavyFile = false; // Flag to remember state
        
        if (file.size > limitBytes) {
            isHeavyFile = true;
            if(sizeWarning) {
                // English Warning 1
                sizeWarning.innerText = "⚠️ Large file size (>20MB) Performance may lag"; 
                sizeWarning.classList.remove('hidden');
            }
        } else {
            // Hide for now if size is okay
            if(sizeWarning) sizeWarning.classList.add('hidden');
        }

        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            
            img.onload = () => {
                userImage = img;
                
                // ------------------------------------------------
                // 2. DETECT RESOLUTION (> 6K)
                // ------------------------------------------------
                const limitRes = 6000; 

                if (img.width > limitRes || img.height > limitRes) {
                    if (sizeWarning) {
                        // English Warning 2 (Combined or Res only)
                        const msg = isHeavyFile 
                            ? "⚠️ Large file & large resolution (>6K) Performance may lag."
                            : "⚠️ Large resolution (>6K) Performance may lag.";
                        
                        sizeWarning.innerText = msg;
                        sizeWarning.classList.remove('hidden');
                    }
                }
                
                // Show controls
                if (imageOptionsPanel) imageOptionsPanel.classList.remove('hidden');

                // Adapt Canvas
                if(inputs.w) inputs.w.value = img.width;
                if(inputs.h) inputs.h.value = img.height;
                
                // Adjust thickness
                if (typeof autoAdjustThickness === "function") autoAdjustThickness(img.width);
                
                // Reset Menu
                if(menuResoluciones) menuResoluciones.value = 'custom';
                
                const clearContainer = (id) => {
                    const cont = document.getElementById(id);
                    if(cont) cont.querySelectorAll('button.active').forEach(b => b.classList.remove('active'));
                };
                clearContainer('resBtnContainer');
                
                flashInput(inputs.w);
                flashInput(inputs.h);

                draw();
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
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

function obtenerRatioTexto(w, h) {
    // 1. Cálculo decimal básico
    const ratio = w / h;

    // ---------------------------------------------------------
    // A. EXCEPCIONES VIP (Formatos de Cine/Estándares que queremos fijos)
    // ---------------------------------------------------------
    if (Math.abs(ratio - (5/3)) < 0.02) return "1.66";  // Europeo
    if (Math.abs(ratio - (9/16)) < 0.02) return "9:16"; 
    if (Math.abs(ratio - 2.40) < 0.01) return "2.40"; 
    if (Math.abs(ratio - 2.39) < 0.01) return "2.39";  // Scope Moderno
    if (Math.abs(ratio - 2.35) < 0.02) return "2.35";  // Scope Viejo
    if (Math.abs(ratio - 1.85) < 0.02) return "1.85";  // Flat / Americano
    if (Math.abs(ratio - 1.37) < 0.02) return "1.37";  // Academy
    if (Math.abs(ratio - 1.43) < 0.02) return "1.43";  // IMAX

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
    const width = Math.max(1, Math.abs(parseInt(inputs.w.value) || 1920));
    const height = Math.max(1, Math.abs(parseInt(inputs.h.value) || 1080));
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
    if (rawThick > 10) {
        rawThick = 10;
        if(inputs.thickness) inputs.thickness.value = 10; // Reescribe el input para que el usuario vea el cambio
    }
    const mainThickness = Math.max(0, rawThick);
    const mainOffset = mainThickness / 2;
    const secThickness = mainThickness; 
    let safeThickness = 0;
    if (mainThickness > 0) safeThickness = Math.max(1, Math.round(mainThickness / 2));

    // B. CANVAS
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const screenAspect = width / height;

  // --- DIBUJAR IMAGEN DE FONDO (CON LÓGICA FIT / FILL) ---
    const mostrarImagen = !showImageToggle || showImageToggle.checked;
    
    if (userImage && mostrarImagen) {
        try {
            // 1. Detectar qué modo eligió el usuario
            // Si el radio "Fill" está marcado, usamos modo 'max', si no, 'min'.
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
    const offsetX = barWidth;
    const offsetY = barHeight;

    // E. MATTE
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(0, 0, width, offsetY); 
    ctx.fillRect(0, height - offsetY, width, offsetY); 
    ctx.fillRect(0, offsetY, offsetX, visibleH); 
    ctx.fillRect(width - offsetX, offsetY, offsetX, visibleH); 

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
           const txtAsp = obtenerRatioTexto(visibleW, visibleH);
            const txtRes = `${visibleW} x ${visibleH}`;
            
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
        }

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
        input.addEventListener('input', draw);
        input.addEventListener('change', draw); // Importante para checkboxes y selects
        
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

                    draw();
                }
            });
        }
    }
});

// ==========================================
// LÓGICA DEL MENÚ DE RESOLUCIÓN
// ==========================================
if (menuResoluciones) {
    menuResoluciones.addEventListener('change', () => {
        const val = menuResoluciones.value;
        
        // Si elige custom o vacío, no hacemos nada con los números
        if (val === 'custom' || val === '') return;

        // 1. Poner valores en los inputs
        const [nW, nH] = val.split(',');
        if(inputs.w) inputs.w.value = nW;
        if(inputs.h) inputs.h.value = nH;

        // --- NUEVO: AJUSTAR GROSOR AUTOMÁTICAMENTE ---
        autoAdjustThickness(nW); 
        // --
        
        // 2. APAGAR BOTONES (LIMPIEZA)
        // Buscamos la caja de botones por su ID nuevo
        const contenedorRes = document.getElementById('resBtnContainer');
        
        if (contenedorRes) {
            // Buscamos solo los botones azules ADENTRO de esa caja
            const botonesPrendidos = contenedorRes.querySelectorAll('button.active');
            botonesPrendidos.forEach(btn => btn.classList.remove('active'));
        }
        
        // 3. Redibujar
        flashInput(inputs.w);
        flashInput(inputs.h);
        draw();
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

        // 3. APAGAR BOTONES (SOLUCIÓN INFALIBLE)
        // Buscamos directamente el contenedor de los botones por su nuevo ID
        const contenedorBotones = document.getElementById('aspectBtnContainer');
        
        if (contenedorBotones) {
            const botonesPrendidos = contenedorBotones.querySelectorAll('button.active');
            botonesPrendidos.forEach(btn => btn.classList.remove('active'));
        }
        
        // 4. Redibujar
        flashInput(inputs.aspect);
        draw();
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
        
        draw();
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
    highlightButton(btn); draw();
}

window.setAspect = function(val, btn) {
    if(cajaAspecto) cajaAspecto.classList.remove('hidden');
    if(inputs.aspect) inputs.aspect.value = val;
    if(menuAspecto) {
        menuAspecto.value = val;
        if(menuAspecto.value != val) menuAspecto.value = 'custom';
    }
    flashInput(inputs.aspect); highlightButton(btn); draw();
}

window.setOpacity = function(val, btn) {
    if(inputs.opacity) inputs.opacity.value = val;
    flashInput(inputs.opacity); highlightButton(btn); draw();
}

// ==========================================
// 8. DESCARGA INTELIGENTE (JPG vs PNG)
// ==========================================
btnDownload.addEventListener('click', () => {
    // 1. Obtener datos
    const w = parseInt(inputs.w.value) || 1920;
    const h = parseInt(inputs.h.value) || 1080;
    // Limpiamos el nombre del aspecto (cambiamos : por -)
    const asp = inputs.aspect ? inputs.aspect.value.replace(':','-') : 'ratio';
    
    // 2. Detectar si estamos en "Modo Foto"
    // (Si hay imagen cargada Y el ojito está activado)
    const hasPhoto = userImage && (!showImageToggle || showImageToggle.checked);

    const a = document.createElement('a');

    if (hasPhoto) {
        // --- CASO A: CON FOTO (JPG) ---
        // Usamos JPG calidad 0.9 (90%). Pesa poco y se ve genial.
        // Agregamos "_preview" al nombre para diferenciarlo.
        a.href = canvas.toDataURL('image/jpeg', 0.9);
        a.download = `Frameline_${w}x${h}_${asp}_preview.jpg`;
    } else {
        // --- CASO B: SOLO LÍNEAS (PNG) ---
        // Mantenemos PNG para la transparencia (Overlay).
        // Nombre estándar.
        a.href = canvas.toDataURL('image/png');
        a.download = `Frameline_${w}x${h}_${asp}.png`;
    }

    // --- AGREGAR ESTO PARA AVISAR A GOOGLE ---
    if (typeof gtag === 'function') {
        gtag('event', 'download_png', {
            'event_category': 'Engagement',
            'event_label': `Resolution: ${w}x${h}` // Le enviamos qué resolución bajaron
        });
    }
    // ----------------------------------------

    // 3. Descargar sin preguntas (Warning eliminado)
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
        if(inputs.aspect) inputs.aspect.value = 2.39;
        
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

        // Resetear flechas de paneles
        const arrowEl = document.getElementById('arrow');
        if(arrowEl) arrowEl.innerText = "▼";
        const infoArrow = document.getElementById('infoArrow');
        if(infoArrow) infoArrow.innerText = "▼";

        // Limpiar imagen
        if (typeof removeImage === "function") removeImage();

        // 3. Resetear Menús
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
        draw();
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
