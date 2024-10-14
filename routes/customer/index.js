const router = require('express').Router()
const doctorController = require('../../controllers/customer/doctorController')

router.get('/doctor', doctorController.getDoctors)
  .get('/liveStatus/:id', doctorController.liveStatusOfDoctor)


module.exports = router