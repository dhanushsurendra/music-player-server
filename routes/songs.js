const router = require('express').Router()
const { User } = require('../models/user')
const { Song, validate } = require('../models/song')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const validateObjectId = require('../middleware/validateObjectId')
const lyricsFinder = require('lyrics-finder')
const _ = require('lodash')

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
	console.log(req.user._id)
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
	let artistArr = []

	for (const item of user.recents) {
		const song = await Song.findById(item)
		songArr.push(item)
		artistArr.push(song.artist)
		recentsArr.push(song.genre)
	}

	const song = await Song.find({
		$or: [
			{
				$and: [
					{
						genre: { $in: recentsArr },
						_id: { $nin: songArr }
					}
				]
			},
			{
				$and: [
					{
						artist: { $in: artistArr },
						_id: { $nin: songArr }
					}
				]
			}
		]
	})

	res.status(200).send({ data: song })
})

// get popular songs
router.get('/popular', admin, async (req, res) => {

	let popular = []

	const docs = await User.find({
		recents: { $exists: true, $ne: [] }
	}).select('-_id recents')

	const arrays = docs.map((obj) => obj.recents)

	// Use reduce to count the frequency of each element in the array
	const frequency = arrays.reduce((accumulator, currentArray) => {
		currentArray.forEach((element) => {
			if (accumulator[element]) {
				accumulator[element]++
			} else {
				accumulator[element] = 1
			}
		})
		return accumulator
	}, {})

	// Sort the frequency object by value in descending order
	const sortedFrequency = Object.entries(frequency)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 4)
		.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

	const songIds = Object.keys(sortedFrequency)
	const query = { _id: { $in: songIds } }

	Song.find(query, (err, songs) => {
		if (err) {
			console.error(err)
			return
		}

		// Extract the songs from the query results
		const songData = songs.map(({ _id, name, song, img, duration, genre, artist }) => ({
			_id,
			name,
			song,
			img, 
			duration,
			genre,
			artist
		}))

		popular = songData
		res.status(200).send({ popular })
	})
})

// get lyrics
router.get('/lyrics', async (req, res) => {
	console.log(req.query.artist, req.query.track);
	const lyrics = (await lyricsFinder("poets of fall", "carnival of rust"))
	console.log(lyrics);
	res.json({ lyrics: "No lyrics found" })
})

module.exports = router
