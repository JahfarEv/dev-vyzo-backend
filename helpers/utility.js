const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const doctorPresenceModel = require("../models/doctorPresence");
const slotModel = require("../models/slot");
const doctorModel = require("../models/doctor");
const moment = require("moment-timezone");
moment.tz.setDefault("Asia/Kolkata");
var QRCode = require("qrcode");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const SlotDataModel = require('../models/dailyReport'); // Adjust the path as necessary
const DailyReportModel = require("../models/dailyReport");
const DoctorPresence = require('../models/doctorPresence'); // Import DoctorPresence model

class Utility {
  // eslint-disable-next-line default-param-last
  static successRes(message = "", data) {
    return {
      status: "success",
      message,
      data,
    };
  }

  static errorRes(message, errorStatus = "error") {
    return { status: errorStatus, message };
  }

  static conflictRes(message, errorStatus = "conflict") {
    return { status: errorStatus, message };
  }

  static calcTimeDifference(date1, date2) {
    const startTime = new Date(date1);
    const endTime = new Date(date2);
    return endTime.getTime() - startTime.getTime();
  }

  static capitalizeString(str) {
    if (!str) return null;
    const trimmedStr = str.trim();
    const normalizedStr = trimmedStr.replace(/\s{2,}/g, " ");
    const words = normalizedStr.split(" ");
    const capitalizedWords = words.map((word) => {
      const firstLetter = word.charAt(0).toUpperCase();
      const restOfWord = word.slice(1).toLowerCase();
      return firstLetter + restOfWord;
    });
    return capitalizedWords.join(" ");
  }

  static saltRounds() {
    return Math.round(Math.random() * 10);
  }

  static hashPassword(password) {
    const saltRounds = this.saltRounds();
    return bcrypt.hashSync(password, saltRounds);
  }

  static generateUniqueIdAndKey() {
    const generateRandomString = (length, characters) => {
      return Array.from(crypto.randomFillSync(new Uint8Array(length)))
        .map((n) => characters[n % characters.length])
        .join("");
    };

    const idLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const idNumbers = "0123456789";

    const keyCharacters = "0123456789";

    const idLetterPart = generateRandomString(4, idLetters);
    const idNumberPart = generateRandomString(2, idNumbers);
    const uniqueId = `${idLetterPart}${idNumberPart}`;

    const accessKey = generateRandomString(7, keyCharacters);

    return { uniqueId, accessKey };
  }

  //daily report

  // static async saveSlotsToDailyReport (){
  //   try {
  //     // Fetch all slots for the current day from slotModel
  //     const currentDate = moment().format('DD/MM/YYYY'); // Modify date format as needed
  
  //     const slots = await slotModel
  //       .find({ date: currentDate }) // Only fetch slots for the current day
  //       .lean(); // Get plain JavaScript objects
  
  //     if (slots.length === 0) {
  //       console.log('No slots available for today.');
  //       return;
  //     }
  
  //     // Save each slot data to dailyReportModel
  //     for (const slot of slots) {
  //       const dailyReport = new DailyReportModel({
  //         doctor: slot.doctor,
  //         tokenNo: slot.tokenNo,
  //         orderNumber: slot.orderNumber,
  //         consultationTime: slot.consultationTime,
  //         tokenStatus: slot.tokenStatus,
  //         startingTime: slot.startingTime,
  //         endingTime: slot.endingTime,
  //         fileArrive: slot.fileArrive,
  //         date: slot.date, // Save the current date
  //         createdAt: slot.createdAt, // Save original createdAt from slotModel
  //         updatedAt: slot.updatedAt, // Save original updatedAt from slotModel
  //       });
  
  //       await dailyReport.save(); // Save to dailyReportModel
  //     }
  
  //     console.log('Slots successfully saved to daily report.');
  //   } catch (error) {
  //     console.error('Error saving slots to daily report:', error.message);
  //   }
  // };


  
  
