const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { connectDB } = require('./db.cjs');

// Get current date string formatted as YYYY-MM-DD in local time
const getLocalDateString = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 10);
};

// Scheduler: Runs every day at 8:00 PM (20:00)
cron.schedule('0 20 * * *', async () => {
  console.log(`[Cron Task - 8:00 PM] Starting daily stock check...`);
  let db;
  try {
    db = await connectDB();
    const today = getLocalDateString();
    
    // Check if daily stock was uploaded for today
    const upload = await db.collection('manual_stock_uploads').findOne({ date: today });
    if (upload) {
      console.log(`[Cron Task] Daily stock upload verified for ${today}. No alert needed.`);
      return;
    }
    
    console.log(`[Cron Task] Daily stock NOT uploaded for ${today}! Attempting to send email alert...`);
    
    // Fetch SMTP config
    const config = await db.collection('settings').findOne({ _id: 'email_notifications' });
    if (!config || !config.smtp_user || !config.smtp_pass || !config.recipient_email) {
      console.warn(`[Cron Warning] SMTP email alerts are not configured. Skipped sending email.`);
      return;
    }
    
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      }
    });
    
    await transporter.sendMail({
      from: `"Uncompromised Stock Alert" <${config.smtp_user}>`,
      to: config.recipient_email,
      subject: `⚠️ Missing Daily Stock Update - ${today}`,
      text: `Alert: The daily stock template has not been uploaded for today (${today}) by 8:00 PM. Please login to the dashboard and upload the stock template.`
    });
    
    console.log(`[Cron Task] Stock alert email successfully sent to ${config.recipient_email}`);
  } catch (err) {
    console.error(`[Cron Error] Error in daily stock cron check:`, err);
  }
});

console.log('[Cron Scheduler] Daily stock upload checker initialized (Scheduled for 8:00 PM daily).');
