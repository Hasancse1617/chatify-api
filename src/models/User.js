import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  laravelId: { type: Number, required: true, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  photo: { type: String },
  password: { type: String },

}, { timestamps: true });

export default model('User', userSchema);
