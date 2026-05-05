/**
 * i18n - Sistema d'internacionalització
 * 
 * Sistema lleuger per traduccions en català, castellà i anglès
 * - Canvi d'idioma en temps real
 * - Interpolació de variables: t('welcome', {name: 'Joan'})
 * - Plurals simples
 * - 0 dependències externes
 */

class I18n {
    constructor() {
        this.currentLanguage = 'ca';
        this.fallbackLanguage = 'ca';
        this.translations = {};
        
        // Carregar traduccions
        this._loadTranslations();
    }

    /**
     * Carregar totes les traduccions
     */
    _loadTranslations() {
        this.translations = {
            ca: {
                // Menú principal
                'menu.file': 'Arxiu',
                'menu.project': 'Projecte',
                'menu.edit': 'Editar',
                'menu.view': 'Vista',
                'menu.bessons': 'Bessons',
                'menu.connection': 'Connexió',
                'menu.tools': 'Eines',
                'menu.help': 'Ajuda',
                
                // Submenús Arxiu
                'menu.file.new': 'Nou projecte',
                'menu.file.open': 'Obre projecte',
                'menu.file.save': 'Desa projecte',
                'menu.file.export': 'Exporta',
                'menu.file.import': 'Importa',
                
                // Submenús Projecte
                'menu.project': 'Projecte',
                'menu.project.new': 'Nou projecte',
                'menu.project.info': 'Informació del projecte',
                'menu.project.autosave': 'Autodesa',
                'menu.project.export': 'Exporta projecte...',
                'menu.project.import': 'Importa projecte...',
                
                // Submenús Edita
                'menu.edit': 'Edita',
                'menu.edit.copy': 'Copia codi',
                'menu.edit.paste': 'Enganxa',
                'menu.edit.cut': 'Retalla',
                'menu.edit.find': 'Cerca text',
                
                // Submenús Python (abans Scripts)
                'menu.python': 'Python',
                'menu.scripts': 'Python',
                'menu.scripts.run': 'Executa',
                'menu.scripts.stop': 'Atura',
                'menu.scripts.clear': 'Neteja',
                'menu.scripts.examples': 'Exemples',
                'menu.scripts.ai_generator': 'Generador IA',
                'menu.scripts.ai_translator': 'Traductor IA',
                
                // Finestra Generador IA / Traductor IA
                'ai_tools.generator.title': '🤖 Generador IA',
                'ai_tools.translator.title': '🔄 Traductor IA',
                'ai_tools.generator.description_label': 'Descriu el codi que vols generar:',
                'ai_tools.generator.description_placeholder': 'Exemple: Fes un bucle que llegeixi els 8 interruptors de la vèrtebra digital 0x0 costat B i encengui els LEDs del costat A corresponents',
                'ai_tools.translator.code_label': 'Enganxa el codi Python extern a traduir:',
                'ai_tools.translator.code_placeholder': '# Enganxa aquí el teu codi Python (MicroPython, Python estàndard, etc.)',
                'ai_tools.btn_generate_prompt': 'Petició IA',
                'ai_tools.btn_paste_code': 'Enganxa codi del porta-retalls',
                'ai_tools.toast_prompt_ready': '✅ Prompt copiat i descarregat com a .txt',
                'ai_tools.confirm_overwrite': "L'editor ja té codi. Vols sobreescriure'l?",
                'ai_tools.error_validation': 'Error de validació del codi:',
                'ai_tools.error_clipboard': 'Error llegint el porta-retalls:',
                'ai_tools.error_clipboard_empty': 'El porta-retalls és buit',
                'ai_tools.error_no_description': 'Escriu una descripció abans de generar el prompt',
                'ai_tools.error_no_code': 'Enganxa el codi Python abans de generar el prompt',
                'ai_tools.instructions': 'Com fer-ho servir: Clica "Petició IA" per descarregar i copiar el prompt → Porta\'l a ChatGPT/Claude → Copia la resposta → Clica "Enganxa codi del porta-retalls"',
                
                // Submenús Vista
                'menu.view.editor': 'Editor Python',
                'menu.view.twin': 'Bessó Digital',
                'twin.window_title': '🔌 Bessó Digital – IoT-Vertebrae',
                'menu.view.console': 'Consola',
                'menu.view.pyconsole': 'Consola Python',
                'menu.view.canvas': 'Visualitza Canvas (v1)',
                'menu.view.schematic': 'Visualitza Esquemàtic (v2)',
                'menu.view.reset_layout': 'Restaura layout',
                'menu.view.restore_windows': 'Restaura finestres',
                'menu.view.ioconfig': 'Configuració IO',
                'menu.view.bessoioconfig': 'Configuració IO Bessons',
                'menu.view.change_preset': 'Canvia Preset',
                'menu.view.fullscreen': 'Pantalla completa',
                
                // Submenús Bessons
                'menu.bessons.ioconfig': 'Configuració IO Bessons',
                'menu.bessons.active': 'Actius',
                'menu.bessons.available': 'Disponibles',
                
                // Diàlegs Bessons
                'bessons.active.title': 'Bessons Actius',
                'bessons.active.none': 'No hi ha cap bessó actiu',
                'bessons.active.list': 'Bessons carregats actualment:',
                
                'bessons.available.title': 'Bessons Disponibles',
                'bessons.available.none': 'No hi ha bessons disponibles',
                'bessons.available.list': 'Tipus de bessons disponibles al sistema:',
                
                // Submenús Connexió
                'menu.connection.local': 'Mode Local',
                'menu.connection.remote': 'Mode Remot (MQTT)',
                'menu.connection.configure': 'Configura MQTT...',
                'menu.connection.status': 'Estat connexió',
                
                // Submenús Idioma
                'menu.language': '🌐',
                'menu.language.ca': '[ca] Català',
                'menu.language.es': '[es] Castellano',
                'menu.language.en': '[en] English',
                
                // Submenús Ajuda
                'menu.help.docs': 'Documentació',
                'menu.help.examples': 'Exemples',
                'menu.help.shortcuts': 'Dreceres de teclat',
                'menu.help.clear_data': 'Esborra dades locals',
                'menu.help.debug': 'Consola debug',
                'menu.help.about': 'Sobre IoT-Vertebrae',
                'menu.help.overview': 'Visió General',
                'menu.help.overview.window_title': '🗺️ Visió General — Sistema IoT-Vertebrae',
                'overview.save_btn': 'Desa',
                'overview.save_title': 'Desar esquema (sch.png)',
                'overview.save_project': 'Desar al projecte',
                'overview.save_disk': 'Desar a disc',
                'overview.save_both': 'Ambdues',
                'overview.save_cancel': 'Cancel·la',
                'overview.save_msg': "S'ha generat l'arxiu sch.png a partir de la visualització actual. On voleu desar-lo?",
                'overview.saved_project': "✓ sch.png desat al projecte",
                'overview.saved_disk': "✓ sch.png descarregat",
                'overview.saved_both': "✓ sch.png desat al projecte i descarregat",

                // Graphical Editor
                'graphical_editor.window_title': '🔗 Edició Gràfica — Connexions Bessons',
                'graphical_editor.save_btn': 'Desa',
                'graphical_editor.exit_btn': 'Surt',
                'graphical_editor.saved': '✓ Connexions desades al JSON',
                'graphical_editor.unsaved_title': 'Canvis sense desar',
                'graphical_editor.unsaved_msg': 'Hi ha modificacions no desades. Voleu desar abans de sortir?',
                'graphical_editor.save_and_exit': 'Desa i surt',
                'graphical_editor.exit_no_save': 'Surt sense desar',
                'graphical_editor.cancel': 'Cancel·la',
                'graphical_editor.help_text': 'Arrossega blocs • Clic punt → punt per connectar<br>Clic cable per seleccionar • Supr per esborrar<br>Shift+clic per desplaçar • Roda per zoom',
                'menu.help.photo': 'Foto IoT-Vertebrae',
                'menu.help.photo.window_title': '📷 IoT-Vertebrae — Hardware Real',
                'menu.help.quick_guide': 'Guia Ràpida',
                'menu.help.custom_twins': 'Com Fer Bessons Personalitzats',
                
                // Finestra d'exemples
                'examples.window_title': '📚 Exemples de Projectes',
                'examples.empty': 'No hi ha exemples disponibles',
                'examples.loading': 'Carregant exemples...',
                'examples.open_btn': 'Obre',
                'examples.cancel_btn': 'Cancel·la',
                'examples.load_error': 'Error carregant l\'exemple',
                
                // Dialog Informació Projecte
                'dialog.project_info.title': 'Informació del Projecte',
                'dialog.project_info.title_new': 'Informació del Nou Projecte',
                'dialog.project_info.name': 'Nom del projecte',
                'dialog.project_info.name_required': 'Nom del projecte *',
                'dialog.project_info.version': 'Versió',
                'dialog.project_info.author': 'Autor',
                'dialog.project_info.description': 'Descripció',
                'dialog.project_info.cancel': 'Cancel·la',
                'dialog.project_info.export': 'Exporta',
                'dialog.project_info.create': 'Crea',
                'dialog.project_info.save': 'Desa',
                
                // Dialog Nou Projecte
                'dialog.new_project.title': 'Nou Projecte',
                'dialog.new_project.warning': 'Això netejarà:',
                'dialog.new_project.clear_iotv': 'Configuració IoT-Vertebrae',
                'dialog.new_project.clear_others': 'Configuració Altres Bessons',
                'dialog.new_project.clear_python': 'Codi Python',
                'dialog.new_project.clear_history': 'Historial PLCMemory',
                'dialog.new_project.confirm': 'Voleu continuar?',
                'dialog.new_project.continue': 'Continua',
                
                // Dialog Exportar
                'dialog.export.validating': 'Validant configuracions...',
                'dialog.export.error_name_empty': 'El nom del projecte no pot estar buit',
                'dialog.export.error_iotv_invalid': 'Configuració IoT-Vertebrae invàlida',
                'dialog.export.error_others_invalid': 'Configuració Altres Bessons invàlida',
                'dialog.export.warning_python_empty': '⚠️ El codi Python està buit',
                'dialog.export.generating': 'Generant fitxers...',
                'dialog.export.compressing': 'Comprimint...',
                'dialog.export.success': '✅ Projecte exportat:',
                
                // Dialog Importar
                'dialog.import.title': 'Importa Projecte',
                'dialog.import.select_file': 'Selecciona un fitxer .zip',
                'dialog.import.project_label': 'Projecte:',
                'dialog.import.version_label': 'Versió:',
                'dialog.import.author_label': 'Autor:',
                'dialog.import.date_label': 'Data:',
                'dialog.import.content_label': 'Contingut:',
                'dialog.import.iotv_section': 'IoT-Vertebrae (Bessó Digital):',
                'dialog.import.vertebra_digital': 'vèrtebra digital',
                'dialog.import.vertebra_analog': 'vèrtebra analògica',
                'dialog.import.vertebrae_digital': 'vèrtebres digitals',
                'dialog.import.vertebrae_analog': 'vèrtebres analògiques',
                'dialog.import.rib_outputs': 'sortides',
                'dialog.import.rib_inputs': 'entrades',
                'dialog.import.rib_a': 'Costella A:',
                'dialog.import.rib_b': 'Costella B:',
                'dialog.import.others_section': 'Altres Bessons:',
                'dialog.import.python_section': 'Script Python:',
                'dialog.import.lines_of_code': 'línies de codi',
                'dialog.import.empty': 'buit',
                'dialog.import.overwrite_warning': 'Això sobreescriurà el projecte actual. Vols continuar?',
                'dialog.import.version_warning': 'Projecte fet amb IoT-Vertebrae v{version}. Versió actual: v2.0',
                'dialog.import.import_button': 'Importa',
                'dialog.import.loading': 'Carregant projecte...',
                'dialog.import.success': '✅ Projecte importat:',
                'dialog.import.error_invalid_zip': 'El fitxer no és un arxiu .zip vàlid',
                'dialog.import.error_no_project_json': 'El fitxer .zip no conté project.json',
                'dialog.import.error_invalid_project_json': 'El fitxer project.json és invàlid',
                'dialog.import.error_no_iotv_config': 'El fitxer .zip no conté iotv_config.json',
                'dialog.import.error_invalid_iotv_config': 'El fitxer iotv_config.json és invàlid',
                'dialog.import.url_loading': '⏳ Descarregant {filename}...',
                'dialog.import.url_source_warning': 'S\'importarà des d\'un servidor extern ({host}). Això sobreescriurà el projecte actual.',
                'dialog.import.url_error': '❌ Error important des d\'URL',
                'dialog.import.url_invalid': '❌ L\'adreça URL del hash no és vàlida',
                'dialog.import.url_not_zip': '❌ L\'adreça URL ha de ser un fitxer .zip',
                
                // Toasts
                'toast.autosave_saved': '✓ Projecte desat',
                'toast.autosave_enabled': 'Autodesa activat',
                'toast.autosave_disabled': 'Autodesa desactivat',
                'toast.project_created': 'Nou projecte creat:',
                'toast.project_info_saved': 'Informació del projecte desada',
                
                // Dialog Sobre
                'dialog.about.title': 'Sobre IoT-Vertebrae',
                'dialog.clear_data.title': 'Esborrar dades locals',
                'dialog.clear_data.message': 'S\'esborraran totes les dades desades (projecte, configuració, idioma). La pàgina es recarregarà com si fos el primer cop. Vols continuar?',
                'dialog.clear_data.cancel': 'Cancel·la',
                'dialog.clear_data.confirm': 'Esborra i recarrega',
                'dialog.about.version': 'Versió:',
                'dialog.about.description': 'Simulador educatiu d\'IoT',
                
                // Finestres
                'window.editor': 'Editor Python',
                'window.controls': 'Controls',
                'window.console': 'Consola',
                'window.pyconsole': 'Consola Python',
                'window.scripts': 'Scripts',
                'window.examples': 'Exemples',
                'window.mqtt': 'Monitor MQTT',

                // Menú Finestra
                'menu.window': 'Finestra',
                'menu.window.bring_front': 'Porta al davant',
                'menu.window.minimize_all': 'Minimitza-ho tot',
                'menu.window.restore_all': 'Restaura-ho tot',
                'menu.window.no_windows': '(cap finestra oberta)',
                
                // Python Console
                'pyconsole.run': '▶️ Executa Consola',
                'pyconsole.stop': '⏹️ Atura Consola',
                
                // Controls
                'controls.zoom_in': 'Zoom +',
                'controls.zoom_out': 'Zoom -',
                'controls.reset_view': 'Reset Vista',
                'controls.help': 'Ajuda',
                'controls.reset_system': 'Reset Sistema',
                'controls.export_json': 'Exportar JSON',
                'controls.import_json': 'Importar JSON',
                
                // Editor
                'editor.run': 'Executa',
                'editor.stop': 'Atura',
                'editor.run_f5': '▶️ Executa (F5)',
                'editor.stop_label': '⏹️ Atura',
                'editor.validate': '✔️ Valida',
                'editor.validate_ok': '✅ Codi correcte, sense errors de sintaxi.',
                'editor.validate_error': '❌ Error de validació:',
                'editor.runtime_error_line': '❌ Error a la línia {line}: {message}',
                'editor.runtime_error_no_line': '❌ Error: {message}',
                'editor.clear': 'Netejar',
                'editor.save': 'Guardar',
                'editor.load': 'Carregar',
                'editor.output': 'Sortida:',
                'editor.placeholder': '# Escriu el teu codi Python aquí',
                'editor.select_example': '-- Tria un exemple --',
                // Categories d'exemples
                'editor.cat.basics': 'Bàsics',
                'editor.cat.digital': 'Digital',
                'editor.cat.analog': 'Analògic',
                'editor.cat.advanced': 'Avançat',
                'editor.cat.conveyorBelt': 'Cinta Transportadora',
                'editor.cat.pontH': 'Pont H',
                'editor.cat.mqtt': 'MQTT',
                // Noms d'exemples - Bàsics
                'editor.ex.hello-world': 'Hola Món',
                'editor.ex.variables': 'Variables i tipus',
                'editor.ex.loops': 'Bucles',
                // Noms d'exemples - Digital
                'editor.ex.led-blink': 'LED parpellejant',
                'editor.ex.sequence': 'Seqüència de LEDs',
                'editor.ex.binary-counter': 'Comptador binari',
                'editor.ex.button-led': 'Botó → Freqüència LED',
                // Noms d'exemples - Analògic
                'editor.ex.read-sensor': 'Llegir sensor analògic',
                'editor.ex.voltage-output': 'Generar voltatge',
                'editor.ex.sine-wave': 'Ona sinusoidal',
                // Noms d'exemples - Avançat
                'editor.ex.traffic-light': 'Semàfor',
                'editor.ex.pwm-simulation': 'Efecte fade amb PWM',
                'editor.ex.thermostat': 'Termòstat simple',
                // Noms d'exemples - Cinta
                'editor.ex.conveyor-basic': 'Cinta bàsica',
                'editor.ex.conveyor-sensor': 'Cinta amb sensors',
                'editor.ex.conveyor-sort': 'Classificador de caixes',
                'editor.ex.conveyor-pingpong': 'Ping-pong amb emergència',
                'editor.ex.conveyor-adc-dac': 'Mapejat velocitat ADC-DAC',
                'editor.ex.conveyor-spawn': 'Descàrrega múltiple de caixes',
                'editor.ex.conveyor-complete': 'Sistema complet amb seguretat',
                // Noms d'exemples - Pont H
                'editor.ex.ponth-basic': 'Test bàsic de motors',
                'editor.ex.ponth-alternate': 'Motors alternats',
                // Noms d'exemples - MQTT
                'editor.ex.mqtt-publisher': '📡 MQTT Publisher - Switches',
                'editor.ex.mqtt-subscriber': '📡 MQTT Subscriber - Control LEDs',
                'editor.ex.mqtt-sensor': '📡 MQTT Sensor - Telemetria',
                
                // Bessons
                'besso.pont_h.title': 'Pont H amb Relés',
                'besso.pont_h.description': 'Control de motor DC bidireccional amb 4 relés i sensors capacitius',
                'besso.led_tricolor.title': 'LED Tricolor NPN/PNP',
                'besso.led_tricolor.description': 'Sistema de LED RGB amb commutació NPN/PNP',
                'besso.cinta.title': 'Cinta Transportadora',
                'besso.cinta.description': 'Simulació de cinta transportadora amb motor i sensors',
                'besso.semafor.title': 'Semàfor',
                'besso.semafor.description': 'Semàfor intel·ligent de 4 vies amb detecció de vehicles',
                
                // MQTT
                'mqtt.connecting': 'Connectant...',
                'mqtt.connected': 'Connectat',
                'mqtt.disconnected': 'Desconnectat',
                'mqtt.error': 'Error de connexió',
                'mqtt.broker': 'Broker',
                'mqtt.port': 'Port',
                'mqtt.username': 'Usuari',
                'mqtt.password': 'Contrasenya',
                'mqtt.room_code': 'Codi de sala',
                'mqtt.your_name': 'El teu nom',
                
                // Diàlegs
                'dialog.config_besso': 'Configuració: {name}',
                'dialog.mapping': 'Mapatge d\'entrades/sortides',
                'dialog.restore_default': 'Restaurar per defecte',
                'dialog.accept': 'Acceptar',
                'dialog.cancel': 'Cancel·lar',
                'dialog.close': 'Tancar',
                
                // Missatges
                'msg.vertebra_added': 'Vèrtebra {addr} afegida',
                'msg.vertebra_removed': 'Vèrtebra {addr} eliminada',
                'msg.besso_loaded': 'Bessó "{name}" carregat',
                'msg.besso_unloaded': 'Bessó tancat',
                'msg.project_saved': 'Projecte guardat',
                'msg.project_loaded': 'Projecte carregat',
                'msg.config_exported': 'Configuració exportada',
                'msg.config_imported': 'Configuració importada',
                'msg.mqtt_connected': 'Connectat a {broker}',
                'msg.mqtt_disconnected': 'Desconnectat de MQTT',
                
                // Errors
                'error.besso_load': 'Error carregant el bessó',
                'error.mqtt_connect': 'Error connectant a MQTT',
                'error.invalid_address': 'Adreça invàlida',
                'error.no_io_available': 'No hi ha prou I/O disponible',
                
                // Components
                'component.relay': 'Relé',
                'component.sensor': 'Sensor',
                'component.motor': 'Motor',
                'component.led': 'LED',
                'component.switch': 'Interruptor',
                'component.solenoid': 'Solenoide',
                
                // Estats
                'state.on': 'Activat',
                'state.off': 'Desactivat',
                'state.running': 'Executant',
                'state.stopped': 'Aturat',
                'state.error': 'Error',
                
                // Unitats
                'unit.voltage': 'V',
                'unit.current': 'mA',
                'unit.rpm': 'RPM',
                
                // Besso Config Editor - Finestra
                'bce.window_title': '⚙️ Configuració IO Bessons',
                
                // Besso Config Editor - Pestanyes
                'bce.tab.digital': '🖥️ Bessó Digital',
                'bce.tab.twins': '🔧 Configura Bessons',
                'bce.tab.physical': '🔌 Connexió Bessons',
                
                // Besso Config Editor - Pestanya Configura Bessons
                'bce.twins.title': 'Configura Bessons (twins_config.json)',
                'bce.twins.description': 'Defineix els tipus de bessons reutilitzables. Cada definició s\'identifica per twinId.',
                'bce.twins.label': 'Catàleg de Bessons (JSON):',
                'bce.twins.validate_btn': '🔍 Valida Configuració',
                
                // Besso Config Editor - Pestanya Connexió Bessons
                'bce.physical.title': 'Connexió Bessons',
                'bce.physical.description': 'Edita el JSON per definir les connexions IO dels bessons (pont-h, cinta, twin).',
                'bce.physical.label': 'Configuració JSON:',
                'bce.physical.autoload': '☑ Carregar automàticament tots els bessons després d\'aplicar canvis',
                'bce.physical.validate_btn': '🔍 Valida Connexió',
                
                // Besso Config Editor - Botons globals
                'bce.validate_all_btn': '🔍 VALIDA TOT (Digital + Configuració + Connexió + Coherència)',
                'bce.apply_btn': '✅ APLICA CANVIS',
                
                // Besso Config Editor - Validació twins
                'bce.twins.err_not_array': 'Ha de ser un array JSON',
                'bce.twins.err_missing_twinid': 'Entrada {index}: falta camp "twinId"',
                'bce.twins.err_duplicate_twinid': 'Entrada {index}: twinId "{twinId}" duplicat',
                'bce.twins.warn_missing_name': 'Entrada {index} ({twinId}): falta meta.name',
                'bce.twins.err_missing_components': 'Entrada {index} ({twinId}): falta components o està buit',
                'bce.twins.err_component_no_id': 'Component {compIndex} de "{twinId}": falta id',
                'bce.twins.err_component_invalid_type': 'Component {compIndex} de "{twinId}": type invàlid "{compType}" (vàlids: {validTypes})',
                'bce.twins.err_component_no_binding': 'Component {compIndex} de "{twinId}": falta binding (fromPLC o toPLC)',
                'bce.twins.valid_count': '✅ JSON vàlid: {count} bessó(ns) definit(s)',
                'bce.twins.err_invalid_json': '❌ JSON invàlid: {message}',
                
                // Besso Config Editor - Validació general
                'bce.errors_label': 'Errors:',
                'bce.warnings_label': '⚠️ Warnings:',
                'bce.warnings_label_short': '⚠️ Avisos:',
                'bce.config_valid': '✅ Configuració vàlida',
                'bce.config_invalid': '❌ Configuració invàlida',
                
                // Besso Config Editor - Resultats validació completa
                'bce.results.window_title': '📊 Resultats de Validació Completa',
                'bce.results.all_valid': '✅ Validació Completa: CORRECTA',
                'bce.results.has_errors': '❌ Validació Completa: ERRORS DETECTATS',
                'bce.results.section_digital': '1️⃣ Bessó Digital (Preset)',
                'bce.results.section_twins': '2️⃣ Configura Bessons',
                'bce.results.section_physical': '3️⃣ Connexió Bessons',
                'bce.results.section_coherence': '4️⃣ Coherència (Altres ↔ Digital)',
                'bce.results.no_conflicts': '✅ No s\'han detectat conflictes',
                'bce.results.has_conflicts': '❌ S\'han detectat conflictes',
                'bce.results.errors_label': '🚫 ERRORS:',
                'bce.results.warnings_label': '⚠️ WARNINGS:',
                'bce.results.conflict_summary': '📊 Resum de Conflictes:',
                'bce.results.total_conflicts': 'Total: {total} conflictes detectats',
                'bce.results.error_count': 'Errors: {count}',
                'bce.results.warning_count': 'Warnings: {count}',
                'bce.coherence.cannot_validate': 'No es pot validar coherència: hi ha errors al bessó digital o a la connexió de bessons',
                
                // Besso Config Editor - Aplicar canvis
                'bce.apply.preset_invalid': '❌ Error: preset digital invàlid',
                'bce.apply.preset_errors': '❌ Preset digital invàlid:',
                'bce.apply.preset_load_error': '❌ Error carregant preset digital',
                'bce.apply.preset_updated': '✅ Preset digital actualitzat i canvas refrescat.',
                'bce.apply.loading_twins': '🔄 Carregant {count} bessons...',
                'bce.apply.twins_loaded': '✅ Bessons carregats: {active}/{total}',
                'bce.apply.error': '❌ Error al aplicar canvis',
                'bce.apply.error_generic': '❌ Error: {message}',
                
                // Besso Config Editor - Diàleg confirmació
                'bce.confirm.reload_warning': '⚠️ Això recarregarà tots els altres bessons.',
                'bce.confirm.state_loss': 'Es perdran estats actuals (posicions, caixes, etc.).',
                'bce.confirm.digital_modified': '🖥️ IMPORTANT: El preset del bessó digital s\'ha modificat.',
                'bce.confirm.digital_reopen': 'Hauràs de tancar i reobrir el bessó digital per aplicar els canvis.',
                'bce.confirm.warnings_detected': 'S\'han detectat els següents warnings:',
                'bce.confirm.autoload_count': '✓ Es carregaran automàticament {count} bessons després d\'aplicar.',
                'bce.confirm.continue': 'Vols continuar?',
                
                // Besso Config Editor - Pestanya Bessó Digital
                'bce.digital.preset_label': 'Preset de Bessó Digital:',
                'bce.digital.description': '💡 Modifica el preset per ajustar la configuració del bessó digital (vèrtebres i costelles).',
                'bce.digital.json_label': 'Configuració JSON:',
                'bce.digital.validate_btn': '🔍 Valida Configuració',
                'bce.digital.confirm_unsaved': '⚠️ Hi ha canvis no desats al preset actual.\n\nSi canvieu de preset, es perdran aquests canvis.\n\nVoleu continuar?',
                
                // Besso Config Editor - Editor Visual de Preset Digital
                'bce.digital.editor_btn': '✏️ Edita',
                'bce.digital.editor.window_title': '✏️ Editor — Bessó Digital',
                'bce.digital.editor.json_warning': 'El JSON actual és invàlid. El formulari s\'ha obert buit.',
                'bce.digital.editor.name': 'Nom',
                'bce.digital.editor.description': 'Descripció',
                'bce.digital.editor.version': 'Versió',
                'bce.digital.editor.vertebrae_title': 'Vèrtebres',
                'bce.digital.editor.add_vertebra': 'Afegeix vèrtebra',
                'bce.digital.editor.remove_vertebra': 'Elimina vèrtebra',
                'bce.digital.editor.apply': '✅ Aplica',
                'bce.digital.editor.cancel': 'Cancel·la',
                
                // Besso Config Editor - Editor visual Configura Bessons
                'bce.twins.editor_btn': '✏️ Edita',
                'bce.twins.editor.window_title': '✏️ Editor — Configura Bessons',
                'bce.twins.editor.json_warning': 'El JSON actual és invàlid. El formulari s\'ha obert buit.',
                'bce.twins.editor.add_twin': 'Afegeix Bessó',
                'bce.twins.editor.remove_twin': 'Elimina bessó',
                'bce.twins.editor.unnamed': '(sense nom)',
                'bce.twins.editor.empty_hint': 'Cap bessó definit. Premeu "+ Afegeix Bessó" per començar.',
                'bce.twins.editor.select_hint': 'Seleccioneu un bessó de la llista.',
                'bce.twins.editor.components_title': 'Components',
                'bce.twins.editor.add_component': 'Afegeix Component',
                'bce.twins.editor.remove_component': 'Elimina component',
                'bce.twins.editor.optional': 'opcional',
                'bce.twins.editor.overlay_enabled': 'Activat',
                'bce.twins.editor.overlay_src_hint': 'fitxer.html',
                'bce.twins.editor.upload_asset': 'Pujar fitxer asset (html/png/jpg)',
                'bce.twins.editor.upload_btn': 'Puja',
                'bce.twins.editor.paste_html': 'Enganxa HTML del porta-retalls',
                'bce.twins.editor.ai_prompt': 'Petició IA (prompt)',
                'bce.twins.editor.ai_prompt_window_title': '🤖 Generador de Prompt — Overlay IA',
                'bce.twins.editor.ai_prompt_description': 'Descriu l\'overlay que vols generar:',
                'bce.twins.editor.ai_prompt_placeholder': 'Exemple: Visualització d\'un motor amb animació de rotació, LEDs d\'estat i indicador de direcció...',
                'bce.twins.editor.ai_prompt_generate': '🤖 Genera Prompt',
                'bce.twins.editor.ai_prompt_copied': '✅ Prompt copiat al porta-retalls i descarregat com prompt.txt',
                'bce.twins.editor.ai_prompt_copy_fail': '⚠️ No s\'ha pogut copiar. El fitxer prompt.txt s\'ha descarregat.',
                'bce.twins.editor.ai_prompt_no_desc': '⚠️ Escriu una descripció de l\'overlay.',
                'bce.twins.editor.ai_prompt_guide_warning': '⚠️ No s\'ha pogut carregar OVERLAY_PROMPT_GUIDE.md — el prompt serà més bàsic.',
                'bce.twins.editor.ai_prompt_intro': 'Genera un fitxer HTML per a un overlay de bessó digital IoT-Vertebrae.',
                'bce.twins.editor.ai_prompt_config_section': 'CONFIGURACIÓ DEL BESSÓ:',
                'bce.twins.editor.ai_prompt_signals_section': 'SENYALS DISPONIBLES:',
                'bce.twins.editor.ai_prompt_user_section': 'DESCRIPCIÓ DE L\'USUARI:',
                'bce.twins.editor.ai_prompt_format_note': 'Genera NOMÉS el codi HTML intern (sense <!DOCTYPE>, <html>, <head> ni <body>). L\'HTML s\'inserirà dins un iframe sandboxed.',
                'bce.twins.editor.paste_html_success': '✅ HTML enganxat correctament',
                'bce.twins.editor.paste_html_empty': '⚠️ El porta-retalls és buit o no conté text.',
                'bce.twins.editor.paste_html_error': '⚠️ No s\'ha pogut accedir al porta-retalls.',
                'bce.twins.editor.paste_html_confirm_name': 'Nom del fitxer overlay:',
                'bce.twins.editor.paste_html_no_twinid': '⚠️ Defineix primer el twinId del bessó.',
                'bce.twins.editor.apply': '✅ Aplica',
                'bce.twins.editor.cancel': 'Cancel·la',
                'bce.twins.editor.photo_enabled': 'Activat',
                'bce.twins.editor.photo_label': 'Fotografia',
                'bce.twins.editor.photo_upload_btn': 'Puja',
                'bce.twins.editor.photo_delete_btn': 'Esborra',
                'bce.twins.editor.photo_current': 'Imatge actual:',
                'bce.twins.editor.photo_none': 'Cap imatge pujada.',
                'bce.twins.editor.photo_uploaded': '✅ Fotografia pujada: {name}',
                'bce.twins.editor.photo_deleted': '✅ Fotografia esborrada.',
                'bce.twins.editor.photo_no_file': '⚠️ No hi ha cap fotografia per esborrar.',
                'bce.twins.preview_btn': '👁️ Vista Prèvia',
                'bce.twins.preview.window_title': 'Vista prèvia — {name}',
                'bce.twins.preview.no_twins': '⚠️ No hi ha bessons per previsualitzar.',
                'bce.twins.preview.select_twin': 'Selecciona un bessó per previsualitzar:',
                'twin.photo_checkbox': 'Fotografia',
                
                // Besso Config Editor - Editor visual Connexió Bessons
                'bce.physical.schematic_btn': 'Esquema Connexió',
                'bce.physical.graphical_editor_btn': '🔗 Edició Gràfica',
                'bce.physical.schematic_title': '📐 Esquema — {projectName}',
                'bce.physical.schematic_no_image': 'Aquest projecte no inclou un esquema de connexió.',
                'bce.physical.schematic_alt': 'Esquema de connexió del projecte',
                'bce.physical.editor_btn': '✏️ Edita',
                'bce.physical.editor.window_title': '✏️ Editor — Connexió Bessons',
                'bce.physical.editor.json_warning': 'El JSON actual és invàlid. El formulari s\'ha obert buit.',
                'bce.physical.editor.static_section': 'Entrades estàtiques (només editable al JSON)',
                'bce.physical.editor.static_badge': 'no editable',
                'bce.physical.editor.twin_section': 'Instàncies Twin',
                'bce.physical.editor.add_instance': 'Afegeix Instància',
                'bce.physical.editor.remove_instance': 'Elimina instància',
                'bce.physical.editor.name_placeholder': 'nom-instancia',
                'bce.physical.editor.select_twin': '— selecciona twinId —',
                'bce.physical.editor.empty_hint': 'Cap instància twin definida. Premeu \"+ Afegeix Instància\" per començar.',
                'bce.physical.editor.select_hint': 'Seleccioneu una instància de la llista.',
                'bce.physical.editor.unnamed': '(sense nom)',
                'bce.physical.editor.signals_title': 'Senyals IO',
                'bce.physical.editor.signal': 'senyal',
                'bce.physical.editor.label_override': 'etiqueta',
                'bce.physical.editor.label_override_hint': 'personalitza (opcional)',
                'bce.physical.editor.dir': 'direcció',
                'bce.physical.editor.type': 'tipus',
                'bce.physical.editor.vertebra': 'vèrtebra',
                'bce.physical.editor.rib': 'costella',
                'bce.physical.editor.add_signal': 'Afegeix',
                'bce.physical.editor.remove_signal': 'Elimina senyal',
                'bce.physical.editor.no_signals': 'Cap senyal definit. Useu ⚡ Auto-map o + Afegeix.',
                'bce.physical.editor.auto_map': 'Auto-map',
                'bce.physical.editor.auto_map_hint': 'Genera senyals automàticament des del catàleg de twins',
                'bce.physical.editor.apply': '✅ Aplica',
                'bce.physical.editor.cancel': 'Cancel·la',
                
                // Besso Config Editor - Visor JSON
                'bce.viewer_btn': '👁️ Visor',
                'bce.viewer.window_title_digital': '👁️ Visor — Bessó Digital',
                'bce.viewer.window_title_twins': '👁️ Visor — Configura Bessons',
                'bce.viewer.window_title_physical': '👁️ Visor — Connexió Bessons',
                'bce.viewer.invalid_json': 'JSON invàlid — corregiu el JSON i torneu a provar.',
                'bce.viewer.render_error': 'Error renderitzant el JSON.',
                
                // Besso Config Editor - Diàleg exportació
                'bce.export.window_title': '💾 Exportar Configuracions',
                'bce.export.question': 'Vols exportar les configuracions abans de tancar?',
                'bce.export.basename_label': 'Nom base dels arxius:',
                'bce.export.basename_hint': 'Es generaran: <code style="color: #3498db;">&lt;nom&gt;_others.json</code> i <code style="color: #3498db;">&lt;nom&gt;_iotv.json</code>',
                'bce.export.discard': 'Descartar',
                'bce.export.cancel': 'Cancel·lar',
                'bce.export.confirm': '💾 Exportar',
                
                // TwinIO - Importar/Exportar bessons
                'twinio.import_btn': '📥 Importa Bessó',
                'twinio.export_btn': '📤 Exporta Bessó',
                'twinio.cancel': 'Cancel·la',
                'twinio.export.title': '📤 Exporta Bessons',
                'twinio.export.description': 'Selecciona els bessons a exportar i edita els noms dels fitxers:',
                'twinio.export.package_name': 'Nom del paquet (múltiples bessons):',
                'twinio.export.confirm': '📤 Exporta',
                'twinio.export.no_twins': 'No hi ha bessons per exportar',
                'twinio.export.none_selected': 'No s\'ha seleccionat cap bessó',
                'twinio.export.success': '✅ Bessons exportats correctament',
                'twinio.export.error': '❌ Error exportant',
                'twinio.import.title': '📥 Importa Bessons',
                'twinio.import.description': 'Selecciona els bessons a importar i edita els identificadors:',
                'twinio.import.confirm': '📥 Importa',
                'twinio.import.conflict': 'ja existeix',
                'twinio.import.overwrite': 'Sobreescriure',
                'twinio.import.keep_existing': 'Mantenir existent',
                'twinio.import.no_twins_found': 'No s\'han trobat bessons als fitxers seleccionats',
                'twinio.import.invalid_file': 'Fitxer no vàlid: {name}',
                'twinio.import.success': '✅ {count} bessó(ns) importat(s) correctament',
                'twinio.import.error': '❌ Error importantant',
                
                // WebSerial
                'serial.not_supported': 'Web Serial API no disponible. Utilitzeu Chrome, Edge o Opera.',
                'serial.port_opened': 'Port sèrie obert',
                'serial.port_closed': 'Port sèrie tancat',
                'serial.no_port_selected': 'No s\'ha seleccionat cap port',
                'serial.port_in_use': 'Aquest port ja està en ús per un altre script ({owner}). Seleccioneu un port diferent.',
            },
            
            es: {
                // Menú principal
                'menu.file': 'Archivo',
                'menu.project': 'Proyecto',
                'menu.edit': 'Editar',
                'menu.view': 'Vista',
                'menu.bessons': 'Gemelos',
                'menu.connection': 'Conexión',
                'menu.tools': 'Herramientas',
                'menu.help': 'Ayuda',
                
                // Submenús Archivo
                'menu.file.new': 'Nuevo proyecto',
                'menu.file.open': 'Abrir proyecto',
                'menu.file.save': 'Guardar proyecto',
                'menu.file.export': 'Exportar',
                'menu.file.import': 'Importar',
                
                // Submenús Proyecto
                'menu.project': 'Proyecto',
                'menu.project.new': 'Nuevo proyecto',
                'menu.project.info': 'Información del proyecto',
                'menu.project.autosave': 'Autoguardar',
                'menu.project.export': 'Exportar proyecto...',
                'menu.project.import': 'Importar proyecto...',
                
                // Submenús Editar
                'menu.edit': 'Editar',
                'menu.edit.copy': 'Copiar código',
                'menu.edit.paste': 'Pegar',
                'menu.edit.cut': 'Cortar',
                'menu.edit.find': 'Buscar texto',
                
                // Submenús Python (antes Scripts)
                'menu.python': 'Python',
                'menu.scripts': 'Python',
                'menu.scripts.run': 'Ejecutar',
                'menu.scripts.stop': 'Detener',
                'menu.scripts.clear': 'Limpiar',
                'menu.scripts.examples': 'Ejemplos',
                'menu.scripts.ai_generator': 'Generador IA',
                'menu.scripts.ai_translator': 'Traductor IA',
                
                // Finestra Generador IA / Traductor IA
                'ai_tools.generator.title': '🤖 Generador IA',
                'ai_tools.translator.title': '🔄 Traductor IA',
                'ai_tools.generator.description_label': 'Describe el código que quieres generar:',
                'ai_tools.generator.description_placeholder': 'Ejemplo: Haz un bucle que lea los 8 interruptores de la vértebra digital 0x0 lado B y encienda los LEDs del lado A correspondientes',
                'ai_tools.translator.code_label': 'Pega el código Python externo a traducir:',
                'ai_tools.translator.code_placeholder': '# Pega aquí tu código Python (MicroPython, Python estándar, etc.)',
                'ai_tools.btn_generate_prompt': 'Petición IA',
                'ai_tools.btn_paste_code': 'Pegar código del portapapeles',
                'ai_tools.toast_prompt_ready': '✅ Prompt copiado y descargado como .txt',
                'ai_tools.confirm_overwrite': 'El editor ya tiene código. ¿Quieres sobreescribirlo?',
                'ai_tools.error_validation': 'Error de validación del código:',
                'ai_tools.error_clipboard': 'Error leyendo el portapapeles:',
                'ai_tools.error_clipboard_empty': 'El portapapeles está vacío',
                'ai_tools.error_no_description': 'Escribe una descripción antes de generar el prompt',
                'ai_tools.error_no_code': 'Pega el código Python antes de generar el prompt',
                'ai_tools.instructions': 'Cómo usarlo: Clica "Petición IA" para descargar y copiar el prompt → Llévalo a ChatGPT/Claude → Copia la respuesta → Clica "Pegar código del portapapeles"',
                
                // Submenús Vista
                'menu.view.editor': 'Editor Python',
                'menu.view.twin': 'Gemelo Digital',
                'twin.window_title': '🔌 Gemelo Digital – IoT-Vertebrae',
                'menu.view.console': 'Consola',
                'menu.view.pyconsole': 'Consola Python',
                'menu.view.canvas': 'Visualizar Canvas (v1)',
                'menu.view.schematic': 'Visualizar Esquemático (v2)',
                'menu.view.reset_layout': 'Restaurar diseño',
                'menu.view.restore_windows': 'Restaurar ventanas',
                'menu.view.ioconfig': 'Configuración IO',
                'menu.view.bessoioconfig': 'Configuración IO Gemelos',
                'menu.view.change_preset': 'Cambiar Preset',
                'menu.view.fullscreen': 'Pantalla completa',
                
                // Submenús Gemelos
                'menu.bessons.ioconfig': 'Configuración IO Gemelos',
                'menu.bessons.active': 'Activos',
                'menu.bessons.available': 'Disponibles',
                
                // Diálogos Gemelos
                'bessons.active.title': 'Gemelos Activos',
                'bessons.active.none': 'No hay ningún gemelo activo',
                'bessons.active.list': 'Gemelos cargados actualmente:',
                
                'bessons.available.title': 'Gemelos Disponibles',
                'bessons.available.none': 'No hay gemelos disponibles',
                'bessons.available.list': 'Tipos de gemelos disponibles en el sistema:',
                
                // Submenús Conexión
                'menu.connection.local': 'Modo Local',
                'menu.connection.remote': 'Modo Remoto (MQTT)',
                'menu.connection.configure': 'Configurar MQTT...',
                'menu.connection.status': 'Estado de conexión',
                
                // Submenús Idioma
                'menu.language': '🌐',
                'menu.language.ca': '[ca] Català',
                'menu.language.es': '[es] Castellano',
                'menu.language.en': '[en] English',
                
                // Submenús Ayuda
                'menu.help.docs': 'Documentación',
                'menu.help.examples': 'Ejemplos',
                'menu.help.shortcuts': 'Atajos de teclado',
                'menu.help.clear_data': 'Borrar datos locales',
                'menu.help.debug': 'Consola de depuración',
                'menu.help.about': 'Acerca de IoT-Vertebrae',
                'menu.help.overview': 'Visión General',
                'menu.help.overview.window_title': '🗺️ Visión General — Sistema IoT-Vertebrae',
                'overview.save_btn': 'Guardar',
                'overview.save_title': 'Guardar esquema (sch.png)',
                'overview.save_project': 'Guardar en el proyecto',
                'overview.save_disk': 'Guardar a disco',
                'overview.save_both': 'Ambas',
                'overview.save_cancel': 'Cancelar',
                'overview.save_msg': 'Se ha generado el archivo sch.png a partir de la visualización actual. ¿Dónde desea guardarlo?',
                'overview.saved_project': '✓ sch.png guardado en el proyecto',
                'overview.saved_disk': '✓ sch.png descargado',
                'overview.saved_both': '✓ sch.png guardado en el proyecto y descargado',
                'menu.help.photo': 'Foto IoT-Vertebrae',
                'menu.help.photo.window_title': '📷 IoT-Vertebrae — Hardware Real',
                'examples.window_title': '📚 Ejemplos de Proyectos',
                'examples.empty': 'No hay ejemplos disponibles',
                'examples.loading': 'Cargando ejemplos...',
                'examples.open_btn': 'Abrir',
                'examples.cancel_btn': 'Cancelar',
                'examples.load_error': 'Error cargando el ejemplo',
                
                // Submenús Vista
                'menu.view.editor': 'Editor Python',
                'menu.view.controls': 'Controles',
                'menu.view.besso': 'Gemelo físico',
                'menu.view.mqtt': 'Monitor MQTT',
                'menu.view.fullscreen': 'Pantalla completa',
                
                // Submenús Gemelos
                'menu.bessons.load': 'Cargar gemelo...',
                'menu.bessons.close': 'Cerrar gemelo activo',
                
                // Submenús Conexión
                'menu.connection.local': 'Local (misma página)',
                'menu.connection.remote': 'Remoto (MQTT)',
                'menu.connection.configure': 'Configurar MQTT...',
                'menu.connection.status': 'Estado',
                
                // Submenús Ayuda
                'menu.help.docs': 'Documentación',
                'menu.help.examples': 'Ejemplos',
                'menu.help.shortcuts': 'Atajos de teclado',
                'menu.help.clear_data': 'Borrar datos locales',
                'menu.help.about': 'Acerca de IoT-Vertebrae',
                'menu.help.overview': 'Visión General',
                'menu.help.overview.window_title': '🗺️ Visión General — Sistema IoT-Vertebrae',
                'overview.save_btn': 'Guardar',
                'overview.save_title': 'Guardar esquema (sch.png)',
                'overview.save_project': 'Guardar en el proyecto',
                'overview.save_disk': 'Guardar a disco',
                'overview.save_both': 'Ambas',
                'overview.save_cancel': 'Cancelar',
                'overview.save_msg': 'Se ha generado el archivo sch.png a partir de la visualización actual. ¿Dónde desea guardarlo?',
                'overview.saved_project': '✓ sch.png guardado en el proyecto',
                'overview.saved_disk': '✓ sch.png descargado',
                'overview.saved_both': '✓ sch.png guardado en el proyecto y descargado',
                'menu.help.quick_guide': 'Guía Rápida',

                // Graphical Editor
                'graphical_editor.window_title': '🔗 Edición Gráfica — Conexiones Gemelos',
                'graphical_editor.save_btn': 'Guardar',
                'graphical_editor.exit_btn': 'Salir',
                'graphical_editor.saved': '✓ Conexiones guardadas en el JSON',
                'graphical_editor.unsaved_title': 'Cambios sin guardar',
                'graphical_editor.unsaved_msg': 'Hay modificaciones no guardadas. ¿Desea guardar antes de salir?',
                'graphical_editor.save_and_exit': 'Guardar y salir',
                'graphical_editor.exit_no_save': 'Salir sin guardar',
                'graphical_editor.cancel': 'Cancelar',
                'graphical_editor.help_text': 'Arrastra bloques • Clic punto → punto para conectar<br>Clic cable para seleccionar • Supr para borrar<br>Shift+clic para desplazar • Rueda para zoom',
                'menu.help.custom_twins': 'Cómo Hacer Gemelos Personalizados',
                
                // Dialog Información Proyecto
                'dialog.project_info.title': 'Información del Proyecto',
                'dialog.project_info.title_new': 'Información del Nuevo Proyecto',
                'dialog.project_info.name': 'Nombre del proyecto',
                'dialog.project_info.name_required': 'Nombre del proyecto *',
                'dialog.project_info.version': 'Versión',
                'dialog.project_info.author': 'Autor',
                'dialog.project_info.description': 'Descripción',
                'dialog.project_info.cancel': 'Cancelar',
                'dialog.project_info.export': 'Exportar',
                'dialog.project_info.create': 'Crear',
                'dialog.project_info.save': 'Guardar',
                
                // Dialog Nuevo Proyecto
                'dialog.new_project.title': 'Nuevo Proyecto',
                'dialog.new_project.warning': 'Esto limpiará:',
                'dialog.new_project.clear_iotv': 'Configuración IoT-Vertebrae',
                'dialog.new_project.clear_others': 'Configuración Otros Gemelos',
                'dialog.new_project.clear_python': 'Código Python',
                'dialog.new_project.clear_history': 'Historial PLCMemory',
                'dialog.new_project.confirm': '¿Quiere continuar?',
                'dialog.new_project.continue': 'Continuar',
                
                // Dialog Exportar
                'dialog.export.validating': 'Validando configuraciones...',
                'dialog.export.error_name_empty': 'El nombre del proyecto no puede estar vacío',
                'dialog.export.error_iotv_invalid': 'Configuración IoT-Vertebrae inválida',
                'dialog.export.error_others_invalid': 'Configuración Otros Gemelos inválida',
                'dialog.export.warning_python_empty': '⚠️ El código Python está vacío',
                'dialog.export.generating': 'Generando archivos...',
                'dialog.export.compressing': 'Comprimiendo...',
                'dialog.export.success': '✅ Proyecto exportado:',
                
                // Dialog Importar
                'dialog.import.title': 'Importar Proyecto',
                'dialog.import.select_file': 'Selecciona un archivo .zip',
                'dialog.import.project_label': 'Proyecto:',
                'dialog.import.version_label': 'Versión:',
                'dialog.import.author_label': 'Autor:',
                'dialog.import.date_label': 'Fecha:',
                'dialog.import.content_label': 'Contenido:',
                'dialog.import.iotv_section': 'IoT-Vertebrae (Gemelo Digital):',
                'dialog.import.vertebra_digital': 'vértebra digital',
                'dialog.import.vertebra_analog': 'vértebra analógica',
                'dialog.import.vertebrae_digital': 'vértebras digitales',
                'dialog.import.vertebrae_analog': 'vértebras analógicas',
                'dialog.import.rib_outputs': 'salidas',
                'dialog.import.rib_inputs': 'entradas',
                'dialog.import.rib_a': 'Costilla A:',
                'dialog.import.rib_b': 'Costilla B:',
                'dialog.import.others_section': 'Otros Gemelos:',
                'dialog.import.python_section': 'Script Python:',
                'dialog.import.lines_of_code': 'líneas de código',
                'dialog.import.empty': 'vacío',
                'dialog.import.overwrite_warning': 'Esto sobrescribirá el proyecto actual. ¿Quieres continuar?',
                'dialog.import.version_warning': 'Este proyecto se creó con IoT-Vertebrae v{version}. Versión actual: v2.0',
                'dialog.import.import_button': 'Importar',
                'dialog.import.loading': 'Cargando proyecto...',
                'dialog.import.success': '✅ Proyecto importado:',
                'dialog.import.error_invalid_zip': 'El archivo no es un .zip válido',
                'dialog.import.error_no_project_json': 'El archivo .zip no contiene project.json',
                'dialog.import.error_invalid_project_json': 'El archivo project.json es inválido',
                'dialog.import.error_no_iotv_config': 'El archivo .zip no contiene iotv_config.json',
                'dialog.import.error_invalid_iotv_config': 'El archivo iotv_config.json es inválido',
                'dialog.import.url_loading': '⏳ Descargando {filename}...',
                'dialog.import.url_source_warning': 'Se importará desde un servidor externo ({host}). Esto sobrescribirá el proyecto actual.',
                'dialog.import.url_error': '❌ Error importando desde URL',
                'dialog.import.url_invalid': '❌ La dirección URL del hash no es válida',
                'dialog.import.url_not_zip': '❌ La dirección URL debe ser un archivo .zip',
                
                // Toasts
                'toast.autosave_saved': '✓ Proyecto guardado',
                'toast.autosave_enabled': 'Autoguardar activado',
                'toast.autosave_disabled': 'Autoguardar desactivado',
                'toast.project_created': 'Nuevo proyecto creado:',
                'toast.project_info_saved': 'Información del proyecto guardada',
                
                // Dialog Sobre
                'dialog.about.title': 'Acerca de IoT-Vertebrae',
                'dialog.clear_data.title': 'Borrar datos locales',
                'dialog.clear_data.message': 'Se borrarán todos los datos guardados (proyecto, configuración, idioma). La página se recargará como si fuera la primera vez. ¿Quieres continuar?',
                'dialog.clear_data.cancel': 'Cancelar',
                'dialog.clear_data.confirm': 'Borrar y recargar',
                'dialog.about.version': 'Versión:',
                'dialog.about.description': 'Simulador educativo de IoT',
                
                // Finestres
                'window.editor': 'Editor Python',
                'window.controls': 'Controles',
                'window.console': 'Consola',
                'window.pyconsole': 'Consola Python',
                'window.scripts': 'Scripts',
                'window.examples': 'Ejemplos',
                'window.mqtt': 'Monitor MQTT',

                // Menú Ventana
                'menu.window': 'Ventana',
                'menu.window.bring_front': 'Traer al frente',
                'menu.window.minimize_all': 'Minimizar todo',
                'menu.window.restore_all': 'Restaurar todo',
                'menu.window.no_windows': '(ninguna ventana abierta)',
                
                // Python Console
                'pyconsole.run': '▶️ Ejecutar Consola',
                'pyconsole.stop': '⏹️ Detener Consola',
                
                // Controles
                'controls.zoom_in': 'Zoom +',
                'controls.zoom_out': 'Zoom -',
                'controls.reset_view': 'Reiniciar Vista',
                'controls.help': 'Ayuda',
                'controls.reset_system': 'Reiniciar Sistema',
                'controls.export_json': 'Exportar JSON',
                'controls.import_json': 'Importar JSON',
                
                // Editor
                'editor.run': 'Ejecutar',
                'editor.stop': 'Detener',
                'editor.run_f5': '▶️ Ejecutar (F5)',
                'editor.stop_label': '⏹️ Detener',
                'editor.validate': '✔️ Validar',
                'editor.validate_ok': '✅ Código correcto, sin errores de sintaxis.',
                'editor.validate_error': '❌ Error de validación:',
                'editor.runtime_error_line': '❌ Error en la línea {line}: {message}',
                'editor.runtime_error_no_line': '❌ Error: {message}',
                'editor.clear': 'Limpiar',
                'editor.save': 'Guardar',
                'editor.load': 'Cargar',
                'editor.output': 'Salida:',
                'editor.placeholder': '# Escribe tu código Python aquí',
                'editor.select_example': '-- Elegir un ejemplo --',
                // Categorías de ejemplos
                'editor.cat.basics': 'Básicos',
                'editor.cat.digital': 'Digital',
                'editor.cat.analog': 'Analógico',
                'editor.cat.advanced': 'Avanzado',
                'editor.cat.conveyorBelt': 'Cinta Transportadora',
                'editor.cat.pontH': 'Puente H',
                'editor.cat.mqtt': 'MQTT',
                // Nombres de ejemplos - Básicos
                'editor.ex.hello-world': 'Hola Mundo',
                'editor.ex.variables': 'Variables y tipos',
                'editor.ex.loops': 'Bucles',
                // Nombres de ejemplos - Digital
                'editor.ex.led-blink': 'LED parpadeante',
                'editor.ex.sequence': 'Secuencia de LEDs',
                'editor.ex.binary-counter': 'Contador binario',
                'editor.ex.button-led': 'Botón → Frecuencia LED',
                // Nombres de ejemplos - Analógico
                'editor.ex.read-sensor': 'Leer sensor analógico',
                'editor.ex.voltage-output': 'Generar voltaje',
                'editor.ex.sine-wave': 'Onda sinusoidal',
                // Nombres de ejemplos - Avanzado
                'editor.ex.traffic-light': 'Semáforo',
                'editor.ex.pwm-simulation': 'Efecto fade con PWM',
                'editor.ex.thermostat': 'Termostato simple',
                // Nombres de ejemplos - Cinta
                'editor.ex.conveyor-basic': 'Cinta básica',
                'editor.ex.conveyor-sensor': 'Cinta con sensores',
                'editor.ex.conveyor-sort': 'Clasificador de cajas',
                'editor.ex.conveyor-pingpong': 'Ping-pong con emergencia',
                'editor.ex.conveyor-adc-dac': 'Mapeo velocidad ADC-DAC',
                'editor.ex.conveyor-spawn': 'Descarga múltiple de cajas',
                'editor.ex.conveyor-complete': 'Sistema completo con seguridad',
                // Nombres de ejemplos - Puente H
                'editor.ex.ponth-basic': 'Test básico de motores',
                'editor.ex.ponth-alternate': 'Motores alternados',
                // Nombres de ejemplos - MQTT
                'editor.ex.mqtt-publisher': '📡 MQTT Publisher - Switches',
                'editor.ex.mqtt-subscriber': '📡 MQTT Subscriber - Control LEDs',
                'editor.ex.mqtt-sensor': '📡 MQTT Sensor - Telemetría',
                
                // Gemelos
                'besso.pont_h.title': 'Puente H con Relés',
                'besso.pont_h.description': 'Control de motor DC bidireccional con 4 relés y sensores capacitivos',
                'besso.led_tricolor.title': 'LED Tricolor NPN/PNP',
                'besso.led_tricolor.description': 'Sistema de LED RGB con conmutación NPN/PNP',
                'besso.cinta.title': 'Cinta Transportadora',
                'besso.cinta.description': 'Simulación de cinta transportadora con motor y sensores',
                'besso.semafor.title': 'Semáforo',
                'besso.semafor.description': 'Semáforo inteligente de 4 vías con detección de vehículos',
                
                // MQTT
                'mqtt.connecting': 'Conectando...',
                'mqtt.connected': 'Conectado',
                'mqtt.disconnected': 'Desconectado',
                'mqtt.error': 'Error de conexión',
                'mqtt.broker': 'Broker',
                'mqtt.port': 'Puerto',
                'mqtt.username': 'Usuario',
                'mqtt.password': 'Contraseña',
                'mqtt.room_code': 'Código de sala',
                'mqtt.your_name': 'Tu nombre',
                
                // Diálogos
                'dialog.config_besso': 'Configuración: {name}',
                'dialog.mapping': 'Mapeo de entradas/salidas',
                'dialog.restore_default': 'Restaurar por defecto',
                'dialog.accept': 'Aceptar',
                'dialog.cancel': 'Cancelar',
                'dialog.close': 'Cerrar',
                
                // Mensajes
                'msg.vertebra_added': 'Vértebra {addr} añadida',
                'msg.vertebra_removed': 'Vértebra {addr} eliminada',
                'msg.besso_loaded': 'Gemelo "{name}" cargado',
                'msg.besso_unloaded': 'Gemelo cerrado',
                'msg.project_saved': 'Proyecto guardado',
                'msg.project_loaded': 'Proyecto cargado',
                'msg.config_exported': 'Configuración exportada',
                'msg.config_imported': 'Configuración importada',
                'msg.mqtt_connected': 'Conectado a {broker}',
                'msg.mqtt_disconnected': 'Desconectado de MQTT',
                
                // Errores
                'error.besso_load': 'Error cargando el gemelo',
                'error.mqtt_connect': 'Error conectando a MQTT',
                'error.invalid_address': 'Dirección inválida',
                'error.no_io_available': 'No hay suficiente I/O disponible',
                
                // Componentes
                'component.relay': 'Relé',
                'component.sensor': 'Sensor',
                'component.motor': 'Motor',
                'component.led': 'LED',
                'component.switch': 'Interruptor',
                'component.solenoid': 'Solenoide',
                
                // Estados
                'state.on': 'Activado',
                'state.off': 'Desactivado',
                'state.running': 'Ejecutando',
                'state.stopped': 'Detenido',
                'state.error': 'Error',
                
                // Unidades
                'unit.voltage': 'V',
                'unit.current': 'mA',
                'unit.rpm': 'RPM',
                
                // Besso Config Editor - Ventana
                'bce.window_title': '⚙️ Configuración IO Gemelos',
                
                // Besso Config Editor - Pestañas
                'bce.tab.digital': '🖥️ Gemelo Digital',
                'bce.tab.twins': '🔧 Configurar Gemelos',
                'bce.tab.physical': '🔌 Conexión Gemelos',
                
                // Besso Config Editor - Pestaña Configurar Gemelos
                'bce.twins.title': 'Configurar Gemelos (twins_config.json)',
                'bce.twins.description': 'Define los tipos de gemelos reutilizables. Cada definición se identifica por twinId.',
                'bce.twins.label': 'Catálogo de Gemelos (JSON):',
                'bce.twins.validate_btn': '🔍 Validar Configuración',
                
                // Besso Config Editor - Pestaña Conexión Gemelos
                'bce.physical.title': 'Conexión Gemelos',
                'bce.physical.description': 'Edita el JSON para definir las conexiones IO de los gemelos (puente-h, cinta, twin).',
                'bce.physical.label': 'Configuración JSON:',
                'bce.physical.autoload': '☑ Cargar automáticamente todos los gemelos después de aplicar cambios',
                'bce.physical.validate_btn': '🔍 Validar Conexión',
                
                // Besso Config Editor - Botones globales
                'bce.validate_all_btn': '🔍 VALIDAR TODO (Digital + Configuración + Conexión + Coherencia)',
                'bce.apply_btn': '✅ APLICAR CAMBIOS',
                
                // Besso Config Editor - Validación twins
                'bce.twins.err_not_array': 'Debe ser un array JSON',
                'bce.twins.err_missing_twinid': 'Entrada {index}: falta campo "twinId"',
                'bce.twins.err_duplicate_twinid': 'Entrada {index}: twinId "{twinId}" duplicado',
                'bce.twins.warn_missing_name': 'Entrada {index} ({twinId}): falta meta.name',
                'bce.twins.err_missing_components': 'Entrada {index} ({twinId}): falta components o está vacío',
                'bce.twins.err_component_no_id': 'Componente {compIndex} de "{twinId}": falta id',
                'bce.twins.err_component_invalid_type': 'Componente {compIndex} de "{twinId}": type inválido "{compType}" (válidos: {validTypes})',
                'bce.twins.err_component_no_binding': 'Componente {compIndex} de "{twinId}": falta binding (fromPLC o toPLC)',
                'bce.twins.valid_count': '✅ JSON válido: {count} gemelo(s) definido(s)',
                'bce.twins.err_invalid_json': '❌ JSON inválido: {message}',
                
                // Besso Config Editor - Validación general
                'bce.errors_label': 'Errores:',
                'bce.warnings_label': '⚠️ Warnings:',
                'bce.warnings_label_short': '⚠️ Avisos:',
                'bce.config_valid': '✅ Configuración válida',
                'bce.config_invalid': '❌ Configuración inválida',
                
                // Besso Config Editor - Resultados validación completa
                'bce.results.window_title': '📊 Resultados de Validación Completa',
                'bce.results.all_valid': '✅ Validación Completa: CORRECTA',
                'bce.results.has_errors': '❌ Validación Completa: ERRORES DETECTADOS',
                'bce.results.section_digital': '1️⃣ Gemelo Digital (Preset)',
                'bce.results.section_twins': '2️⃣ Configurar Gemelos',
                'bce.results.section_physical': '3️⃣ Conexión Gemelos',
                'bce.results.section_coherence': '4️⃣ Coherencia (Otros ↔ Digital)',
                'bce.results.no_conflicts': '✅ No se han detectado conflictos',
                'bce.results.has_conflicts': '❌ Se han detectado conflictos',
                'bce.results.errors_label': '🚫 ERRORES:',
                'bce.results.warnings_label': '⚠️ WARNINGS:',
                'bce.results.conflict_summary': '📊 Resumen de Conflictos:',
                'bce.results.total_conflicts': 'Total: {total} conflictos detectados',
                'bce.results.error_count': 'Errores: {count}',
                'bce.results.warning_count': 'Warnings: {count}',
                'bce.coherence.cannot_validate': 'No se puede validar coherencia: hay errores en el gemelo digital o en la conexión de gemelos',
                
                // Besso Config Editor - Aplicar cambios
                'bce.apply.preset_invalid': '❌ Error: preset digital inválido',
                'bce.apply.preset_errors': '❌ Preset digital inválido:',
                'bce.apply.preset_load_error': '❌ Error cargando preset digital',
                'bce.apply.preset_updated': '✅ Preset digital actualizado y canvas refrescado.',
                'bce.apply.loading_twins': '🔄 Cargando {count} gemelos...',
                'bce.apply.twins_loaded': '✅ Gemelos cargados: {active}/{total}',
                'bce.apply.error': '❌ Error al aplicar cambios',
                'bce.apply.error_generic': '❌ Error: {message}',
                
                // Besso Config Editor - Diálogo confirmación
                'bce.confirm.reload_warning': '⚠️ Esto recargará todos los otros gemelos.',
                'bce.confirm.state_loss': 'Se perderán estados actuales (posiciones, cajas, etc.).',
                'bce.confirm.digital_modified': '🖥️ IMPORTANTE: El preset del gemelo digital se ha modificado.',
                'bce.confirm.digital_reopen': 'Tendrás que cerrar y reabrir el gemelo digital para aplicar los cambios.',
                'bce.confirm.warnings_detected': 'Se han detectado los siguientes warnings:',
                'bce.confirm.autoload_count': '✓ Se cargarán automáticamente {count} gemelos después de aplicar.',
                'bce.confirm.continue': '¿Quieres continuar?',
                
                // Besso Config Editor - Pestaña Gemelo Digital
                'bce.digital.preset_label': 'Preset de Gemelo Digital:',
                'bce.digital.description': '💡 Modifica el preset para ajustar la configuración del gemelo digital (vértebras y costillas).',
                'bce.digital.json_label': 'Configuración JSON:',
                'bce.digital.validate_btn': '🔍 Validar Configuración',
                'bce.digital.confirm_unsaved': '⚠️ Hay cambios no guardados en el preset actual.\n\nSi cambia de preset, se perderán estos cambios.\n\n¿Quiere continuar?',
                
                // Besso Config Editor - Editor Visual de Preset Digital
                'bce.digital.editor_btn': '✏️ Editar',
                'bce.digital.editor.window_title': '✏️ Editor — Gemelo Digital',
                'bce.digital.editor.json_warning': 'El JSON actual es inválido. El formulario se ha abierto vacío.',
                'bce.digital.editor.name': 'Nombre',
                'bce.digital.editor.description': 'Descripción',
                'bce.digital.editor.version': 'Versión',
                'bce.digital.editor.vertebrae_title': 'Vértebras',
                'bce.digital.editor.add_vertebra': 'Añadir vértebra',
                'bce.digital.editor.remove_vertebra': 'Eliminar vértebra',
                'bce.digital.editor.apply': '✅ Aplicar',
                'bce.digital.editor.cancel': 'Cancelar',
                
                // Besso Config Editor - Editor visual Configurar Gemelos
                'bce.twins.editor_btn': '✏️ Editar',
                'bce.twins.editor.window_title': '✏️ Editor — Configurar Gemelos',
                'bce.twins.editor.json_warning': 'El JSON actual es inválido. El formulario se ha abierto vacío.',
                'bce.twins.editor.add_twin': 'Añadir Gemelo',
                'bce.twins.editor.remove_twin': 'Eliminar gemelo',
                'bce.twins.editor.unnamed': '(sin nombre)',
                'bce.twins.editor.empty_hint': 'Ningún gemelo definido. Pulse "+ Añadir Gemelo" para empezar.',
                'bce.twins.editor.select_hint': 'Seleccione un gemelo de la lista.',
                'bce.twins.editor.components_title': 'Componentes',
                'bce.twins.editor.add_component': 'Añadir Componente',
                'bce.twins.editor.remove_component': 'Eliminar componente',
                'bce.twins.editor.optional': 'opcional',
                'bce.twins.editor.overlay_enabled': 'Activado',
                'bce.twins.editor.overlay_src_hint': 'archivo.html',
                'bce.twins.editor.upload_asset': 'Subir archivo asset (html/png/jpg)',
                'bce.twins.editor.upload_btn': 'Subir',
                'bce.twins.editor.paste_html': 'Pegar HTML del portapapeles',
                'bce.twins.editor.ai_prompt': 'Prompt IA',
                'bce.twins.editor.ai_prompt_window_title': '🤖 Generador de Prompt — Overlay IA',
                'bce.twins.editor.ai_prompt_description': 'Describe el overlay que quieres generar:',
                'bce.twins.editor.ai_prompt_placeholder': 'Ejemplo: Visualización de un motor con animación de rotación, LEDs de estado e indicador de dirección...',
                'bce.twins.editor.ai_prompt_generate': '🤖 Generar Prompt',
                'bce.twins.editor.ai_prompt_copied': '✅ Prompt copiado al portapapeles y descargado como prompt.txt',
                'bce.twins.editor.ai_prompt_copy_fail': '⚠️ No se pudo copiar. El archivo prompt.txt se ha descargado.',
                'bce.twins.editor.ai_prompt_no_desc': '⚠️ Escribe una descripción del overlay.',
                'bce.twins.editor.ai_prompt_guide_warning': '⚠️ No se pudo cargar OVERLAY_PROMPT_GUIDE.md — el prompt será más básico.',
                'bce.twins.editor.ai_prompt_intro': 'Genera un archivo HTML para un overlay de gemelo digital IoT-Vertebrae.',
                'bce.twins.editor.ai_prompt_config_section': 'CONFIGURACIÓN DEL GEMELO:',
                'bce.twins.editor.ai_prompt_signals_section': 'SEÑALES DISPONIBLES:',
                'bce.twins.editor.ai_prompt_user_section': 'DESCRIPCIÓN DEL USUARIO:',
                'bce.twins.editor.ai_prompt_format_note': 'Genera SOLO el código HTML interno (sin <!DOCTYPE>, <html>, <head> ni <body>). El HTML se insertará dentro de un iframe sandboxed.',
                'bce.twins.editor.paste_html_success': '✅ HTML pegado correctamente',
                'bce.twins.editor.paste_html_empty': '⚠️ El portapapeles está vacío o no contiene texto.',
                'bce.twins.editor.paste_html_error': '⚠️ No se pudo acceder al portapapeles.',
                'bce.twins.editor.paste_html_confirm_name': 'Nombre del archivo overlay:',
                'bce.twins.editor.paste_html_no_twinid': '⚠️ Define primero el twinId del gemelo.',
                'bce.twins.editor.apply': '✅ Aplicar',
                'bce.twins.editor.cancel': 'Cancelar',
                'bce.twins.editor.photo_enabled': 'Activado',
                'bce.twins.editor.photo_label': 'Fotografía',
                'bce.twins.editor.photo_upload_btn': 'Subir',
                'bce.twins.editor.photo_delete_btn': 'Borrar',
                'bce.twins.editor.photo_current': 'Imagen actual:',
                'bce.twins.editor.photo_none': 'Ninguna imagen subida.',
                'bce.twins.editor.photo_uploaded': '✅ Fotografía subida: {name}',
                'bce.twins.editor.photo_deleted': '✅ Fotografía borrada.',
                'bce.twins.editor.photo_no_file': '⚠️ No hay ninguna fotografía para borrar.',
                'bce.twins.preview_btn': '👁️ Vista Previa',
                'bce.twins.preview.window_title': 'Vista previa — {name}',
                'bce.twins.preview.no_twins': '⚠️ No hay gemelos para previsualizar.',
                'bce.twins.preview.select_twin': 'Selecciona un gemelo para previsualizar:',
                'twin.photo_checkbox': 'Fotografía',
                
                // Besso Config Editor - Editor visual Conexión Gemelos
                'bce.physical.schematic_btn': 'Esquema Conexión',
                'bce.physical.graphical_editor_btn': '🔗 Edición Gráfica',
                'bce.physical.schematic_title': '📐 Esquema — {projectName}',
                'bce.physical.schematic_no_image': 'Este proyecto no incluye un esquema de conexión.',
                'bce.physical.schematic_alt': 'Esquema de conexión del proyecto',
                'bce.physical.editor_btn': '✏️ Editar',
                'bce.physical.editor.window_title': '✏️ Editor — Conexión Gemelos',
                'bce.physical.editor.json_warning': 'El JSON actual es inválido. El formulario se ha abierto vacío.',
                'bce.physical.editor.static_section': 'Entradas estáticas (solo editable en el JSON)',
                'bce.physical.editor.static_badge': 'no editable',
                'bce.physical.editor.twin_section': 'Instancias Twin',
                'bce.physical.editor.add_instance': 'Añadir Instancia',
                'bce.physical.editor.remove_instance': 'Eliminar instancia',
                'bce.physical.editor.name_placeholder': 'nombre-instancia',
                'bce.physical.editor.select_twin': '— seleccionar twinId —',
                'bce.physical.editor.empty_hint': 'Ninguna instancia twin definida. Pulse \"+ Añadir Instancia\" para empezar.',
                'bce.physical.editor.select_hint': 'Seleccione una instancia de la lista.',
                'bce.physical.editor.unnamed': '(sin nombre)',
                'bce.physical.editor.signals_title': 'Señales IO',
                'bce.physical.editor.signal': 'señal',
                'bce.physical.editor.label_override': 'etiqueta',
                'bce.physical.editor.label_override_hint': 'personalizar (opcional)',
                'bce.physical.editor.dir': 'dirección',
                'bce.physical.editor.type': 'tipo',
                'bce.physical.editor.vertebra': 'vértebra',
                'bce.physical.editor.rib': 'costilla',
                'bce.physical.editor.add_signal': 'Añadir',
                'bce.physical.editor.remove_signal': 'Eliminar señal',
                'bce.physical.editor.no_signals': 'Sin señales. Use ⚡ Auto-map o + Añadir.',
                'bce.physical.editor.auto_map': 'Auto-map',
                'bce.physical.editor.auto_map_hint': 'Genera señales automáticamente desde el catálogo de twins',
                'bce.physical.editor.apply': '✅ Aplicar',
                'bce.physical.editor.cancel': 'Cancelar',
                'bce.viewer.window_title_physical': '👁️ Visor — Conexión Gemelos',
                'bce.viewer.window_title_digital': '👁️ Visor — Gemelo Digital',
                'bce.viewer.window_title_twins': '👁️ Visor — Configurar Gemelos',
                'bce.viewer.invalid_json': 'JSON inválido — corrija el JSON e inténtelo de nuevo.',
                'bce.viewer.render_error': 'Error renderizando el JSON.',
                
                // Besso Config Editor - Diálogo exportación
                'bce.export.window_title': '💾 Exportar Configuraciones',
                'bce.export.question': '¿Quieres exportar las configuraciones antes de cerrar?',
                'bce.export.basename_label': 'Nombre base de los archivos:',
                'bce.export.basename_hint': 'Se generarán: <code style="color: #3498db;">&lt;nombre&gt;_others.json</code> y <code style="color: #3498db;">&lt;nombre&gt;_iotv.json</code>',
                'bce.export.discard': 'Descartar',
                'bce.export.cancel': 'Cancelar',
                'bce.export.confirm': '💾 Exportar',
                
                // TwinIO - Importar/Exportar gemelos
                'twinio.import_btn': '📥 Importar Gemelo',
                'twinio.export_btn': '📤 Exportar Gemelo',
                'twinio.cancel': 'Cancelar',
                'twinio.export.title': '📤 Exportar Gemelos',
                'twinio.export.description': 'Selecciona los gemelos a exportar y edita los nombres de archivo:',
                'twinio.export.package_name': 'Nombre del paquete (múltiples gemelos):',
                'twinio.export.confirm': '📤 Exportar',
                'twinio.export.no_twins': 'No hay gemelos para exportar',
                'twinio.export.none_selected': 'No se ha seleccionado ningún gemelo',
                'twinio.export.success': '✅ Gemelos exportados correctamente',
                'twinio.export.error': '❌ Error exportando',
                'twinio.import.title': '📥 Importar Gemelos',
                'twinio.import.description': 'Selecciona los gemelos a importar y edita los identificadores:',
                'twinio.import.confirm': '📥 Importar',
                'twinio.import.conflict': 'ya existe',
                'twinio.import.overwrite': 'Sobrescribir',
                'twinio.import.keep_existing': 'Mantener existente',
                'twinio.import.no_twins_found': 'No se encontraron gemelos en los archivos seleccionados',
                'twinio.import.invalid_file': 'Archivo no válido: {name}',
                'twinio.import.success': '✅ {count} gemelo(s) importado(s) correctamente',
                'twinio.import.error': '❌ Error importando',
                
                // WebSerial
                'serial.not_supported': 'Web Serial API no disponible. Use Chrome, Edge u Opera.',
                'serial.port_opened': 'Puerto serie abierto',
                'serial.port_closed': 'Puerto serie cerrado',
                'serial.no_port_selected': 'No se ha seleccionado ningún puerto',
                'serial.port_in_use': 'Este puerto ya está en uso por otro script ({owner}). Seleccione un puerto diferente.',
            },
            
            en: {
                // Main menu
                'menu.file': 'File',
                'menu.project': 'Project',
                'menu.edit': 'Edit',
                'menu.view': 'View',
                'menu.bessons': 'Twins',
                'menu.connection': 'Connection',
                'menu.tools': 'Tools',
                'menu.help': 'Help',
                
                // File submenu
                'menu.file.new': 'New project',
                'menu.file.open': 'Open project',
                'menu.file.save': 'Save project',
                'menu.file.export': 'Export',
                'menu.file.import': 'Import',
                
                // Project submenu
                'menu.project': 'Project',
                'menu.project.new': 'New project',
                'menu.project.info': 'Project information',
                'menu.project.autosave': 'Autosave',
                'menu.project.export': 'Export project...',
                'menu.project.import': 'Import project...',
                
                // Edit submenu
                'menu.edit': 'Edit',
                'menu.edit.copy': 'Copy code',
                'menu.edit.paste': 'Paste',
                'menu.edit.cut': 'Cut',
                'menu.edit.find': 'Find text',
                
                // Python submenu (formerly Scripts)
                'menu.python': 'Python',
                'menu.scripts': 'Python',
                'menu.scripts.run': 'Run',
                'menu.scripts.stop': 'Stop',
                'menu.scripts.clear': 'Clear',
                'menu.scripts.examples': 'Examples',
                'menu.scripts.ai_generator': 'AI Generator',
                'menu.scripts.ai_translator': 'AI Translator',
                
                // AI Generator / AI Translator windows
                'ai_tools.generator.title': '🤖 AI Generator',
                'ai_tools.translator.title': '🔄 AI Translator',
                'ai_tools.generator.description_label': 'Describe the code you want to generate:',
                'ai_tools.generator.description_placeholder': 'Example: Make a loop that reads the 8 switches from digital vertebra 0x0 side B and lights up the corresponding LEDs on side A',
                'ai_tools.translator.code_label': 'Paste the external Python code to translate:',
                'ai_tools.translator.code_placeholder': '# Paste your Python code here (MicroPython, standard Python, etc.)',
                'ai_tools.btn_generate_prompt': 'AI Prompt',
                'ai_tools.btn_paste_code': 'Paste code from clipboard',
                'ai_tools.toast_prompt_ready': '✅ Prompt copied and downloaded as .txt',
                'ai_tools.confirm_overwrite': 'The editor already has code. Do you want to overwrite it?',
                'ai_tools.error_validation': 'Code validation error:',
                'ai_tools.error_clipboard': 'Error reading clipboard:',
                'ai_tools.error_clipboard_empty': 'Clipboard is empty',
                'ai_tools.error_no_description': 'Write a description before generating the prompt',
                'ai_tools.error_no_code': 'Paste the Python code before generating the prompt',
                'ai_tools.instructions': 'How to use: Click "AI Prompt" to download and copy the prompt → Take it to ChatGPT/Claude → Copy the response → Click "Paste code from clipboard"',
                
                // View submenu
                'menu.view.editor': 'Python Editor',
                'menu.view.twin': 'Digital Twin',
                'twin.window_title': '🔌 Digital Twin – IoT-Vertebrae',
                'menu.view.console': 'Console',
                'menu.view.pyconsole': 'Python Console',
                'menu.view.canvas': 'Show Canvas (v1)',
                'menu.view.schematic': 'Show Schematic (v2)',
                'menu.view.reset_layout': 'Reset layout',
                'menu.view.restore_windows': 'Restore windows',
                'menu.view.ioconfig': 'IO Configuration',
                'menu.view.bessoioconfig': 'Twins IO Configuration',
                'menu.view.change_preset': 'Change Preset',
                'menu.view.fullscreen': 'Full screen',
                
                // Twins submenu
                'menu.bessons.ioconfig': 'Twins IO Configuration',
                'menu.bessons.active': 'Active',
                'menu.bessons.available': 'Available',
                
                // Twins Dialogs
                'bessons.active.title': 'Active Twins',
                'bessons.active.none': 'No active twins',
                'bessons.active.list': 'Currently loaded twins:',
                
                'bessons.available.title': 'Available Twins',
                'bessons.available.none': 'No available twins',
                'bessons.available.list': 'Available twin types in the system:',
                
                // Connection submenu
                'menu.connection.local': 'Local Mode',
                'menu.connection.remote': 'Remote Mode (MQTT)',
                'menu.connection.configure': 'Configure MQTT...',
                'menu.connection.status': 'Connection status',
                
                // Language submenu
                'menu.language': '🌐',
                'menu.language.ca': '[ca] Català',
                'menu.language.es': '[es] Castellano',
                'menu.language.en': '[en] English',
                
                // Help submenu
                'menu.help.docs': 'Documentation',
                'menu.help.examples': 'Examples',
                'menu.help.shortcuts': 'Keyboard shortcuts',
                'menu.help.clear_data': 'Clear local data',
                'menu.help.debug': 'Debug console',
                'menu.help.about': 'About IoT-Vertebrae',
                'menu.help.overview': 'Global Overview',
                'menu.help.overview.window_title': '🗺️ Global Overview — IoT-Vertebrae System',
                'overview.save_btn': 'Save',
                'overview.save_title': 'Save schematic (sch.png)',
                'overview.save_project': 'Save to project',
                'overview.save_disk': 'Save to disk',
                'overview.save_both': 'Both',
                'overview.save_cancel': 'Cancel',
                'overview.save_msg': 'The sch.png file has been generated from the current view. Where would you like to save it?',
                'overview.saved_project': '✓ sch.png saved to project',
                'overview.saved_disk': '✓ sch.png downloaded',
                'overview.saved_both': '✓ sch.png saved to project and downloaded',

                // Graphical Editor
                'graphical_editor.window_title': '🔗 Graphical Editor — Twin Connections',
                'graphical_editor.save_btn': 'Save',
                'graphical_editor.exit_btn': 'Exit',
                'graphical_editor.saved': '✓ Connections saved to JSON',
                'graphical_editor.unsaved_title': 'Unsaved changes',
                'graphical_editor.unsaved_msg': 'There are unsaved modifications. Do you want to save before exiting?',
                'graphical_editor.save_and_exit': 'Save and exit',
                'graphical_editor.exit_no_save': 'Exit without saving',
                'graphical_editor.cancel': 'Cancel',
                'graphical_editor.help_text': 'Drag blocks • Click pin → pin to connect<br>Click wire to select • Delete to remove<br>Shift+click to pan • Scroll to zoom',

                'menu.help.photo': 'IoT-Vertebrae Photo',
                'menu.help.photo.window_title': '📷 IoT-Vertebrae — Real Hardware',
                'menu.help.quick_guide': 'Quick Guide',
                'menu.help.custom_twins': 'How to Create Custom Twins',
                
                // Examples window
                'examples.window_title': '📚 Project Examples',
                'examples.empty': 'No examples available',
                'examples.loading': 'Loading examples...',
                'examples.open_btn': 'Open',
                'examples.cancel_btn': 'Cancel',
                'examples.load_error': 'Error loading example',
                
                // Project Info Dialog
                'dialog.project_info.title': 'Project Information',
                'dialog.project_info.title_new': 'New Project Information',
                'dialog.project_info.name': 'Project name',
                'dialog.project_info.name_required': 'Project name *',
                'dialog.project_info.version': 'Version',
                'dialog.project_info.author': 'Author',
                'dialog.project_info.description': 'Description',
                'dialog.project_info.cancel': 'Cancel',
                'dialog.project_info.export': 'Export',
                'dialog.project_info.create': 'Create',
                'dialog.project_info.save': 'Save',
                
                // New Project Dialog
                'dialog.new_project.title': 'New Project',
                'dialog.new_project.warning': 'This will clear:',
                'dialog.new_project.clear_iotv': 'IoT-Vertebrae configuration',
                'dialog.new_project.clear_others': 'Other Twins configuration',
                'dialog.new_project.clear_python': 'Python code',
                'dialog.new_project.clear_history': 'PLCMemory history',
                'dialog.new_project.confirm': 'Do you want to continue?',
                'dialog.new_project.continue': 'Continue',
                
                // Export Dialog
                'dialog.export.validating': 'Validating configurations...',
                'dialog.export.error_name_empty': 'Project name cannot be empty',
                'dialog.export.error_iotv_invalid': 'Invalid IoT-Vertebrae configuration',
                'dialog.export.error_others_invalid': 'Invalid Other Twins configuration',
                'dialog.export.warning_python_empty': '⚠️ Python code is empty',
                'dialog.export.generating': 'Generating files...',
                'dialog.export.compressing': 'Compressing...',
                'dialog.export.success': '✅ Project exported:',
                
                // Import Dialog
                'dialog.import.title': 'Import Project',
                'dialog.import.select_file': 'Select a .zip file',
                'dialog.import.project_label': 'Project:',
                'dialog.import.version_label': 'Version:',
                'dialog.import.author_label': 'Author:',
                'dialog.import.date_label': 'Date:',
                'dialog.import.content_label': 'Content:',
                'dialog.import.iotv_section': 'IoT-Vertebrae (Digital Twin):',
                'dialog.import.vertebra_digital': 'digital vertebra',
                'dialog.import.vertebra_analog': 'analog vertebra',
                'dialog.import.vertebrae_digital': 'digital vertebrae',
                'dialog.import.vertebrae_analog': 'analog vertebrae',
                'dialog.import.rib_outputs': 'outputs',
                'dialog.import.rib_inputs': 'inputs',
                'dialog.import.rib_a': 'Rib A:',
                'dialog.import.rib_b': 'Rib B:',
                'dialog.import.others_section': 'Other Twins:',
                'dialog.import.python_section': 'Python Script:',
                'dialog.import.lines_of_code': 'lines of code',
                'dialog.import.empty': 'empty',
                'dialog.import.overwrite_warning': 'This will overwrite the current project. Do you want to continue?',
                'dialog.import.version_warning': 'This project was created with IoT-Vertebrae v{version}. Current version: v2.0',
                'dialog.import.import_button': 'Import',
                'dialog.import.loading': 'Loading project...',
                'dialog.import.success': '✅ Project imported:',
                'dialog.import.error_invalid_zip': 'The file is not a valid .zip archive',
                'dialog.import.error_no_project_json': 'The .zip file does not contain project.json',
                'dialog.import.error_invalid_project_json': 'The project.json file is invalid',
                'dialog.import.error_no_iotv_config': 'The .zip file does not contain iotv_config.json',
                'dialog.import.error_invalid_iotv_config': 'The iotv_config.json file is invalid',
                'dialog.import.url_loading': '⏳ Downloading {filename}...',
                'dialog.import.url_source_warning': 'Importing from an external server ({host}). This will overwrite the current project.',
                'dialog.import.url_error': '❌ Error importing from URL',
                'dialog.import.url_invalid': '❌ The URL in the hash is not valid',
                'dialog.import.url_not_zip': '❌ The URL must point to a .zip file',
                
                // Toasts
                'toast.autosave_saved': '✓ Project saved',
                'toast.autosave_enabled': 'Autosave enabled',
                'toast.autosave_disabled': 'Autosave disabled',
                'toast.project_created': 'New project created:',
                'toast.project_info_saved': 'Project information saved',
                
                // About Dialog
                'dialog.about.title': 'About IoT-Vertebrae',
                'dialog.clear_data.title': 'Clear local data',
                'dialog.clear_data.message': 'All saved data will be deleted (project, settings, language). The page will reload as if it were the first time. Do you want to continue?',
                'dialog.clear_data.cancel': 'Cancel',
                'dialog.clear_data.confirm': 'Clear and reload',
                'dialog.about.version': 'Version:',
                'dialog.about.description': 'Educational IoT simulator',
                
                // Windows
                'window.editor': 'Python Editor',
                'window.controls': 'Controls',
                'window.console': 'Console',
                'window.pyconsole': 'Python Console',
                'window.scripts': 'Scripts',
                'window.examples': 'Examples',
                'window.mqtt': 'MQTT Monitor',

                // Window menu
                'menu.window': 'Window',
                'menu.window.bring_front': 'Bring to Front',
                'menu.window.minimize_all': 'Minimize All',
                'menu.window.restore_all': 'Restore All',
                'menu.window.no_windows': '(no open windows)',
                
                // Python Console
                'pyconsole.run': '▶️ Run Console',
                'pyconsole.stop': '⏹️ Stop Console',
                
                // Controls
                'controls.zoom_in': 'Zoom +',
                'controls.zoom_out': 'Zoom -',
                'controls.reset_view': 'Reset View',
                'controls.help': 'Help',
                'controls.reset_system': 'Reset System',
                'controls.export_json': 'Export JSON',
                'controls.import_json': 'Import JSON',
                
                // Editor
                'editor.run': 'Run',
                'editor.stop': 'Stop',
                'editor.run_f5': '▶️ Run (F5)',
                'editor.stop_label': '⏹️ Stop',
                'editor.validate': '✔️ Validate',
                'editor.validate_ok': '✅ Code is correct, no syntax errors.',
                'editor.validate_error': '❌ Validation error:',
                'editor.runtime_error_line': '❌ Error at line {line}: {message}',
                'editor.runtime_error_no_line': '❌ Error: {message}',
                'editor.clear': 'Clear',
                'editor.save': 'Save',
                'editor.load': 'Load',
                'editor.output': 'Output:',
                'editor.placeholder': '# Write your Python code here',
                'editor.select_example': '-- Choose an example --',
                // Example categories
                'editor.cat.basics': 'Basics',
                'editor.cat.digital': 'Digital',
                'editor.cat.analog': 'Analog',
                'editor.cat.advanced': 'Advanced',
                'editor.cat.conveyorBelt': 'Conveyor Belt',
                'editor.cat.pontH': 'H-Bridge',
                'editor.cat.mqtt': 'MQTT',
                // Example names - Basics
                'editor.ex.hello-world': 'Hello World',
                'editor.ex.variables': 'Variables and types',
                'editor.ex.loops': 'Loops',
                // Example names - Digital
                'editor.ex.led-blink': 'Blinking LED',
                'editor.ex.sequence': 'LED Sequence',
                'editor.ex.binary-counter': 'Binary counter',
                'editor.ex.button-led': 'Button → LED Frequency',
                // Example names - Analog
                'editor.ex.read-sensor': 'Read analog sensor',
                'editor.ex.voltage-output': 'Generate voltage',
                'editor.ex.sine-wave': 'Sine wave',
                // Example names - Advanced
                'editor.ex.traffic-light': 'Traffic Light',
                'editor.ex.pwm-simulation': 'Fade effect with PWM',
                'editor.ex.thermostat': 'Simple thermostat',
                // Example names - Conveyor
                'editor.ex.conveyor-basic': 'Basic conveyor',
                'editor.ex.conveyor-sensor': 'Conveyor with sensors',
                'editor.ex.conveyor-sort': 'Box sorter',
                'editor.ex.conveyor-pingpong': 'Ping-pong with emergency',
                'editor.ex.conveyor-adc-dac': 'ADC-DAC speed mapping',
                'editor.ex.conveyor-spawn': 'Multiple box unload',
                'editor.ex.conveyor-complete': 'Complete system with safety',
                // Example names - H-Bridge
                'editor.ex.ponth-basic': 'Basic motor test',
                'editor.ex.ponth-alternate': 'Alternating motors',
                // Example names - MQTT
                'editor.ex.mqtt-publisher': '📡 MQTT Publisher - Switches',
                'editor.ex.mqtt-subscriber': '📡 MQTT Subscriber - LED Control',
                'editor.ex.mqtt-sensor': '📡 MQTT Sensor - Telemetry',
                
                // Twins
                'besso.pont_h.title': 'H-Bridge with Relays',
                'besso.pont_h.description': 'Bidirectional DC motor control with 4 relays and capacitive sensors',
                'besso.led_tricolor.title': 'Tricolor LED NPN/PNP',
                'besso.led_tricolor.description': 'RGB LED system with NPN/PNP switching',
                'besso.cinta.title': 'Conveyor Belt',
                'besso.cinta.description': 'Conveyor belt simulation with motor and sensors',
                'besso.semafor.title': 'Traffic Light',
                'besso.semafor.description': '4-way intelligent traffic light with vehicle detection',
                
                // MQTT
                'mqtt.connecting': 'Connecting...',
                'mqtt.connected': 'Connected',
                'mqtt.disconnected': 'Disconnected',
                'mqtt.error': 'Connection error',
                'mqtt.broker': 'Broker',
                'mqtt.port': 'Port',
                'mqtt.username': 'Username',
                'mqtt.password': 'Password',
                'mqtt.room_code': 'Room code',
                'mqtt.your_name': 'Your name',
                
                // Dialogs
                'dialog.config_besso': 'Configuration: {name}',
                'dialog.mapping': 'Input/output mapping',
                'dialog.restore_default': 'Restore defaults',
                'dialog.accept': 'Accept',
                'dialog.cancel': 'Cancel',
                'dialog.close': 'Close',
                
                // Messages
                'msg.vertebra_added': 'Vertebra {addr} added',
                'msg.vertebra_removed': 'Vertebra {addr} removed',
                'msg.besso_loaded': 'Twin "{name}" loaded',
                'msg.besso_unloaded': 'Twin closed',
                'msg.project_saved': 'Project saved',
                'msg.project_loaded': 'Project loaded',
                'msg.config_exported': 'Configuration exported',
                'msg.config_imported': 'Configuration imported',
                'msg.mqtt_connected': 'Connected to {broker}',
                'msg.mqtt_disconnected': 'Disconnected from MQTT',
                
                // Errors
                'error.besso_load': 'Error loading twin',
                'error.mqtt_connect': 'Error connecting to MQTT',
                'error.invalid_address': 'Invalid address',
                'error.no_io_available': 'Not enough I/O available',
                
                // Components
                'component.relay': 'Relay',
                'component.sensor': 'Sensor',
                'component.motor': 'Motor',
                'component.led': 'LED',
                'component.switch': 'Switch',
                'component.solenoid': 'Solenoid',
                
                // States
                'state.on': 'On',
                'state.off': 'Off',
                'state.running': 'Running',
                'state.stopped': 'Stopped',
                'state.error': 'Error',
                
                // Units
                'unit.voltage': 'V',
                'unit.current': 'mA',
                'unit.rpm': 'RPM',
                
                // Besso Config Editor - Window
                'bce.window_title': '⚙️ Twins IO Configuration',
                
                // Besso Config Editor - Tabs
                'bce.tab.digital': '🖥️ Digital Twin',
                'bce.tab.twins': '🔧 Configure Twins',
                'bce.tab.physical': '🔌 Twin Connections',
                
                // Besso Config Editor - Configure Twins tab
                'bce.twins.title': 'Configure Twins (twins_config.json)',
                'bce.twins.description': 'Define reusable twin types. Each definition is identified by twinId.',
                'bce.twins.label': 'Twins Catalogue (JSON):',
                'bce.twins.validate_btn': '🔍 Validate Configuration',
                
                // Besso Config Editor - Twin Connections tab
                'bce.physical.title': 'Twin Connections',
                'bce.physical.description': 'Edit the JSON to define the IO connections for twins (h-bridge, conveyor, twin).',
                'bce.physical.label': 'JSON Configuration:',
                'bce.physical.autoload': '☑ Automatically load all twins after applying changes',
                'bce.physical.validate_btn': '🔍 Validate Connection',
                
                // Besso Config Editor - Global buttons
                'bce.validate_all_btn': '🔍 VALIDATE ALL (Digital + Configuration + Connection + Coherence)',
                'bce.apply_btn': '✅ APPLY CHANGES',
                
                // Besso Config Editor - Twins validation
                'bce.twins.err_not_array': 'Must be a JSON array',
                'bce.twins.err_missing_twinid': 'Entry {index}: missing "twinId" field',
                'bce.twins.err_duplicate_twinid': 'Entry {index}: duplicate twinId "{twinId}"',
                'bce.twins.warn_missing_name': 'Entry {index} ({twinId}): missing meta.name',
                'bce.twins.err_missing_components': 'Entry {index} ({twinId}): missing components or empty',
                'bce.twins.err_component_no_id': 'Component {compIndex} of "{twinId}": missing id',
                'bce.twins.err_component_invalid_type': 'Component {compIndex} of "{twinId}": invalid type "{compType}" (valid: {validTypes})',
                'bce.twins.err_component_no_binding': 'Component {compIndex} of "{twinId}": missing binding (fromPLC or toPLC)',
                'bce.twins.valid_count': '✅ Valid JSON: {count} twin(s) defined',
                'bce.twins.err_invalid_json': '❌ Invalid JSON: {message}',
                
                // Besso Config Editor - General validation
                'bce.errors_label': 'Errors:',
                'bce.warnings_label': '⚠️ Warnings:',
                'bce.warnings_label_short': '⚠️ Warnings:',
                'bce.config_valid': '✅ Configuration valid',
                'bce.config_invalid': '❌ Configuration invalid',
                
                // Besso Config Editor - Full validation results
                'bce.results.window_title': '📊 Full Validation Results',
                'bce.results.all_valid': '✅ Full Validation: PASSED',
                'bce.results.has_errors': '❌ Full Validation: ERRORS DETECTED',
                'bce.results.section_digital': '1️⃣ Digital Twin (Preset)',
                'bce.results.section_twins': '2️⃣ Configure Twins',
                'bce.results.section_physical': '3️⃣ Twin Connections',
                'bce.results.section_coherence': '4️⃣ Coherence (Others ↔ Digital)',
                'bce.results.no_conflicts': '✅ No conflicts detected',
                'bce.results.has_conflicts': '❌ Conflicts detected',
                'bce.results.errors_label': '🚫 ERRORS:',
                'bce.results.warnings_label': '⚠️ WARNINGS:',
                'bce.results.conflict_summary': '📊 Conflict Summary:',
                'bce.results.total_conflicts': 'Total: {total} conflicts detected',
                'bce.results.error_count': 'Errors: {count}',
                'bce.results.warning_count': 'Warnings: {count}',
                'bce.coherence.cannot_validate': 'Cannot validate coherence: there are errors in the digital twin or twin connections',
                
                // Besso Config Editor - Apply changes
                'bce.apply.preset_invalid': '❌ Error: invalid digital preset',
                'bce.apply.preset_errors': '❌ Invalid digital preset:',
                'bce.apply.preset_load_error': '❌ Error loading digital preset',
                'bce.apply.preset_updated': '✅ Digital preset updated and canvas refreshed.',
                'bce.apply.loading_twins': '🔄 Loading {count} twins...',
                'bce.apply.twins_loaded': '✅ Twins loaded: {active}/{total}',
                'bce.apply.error': '❌ Error applying changes',
                'bce.apply.error_generic': '❌ Error: {message}',
                
                // Besso Config Editor - Confirmation dialog
                'bce.confirm.reload_warning': '⚠️ This will reload all other twins.',
                'bce.confirm.state_loss': 'Current states will be lost (positions, boxes, etc.).',
                'bce.confirm.digital_modified': '🖥️ IMPORTANT: The digital twin preset has been modified.',
                'bce.confirm.digital_reopen': 'You will need to close and reopen the digital twin to apply the changes.',
                'bce.confirm.warnings_detected': 'The following warnings have been detected:',
                'bce.confirm.autoload_count': '✓ {count} twins will be automatically loaded after applying.',
                'bce.confirm.continue': 'Do you want to continue?',
                
                // Besso Config Editor - Digital Twin tab
                'bce.digital.preset_label': 'Digital Twin Preset:',
                'bce.digital.description': '💡 Modify the preset to adjust the digital twin configuration (vertebrae and ribs).',
                'bce.digital.json_label': 'JSON Configuration:',
                'bce.digital.validate_btn': '🔍 Validate Configuration',
                'bce.digital.confirm_unsaved': '⚠️ There are unsaved changes in the current preset.\n\nIf you change preset, these changes will be lost.\n\nDo you want to continue?',
                
                // Besso Config Editor - Visual Preset Editor
                'bce.digital.editor_btn': '✏️ Editor',
                'bce.digital.editor.window_title': '✏️ Editor — Digital Twin',
                'bce.digital.editor.json_warning': 'Current JSON is invalid. The form has been opened empty.',
                'bce.digital.editor.name': 'Name',
                'bce.digital.editor.description': 'Description',
                'bce.digital.editor.version': 'Version',
                'bce.digital.editor.vertebrae_title': 'Vertebrae',
                'bce.digital.editor.add_vertebra': 'Add vertebra',
                'bce.digital.editor.remove_vertebra': 'Remove vertebra',
                'bce.digital.editor.apply': '✅ Apply',
                'bce.digital.editor.cancel': 'Cancel',
                
                // Besso Config Editor - Twins Visual Editor
                'bce.twins.editor_btn': '✏️ Editor',
                'bce.twins.editor.window_title': '✏️ Editor — Configure Twins',
                'bce.twins.editor.json_warning': 'Current JSON is invalid. The form has been opened empty.',
                'bce.twins.editor.add_twin': 'Add Twin',
                'bce.twins.editor.remove_twin': 'Remove twin',
                'bce.twins.editor.unnamed': '(unnamed)',
                'bce.twins.editor.empty_hint': 'No twins defined. Press "+ Add Twin" to get started.',
                'bce.twins.editor.select_hint': 'Select a twin from the list.',
                'bce.twins.editor.components_title': 'Components',
                'bce.twins.editor.add_component': 'Add Component',
                'bce.twins.editor.remove_component': 'Remove component',
                'bce.twins.editor.optional': 'optional',
                'bce.twins.editor.overlay_enabled': 'Enabled',
                'bce.twins.editor.overlay_src_hint': 'file.html',
                'bce.twins.editor.upload_asset': 'Upload asset file (html/png/jpg)',
                'bce.twins.editor.upload_btn': 'Upload',
                'bce.twins.editor.paste_html': 'Paste HTML from Clipboard',
                'bce.twins.editor.ai_prompt': 'AI Prompt',
                'bce.twins.editor.ai_prompt_window_title': '🤖 Prompt Generator — AI Overlay',
                'bce.twins.editor.ai_prompt_description': 'Describe the overlay you want to generate:',
                'bce.twins.editor.ai_prompt_placeholder': 'Example: Motor visualization with rotation animation, status LEDs and direction indicator...',
                'bce.twins.editor.ai_prompt_generate': '🤖 Generate Prompt',
                'bce.twins.editor.ai_prompt_copied': '✅ Prompt copied to clipboard and downloaded as prompt.txt',
                'bce.twins.editor.ai_prompt_copy_fail': '⚠️ Could not copy. The prompt.txt file has been downloaded.',
                'bce.twins.editor.ai_prompt_no_desc': '⚠️ Write a description of the overlay.',
                'bce.twins.editor.ai_prompt_guide_warning': '⚠️ Could not load OVERLAY_PROMPT_GUIDE.md — the prompt will be more basic.',
                'bce.twins.editor.ai_prompt_intro': 'Generate an HTML file for an IoT-Vertebrae digital twin overlay.',
                'bce.twins.editor.ai_prompt_config_section': 'TWIN CONFIGURATION:',
                'bce.twins.editor.ai_prompt_signals_section': 'AVAILABLE SIGNALS:',
                'bce.twins.editor.ai_prompt_user_section': 'USER DESCRIPTION:',
                'bce.twins.editor.ai_prompt_format_note': 'Generate ONLY the inner HTML code (without <!DOCTYPE>, <html>, <head> or <body>). The HTML will be inserted inside a sandboxed iframe.',
                'bce.twins.editor.paste_html_success': '✅ HTML pasted successfully',
                'bce.twins.editor.paste_html_empty': '⚠️ Clipboard is empty or does not contain text.',
                'bce.twins.editor.paste_html_error': '⚠️ Could not access clipboard.',
                'bce.twins.editor.paste_html_confirm_name': 'Overlay file name:',
                'bce.twins.editor.paste_html_no_twinid': '⚠️ Define the twinId first.',
                'bce.twins.editor.apply': '✅ Apply',
                'bce.twins.editor.cancel': 'Cancel',
                'bce.twins.editor.photo_enabled': 'Enabled',
                'bce.twins.editor.photo_label': 'Picture',
                'bce.twins.editor.photo_upload_btn': 'Upload',
                'bce.twins.editor.photo_delete_btn': 'Remove',
                'bce.twins.editor.photo_current': 'Current image:',
                'bce.twins.editor.photo_none': 'No image uploaded.',
                'bce.twins.editor.photo_uploaded': '✅ Picture uploaded: {name}',
                'bce.twins.editor.photo_deleted': '✅ Picture removed.',
                'bce.twins.editor.photo_no_file': '⚠️ No picture to remove.',
                'bce.twins.preview_btn': '👁️ Preview',
                'bce.twins.preview.window_title': 'Preview — {name}',
                'bce.twins.preview.no_twins': '⚠️ No twins to preview.',
                'bce.twins.preview.select_twin': 'Select a twin to preview:',
                'twin.photo_checkbox': 'Picture',
                
                // Besso Config Editor - Physical connections visual editor
                'bce.physical.schematic_btn': 'Connection Schematic',
                'bce.physical.graphical_editor_btn': '🔗 Graphical Editor',
                'bce.physical.schematic_title': '📐 Schematic — {projectName}',
                'bce.physical.schematic_no_image': 'This project does not include a connection schematic.',
                'bce.physical.schematic_alt': 'Project connection schematic',
                'bce.physical.editor_btn': '✏️ Editor',
                'bce.physical.editor.window_title': '✏️ Editor — Twin Connections',
                'bce.physical.editor.json_warning': 'Current JSON is invalid. The form has been opened empty.',
                'bce.physical.editor.static_section': 'Static entries (JSON edit only)',
                'bce.physical.editor.static_badge': 'not editable',
                'bce.physical.editor.twin_section': 'Twin Instances',
                'bce.physical.editor.add_instance': 'Add Instance',
                'bce.physical.editor.remove_instance': 'Remove instance',
                'bce.physical.editor.name_placeholder': 'instance-name',
                'bce.physical.editor.select_twin': '— select twinId —',
                'bce.physical.editor.empty_hint': 'No twin instances defined. Press \"+ Add Instance\" to get started.',
                'bce.physical.editor.select_hint': 'Select an instance from the list.',
                'bce.physical.editor.unnamed': '(unnamed)',
                'bce.physical.editor.signals_title': 'IO Signals',
                'bce.physical.editor.signal': 'signal',
                'bce.physical.editor.label_override': 'label',
                'bce.physical.editor.label_override_hint': 'custom (optional)',
                'bce.physical.editor.dir': 'direction',
                'bce.physical.editor.type': 'type',
                'bce.physical.editor.vertebra': 'vertebra',
                'bce.physical.editor.rib': 'rib',
                'bce.physical.editor.add_signal': 'Add',
                'bce.physical.editor.remove_signal': 'Remove signal',
                'bce.physical.editor.no_signals': 'No signals. Use ⚡ Auto-map or + Add.',
                'bce.physical.editor.auto_map': 'Auto-map',
                'bce.physical.editor.auto_map_hint': 'Auto-generate signals from the twins catalog',
                'bce.physical.editor.apply': '✅ Apply',
                'bce.physical.editor.cancel': 'Cancel',
                'bce.viewer.window_title_digital': '👁️ Viewer — Digital Twin',
                'bce.viewer.window_title_twins': '👁️ Viewer — Configure Twins',
                'bce.viewer.window_title_physical': '👁️ Viewer — Twin Connections',
                'bce.viewer.invalid_json': 'Invalid JSON — fix the JSON and try again.',
                'bce.viewer.render_error': 'Error rendering JSON.',
                
                // Besso Config Editor - Export dialog
                'bce.export.window_title': '💾 Export Configurations',
                'bce.export.question': 'Do you want to export the configurations before closing?',
                'bce.export.basename_label': 'Base name for files:',
                'bce.export.basename_hint': 'Will generate: <code style="color: #3498db;">&lt;name&gt;_others.json</code> and <code style="color: #3498db;">&lt;name&gt;_iotv.json</code>',
                'bce.export.discard': 'Discard',
                'bce.export.cancel': 'Cancel',
                'bce.export.confirm': '💾 Export',
                
                // TwinIO - Import/Export twins
                'twinio.import_btn': '📥 Import Twin',
                'twinio.export_btn': '📤 Export Twin',
                'twinio.cancel': 'Cancel',
                'twinio.export.title': '📤 Export Twins',
                'twinio.export.description': 'Select the twins to export and edit file names:',
                'twinio.export.package_name': 'Package name (multiple twins):',
                'twinio.export.confirm': '📤 Export',
                'twinio.export.no_twins': 'No twins to export',
                'twinio.export.none_selected': 'No twin selected',
                'twinio.export.success': '✅ Twins exported successfully',
                'twinio.export.error': '❌ Export error',
                'twinio.import.title': '📥 Import Twins',
                'twinio.import.description': 'Select the twins to import and edit identifiers:',
                'twinio.import.confirm': '📥 Import',
                'twinio.import.conflict': 'already exists',
                'twinio.import.overwrite': 'Overwrite',
                'twinio.import.keep_existing': 'Keep existing',
                'twinio.import.no_twins_found': 'No twins found in the selected files',
                'twinio.import.invalid_file': 'Invalid file: {name}',
                'twinio.import.success': '✅ {count} twin(s) imported successfully',
                'twinio.import.error': '❌ Import error',
                
                // WebSerial
                'serial.not_supported': 'Web Serial API not available. Use Chrome, Edge or Opera.',
                'serial.port_opened': 'Serial port opened',
                'serial.port_closed': 'Serial port closed',
                'serial.no_port_selected': 'No port selected',
                'serial.port_in_use': 'This port is already in use by another script ({owner}). Please select a different port.',
            }
        };
    }

