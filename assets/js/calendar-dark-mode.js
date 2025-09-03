// Calendar Dark Mode Handler
function handleCalendarDarkMode() {
  const appointmentScheduler = document.querySelector('.appointment-scheduler');
  const iframe = appointmentScheduler?.querySelector('iframe');
  
  if (!appointmentScheduler || !iframe) return;
  
  // Function to apply dark mode
  function applyDarkMode() {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (isDarkMode) {
      appointmentScheduler.classList.add('dark-mode');
      // Try to modify iframe content if accessible
      try {
        iframe.onload = function() {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
              // Inject dark mode styles into iframe
              const style = iframeDoc.createElement('style');
              style.textContent = `
                body { 
                  background: #1a1a1a !important; 
                  color: #ffffff !important; 
                }
                * { 
                  background-color: #1a1a1a !important; 
                  color: #ffffff !important; 
                }
                .calendar-container, 
                .calendar-wrapper,
                [class*="calendar"],
                [id*="calendar"] { 
                  background: #1a1a1a !important; 
                  filter: invert(1) hue-rotate(180deg) !important;
                }
              `;
              iframeDoc.head.appendChild(style);
            }
          } catch (e) {
            console.log('Cannot access iframe content due to CORS policy');
          }
        };
      } catch (e) {
        console.log('Iframe access restricted');
      }
    } else {
      appointmentScheduler.classList.remove('dark-mode');
    }
  }
  
  // Apply on load
  applyDarkMode();
  
  // Watch for theme changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        applyDarkMode();
      }
    });
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleCalendarDarkMode);
} else {
  handleCalendarDarkMode();
}
