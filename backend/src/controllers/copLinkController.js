const prisma = require('../lib/prisma');

// Secret cops stay anonymous to girls — same format as the verified-cops map endpoint
const anonCopName = (copId) => `Secret Cop #${String(copId).slice(-4)}`;

const isGirl = (req) => req.user?.role === 'GIRL';
const isSecretCop = (req) => req.user?.role === 'SECRET_COP';

// Girl or cop: all links involving me (shaped per requester role for privacy)
exports.getMyLinks = async (req, res) => {
  try {
    const me = req.user.id;
    const role = req.user.role;

    const links = await prisma.copLink.findMany({
      where: { OR: [{ girlId: me }, { copId: me }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        cop: { select: { id: true, fullName: true, profession: true } },
        girl: { select: { id: true, fullName: true } }
      }
    });

    const shaped = links.map((l) => ({
      id: l.id,
      status: l.status,
      copId: l.copId,
      girlId: l.girlId,
      createdAt: l.createdAt,
      cop: l.cop ? {
        id: l.cop.id,
        fullName: role === 'GIRL' ? anonCopName(l.cop.id) : l.cop.fullName,
        profession: l.cop.profession || null
      } : null,
      girl: l.girl ? {
        id: l.girl.id,
        fullName: (l.girl.fullName || 'A girl').split(' ')[0]
      } : null
    }));

    res.json({ success: true, links: shaped });
  } catch (error) {
    console.error('getMyLinks Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load links.' });
  }
};

// Girl → send a link request to a verified secret cop
exports.requestLink = async (req, res) => {
  try {
    if (!isGirl(req)) {
      return res.status(403).json({ success: false, message: 'Only girls can send link requests.' });
    }

    const girlId = req.user.id;
    const { copId } = req.body;

    if (!copId) {
      return res.status(400).json({ success: false, message: 'copId is required.' });
    }
    if (copId === girlId) {
      return res.status(400).json({ success: false, message: 'You cannot link to yourself.' });
    }

    const cop = await prisma.user.findUnique({ where: { id: copId }, select: { id: true, role: true, isVerified: true } });
    if (!cop || cop.role !== 'SECRET_COP' || !cop.isVerified) {
      return res.status(404).json({ success: false, message: 'Secret cop not found or not verified yet.' });
    }

    const existing = await prisma.copLink.findUnique({
      where: { girlId_copId: { girlId, copId } }
    });

    if (existing) {
      if (existing.status === 'APPROVED') {
        return res.json({ success: true, status: 'APPROVED', message: 'Already linked with this secret cop.' });
      }
      if (existing.status === 'PENDING') {
        return res.json({ success: true, status: 'PENDING', message: 'Request already sent — waiting for approval.' });
      }
      // REJECTED → allow the girl to re-send
      const updated = await prisma.copLink.update({
        where: { id: existing.id },
        data: { status: 'PENDING' }
      });
      return res.json({ success: true, status: updated.status, message: 'Link request re-sent.' });
    }

    const link = await prisma.copLink.create({
      data: { girlId, copId, status: 'PENDING' }
    });

    res.status(201).json({ success: true, status: link.status, message: 'Link request sent to secret cop.' });
  } catch (error) {
    console.error('requestLink Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send link request.' });
  }
};

// Cop → pending requests addressed to me
exports.getRequests = async (req, res) => {
  try {
    if (!isSecretCop(req)) {
      return res.status(403).json({ success: false, message: 'Only secret cops can view link requests.' });
    }

    const links = await prisma.copLink.findMany({
      where: { copId: req.user.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { girl: { select: { id: true, fullName: true } } }
    });

    res.json({
      success: true,
      requests: links.map((l) => ({
        id: l.id,
        girlId: l.girlId,
        girlName: (l.girl?.fullName || 'A girl').split(' ')[0],
        createdAt: l.createdAt
      }))
    });
  } catch (error) {
    console.error('getRequests Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load link requests.' });
  }
};

// Cop → approve or reject a request (ownership enforced)
exports.respondToRequest = async (req, res) => {
  try {
    if (!isSecretCop(req)) {
      return res.status(403).json({ success: false, message: 'Only secret cops can respond to link requests.' });
    }

    const { linkId, action } = req.body;
    if (!linkId || !['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Valid linkId and action (APPROVED/REJECTED) are required.' });
    }

    const link = await prisma.copLink.findUnique({ where: { id: linkId } });
    if (!link) {
      return res.status(404).json({ success: false, message: 'Link request not found.' });
    }
    if (link.copId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This request is not addressed to you.' });
    }

    if (link.status !== 'PENDING') {
      return res.json({ success: true, status: link.status, message: 'Request already handled.' });
    }

    const updated = await prisma.copLink.update({
      where: { id: link.id },
      data: { status: action }
    });

    res.json({
      success: true,
      status: updated.status,
      message: action === 'APPROVED' ? 'Girl linked to your account.' : 'Request rejected.'
    });
  } catch (error) {
    console.error('respondToRequest Error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to request.' });
  }
};
