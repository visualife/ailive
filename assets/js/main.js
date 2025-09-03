document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const header = document.querySelector('.header');
  const themeToggle = document.querySelector('.theme-toggle');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  const languageSelector = document.querySelector('.language-selector');
  const animatedElements = document.querySelectorAll('.animated');
  const techLogos = document.querySelectorAll('.tech-logo');
  const techCategories = document.querySelectorAll('.tech-category');
  const techSection = document.querySelector('.tech-stack');
  const portfolioFilters = document.querySelectorAll('.portfolio-filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  const contactForm = document.getElementById('contact-form');
  const formInputs = document.querySelectorAll('.form-control');
  
  // Theme Switching
  themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('light-theme');
    updateThemeIcon();
    saveThemePreference();
  });
  
  function updateThemeIcon() {
    const isDarkTheme = !document.body.classList.contains('light-theme');
    themeToggle.innerHTML = isDarkTheme ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }
  
  function saveThemePreference() {
    const isDarkTheme = !document.body.classList.contains('light-theme');
    localStorage.setItem('darkTheme', isDarkTheme);
  }
  
  function loadThemePreference() {
    const darkThemePreferred = localStorage.getItem('darkTheme') !== 'false'; // Default to dark theme
    
    if (!darkThemePreferred) {
      document.body.classList.add('light-theme');
    }
    
    updateThemeIcon();
  }
  
  // Mobile Menu Toggle
  mobileMenuBtn.addEventListener('click', function() {
    navLinks.classList.toggle('active');
    mobileMenuBtn.innerHTML = navLinks.classList.contains('active') 
      ? '<i class="fas fa-times"></i>' 
      : '<i class="fas fa-bars"></i>';
  });
  
  // Close mobile menu when clicking a link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
      }
    });
  });
  
  // Language Switching
  languageSelector.addEventListener('change', function() {
    const selectedLanguage = this.value;
    localStorage.setItem('language', selectedLanguage);
    loadLanguage(selectedLanguage);
  });
  
  function loadLanguage(language) {
    // Get current page and navigate to corresponding language version
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Define page mappings between English and French
    const pageMapping = {
      // English to French
      'index.html': 'accueil.html',
      'shopify.html': 'developpement.html',
      'seo.html': 'seo-fr.html',
      'automation.html': 'automatisation.html',
      'design.html': 'contenu.html',
      'contact.html': 'contact-fr.html',
      
      // French to English
      'accueil.html': 'index.html',
      'developpement.html': 'shopify.html',
      'seo-fr.html': 'seo.html',
      'automatisation.html': 'automation.html',
      'contenu.html': 'design.html',
      'contact-fr.html': 'contact.html'
    };
    
    let targetPage;
    
    if (language === 'fr') {
      // Switch to French version
      targetPage = pageMapping[currentPage] || 'accueil.html';
    } else if (language === 'en') {
      // Switch to English version
      targetPage = pageMapping[currentPage] || 'index.html';
    }
    
    if (targetPage && targetPage !== currentPage) {
      window.location.href = targetPage;
    }
  }
  
  function loadLanguagePreference() {
    const savedLanguage = localStorage.getItem('language') || 'en';
    languageSelector.value = savedLanguage;
  }
  
  // Scroll Effects
  window.addEventListener('scroll', function() {
    // Add shadow to header on scroll
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    
    // Animate elements when they come into view
    animatedElements.forEach(el => {
      if (isElementInViewport(el)) {
        el.classList.add('fade-in');
      }
    });
  });
  
  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8
    );
  }
  
  // Initialize
  loadThemePreference();
  loadLanguagePreference();
  
  // Trigger scroll once to check for visible elements
  window.dispatchEvent(new Event('scroll'));
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Offset for fixed header
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Form validation with enhanced UX
  // Add focus effects to form inputs
  formInputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
      if (this.value === '') {
        this.parentElement.classList.remove('focused');
      }
    });
    
    // If input has value on page load, add focused class
    if (input.value !== '') {
      input.parentElement.classList.add('focused');
    }
  });

  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form elements
      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const messageInput = document.getElementById('message');
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      
      // Get values
      const name = nameInput.value;
      const email = emailInput.value;
      const message = messageInput.value;
      
      // Reset previous error states
      formInputs.forEach(input => {
        input.classList.remove('is-invalid');
      });
      
      // Validate
      let isValid = true;
      
      if (!name) {
        nameInput.classList.add('is-invalid');
        isValid = false;
      }
      
      if (!email || !isValidEmail(email)) {
        emailInput.classList.add('is-invalid');
        isValid = false;
      }
      
      if (!message) {
        messageInput.classList.add('is-invalid');
        isValid = false;
      }
      
      if (!isValid) {
        // Show error notification
        showNotification('Please check the form for errors', 'error');
        return;
      }
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      
      // Simulate form submission (replace with actual AJAX call in production)
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Message';
        contactForm.reset();
        
        // Remove focused class from all inputs
        formInputs.forEach(input => {
          input.parentElement.classList.remove('focused');
        });
        
        // Show success notification
        showNotification('Message sent successfully! I will contact you soon.', 'success');
      }, 1500);
    });
  }

  function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // Notification system
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-icon">
        ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : ''}
        ${type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : ''}
        ${type === 'info' ? '<i class="fas fa-info-circle"></i>' : ''}
      </div>
      <div class="notification-message">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 4000);
  }

  // Portfolio filter functionality
  if (portfolioFilters.length > 0 && portfolioItems.length > 0) {
    portfolioFilters.forEach(filter => {
      filter.addEventListener('click', function() {
        // Remove active class from all filters
        portfolioFilters.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked filter
        this.classList.add('active');
        
        const filterValue = this.getAttribute('data-filter');
        
        // Show/hide items based on filter
        portfolioItems.forEach(item => {
          if (filterValue === 'all' || item.classList.contains(filterValue)) {
            item.style.display = 'block';
            setTimeout(() => {
              item.style.transform = 'scale(1)';
              item.style.opacity = '1';
            }, 50);
          } else {
            item.style.transform = 'scale(0.8)';
            item.style.opacity = '0';
            setTimeout(() => {
              item.style.display = 'none';
            }, 300);
          }
        });
      });
    });
  }

  // Tech logo animations and tooltips
  function animateTechLogos() {
    techLogos.forEach((logo, index) => {
      setTimeout(() => {
        logo.classList.add('tech-logo-visible');
      }, index * 50);
      
      // Handle tooltips
      const tooltip = logo.getAttribute('data-tooltip');
      if (tooltip) {
        logo.setAttribute('title', tooltip);
      }
    });
    
    // Add category animation
    techCategories.forEach((category, index) => {
      setTimeout(() => {
        category.classList.add('tech-category-visible');
      }, index * 100);
    });
  }

  // Create an intersection observer for the tech section
  if (techSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateTechLogos();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    
    observer.observe(techSection);
  } else {
    // Fallback if IntersectionObserver isn't supported
    animateTechLogos();
  }
});