  static async saveSlotsToDailyReport () {
    try {
      // Fetch the current date in DD/MM/YYYY format
      const currentDate = moment().format('DD/MM/YYYY');
  
      // Fetch all slots for the current day from SlotModel
      const slots = await slotModel
        .find({ date: currentDate }) // Only fetch slots for the current day
        .lean(); // Get plain JavaScript objects
  
      if (slots.length === 0) {
        console.log('No slots available for today.');
        return;
      }
  
      // Fetch all doctor presence data for the current day
      const doctorPresenceData = await DoctorPresence
        .find({ date: currentDate })
        .lean(); // Get plain JavaScript objects
  
      // Save each slot data along with doctor presence breaks to DailyReportModel
      for (const slot of slots) {
        // Find corresponding doctor presence by doctor ID and date
        const doctorPresence = doctorPresenceData.find(dp => dp.doctor.equals(slot.doctor));
  
        // If doctor presence is found, extract the breaks
        const breaks = doctorPresence ? doctorPresence.breaks : [];
  
        // Create a new daily report entry with slot and break data
        const dailyReport = new DailyReportModel({
          doctor: slot.doctor,
          tokenNo: slot.tokenNo,
          orderNumber: slot.orderNumber,
          consultationTime: slot.consultationTime,
          tokenStatus: slot.tokenStatus,
          startingTime: slot.startingTime,
          endingTime: slot.endingTime,
          fileArrive: slot.fileArrive,
          date: slot.date, // Save the current date
          createdAt: slot.createdAt, // Save original createdAt from SlotModel
          updatedAt: slot.updatedAt, // Save original updatedAt from SlotModel
  
          // Include the breaks from DoctorPresence
          breaks: breaks.map(breakInfo => ({
            startTime: breakInfo.startTime,
            endTime: breakInfo.endTime,
            estimatedTime: breakInfo.estimatedTime,
            reason: breakInfo.reason
          }))
        });
  
        // Save to DailyReportModel
        await dailyReport.save();
      }
  
      console.log('Slots and doctor presence breaks successfully saved to daily report.');
    } catch (error) {
      console.error('Error saving slots to daily report:', error.message);
    }
  };
  


  // static async saveSlotsToMongo(doctorId) {
  //   try {
  //     // Fetch slots for the day
  //     const slots = await slotModel
  //       .find({
  //         doctor: doctorId,
  //         // date: moment().format("DD/MM/YYYY"),
  //       })
  //       .select(
  //         "tokenNo orderNumber patientName startingTime consultationTime"
  //       )
  //       .sort("orderNumber")
  //       .lean();
  
  //     // Fetch doctor's name
  //     const doctor = await doctorModel.findById(doctorId).select("name").lean();
  
  //     if (!slots || slots.length === 0) {
  //       return { message: "No slots available for saving." };
  //     }
  
  //     // Fetch doctor's presence for breaks
  //     const presenceData = await doctorPresenceModel
  //       .findOne({
  //         doctor: doctorId,
  //         // date: moment().format("DD/MM/YYYY"),
  //       })
  //       .select("breaks")
  //       .lean();
  
  //     // Add slots data to the MongoDB collection
  //     const slotDataPromises = slots.map(async (slot, index) => {
  //       // Parse current starting time
  //       const currentStartTimeStr = slot.startingTime;
  //       const currentStartTime = moment(currentStartTimeStr, "HH:mm:ss A", true); 
  
  //       // Calculate duration based on next slot's starting time
  //       let duration = 0;
  //       if (index < slots.length - 1) {
  //         const nextStartTimeStr = slots[index + 1].startingTime;
  //         const nextStartTime = moment(nextStartTimeStr, "HH:mm:ss A", true); 
  
  //         if (currentStartTime.isValid() && nextStartTime.isValid()) {
  //           duration = nextStartTime.diff(currentStartTime, "minutes");
  //         }
  //       }
  
  //       // Format duration into hours and minutes
  //       let durationFormatted = `${duration} minute${duration !== 1 ? "s" : ""}`;
  //       if (duration > 60) {
  //         const hours = Math.floor(duration / 60);
  //         const minutes = duration % 60;
  //         durationFormatted = `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  //       }
  
  //       // Get all the doctor's break times
  //       let breaksFormatted = "N/A";
  //       if (presenceData && presenceData.breaks.length > 0) {
  //         breaksFormatted = presenceData.breaks
  //           .map((breakData) => {
  //             const start = breakData.startTime ? breakData.startTime : "N/A";
  //             const end = breakData.endTime ? breakData.endTime : "N/A";
  //             return `${start} - ${end}`;
  //           })
  //           .join(", ");
  //       }
  
