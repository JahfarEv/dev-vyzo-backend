const utility = require("../../helpers/utility");
const validate = require("../../helpers/validate");
const doctorPresenceModel = require("../../models/doctorPresence");
const slotModel = require("../../models/slot");
const { status, MSG } = require("../../helpers/constants");
const moment = require("moment-timezone");
const doctorModel = require("../../models/doctor");
moment.tz.setDefault("Asia/Kolkata");
const cron = require("node-cron");

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

// const updateProfile = async (req, res) => {
//   try {
//     let { totalTokensPerDay, recallAfter, averageConsultationTime } = req.body;

//     // Ensure averageConsultationTime is stored in minutes
//     if (averageConsultationTime < 0) {  // Adding a check for negative values
//       return res.status(status.ERROR).send(utility.errorRes("Consultation time cannot be negative."));
//     }

//     const [workingHoursStarting, workingHoursEnding] =
//       validate.validateStartTimeAndEndTime(
//         req.body.workingHoursStarting,
//         req.body.workingHoursEnding
//       );

//     const updatedData = await doctorModel.findByIdAndUpdate(
//       req.doctorData.doctorId,
//       {
//         workingHoursStarting,
//         workingHoursEnding,
//         totalTokensPerDay,
//         recallAfter,
//         averageConsultationTime,  // Expecting this to be in minutes
//       },
//       { new: true }
//     );

//     return res
//       .status(status.SUCCESS)
//       .send(utility.successRes(MSG.updatedSuccessfully, updatedData));
//   } catch (error) {
//     console.log(error);
//     return res
//       .status(status.ERROR)
//       .send(utility.errorRes(MSG.somethingWentWrong));
//   }
// };

const updateProfile = async (req, res) => {
  try {
    let { totalTokensPerDay, recallAfter, consultationTime } = req.body;

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
      },
      { new: true }
    );

    // Update average consultation time for all slots of this doctor
    await slotModel.updateMany(
      { doctor: req.doctorData.doctorId }, // Update all tokens for this doctor
      { $set: { consultationTime: consultationTime } } // Set average consultation time
    );

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.updatedSuccessfully, updatedDoctor));
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

//test

const updateTokenConsultationTime = async (req, res) => {
  try {
    const { tokenNo, consultationTime } = req.body;
    const { doctorId } = req.doctorData;

    // Validate consultation time
    if (consultationTime < 0) {
      return res
        .status(status.ERROR)
        .send(utility.errorRes("Consultation time cannot be negative."));
    }

    // Update specific token's consultation time
    const updatedToken = await slotModel.findOneAndUpdate(
      {
        doctor: doctorId,
        tokenNo: tokenNo,
        date: moment().format("DD/MM/YYYY"),
      },
      { $set: { consultationTime: consultationTime } },
      { new: true }
    );

    if (!updatedToken) {
      return res
        .status(status.ERROR)
        .send(utility.errorRes("Token not found or invalid."));
    }

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.updatedSuccessfully, updatedToken));
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};


const doctorDetails = async (req, res) => {
  try {
    const { doctorId } = req.doctorData;
    const doctor = await doctorModel.findById(doctorId).lean();

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.foundSuccessfully, doctor));
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

// const getTodayTokens = async (req, res) => {
//   try {
//     const { doctorId } = req.doctorData;

//     let slots = await slotModel
//       .find({
//         date: moment().format("DD/MM/YYYY"),
//         doctor: doctorId,
//       })
//       .sort("orderNumber")
//       .select(
//         "tokenNo orderNumber fileArrive startingTime endingTime tokenStatus doctorStatus"
//       )
//       .lean();

//     if (!slots.length) {
//       slots = await utility.feedTokens(doctorId);
//     }

//     const presenceData = await utility.doctorPresenceStatus(doctorId);
//     const doctor = await doctorModel.findById(doctorId).lean();

//     return res
//       .status(status.SUCCESS)
//       .send(
//         utility.successRes(MSG.foundSuccessfully, {
//           tokens: slots,
//           presenceData,
//           doctor,
//         })
//       );
//   } catch (error) {
//     console.log(error);
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
        "tokenNo orderNumber fileArrive startingTime endingTime tokenStatus doctorStatus"
      )
      .lean();

    if (!slots.length) {
      slots = await utility.feedTokens(doctorId);
    }

    const presenceData = await utility.doctorPresenceStatus(doctorId);
    const doctor = await doctorModel.findById(doctorId).lean();

    // Calculate average consultation time
    let totalConsultationTime = 0; // Total consultation time in minutes
    let tokenCount = 0; // Count of tokens

    for (const slot of slots) {
      if (slot.startingTime && slot.endingTime) {
        // Parse the starting and ending time
        const startTime = moment(slot.startingTime, "HH:mm");
        const endTime = moment(slot.endingTime, "HH:mm");

        // Calculate the duration in minutes
        const duration = endTime.diff(startTime, "minutes");

        // Only add to total if duration is valid
        if (duration > 0) {
          totalConsultationTime += duration;
          tokenCount += 1; // Increment count of valid tokens
        }
      }
    }

    // Calculate the average if tokenCount is greater than 0
    const averageConsultationTimes =
      tokenCount > 0 ? totalConsultationTime / tokenCount : 0; // Avoid division by zero

    return res.status(status.SUCCESS).send(
      utility.successRes(MSG.foundSuccessfully, {
        tokens: slots,
        presenceData,
        doctor,
        averageConsultationTimes, // Include average consultation time in the response
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(status.ERROR)
      .send(utility.errorRes(MSG.somethingWentWrong));
  }
};

module.exports = {
  updateProfile,
  getTodayTokens,
  doctorDetails,
  updateTokenConsultationTime,
};
