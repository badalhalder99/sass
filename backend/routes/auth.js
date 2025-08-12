const express = require('express');
const passport = require('../config/passport');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, profession, summary } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    const hashedPassword = await User.hashPassword(password);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      age: age || null,
      profession: profession || null,
      summary: summary || null,
      createdAt: new Date()
    });

    const savedUser = await newUser.save();
    const token = generateToken(savedUser._id);

    const userResponse = { ...savedUser };
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Login user
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: info.message || 'Invalid credentials' 
      });
    }

    const token = generateToken(user._id);
    const userResponse = { ...user };
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });
  })(req, res, next);
});

// Google OAuth login
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = generateToken(req.user._id);
    
    // Redirect to frontend with token
    res.redirect(`http://localhost:3000/auth/success?token=${token}`);
  }
);

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const userResponse = { ...req.user };
  delete userResponse.password;
  
  res.json({
    success: true,
    user: userResponse
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

module.exports = router;