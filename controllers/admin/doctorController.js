const doctorModel = require("../../models/doctor");
const utility = require("../../helpers/utility");
const validate = require("../../helpers/validate");
const { status, MSG } = require("../../helpers/constants");
const DailyReportModel = require("../../models/dailyReport");
const slotModel = require("../../models/slot")
const patientModel = require("../../models/patients")

const createDoctor = async (req, res) => {
  try {
    let { name, hospital, place, contactNo, department } = req.body;
    name = utility.capitalizeString(name);
    hospital = utility.capitalizeString(hospital);
    place = utility.capitalizeString(place);
    department = utility.capitalizeString(department);
    if (!name || !hospital || !place || !department) {
      return res
        .status(status.BAD_REQUEST)
        .send(utility.errorRes(MSG.missingRequiredData));
    }

    const { uniqueId, accessKey } = utility.generateUniqueIdAndKey();

    const newDoctor = new doctorModel({
      name,
      hospital,
      place,
      department,
      contactNo,
      unitId: uniqueId,
      key: accessKey,
    });

    newDoctor.qrImage = await utility.generateQRImage(newDoctor._id);
    await newDoctor.save();

    return res.status(status.SUCCESS).send(utility.successRes(MSG.dataCreated));
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

const getDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find().lean();

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.foundSuccessfully, doctors));
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

const editDoctor = async (req, res) => {
  try {
    let { name, hospital, place, contactNo } = req.body;
    name = utility.capitalizeString(name);
    hospital = utility.capitalizeString(hospital);
    place = utility.capitalizeString(place);
    const doctorId = req.params.id;
    if (!validate.isValidObjectId(doctorId)) {
      return res
        .status(status.BAD_REQUEST)
        .send(utility.errorRes(MSG.invalidId));
    }

    if (!name || !hospital || !place) {
      return res
        .status(status.BAD_REQUEST)
        .send(utility.errorRes(MSG.missingRequiredData));
    }

    const doctor = await doctorModel.findByIdAndUpdate(
      doctorId,
      { name, hospital, place, contactNo },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res
        .status(status.BAD_REQUEST)
        .send(utility.errorRes(MSG.invalidId));
    }

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.updatedSuccessfully, doctor));
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    if (!validate.isValidObjectId(doctorId)) {
      return res
        .status(status.BAD_REQUEST)
        .send(utility.errorRes(MSG.invalidId));
    }

    const doctor = await doctorModel.findOneAndDelete({ _id: doctorId });

    if (!doctor) {
      return res
        .status(status.BAD_REQUEST)
        .send(utility.errorRes(MSG.invalidId));
    }

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.deletedSuccessfully));
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

const getDoctorCount = async (req, res) => {
  try {
    const count = await doctorModel.countDocuments();

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.foundSuccessfully, { count }));
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

//daily report

const getDailyReportByDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id; // Get doctor ID from the request parameters
    console.log(doctorId);

    // Find all daily reports for the specific doctor and sort by startingTime
    const reports = await DailyReportModel.find({ doctor: doctorId })
      .populate("doctor", "name")
      // .sort({ startingTime: 1 }); // Sort by startingTime in ascending order

    if (reports.length === 0) {
      return res.status(404).send("No daily reports found for this doctor.");
    }

    res.status(200).json(reports); // Send the daily reports as JSON
  } catch (error) {
    res.status(500).send(`Error retrieving daily reports: ${error.message}`);
  }
};


const deleteAllTokensAndPatientsByDate = async (req, res) => {
  try {
    const  doctorId  = req.params.id;
    const { deleteType } = req.body; // Accept deleteType from body

    

    // Initialize deletion flags
    let slotResult = null;
    let patientResult = null;

    // Delete slots if deleteType is "slots" or "both"
    if (deleteType === "slots" || deleteType === "both") {
      slotResult = await slotModel.deleteMany({
        doctor: doctorId,
      });
    }

    // Delete patients if deleteType is "patients" or "both"
    if (deleteType === "patients" || deleteType === "both") {
      patientResult = await patientModel.deleteMany({
        doctor: doctorId,
        // date: date,
      });
    }

    // Check if any slots or patients were deleted
    const deletedSlotsCount = slotResult ? slotResult.deletedCount : 0;
    const deletedPatientsCount = patientResult ? patientResult.deletedCount : 0;

    if (deletedSlotsCount === 0 && deletedPatientsCount === 0) {
      return res
        .status(status.NOTFOUND)
        .send(utility.errorRes("No slots or patients found for this doctor on the specified date."));
    }

    // Get updated doctor presence data after deletion
    const presenceData = await utility.doctorPresenceStatus(doctorId);

    // Get updated doctor information if needed
    const doctor = await doctorModel.findById(doctorId).lean();

    return res.status(status.SUCCESS).send(
      utility.successRes("Slots and/or patients deleted successfully.", {
        deletedSlotsCount,
        deletedPatientsCount,
        presenceData,
        doctor,
      })
    );
  } catch (error) {
    console.error(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes("Something went wrong while deleting slots and patients."));
  }
};

module.exports = {
  createDoctor,
  getDoctors,
  editDoctor,
  deleteDoctor,
  getDoctorCount,
  getDailyReportByDoctor,
  deleteAllTokensAndPatientsByDate
};
