const router = require("express").Router();
const doctorController = require("../../controllers/doctor/doctorController");

router
  .put("/udpateProfile", doctorController.updateProfile)
  .get("/todayTokens", doctorController.getTodayTokens)
  .get("/profile", doctorController.doctorDetails)
  .put("/current-token", doctorController.getCurrentTokenWithTime)
  .post("/save-patient", doctorController.savePatientDetails)
  .get("/patients", doctorController.getPatients)
  .put("/patients/:patientId", doctorController.updatePatient)
  .get("/patient", doctorController.searchPatients)
  .get("/patient/download", doctorController.downloadPatients)
  // .delete("/details", doctorController.deleteAllTokensAndPatients)
  // .delete("/slot", doctorController.deleteAllSlotsByDate)
  // .delete("/patients", doctorController.deleteAllPatientsByDate)
  // .delete("/reset", doctorController.deleteAllTokensAndPatientsByDate)
  .get("/break-time", doctorController.getDoctorBreakEstimatedTimes)



module.exports = router;
