/**
 * Visit Wolaita - Core Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initVideoControls();
  initHeaderScroll();
  initActiveNavHighlight();
  initFormValidation();
});

/* ==========================================================================
   1. BACKGROUND VIDEO CONTROLS & FALLBACK HANDLING
   ========================================================================== */
function initVideoControls() {
  const video = document.getElementById('bgVideo');
  const toggleBtn = document.getElementById('videoToggleBtn');

  if (!video || !toggleBtn) return;

  // Handle Autoplay policy restrictions gracefully
  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Autoplay was prevented by browser policy/low-power mode
      toggleBtn.textContent = 'Play Video ▶';
    });
  }

  // Toggle Video Play/Pause State
  toggleBtn.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      toggleBtn.textContent = 'Pause Video ⏸';
    } else {
      video.pause();
      toggleBtn.textContent = 'Play Video ▶';
    }
  });
}

/* ==========================================================================
   2. STICKY HEADER SCROLL EFFECT
   ========================================================================== */
function initHeaderScroll() {
  const header = document.getElementById('mainHeader');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* ==========================================================================
   3. SCROLL-BASED NAV LINK HIGHLIGHTING
   ========================================================================== */
function initActiveNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.main-nav .nav-link');

  if (!sections.length || !navLinks.length) return;

  window.addEventListener('scroll', () => {
    let currentSectionId = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   4. FORM VALIDATION & INTERACTIVE SUBMISSION
   ========================================================================== */
function initFormValidation() {
  const form = document.getElementById('plannerForm');
  const nameInput = document.getElementById('fullname');
  const emailInput = document.getElementById('email');
  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');
  const statusMsg = document.getElementById('formStatus');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;

    // Reset messages
    nameError.textContent = '';
    emailError.textContent = '';
    nameInput.classList.remove('input-error');
    emailInput.classList.remove('input-error');
    statusMsg.className = 'form-status-msg';

    // Name Validation
    if (!nameInput.value.trim()) {
      nameError.textContent = 'Please enter your full name.';
      nameInput.classList.add('input-error');
      isValid = false;
    }

    // Email Validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim()) {
      emailError.textContent = 'Please enter your email address.';
      emailInput.classList.add('input-error');
      isValid = false;
    } else if (!emailPattern.test(emailInput.value.trim())) {
      emailError.textContent = 'Please enter a valid email address.';
      emailInput.classList.add('input-error');
      isValid = false;
    }

    // Successful Submission Simulation
    if (isValid) {
      statusMsg.textContent = 'Thank you! Your Wolaita travel inquiry has been received. Our team will contact you shortly.';
      statusMsg.classList.add('success');
      form.reset();
    }
  });
}