const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const adminModel = require('../models/admin')
const doctorModel = require('../models/doctor')
const utility = require('../helpers/utility')
const { status, MSG } = require('../helpers/constants')

const doctorLogin = async (req, res) => {
  try {
    const { unitId, key } = req.body
    if (!unitId || !key) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.missingRequiredData))
    }
    const doctor = await doctorModel.findOne({ unitId }).lean()

    if (!doctor || doctor.key !== `${key}`) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.invalidCredentials))
    }

    const token = jwt.sign({ doctorId: doctor._id }, process.env.JWT_SECRET_DOCTOR)

    return res.status(status.SUCCESS).send(utility.successRes(MSG.successfulLogin, {
      token,
      doctor
    }))
  } catch (error) {
    console.log('error on admin doctorLogin: ', error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}

// const createAdmin = async () => {
//   const username = 'admin';
//   const plainPassword = '123456';  
//   const hashedPassword = await bcrypt.hash(plainPassword, 10); 

//   const admin = new adminModel({
//     username,
//     password: hashedPassword  
//   });

//   await admin.save();
//   console.log('Admin created with hashed password:', admin);
// };

// createAdmin();


const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.missingRequiredData))
    }
    const admin = await adminModel.findOne({ username })

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.invalidCredentials))
    }

    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET_ADMIN)

    return res.status(status.SUCCESS).send(utility.successRes(MSG.successfulLogin, {
      token,
      adminData: {
        username: admin.username
      }
    }))
  } catch (error) {
    console.log('error on admin login: ', error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}


module.exports = {
  doctorLogin,
  adminLogin,
}