  //       // Save each slot data to MongoDB
  //       const slotData = new SlotDataModel({
  //         doctorId:doctor._id,
  //         doctorName: doctor.name,
  //         tokenNo: slot.tokenNo,
  //         orderNumber: slot.orderNumber,
  //         patientName: slot.patientName || "N/A",
  //         startingTime: slot.startingTime || "N/A",
  //         consultationTime: slot.consultationTime || 0,
  //         duration: durationFormatted,
  //         breaks: breaksFormatted,
  //       });
  
  //       await slotData.save();
  //     });
  
  //     // Wait for all slot data to be saved
  //     await Promise.all(slotDataPromises);
  
  //     return { message: "Slots successfully saved to MongoDB." };
  //   } catch (error) {
  //     throw new Error(`Error saving slots to MongoDB: ${error.message}`);
  //   }
  // }
  

  // excel

  // static async exportSlotsToExcel(doctorId) {
  //   try {
  //     // Fetch slots for the day
  //     const slots = await slotModel
  //       .find({
  //         doctor: doctorId,
  //         date: moment().format("DD/MM/YYYY"),
  //       })
  //       .select(
  //         "tokenNo orderNumber patientName startingTime endingTime consultationTime"
  //       )
  //       .sort("orderNumber")
  //       .lean();
  
  //     // Fetch doctor's name
  //     const doctor = await doctorModel.findById(doctorId).select("name").lean();
  // if(!slots){
  //   console.log("slot is not available");
    
  // }
  //     // Fetch doctor's presence for breaks
  //     const presenceData = await doctorPresenceModel
  //       .findOne({
  //         doctor: doctorId,
  //         date: moment().format("DD/MM/YYYY"),
  //       })
  //       .select("breaks")
  //       .lean();
  
  //     if (slots.length === 0) {
  //       return { message: "No slots available for export." };
  //     }
  
  //     // Create a new Excel workbook and worksheet
  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet("Doctor Slots");
  
  //     // Define columns for the worksheet
  //     worksheet.columns = [
  //       { header: "Doctor", key: "name", width: 15 },
  //       { header: "Token Number", key: "tokenNo", width: 15 },
  //       { header: "Order Number", key: "orderNumber", width: 15 },
  //       { header: "Patient Name", key: "patientName", width: 25 },
  //       { header: "Starting Time", key: "startingTime", width: 20 },
  //       // { header: "Ending Time", key: "endingTime", width: 20 },
  //       { header: "Consultation Time (mins)", key: "consultationTime", width: 25 },
  //       { header: "Duration (mins)", key: "duration", width: 25 },
  //       { header: "Break Times", key: "breaks", width: 30 },
  //     ];
  
  //     // Add rows to the worksheet from the slot data
  //     slots.forEach((slot, index) => {
  //       // Parse current starting time
  //       const currentStartTimeStr = slot.startingTime;
  //       const currentStartTime = moment(currentStartTimeStr, "HH:mm:ss A", true); // Change format to match your time format
  
  //       // Calculate duration based on next slot's starting time
  //       let duration = 0;
  //       if (index < slots.length - 1) {
  //         const nextStartTimeStr = slots[index + 1].startingTime;
  //         const nextStartTime = moment(nextStartTimeStr, "HH:mm:ss A", true); // Change format to match your time format
  
  //         if (currentStartTime.isValid() && nextStartTime.isValid()) {
  //           duration = nextStartTime.diff(currentStartTime, "minutes");
  //         }
  //       }
  
  //       // Format duration into hours and minutes
  //       let durationFormatted = `${duration} minute${duration !== 1 ? "s" : ""}`;
  //       if (duration > 60) {
  //         const hours = Math.floor(duration / 60);
  //         const minutes = duration % 60;
  //         durationFormatted = `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  //       }
  
  //       // Get all the doctor's break times
  //       let breaksFormatted = "N/A";
  //       if (presenceData && presenceData.breaks.length > 0) {
  //         breaksFormatted = presenceData.breaks
  //           .map((breakData, i) => {
  //             const start = breakData.startTime ? breakData.startTime : "N/A";
  //             const end = breakData.endTime ? breakData.endTime : "N/A";
  //             return ` ${start} - ${end}`;
  //           })
  //           .join(", ");
  //       }
  
