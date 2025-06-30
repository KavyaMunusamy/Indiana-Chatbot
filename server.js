require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { handleFunctionCall } = require('./functions');
const axios = require('axios');
const mongoose = require('mongoose');
const multer = require('multer');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGODB_URI);

const reportSchema = new mongoose.Schema({
  type: String, // 'text', 'image', 'voice'
  content: String, // text or file path
  createdAt: { type: Date, default: Date.now }
});

const Report = mongoose.model('Report', reportSchema);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const OFFICIALS_PHONE_NUMBER = process.env.OFFICIALS_PHONE_NUMBER;

app.post('/chat', async (req, res) => {
  const { message, lang } = req.body;

  // Map language codes to full names for a clearer AI prompt
  const langMap = {
    'en-US': 'English',
    'ta-IN': 'Tamil'
  };
  const languageName = langMap[lang] || 'English';

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a helpful assistant. You must respond ONLY in ${languageName}.` },
        { role: 'user', content: message }
      ],
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Groq API error:', error.response ? error.response.data : error.message);
    res.status(500).send('Error generating response');
  }
});

// Text report
app.post('/report/text', async (req, res) => {
  const { content } = req.body;
  const report = new Report({ type: 'text', content });
  await report.save();

  // Send email
  await transporter.sendMail({
    from: 'kavyam.aiml2023@citchennai.net',
    to: 'aboutkavya28@gmail.com',
    subject: 'New Civic Issue Reported',
    text: content
  });

  // Send SMS to all officials
  const officials = process.env.OFFICIALS_PHONE_NUMBER.split(',');
  for (const number of officials) {
    await twilioClient.messages.create({
      body: `New Civic Issue: ${content}`,
      from: TWILIO_PHONE_NUMBER,
      to: number.trim()
    });
  }

  res.json({ message: 'Report submitted and officials notified.' });
});

// Image report
app.post('/report/image', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;
  const report = new Report({ type: 'image', content: imagePath });
  await report.save();

  // Send email with image attachment
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: 'aboutkavya28@gmail.com',
    subject: 'New Civic Issue Reported (Image)',
    text: 'A new issue has been reported with an image.',
    attachments: [{ path: imagePath }]
  });

  // Send SMS to all officials
  const officials = process.env.OFFICIALS_PHONE_NUMBER.split(',');
  for (const number of officials) {
    await twilioClient.messages.create({
      body: `New Civic Issue reported with an image. Check your email for details.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: number.trim()
    });
  }

  res.json({ message: 'Image report submitted and officials notified.' });
});

// Voice report (assuming voice file upload)
app.post('/report/voice', upload.single('voice'), async (req, res) => {
  const voicePath = req.file.path;
  const report = new Report({ type: 'voice', content: voicePath });
  await report.save();

  // Send email with voice attachment
  await transporter.sendMail({
    from: 'YOUR_EMAIL@gmail.com',
    to: 'OFFICIAL_EMAIL@gmail.com',
    subject: 'New Civic Issue Reported (Voice)',
    text: 'A new issue has been reported with a voice message.',
    attachments: [{ path: voicePath }]
  });

  // Send SMS
  await twilioClient.messages.create({
    body: `New Civic Issue reported with a voice message. Check your email for details.`,
    from: TWILIO_PHONE_NUMBER,
    to: OFFICIALS_PHONE_NUMBER
  });

  res.json({ message: 'Voice report submitted and officials notified.' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
