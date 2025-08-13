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

    if (!password) {
        strengthText.textContent = 'Ingresa una contraseña';
        strengthText.className = 'text-xs text-gray-300';
        return;
    }

    // Criterios de seguridad
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // Colorear barras
    for (let i = 0; i < strength; i++) {
        if (strength < 2) {
            bars[i].className = 'h-1 flex-1 bg-red-400 rounded-full';
        } else if (strength < 4) {
            bars[i].className = 'h-1 flex-1 bg-yellow-400 rounded-full';
        } else {
            bars[i].className = 'h-1 flex-1 bg-green-400 rounded-full';
        }
    }

    // Texto descriptivo
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
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
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

// Custom checkbox styling
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
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

    // Escuchas
    document.getElementById('password').addEventListener('input', e => checkPasswordStrength(e.target.value));
    document.getElementById('confirmPassword').addEventListener('input', validatePasswords);

    // Registro real
    document.getElementById('registerForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!validatePasswords()) {
            alert('Las contraseñas no coinciden');
            return;
        }
        if (!document.getElementById('terms').checked) {
            alert('Debes aceptar los términos y condiciones');
            return;
        }

        const formData = {
            nombre: document.getElementById('fullName').value.trim(),
            idUsuario: document.getElementById('username').value.trim(),
            contraseña: document.getElementById('password').value.trim(),
            perfil: {
                email: document.getElementById('email').value.trim(),
                newsletter: document.getElementById('newsletter').checked
            }
        };

        try {
            const response = await fetch('http://127.0.0.1:5000/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert('✅ ¡Cuenta creada exitosamente! Redirigiendo al login...');
                window.location.href = '/login.html';
            } else {
                alert(`❌ Error: ${data.error || 'Error desconocido'}`);
            }
        } catch (err) {
            alert('⚠️ Error de conexión con el servidor');
        }
    });
});

// Efecto flotante inputs
document.querySelectorAll('.group input').forEach(input => {
    input.addEventListener('focus', function () {
        this.parentElement.classList.add('-translate-y-1');
    });
    input.addEventListener('blur', function () {
        this.parentElement.classList.remove('-translate-y-1');
    });
});
