// server.js 

// Load environment variables from .env file 
require('dotenv').config(); 

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors'); // Added: Import cors middleware
const app = express();
const PORT = process.env.PORT || 3001; // Using port 3001 to avoid conflict if frontend is on 3000

const fs = require('fs').promises; // Added: To read file system promises
const path = require('path');     // Added: To resolve file paths

// --- CORS Configuration ---
// Allow requests from your Vercel frontend domain
const corsOptions = {
    origin: 'https://security-khaki-beta.vercel.app',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions)); // Added: Use CORS middleware

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

// --- Geolocation Proxy Endpoint ---
app.get('/api/geolocation', async (req, res) => {
    try {
        const apiKey = process.env.FINDIP_API_KEY;
        if (!apiKey) {
            console.error('FINDIP_API_KEY is not set in environment variables.');
            return res.status(500).json({ error: 'Server configuration error: API key missing.' });
        }

        const findipResponse = await fetch(`https://api.findip.net/?token=${apiKey}`);
        if (!findipResponse.ok) {
            const errorText = await findipResponse.text();
            console.error(`findip.net API error: ${findipResponse.status} - ${errorText}`);
            return res.status(findipResponse.status).json({ error: 'Failed to fetch geolocation data from external API.' });
        }

        const data = await findipResponse.json();
        res.json(data); // Send the findip.net response directly to the client

    } catch (error) {
        console.error('Error in geolocation proxy:', error);
        res.status(500).json({ error: 'Internal server error while fetching geolocation.' });
    }
});

// --- Tracking Endpoint ---
// This is the URL that your unique email links will point to.
app.get('/api/track-click', async (req, res) => { 
    const { token } = req.query; // Get the 'token' from the URL query parameters 

    if (!token) { 
        console.error('Tracking Error: No token provided in the URL.'); 
        // If no token, redirect to a generic page or an error page 
        return res.redirect('/public/index.html?os=Unknown'); // Corrected URL string
    } 

    let userEmail = null; 
    let firstName = 'User'; // Default value for firstName
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

        // You might extract firstName from userEmail or a database lookup
        const nameMatch = userEmail.match(/^([^@]+)/);
        if (nameMatch && nameMatch[1]) {
            firstName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
        }

        // --- Log the click (Optional but Recommended) --- 
        // In a real application, you would save this event to a database: 
        // e.g., yourDatabase.saveClick({ email: userEmail, timestamp: new Date(), link: req.originalUrl }); 
        console.log(`Tracking: Click event logged for ${userEmail}`); 

        // --- Read the email template file ---
        const templatePath = path.join(__dirname, '..', 'public', 'email_template.html'); // Assuming email_template.html is in the same directory as server.js
        let emailHtmlContent = await fs.readFile(templatePath, 'utf8');

        // --- Replace placeholders ---
        emailHtmlContent = emailHtmlContent.replace(/{{firstName}}/g, firstName);
        emailHtmlContent = emailHtmlContent.replace(/{{timestamp}}/g, new Date().toLocaleString());

        // --- Send Follow-up Email --- 
        const mailOptions = { 
            from: process.env.EMAIL_USER, // Sender address (must match your EMAIL_USER) 
            to: userEmail,                // Recipient address (the user who clicked) 
            subject: 'Review', // Updated subject for the new template
            html: emailHtmlContent // Use the dynamically generated HTML content
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
    res.redirect('/public/index.html'); // Corrected URL string
}); 

// --- Start the Server --- 
// For Vercel deployment, export the app
console.log(`Tracking endpoint: http://localhost:${PORT}/api/track-click?token=YOUR_ENCODED_EMAIL`);
module.exports = app;