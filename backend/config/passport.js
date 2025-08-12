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
      let user = await User.findByGoogleId(profile.id);
      
      if (user) {
        return done(null, user);
      }

      user = await User.findByEmail(profile.emails[0].value);
      
      if (user) {
        const updatedUser = await User.updateById(user._id, { 
          googleId: profile.id,
          avatar: profile.photos[0]?.value 
        });
        const updatedUserData = await User.findById(user._id);
        return done(null, updatedUserData);
      }

      const newUser = new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0]?.value,
        createdAt: new Date()
      });

      const savedUser = await newUser.save();
      return done(null, savedUser);
    } catch (error) {
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