    /**
     * Traduir una clau
     * @param {string} key - Clau de traducció
     * @param {Object} vars - Variables per interpolar {name: 'Joan'}
     */
    t(key, vars = {}) {
        let translation = this.translations[this.currentLanguage]?.[key];
        
        // Fallback a idioma per defecte
        if (!translation) {
            translation = this.translations[this.fallbackLanguage]?.[key];
        }
        
        // Fallback a la clau mateixa
        if (!translation) {
            console.warn(`[i18n] Missing translation for key: ${key}`);
            return key;
        }
        
        // Interpolar variables
        return this._interpolate(translation, vars);
    }

    /**
     * Interpolar variables en una traducció
     * Exemple: "Hola {name}" amb {name: 'Joan'} → "Hola Joan"
     */
    _interpolate(text, vars) {
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return vars[key] !== undefined ? vars[key] : match;
        });
    }

    /**
     * Canviar idioma
     */
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.warn(`[i18n] Language not supported: ${lang}`);
            return false;
        }
        
        this.currentLanguage = lang;
        
        // Actualitzar tots els elements amb atribut data-i18n
        this._updateDOM();
        
        console.log(`[i18n] Language changed to: ${lang}`);
        return true;
    }

    /**
     * Obtenir idioma actual
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * Actualitzar tots els elements del DOM amb traduccions
     */
    _updateDOM() {
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const vars = el.getAttribute('data-i18n-vars');
            
            let parsedVars = {};
            if (vars) {
                try {
                    parsedVars = JSON.parse(vars);
                } catch (e) {
                    console.warn(`[i18n] Invalid vars for ${key}:`, vars);
                }
            }
            
            el.textContent = this.t(key, parsedVars);
        });
    }

    /**
     * Registrar traduccions addicionals (per bessons personalitzats)
     */
    addTranslations(lang, translations) {
        if (!this.translations[lang]) {
            this.translations[lang] = {};
        }
        
        Object.assign(this.translations[lang], translations);
    }

    /**
     * Obtenir totes les claus disponibles
     */
    getAvailableKeys() {
        return Object.keys(this.translations[this.currentLanguage] || {});
    }
}

// Crear instància i exportar
const i18nInstance = new I18n();

// Funció global d'accés ràpid
const t = (key, vars) => i18nInstance.t(key, vars);

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.I18nClass = I18n;
    window.I18n = i18nInstance;
    window.i18n = i18nInstance;
    window.t = t;
    
    // Subscriure's a canvis d'idioma DESPRÉS de crear la instància
    if (window.EventBus && window.EventBus.on && window.EventBus.EVENTS) {
        window.EventBus.on(window.EventBus.EVENTS.LANGUAGE_CHANGED, (data) => {
            i18nInstance.setLanguage(data.newLanguage);
        });
    }
}

console.log('✓ i18n loaded');
