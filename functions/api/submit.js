export async function onRequestPost(context) {
  try {
    // 1. Get the form data
    const formData = await context.request.formData();
    const data = Object.fromEntries(formData.entries());

    // 1.1 Honeypot Check
    // If a bot fills out the hidden 'website' field, silently succeed without sending the email
    if (data.website) {
      return Response.redirect(new URL('/thanks', context.request.url).toString(), 303);
    }

    // ---------------------------------------------------------
    // 1.2 Turnstile Verification
    // ---------------------------------------------------------
    const turnstileToken = data['cf-turnstile-response'];
    const ip = context.request.headers.get('CF-Connecting-IP');

    if (!turnstileToken) {
      return new Response("Turnstile token missing. Please verify you are human.", { status: 400 });
    }

    let verificationBody = new FormData();
    // Ensure you added TURNSTILE_SECRET_KEY to your Cloudflare Pages environment variables
    verificationBody.append('secret', context.env.TURNSTILE_SECRET_KEY);
    verificationBody.append('response', turnstileToken);
    verificationBody.append('remoteip', ip);

    const verificationResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: verificationBody,
      method: 'POST',
    });

    const outcome = await verificationResult.json();

    if (!outcome.success) {
      return new Response("Turnstile verification failed. Spam detected.", { status: 403 });
    }
    // ---------------------------------------------------------
    // END Turnstile Verification
    // ---------------------------------------------------------

    // 1.5 Validate Email Format
    const emailStr = data.email || '';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailStr)) {
      return new Response(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #191f4f; padding: 20px;">
          <h2>Email Validation Failed</h2>
          <p>The email address "<b>${emailStr}</b>" is not in a valid email format.</p>
          <button onclick="window.history.back()" style="padding: 10px 20px; cursor: pointer; background: #fe9502; color: white; border: none; border-radius: 5px; font-weight: bold;">Go Back</button>
        </div>
      `, { status: 400, headers: { 'Content-Type': 'text/html' } });
    }

    // 1.6 Validate Email Domain (DNS MX Record Check)
    const domain = emailStr.split('@')[1];

    const dnsResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { 'Accept': 'application/dns-json' }
    });

    if (dnsResponse.ok) {
      const dnsData = await dnsResponse.json();
      if (dnsData.Status !== 0 || !dnsData.Answer || dnsData.Answer.length === 0) {
        return new Response(`
          <div style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #191f4f; padding: 20px;">
            <h2>Email Validation Failed</h2>
            <p>The email domain "<b>@${domain}</b>" does not appear to exist or cannot receive emails.</p>
            <button onclick="window.history.back()" style="padding: 10px 20px; cursor: pointer; background: #fe9502; color: white; border: none; border-radius: 5px; font-weight: bold;">Go Back</button>
          </div>
        `, { status: 400, headers: { 'Content-Type': 'text/html' } });
      }
    }

    // 2. Build the email body
    const emailBody = `
      <h2>New Contact Form Inquiry</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Preferred Service:</strong> ${data.service}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${data.message}</p>
    `;

    // 3. Send email using Resend
    const resendApiKey = context.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not defined in the environment variables.");
      // Fallback: still redirect the user so the form submission doesn't fail visually
      return Response.redirect(new URL('/thanks', context.request.url).toString(), 303);
    }

    const recipientEmail = context.env.NOTIFICATION_EMAIL || "hello@mopsinc.com";
    const senderEmail = context.env.FROM_EMAIL || "website@mopsinc.com";

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `Mops Inc. Website <${senderEmail}>`,
        to: [recipientEmail],
        reply_to: data.email,
        subject: `New Mops Inc. Inquiry: ${data.service} - ${data.name}`,
        html: emailBody,
      }),
    });

    // 4. If successful, redirect the user to your custom thanks page
    if (response.ok) {
      return Response.redirect(new URL('/thanks', context.request.url).toString(), 303);
    } else {
      const errorText = await response.text();
      return new Response('Error sending email: ' + errorText, { status: 500 });
    }
  } catch (err) {
    return new Response('Server Error: ' + err.message, { status: 500 });
  }
}
