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
//     let { totalTokensPerDay, recallAfter } = req.body;

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
    let { totalTokensPerDay, recallAfter, averageConsultationTime } = req.body;

    // Ensure averageConsultationTime is stored in minutes
    if (averageConsultationTime < 0) {  // Adding a check for negative values
      return res.status(status.ERROR).send(utility.errorRes("Consultation time cannot be negative."));
    }

    const [workingHoursStarting, workingHoursEnding] =
      validate.validateStartTimeAndEndTime(
        req.body.workingHoursStarting,
        req.body.workingHoursEnding
      );

    const updatedData = await doctorModel.findByIdAndUpdate(
      req.doctorData.doctorId,
      {
        workingHoursStarting,
        workingHoursEnding,
        totalTokensPerDay,
        recallAfter,
        averageConsultationTime,  // Expecting this to be in minutes
      },
      { new: true }
    );

    return res
      .status(status.SUCCESS)
      .send(utility.successRes(MSG.updatedSuccessfully, updatedData));
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

    return res
      .status(status.SUCCESS)
      .send(
        utility.successRes(MSG.foundSuccessfully, {
          tokens: slots,
          presenceData,
          doctor,
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
};
