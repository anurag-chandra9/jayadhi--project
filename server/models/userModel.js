const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  // --- ADDITION 1: Role field for RBAC ---
  role: {
    type: String,
    enum: ['User', 'Admin'], // Restricts roles to these specific values
    default: 'User'          // New users will be 'User' by default
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  // Use Mongoose's built-in timestamps for createdAt and updatedAt
  timestamps: true
});


// --- ADDITION 2: Password Hashing Logic ---

// This middleware runs automatically BEFORE a user document is saved
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  // Generate a salt and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Add a custom method to the user model to compare passwords during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


module.exports = mongoose.model('User', userSchema);