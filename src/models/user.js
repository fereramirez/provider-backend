const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    googleEmail: {
      type: String,
      lowercase: true,
      unique: true,
    },
    isGoogleUser: {
      type: Boolean,
      required: true,
    },
    role: {
      type: String,
      enum: ["client", "admin", "superadmin"],
      default: "client",
    },
    firstName: String,
    lastName: String,
    username: String,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    avatar: String,
    orders: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    addresses: {
      type: Schema.Types.ObjectId,
      ref: "Address",
    },
  },
  {
    versionKey: false,
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  }
);

UserSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const user = this;
  const compare = await bcrypt.compare(candidatePassword, user.password);
  return compare;
};

UserSchema.virtual("name").get(function () {
  if (this.username) return this.username;
  if (this.firstName && this.lastName)
    return `${this.firstName} ${this.lastName}`;
  if (this.firstName) return this.firstName;
  if (this.lastName) return this.lastName;

  return this.email.split("@")[0];
});

module.exports = mongoose.model("User", UserSchema);
