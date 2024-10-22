const router = require('express').Router()
const doctorController = require('../../controllers/admin/doctorController')

router.post('/doctor', doctorController.createDoctor)
  .get('/doctor', doctorController.getDoctors)
  .get('/doctor/count', doctorController.getDoctorCount)
  .put('/doctor/:id', doctorController.editDoctor)
  .delete('/doctor/:id', doctorController.deleteDoctor)
  // .get("/doctor/reports/:id", doctorController.excel)
  // .post("/doctor/save_db/:id", doctorController.saveSlotsToDatabase)
  // .get("/doctor/get-report/:id", doctorController.getDoctorSlots)
  .get("/doctor/report/:id", doctorController.getDailyReportByDoctor)





module.exports = router