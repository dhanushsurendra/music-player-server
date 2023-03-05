const router = require('express').Router()
const { User } = require('../models/user')
const { Song, validate } = require('../models/song')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const validateObjectId = require('../middleware/validateObjectId')

// post songs people listen to
router.post('/popular/:id', admin, async (req, res) => {
	let resMessage = ''
	const song = await Song.findById(req.params.id)
	if (!song) return res.status(400).send({ message: 'Song does not exist' })
    let admin = new Admin({
		
	}).save();
    admin.songs.push(song._id)
	await admin.save()
	res.status(200).send({ message: resMessage })
})

module.exports = router
