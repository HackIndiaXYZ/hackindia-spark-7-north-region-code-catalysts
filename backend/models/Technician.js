const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const technicianSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  phone:    { type: String, default: "" },
  city:     { type: String, required: true, trim: true },
  is_active:{ type: Boolean, default: true },
  added_by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
}, { timestamps: true });

technicianSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

technicianSchema.methods.comparePassword = async function (pwd) {
  return await bcrypt.compare(pwd, this.password);
};

module.exports = mongoose.model("Technician", technicianSchema);