  //       // Add the row to the worksheet
  //       worksheet.addRow({
  //         name: doctor.name,
  //         tokenNo: slot.tokenNo,
  //         orderNumber: slot.orderNumber,
  //         patientName: slot.patientName || "N/A",
  //         startingTime: slot.startingTime || "N/A",
  //         consultationTime: slot.consultationTime || 0,
  //         duration: durationFormatted,
  //         // endingTime: slot.endingTime || "N/A",
  //         breaks: breaksFormatted,
  //       });
  //     });
  
  //     // Generate file name based on doctor's name and the current date
  //     const fileName = `${doctor.name.replace(/\s+/g, "-")}-slots-${moment().format("DD-MM-YYYY")}.xlsx`;
  //     const filePath = path.join(__dirname, "exports", fileName);
  
  //     // Ensure the directory exists
  //     if (!fs.existsSync(path.join(__dirname, "exports"))) {
  //       fs.mkdirSync(path.join(__dirname, "exports"));
  //     }
  
  //     // Save the workbook to the file system
  //     await workbook.xlsx.writeFile(filePath);
  
  //     return { message: "Slots successfully exported to Excel.", filePath };
  //   } catch (error) {
  //     throw new Error(`Error exporting slots to Excel: ${error.message}`);
  //   }
  // }
  

  // static async upcomingTokens(doctorId) {
  //   try {
  //     const doctor = await doctorModel.findById(doctorId)

  //     const presenceData = await doctorPresenceModel.findOne({
  //       date: moment().format('DD/MM/YYYY'),
  //       doctor: doctorId,
  //     })

  //     const slots = await slotModel.find({
  //       date: moment().format('DD/MM/YYYY'),
  //       doctor: doctorId,
  //       fileArrive: true,
  //       $or: [
  //         {
  //           startingTime: { $exists: false },
  //         },
  //         {
  //           startingTime: { $eq: '' },
  //         },
  //       ]
  //     }).select('tokenNo orderNumber')
  //       .sort('orderNumber')
  //       .lean()

  //     let currentTime

  //     if (!presenceData) {
  //       currentTime = moment.max(moment(), moment(doctor.workingHoursStarting, 'HH:mm'));
  //     } else {
  //       if (presenceData.outTime) { return [] }
  //       const lastBreak = presenceData.breaks[presenceData.breaks.length - 1]

  //       if (lastBreak) {
  //         if (!lastBreak.endTime) {
  //           const breakEndTime = moment(lastBreak.startTime, 'HH:mm:ss').add(lastBreak.estimatedTime, 'minutes');
  //           currentTime = moment.max(moment(), breakEndTime);
  //         } else {
  //           currentTime = moment();
  //         }
  //       } else {
  //         currentTime = moment();
  //       }
  //     }

  //     let accumulatedTime = 0;
  //     const { averageConsultationTime } = doctor

  //     const slotsWithTime = slots.map(token => {
  //       const expectedTime = moment(currentTime).add(accumulatedTime, 'minutes');
  //       accumulatedTime += averageConsultationTime;

  //       return {
  //         ...token,
  //         expectedTime: expectedTime.format('HH:mm')
  //       };
  //     });

  //     return slotsWithTime
  //   } catch (error) {
  //     throw error
  //   }
  // }

