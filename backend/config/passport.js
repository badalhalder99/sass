const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        return done(null, false, { message: 'Email not found' });
      }

      const isPasswordValid = await User.comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        return done(null, false, { message: 'Invalid password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // First check if user exists by Google ID
      let user = await User.findByGoogleId(profile.id);
      
      if (user) {
        // Update last login and return user
        await User.updateById(user._id, { last_login: new Date() });
        return done(null, user);
      }

      // Check if user exists by email
      user = await User.findByEmail(profile.emails[0].value);
      
      if (user) {
        // Link Google account to existing user
        await User.updateById(user._id, { 
          google_id: profile.id,
          avatar: profile.photos[0]?.value,
          last_login: new Date()
        });
        const updatedUser = await User.findById(user._id);
        return done(null, updatedUser);
      }

      // Create new user with Google account
      const newUser = new User({
        tenant_id: 1, // Default tenant for Google auth
        google_id: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0]?.value,
        role: 'user',
        status: 'active',
        email_verified: true, // Google accounts are verified
        last_login: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedUser = await newUser.save('mongodb');
      const userData = {
        _id: savedUser.mongodb.insertedId,
        tenant_id: newUser.tenant_id,
        google_id: newUser.google_id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role,
        status: newUser.status,
        email_verified: newUser.email_verified,
        created_at: newUser.created_at
      };
      
      return done(null, userData);
    } catch (error) {
      console.error('Google auth error:', error);
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;