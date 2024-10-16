const router = require('express').Router()
const doctorController = require('../../controllers/doctor/doctorController')

router.put('/udpateProfile', doctorController.updateProfile)
  .get('/todayTokens', doctorController.getTodayTokens)
  .get('/profile', doctorController.doctorDetails)
  // .get('/tokens/:tokenNo', doctorController.getIndividualToken)
  .put('/tokens', doctorController.updateTokenConsultationTime)


module.exports = router