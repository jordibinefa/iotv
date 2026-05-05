/**
 * Toast Utils - Sistema de notificacions discretes
 */

/**
 * Mostrar notificació toast
 * @param {string} message - Missatge a mostrar
 * @param {string} type - Tipus: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Durada en ms (default: 3000)
 */
window.showToast = function(message, type = 'info', duration = 3000) {
    // Crear element toast
    const toast = document.createElement('div');
    
    // Colors segons tipus
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    const bgColor = colors[type] || colors.info;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 100000;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
        max-width: 350px;
        word-wrap: break-word;
    `;
    
    toast.textContent = message;
    
    // Afegir al body
    document.body.appendChild(toast);
    
    // Animació d'entrada
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Animació de sortida i eliminació
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
};
