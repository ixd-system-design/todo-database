import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
	content: {
		type: String,
		required: true,
		trim: true,
	},
	date: {
		type: Date,
		default: Date.now,
	},
});

const Todo = mongoose.models.Todo || mongoose.model("Todo", todoSchema);

export default Todo;