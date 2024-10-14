const router = require('express').Router()
const authController = require('../controllers/authController')

router.post('/doctor/login', authController.doctorLogin)
  .post('/admin/login', authController.adminLogin)

module.exports = router
