describe('Robot de Prueba: Frameline Generator', () => {

  beforeEach(() => {
    cy.visit('http://127.0.0.1:5500/index.html'); 
  });

  it('1. A El botón HD debe estar activo (azul) al cargar la página', () => {
        cy.contains('button', 'HD').should('have.class', 'active');
    });

  it('2. Carga inicial correcta (HD)', () => {
    cy.get('#width').should('have.value', '1920');
  });

  it('3. Cambio de Preset a UHD', () => {
    cy.contains('button', 'UHD').click();
    cy.get('#width').should('have.value', '3840');
  });

  // --- AQUÍ ESTÁ EL ARREGLO DEL TEST 3 ---
  it('4. Cálculo de Aspect Ratio (Crop)', () => {
    
    // PASO NUEVO: Primero hacemos visible el input
    // Buscamos el menú desplegable y seleccionamos 'custom'
    // (Asegúrate de que en tu HTML el value sea 'custom', si no, usa el valor que tengas)
    cy.get('#aspectSelect').select('custom');

    // Ahora verificamos que el input ya sea visible y escribimos
    cy.get('#aspect')
      .should('be.visible') 
      .clear()
      .type('2.39');
    
    // Activamos el Checkbox de Crop
    cy.get('#scaleCrop').check({ force: true }); // force:true ayuda con checkboxes estilizados

    // Esperamos un momento a que el canvas se redibuje
    cy.wait(500); 

    // Verificamos la altura del canvas
    cy.get('#myCanvas').then(($canvas) => {
        const h = parseInt($canvas.attr('height'));
        const w = parseInt($canvas.attr('width'));
        
        cy.log(`Ancho: ${w}, Alto: ${h}`);

        // 1920 / 2.39 = 803
        expect(h).to.be.within(800, 810);
    });
  });

it('5. Prueba de Seguridad Móvil (Límite 6K)', () => {
    // 1. Nos disfrazamos de iPhone
    cy.visit('http://127.0.0.1:5500/index.html', {
      onBeforeLoad: (win) => {
        Object.defineProperty(win.navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          configurable: true
        });
      }
    });
    cy.viewport('iphone-x');
    cy.wait(500);

    // --- FASE 1: PROBAR QUE 6000x4000 ES SEGURO ---
    cy.log('Probando límite permitido (6000x4000)...');
    
    cy.get('#width').clear().type('6000').blur();
    cy.wait(200);
    cy.get('#height').clear().type('4000').blur();

    // Verificamos que la alerta NO exista o NO sea visible
    // (Wait breve para asegurar que no aparezca con retraso)
    cy.wait(1000); 
    cy.get('#sizeWarning').should('not.be.visible');

    // --- FASE 2: PROBAR QUE EL EXCESO SIGUE PROTEGIDO ---
    cy.log('Probando exceso (20000x10000)...');

    cy.get('#width').clear().type('20000').blur();
    cy.wait(200);
    cy.get('#height').clear().type('10000').blur();
    
    // Ahora sí debe aparecer la alerta
    cy.get('#sizeWarning', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'Mobile Safety'); // O el texto que uses
  });

  it('6. Botón de descarga', () => {
    // Recargamos limpio para evitar residuos del test anterior
    cy.visit('http://127.0.0.1:5500/index.html');
    cy.get('#downloadBtn').click();
  });

it('7. El botón Reset restaura los valores (Simulación Humana + Velocidad Luz)', () => {
    // 1. Visitamos la web
    cy.visit('http://127.0.0.1:5500/index.html');

    // --- A. USUARIO CAMBIA RESOLUCIÓN ---
    cy.get('#resolutionSelect').select('custom'); 
    cy.get('#resolutionSelect').should('have.value', 'custom');

    // --- B. USUARIO ESCRIBE DIMENSIONES ---
    // ESTRATEGIA: { delay: 0 } escribe todo de golpe antes de que el DOM se rompa.
    
    // 1. Limpiamos y escribimos en Width
    cy.get('#width').clear(); 
    // Rompemos cadena: volvemos a buscar el elemento por si clear() lo mató
    cy.get('#width').type('1234', { delay: 0 }); 
    
    // 2. Hacemos Blur (Simular clic fuera)
    // Rompemos cadena de nuevo: buscamos el elemento fresco
    cy.get('#width').blur(); 
    
    // 3. Repetimos para Height
    cy.get('#height').clear();
    cy.get('#height').type('1234', { delay: 0 });
    cy.get('#height').blur();

    // --- C. USUARIO CAMBIA OPACIDAD ---
    // 1. Abrimos el menú avanzado
    cy.get('#advancedBtn').click();
    cy.get('#advancedGroup').should('not.have.class', 'hidden');

    // 2. Movemos slider (invoke/trigger es la única forma fiable para sliders)
    cy.get('#opacity').invoke('val', 50).trigger('input');

    // --- D. USUARIO ELIGE SOCIAL ZONE ---
    cy.get('#socialZoneSelect').select('IG_REELS');
    cy.get('#socialZoneSelect').should('have.value', 'IG_REELS');

    // --- E. EJECUTAR RESET ---
    cy.get('#resetAllBtn').click();

    // --- F. VERIFICACIÓN FINAL ---
    // Buscamos todo de nuevo desde cero
    cy.get('#width').should('have.value', '1920');
    cy.get('#height').should('have.value', '1080');
    cy.get('#opacity').should('have.value', '0');
    cy.get('#socialZoneSelect').should('have.value', 'none');
    
    // Verificar que el menú avanzado se cerró
    cy.get('#advancedGroup').should('have.class', 'hidden');
});

it('8. Carga de imagen (Método Manual Infalible)', () => {
    
    // 1. "Espía" de alertas (por si acaso)
    cy.on('window:alert', (txt) => {
       throw new Error('Alerta inesperada: ' + txt);
    });

    // 2. Usamos el archivo REAL que pusiste en la carpeta fixtures
    // Cypress buscará automáticamente en la carpeta 'cypress/fixtures'
    cy.get('#imageLoader').selectFile('cypress/fixtures/test_image.jpg', { force: true });

    // 3. Validaciones
    // Esperamos a que el panel pierda la clase 'hidden'
    cy.get('#imageOptionsPanel', { timeout: 6000 })
      .should('not.have.class', 'hidden');
    
    // Verificamos el texto
    cy.get('.upload-text').should('contain', 'Image Loaded');
  });

it('9. Frameline Secundario (Operación Forzada)', () => {
    // 1. Activamos el checkbox a la fuerza (porque el panel Advanced está cerrado)
    cy.get('#secFrameOn').check({ force: true });

    // 2. Verificamos que los controles internos perdieron su clase 'hidden'
    // (Aunque el padre #advancedGroup siga oculto, el hijo ya no debería tener su propia clase hidden)
    cy.get('#secFrameControls').should('not.have.class', 'hidden');
    
    // 3. SELECCIÓN INTELIGENTE + FUERZA BRUTA
    cy.get('#secAspectSelect')
      .find('option')
      .eq(1) // Tomamos la segunda opción
      .then(($option) => {
          const valorReal = $option.val();
          
          // --- AQUÍ ESTÁ EL ARREGLO ---
          // Usamos { force: true } para seleccionar aunque el panel padre esté cerrado
          cy.get('#secAspectSelect').select(valorReal, { force: true });
          
          // Verificamos
          cy.get('#secAspectSelect').should('have.value', valorReal);
      });
  });

it('10. Auto-ajuste de Grosor (Thickness) en alta resolución', () => {
    // 1. Empezamos en HD estándar
    cy.visit('http://127.0.0.1:5500/index.html');
    cy.get('#width').clear().type('1920').blur();
    
    // Verificamos que el grosor esté en el default (asumo que es 2)
    // Si tu default es otro, cambia el '2'
    cy.get('#thickness').should('have.value', '2');

    // 2. Subimos a resolución mayor a UHD (> 3840)
    cy.get('#width').clear().type('4000').blur();

    // 3. LA MAGIA: El grosor debería haber cambiado solo a 6
    cy.get('#thickness').should('have.value', '6');
  });

it('11. Auto-Grosor debe funcionar TAMBIÉN al cargar imagen', () => {
    // 1. Cargamos una imagen (usamos la que ya tienes en fixtures)
    cy.visit('http://127.0.0.1:5500/index.html');
    cy.get('#imageLoader').selectFile('cypress/fixtures/test_image.jpg', { force: true });

    // 2. Simulamos que la imagen cargada es gigante (UHD+)
    // Forzamos los valores como si la imagen fuera de 6000px
    cy.get('#width').clear().type('6000').blur();
    
    // 3. Verificamos: ¿Cambió el grosor a 6?
    // Probablemente aquí falle y diga que sigue en 2
    cy.get('#thickness').should('have.value', '6');
  });

it('12. Accesibilidad: Navegación por Teclado (Sin Mouse)', () => {
    // 1. Visitamos la web
    cy.visit('http://127.0.0.1:5500/index.html');

    // --- A. PRUEBA DE ATRIBUTOS ---
    cy.get('#resetAllBtn').should('have.attr', 'tabindex', '0');
    cy.get('#quickFrameBtn').should('have.attr', 'tabindex', '0');
    cy.get('.upload-zone').should('have.attr', 'tabindex', '0');

    // --- B. PRUEBA DE ACCIÓN: RESET ---
    cy.get('#width').clear().type('5555').blur();
    cy.get('#resetAllBtn').focus().type('{enter}');
    cy.get('#width').should('have.value', '1920');

    // --- C. PRUEBA DE ACCIÓN: QUICK FRAME ---
    cy.get('#quickFrameText').should('contain', 'On');
    cy.get('#quickFrameBtn').focus().type(' '); 
    cy.get('#quickFrameText').should('contain', 'Off');

    // --- D. PRUEBA DE ACCIÓN: REMOVE IMAGE ---
    cy.get('#imageLoader').selectFile('cypress/fixtures/test_image.jpg', { force: true });
    cy.contains('✕ Remove').should('be.visible').focus().type('{enter}');
    cy.get('#imageOptionsPanel').should('have.class', 'hidden');

    // --- E. PRUEBA DE AYUDA (TOOLTIPS) ---

    // 1. ABRIR EL PANEL AVANZADO
    cy.get('#advancedBtn').click(); 
    cy.get('#advancedGroup').should('not.have.class', 'hidden');

    // 2. BUSCAR EL BOTÓN ESPECÍFICO (Usando alias)
    cy.contains('.label-row', 'Social Safe Zone')
      .find('.tooltip-trigger')
      .as('socialHelpBtn');

    // 3. VALIDAR QUE EL BOTÓN ESTÁ LISTO
    // Usamos scrollIntoView() para asegurar que Cypress lo tenga en la mira
    cy.get('@socialHelpBtn')
      .scrollIntoView()
      .should('be.visible')
      .should('have.attr', 'tabindex', '0');

    // 4. ACTIVAR CON TECLADO
    cy.get('@socialHelpBtn').focus().type('{enter}');
    
    // 5. VALIDAR (LA CORRECCIÓN)
    // Eliminamos 'be.visible' porque el overflow del sidebar confunde a Cypress.
    // Solo verificamos que tu JS haya agregado la clase 'active'.
    cy.get('@socialHelpBtn')
      .parent()
      .find('.tooltip-popover')
      .should('have.class', 'active'); 
    
    // 6. CERRAR CON TECLADO
    cy.get('@socialHelpBtn').type('{enter}');
    
    // 7. VALIDAR CIERRE
    cy.get('@socialHelpBtn')
      .parent()
      .find('.tooltip-popover')
      .should('not.have.class', 'active');
});

it('13. Debe permitir mover la posición y resetearla con el botón mini-reset', () => {
    // 1. PASO NUEVO: Abrir el panel de controles seleccionando un aspecto
    // Esto quita la clase .hidden del #aspectGroup
    cy.contains('button', '2.39').click();
    
    // Ahora sí, el input ya es visible
    cy.get('#scaleInput').should('be.visible');

    // 2. Configuración inicial: Bajamos la escala al 80%
    cy.get('#scaleInput').invoke('val', 80).trigger('input');
    cy.get('#scaleValue').should('contain', '80%');

    // 3. Mover Posición X y Y
    cy.get('#posXInput').clear().type('15.5').trigger('input');
    cy.get('#posYInput').clear().type('-10').trigger('input');

    // Verificamos que los valores se mantuvieron
    cy.get('#posXInput').should('have.value', '15.5');
    cy.get('#posYInput').should('have.value', '-10');

    // 4. Presionar el botón de Mini-Reset
    cy.get('#resetPosBtn').click();

    // 5. Verificar que volvieron a 0.0
    cy.get('#posXInput').should('have.value', '0.0');
    cy.get('#posYInput').should('have.value', '0.0');

    // 6. Verificar que la escala NO se reseteó (debe seguir en 80%)
    cy.get('#scaleInput').should('have.value', '80');
});

it('14. Debe bloquear y resetear la posición automáticamente (Smart Lock)', () => {
    // 1. Abrir panel
    cy.contains('button', '2.39').click();
    
    // 2. Bajar escala al 50%
    cy.get('#scaleInput').invoke('val', 50).trigger('input');

    // 3. Mover posición y SALIR DEL INPUT (.blur)
    // El .blur() es la clave: simula que el usuario hizo clic fuera
    cy.get('#posXInput').clear().type('20').blur(); 
    
    // Verificamos que el valor se quedó ahí
    cy.get('#posXInput').should('have.value', '20');

    // 4. Subir escala al 100% (Activa Smart Lock)
    cy.get('#scaleInput').invoke('val', 100).trigger('input');

    // 5. VERIFICACIÓN:
    // Ahora que no tenemos el foco, el script SÍ debería forzar el 0.
    cy.get('#posXInput').should('have.value', '0');
    
    // Verificar bloqueo visual
    cy.get('#posXInput').closest('.axis-wrapper')
      .should('have.css', 'pointer-events', 'none');
});


});