const mongoose = require("mongoose");
const Joi = require("joi");

const adminSchema = new mongoose.Schema({
	songs: { type: Array, default: [] },
});

const validate = (song) => {
	const schema = Joi.object({		
		songs: Joi.array().items(Joi.string()),
	});
	return schema.validate(song);
};

const Admin = mongoose.model("admin", adminSchema);

module.exports = { Admin, validate };