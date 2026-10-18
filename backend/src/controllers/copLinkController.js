const prisma = require('../lib/prisma');
const { sendPushNotification } = require('../utils/pushNotification');

// Secret cops stay anonymous to girls — same format as the verified-cops map endpoint
const anonCopName = (copId) => `Secret Cop #${String(copId).slice(-4)}`;

// Role checks read the DATABASE, not the JWT: a cop's token is signed at
// registration time (role BOY) and only changes on re-login, but admin
// verification flips the DB role immediately.
const getDbRole = async (userId) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return u?.role || null;
  } catch (e) {
    return null;
  }
};

// Girl or cop: all links involving me (shaped per requester role for privacy)
exports.getMyLinks = async (req, res) => {
  try {
    const me = req.user.id;
    const role = await getDbRole(me);

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

// Girl -> send a link request to her parent.
// Two input modes:
//   { parentPhone } - NEW: girl types ONLY her parent's number; the system
//     resolves it, checks the number belongs to a Secret Cop, and sends the
//     request automatically (girl never browses the cop list).
//   { copId } - legacy direct id, kept for backward compatibility.
exports.requestLink = async (req, res) => {
  try {
    const role = await getDbRole(req.user.id);
    if (role !== 'GIRL') {
      return res.status(403).json({ success: false, message: 'Only girls can send link requests.' });
    }

    const girlId = req.user.id;
    let { copId, parentPhone } = req.body;
    let parentPushToken = null;
    let usedPhoneFlow = false;

    // ── Parent-number flow ──────────────────────────────────
    if (!copId && parentPhone) {
      usedPhoneFlow = true;
      const digits = String(parentPhone).replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 12) {
        return res.status(400).json({ success: false, message: 'Please enter a valid mobile number.' });
      }
      const candidates = new Set([digits]);
      if (digits.length === 10) candidates.add('91' + digits);          // 9876543210 -> 919876543210
      if (digits.length === 12 && digits.startsWith('91')) candidates.add(digits.slice(2));

      const parentUser = await prisma.user.findFirst({
        where: { phone: { in: [...candidates] } },
        select: { id: true, role: true, pushToken: true }
      });

      if (!parentUser) {
        return res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: 'No account found for this number. First your parent must register on Chetna as a Secret Cop, then you can add them.'
        });
      }
      if (parentUser.id === girlId) {
        return res.status(400).json({ success: false, message: 'You cannot link to yourself.' });
      }
      if (parentUser.role !== 'SECRET_COP') {
        return res.status(403).json({
          success: false,
          code: 'NOT_SECRET_COP',
          message: 'This number is not a Secret Cop yet. First add your parent as a Secret Cop, then you can link them.'
        });
      }

      copId = parentUser.id;
      parentPushToken = parentUser.pushToken;
    }

    if (!copId) {
      return res.status(400).json({ success: false, message: 'copId or parentPhone is required.' });
    }
    if (copId === girlId) {
      return res.status(400).json({ success: false, message: 'You cannot link to yourself.' });
    }

    const cop = await prisma.user.findUnique({ where: { id: copId }, select: { id: true, role: true, isVerified: true, pushToken: true } });
    if (!cop || cop.role !== 'SECRET_COP' || !cop.isVerified) {
      return res.status(404).json({ success: false, message: 'Secret cop not found or not verified yet.' });
    }
    if (!parentPushToken) parentPushToken = cop.pushToken;

    // Tell the parent-cop about the request via push (new / re-sent links only)
    const notifyCop = async (linkId) => {
      if (!parentPushToken) return;
      try {
        const girl = await prisma.user.findUnique({ where: { id: girlId }, select: { fullName: true } });
        const firstName = (girl?.fullName || 'A girl').split(' ')[0];
        await sendPushNotification(
          parentPushToken,
          'Parent Link Request',
          `${firstName} wants to link you as her parent. Open the app to accept.`,
          { type: 'cop_link_request', linkId }
        );
      } catch (e) { /* push must never fail the request */ }
    };

    const existing = await prisma.copLink.findUnique({
      where: { girlId_copId: { girlId, copId } }
    });

    if (existing) {
      if (existing.status === 'APPROVED') {
        return res.json({ success: true, status: 'APPROVED', message: 'Already linked with this parent.' });
      }
      if (existing.status === 'PENDING') {
        return res.json({ success: true, status: 'PENDING', message: 'Request already sent - waiting for your parent to accept.' });
      }
      // REJECTED -> allow the girl to re-send
      const updated = await prisma.copLink.update({
        where: { id: existing.id },
        data: { status: 'PENDING' }
      });
      await notifyCop(updated.id);
      return res.json({ success: true, status: updated.status, message: 'Link request re-sent to your parent.' });
    }

    const link = await prisma.copLink.create({
      data: { girlId, copId, status: 'PENDING' }
    });
    await notifyCop(link.id);

    res.status(201).json({
      success: true,
      status: link.status,
      message: usedPhoneFlow
        ? 'Link request sent automatically to your parent. Waiting for them to accept.'
        : 'Link request sent to secret cop.'
    });
  } catch (error) {
    console.error('requestLink Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send link request.' });
  }
};

// Cop: pending requests addressed to me
exports.getRequests = async (req, res) => {
  try {
    const role = await getDbRole(req.user.id);
    if (role !== 'SECRET_COP') {
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

// Cop: approve or reject a request (ownership enforced).
// Accepts { linkId | id } and action APPROVED/REJECTED (case-insensitive,
// also APPROVE/REJECT/ACCEPT aliases) so naming mismatches never 400.
exports.respondToRequest = async (req, res) => {
  try {
    const role = await getDbRole(req.user.id);
    if (role !== 'SECRET_COP') {
      return res.status(403).json({ success: false, message: 'Only secret cops can respond to link requests.' });
    }

    const linkId = req.body.linkId || req.body.id;
    const rawAction = String(req.body.action || '').toUpperCase().trim();
    const action = ['APPROVED', 'APPROVE', 'ACCEPT'].includes(rawAction)
      ? 'APPROVED'
      : ['REJECTED', 'REJECT'].includes(rawAction)
        ? 'REJECTED'
        : null;

    if (!linkId || !action) {
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

    // Tell the girl her parent answered the request
    if (action === 'APPROVED') {
      try {
        const girl = await prisma.user.findUnique({ where: { id: link.girlId }, select: { fullName: true, pushToken: true } });
        if (girl?.pushToken) {
          await sendPushNotification(
            girl.pushToken,
            'Parent Linked',
            'Your parent accepted your link request. They will now receive your SOS alerts.',
            { type: 'cop_link_approved', linkId: updated.id }
          );
        }
      } catch (e) { /* push must never fail the respond */ }
    }

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
