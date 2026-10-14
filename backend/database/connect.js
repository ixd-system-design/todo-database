import mongoose from "mongoose";

let connection;

export function connectToDatabase() {
	if (connection) return connection;
	if (!process.env.MONGODB_URI) {
		return Promise.reject(new Error("MONGODB_URI is not configured"));
	}

	console.log("Connecting to MongoDB...");
	connection = mongoose.connect(process.env.MONGODB_URI).catch((error) => {
		connection = undefined;
		throw error;
	});

	connection.then(() => console.log("MongoDB connected"));
	return connection;
}
