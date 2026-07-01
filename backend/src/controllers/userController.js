const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


exports.register = async (req, res) => {
  console.log('--- REGISTRATION ATTEMPT START ---');
  console.log('Body:', req.body);
  try {
    const { phone, email, password, fullName, address, gender, guardian } = req.body;
    
    if (!phone || !password || !fullName) {
      console.log('Error: Missing fields');
      return res.status(400).json({ success: false, message: 'Mobile, Password and Full Name are required.' });
    }

    // Check relationship if guardian is present
    if (guardian && (!guardian.name || !guardian.phone || !guardian.relationship)) {
      return res.status(400).json({ success: false, message: 'Guardian Name, Mobile, and Relationship are required.' });
    }

    // 1. Check if Mobile already exists
    console.log('Checking if phone exists:', phone);
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      console.log('Error: Phone exists');
      return res.status(400).json({ success: false, message: 'This email and mobile is already registered' });
    }

    // 2. Check if Email already exists
    if (email && email.trim() !== "") {
      console.log('Checking if email exists:', email);
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        console.log('Error: Email exists');
        return res.status(400).json({ success: false, message: 'This email and mobile is already registered' });
      }
    }

    // 3. Hash the password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the user
    console.log('Creating user in database...');
    const user = await prisma.user.create({
      data: {
        phone,
        email: (email && email.trim() !== "") ? email : null,
        password: hashedPassword,
        fullName,
        address,
        gender,
        role: gender === 'BOY' ? 'BOY' : 'GIRL',
        contacts: guardian ? {
          create: {
            name: guardian.name,
            phone: guardian.phone,
            relationship: guardian.relationship,
            secondaryPhone: guardian.secondaryPhone || null
          }
        } : undefined
      },
      include: { contacts: true }
    });
    console.log('User created successfully:', user.id);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecret', {
      expiresIn: '30d'
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    console.error('CRITICAL REGISTRATION ERROR:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

exports.login = async (req, res) => {
  console.log('--- LOGIN ATTEMPT ---');
  try {
    const { phone, password } = req.body;
    const user = await prisma.user.findUnique({ where: { phone }, include: { contacts: true } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found. Please register first.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '30d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email?.trim() === 'aaditaygawade@gmail.com' && password === 'adi^%2006') {
      const token = jwt.sign({ id: 'ADMIN_001', role: 'ADMIN' }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '30d' });
      return res.json({ success: true, token, user: { fullName: 'Narayan Gawade (Admin)', email: 'aaditaygawade@gmail.com', role: 'ADMIN' } });
    }
    res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.applySecretCop = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { profession, workAddress, latitude, longitude } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profession, workAddress, latitude: latitude ? parseFloat(latitude) : null, longitude: longitude ? parseFloat(longitude) : null, isVerified: false, isSecretCopPending: true }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, message: 'Application submitted successfully', user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { contacts: true }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if this user's phone number is registered as an approved EmergencyContact of any girl
    const parentLinks = await prisma.emergencyContact.findMany({
      where: { phone: user.phone, status: 'APPROVED' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true
          }
        }
      }
    });

    const pendingRequests = await prisma.emergencyContact.findMany({
      where: { phone: user.phone, status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true
          }
        }
      }
    });

    const isLinkedParent = parentLinks.length > 0;
    const daughters = parentLinks.map(link => ({
      id: link.user.id,
      fullName: link.user.fullName,
      phone: link.user.phone,
      relationship: link.relationship
    }));

    const pendingLinkRequests = pendingRequests.map(link => ({
      id: link.id,
      daughterName: link.user.fullName,
      relationship: link.relationship,
      phone: link.user.phone
    }));

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: {
        ...userWithoutPassword,
        isLinkedParent,
        daughters,
        pendingLinkRequests
      }
    });
  } catch (error) {
    console.error('getProfile Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.linkParent = async (req, res) => {
  try {
    const userId = req.user.id; // the girl's user ID
    const { name, phone, relationship, secondaryPhone } = req.body;

    if (!name || !phone || !relationship) {
      return res.status(400).json({ success: false, message: 'Parent Name, Mobile, and Relationship are required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user.role !== 'GIRL') {
      return res.status(403).json({ success: false, message: 'Only female users can link parents.' });
    }

    // Security: Check if target parent exists as a Chetna user
    const targetParentUser = await prisma.user.findUnique({ where: { phone } });
    if (!targetParentUser) {
      return res.status(400).json({
        success: false,
        message: 'Your relative is not a Chetna user. Please ask them to create a boys/male account first.'
      });
    }

    // Try to find if an emergency contact already exists for this girl
    const existingContact = await prisma.emergencyContact.findFirst({
      where: { userId }
    });

    let contact;
    if (existingContact) {
      contact = await prisma.emergencyContact.update({
        where: { id: existingContact.id },
        data: {
          name,
          phone,
          relationship,
          secondaryPhone: secondaryPhone || null,
          status: 'PENDING' // reset to pending on change
        }
      });
    } else {
      contact = await prisma.emergencyContact.create({
        data: {
          name,
          phone,
          relationship,
          secondaryPhone: secondaryPhone || null,
          userId,
          status: 'PENDING'
        }
      });
    }

    res.json({ success: true, message: 'Parent linking request submitted. Waiting for confirmation.', contact });
  } catch (error) {
    console.error('Link Parent Error:', error);
    res.status(500).json({ success: false, message: 'Failed to link parent.' });
  }
};

exports.verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password' });
    res.json({ success: true });
  } catch (error) {
    console.error('verifyPassword Error:', error);
    res.status(500).json({ success: false, message: 'Password verification failed' });
  }
};

exports.respondLinkRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'APPROVED' or 'REJECTED'

    if (!requestId || !action) {
      return res.status(400).json({ success: false, message: 'Request ID and action are required.' });
    }

    const contact = await prisma.emergencyContact.update({
      where: { id: requestId },
      data: { status: action }
    });

    res.json({ success: true, message: `Request ${action.toLowerCase()} successfully.`, contact });
  } catch (error) {
    console.error('respondLinkRequest Error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to link request.' });
  }
};

