function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.nextElementSibling;
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.textContent = '🙈';
    } else {
        field.type = 'password';
        icon.textContent = '👁️';
    }
}

function checkPasswordStrength(password) {
    let strength = 0;
    const bars = document.querySelectorAll('[id^="bar"]');
    const strengthText = document.getElementById('strengthText');
    
    // Reset bars
    bars.forEach(bar => {
        bar.className = 'h-1 flex-1 bg-white/20 rounded-full transition-colors duration-300';
    });
    
    if (password.length === 0) {
        strengthText.textContent = 'Ingresa una contraseña';
        return;
    }
    
    // Check various criteria
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    // Update visual indicators
    for (let i = 0; i < strength; i++) {
        if (strength < 2) {
            bars[i].className = 'h-1 flex-1 bg-red-400 rounded-full transition-colors duration-300';
        } else if (strength < 4) {
            bars[i].className = 'h-1 flex-1 bg-yellow-400 rounded-full transition-colors duration-300';
        } else {
            bars[i].className = 'h-1 flex-1 bg-green-400 rounded-full transition-colors duration-300';
        }
    }
    
    // Update text
    if (strength < 2) {
        strengthText.textContent = 'Contraseña débil';
        strengthText.className = 'text-xs text-red-300';
    } else if (strength < 4) {
        strengthText.textContent = 'Contraseña media';
        strengthText.className = 'text-xs text-yellow-300';
    } else {
        strengthText.textContent = 'Contraseña fuerte';
        strengthText.className = 'text-xs text-green-300';
    }
}

function validatePasswords() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmField = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmField.classList.add('ring-2', 'ring-red-400');
        confirmField.classList.remove('focus:ring-white/30');
        return false;
    } else {
        confirmField.classList.remove('ring-2', 'ring-red-400');
        confirmField.classList.add('focus:ring-white/30');
        return true;
    }
}

function showLogin() {
    alert('Redirigiendo al formulario de login...');
    // Aquí puedes agregar la lógica para redirigir al login
}

// Custom checkbox styling
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const customBox = this.nextElementSibling;
            const checkmark = customBox.querySelector('.checkmark');
            
            if (this.checked) {
                customBox.classList.add('bg-accent', 'border-accent');
                checkmark.classList.add('opacity-100');
                checkmark.classList.remove('opacity-0');
            } else {
                customBox.classList.remove('bg-accent', 'border-accent');
                checkmark.classList.remove('opacity-100');
                checkmark.classList.add('opacity-0');
            }
        });
    });
});

// Event listeners
document.getElementById('password').addEventListener('input', function(e) {
    checkPasswordStrength(e.target.value);
});

document.getElementById('confirmPassword').addEventListener('input', validatePasswords);

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!validatePasswords()) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    if (!document.getElementById('terms').checked) {
        alert('Debes aceptar los términos y condiciones');
        return;
    }
    
    // Simular registro exitoso
    alert('¡Cuenta creada exitosamente! Redirigiendo al login...');
    
    // Recolectar datos del formulario
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        newsletter: document.getElementById('newsletter').checked
    };
    
    console.log('Datos de registro:', formData);
});

// Add floating animation to form elements on focus
document.querySelectorAll('.group input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('-translate-y-1');
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('-translate-y-1');
    });
});