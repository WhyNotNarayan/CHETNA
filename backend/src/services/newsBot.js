const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const prisma = require('../lib/prisma');

// Targeting the popular local news site
const TARGET_URL = 'https://kokansadlive.com/';

// Keywords that flag an article as relevant to the CHETNA safety app 
// Supports both Marathi and English words common in local journalism
const SAFETY_KEYWORDS = [
  'accident', 'अपघात', 
  'क्राईम', 'crime', 'खून', 
  'धोका', 'धोकादायक', 'सुरक्षा', 'safety', 
  'पोलिस', 'police', 'अटक', 'arrest', 
  'चोरी', 'theft', 'दरोडा', 'रस्ता अपघात', 'road accident',
  'warning', 'alert', 'इशारा', 'अलर्ट', 
  'fire', 'आग', 'गुंड', 'बलात्कार'
];

// Determine the type of news based on title content for UI highlighting
const categorizeNews = (title) => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('अपघात') || lowerTitle.includes('accident') || lowerTitle.includes('fire') || lowerTitle.includes('आग')) {
    return 'ACCIDENT';
  } else if (lowerTitle.includes('धोका') || lowerTitle.includes('warning') || lowerTitle.includes('alert') || lowerTitle.includes('इशारा')) {
    return 'WARNING';
  } else {
    // If it's crime/police related but not an immediate hazard
    return 'INFO';
  }
};

const runScraper = async () => {
  console.log('\n🤖 [NewsBot] Waking up to check Kokan Sad Live for Sindhudurg safety alerts...');
  try {
    const { data } = await axios.get(TARGET_URL);
    const $ = cheerio.load(data);
    
    // These selectors target the typical title structures in news WordPress themes
    const selectors = 'h3 a, h2 a, .entry-title a, .jeg_post_title a, .td-module-title a';
    
    const articles = [];
    
    $(selectors).each((i, el) => {
      const title = $(el).text().trim();
      
      // 1. Is it about Sindhudurg?
      const isAboutSindhudurg = title.includes('सिंधुदुर्ग') || 
                                title.includes('Sindhudurg') || 
                                title.includes('सावंतवाडी') || 
                                title.includes('कणकवली') || 
                                title.includes('कुडाळ') || 
                                title.includes('वेंगुर्ले') ||
                                title.includes('मालवण') ||
                                title.includes('देवगड');
      
      // 2. Is it a safety issue?
      const containsSafetyKeyword = SAFETY_KEYWORDS.some(keyword => title.toLowerCase().includes(keyword));
      
      if (isAboutSindhudurg && containsSafetyKeyword) {
          articles.push(title);
      }
    });

    // Remove random duplicates pulled from different parts of the homepage
    const uniqueArticles = [...new Set(articles)];

    if (uniqueArticles.length === 0) {
      console.log('🕊️ [NewsBot] No new safety alerts found in Sindhudurg right now. Returning to sleep.\n');
      return;
    }

    console.log(`🚨 [NewsBot] Found ${uniqueArticles.length} relevant safety alerts! Processing...`);

    let newAdded = 0;
    for (const title of uniqueArticles) {
      // Check if this exact news is already in our database to prevent spamming the feed
      const existing = await prisma.news.findFirst({
        where: { title }
      });

      if (!existing) {
        const type = categorizeNews(title);
        await prisma.news.create({
          data: {
            title: title,
            content: `📍 [Auto-Alert via Kokan Sad Live]: ${title}. Please stay vigilant in this area.`,
            type: type
          }
        });
        console.log(`✅ [NewsBot] Auto-Posted: [${type}] ${title}`);
        newAdded++;
      }
    }
    
    if (newAdded === 0) {
      console.log('🔄 [NewsBot] All alerts were already in the database. Nothing new to post.\n');
    } else {
      console.log(`🚀 [NewsBot] Successfully auto-posted ${newAdded} new alerts to the CHETNA app!\n`);
    }
    
  } catch (error) {
    console.error('❌ [NewsBot] Failed to scrape site:', error.message);
  }
};

const startNewsBot = () => {
  // Run bot immediately upon server startup
  runScraper();
  
  // Set the "Alarm Clock" - this tells the bot to run at the start of every hour (e.g. 1:00, 2:00)
  cron.schedule('0 * * * *', () => {
    runScraper();
  });
  
  console.log('🕒 CHETNA NewsBot scheduler started. Monitoring Kokan Sad Live hourly.');
};

module.exports = { startNewsBot, runScraper };
