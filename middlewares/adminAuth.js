const jwt = require('jsonwebtoken')
const { status, MSG } = require('../helpers/constants')
const utility = require('../helpers/utility')
const validate = require('../helpers/validate')

const verifyMyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization
    if (!token) {
      return res.status(status.UNAUTHORIZED).send(utility.errorRes(MSG.notAuthorized))
    }
    const adminToken = token.split(' ')[1]
    const verify = jwt.verify(adminToken, process.env.JWT_SECRET_ADMIN)
    if (!verify || !validate.isValidObjectId(verify.adminId)) {
      return res.status(status.UNAUTHORIZED).send(utility.errorRes(MSG.notAuthorized))
    }
    req.adminData = verify
    return next()
  } catch (err) {
    console.log(err)
    return res.status(status.UNAUTHORIZED).send(utility.errorRes('Session Expired'))
  }
}

module.exports = {
  verifyMyToken,
}