  static async upcomingTokens(doctorId) {
    try {
      const doctor = await doctorModel.findById(doctorId);

      const presenceData = await doctorPresenceModel.findOne({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
      });

      // Fetch current token to get its expected end time
      const currentToken = await slotModel
        .findOne({
          date: moment().format("DD/MM/YYYY"),
          doctor: doctorId,
          fileArrive: true,
          startingTime: { $exists: true, $ne: "" },
          $or: [{ endingTime: { $exists: false } }, { endingTime: "" }],
        })
        .sort("orderNumber") // Assuming tokens are ordered by orderNumber
        .lean();

      // Calculate the current time for determining the start time for upcoming tokens
      let currentTime;

      if (!presenceData) {
        currentTime = moment.max(
          moment(),
          moment(doctor?.workingHoursStarting, "HH:mm")
        );
      } else {
        if (presenceData.outTime) {
          return [];
        }
        const lastBreak = presenceData.breaks[presenceData.breaks.length - 1];

        if (lastBreak && !lastBreak.endTime) {
          const breakEndTime = moment(lastBreak.startTime, "HH:mm:ss").add(
            lastBreak.estimatedTime,
            "minutes"
          );
          currentTime = moment.max(moment(), breakEndTime);
        } else {
          currentTime = moment();
        }
      }

      // Initialize the accumulated time for upcoming tokens
      let accumulatedTime = 0;

      // If there is a current token, use its expected end time as the starting point
      if (currentToken) {
        const currentConsultationTime = currentToken.consultationTime || 0; // Get consultation time from current token
        const expectedEndTime = moment(currentTime)
          .add(currentConsultationTime, "minutes") // Calculate expected end time
          .format("HH:mm"); // Format to HH:mm for further calculations

        // Set the current time to the expected end time for upcoming tokens
        currentTime = moment(expectedEndTime, "HH:mm");
      }

      const slots = await slotModel
        .find({
          date: moment().format("DD/MM/YYYY"),
          doctor: doctorId,
          fileArrive: true,
          $or: [
            { startingTime: { $exists: false } },
            { startingTime: { $eq: "" } },
          ],
        })
        .select("tokenNo orderNumber consultationTime") // Ensure consultationTime is included
        .sort("orderNumber")
        .lean();

      // Process each slot to calculate expected times
      const slotsWithTime = slots.map((slot) => {
        const consultationTime = slot.consultationTime || 0; // Get consultation time from the slot

        // Calculate expected start time for the current token based on the current time and accumulated consultation time
        const expectedStartTime = moment(currentTime).add(
          accumulatedTime,
          "minutes"
        );

        // Calculate expected end time based on the consultation time of the current token
        const expectedEndTime = moment(expectedStartTime).add(
          consultationTime,
          "minutes"
        );

        // Update accumulatedTime for the next iteration
        accumulatedTime += consultationTime;

        return {
          ...slot,
          expectedTime: expectedStartTime.format("hh:mm A"), // Start time for the token
          expectedEndTime: expectedEndTime.format("hh:mm A"), // End time for the token
        };
      });

      return slotsWithTime;
    } catch (error) {
      throw error;
    }
  }

  static async tokensOfDoctor(doctorId) {
    try {
      const slots = await slotModel
        .find({
          doctor: doctorId,
          date: moment().format("DD/MM/YYYY"),
        })
        .sort("orderNumber")
        .select("tokenNo orderNumber fileArrive startingTime endingTime consultationTime")
        .lean();

      return slots;
    } catch (error) {
      throw error;
    }
  }

  //   static async currentToken(doctorId) {
  //     try {
  //       const token = await slotModel.findOne({
  //         date: moment().format('DD/MM/YYYY'),
  //         doctor: doctorId,
  //         startingTime: { $exists: true, $ne: "" },
  //         $or: [
  //           {
  //             endingTime: { $exists: false }
  //           },
  //           {
  //             endingTime: ''
  //           },
  //         ]
  //       }).select('tokenNo consultationTime startingTime').lean()
  // console.log(token.tokenNo);

  //       if (!token) return null
  //       const tokenNo = token.tokenNo

  //       return tokenNo

