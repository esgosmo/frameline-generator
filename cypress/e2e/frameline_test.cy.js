describe('Robot de Prueba: Frameline Generator', () => {

  beforeEach(() => {
    cy.visit('http://127.0.0.1:5500/index.html'); 
  });

  it('1. Carga inicial correcta (HD)', () => {
    cy.get('#width').should('have.value', '1920');
  });

  it('2. Cambio de Preset a UHD', () => {
    cy.contains('button', 'UHD').click();
    cy.get('#width').should('have.value', '3840');
  });

  // --- AQUÍ ESTÁ EL ARREGLO DEL TEST 3 ---
  it('3. Cálculo de Aspect Ratio (Crop)', () => {
    
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

  // --- TEST 4 Y 5 BLINDADOS ---
it('4. Prueba de Seguridad Móvil (Límite 6K)', () => {
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

  it('5. Botón de descarga', () => {
    // Recargamos limpio para evitar residuos del test anterior
    cy.visit('http://127.0.0.1:5500/index.html');
    cy.get('#downloadBtn').click();
  });

it('6. El botón Reset restaura los valores por defecto (Versión Blindada)', () => {
    // 0. Limpieza
    cy.visit('http://127.0.0.1:5500/index.html');

    // 1. Ensuciamos el Ancho
    // ROMPEMOS LA CADENA: Hacemos pasos separados para evitar el error "Detached DOM"
    cy.get('#width').clear();
    cy.get('#width').type('3000');
    // Truco Pro: En vez de .blur(), hacemos clic en el cuerpo de la página.
    // Esto fuerza a que se pierda el foco sin depender del elemento input.
    cy.get('body').click(); 

    // 2. FORZAMOS EL MODO CUSTOM
    // Separamos la selección del trigger por seguridad
    cy.get('#aspectSelect').select('custom', { force: true });
    cy.get('#aspectSelect').trigger('change', { force: true });

    // 3. Ensuciamos el Aspecto (Input manual)
    cy.get('#aspect').should('be.visible').clear();
    cy.get('#aspect').type('1.0');
    cy.get('body').click(); // Salimos del input dando clic afuera
    
    // 4. Paneles extra
    cy.get('#secFrameOn').check({ force: true });
    
    // 5. LA HORA DE LA VERDAD: Presionamos Reset
    cy.get('#resetAllBtn').click();

    // 6. Verificaciones
    cy.get('#width').should('have.value', '1920');
    
    // Verifica tu valor default (ajusta el número si es necesario)
    cy.get('#aspect').should('have.value', '2.38695'); 
    
    cy.get('#secFrameControls').should('have.class', 'hidden');
    cy.get('#aspectGroup').should('have.class', 'hidden');
  });

it('7. Carga de imagen (Método Manual Infalible)', () => {
    
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

it('8. Frameline Secundario (Operación Forzada)', () => {
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

it('9. Auto-ajuste de Grosor (Thickness) en alta resolución', () => {
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

it('10. Auto-Grosor debe funcionar TAMBIÉN al cargar imagen', () => {
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

it('11. Accesibilidad: Navegación por Teclado (Sin Mouse)', () => {
    // 1. Visitamos la web
    cy.visit('http://127.0.0.1:5500/index.html');

    // --- A. PRUEBA DE ATRIBUTOS (Verificamos que los ciegos los "vean") ---
    // El botón Reset debe ser navegable
    cy.get('#resetAllBtn')
      .should('have.attr', 'tabindex', '0')
      .and('have.attr', 'role', 'button')
      .and('have.attr', 'aria-label');

    // El botón Quick Frame debe ser navegable
    cy.get('#quickFrameBtn')
      .should('have.attr', 'tabindex', '0')
      .and('have.attr', 'role', 'button');

    // La zona de Upload debe ser navegable
    cy.get('.upload-zone')
      .should('have.attr', 'tabindex', '0')
      .and('have.attr', 'role', 'button');

    // --- B. PRUEBA DE ACCIÓN: RESET CON TECLA ENTER ---
    // 1. Ensuciamos el valor para tener algo que resetear
    cy.get('#width').clear().type('5555').blur();

    // 2. ENFOCAMOS el botón Reset (simula llegar con TAB)
    cy.get('#resetAllBtn').focus();
    
    // 3. PRESIONAMOS ENTER (simula el teclado físico)
    // Nota: Cypress requiere que el elemento tenga foco para recibir el tecleo
    cy.get('#resetAllBtn').type('{enter}');

    // 4. Verificamos: ¿Funcionó el Enter igual que un Clic?
    cy.get('#width').should('have.value', '1920');

    // --- C. PRUEBA DE ACCIÓN: QUICK FRAME CON BARRA ESPACIADORA ---
    // (Probamos Espacio porque tu código acepta Enter O Espacio)
    
    // 1. Verificamos estado inicial
    cy.get('#quickFrameText').should('contain', 'On');

    // 2. Enfocamos y presionamos ESPACIO
    cy.get('#quickFrameBtn').focus().type(' '); 

    // 3. Verificamos cambio
    cy.get('#quickFrameText').should('contain', 'Off');

    // --- D. PRUEBA DE ACCIÓN: REMOVE IMAGE CON ENTER ---
    // 1. Cargamos una imagen primero (usando el fixture que ya tienes)
    cy.get('#imageLoader').selectFile('cypress/fixtures/test_image.jpg', { force: true });
    cy.get('#imageOptionsPanel').should('not.have.class', 'hidden');

    // 2. Buscamos el botón de cerrar (que es un span)
    // Usamos cy.contains para hallarlo por texto, o puedes ponerle un ID si prefieres
    cy.contains('✕ Remove')
      .should('be.visible')
      .focus()
      .type('{enter}'); // ¡ZAS! Teclazo.

    // 3. Verificamos que la imagen se haya ido
    cy.get('#imageOptionsPanel').should('have.class', 'hidden');
  });

});