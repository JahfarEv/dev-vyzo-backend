const router = require('express').Router()
const authRouter = require('./auth.routes')
const adminRouter = require('./admin.routes')
const customerRouter = require('./customer.routes')
const doctorRouter = require('./doctor.routes')
const doctorAuthMiddleware = require('../middlewares/doctorAuth')
const { status } = require('../helpers/constants')
const utility = require('../helpers/utility')

router.get('/', (req, res) => res.status(status.SUCCESS).send(utility.successRes('Vyzo App Rest API', [])))

router.use('/auth', authRouter)
  .use('/admin', adminRouter)
  .use('/doctor', doctorAuthMiddleware.verifyMyToken, doctorRouter)
  .use('/customer', customerRouter)

module.exports = router
