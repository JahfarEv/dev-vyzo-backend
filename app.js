const express = require('express')
require('dotenv').config()
const path = require('path')
const morgan = require('morgan')
const cors = require('cors')
const mongoose = require("mongoose");
const utility = require('./helpers/utility')
const { MSG } = require('./helpers/constants')
const indexRouter = require('./routes/index')

const app = express()

app.use(cors())

const mongoURI = process.env.MONGO_DB_URL

mongoose.connect(mongoURI)
  .then(() => console.log("mongodb connected"))
  .catch((err) => console.log(err))


app.use(
  morgan('dev', {
    skip: (req) => req.originalUrl === '/health-check',
  }),
)

app.use(
  express.json({
    limit: '100mb',
    extended: true,
  }),
)
app.use(
  express.urlencoded({
    limit: '100mb',
    extended: false,
  }),
)

app.use(express.static(path.join(__dirname, 'public')))
// Disable Cache operation by Browser
app.disable('etag')

app.use('/api', indexRouter)

app.use('/health-check', (_req, res) => {
  res.status(200).send('Healthy')
})

// catch 404 and forward to error handler
app.use((_req, res) => {
  res.status(404).send(utility.errorRes(MSG.notFound))
})

// error handler
app.use((err, _req, res) => {
  res.status(err.status || 500).send(utility.errorRes(MSG.somethingWentWrong))
})

module.exports = app

