document.addEventListener('DOMContentLoaded', function () {
    // =============================================
    // CONSTANTES Y CONFIGURACIONES
    // =============================================
    const CATEGORIAS_PREDEFINIDAS = [
        'Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento',
        'Salud', 'Educación', 'Ingresos', 'Otros'
    ];

    const COLORES_CATEGORIAS = [
        '#23145B', '#09456C', '#026F6E', '#1CA39E',
        '#D32F2F', '#FFA000', '#6A0E47', '#B50D57'
    ];

    // =============================================
    // VARIABLES GLOBALES
    // =============================================
    let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
    const modoGuardado = localStorage.getItem('modo');
    const modoOscuro = modoGuardado === 'oscuro';
    const filtrosGuardados = JSON.parse(localStorage.getItem('filtros')) || {};

    // =============================================
    // ELEMENTOS DEL DOM
    // =============================================
    const body = document.body;
    const botonModo = document.getElementById('modo-toggle');
    const formulario = document.querySelector('.form-contacto');
    const tablaTransacciones = document.querySelector('.tabla-transacciones tbody');
    const filtroTipo = document.getElementById('filtro-tipo');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroMes = document.getElementById('filtro-mes');
    const btnEnviar = document.getElementById('enviar-formulario');
    const balanceTotal = document.getElementById('balance-total');//No éxiste
    const ingresosTotal = document.getElementById('ingresos-total');//No éxiste
    const gastosTotal = document.getElementById('gastos-total'); //No éxiste

    //Nuevas variables
    // Configuración de elementos DOM
    const financialElements = {
        sidebar: {
            balance: document.getElementById('balance-sidebar'), //Balance total
            income: document.getElementById('ingresos-sidebar'),//ingreso tatal
            expenses: document.getElementById('gastos-sidebar') //gastos total
        },
        main: {
            balance: document.getElementById('balance-main'),
            income: document.getElementById('ingresos-main'),
            expenses: document.getElementById('gastos-main')
        }
    };


    // =============================================
    // INICIALIZACIÓN
    // =============================================
    if (modoOscuro) body.classList.add('modo-oscuro');
    cargarTransaccionesIniciales();
    cargarOpcionesCategorias();
    aplicarFiltrosGuardados();
    renderizarTransacciones(transacciones);
    actualizarBalance();

    // Configurar botón de modo
    botonModo.textContent = modoOscuro ? '☀️ Modo claro' : '🌙 Modo oscuro';

    // =============================================
    // EVENT LISTENERS
    // =============================================
    botonModo.addEventListener('click', toggleModo);
    formulario.addEventListener('submit', manejarEnvioFormulario);
    filtroTipo.addEventListener('change', filtrarTransacciones);
    filtroCategoria.addEventListener('change', filtrarTransacciones);
    if (filtroMes) filtroMes.addEventListener('change', filtrarTransacciones);
    document.getElementById('exportar-excel').addEventListener('click', exportarAExcel);

    // =============================================
    // FUNCIONES PRINCIPALES
    // =============================================

    /**
     * Alterna entre modo oscuro y claro
     */
    function toggleModo() {
        body.classList.toggle('modo-oscuro');
        const modo = body.classList.contains('modo-oscuro') ? 'oscuro' : 'claro';
        localStorage.setItem('modo', modo);
        botonModo.textContent = modo === 'oscuro' ? '☀️ Modo claro' : '🌙 Modo oscuro';
    }

    /**
     * Maneja el envío del formulario (crear/editar transacción)
     * @param {Event} e - Evento de submit
     */
    function manejarEnvioFormulario(e) {
        e.preventDefault();

        const datos = {
            descripcion: document.getElementById('descripcion').value.trim(),
            monto: parseFloat(document.getElementById('monto').value),
            categoria: document.getElementById('categoria').value,
            tipo: document.querySelector('input[name="tipo"]:checked').value,
            fecha: document.getElementById('fecha').value || new Date().toISOString().split('T')[0]
        };

        if (!validarFormulario(datos)) return;

        const estaEditando = btnEnviar.dataset.editingId;
        estaEditando ? actualizarTransaccion(estaEditando, datos) : crearTransaccion(datos);

        formulario.reset();
    }

    // =============================================
    // FUNCIONES DE TRANSACCIONES (CRUD)
    // =============================================

    /**
     * Crea una nueva transacción
     * @param {Object} datos - Datos de la transacción
     */
    function crearTransaccion(datos) {
        const nuevaTransaccion = {
            id: Date.now(),
            ...datos,
            fecha: formatearFecha(datos.fecha)
        };

        transacciones.push(nuevaTransaccion);
        guardarTransacciones();
        renderizarTransacciones(transacciones);
        mostrarNotificacion(`${datos.tipo === "ingreso" ? "Ingreso" : "Gasto"} registrado`, 'exito');
    }

    /**
     * Actualiza una transacción existente
     * @param {String} id - ID de la transacción
     * @param {Object} nuevosDatos - Nuevos datos para la transacción
     */
    function actualizarTransaccion(id, nuevosDatos) {
        transacciones = transacciones.map(t =>
            t.id === parseInt(id) ? { ...t, ...nuevosDatos, fecha: formatearFecha(nuevosDatos.fecha) } : t
        );

        guardarTransacciones();
        renderizarTransacciones(transacciones);
        btnEnviar.textContent = 'Registrar';
        delete btnEnviar.dataset.editingId;
        mostrarNotificacion('Transacción actualizada', 'exito');
    }

    /**
     * Elimina una transacción
     * @param {Number} id - ID de la transacción a eliminar
     */
    function eliminarTransaccion(id) {
        transacciones = transacciones.filter(t => t.id !== id);
        guardarTransacciones();
        renderizarTransacciones(transacciones);
        mostrarNotificacion('Transacción eliminada', 'exito');
    }

    // =============================================
    // RENDERIZADO Y FILTRADO
    // =============================================

    /**
     * Renderiza las transacciones en la tabla
     * @param {Array} transaccionesAMostrar - Transacciones a mostrar
     */
    function renderizarTransacciones(transaccionesAMostrar) {
        const total = calcularBalanceTotal(transaccionesAMostrar);

        tablaTransacciones.innerHTML = transaccionesAMostrar.length === 0
            ? '<tr><td colspan="6" class="no-transacciones">No hay transacciones</td></tr>'
            : transaccionesAMostrar.map(transaccion => `
                <tr class="${transaccion.tipo}">
                    <td>${transaccion.fecha}</td>
                    <td>${transaccion.descripcion}</td>
                    <td class="${transaccion.tipo}">${transaccion.tipo === 'ingreso' ? '+' : '-'}${formatearMoneda(transaccion.monto)}</td>
                    <td>${transaccion.categoria}</td>
                    <td><span class="badge ${transaccion.tipo}">${transaccion.tipo}</span></td>
                    <td class="acciones">
                        <button class="editar" data-id="${transaccion.id}" aria-label="Editar">✏️</button>
                        <button class="eliminar" data-id="${transaccion.id}" aria-label="Eliminar">🗑️</button>
                    </td>
                </tr>
            `).join('');

        actualizarTotalFooter(total);
        animarFilasTabla();
        actualizarBalance();
        configurarEventListeners();
    }

    /**
     * Filtra transacciones según los criterios seleccionados
     */
    function filtrarTransacciones() {
        const tipo = filtroTipo.value;
        const categoria = filtroCategoria.value;
        const mes = filtroMes ? filtroMes.value : null;

        // Guardar estado de filtros
        const filtros = { tipo, categoria };
        if (mes) filtros.mes = mes;
        localStorage.setItem('filtros', JSON.stringify(filtros));

        let filtradas = transacciones;

        if (tipo !== 'todos') {
            filtradas = filtradas.filter(t => t.tipo === tipo);
        }

        if (categoria !== 'todas') {
            filtradas = filtradas.filter(t => t.categoria === categoria);
        }

        if (mes && mes !== 'todos') {
            filtradas = filtradas.filter(t => {
                const fechaParts = t.fecha.split('/');
                return fechaParts[1] === mes;
            });
        }

        renderizarTransacciones(filtradas);
    }

    // =============================================
    // BALANCE Y CÁLCULOS
    // =============================================

    /**
     * Actualiza los valores del balance (ingresos, gastos y total)
     */
function actualizarBalance() {
    console.log('Ejecutando actualizarBalance...');

    try {
        // 1. Calcular totales
        const ingresos = calcularTotalPorTipo('ingreso');
        const gastos = calcularTotalPorTipo('gasto');
        const balance = ingresos - gastos;

        console.log('Totales calculados:', { ingresos, gastos, balance });

        // 2. Función de formateo mejorada
        const formatearValor = (valor, tipo) => {
            const formato = formatearMoneda(Math.abs(valor));
            switch(tipo) {
                case 'ingreso': return `+$${formato}`;
                case 'gasto': return `-$${formato}`;
                default: return `$${formato}`;
            }
        };

        // 3. Actualización sincronizada de ambos componentes
        const actualizarComponente = (elemento, valor, tipo) => {
            if (!elemento) {
                console.error(`Elemento ${tipo} no encontrado`);
                return;
            }
            
            elemento.textContent = formatearValor(valor, tipo);
            elemento.style.color = tipo === 'gasto' 
                ? 'var(--color-gasto)' 
                : 'var(--color-ingreso)';
        };

        // Sidebar (formato simple)
        actualizarComponente(financialElements.sidebar.balance, balance, 'balance');
        actualizarComponente(financialElements.sidebar.income, ingresos, 'ingreso');
        actualizarComponente(financialElements.sidebar.expenses, gastos, 'gasto');

        // Main (con estilos diferentes)
        actualizarComponente(financialElements.main.balance, balance, 'balance');
        actualizarComponente(financialElements.main.income, ingresos, 'ingreso');
        actualizarComponente(financialElements.main.expenses, gastos, 'gasto');
        
        // Color especial para balance negativo (solo en main)
        if (balance < 0) {
            financialElements.main.balance.style.color = 'var(--color-gasto)';
            financialElements.sidebar.balance.style.color = 'var(--color-gasto)';
        }

        console.log('Actualización completada en ambos componentes');
        actualizarGraficos();
    } catch (error) {
        console.error('Error en actualizarBalance:', error);
    }
}
    // =============================================
    // GRÁFICOS
    // =============================================

    /**
     * Actualiza todos los gráficos
     */
    function actualizarGraficos() {
        actualizarGraficoCategorias();
        actualizarGraficoMensual();
    }

    /**
     * Actualiza el gráfico de categorías
     */
    function actualizarGraficoCategorias() {
        const ctxCategorias = document.getElementById('grafico-categorias')?.getContext('2d');
        if (!ctxCategorias) return;

        const categorias = [...new Set(transacciones.map(t => t.categoria))];
        const datos = categorias.map(cat =>
            transacciones.filter(t => t.categoria === cat)
                .reduce((sum, t) => sum + t.monto, 0)
        );

        if (window.graficoCategorias) window.graficoCategorias.destroy();

        window.graficoCategorias = new Chart(ctxCategorias, {
            type: 'doughnut',
            data: {
                labels: categorias,
                datasets: [{
                    data: datos,
                    backgroundColor: COLORES_CATEGORIAS,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución por Categoría',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${formatearMoneda(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Actualiza el gráfico mensual
     */
    function actualizarGraficoMensual() {
        const ctxMensual = document.getElementById('grafico-mensual')?.getContext('2d');
        if (!ctxMensual) return;

        const meses = Array(12).fill(0).map((_, i) => {
            const date = new Date();
            date.setMonth(i);
            return date.toLocaleString('es-ES', { month: 'short' });
        });

        const ingresosMensuales = Array(12).fill(0);
        const gastosMensuales = Array(12).fill(0);

        transacciones.forEach(t => {
            const fechaParts = t.fecha.split('/');
            const mes = parseInt(fechaParts[1]) - 1;

            if (t.tipo === 'ingreso') {
                ingresosMensuales[mes] += t.monto;
            } else {
                gastosMensuales[mes] += t.monto;
            }
        });

        if (window.graficoMensual) window.graficoMensual.destroy();

        window.graficoMensual = new Chart(ctxMensual, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: ingresosMensuales,
                        backgroundColor: '#1CA39E',
                        borderWidth: 1
                    },
                    {
                        label: 'Gastos',
                        data: gastosMensuales,
                        backgroundColor: '#D32F2F',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Flujo Mensual',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${formatearMoneda(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return formatearMoneda(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // =============================================
    // FUNCIONES DE UTILIDAD
    // =============================================

    /**
     * Formatea una cantidad monetaria
     * @param {Number} monto - Cantidad a formatear
     * @param {Boolean} incluirSigno - Si incluye signo +/-
     * @returns {String} Cantidad formateada
     */

    /*Para darle formato a la moneda*/
    function formatearMoneda(monto) {
        const valor = parseFloat(monto) || 0;

        // Formatear como número en inglés (usa punto decimal)
        const formatted = valor.toLocaleString('en-US', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });

        // Agregar símbolo de dólar manualmente
        return `${formatted}`;
    }

    /**
     * Formatea una fecha ISO a formato local
     * @param {String} fechaISO - Fecha en formato ISO (YYYY-MM-DD)
     * @returns {String} Fecha formateada (DD/MM/YYYY)
     */
    function formatearFecha(fechaISO) {
        const [year, month, day] = fechaISO.split('-');
        return `${day}/${month}/${year}`;
    }

    /**
     * Valida los datos del formulario
     * @param {Object} datos - Datos a validar
     * @returns {Boolean} True si es válido
     */
    function validarFormulario({ descripcion, monto, categoria, tipo }) {
        const errores = [];

        if (!descripcion || descripcion.length < 3) {
            errores.push('La descripción debe tener al menos 3 caracteres');
        }

        if (isNaN(monto) || monto <= 0) {
            errores.push('El monto debe ser un número positivo');
        }

        if (!categoria) {
            errores.push('Debe seleccionar una categoría');
        }

        if (!tipo) {
            errores.push('Debe seleccionar un tipo (ingreso/gasto)');
        }

        if (errores.length > 0) {
            mostrarNotificacion(errores.join('<br>'), 'error');
            return false;
        }

        return true;
    }

    /**
     * Guarda las transacciones en localStorage
     */
    function guardarTransacciones() {
        localStorage.setItem('transacciones', JSON.stringify(transacciones));
    }

    // =============================================
    // FUNCIONES DE INTERFAZ
    // =============================================

    /**
     * Muestra una notificación
     * @param {String} mensaje - Mensaje a mostrar
     * @param {String} tipo - Tipo de notificación (error, exito, info, advertencia)
     */
    function mostrarNotificacion(mensaje, tipo = 'exito') {
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion ${tipo}`;

        const iconos = {
            'error': '❌',
            'advertencia': '⚠️',
            'exito': '✅',
            'info': 'ℹ️'
        };

        notificacion.innerHTML = `
            <div class="notificacion-icono">${iconos[tipo] || iconos.exito}</div>
            <div class="notificacion-contenido">
                <p class="notificacion-mensaje">${mensaje}</p>
            </div>
            <span class="cerrar-notificacion">&times;</span>
        `;

        document.body.appendChild(notificacion);

        // Animación de entrada
        setTimeout(() => {
            notificacion.classList.add('mostrar');
        }, 100);

        // Cerrar al hacer click
        notificacion.querySelector('.cerrar-notificacion').addEventListener('click', () => {
            cerrarNotificacion(notificacion);
        });

        // Auto-cierre
        setTimeout(() => {
            cerrarNotificacion(notificacion);
        }, 5000);
    }

    /**
     * Muestra confirmación antes de eliminar
     * @param {Number} id - ID de la transacción
     */
    function mostrarConfirmacionEliminacion(id) {
        const transaccion = transacciones.find(t => t.id === id);
        if (!transaccion) return;

        const confirmacion = confirm(`¿Eliminar ${transaccion.tipo === 'ingreso' ? 'ingreso' : 'gasto'} de ${formatearMoneda(transaccion.monto)} en ${transaccion.categoria}?`);
        if (confirmacion) {
            eliminarTransaccion(id);
        }
    }

    /**
     * Prepara el formulario para editar una transacción
     * @param {Number} id - ID de la transacción
     */
    function prepararEdicion(id) {
        const transaccion = transacciones.find(t => t.id === id);
        if (!transaccion) return;

        document.getElementById('descripcion').value = transaccion.descripcion;
        document.getElementById('monto').value = transaccion.monto;
        document.getElementById('categoria').value = transaccion.categoria;
        document.querySelector(`input[name="tipo"][value="${transaccion.tipo}"]`).checked = true;

        // Formatear fecha para input type="date"
        const [day, month, year] = transaccion.fecha.split('/');
        document.getElementById('fecha').value = `${year}-${month}-${day}`;

        btnEnviar.textContent = 'Actualizar';
        btnEnviar.dataset.editingId = id;
        document.getElementById('agregar-gasto').scrollIntoView({ behavior: 'smooth' });
    }

    // =============================================
    // FUNCIONES DE INICIALIZACIÓN
    // =============================================

    /**
     * Carga transacciones iniciales si no hay ninguna
     */
    function cargarTransaccionesIniciales() {
        if (transacciones.length === 0) {
            transacciones = [
                {
                    id: 1,
                    descripcion: "Salario",
                    monto: 2000,
                    categoria: "Ingresos",
                    tipo: "ingreso",
                    fecha: "15/05/2023"
                },
                {
                    id: 2,
                    descripcion: "Supermercado",
                    monto: 150.50,
                    categoria: "Alimentación",
                    tipo: "gasto",
                    fecha: "18/05/2023"
                }
            ];
            guardarTransacciones();
        }
    }

    /**
     * Carga las opciones de categorías en los selectores
     */
    function cargarOpcionesCategorias() {
        const categoriasUnicas = [...new Set([
            ...CATEGORIAS_PREDEFINIDAS,
            ...transacciones.map(t => t.categoria)
        ])];

        // Selector del formulario
        const selectCategoria = document.getElementById('categoria');
        selectCategoria.innerHTML = categoriasUnicas.map(cat =>
            `<option value="${cat}">${cat}</option>`
        ).join('');

        // Selector del filtro
        filtroCategoria.innerHTML = '<option value="todas">Todas las categorías</option>' +
            categoriasUnicas.map(cat =>
                `<option value="${cat}">${cat}</option>`
            ).join('');
    }

    /**
     * Aplica los filtros guardados
     */
    function aplicarFiltrosGuardados() {
        if (filtrosGuardados.tipo) filtroTipo.value = filtrosGuardados.tipo;
        if (filtrosGuardados.categoria) filtroCategoria.value = filtrosGuardados.categoria;
        if (filtrosGuardados.mes && filtroMes) filtroMes.value = filtrosGuardados.mes;
    }

    // =============================================
    // FUNCIONES AUXILIARES
    // =============================================

    /**
     * Configura los event listeners para editar/eliminar
     */
    function configurarEventListeners() {
        document.querySelectorAll('.eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                mostrarConfirmacionEliminacion(id);
            });
        });

        document.querySelectorAll('.editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                prepararEdicion(id);
            });
        });
    }

    /**
     * Calcula el total de ingresos o gastos
     * @param {String} tipo - 'ingreso' o 'gasto'
     * @returns {Number} Total calculado
     */

    /*calcularTotalPorTipo*/
    function calcularTotalPorTipo(tipo) {
        console.log(`Calculando total para ${tipo}`);
        const total = transacciones
            .filter(t => t.tipo === tipo)
            .reduce((sum, t) => sum + t.monto, 0);
        console.log(`Total ${tipo}:`, total);
        return total;
    }

    /* Función de formateo mejorada*/

    function formatearMoneda(monto) {
        const valor = parseFloat(monto) || 0;

        // Formatear como número en inglés (usa punto decimal)
        const formatted = valor.toLocaleString('en-US', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });

        // Agregar símbolo de dólar manualmente
        return `${formatted}`;
    }

    /**
     * Calcula el balance total
     * @param {Array} transacciones - Transacciones a calcular
     * @returns {Number} Balance total
     */
    function calcularBalanceTotal(transacciones) {
        return transacciones.reduce((sum, t) => {
            return t.tipo === 'ingreso' ? sum + t.monto : sum - t.monto;
        }, 0);
    }

    /**
     * Actualiza el total en el footer de la tabla
     * @param {Number} total - Total a mostrar
     */
    function actualizarTotalFooter(total) {
        const totalElement = document.getElementById('total-transacciones');
        if (totalElement) {
            const signo = total >= 0 ? '+' : '-';
            totalElement.textContent = `${signo}${formatearMoneda(Math.abs(total))}`;
            totalElement.style.color = total >= 0 ? 'var(--color-ingreso)' : 'var(--color-gasto)';
            totalElement.style.fontWeight = '700';
        }
    }

    /**
     * Aplica animación a las filas de la tabla
     */
    function animarFilasTabla() {
        document.querySelectorAll('.tabla-transacciones tbody tr').forEach((tr, i) => {
            tr.style.opacity = 0;
            tr.style.transform = 'translateY(20px)';
            tr.style.transition = `all 0.3s ease ${i * 0.05}s`;

            setTimeout(() => {
                tr.style.opacity = 1;
                tr.style.transform = 'translateY(0)';
            }, 10);
        });
    }

    /**
     * Exporta las transacciones a CSV (simulando Excel)
     */
    function exportarAExcel() {
        try {
            let csvContent = "Fecha,Descripción,Monto,Categoría,Tipo\n";

            transacciones.forEach(t => {
                csvContent += `"${t.fecha}","${t.descripcion}",${t.monto},"${t.categoria}","${t.tipo}"\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'transacciones.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            mostrarNotificacion("Datos exportados correctamente", "exito");
        } catch (error) {
            mostrarNotificacion("Error al exportar datos", "error");
            console.error("Error al exportar:", error);
        }
    }

    /**
     * Cierra una notificación
     * @param {HTMLElement} notificacion - Elemento de notificación
     */
    function cerrarNotificacion(notificacion) {
        if (notificacion.parentNode) {
            notificacion.classList.remove('mostrar');
            setTimeout(() => {
                notificacion.remove();
            }, 300);
        }
    }
});