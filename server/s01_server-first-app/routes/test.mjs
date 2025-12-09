import express from 'express';
import { EmailService } from '../lib/email/emailService.mjs';

const router = express.Router();
const emailService = new EmailService();

router.post('/send-email', async (req, res) => {
    console.log('[TEST ROUTE] Email test request received');
    try {
        const { to, subject, message } = req.body;
        console.log('[TEST ROUTE] Request body:', { to, subject, message });

        if (!to || !subject || !message) {
            console.log('[TEST ROUTE] Missing fields');
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log('[TEST ROUTE] Calling emailService.sendTestEmail');
        await emailService.sendTestEmail(to, subject, message);
        console.log('[TEST ROUTE] Email sent successfully');

        res.json({ 
            success: true, 
            message: 'Email sent successfully' 
        });
    } catch (error) {
        console.error('[TEST ROUTE] Email test error:', error);
        res.status(500).json({ 
            error: 'Failed to send email',
            details: error.message 
        });
    }
});

export default router;
