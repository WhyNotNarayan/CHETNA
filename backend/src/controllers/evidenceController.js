const prisma = require('../lib/prisma');

// 1. API: Fetch evidence JSON payload if token is valid and not expired
exports.getEvidenceData = async (req, res) => {
  try {
    const { token } = req.params;

    const alert = await prisma.alert.findUnique({
      where: { evidenceToken: token },
      include: {
        user: {
          select: { fullName: true, phone: true }
        },
        tracking: {
          orderBy: { createdAt: 'asc' }
        },
        evidence: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Invalid evidence token.' });
    }

    // Check expiration (24h)
    const now = new Date();
    if (alert.evidenceExpiresAt && now > new Date(alert.evidenceExpiresAt)) {
      return res.status(410).json({ success: false, message: 'This secure evidence link has expired.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      girlName: alert.user.fullName,
      sosTime: alert.createdAt,
      status: alert.status,
      tracking: alert.tracking.map(t => ({ lat: t.latitude, lng: t.longitude, time: t.createdAt })),
      evidence: alert.evidence.map(e => ({
        url: e.fileUrl.startsWith('http') ? e.fileUrl : `${baseUrl}${e.fileUrl}`,
        type: e.fileType,
        time: e.createdAt
      }))
    });
  } catch (error) {
    console.error('Fetch Evidence Data Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// 2. Web: Render rich HTML5 evidence dashboard
exports.renderEvidencePage = async (req, res) => {
  try {
    const { token } = req.params;

    // First, do a light check on the token
    const alert = await prisma.alert.findUnique({
      where: { evidenceToken: token },
      select: { evidenceExpiresAt: true }
    });

    if (!alert) {
      return res.status(404).send(getErrorPage('Invalid Link', 'This evidence tracking link is invalid or does not exist.'));
    }

    const now = new Date();
    if (alert.evidenceExpiresAt && now > new Date(alert.evidenceExpiresAt)) {
      return res.status(410).send(getErrorPage('Link Expired', 'This secure evidence link expired after 24 hours of safety monitoring.'));
    }

    // Return the premium dashboard HTML
    res.send(getDashboardPage(token));
  } catch (error) {
    res.status(500).send(getErrorPage('Error', 'An internal server error occurred while loading this page.'));
  }
};

// Error page template
function getErrorPage(title, message) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chetna Safety - Access Denied</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
      body {
        margin: 0;
        background: #0d0d12;
        color: #f3f4f6;
        font-family: 'Outfit', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        text-align: center;
        padding: 20px;
      }
      .card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 40px;
        border-radius: 24px;
        max-width: 450px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      h1 {
        color: #ff3b30;
        font-weight: 800;
        margin-top: 0;
      }
      p {
        color: #9ca3af;
        line-height: 1.6;
        font-size: 16px;
      }
      .logo {
        font-size: 32px;
        font-weight: 800;
        background: linear-gradient(135deg, #ff2d55, #af52de);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">CHETNA SAFETY</div>
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </body>
  </html>
  `;
}

// Live Dashboard HTML Page
function getDashboardPage(token) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chetna Safety - Secure Evidence Tracker</title>
    
    <!-- Typography & Leaflet Map CSS -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <style>
      :root {
        --primary: #ff2d55;
        --secondary: #af52de;
        --bg: #09090e;
        --card-bg: rgba(255, 255, 255, 0.03);
        --border: rgba(255, 255, 255, 0.08);
        --text: #f3f4f6;
        --text-muted: #9ca3af;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: 'Outfit', sans-serif;
        padding-bottom: 40px;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 5%;
        border-bottom: 1px solid var(--border);
        background: rgba(9, 9, 14, 0.8);
        backdrop-filter: blur(10px);
        position: sticky;
        top: 0;
        z-index: 1000;
      }
      .logo {
        font-size: 24px;
        font-weight: 900;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .badge {
        background: rgba(255, 45, 85, 0.15);
        color: #ff3b30;
        border: 1px solid rgba(255, 45, 85, 0.3);
        padding: 6px 14px;
        border-radius: 50px;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.5px;
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
      }
      .container {
        max-width: 1200px;
        margin: 30px auto;
        padding: 0 20px;
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 30px;
      }
      @media(max-width: 900px) {
        .container {
          grid-template-columns: 1fr;
        }
      }
      .card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 25px;
        overflow: hidden;
      }
      h2 {
        font-size: 20px;
        font-weight: 700;
        margin-top: 0;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      #map {
        height: 500px;
        border-radius: 16px;
        border: 1px solid var(--border);
      }
      .evidence-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-height: 500px;
        overflow-y: auto;
      }
      .evidence-item {
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 15px;
      }
      .meta {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
      }
      video, audio {
        width: 100%;
        border-radius: 8px;
        margin-top: 5px;
        background: #000;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .info-row:last-child {
        border-bottom: none;
      }
      .info-label {
        color: var(--text-muted);
        font-weight: 600;
        font-size: 14px;
      }
      .info-value {
        font-weight: 700;
        font-size: 14px;
      }
      .expiry-note {
        font-size: 11px;
        color: #ff9500;
        text-align: center;
        margin-top: 15px;
        background: rgba(255, 149, 0, 0.1);
        padding: 8px;
        border-radius: 8px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="logo">CHETNA SAFETY PORTAL</div>
      <div class="badge" id="status-badge">SAFETY ACTIVE</div>
    </header>

    <div class="container">
      <!-- Left Column: Map Route -->
      <div class="card">
        <h2>📍 Live Emergency GPS Path</h2>
        <div id="map"></div>
      </div>

      <!-- Right Column: Info & Media Evidence -->
      <div style="display: flex; flex-direction: column; gap: 30px;">
        <div class="card">
          <h2>ℹ️ Incident Information</h2>
          <div class="info-row">
            <span class="info-label">Victim Name</span>
            <span class="info-value" id="victim-name">Loading...</span>
          </div>
          <div class="info-row">
            <span class="info-label">SOS Trigger Time</span>
            <span class="info-value" id="trigger-time">-</span>
          </div>
          <div class="info-row">
            <span class="info-label">Current Status</span>
            <span class="info-value" id="sos-status">-</span>
          </div>
          <div class="expiry-note">
            ⚠️ This secure evidence link expires exactly 24 hours after activation.
          </div>
        </div>

        <div class="card">
          <h2>🎥 Uploaded Evidence (Real-time Sync)</h2>
          <div class="evidence-list" id="evidence-container">
            <p style="text-align: center; color: var(--text-muted);">Waiting for device upload...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const token = "${token}";
      let map, pathLine, markerGroup;
      let lastLatLngs = [];

      function initMap() {
        map = L.map('map').setView([15.8497, 73.7997], 13); // Default to Sindhudurg/Malvan coords
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        markerGroup = L.layerGroup().addTo(map);
        pathLine = L.polyline([], { color: '#ff2d55', weight: 5, opacity: 0.8 }).addTo(map);
      }

      async function refreshData() {
        try {
          const res = await fetch('/evidence/data/' + token);
          const data = await res.json();
          if (!data.success) {
            alert(data.message);
            window.location.reload();
            return;
          }

          // 1. Update text metadata
          document.getElementById('victim-name').innerText = data.girlName;
          document.getElementById('trigger-time').innerText = new Date(data.sosTime).toLocaleString();
          document.getElementById('sos-status').innerText = data.status;
          document.getElementById('status-badge').innerText = data.status === 'ACTIVE' ? 'SAFETY ACTIVE' : 'RESOLVED';
          document.getElementById('status-badge').style.borderColor = data.status === 'ACTIVE' ? 'rgba(255, 45, 85, 0.3)' : 'rgba(76, 175, 80, 0.3)';
          document.getElementById('status-badge').style.color = data.status === 'ACTIVE' ? '#ff3b30' : '#4CAF50';
          document.getElementById('status-badge').style.background = data.status === 'ACTIVE' ? 'rgba(255, 45, 85, 0.15)' : 'rgba(76, 175, 80, 0.15)';

          // 2. Update Map Path
          markerGroup.clearLayers();
          const latlngs = data.tracking.map(t => [t.lat, t.lng]);
          pathLine.setLatLngs(latlngs);

          if (latlngs.length > 0) {
            // Put marker on start point (green)
            L.circleMarker(latlngs[0], { radius: 8, color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 1 }).addTo(markerGroup).bindPopup('Trigger Location');
            
            // Put pulsing marker on latest location (red)
            const latest = latlngs[latlngs.length - 1];
            L.circleMarker(latest, { radius: 10, color: '#ff2d55', fillColor: '#ff2d55', fillOpacity: 1 }).addTo(markerGroup).bindPopup('Current Location');

            map.panTo(latest);
          }

          // 3. Render Evidence Files
          const container = document.getElementById('evidence-container');
          if (data.evidence.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size:14px; margin-top:20px;">Waiting for device upload...</p>';
          } else {
            container.innerHTML = data.evidence.map(e => {
              const fileTime = new Date(e.time).toLocaleTimeString();
              const isVideo = e.type === 'VIDEO';
              return \`
                <div class="evidence-item">
                  <div class="meta">
                    <strong>\${e.type} RECORDING</strong>
                    <span>\${fileTime}</span>
                  </div>
                  \${isVideo ?
                    \\\`<video src="\\\${e.url}" type="video/mp4" controls preload="metadata" playsinline></video>\\\` :
                    \\\`<audio src="\\\${e.url}" type="audio/mpeg" controls></audio>\\\`
                  }
                </div>
              \`;
            }).join('');
          }
        } catch (err) {
          console.error("Refresh Error:", err);
        }
      }

      window.onload = () => {
        initMap();
        refreshData();
        // Refresh every 10 seconds
        setInterval(refreshData, 10000);
      };
    </script>
  </body>
  </html>
  `;
}

exports.getLatestEvidenceToken = async (req, res) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { evidenceToken: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, evidenceToken: true, createdAt: true, status: true }
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'No alerts with evidence tokens found.' });
    }

    res.json({ success: true, alert });
  } catch (error) {
    console.error('Get Latest Token Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.inspectFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    const buffer = Buffer.alloc(100);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 100, 0);
    fs.closeSync(fd);

    res.json({
      filename,
      size: stats.size,
      hex: buffer.toString('hex'),
      ascii: buffer.toString('ascii').replace(/[^\x20-\x7E]/g, '.'),
      isBase64Text: buffer.toString('ascii').startsWith('data:') || buffer.toString('ascii').startsWith('AAAA') || /^[A-Za-z0-9+/=]+$/.test(buffer.toString('ascii').substring(0, 30))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
