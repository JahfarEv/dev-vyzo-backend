const router = require('express').Router()
const doctorController = require('../controllers/customer.controller')

router.get('/doctor', doctorController.getDoctors)
  .get('/liveStatus/:id', doctorController.liveStatusOfDoctor)


module.exports = router