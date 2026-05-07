// server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3001; // Using port 3001 to avoid conflict if frontend is on 3000

// --- Nodemailer Transporter Setup ---
// This configures how your server will send emails.
// You MUST replace these with your actual email service provider's details.
// Examples: Gmail, SendGrid, Mailgun, Outlook, etc.
// For Gmail, if you have 2FA, you'll need an "App password" instead of your regular password.
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,     // e.g., 'smtp.gmail.com' or 'smtp.sendgrid.net'
    port: parseInt(process.env.EMAIL_PORT, 10), // e.g., 587 for TLS, 465 for SSL
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,     // Your email address (e.g., your_email@gmail.com)
        pass: process.env.EMAIL_PASS     // Your email password or app-specific password
    }
});

// --- Middleware ---
app.use(express.json()); // For parsing application/json requests
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded requests

// --- Tracking Endpoint ---
// This is the URL that your unique email links will point to.
app.get('/track-click', async (req, res) => {
    const { token } = req.query; // Get the 'token' from the URL query parameters

    if (!token) {
        console.error('Tracking Error: No token provided in the URL.');
        // If no token, redirect to a generic page or an error page
        return res.redirect('https://your-frontend-domain.com/index.html?os=Unknown');
    }

    let userEmail = null;
    try {
        // --- IMPORTANT: Token Decryption/Lookup ---
        // In a real, secure application, 'token' should be:
        // 1. A unique, non-guessable ID stored in your database, mapped to a user's email.
        // 2. An encrypted version of the user's email or user ID.
        // NEVER put raw, easily readable email addresses directly in the URL for security/privacy.

        // For this example, we'll assume the token is a Base64 encoded email address.
        // This is for demonstration purposes only. For production, use a database lookup or stronger encryption.
        userEmail = Buffer.from(token, 'base64').toString('utf8');
        console.log(`Tracking: User identified by email: ${userEmail}`);

        // --- Log the click (Optional but Recommended) ---
        // In a real application, you would save this event to a database:
        // e.g., yourDatabase.saveClick({ email: userEmail, timestamp: new Date(), link: req.originalUrl });
        console.log(`Tracking: Click event logged for ${userEmail}`);

        // --- Send Follow-up Email ---
        const mailOptions = {
            from: process.env.EMAIL_USER, // Sender address (must match your EMAIL_USER)
            to: userEmail,                // Recipient address (the user who clicked)
            subject: 'Your Follow-up Message!', // Subject line of the second email
            html: `
                <p>Hello ${userEmail},</p>
                <p>Thank you for clicking our link! We've registered your interest.</p>
                <p>Here is the follow-up information you requested.</p>
                <p>Best regards,</p>
                <p>The Team</p>
            ` // HTML body of the second email
        };

        await transporter.sendMail(mailOptions);
        console.log(`Tracking: Follow-up email successfully sent to ${userEmail}`);

    } catch (error) {
        console.error(`Tracking Error: Failed to process click or send email for token "${token}":`, error);
        // Implement robust error handling here (e.g., log to an error tracking service, send admin alert)
    }

    // --- Redirect the user to your frontend landing page ---
    // IMPORTANT: Replace 'https://your-frontend-domain.com' with the actual URL where your landing.html is hosted.
    // The 'os' parameter will be detected by landing.html.
    res.redirect('https://your-frontend-domain.com/landing.html');
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Tracking endpoint: http://localhost:${PORT}/track-click?token=YOUR_ENCODED_EMAIL`);
    console.log(`Remember to replace 'https://your-frontend-domain.com' in the redirect with your actual domain.`);
});