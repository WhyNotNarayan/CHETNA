const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// These are mocked "Official Truth" sources for Sindhudurg
// In a real production, you'd replace this with a News API or RSS fetcher
const SINDHUDURG_SOURCES = [
  { title: "Heavy rain alert in Sawantwadi", content: "Met Dept warns of high tides and heavy rainfall in coastal areas of Sindhudurg.", source: "District Weather Console" },
  { title: "Traffic diversion on Kudal Bridge", content: "Repair work starts tonight. Commuters advised to use the bypass road.", source: "Sindhudurg Traffic Police" },
  { title: "Navratri security increased in Malvan", content: "Local authorities deploy extra personnel for festive security.", source: "Malvan Administration" },
  { title: "Minor Accident near Kudal", content: "Light vehicle collision reported. Traffic moving slow. Drive safe.", source: "Rapid Response Unit", type: "ACCIDENT" },
  { title: "Vengurla Beach Safety Notice", content: "Strong currents detected. Tourists advised not to enter deep water today.", source: "Coastal Security" },
  { title: "Konkan Railway Update", content: "Jan Shatabdi running 15 mins late due to technical check at Kankavli.", source: "Railway Bulletin" },
  { title: "Health Camp in Sawantwadi", content: "Free medical checkup camp organized at District Hospital tomorrow 10 AM.", source: "Health Dept" },
  { title: "Power outage in Kudal MIDC", content: "Maintenance work scheduled from 2 PM to 5 PM today.", source: "MSEDCL Updates" },
];

exports.getLatestNews = async (req, res) => {
  try {
    // 1. Fetch current news
    let news = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 2. AGGRESSIVE NEWS BOT LOGIC (NO SLEEP) 🤖📡
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000));
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const latestNewsDate = news.length > 0 ? new Date(news[0].createdAt) : null;
    
    // Check if news is older than 4 hours
    if (!latestNewsDate || latestNewsDate < fourHoursAgo) {
      console.log("News Bot: Searching for fresh Sindhudurg updates...");
      
      // Strict Cleanup: Delete bot news older than 24 hours
      await prisma.news.deleteMany({
        where: {
          source: { in: SINDHUDURG_SOURCES.map(s => s.source) },
          createdAt: { lt: twentyFourHoursAgo }
        }
      });

      // Inject 3 random fresh items from our "Search Sources"
      const shuffled = SINDHUDURG_SOURCES.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);

      const freshNewsData = selected.map((n, index) => {
        const itemDate = new Date();
        // Randomize the time slightly within the last hour
        itemDate.setMinutes(itemDate.getMinutes() - (index * 15 + Math.floor(Math.random() * 10))); 
        
        return {
          title: n.title,
          content: n.content,
          source: n.source,
          type: n.type || "INFO",
          createdAt: itemDate
        };
      });

      await prisma.news.createMany({ data: freshNewsData });
      
      news = await prisma.news.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      });
    }

    res.json({ success: true, news });
  } catch (error) {
    console.error("News Bot Error:", error);
    res.status(500).json({ success: false, message: "News Bot is busy searching..." });
  }
};

exports.addNews = async (req, res) => {
  try {
    const { title, content, source, latitude, longitude, type } = req.body;
    const news = await prisma.news.create({
      data: { title, content, source, latitude, longitude, type }
    });
    res.json({ success: true, news });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add manual news" });
  }
};
