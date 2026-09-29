const router = require('express').Router()
const doctorController = require('../controllers/admin.controller')

router.post('/doctor', doctorController.createDoctor)
  .get('/doctor', doctorController.getDoctors)
  .get('/doctor/count', doctorController.getDoctorCount)
  .put('/doctor/:id', doctorController.editDoctor)
  .delete('/doctor/:id', doctorController.deleteDoctor)
  .get("/doctor/report/:id", doctorController.getDailyReportByDoctor)
  .delete("/reset/:id", doctorController.deleteAllTokensAndPatientsByDate)






module.exports = router