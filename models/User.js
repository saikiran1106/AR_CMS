const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    try {
      // Use argon2 to hash the password
      this.password = await argon2.hash(this.password);
    } catch (err) {
      next(err);
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
