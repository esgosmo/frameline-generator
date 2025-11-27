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
    secFit: getEl('secFrameFit') // <--- EL CULPABLE PROBABLE
};

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

// ==========================================
// 4. FUNCIÓN DRAW (CORREGIDA)
// ==========================================
function draw() {
    // Si no existen los inputs principales, abortamos
    if (!inputs.w || !inputs.h) return;

    // --- A. VALORES (LECTURA SEGURA) ---
    
    // 1. Dimensiones
    const width = Math.max(1, Math.abs(parseInt(inputs.w.value) || 1920));
    const height = Math.max(1, Math.abs(parseInt(inputs.h.value) || 1080));
    const targetAspect = getAspectRatio(inputs.aspect ? inputs.aspect.value : 2.39);

    // 2. Escala
    let scaleVal = inputs.scale ? parseInt(inputs.scale.value) : 100;
    if (isNaN(scaleVal)) scaleVal = 100; // Si está vacío, usa 100
    const scaleFactor = scaleVal / 100;
    if (textoEscala) textoEscala.innerText = scaleVal + "%";

    // 3. OPACIDAD (AQUÍ ESTABA EL ERROR)
    let opacityVal = inputs.opacity ? parseInt(inputs.opacity.value) : 100;
    // Permitimos el 0. Solo si es NaN (texto basura) usamos 100.
    if (isNaN(opacityVal)) opacityVal = 100; 
    
    const opacity = opacityVal / 100;
    if (textoOpacidad) textoOpacidad.innerText = opacityVal + "%";

    // 4. Grosor
    const mainThickness = Math.max(1, Math.abs(parseInt(inputs.thickness ? inputs.thickness.value : 2) || 2));
    const mainOffset = mainThickness / 2;


    // --- B. CANVAS ---
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const screenAspect = width / height;


    // --- C. CÁLCULO DE GEOMETRÍA ---
    let visibleW, visibleH;

    if (targetAspect > screenAspect) {
        visibleW = width;
        visibleH = width / targetAspect;
    } else {
        visibleH = height;
        visibleW = height * targetAspect;
    }

    // Aplicar Escala
    visibleW = visibleW * scaleFactor;
    visibleH = visibleH * scaleFactor;

    // Calcular Barras Negras (Matte)
    const barHeight = (height - visibleH) / 2;
    const barWidth = (width - visibleW) / 2;
    const offsetX = barWidth;
    const offsetY = barHeight;


    // --- D. DIBUJAR MATTE (FONDO) ---
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    
    // Dibujamos 4 rectángulos para cubrir el área exterior
    ctx.fillRect(0, 0, width, offsetY); // Arriba
    ctx.fillRect(0, height - offsetY, width, offsetY); // Abajo
    ctx.fillRect(0, offsetY, offsetX, visibleH); // Izquierda
    ctx.fillRect(width - offsetX, offsetY, offsetX, visibleH); // Derecha


    // --- E. DIBUJAR FRAMELINE 1 ---
    if (inputs.color) ctx.strokeStyle = inputs.color.value;
    ctx.lineWidth = mainThickness; 
    ctx.setLineDash([]); 
    ctx.beginPath();
    ctx.rect(offsetX - mainOffset, offsetY - mainOffset, visibleW + (mainOffset * 2), visibleH + (mainOffset * 2));
    ctx.stroke();


    // --- F. DIBUJAR FRAMELINE 2 (SECUNDARIO) ---
    if (inputs.secOn && inputs.secOn.checked) {
        const secAspect = getAspectRatio(inputs.secAspect ? inputs.secAspect.value : 1.77);
        let secW, secH;
        
        const fitInside = inputs.secFit && inputs.secFit.checked;

        if (fitInside) {
            const mainFrameAspect = visibleW / visibleH;
            if (secAspect > mainFrameAspect) {
                secW = visibleW;
                secH = visibleW / secAspect;
            } else {
                secH = visibleH;
                secW = visibleH * secAspect;
            }
        } else {
            if (secAspect > screenAspect) {
                secW = width;
                secH = width / secAspect;
            } else {
                secH = height;
                secW = height * secAspect;
            }
            secW = secW * scaleFactor;
            secH = secH * scaleFactor;
        }

        const secX = (width - secW) / 2;
        const secY = (height - secH) / 2;

        if(inputs.secColor) ctx.strokeStyle = inputs.secColor.value;
        ctx.lineWidth = 2; 
        ctx.setLineDash([10, 5]); 
        ctx.beginPath();
        ctx.rect(secX, secY, secW, secH);
        ctx.stroke();
    }


    // --- G. SAFE AREAS ---
    const drawSafe = (pct, dashed) => {
        const p = pct / 100;
        const sW = visibleW * p;
        const sH = visibleH * p;
        const sX = (width - sW) / 2;
        const sY = (height - sH) / 2;
        ctx.lineWidth = 1;
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
        
        // 1. Cambiar menú a Custom
        if (menuAspecto) {
            menuAspecto.value = 'custom';
        }

        // 2. APAGAR BOTONES (MÉTODO INFALIBLE)
        // Buscamos el contenedor por su ID
        const container = document.getElementById('aspectGroup');
        
        if (container) {
            // Buscamos TODOS los botones que vivan ahí dentro
            const buttons = container.querySelectorAll('button');
            
            // Los apagamos todos
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });
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
// 6. FUNCIONES GLOBALES (PRESETS)
// ==========================================
window.setPreset = function(w, h, btn) {
    if(inputs.w) inputs.w.value = w;
    if(inputs.h) inputs.h.value = h;
    const key = `${w},${h}`;
    if(menuResoluciones) {
        menuResoluciones.value = key;
        if(menuResoluciones.value !== key) menuResoluciones.value = 'custom';
    }
    flashInput(inputs.w); highlightButton(btn); draw();
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
// 7. DESCARGA & INIT
// ==========================================
btnDownload.addEventListener('click', () => {
    const w = inputs.w ? inputs.w.value : 1920;
    const h = inputs.h ? inputs.h.value : 1080;
    const asp = inputs.aspect ? inputs.aspect.value.replace(':','-') : '2.39';
    const a = document.createElement('a');
    a.download = `Frameline_${w}x${h}_${asp}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
});

// Dibujo inicial
draw();
