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
it('4. Prueba de Seguridad Móvil (Freno de Mano)', () => {
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

    // --- CORRECCIÓN AQUÍ ---
    // Usamos el comando .blur() ENCADENADO justo después de escribir.
    // Esto simula: Escribir el número y tocar fuera inmediatamente.
    
    cy.get('#width')
      .clear()
      .type('20000')
      .blur(); // <--- Escribimos y nos salimos (dispara el evento change)

    cy.wait(200); // Pequeña pausa para que procese

    cy.get('#height')
      .clear()
      .type('10000')
      .blur(); // <--- Escribimos y nos salimos (dispara el evento change y draw)
    
    // Buscamos la alerta con paciencia
    cy.get('#sizeWarning', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'Mobile Safety');
  });

  it('5. Botón de descarga', () => {
    // Recargamos limpio para evitar residuos del test anterior
    cy.visit('http://127.0.0.1:5500/index.html');
    cy.get('#downloadBtn').click();
  });

});