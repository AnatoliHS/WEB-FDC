document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;

  const emailInput = document.getElementById('contact-email');
  const emailError = document.getElementById('email-error-msg');
  const formStatus = document.getElementById('form-status-msg');
  const submitBtn = document.getElementById('form-submit');
  const formFields = contactForm.querySelectorAll('input, select, textarea');

  // Utility to show error on email field
  function showEmailError(msg) {
    emailInput.closest('.form-group').classList.add('has-error');
    emailError.textContent = msg;
    emailError.style.display = 'block';
  }

  // Utility to clear email error
  function clearEmailError() {
    emailInput.closest('.form-group').classList.remove('has-error');
    emailError.textContent = '';
    emailError.style.display = 'none';
  }

  // Utility to show form status (general success or error)
  function showFormStatus(msg, type = 'error') {
    formStatus.textContent = msg;
    formStatus.className = `form-status-msg ${type}`;
    formStatus.style.display = 'block';
  }

  // Utility to clear form status
  function clearFormStatus() {
    formStatus.textContent = '';
    formStatus.style.display = 'none';
  }

  // Dynamic clear on input/typing
  emailInput.addEventListener('input', () => {
    clearEmailError();
    clearFormStatus();
  });

  // Verify email format and domain MX record
  async function validateEmail(email) {
    // 1. Format Regex Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Please enter a valid email format (e.g., name@domain.com).' };
    }

    // 2. Extract domain and check DNS MX Record
    const domain = email.split('@')[1];
    try {
      const dnsUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`;
      const response = await fetch(dnsUrl, {
        headers: {
          'Accept': 'application/dns-json'
        }
      });

      if (!response.ok) {
        // If the DNS API fails, we skip this check and let the form submit to be safe
        console.warn('DNS API check failed to respond. Bypassing domain verification.');
        return { valid: true };
      }

      const dnsData = await response.json();
      
      // Status 0 is NOERROR in DNS. Answer should contain records.
      if (dnsData.Status !== 0 || !dnsData.Answer || dnsData.Answer.length === 0) {
        return { valid: false, message: `The domain "@${domain}" is not a valid email-receiving domain. Please double-check your spelling.` };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error verifying email domain via DNS:', error);
      // Fallback: don't block user if network fails
      return { valid: true };
    }
  }

  // Handle Form Submit
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearEmailError();
    clearFormStatus();

    const email = emailInput.value.trim();
    if (!email) return;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying email...';
    formFields.forEach(field => field.disabled = true);

    // Validate email format and domain
    const validation = await validateEmail(email);
    if (!validation.valid) {
      showEmailError(validation.message);
      
      // Re-enable form fields
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
      formFields.forEach(field => field.disabled = false);
      return;
    }

    // Prepare form data
    const formData = new FormData(contactForm);

    // Validate Cloudflare Turnstile token
    const turnstileContainer = contactForm.querySelector('.cf-turnstile');
    if (turnstileContainer) {
      const turnstileResponse = formData.get('cf-turnstile-response');
      if (!turnstileResponse) {
        showFormStatus('Please complete the security check.', 'error');
        
        // Re-enable form fields
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        formFields.forEach(field => field.disabled = false);
        return;
      }
    }

    submitBtn.textContent = 'Sending message...';

    try {
      const submitResponse = await fetch(contactForm.action || '/api/submit', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json, text/html'
        }
      });

      if (submitResponse.ok) {
        // If redirected to thank you page, follow it
        if (submitResponse.redirected) {
          window.location.href = submitResponse.url;
        } else {
          // Fallback if no redirect header: redirect manually
          window.location.href = '/thanks';
        }
      } else {
        const errorText = await submitResponse.text();
        let errorMsg = 'An error occurred while sending your message. Please try again.';
        
        // Try parsing error message if it's simple text
        if (errorText && errorText.length < 200 && !errorText.includes('<html')) {
          errorMsg = errorText;
        }
        
        showFormStatus(errorMsg, 'error');
        
        // Re-enable form fields
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        formFields.forEach(field => field.disabled = false);
        
        // Reset turnstile if it exists to allow re-submission
        if (window.turnstile) {
          window.turnstile.reset();
        }
      }
    } catch (err) {
      console.error('Submit connection error:', err);
      showFormStatus('Unable to connect to the server. Please check your internet connection.', 'error');
      
      // Re-enable form fields
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
      formFields.forEach(field => field.disabled = false);
      
      if (window.turnstile) {
        window.turnstile.reset();
      }
    }
  });
});
