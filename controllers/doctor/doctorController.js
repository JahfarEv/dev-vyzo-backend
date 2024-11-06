const utility = require("../../helpers/utility");
const validate = require("../../helpers/validate");
const doctorPresenceModel = require("../../models/doctorPresence");
const slotModel = require("../../models/slot");
const { status, MSG } = require("../../helpers/constants");
const moment = require("moment-timezone");
const doctorModel = require("../../models/doctor");
moment.tz.setDefault("Asia/Kolkata");
const cron = require("node-cron");
const patientModel = require("../../models/patients");
const { saveSlotsToDailyReport } = require("../../helpers/utility");
const { default: mongoose } = require("mongoose");

// Schedule a cron job to run every day at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  try {
    await doctorModel.updateMany({}, { tokenStatus: true });
    console.log("All doctors set to active for the day");
  } catch (error) {
    console.error("Error updating doctor presence:", error);
  }
});

// Schedule a job to run at midnight every day
cron.schedule("0 0 * * *", async () => {
  try {
    // Remove all slots from the Slot collection
    await slotModel.deleteMany({});
    console.log("All slots have been removed at midnight.");
  } catch (error) {
    console.error("Error removing slots:", error);
  }
});

//daily report

cron.schedule(
  "0 23 * * *",
  async () => {
    console.log("Running daily slot save task...");
    await saveSlotsToDailyReport(); // Call the function to save slots to daily report
  },
  {
    timezone: "Asia/Kolkata", // Set your timezone if needed
  }
);

