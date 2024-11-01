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

module.exports = router;
