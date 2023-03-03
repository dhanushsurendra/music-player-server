require('dotenv').config()
require('express-async-errors')
const express = require('express')
const cors = require('cors')
const connection = require('./db')
const userRoutes = require('./routes/users')
const authRoutes = require('./routes/auth')
const songRoutes = require('./routes/songs')
const playListRoutes = require('./routes/playLists')
const searchRoutes = require('./routes/search')
const app = express()
const SpotifyWebApi = require('spotify-web-api-node')
const path = require('path')
const ContentBasedRecommender = require('content-based-recommender')
const lyricsFinder = require('lyrics-finder');

connection()
app.use(cors())
app.use(express.json())

app.use('/api/refresh', (req, res) => {
	const refreshToken = req.body.refreshToken
	const spotifyApi = new SpotifyWebApi({
		redirectUri: 'http://localhost:3000/login',
		clientId: 'ee3c4960ad714946a8c9ee328f6b593d',
		clientSecret: 'de6dcadf1b804211949b317efe2f4f36',
		refreshToken
	})

	spotifyApi
		.refreshAccessToken()
		.then((data) => {
			res.json({
				accessToken: data.body.accessToken,
				expiresIn: data.body.expiresIn
			}) 
		})
		.catch(() => {
			res.sendStatus(500)
		})
})

//authorization code. Get the code from frontend
app.use('/api/spotifyLogin', (req, res) => {
	const code = req.body.code
	const spotifyApi = new SpotifyWebApi({
		redirectUri: 'http://localhost:3000/login',
		clientId: 'ee3c4960ad714946a8c9ee328f6b593d',
		clientSecret: 'de6dcadf1b804211949b317efe2f4f36'
	})

	spotifyApi
		.authorizationCodeGrant(code)
		.then((data) => {
			res.json({
				accessToken: data.body.access_token,
				refreshToken: data.body.refresh_token,
				expiresIn: data.body.expires_in
			})

			accessToken = data.body.access_token
		})
		.catch((error) => {
			console.log(error)
			res.sendStatus(400)
		})
})

app.use('/api/accessToken', (req, res) => {
	return res.json({ accessToken: accessToken })
})

app.use('/api/recommended', (req, res) => {
	console.log(req.body.songName)
	const fs = require('fs')

	const filePath = path.join(__dirname, './data/data.json')

	const recommender = new ContentBasedRecommender({
		minScore: 0.1,
		maxSimilarDocuments: 10
	})

	fs.readFile(filePath, (err, data) => {
		if (err) {
			console.log(err)
			console.error('Failed to load the music dataset.')
			return
		}

		const musicDataset = JSON.parse(data)

		recommender.train(musicDataset)

        const recommendations = recommender.predict(songName);

		console.log(recommendations)

	})
})

app.get("/api/lyrics", async (req, res) => {
	const lyrics = (await lyricsFinder(req.query.artist, req.query.track)) || "No Lyrics Found"
	res.json({ lyrics })
})

app.use('/api/users/', userRoutes)
app.use('/api/login/', authRoutes)
app.use('/api/songs/', songRoutes)
app.use('/api/playlists/', playListRoutes)
app.use('/api/', searchRoutes)

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`Listening on port ${port}...`))
