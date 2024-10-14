const doctorModel = require('../../models/doctor')
const utility = require('../../helpers/utility')
const validate = require('../../helpers/validate')
const { status, MSG } = require('../../helpers/constants')

const createDoctor = async (req, res) => {
  try {
    let { name, hospital, place, contactNo , department} = req.body
    name = utility.capitalizeString(name)
    hospital = utility.capitalizeString(hospital)
    place = utility.capitalizeString(place)
    department = utility.capitalizeString(department)
    if (!name || !hospital || !place || !department) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.missingRequiredData))
    }

    const { uniqueId, accessKey } = utility.generateUniqueIdAndKey();

    const newDoctor = new doctorModel({
      name, hospital, place, department, contactNo, unitId: uniqueId, key: accessKey
    })

    newDoctor.qrImage = await utility.generateQRImage(newDoctor._id)
    await newDoctor.save()

    return res.status(status.SUCCESS).send(utility.successRes(MSG.dataCreated))
  } catch (error) {
    console.log(error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}

const getDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find().lean()

    return res.status(status.SUCCESS).send(utility.successRes(MSG.foundSuccessfully, doctors))
  } catch (error) {
    console.log(error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}

const editDoctor = async (req, res) => {
  try {
    let { name, hospital, place, contactNo} = req.body
    name = utility.capitalizeString(name)
    hospital = utility.capitalizeString(hospital)
    place = utility.capitalizeString(place)
    const doctorId = req.params.id
    if (!validate.isValidObjectId(doctorId)) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.invalidId))
    }

    if (!name || !hospital || !place) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.missingRequiredData))
    }

    const doctor = await doctorModel.findByIdAndUpdate(
      doctorId,
      { name, hospital, place, contactNo},
      { new: true, runValidators: true }
    )

    if (!doctor) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.invalidId))
    }

    return res.status(status.SUCCESS).send(utility.successRes(MSG.updatedSuccessfully, doctor))
  } catch (error) {
    console.log(error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}


const deleteDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id
    if (!validate.isValidObjectId(doctorId)) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.invalidId))
    }

    const doctor = await doctorModel.findOneAndDelete({ _id: doctorId })

    if (!doctor) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.invalidId))
    }

    return res.status(status.SUCCESS).send(utility.successRes(MSG.deletedSuccessfully))
  } catch (error) {
    console.log(error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}

const getDoctorCount = async (req, res) => {
  try {
    const count = await doctorModel.countDocuments()

    return res.status(status.SUCCESS).send(utility.successRes(MSG.foundSuccessfully, { count }))
  } catch (error) {
    console.log(error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}

module.exports = {
  createDoctor,
  getDoctors,
  editDoctor,
  deleteDoctor,
  getDoctorCount,
}