// Contact Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;

            // Simulate email sending (replace with actual email service)
            setTimeout(() => {
                // Create mailto link as fallback
                const mailtoLink = `mailto:contact@ailive.fr?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
                    `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
                )}`;

                // Try to open email client
                window.location.href = mailtoLink;

                // Show success message
                showMessage('Message prepared! Your email client should open to send the message.', 'success');
                
                // Reset form
                contactForm.reset();
                
                // Reset button
                submitBtn.innerHTML = 'Send Message';
                submitBtn.disabled = false;
            }, 1000);
        });
    }

    function showMessage(text, type) {
        formMessage.textContent = text;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
        
        // Hide message after 5 seconds
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
});
