const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:             { type: String, required: true, trim: true },
    email:            { type: String, required: true, unique: true, lowercase: true },
    passwordHash:     { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["PHARMACY", "DISTRIBUTOR", "MANUFACTURER", "DISPOSAL_AGENT", "REGULATOR", "ADMIN"],
      required: true,
    },
    organizationName: { type: String, trim: true },
    // MetaMask wallet address (optional — set when user connects MetaMask on frontend)
    walletAddress: {
      type: String,
      lowercase: true,
      sparse: true,
      match: [/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"],
    },
    isActive:  { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => { delete ret.passwordHash; return ret; },
    },
  }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
