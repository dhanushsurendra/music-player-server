const router = require('express').Router()
const { User } = require('../models/user')
const { Song, validate } = require('../models/song')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const validateObjectId = require('../middleware/validateObjectId')

// Create song
router.post('/', admin, async (req, res) => {
	console.log(req.body)
	const { error } = validate(req.body)
	if (error) res.status(400).send({ message: error.details[0].message })

	const song = await Song(req.body).save()
	res.status(201).send({ data: song, message: 'Song created successfully' })
})

// Get all songs
router.get('/', async (req, res) => {
	const songs = await Song.find()
	res.status(200).send({ data: songs })
})

// get global top 50
router.get('/top', auth, async (req, res) => {
	const songs = await Song.find().limit(10)
	res.status(200).send({ data: songs })
})

// Update song
router.put('/:id', [validateObjectId, admin], async (req, res) => {
	const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
		new: true
	})
	res.send({ data: song, message: 'Updated song successfully' })
})

// Delete song by ID
router.delete('/:id', [validateObjectId, admin], async (req, res) => {
	await Song.findByIdAndDelete(req.params.id)
	res.status(200).send({ message: 'Song deleted sucessfully' })
})

// Like song
router.put('/like/:id', [validateObjectId, auth], async (req, res) => {
	let resMessage = ''
	const song = await Song.findById(req.params.id)
	if (!song) return res.status(400).send({ message: 'Song does not exist' })

	const user = await User.findById(req.user._id)
	const index = user.likedSongs.indexOf(song._id)
	if (index === -1) {
		user.likedSongs.push(song._id)
		resMessage = 'Added to your liked songs'
	} else {
		user.likedSongs.splice(index, 1)
		resMessage = 'Removed from your liked songs'
	}

	await user.save()
	res.status(200).send({ message: resMessage })
})

// Get liked songs
router.get('/like', auth, async (req, res) => {
	const user = await User.findById(req.user._id)
	const songs = await Song.find({ _id: user.likedSongs })
	res.status(200).send({ data: songs })
})

router.post('/recents/:id', auth, async (req, res) => {
	console.log(req.user._id);
	let resMessage = ''
	const song = await Song.findById(req.params.id)
	if (!song) return res.status(400).send({ message: 'Song does not exist' })

	const user = await User.findById(req.user._id)
	const index = user.recents.indexOf(song._id)

	if (index === -1) {
		user.recents.push(song._id)	
		resMessage = 'Added to your recents songs'
	}

	await user.save()
	res.status(200).send({ message: resMessage, song: song })
})

router.get('/recents', auth, async (req, res) => {
	const user = await User.findById(req.user._id)
	const songs = await Song.find({ _id: user.recents })
	res.status(200).send({ data: songs.reverse() })
})

router.get('/recommended', auth, async (req, res) => {
	const user = await User.findById(req.user._id)
	let recentsArr = []
	let songArr = []
	
	for (const item of user.recents) {
		const song = await Song.findById(item)
		songArr.push(item)
		recentsArr.push(song.genre)
	}

	const song = await Song.find({ genre: { $in: recentsArr }, _id: { $nin: songArr } })

	res.status(200).send({ data: song })
})

module.exports = router
