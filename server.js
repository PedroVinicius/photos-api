const fs = require('fs')
const cors = require('cors')
const express = require('express')
const app = express()
const sqlite = require('sqlite3')
const { promisify } = require('bluebird')
const db = new sqlite.Database(':memory:')
const expressFileUpload = require('express-fileupload')
const port = process.env.PORT || 3000

app.use(expressFileUpload())
app.use(cors())

db.get = promisify(db.get)
db.run = promisify(db.run)
db.all = promisify(db.all)

app.get('/photos', async (request, response) => {
  try {
    const photos = await db.all('SELECT id, name, extension FROM photos')

    console.info(photos)

    response.json(photos)
  } catch(error) {
    response.send(500)
  }
})

app.get('/photos/:id', async (request, response) => {
  try {
    const photo = await db.get('SELECT * FROM photos WHERE id = ?', [request.params.id])

    fs.createReadStream(photo.path).pipe(response)
  } catch(error) {
    response.send(500)
  }
})

app.post('/photos', async (request, response) => {
  try {
    const file = request.files.photo

    await file.mv(`/tmp/photos/${file.name}`)
    await db.run('INSERT INTO photos (name, extension, path) VALUES (?, ?, ?)', [file.name, file.mimetype, `/tmp/photos/${file.name}`])

    response.sendStatus(204)
  } catch(error) {
    response.sendStatus(500)
  }
})

app.listen(port, () => {
  db.run(`CREATE TABLE photos (id INTEGER PRIMARY KEY, name TEXT, extension TEXT, path TEXT)`)
    .then(() => {
      if(!fs.existsSync('/tmp/photos')) {
        fs.mkdirSync('/tmp/photos')
      }

      console.log('Database successfully created!')
    })

    .catch(error => {
      console.log('Something went wrong')

      process.exit(1)
    })
})