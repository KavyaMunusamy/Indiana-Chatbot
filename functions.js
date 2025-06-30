const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json'); // Add your Firebase key here

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// MAIN FUNCTION HANDLER
const handleFunctionCall = {
  listFunctions: () => [
    {
      name: "report_hazard",
      description: "Report a civic hazard in the city.",
      parameters: {
        type: "object",
        properties: {
          hazard_type: { type: "string" },
          location: { type: "string" },
          description: { type: "string" }
        },
        required: ["hazard_type", "location"]
      }
    },
    {
      name: "get_nearby_resource",
      description: "Find nearby police stations or hospitals.",
      parameters: {
        type: "object",
        properties: {
          resource_type: { type: "string" },
          location: { type: "string" }
        },
        required: ["resource_type", "location"]
      }
    },
    {
      name: "get_report_status",
      description: "Check status of a previously reported hazard.",
      parameters: {
        type: "object",
        properties: {
          report_id: { type: "string" }
        },
        required: ["report_id"]
      }
    },
    {
      name: "push_alert",
      description: "Send an emergency alert to citizens.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" }
        },
        required: ["message"]
      }
    },
    {
      name: "analyze_sentiment",
      description: "Analyze user message sentiment.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" }
        },
        required: ["text"]
      }
    },
    {
      name: "translate_text",
      description: "Translate text to target language using OpenAI.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" },
          target_lang: { type: "string" }
        },
        required: ["text", "target_lang"]
      }
    },
    {
      name: "get_safety_tips",
      description: "Get safety tips for Indianapolis.",
      parameters: {
        type: "object",
        properties: {
          tip_type: { type: "string" }
        },
        required: ["tip_type"]
      }
    }
  ],

  callFunction: async (funcCall) => {
    const { name, arguments: args } = funcCall;
    const params = JSON.parse(args);

    switch (name) {
      // 1. Report Hazard
      case "report_hazard":
        const docRef = await db.collection('HazardReports').add({
          hazard_type: params.hazard_type,
          location: params.location,
          description: params.description,
          timestamp: new Date(),
          status: "Reported"
        });
        return `Hazard reported with ID: ${docRef.id}`;

      // 2. Get Nearby Resource (Police/Hospital)
      case "get_nearby_resource":
        const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${params.resource_type}+in+${params.location}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const googleRes = await axios.get(googleUrl);
        const places = googleRes.data.results.slice(0, 3).map(place => place.name);
        return `Nearby ${params.resource_type}: ${places.join(", ")}`;

      // 3. Get Report Status
      case "get_report_status":
        const report = await db.collection('HazardReports').doc(params.report_id).get();
        if (!report.exists) return "Report not found.";
        const data = report.data();
        return `Report Status: ${data.status}`;

      // 4. Push Alert
      case "push_alert":
        // For real push notifications, integrate Firebase Cloud Messaging (not included here)
        console.log("ALERT:", params.message);
        return `Emergency Alert sent: ${params.message}`;

      // 5. Analyze Sentiment using Groq
      case "analyze_sentiment":
        const aiRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: "llama-3.3-70b-versatile", // Updated Groq model
          messages: [
            { role: "system", content: "You are a helpful sentiment analyzer." },
            { role: "user", content: `Analyze the sentiment of: ${params.text}` }
          ]
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          }
        });
        return aiRes.data.choices[0].message.content;

      // 6. Translate Text using Groq (no Google API)
      case "translate_text":
        const translationRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a translator. Detect the input language and translate as needed." },
            { role: "user", content: `Translate this to ${params.target_lang}: ${params.text}` }
          ]
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          }
        });
        return translationRes.data.choices[0].message.content;

      // 7. Get Safety Tips
      case "get_safety_tips":
        const tips = {
          fire: "Install smoke alarms on every floor.",
          flood: "Have an evacuation plan ready.",
          general: "Stay informed through official news sources."
        };
        return tips[params.tip_type] || "No tips available for this category.";

      default:
        return "Unknown function called.";
    }
  }
};

module.exports = { handleFunctionCall };

// Add support for media (image/video) upload, language auto-detection, city API integration, and push notifications.