  //     } catch (error) {
  //       throw error
  //     }
  //   }

//   static async currentToken(doctorId, additionalTime = 0) {
//     try {
//       // Fetch the current token with consultation time
//       const token = await slotModel
//         .findOne({
//           date: moment().format("DD/MM/YYYY"),
//           doctor: doctorId,
//           startingTime: { $exists: true, $ne: "" },
//           $or: [{ endingTime: { $exists: false } }, { endingTime: "" }],
//         })
//         .select("tokenNo consultationTime startingTime")
//         .lean();

//       if (!token) return null;

//       // Ensure consultationTime defaults to 0 if not a valid number
//       // const existingConsultationTime = token.consultationTime || 0;
//       // const updatedConsultationTime = additionalTime;

//       const existingConsultationTime = token.consultationTime || 0;
// const updatedConsultationTime = additionalTime === 0 ? existingConsultationTime : additionalTime;


//       // Update the database with the new consultation time
//       await slotModel.updateOne(
//         { _id: token._id }, // Find the token by its ID
//         { consultationTime: updatedConsultationTime },
//         {tokenStatus:true} // Update consultationTime
//       );

//       // Calculate expected end time based on the updated consultation time
//       const expectedEndTime = moment(token.startingTime, "HH:mm:ss")
//         .add(updatedConsultationTime, "minutes")
//         .format("hh:mm A");

//       return {
//         tokenNo: token.tokenNo,
//         consultationTime: updatedConsultationTime,
//         expectedEndTime: expectedEndTime,
//       };
//     } catch (error) {
//       console.error("Error in currentToken:", error);
//       throw error; // Rethrow the error for further handling
//     }
//   }

static async currentToken(doctorId, additionalTime = 0) {
  try {
    // Fetch the current token with consultation time
    const token = await slotModel
      .findOne({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
        startingTime: { $exists: true, $ne: "" },
        $or: [{ endingTime: { $exists: false } }, { endingTime: "" }],
      })
      .select("tokenNo consultationTime startingTime")
      .lean();

    if (!token) return null;

    // Set consultationTime to either the existing value or the provided additional time
    const existingConsultationTime = token.consultationTime || 0;
    const updatedConsultationTime = additionalTime === 0 ? existingConsultationTime : additionalTime;

    // Update the database with the new consultation time and set tokenStatus to true
    await slotModel.updateOne(
      { _id: token._id }, // Find the token by its ID
      { 
        consultationTime: updatedConsultationTime, 
        tokenStatus: true // Set tokenStatus to true
      }
    );

    // Calculate expected end time based on the updated consultation time
    const expectedEndTime = moment(token.startingTime, "HH:mm:ss")
      .add(updatedConsultationTime, "minutes")
      .format("hh:mm A");

    return {
      tokenNo: token.tokenNo,
      consultationTime: updatedConsultationTime,
      expectedEndTime: expectedEndTime,
    };
  } catch (error) {
    console.error("Error in currentToken:", error);
    throw error; // Rethrow the error for further handling
  }
}


  static async doctorPresenceStatus(doctorId) {
    try {
      const presenceData = await doctorPresenceModel.findOne({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
      });

      if (!presenceData) {
        return "didn't reached yet";
      } else if (presenceData.outTime) {
        return "consultation completed";
      } else if (presenceData.breaks.length) {
        if (!presenceData.breaks[presenceData.breaks.length - 1].endTime) {
          return "in break";
        } else {
          return "live";
        }
      } else return "live";
    } catch (error) {
      throw error;
    }
  }

  static async doctorIn(doctorId) {
    try {
      const alreadyExist = await doctorPresenceModel.findOne({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
      });
      if (alreadyExist) {
        if (alreadyExist.outTime) {
          throw "cosnultation completed";
        }
        throw "already in";
      }

      const res = await doctorPresenceModel.insertMany({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
        inTime: moment().format("hh:mm:ss"),
        isActive: true,
      });

      await doctorModel.updateOne({ _id: doctorId }, { tokenStatus: true });
      return res;
    } catch (error) {
      throw error;
    }
  }

  static async doctorClockOut(doctorId) {
    try {
      const alreadyExist = await doctorPresenceModel.findOne({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
      });
      if (!alreadyExist) throw "didn't arrive yet";
      if (alreadyExist.outTime) throw "already clock out";
      if (
        alreadyExist.breaks.length &&
        alreadyExist.breaks[alreadyExist.breaks.length - 1].endTime
      ) {
        await this.endBreak(doctorId);
      }

      const res = doctorPresenceModel.updateOne(
        {
          date: moment().format("DD/MM/YYYY"),
          doctor: doctorId,
        },
        {
          outTime: moment().format("hh:mm:ss"),
        }
      );

      // Update the tokenStatus to false (doctor is not available)
      await doctorModel.updateOne({ _id: doctorId }, { tokenStatus: false });
      return res;
    } catch (error) {
      throw error;
    }
  }

