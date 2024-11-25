const utility = require('../../helpers/utility')
const validate = require('../../helpers/validate')
const doctorModel = require('../../models/doctor')
const { status, MSG, } = require('../../helpers/constants')

const getDoctors = async (req, res) => {
  try {
    let condition = {}
    const { searchQuery } = req.query
    if (searchQuery) {
      condition = {
        $or: [
          {
            name: {
              $regex: searchQuery,
              $options: 'i'
            }
          },
          {
            hospital: {
              $regex: searchQuery,
              $options: 'i'
            }
          }
        ]
      }
    }
    const doctors = await doctorModel.find(condition)
      .select('name hospital place department')
      .lean()

    return res.status(status.SUCCESS).send(utility.successRes(MSG.foundSuccessfully, doctors))
  } catch (error) {
    console.log(error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}

const liveStatusOfDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id
    if (!validate.isValidObjectId(doctorId)) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.invalidId))
    }

    const result = {
      doctorDetails: {},
      doctorStatus: null,
      currentToken: null,
      upcomingSlots: [],
      
    }

    result.doctorDetails = await doctorModel.findById(doctorId)
      .select('name hospital place contactNo department')
      .lean()

    if (!result.doctorDetails) {
      return res.status(status.BAD_REQUEST).send(utility.errorRes(MSG.invalidId))
    }

    result.doctorStatus = await utility.doctorPresenceStatus(doctorId)

    result.currentToken = await utility.currentToken(doctorId)

    result.upcomingSlots = await utility.upcomingTokens(doctorId)

    return res.status(status.SUCCESS).send(utility.successRes(MSG.foundSuccessfully, result))
  } catch (error) {
    console.log(error)
    return res.status(status.ERROR).send(utility.errorRes(MSG.somethingWentWrong))
  }
}

module.exports = {
  getDoctors,
  liveStatusOfDoctor,
}