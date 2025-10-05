import mongoose from "mongoose";

const paperSchema = new mongoose.Schema({
  paperName: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  department: {
    type: String,
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  collegeName: {
    type: String,
    required: true,
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

export const PaperDocument = mongoose.model('Paper', paperSchema);
