const doctorModel = require("../../models/doctor");
const utility = require("../../helpers/utility");
const validate = require("../../helpers/validate");
const { status, MSG } = require("../../helpers/constants");
// const SlotDataModel = require('../../models/dailyReport')
const DailyReportModel = require("../../models/dailyReport");

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

    // Find all daily reports for the specific doctor
    const reports = await DailyReportModel.find({ doctor: doctorId }).populate(
      "doctor",
      "name"
    );

    if (reports.length === 0) {
      return res.status(404).send("No daily reports found for this doctor.");
    }

    res.status(200).json(reports); // Send the daily reports as JSON
  } catch (error) {
    res.status(500).send(`Error retrieving daily reports: ${error.message}`);
  }
};

// const excel = async(req, res) => {
//   try {
//     const doctorId = req.params.id;
//     console.log(doctorId);

//     // Extract doctorId from request and export slots to Excel
//     const result = await utility.exportSlotsToExcel(doctorId);

//     // If filePath exists, download the Excel file
//     if (result.filePath) {
//       res.download(result.filePath, (err) => {
//         if (err) {
//           res.status(500).send('Error downloading the file.');
//         }
//       });
//     }
//     // If there are no slots or an issue, return the message
//     else if (result.message) {
//       res.status(404).send(result.message); // Return the message when no slots are available
//     } else {
//       res.status(404).send('No data available to generate the Excel file.');
//     }

//   } catch (error) {
//     res.status(500).send(`Server error: ${error.message}`);
//   }
// }

// const saveSlotsToDatabase = async (req, res) => {
//   try {
//     const doctorId = req.params.id;
//     console.log(`Saving slots for doctor ID: ${doctorId}`);

//     // Call the function to save slots to MongoDB
//     const result = await utility.saveSlotsToMongo(doctorId); // Use the function that saves to MongoDB

//     // Check if a message was returned
//     if (result.message) {
//       res.status(200).send(result.message); // Send success message
//     } else {
//       res.status(404).send('No data available to save to the database.');
//     }
//   } catch (error) {
//     res.status(500).send(`Server error: ${error.message}`);
//   }
// };

// const getDoctorSlots = async (req, res) => {
//   try {
//     const doctorId = req.params.id;
//     console.log(`Fetching slots for doctor ID: ${doctorId}`);

//     // Query MongoDB to find the saved slots for the doctor
//     const slots = await SlotDataModel.find({ doctor: doctorId }).lean(); // Replace 'SavedSlotsModel' with your actual MongoDB model name

//     if (slots.length > 0) {
//       res.status(200).json(slots); // Return the found slots as JSON
//     } else {
//       res.status(404).send('No slots found for the specified doctor.');
//     }
//   } catch (error) {
//     res.status(500).send(`Server error: ${error.message}`);
//   }
// };

module.exports = {
  createDoctor,
  getDoctors,
  editDoctor,
  deleteDoctor,
  getDoctorCount,
  getDailyReportByDoctor,
};
