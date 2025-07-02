// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },
//   email:    { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   role:     { type: String, enum: ['admin', 'user'], default: 'user' },
//   createdAt: { type: Date, default: Date.now },
//   phone:    { type: String }
// });

// module.exports = mongoose.model('User', UserSchema);
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  phone:    { type: String },
  lastLogin: { type: Date }
});

UserSchema.methods.getFullInfo = function() {
  return `Username: ${this.username}, Email: ${this.email}, Phone: ${this.phone}`;
};

module.exports = mongoose.model('User', UserSchema);