  static async takeBreak({ doctorId, estimatedTime = 10, reason }) {
    try {
      const alreadyExist = await doctorPresenceModel.findOne({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
      });
      if (!alreadyExist) throw "didn't arrive yet";
      if (alreadyExist.outTime) throw "completed consultation";
      if (
        alreadyExist.breaks.length &&
        !alreadyExist.breaks[alreadyExist.breaks.length - 1].endTime
      ) {
        return "already in break";
      }

      const res = await doctorPresenceModel.updateOne(
        {
          date: moment().format("DD/MM/YYYY"),
          doctor: doctorId,
        },
        {
          $push: {
            breaks: {
              startTime: moment().format("HH:mm:ss A"),
              estimatedTime,
              reason: reason ? reason : null,
            },
          },
        }
      );
      return res;
    } catch (error) {
      throw error;
    }
  }

  static async returnToWork(doctorId) {
    try {
      const alreadyExist = await doctorPresenceModel.findOne({
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
      });
      if (!alreadyExist) throw "didn't arrive yet";
      if (alreadyExist.outTime) throw "completed consultation";
      if (
        !alreadyExist.breaks.length ||
        alreadyExist.breaks[alreadyExist.breaks.length - 1].endTime
      ) {
        throw "you are not in break now";
      }

      const res = await this.endBreak(doctorId);
      return res;
    } catch (error) {
      throw error;
    }
  }

  static async endBreak(doctorId) {
    try {
      const res = await doctorPresenceModel.updateOne(
        {
          date: moment().format("DD/MM/YYYY"),
          doctor: doctorId,
        },
        [
          {
            $set: {
              breaks: {
                $map: {
                  input: {
                    $range: [
                      0,
                      {
                        $size: "$breaks",
                      },
                    ],
                  },
                  as: "index",
                  in: {
                    $cond: [
                      {
                        $eq: [
                          "$$index",
                          {
                            $subtract: [
                              {
                                $size: "$breaks",
                              },
                              1,
                            ],
                          },
                        ],
                      },
                      {
                        $mergeObjects: [
                          {
                            $arrayElemAt: ["$breaks", "$$index"],
                          },
                          {
                            endTime: moment().format("HH:mm:ss A"),
                          },
                        ],
                      },
                      {
                        $arrayElemAt: ["$breaks", "$$index"],
                      },
                    ],
                  },
                },
              },
            },
          },
        ]
      );
      return res;
    } catch (error) {
      throw error;
    }
  }

  static async changeOrder(doctorId, tokenNo, newOrder) {
    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      const tokenToMove = await slotModel.findOne({
        tokenNo,
        date: moment().format("DD/MM/YYYY"),
        doctor: doctorId,
      });

      if (!tokenToMove) throw "token not found";

      const oldOrder = tokenToMove.orderNumber;

      const isMovingDown = newOrder > oldOrder;

      if (isMovingDown) {
        await slotModel.updateMany(
          { orderNumber: { $gt: oldOrder, $lte: newOrder } },
          { $inc: { orderNumber: -1 } },
          { session }
        );
      } else {
        await slotModel.updateMany(
          { orderNumber: { $lt: oldOrder, $gte: newOrder } },
          { $inc: { orderNumber: 1 } },
          { session }
        );
      }

      tokenToMove.orderNumber = newOrder;
      await tokenToMove.save({ session });

      await session.commitTransaction();
      return "updated";
    } catch (error) {
      throw error;
    }
  }

  static async feedTokens(doctorId) {
    try {
      const alreadyExist = await slotModel.findOne({
        doctor: doctorId,
        date: moment().format("DD/MM/YYYY"),
      });

      if (alreadyExist) return null;

      const doctor = await doctorModel
        .findOne({
          _id: doctorId,
          totalTokensPerDay: {
            $exists: true,
            $ne: "",
          },
        })
        .select("totalTokensPerDay");

      if (!doctor) return null;

      const tokens = [];

      for (let i = 1; i <= doctor.totalTokensPerDay; i++) {
        tokens.push({
          tokenNo: i,
          doctor: doctor._id,
          date: moment().format("DD/MM/YYYY"),
          orderNumber: i,
        });
      }

      const res = await slotModel.insertMany(tokens);
      return res;
    } catch (error) {
      throw error;
    }
  }

  static async generateQRImage(doctorId) {
    try {
      const url = await QRCode.toDataURL(
        JSON.stringify({ doctorId, platform: "vyzo" })
      );
      return url;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Utility;
