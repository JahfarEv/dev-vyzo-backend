const router = require("express").Router();
const doctorController = require("../controllers/doctor.controller");

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
  .get("/break-time", doctorController.getDoctorBreakEstimatedTimes)



module.exports = router;