const updateProfile = async (req, res) => {
  try {
    let { totalTokensPerDay, recallAfter, consultationTime, patientDetails } =
      req.body;
    console.log(consultationTime);

    // Ensure averageConsultationTime is stored in minutes
    if (consultationTime < 0) {
      // Adding a check for negative values
      return res
        .status(status.ERROR)
        .send(utility.errorRes("Consultation time cannot be negative."));
    }

    const [workingHoursStarting, workingHoursEnding] =
      validate.validateStartTimeAndEndTime(
        req.body.workingHoursStarting,
        req.body.workingHoursEnding
      );

    // Update the doctor's profile
    const updatedDoctor = await doctorModel.findByIdAndUpdate(
      req.doctorData.doctorId,
      {
        workingHoursStarting,
        workingHoursEnding,
        totalTokensPerDay,
        recallAfter,
        patientDetails,
      },
      { new: true }
    );

    // Update average consultation time for all slots of this doctor
    await slotModel.updateMany(
      { doctor: req.doctorData.doctorId }, // Update all tokens for this doctor
      { $set: { consultationTime: consultationTime } } 
    );

    return res.status(status.SUCCESS).send(
      utility.successRes(MSG.updatedSuccessfully, {
        updatedDoctor
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

// CurrentTokenWithTime

const getCurrentTokenWithTime = async (req, res) => {
  try {
    const { doctorId } = req.doctorData; // Extract doctorId from request
    const { additionalTime } = req.body; // Extract additionalTime from request body

    // Validate doctorId and additionalTime...

    // Fetch and update the current token with the additional consultation time
    const token = await utility.currentToken(doctorId, additionalTime);

    if (!token) {
      return res
        .status(status.NOTFOUND)
        .send(utility.errorRes(MSG.tokenNotFound));
    }

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.foundSuccessfully, token));
  } catch (error) {
    console.error("Error in getCurrentTokenWithTime:", error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

const doctorDetails = async (req, res) => {
  try {
    const { doctorId } = req.doctorData;

    // Fetch doctor details
    const doctor = await doctorModel.findById(doctorId).lean();
    if (!doctor) {
      return res
        .status(status.NOTFOUND)
        .send(utility.errorRes(MSG.doctorNotFound));
    }

    // Fetch a single consultation time from Slots model for this doctor
    const slot = await slotModel
      .findOne({ doctor: doctorId, tokenStatus: false })
      .select("consultationTime")
      .lean();

    // If no slot found, use default value or handle it
    const consultationTime = slot?.consultationTime; // Default value set to 5

    // Combine doctor details with consultation time
    const doctorDetailsWithConsultationTime = {
      ...doctor,
      consultationTime, // Add consultation time to the response
    };

    return res
      .status(status.SUCCESS)
      .send(
        utility.successRes(
          MSG.foundSuccessfully,
          doctorDetailsWithConsultationTime,
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

// const doctorDetails = async (req, res) => {
//   try {
//     const { doctorId } = req.doctorData;

//     // Fetch doctor details
//     const doctor = await doctorModel.findById(doctorId).lean();
//     if (!doctor) {
//       return res
//         .status(status.NOTFOUND)
//         .send(utility.errorRes(MSG.doctorNotFound));
//     }

//     // Use aggregation to get the most repeated consultation time for this doctor
//     const mostRepeatedSlot = await slotModel.aggregate([
//       { $match: { doctor: doctorId } },                // Filter slots by doctorId
//       { $group: {                                       // Group by consultationTime
//           _id: "$consultationTime",
//           count: { $sum: 1 }                            // Count occurrences of each consultationTime
//         }
//       },
//       { $sort: { count: -1 } },                         // Sort by count in descending order
//       { $limit: 1 }                                     // Get the consultation time with the highest count
//     ]);
// console.log(mostRepeatedSlot);

//     // Check if we have any result for the most repeated consultation time
//     const consultationTime = mostRepeatedSlot.length > 0 
//       ? mostRepeatedSlot[0]._id 
//       : 5;  // Default to 5 if no slots found

//     // Combine doctor details with the most repeated consultation time
//     const doctorDetailsWithConsultationTime = {
//       ...doctor,
//       consultationTime, // Add consultation time to the response
//     };

//     return res
//       .status(status.SUCCESS)
//       .send(
//         utility.successRes(
//           MSG.foundSuccessfully,
//           doctorDetailsWithConsultationTime,
//         )
//       );
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(status.ERROR)
//       .send(utility.errorRes(MSG.somethingWentWrong));
//   }
// };


const getTodayTokens = async (req, res) => {
  try {
    const { doctorId } = req.doctorData;

    let slots = await slotModel
      .find({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
      })
      .sort("orderNumber")
      .select(
        "tokenNo orderNumber fileArrive startingTime endingTime tokenStatus doctorStatus consultationTime"
      )
      .lean();

    if (!slots.length) {
      slots = await utility.feedTokens(doctorId);
    }

    const presenceData = await utility.doctorPresenceStatus(doctorId);
    const doctor = await doctorModel.findById(doctorId).lean();

    return res.status(status.SUCCESS).send(
      utility.successRes(MSG.foundSuccessfully, {
        tokens: slots,
        presenceData,
        doctor,
        // averageConsultationTimes, // Include average consultation time in the response
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

//patient details

const savePatientDetails = async (req, res) => {
  try {
    const { name, mobileNumber, remarks, tokenNo } = req.body;
    const { doctorId } = req.doctorData;

    // Basic validation for token number only
    if (tokenNo === undefined) {
      return res
        .status(400)
        .send(utility.errorRes("Token number is required."));
    }

    // Set default name to "NA" if not provided
    const patientName = name || "Not Filled";
    const patientMobileNo = mobileNumber || "Not Filled";
    const patientRemarks = remarks || "Not Filled";



    // Check if the patient already exists for this doctor based on the token number
    let existingPatient = await patientModel.findOne({
      tokenNo,
      doctor: doctorId,
    });
    if (existingPatient) {
      return res
        .status(400)
        .send(
          utility.errorRes(
            "Patient with this token number already exists for this doctor."
          )
        );
    }

    // Create a new patient record, setting name to "NA" if not provided
    const newPatient = new patientModel({
      name: patientName,
      mobileNumber:patientMobileNo, // Will save mobileNumber if provided, otherwise undefined
      remarks:patientRemarks,
      doctor: doctorId, // Associate patient with the doctor
      tokenNo, // Associate patient with the token number
    });

    await newPatient.save();

    return res
      .status(200)
      .send(
        utility.successRes("Patient details saved successfully.", newPatient)
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send(
        utility.errorRes("Something went wrong while saving patient details.")
      );
  }
};

const getPatients = async (req, res) => {
  const { doctorId } = req.doctorData; // Extract doctor ID from the request
  try {
    // Fetch patients associated with the specified doctor ID, sorted by the most recent creation date
    const patients = await patientModel
      .find({ doctor: doctorId })
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order

    if (patients.length === 0) {
      return res
        .status(404)
        .send({ message: "No patients found for this doctor." });
    }
    const currentToken = await utility.currentToken(doctorId);


    return res.status(200).send({
      message: "Patients retrieved successfully.",
      data: {
        patients,
      currentToken
    },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Failed to retrieve patients." });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params; // Extract patientId from the URL params
    const { name, mobileNumber, remarks } = req.body; // Data to update

    // Validate patientId
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).send({ message: "Invalid patient ID format." });
    }

    // Find the patient by ID and update with new data
    const updatedPatient = await patientModel.findByIdAndUpdate(
      patientId,
      { name, mobileNumber, remarks },
      { new: true, runValidators: true } // Return updated document, enforce schema validators
    );

    if (!updatedPatient) {
      return res.status(404).send({ message: "Patient not found." });
    }

    return res.status(200).send({
      message: "Patient details updated successfully.",
      data: updatedPatient,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ message: "Something went wrong while updating patient details." });
  }
};


//search patients
// const searchPatients = async (req, res) => {
//   const { doctorId } = req.doctorData; // Extract doctor ID from the request
//   const { mobileNumber } = req.query;  // Get mobileNumber from query parameters
  
//   try {
//     // Build the query object with doctorId and optionally mobileNumber
//     const query = { doctor: doctorId };
//     if (mobileNumber) {
//       query.mobileNumber = mobileNumber; // Add mobileNumber to query if provided
//     }

//     // Fetch patients based on the query, sorted by the most recent creation date
//     const patients = await patientModel
//       .find(query)
//       .sort({ createdAt: -1 }); // Sort by createdAt in descending order

//     if (patients.length === 0) {
//       return res
//         .status(404)
//         .send({ message: "No patients found for this doctor." });
//     }

//     // Get the current token
//     const currentToken = await utility.currentToken(doctorId);

//     return res.status(200).send({
//       message: "Patients retrieved successfully.",
//       data: {
//         patients,
//         currentToken
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).send({ message: "Failed to retrieve patients." });
//   }
// };


const searchPatients = async (req, res) => {
  const { doctorId } = req.doctorData; // Extract doctor ID from the request
  const { mobileNumber, name } = req.query; // Get mobileNumber or name from query parameters

  try {
    // Build the query object with doctorId and optionally mobileNumber or name
    const query = { doctor: doctorId };

    if (mobileNumber || name) {
      query.$or = []; // Initialize the $or array for either mobileNumber or name

      if (mobileNumber) {
        query.$or.push({ mobileNumber }); // Add mobileNumber condition if provided
      }

      if (name) {
        query.$or.push({ name: { $regex: name, $options: "i" } }); // Add name condition with case-insensitive regex
      }
    }

    // Fetch patients based on the query, sorted by the most recent creation date
    const patients = await patientModel
      .find(query)
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order

    if (patients.length === 0) {
      return res
        .status(404)
        .send({ message: "No patients found for this doctor." });
    }

    // Get the current token
    const currentToken = await utility.currentToken(doctorId);

    return res.status(200).send({
      message: "Patients retrieved successfully.",
      data: {
        patients,
        currentToken
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Failed to retrieve patients." });
  }
};


module.exports = {
  updateProfile,
  getTodayTokens,
  doctorDetails,
  getCurrentTokenWithTime,
  savePatientDetails,
  getPatients,
  updatePatient,
  searchPatients
};
