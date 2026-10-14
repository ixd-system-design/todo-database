import express from "express";
import mongoose from "mongoose";
import serverless from "serverless-http";
import { connectToDatabase } from "../database/connect.js";
import Todo from "../models/Todo.js";

const app = express();
app.use(express.json());

const router = express.Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));

router.post("/todo", async (req, res) => {
	try {
		await connectToDatabase();
		const todo = await Todo.create({ content: req.body.content });
		res.status(201).send(todo);
	} catch (error) {
		res.status(400).send({ error: error.message });
	}
});

router.get("/todos", async (req, res) => {
	try {
		await connectToDatabase();
		const todos = await Todo.find().sort({ date: -1 });
		res.send(todos);
	} catch (error) {
		res.status(500).send({ error: error.message });
	}
});

router.put("/todo/:id", async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.id)) {
			return res.status(400).send({ error: "Invalid todo id" });
		}
		await connectToDatabase();
		const todo = await Todo.findByIdAndUpdate(
			req.params.id,
			{ content: req.body.content },
			{ returnDocument: "after", runValidators: true },
		);
		if (!todo) return res.status(404).send({ error: "Todo not found" });
		res.send(todo);
	} catch (error) {
		res.status(400).send({ error: error.message });
	}
});

router.delete("/todo/:id", async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.id)) {
			return res.status(400).send({ error: "Invalid todo id" });
		}
		await connectToDatabase();
		const todo = await Todo.findByIdAndDelete(req.params.id);
		if (!todo) return res.status(404).send({ error: "Todo not found" });
		res.send(todo);
	} catch (error) {
		res.status(400).send({ error: error.message });
	}
});

// Use /api prefix for all routes
app.use("/api", router);

// Netlify uses a serverless function to handle requests 
export const handler = serverless(app);

// During Local Development, Start the express server directly
if (!process.env.NETLIFY) { 
	try {
        const port = 3000;
	    app.use(express.static("frontend"));
        await connectToDatabase();
		app.listen(port, () => console.log(`API running at http://localhost:${port}`));
	} catch (error) {
		console.error(`Unable to connect to MongoDB: ${error.message}`);
		process.exitCode = 1;
	}
}
