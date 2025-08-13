// Import Login functionality (simulated)

        class LoginManager {
            constructor() {
                this.apiUrl = 'http://127.0.0.1:5000/login'; // URL de tu API
            }

            async authenticate(credentials) {
                try {
                    // Simular llamada a data/Login.js
                    const response = await fetch(this.apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(credentials)
                    });

                    if (!response.ok) {
                        throw new Error('Error en la autenticación');
                    }

                    const data = await response.json();
                    return data;
                } catch (error) {
            console.error('Error en login:', error);
            throw error; // Para que el código que llame a authenticate pueda manejarlo
        }
            }
        }

        // Initialize login manager
        const loginManager = new LoginManager();

        // DOM elements
        const loginForm = document.getElementById('loginForm');
        const togglePasswordBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        const eyeIcon = document.getElementById('eyeIcon');
        const buttonText = document.getElementById('buttonText');
        const loadingIcon = document.getElementById('loadingIcon');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const errorText = document.getElementById('errorText');
        const successText = document.getElementById('successText');

        // Toggle password visibility
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            
            if (type === 'password') {
                eyeIcon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                `;
            } else {
                eyeIcon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                `;
            }
        });

        // Show message function
        function showMessage(isError, message) {
            if (isError) {
                errorText.textContent = message;
                errorMessage.classList.remove('hidden');
                successMessage.classList.add('hidden');
            } else {
                successText.textContent = message;
                successMessage.classList.remove('hidden');
                errorMessage.classList.add('hidden');
            }

            // Hide message after 5 seconds
            setTimeout(() => {
                errorMessage.classList.add('hidden');
                successMessage.classList.add('hidden');
            }, 5000);
        }

        // Handle form submission
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            buttonText.textContent = 'Iniciando sesión...';
            loadingIcon.classList.remove('hidden');
            
            // Get form data
            const formData = new FormData(loginForm);
            const credentials = {
                idUsuario: formData.get('username'),
                contraseña: formData.get('password'),
                remember: formData.get('remember') ? true : false
            };

            try {
                // Attempt login
                const result = await loginManager.authenticate(credentials);
                
                if (result.success) {
                    showMessage(false, '¡Inicio de sesión exitoso! Redirigiendo...');
                    
                    // Store token if remember me is checked
                    if (credentials.remember) {
                        localStorage.setItem('nexus_token', result.token);
                        localStorage.setItem('nexus_user', JSON.stringify(result.user));
                    } else {
                        sessionStorage.setItem('nexus_token', result.token);
                        sessionStorage.setItem('nexus_user', JSON.stringify(result.user));
                    }
                    
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/Index.html'; // Cambiar por tu URL de dashboard
                    }, 2000);
                } else {
                    showMessage(true, 'Error en las credenciales. Inténtalo de nuevo.');
                }
            } catch (error) {
                showMessage(true, error.message || 'Error de conexión. Inténtalo más tarde.');
            } finally {
                // Reset button state
                buttonText.textContent = 'Iniciar Sesión';
                loadingIcon.classList.add('hidden');
            }
        });

        // Check if user is already logged in
        window.addEventListener('load', function() {
            const token = localStorage.getItem('nexus_token') || sessionStorage.getItem('nexus_token');
            if (token) {
                // User is already logged in, redirect to dashboard
                window.location.href = '/Index.html';
            }
        });

        // Add floating animation to form elements on focus
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.parentElement.style.transform = 'translateY(-2px)';
                this.parentElement.style.transition = 'transform 0.2s ease';
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.style.transform = 'translateY(0px)';
            });
        });