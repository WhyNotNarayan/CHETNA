const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.sendOTP = async (req, res) => {
  // Deprecated: Firebase handles SMS directly from the frontend now.
  res.json({ success: true, message: 'OTP is handled by Firebase on the frontend.' });
};

exports.register = async (req, res) => {
  try {
    console.log('Incoming Registration Request:', req.body);
    const { phone, email, password, fullName, address, gender } = req.body;
    
    // 🔐 HASH THE PASSWORD STRONGLY
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = await prisma.user.findUnique({ where: { phone } });
    console.log('Existing User Check Result:', user);
    
    if (user) {
      console.log('User found, updating...');
      user = await prisma.user.update({
        where: { phone },
        data: { 
          email, 
          password: hashedPassword, // Store hashed version
          fullName, 
          address, 
          gender, 
          role: gender === 'BOY' ? 'BOY' : 'GIRL' 
        }
      });
    } else {
      console.log('New user, creating...');
      user = await prisma.user.create({
        data: { 
          phone, 
          email, 
          password: hashedPassword, // Store hashed version
          fullName, 
          address, 
          gender, 
          role: gender === 'BOY' ? 'BOY' : 'GIRL' 
        }
      });
    }
    console.log('Database Operation Successful:', user.id);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecret', {
      expiresIn: '30d'
    });

    // Don't send the password back to the frontend
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔑 Admin Login Attempt - Email: "${email}", Password: "${password}"`);

    // Hardcoded Admin Security (As requested) - Using .trim() to avoid whitespace issues
    if (email?.trim() === 'aaditaygawade@gmail.com' && password === 'adi^%2006') {
      console.log('✅ Admin credentials matched!');
      const token = jwt.sign(
        { id: 'ADMIN_001', role: 'ADMIN' },
        process.env.JWT_SECRET || 'supersecret',
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          fullName: 'Narayan Gawade (Admin)',
          email: 'aaditaygawade@gmail.com',
          role: 'ADMIN'
        }
      });
    }

    console.log('❌ Admin credentials rejected.');
    res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please register first.' });
    }

    // ✅ Generate JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'supersecret', {
      expiresIn: '30d'
    });

    // Don't send the password back to the frontend
    const { password: _, ...userWithoutPassword } = user;

    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

exports.applySecretCop = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { profession, workAddress } = req.body;
    console.log(`🛡️ [SecretCop] Application attempt for User ID: ${userId}`);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Verify user exists in the current database
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      console.log("❌ [SecretCop] User not found. The session might be from a deleted database.");
      return res.status(404).json({ 
        success: false, 
        message: 'Your session is invalid. Please Log Out and Log In again to refresh your account.' 
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        profession,
        workAddress,
        isVerified: true, // Auto-verify immediately!
        isSecretCopPending: false, // No longer pending
      }
    });

    // Don't send the password back to the frontend
    const { password: _, ...userWithoutPassword } = user;

    res.json({ success: true, message: 'Application submitted successfully', user: userWithoutPassword });
  } catch (error) {
    console.error('Secret Cop Application Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
};
